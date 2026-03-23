package com.example.ekart.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * LOCATION: src/main/java/com/example/ekart/service/AiAssistantService.java
 *
 * Enhanced AI Assistant Service.
 *
 * Key improvements over the original:
 * 1. Accepts real user context (orders, cart, products) from ChatController
 * 2. Injects this context into the Gemini system prompt so it can give SPECIFIC answers
 * 3. Different system prompts per role (customer / vendor / admin / guest)
 * 4. Local fallback uses the contextBlock to give real data answers
 * 5. Instructs Gemini to answer ONLY from the provided context — no hallucination
 */
@Service
public class AiAssistantService {

    private static final Logger log = LoggerFactory.getLogger(AiAssistantService.class);

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    // ── Public API ────────────────────────────────────────────────────────────

    /** Legacy single-argument overload — still works for simple callers */
    public String getReply(String msg, String role) {
        return getReply(msg, role, "User", "", new ArrayList<>());
    }

    public String getReply(String msg, String role, List<Map<String, String>> history) {
        return getReply(msg, role, "User", "", history);
    }

    /**
     * Main entry point.
     *
     * @param userMessage  what the user typed
     * @param role         customer / vendor / admin / guest
     * @param userName     first name for personalisation
     * @param contextBlock live data block built by ChatController
     * @param history      prior conversation turns [{role, text}]
     */
    public String getReply(String userMessage, String role, String userName,
                           String contextBlock, List<Map<String, String>> history) {

        if (userMessage == null || userMessage.isBlank())
            return "Please type a message so I can help! 😊";

        if (apiKey != null && !apiKey.isBlank()) {
            try {
                String reply = callGemini(userMessage, role, userName, contextBlock, history);
                if (reply != null && !reply.isBlank()) return reply;
            } catch (Exception e) {
                log.warn("Gemini API failed ({}), using local fallback", e.getMessage());
            }
        }
        return localReply(userMessage, role, userName, contextBlock);
    }

    // ── Gemini API ────────────────────────────────────────────────────────────

    private String callGemini(String userMessage, String role, String userName,
                              String contextBlock, List<Map<String, String>> history)
            throws Exception {

        String systemPrompt = buildSystemPrompt(role, userName, contextBlock);

        StringBuilder contents = new StringBuilder("[");

        // Seed the conversation with system instructions
        contents.append("{\"role\":\"user\",\"parts\":[{\"text\":")
                .append(toJson("System instructions:\n" + systemPrompt
                        + "\n\nPlease acknowledge these instructions concisely."))
                .append("}]},");
        contents.append("{\"role\":\"model\",\"parts\":[{\"text\":")
                .append(toJson(getRoleAck(role, userName)))
                .append("}]},");

        // Prior conversation turns
        for (Map<String, String> turn : history) {
            String r = "user".equals(turn.get("role")) ? "user" : "model";
            contents.append("{\"role\":\"").append(r).append("\",")
                    .append("\"parts\":[{\"text\":").append(toJson(turn.getOrDefault("text", "")))
                    .append("}]},");
        }

        // Current user message
        contents.append("{\"role\":\"user\",\"parts\":[{\"text\":")
                .append(toJson(userMessage)).append("}]}]");

        String body = "{\"contents\":" + contents + "," +
                "\"generationConfig\":{\"temperature\":0.3,\"maxOutputTokens\":400}}";

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" +
                        "gemini-1.5-flash:generateContent?key=" + apiKey))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(12))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> res = http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .get(12, TimeUnit.SECONDS);

        if (res.statusCode() == 200) {
            String text = extractText(res.body());
            if (text != null && !text.isBlank()) return text.trim();
        } else {
            log.error("Gemini {} → {}", res.statusCode(),
                    res.body().substring(0, Math.min(200, res.body().length())));
        }
        return null;
    }

    // ── System prompts ────────────────────────────────────────────────────────

    private String buildSystemPrompt(String role, String userName, String contextBlock) {
        String base =
            "You are the Ekart Assistant — the official AI support agent for Ekart, " +
            "an Indian e-commerce platform.\n\n" +

            "═══ CRITICAL RULES ═══\n" +
            "1. ALWAYS use the LIVE USER DATA provided below to give SPECIFIC answers.\n" +
            "   - If the user asks about their orders → list their actual orders from the data.\n" +
            "   - If they ask about their cart → tell them exactly what's in it.\n" +
            "   - If they ask about a specific order → find it in the data and describe it.\n" +
            "   - If they ask about their products → use the vendor's actual product list.\n" +
            "   - Never say 'go to this page to check' when you can answer from the data.\n" +
            "2. STRICT ROLE ISOLATION — this is the most important rule:\n" +
            "   - You are ONLY the assistant for the CURRENT ROLE stated below.\n" +
            "   - CUSTOMER features (cart, wishlist, track order, buy products, COD) → ONLY for customers.\n" +
            "   - VENDOR features (add/edit products, sales report, stock alerts, approve orders) → ONLY for vendors.\n" +
            "   - ADMIN features (approve products, ban users, refund management, analytics) → ONLY for admins.\n" +
            "   - If a VENDOR asks 'how do I track my order' like a customer → reply: 'Order tracking for purchases is a customer feature. As a vendor, you can view orders placed for your products from your Vendor Orders page.'\n" +
            "   - If a CUSTOMER asks 'how do I add a product' → reply: 'Adding products is a vendor feature. As a customer you can browse and buy products.'\n" +
            "   - If a CUSTOMER asks 'how do I approve products' → reply: 'Product approval is an admin feature and is not available to customers.'\n" +
            "   - NEVER explain features that belong to a different role as if they apply to the current user.\n" +
            "3. Keep responses CONCISE (3–6 lines max) unless step-by-step is needed.\n" +
            "4. Use ₹ for all prices. Format order IDs as #ID.\n" +
            "5. 1–2 relevant emojis per reply maximum.\n" +
            "6. ONLY answer Ekart-related questions.\n" +
            "7. Never mention competitor platforms (Amazon, Flipkart, Meesho etc.).\n" +
            "8. If data is not in the context block, say so — never guess or hallucinate.\n\n" +

            "═══ EKART PLATFORM FACTS ═══\n" +
            "- Free delivery on orders above ₹500, else ₹40 charge.\n" +
            "- Order stages: Processing → Packed → Shipped → Out for Delivery → Delivered\n" +
            "- Returns/replacements: within 7 days of order.\n" +
            "- Refunds: 5–7 business days after approval.\n" +
            "- Password: 8+ chars with uppercase, lowercase, number, special character.\n" +
            "- OTP verification required on registration.\n\n";

        String roleSection = buildRoleSection(role, userName);
        String dataSection = contextBlock != null && !contextBlock.isBlank()
                ? "\n═══ LIVE USER DATA ═══\n" + contextBlock + "\n"
                : "\n═══ LIVE USER DATA ═══\nNo data available for this session.\n";

        return base + roleSection + dataSection;
    }

    private String buildRoleSection(String role, String userName) {
        switch (role) {
            case "customer":
                return "═══ CURRENT USER ═══\n" +
                       "Role: CUSTOMER | Name: " + userName + "\n" +
                       "The customer can: browse & buy products, manage cart, place orders, " +
                       "track deliveries, cancel orders, request refunds/replacements, " +
                       "manage wishlist, write reviews, manage delivery addresses.\n\n";

            case "vendor":
                return "═══ CURRENT USER ═══\n" +
                       "Role: VENDOR | Name: " + userName + "\n" +
                       "The vendor can: add/edit/delete products (pending admin approval), " +
                       "upload product images & videos, set stock alert thresholds, " +
                       "view sales reports (daily/weekly/monthly), manage storefront, " +
                       "mark orders as Packed.\n\n";

            case "admin":
                return "═══ CURRENT USER ═══\n" +
                       "Role: ADMIN\n" +
                       "The admin can: approve/reject products, manage all users (ban, role changes), " +
                       "process refunds, manage banners, view platform analytics, " +
                       "moderate reviews, manage coupons, manage delivery boys and warehouses.\n\n";

            default:
                return "═══ CURRENT USER ═══\n" +
                       "Role: GUEST (not logged in)\n" +
                       "Guest can browse products without logging in. " +
                       "Encourage them to register for full access.\n\n";
        }
    }

    private String getRoleAck(String role, String userName) {
        switch (role) {
            case "customer":
                return "Understood. I'm Ekart Assistant for " + userName +
                       ". I have their live order history, cart, and refund data and will " +
                       "answer specifically from that data.";
            case "vendor":
                return "Understood. I'm Ekart Assistant for vendor " + userName +
                       ". I have their live product list and order data and will answer " +
                       "specifically from it.";
            case "admin":
                return "Understood. I'm Ekart Admin Assistant. I have live platform stats " +
                       "(pending approvals, refunds, orders) and will give specific counts.";
            default:
                return "Understood. I'm Ekart Assistant for a guest user.";
        }
    }

    // ── Local fallback (no Gemini key / API down) ─────────────────────────────
    // Every single response is gated by role — no cross-role leakage possible.
    // A vendor will NEVER get a customer cart/wishlist answer, and vice versa.

    private String localReply(String msg, String role, String userName, String ctx) {
        String m = msg.toLowerCase().trim();

        // ─── ROLE-SPECIFIC CROSS-QUESTION REDIRECTS ──────────────────────────
        // If someone asks a question meant for a different role, explain the boundary.

        // Vendor/Admin asking customer-only questions
        if (!role.equals("customer") && !role.equals("guest")) {
            if (any(m, "my cart","what's in my cart","view cart","add to cart","basket")) {
                return "vendor".equals(role)
                    ? "🛒 The cart is a customer feature for shopping. As a vendor, you manage products and fulfil orders — not add items to a cart. Check **Vendor Orders** to see what customers have ordered from you."
                    : "🛒 Cart management is a customer feature. As an admin, you manage the platform — not individual carts.";
            }
            if (any(m, "wishlist","favourite","saved item")) {
                return "vendor".equals(role)
                    ? "❤️ Wishlist is a customer feature for saving products they want to buy. As a vendor, focus on your product listings and stock management."
                    : "❤️ Wishlists are a customer feature — admins manage the platform, not personal shopping lists.";
            }
            if (any(m, "track my order","where is my order","when will my order arrive")) {
                return "vendor".equals(role)
                    ? "📦 Order tracking for purchases is a customer feature. As a vendor, you can view orders placed for YOUR products under **Vendor Orders**, and mark them as Packed."
                    : "📦 Customer order tracking is a customer feature. As an admin, view all orders from the admin dashboard.";
            }
            if (any(m, "checkout","cash on delivery","cod","razorpay","place order","buy now")) {
                return "vendor".equals(role)
                    ? "💳 Checkout and payment is a customer feature for purchasing. As a vendor, you receive payments when customers place orders for your products."
                    : "💳 The checkout flow is for customers. Admin manages the platform and refunds, not purchases.";
            }
        }

        // Customer/Guest asking vendor-only questions
        if (role.equals("customer") || role.equals("guest")) {
            if (any(m, "add product","new product","list product","upload product","edit product","delete product")) {
                return "📦 Adding and managing products is a **vendor** feature. As a customer, you browse and buy products. If you want to sell on Ekart, register as a vendor!";
            }
            if (any(m, "sales report","vendor report","my revenue","vendor analytics","vendor order")) {
                return "📊 Sales reports are a **vendor** feature. As a customer, you can view your spending analytics from the **Spending** section in the navbar.";
            }
            if (any(m, "stock alert","inventory","manage stock","stock threshold")) {
                return "📉 Stock management is a **vendor** feature. As a customer, you'll see 'Out of Stock' on unavailable products. Enable back-in-stock alerts from the product page!";
            }
        }

        // Customer/Vendor asking admin-only questions
        if (!role.equals("admin")) {
            if (any(m, "approve product","approve vendor","ban user","admin panel","manage user","admin refund","user role")) {
                return role.equals("customer")
                    ? "🔧 Product and user management is an **admin** feature. As a customer, you can browse approved products and manage your own account."
                    : "🔧 Admin functions like user management and approvals are restricted to Ekart admins. As a vendor, contact admin if you need help with your account.";
            }
        }

        // ─── GREETINGS ────────────────────────────────────────────────────────
        if (any(m, "hello","hi","hey","good morning","good evening","namaste","howdy","hii","helo")) {
            switch (role) {
                case "customer": return "👋 Hi " + userName + "! I can see your orders, cart, and account details. Ask me anything specific — like 'show my orders' or 'what's in my cart'!";
                case "vendor":   return "👋 Hello " + userName + "! I can see your products and customer orders. Try asking 'show my products' or 'any low stock alerts'!";
                case "admin":    return "👋 Hi Admin! I have live platform data. Ask me about pending approvals, refunds, or platform stats.";
                default:         return "👋 Welcome to Ekart! Register or login to get started. How can I help?";
            }
        }

        // ─── CUSTOMER: ORDERS ────────────────────────────────────────────────
        if (role.equals("customer") && any(m, "my order","all order","show order","list order","order list","order history","what orders","recent order")) {
            return extractOrderBlock(ctx, userName);
        }

        // ─── CUSTOMER: ORDER TRACKING ────────────────────────────────────────
        if (role.equals("customer") && any(m, "track","order status","where is","delivery status","shipment status","has my order","is my order")) {
            String orders = extractOrderBlock(ctx, userName);
            return orders + "\n\nFor live tracking, go to **Track Orders** in the navbar — each order shows the full delivery timeline.";
        }

        // ─── CUSTOMER: CART ──────────────────────────────────────────────────
        if (role.equals("customer") && any(m, "cart","my cart","what's in","basket")) {
            return extractCartBlock(ctx);
        }

        // ─── CUSTOMER: REFUNDS ───────────────────────────────────────────────
        if (role.equals("customer") && any(m, "refund","my refund","pending refund","money back","reimbursement")) {
            return extractRefundBlock(ctx);
        }

        // ─── CUSTOMER: CANCEL ORDER ──────────────────────────────────────────
        if (role.equals("customer") && any(m, "cancel order","cancel my order","how to cancel")) {
            return "❌ To cancel an order: go to **View Orders** → find the order → click **Cancel**. You'll get a cancellation email and stock is restored. Refund (if paid online) takes 5–7 business days.";
        }

        // ─── CUSTOMER: RETURN / REPLACEMENT ─────────────────────────────────
        if (role.equals("customer") && any(m, "return","replacement","replace","damaged","broken","defective","wrong item")) {
            return "🔄 Returns and replacements are available within **7 days** of delivery.\n\n" +
                   "1. Go to **View Orders**\n" +
                   "2. Select the order\n" +
                   "3. Click **Report Issue** or **Request Replacement**\n\n" +
                   "Refunds are credited within 5–7 business days after approval.";
        }

        // ─── CUSTOMER: DELIVERY CHARGE ───────────────────────────────────────
        if (role.equals("customer") && any(m, "delivery charge","shipping","free delivery","delivery fee","delivery cost")) {
            String cartInfo = "";
            if (ctx != null && ctx.contains("CART (")) {
                cartInfo = " Based on your current cart, check if your total exceeds ₹500 to qualify for free delivery.";
            }
            return "🚚 Orders above **₹500** get FREE delivery. Below ₹500, a ₹40 delivery charge applies." + cartInfo;
        }

        // ─── CUSTOMER: PAYMENT ───────────────────────────────────────────────
        if (role.equals("customer") && any(m, "payment","pay","checkout","cod","cash on delivery","razorpay","upi","online payment","net banking")) {
            return "💳 Ekart supports:\n" +
                   "• **Razorpay** — UPI, Debit/Credit cards, Net banking\n" +
                   "• **Cash on Delivery (COD)**\n\n" +
                   "Free delivery on orders above ₹500, else ₹40. Proceed to checkout from your cart.";
        }

        // ─── CUSTOMER: WISHLIST ──────────────────────────────────────────────
        if (role.equals("customer") && any(m, "wishlist","favourite","saved","save product","heart")) {
            return "❤️ Click the **heart icon** on any product to save it to your Wishlist. Access your wishlist from the navbar. You can move items from wishlist directly to cart!";
        }

        // ─── CUSTOMER: REVIEWS ───────────────────────────────────────────────
        if (role.equals("customer") && any(m, "review","rating","feedback","comment","star")) {
            return "⭐ Go to **View Products** or the product detail page, scroll to the reviews section, and submit your rating (1–5 stars) and comment. Your feedback helps other shoppers!";
        }

        // ─── CUSTOMER: ADDRESS ───────────────────────────────────────────────
        if (role.equals("customer") && any(m, "address","delivery address","add address","change address","shipping address")) {
            if (ctx != null && ctx.contains("SAVED ADDRESSES")) {
                int si = ctx.indexOf("SAVED ADDRESSES");
                String addrSection = ctx.substring(si, Math.min(si + 300, ctx.length()));
                return "📍 Your saved addresses:\n" + addrSection + "\n\nManage addresses from **My Profile → Addresses**.";
            }
            return "📍 Manage your delivery addresses from **My Profile → Addresses**. You can save multiple addresses and choose one at checkout.";
        }

        // ─── CUSTOMER: HELP ──────────────────────────────────────────────────
        if (role.equals("customer") && any(m, "help","what can you do","options","features")) {
            return "I can help you with:\n" +
                   "📦 Show your orders & tracking status\n" +
                   "🛒 View your cart contents\n" +
                   "💰 Check pending refunds\n" +
                   "💳 Payment and delivery info\n" +
                   "🔄 Return and replacement process\n" +
                   "❤️ Wishlist management\n\n" +
                   "Just ask naturally — like 'show my orders' or 'what's in my cart'!";
        }

        // ─── VENDOR: PRODUCTS ────────────────────────────────────────────────
        if (role.equals("vendor") && any(m, "my product","product list","all product","show product","my listing","my item","product status")) {
            return extractVendorProductBlock(ctx);
        }

        // ─── VENDOR: LOW STOCK ───────────────────────────────────────────────
        if (role.equals("vendor") && any(m, "low stock","stock alert","out of stock","stock warning","inventory","stock level")) {
            String prods = extractVendorProductBlock(ctx);
            if (ctx != null && ctx.contains("LOW STOCK ALERT")) {
                return prods;
            }
            return "📉 Good news — no low stock alerts right now!\n\n" + prods + "\n\nSet stock alert thresholds per product from **Manage Products** to get notified when stock runs low.";
        }

        // ─── VENDOR: PENDING APPROVAL ────────────────────────────────────────
        if (role.equals("vendor") && any(m, "pending","approval","awaiting","not live","not approved","under review")) {
            return extractVendorProductBlock(ctx);
        }

        // ─── VENDOR: ORDERS ──────────────────────────────────────────────────
        if (role.equals("vendor") && any(m, "my order","customer order","order","order status","recent order","new order")) {
            return extractVendorOrderBlock(ctx);
        }

        // ─── VENDOR: REVENUE / SALES ─────────────────────────────────────────
        if (role.equals("vendor") && any(m, "revenue","sales","earning","income","how much","total","money","report","analytics","performance")) {
            return extractVendorOrderBlock(ctx);
        }

        // ─── VENDOR: ADD PRODUCT ─────────────────────────────────────────────
        if (role.equals("vendor") && any(m, "add product","new product","list product","upload product","create product")) {
            return "📦 To add a new product:\n" +
                   "1. Go to **Add Product** from your vendor dashboard\n" +
                   "2. Fill in: name, price, MRP, description, category, stock quantity\n" +
                   "3. Upload product images (and optional video)\n" +
                   "4. Set a stock alert threshold\n" +
                   "5. Submit — your product goes live after **admin approval**\n\n" +
                   "Products marked [PENDING] are awaiting admin review.";
        }

        // ─── VENDOR: DELIVERY / SHIPPING ─────────────────────────────────────
        if (role.equals("vendor") && any(m, "delivery","shipping","dispatch","fulfill","pack","packed")) {
            return "🚚 When a customer orders your product:\n" +
                   "1. The order appears in your **Vendor Orders** page with status: Processing\n" +
                   "2. Pack the item and click **Mark as Packed**\n" +
                   "3. The delivery team picks it up from the warehouse\n" +
                   "4. Ekart handles the rest — Shipped → Out for Delivery → Delivered\n\n" +
                   "Free delivery is provided to customers on orders above ₹500.";
        }

        // ─── VENDOR: SALES REPORT ────────────────────────────────────────────
        if (role.equals("vendor") && any(m, "sales report","report","chart","graph","weekly","monthly","daily")) {
            return "📊 Your **Sales Report** (vendor dashboard) shows:\n" +
                   "• Daily / Weekly / Monthly revenue charts\n" +
                   "• Total orders, items sold, average order value\n" +
                   "• Top-performing products\n" +
                   "• Live data — updates with every new order\n\n" +
                   "Use the Sync button to backfill historical data.";
        }

        // ─── VENDOR: PAYMENT / SETTLEMENT ────────────────────────────────────
        if (role.equals("vendor") && any(m, "payment","pay","settle","payout","earning","razorpay")) {
            return "💰 Vendor payments are settled after order delivery and confirmation. Check your **Sales Report** for revenue breakdown. Contact Ekart admin for specific payout queries.";
        }

        // ─── VENDOR: HELP ────────────────────────────────────────────────────
        if (role.equals("vendor") && any(m, "help","what can you do","options","features")) {
            return "I can help you with:\n" +
                   "📦 View your product listings & stock status\n" +
                   "📉 Low stock and inventory alerts\n" +
                   "🛒 Customer orders for your products\n" +
                   "📊 Revenue and sales summary\n" +
                   "➕ How to add or edit products\n\n" +
                   "Try asking: 'show my products' or 'do I have any low stock?'";
        }

        // ─── ADMIN: PENDING APPROVALS ────────────────────────────────────────
        if (role.equals("admin") && any(m, "pending","approval","approve","pending product","unapproved","waiting")) {
            return extractAdminApprovalBlock(ctx);
        }

        // ─── ADMIN: REFUNDS ──────────────────────────────────────────────────
        if (role.equals("admin") && any(m, "refund","pending refund","refund request","money back","process refund")) {
            return extractAdminRefundBlock(ctx);
        }

        // ─── ADMIN: STATS / OVERVIEW ─────────────────────────────────────────
        if (role.equals("admin") && any(m, "stats","overview","dashboard","platform","total","how many","customer count","order count","summary")) {
            return extractAdminStatsBlock(ctx);
        }

        // ─── ADMIN: ORDERS ───────────────────────────────────────────────────
        if (role.equals("admin") && any(m, "order","all order","recent order","order status","processing order","delivered order")) {
            return extractAdminStatsBlock(ctx);
        }

        // ─── ADMIN: USER MANAGEMENT ──────────────────────────────────────────
        if (role.equals("admin") && any(m, "user","customer","vendor","manage","ban","role","permission","account")) {
            return "👥 User management is in the **Admin Panel → User Management** section.\n\n" +
                   "You can:\n" +
                   "• Search customers and vendors by email\n" +
                   "• Change user roles (CUSTOMER / ORDER_MANAGER / ADMIN)\n" +
                   "• Suspend or reactivate accounts\n" +
                   "• Delete accounts if needed\n\n" +
                   extractAdminStatsBlock(ctx);
        }

        // ─── ADMIN: HELP ─────────────────────────────────────────────────────
        if (role.equals("admin") && any(m, "help","what can you do","options","features")) {
            return "I can help you with:\n" +
                   "✅ Pending product approvals (with vendor names)\n" +
                   "💰 Pending refund requests\n" +
                   "📊 Live platform stats (orders, customers, revenue)\n" +
                   "👥 User management guidance\n\n" +
                   "Try: 'show pending approvals' or 'any pending refunds?'";
        }

        // ─── SHARED: PASSWORD (all roles) ────────────────────────────────────
        if (any(m, "password","forgot password","reset password","change password")) {
            switch (role) {
                case "customer": return "🔑 Click **Forgot Password** on the customer login page. An OTP is sent to your email. New password must be 8+ chars with uppercase, lowercase, number, and special character.";
                case "vendor":   return "🔑 Click **Forgot Password** on the vendor login page. An OTP is sent to your registered vendor email.";
                case "admin":    return "🔑 Admin password can be changed from **Admin → Security Settings**. Contact the system administrator if locked out.";
                default:         return "🔑 Use **Forgot Password** on the login page to reset via OTP sent to your email.";
            }
        }

        // ─── GUEST: BROWSE ───────────────────────────────────────────────────
        if (role.equals("guest") && any(m, "product","browse","search","shop","buy","price")) {
            return "🛍️ You can browse all products without logging in! Use the search bar or category filters on the home page to find what you need.\n\n**Register for free** to add items to cart, place orders, track deliveries, and more.";
        }

        if (role.equals("guest") && any(m, "register","sign up","create account","join")) {
            return "📝 Click **Register** on the home page. You'll need to verify your email with an OTP before logging in. Registration is free and takes under a minute!";
        }

        // ─── DEFAULT (role-specific) ─────────────────────────────────────────
        switch (role) {
            case "customer":
                return "😊 I can help with your orders, cart, payments, delivery, and returns. Try asking: 'show my orders' or 'what's in my cart'?";
            case "vendor":
                return "😊 I can help with your products, orders, stock, and sales. Try asking: 'show my products' or 'any new customer orders'?";
            case "admin":
                return "😊 I can help with platform management. Try asking: 'any pending approvals?' or 'show platform stats'.";
            default:
                return "😊 Browse products freely or **register** to access your full Ekart experience — orders, cart, tracking, and more!";
        }
    }

    // ── Context extraction helpers ────────────────────────────────────────────

    private String extractOrderBlock(String ctx, String name) {
        if (ctx == null || !ctx.contains("ORDERS")) {
            return "📦 I don't have your order data in this session. Please visit **View Orders** in the navbar for a full list.";
        }
        if (ctx.contains("No orders placed yet")) {
            return "📦 You haven't placed any orders yet, " + name + ". Start shopping from the home page!";
        }
        // Extract orders section
        int start = ctx.indexOf("ORDERS (");
        if (start == -1) start = ctx.indexOf("\nORDERS:");
        int end = ctx.indexOf("\nPENDING REFUNDS");
        if (end == -1) end = ctx.indexOf("\nSAVED ADDRESSES");
        if (end == -1) end = ctx.length();

        String ordersSection = start >= 0 ? ctx.substring(start, Math.min(end, ctx.length())).trim() : "";

        if (ordersSection.isEmpty())
            return "📦 Visit **View Orders** or **Track Orders** from the navbar to see your orders.";

        // Clean up and format
        StringBuilder reply = new StringBuilder("📦 Here are your orders, " + name + ":\n\n");
        String[] lines = ordersSection.split("\n");
        for (String line : lines) {
            if (line.trim().startsWith("Order #") || line.trim().startsWith("ORDERS (")) {
                reply.append(line.trim()).append("\n");
            }
        }
        reply.append("\nFor full details and tracking, click **Track Orders** in the navbar.");
        return reply.toString();
    }

    private String extractCartBlock(String ctx) {
        if (ctx == null || !ctx.contains("CART")) {
            return "🛒 Your cart is accessible from the cart icon in the navbar.";
        }
        if (ctx.contains("CART: Empty")) {
            return "🛒 Your cart is currently empty. Browse products and add items to get started!";
        }
        int start = ctx.indexOf("\nCART (");
        int end = ctx.indexOf("\nORDERS");
        if (start == -1) return "🛒 Access your cart from the cart icon in the navbar.";
        if (end == -1) end = ctx.length();

        String cartSection = ctx.substring(start, Math.min(end, ctx.length())).trim();
        return "🛒 " + cartSection + "\n\nGo to **Cart** to review or proceed to checkout.";
    }

    private String extractRefundBlock(String ctx) {
        if (ctx == null || !ctx.contains("PENDING REFUNDS")) {
            return "🔄 No pending refunds found. If you submitted one recently, it takes 5–7 business days to process.";
        }
        int start = ctx.indexOf("\nPENDING REFUNDS");
        int end = ctx.indexOf("\nSAVED ADDRESSES");
        if (end == -1) end = ctx.length();
        String section = start >= 0 ? ctx.substring(start, end).trim() : "";
        return "🔄 " + (section.isEmpty()
                ? "No pending refunds found."
                : section + "\n\nRefunds are processed within 5–7 business days.");
    }

    private String extractVendorProductBlock(String ctx) {
        if (ctx == null || !ctx.contains("PRODUCTS")) {
            return "📦 Go to **Manage Products** in your vendor dashboard to see your listings.";
        }
        int start = ctx.indexOf("\nPRODUCTS:");
        int end = ctx.indexOf("\nORDERS:");
        if (end == -1) end = ctx.length();
        String section = start >= 0 ? ctx.substring(start, Math.min(end, ctx.length())).trim() : "";
        return "📦 " + (section.isEmpty() ? "Visit **Manage Products** in your dashboard." : section);
    }

    private String extractVendorOrderBlock(String ctx) {
        if (ctx == null || !ctx.contains("ORDERS:")) {
            return "📊 Visit your **Sales Report** and **Vendor Orders** pages for order details.";
        }
        int start = ctx.indexOf("\nORDERS: ");
        String section = start >= 0 ? ctx.substring(start, ctx.length()).trim() : "";
        if (section.length() > 600) section = section.substring(0, 600) + "...";
        return "📊 " + (section.isEmpty() ? "No order data available right now." : section);
    }

    private String extractAdminApprovalBlock(String ctx) {
        if (ctx == null || !ctx.contains("PENDING APPROVALS")) {
            return "✅ Visit **Approve Products** in the admin panel to review pending listings.";
        }
        int start = ctx.indexOf("PRODUCTS: ");
        int end = ctx.indexOf("\nREFUNDS:");
        if (end == -1) end = ctx.length();
        String section = start >= 0 ? ctx.substring(start, Math.min(end, ctx.length())).trim() : "";
        return "✅ " + (section.isEmpty() ? "No pending products data available." : section);
    }

    private String extractAdminRefundBlock(String ctx) {
        if (ctx == null || !ctx.contains("REFUNDS:")) {
            return "💰 Visit **Refund Management** in the admin panel to process pending refunds.";
        }
        int start = ctx.indexOf("\nREFUNDS:");
        int end = ctx.indexOf("\nALL ORDERS:");
        if (end == -1) end = ctx.length();
        String section = start >= 0 ? ctx.substring(start, Math.min(end, ctx.length())).trim() : "";
        return "💰 " + (section.isEmpty() ? "No refund data available." : section);
    }

    private String extractAdminStatsBlock(String ctx) {
        if (ctx == null || ctx.isBlank()) {
            return "📊 Check the Analytics section in the admin panel for full platform statistics.";
        }
        // Return the full context block (trimmed) — it's already a clean stats summary
        String trimmed = ctx.length() > 800 ? ctx.substring(0, 800) + "..." : ctx;
        return "📊 Here's the current platform snapshot:\n\n" + trimmed;
    }

    // ── Utility helpers ───────────────────────────────────────────────────────

    private boolean any(String msg, String... keywords) {
        for (String kw : keywords) if (msg.contains(kw)) return true;
        return false;
    }

    private String extractText(String json) {
        try {
            int idx = json.indexOf("\"text\":");
            if (idx == -1) return null;
            int s = json.indexOf("\"", idx + 7) + 1;
            int e = s;
            while (e < json.length()) {
                if (json.charAt(e) == '"' && json.charAt(e - 1) != '\\') break;
                e++;
            }
            return json.substring(s, e)
                    .replace("\\n", "\n")
                    .replace("\\\"", "\"")
                    .replace("\\'", "'")
                    .replace("\\\\", "\\");
        } catch (Exception ex) {
            log.error("extractText: {}", ex.getMessage());
            return null;
        }
    }

    private String toJson(String text) {
        return "\"" + text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
    }
}