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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AiAssistantService {

    private static final Logger logger = LoggerFactory.getLogger(AiAssistantService.class);

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    // ── System prompt ────────────────────────────────────────────────────────

    private String buildSystemPrompt(String role) {
        return "You are Ekart Assistant — the official AI helper for Ekart, an Indian e-commerce platform. " +
               "Rules: " +
               "1. Keep replies SHORT (2-3 sentences max) unless a step-by-step explanation is clearly needed. " +
               "2. Use Indian Rupee ₹ for any price references. " +
               "3. Be friendly, concise, and to the point. Use 1 relevant emoji per reply. " +
               "4. ONLY answer questions about: shopping, orders, cart, products, payments, delivery, returns, refunds, " +
               "   accounts, wishlist, stock, vendor management, admin tasks on Ekart. " +
               "5. If the question is completely unrelated to Ekart or shopping, say: " +
               "   'I can only help with Ekart-related questions. Try asking about orders, products, or delivery!' " +
               "6. Never mention competitor platforms like Amazon, Flipkart, Meesho etc. " +
               "Current user role: " + role + ". " +
               roleContext(role);
    }

    private String roleContext(String role) {
        switch (role) {
            case "customer":
                return "Customer can: browse products, add to cart, checkout, track orders, cancel orders, " +
                       "request refunds or replacements, manage wishlist, write reviews, use multiple addresses. " +
                       "Free delivery above ₹500. Standard delivery is ₹40.";
            case "vendor":
                return "Vendor can: add/edit/delete products, upload images and videos, set stock alerts, " +
                       "view daily/weekly/monthly sales reports, manage store front, see vendor ID/code. " +
                       "Products need admin approval before going live.";
            case "admin":
                return "Admin can: approve/reject products, manage users, process refunds, manage banners, " +
                       "view analytics, handle reviews, search users, oversee platform activity.";
            default:
                return "Guest can: browse products without logging in. Encourage them to register for full access.";
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public String getReply(String userMessage, String role) {
        return getReply(userMessage, role, new ArrayList<>());
    }

    /**
     * Main entry point — supports conversation history for multi-turn context.
     * history is a list of {role: "user"/"model", text: "..."} maps.
     */
    public String getReply(String userMessage, String role, List<Map<String, String>> history) {
        if (userMessage == null || userMessage.isBlank()) {
            return "Please type a message so I can help! 😊";
        }

        // Try Gemini if key is configured
        if (apiKey != null && !apiKey.isBlank()) {
            try {
                String reply = getGeminiReply(userMessage, role, history);
                if (reply != null && !reply.isBlank()) return reply;
            } catch (Exception e) {
                logger.warn("Gemini API failed ({}), using local fallback", e.getMessage());
            }
        }

        // Fallback to local smart responses
        return getLocalResponse(userMessage, role);
    }

    // ── Gemini API call ───────────────────────────────────────────────────────

    private String getGeminiReply(String userMessage, String role, List<Map<String, String>> history)
            throws Exception {

        StringBuilder contentsBuilder = new StringBuilder();
        contentsBuilder.append("[");

        // Build history turns
        for (Map<String, String> turn : history) {
            String turnRole = "user".equals(turn.get("role")) ? "user" : "model";
            String turnText = turn.getOrDefault("text", "");
            contentsBuilder.append("{\"role\":\"").append(turnRole).append("\",")
                    .append("\"parts\":[{\"text\":").append(toJson(turnText)).append("}]},");
        }

        // Current user message (prepend system prompt on first turn or if history is empty)
        String fullMessage = history.isEmpty()
                ? buildSystemPrompt(role) + "\n\nUser: " + userMessage
                : userMessage;

        contentsBuilder.append("{\"role\":\"user\",\"parts\":[{\"text\":")
                .append(toJson(fullMessage)).append("}]}]");

        String jsonBody = "{\"contents\":" + contentsBuilder + "," +
                "\"generationConfig\":{\"temperature\":0.4,\"maxOutputTokens\":300}}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(
                        "https://generativelanguage.googleapis.com/v1beta/models/" +
                        "gemini-1.5-flash:generateContent?key=" + apiKey))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        // Use async send with hard timeout — avoids blocking HTTP thread for 10s
        HttpResponse<String> response = httpClient.sendAsync(request,
                HttpResponse.BodyHandlers.ofString()).get(10, TimeUnit.SECONDS);

        if (response.statusCode() == 200) {
            String text = extractGeminiText(response.body());
            if (text != null && !text.isBlank()) {
                return text.trim();
            }
        } else {
            logger.error("Gemini error {}: {}", response.statusCode(), response.body().substring(0, Math.min(200, response.body().length())));
        }
        return null;
    }

    // ── Local fallback ─────────────────────────────────────────────────────────

    private String getLocalResponse(String userMessage, String role) {
        String msg = userMessage.toLowerCase().trim();

        // Greetings
        if (matches(msg, "hello", "hi", "hey", "good morning", "good evening", "namaste", "howdy")) {
            Map<String, String> greet = Map.of(
                    "customer", "👋 Hi! I'm your Ekart Assistant. Ask me about your orders, products, cart, or delivery!",
                    "vendor",   "👋 Hello! I'm here to help you manage your Ekart store. Ask about products, stock, or sales reports!",
                    "admin",    "👋 Hi Admin! I can help with product approvals, user management, refunds, and more.",
                    "guest",    "👋 Welcome to Ekart! Register or login to start shopping. Need help?"
            );
            return greet.getOrDefault(role, "👋 Hi! How can I help you with Ekart today?");
        }

        // Order tracking
        if (matches(msg, "track", "where is my order", "delivery status", "shipment")) {
            if ("customer".equals(role))
                return "📦 Go to 'Track Orders' in your dashboard. Each order shows real-time status: Placed → Confirmed → Packed → Shipped → Out for Delivery → Delivered.";
            return "📦 Order tracking is available in the customer dashboard under 'Track Orders'.";
        }

        // Cancel order
        if (matches(msg, "cancel", "cancel order")) {
            if ("customer".equals(role))
                return "❌ Go to 'View Orders', find your order, and click 'Cancel'. You'll receive a cancellation email. Refunds are processed within 5-7 business days.";
        }

        // Cart
        if (matches(msg, "cart", "add to cart", "remove from cart", "empty cart")) {
            return "🛒 You can view and manage your cart from the cart icon in the navbar. Adjust quantities or remove items before checkout.";
        }

        // Payment / checkout
        if (matches(msg, "payment", "pay", "checkout", "razorpay", "cod", "cash on delivery")) {
            return "💳 Ekart supports Razorpay (UPI, cards, net banking) and Cash on Delivery. Free delivery on orders above ₹500, else ₹40 delivery charge.";
        }

        // Delivery charge
        if (matches(msg, "delivery charge", "shipping", "free delivery", "delivery fee")) {
            return "🚚 Orders above ₹500 get FREE delivery. Below ₹500, a ₹40 delivery charge applies. Choose a delivery time slot at checkout!";
        }

        // Return / replacement / refund
        if (matches(msg, "return", "replacement", "refund", "replace", "damaged")) {
            return "🔄 Returns and replacements are allowed within 7 days of order. Go to 'View Orders' → select your order → click 'Request Replacement'. Refunds take 5-7 business days.";
        }

        // Products
        if (matches(msg, "product", "browse", "search", "filter", "category", "view products")) {
            if ("customer".equals(role))
                return "🛍️ Browse all products from your home screen. Use the search bar or category filters to find what you need. Click any product for full details, images, and reviews.";
            if ("vendor".equals(role))
                return "📦 Go to 'Add Product' to list a new item. Fill in name, price, description, category, stock, and upload images/video. Your product goes live after admin approval.";
        }

        // Sales report (vendor)
        if (matches(msg, "sales", "revenue", "report", "analytics", "sales report")) {
            if ("vendor".equals(role))
                return "📊 Check your Sales Report for daily, weekly, and monthly breakdowns — revenue, orders, items sold, and top products. It updates in real-time!";
            if ("admin".equals(role))
                return "📊 Platform analytics are in the Analytics section. View top vendors, category revenue, daily trends, and overall performance.";
        }

        // Stock
        if (matches(msg, "stock", "stock alert", "inventory", "out of stock")) {
            if ("vendor".equals(role))
                return "📉 Go to 'Stock Alerts' to see low-stock products. You can set a threshold per product — you'll be notified when stock drops below it.";
        }

        // Reviews
        if (matches(msg, "review", "rating", "feedback", "comment")) {
            if ("customer".equals(role))
                return "⭐ You can leave a review and rating on any product from the 'View Products' page. Honest feedback helps other shoppers!";
            if ("admin".equals(role))
                return "⭐ Manage all customer reviews from the 'Reviews' section in admin panel. You can filter by rating and delete inappropriate ones.";
        }

        // Wishlist
        if (matches(msg, "wishlist", "favourite", "save product", "saved items")) {
            return "❤️ Add products to your Wishlist from the product page. Access your wishlist from the navbar to move items to cart.";
        }

        // Account / profile
        if (matches(msg, "profile", "account", "password", "email", "name")) {
            return "👤 Manage your profile, password, and addresses from 'My Profile'. Use Forgot Password on the login page to reset it via OTP.";
        }

        // Help
        if (matches(msg, "help", "what can you do", "features", "options")) {
            Map<String, String> help = Map.of(
                    "customer", "I can help with: 🛒 cart, 📦 orders & tracking, 💳 payments, 🚚 delivery, 🔄 returns, ❤️ wishlist, ⭐ reviews, 👤 account. Just ask!",
                    "vendor",   "I can help with: 📦 adding products, 📊 sales reports, 📉 stock alerts, 🏪 store front. Just ask!",
                    "admin",    "I can help with: ✅ product approvals, 👥 user management, 💰 refunds, ⭐ reviews, 📊 analytics. Just ask!",
                    "guest",    "I can tell you about Ekart's features. Register for free to start shopping! 🛍️"
            );
            return help.getOrDefault(role, "Ask me anything about Ekart — orders, products, delivery, or account!");
        }

        // Vendor ID
        if (matches(msg, "vendor id", "vendor code", "my id")) {
            if ("vendor".equals(role))
                return "🪪 Your Vendor ID and Code are shown on your Sales Report page header. Share it with admin if you need account-level help.";
        }

        // Address
        if (matches(msg, "address", "delivery address", "add address", "location")) {
            return "📍 Manage your delivery addresses from 'My Profile' → 'Addresses'. You can add multiple addresses and select one at checkout.";
        }

        // Default
        return "Got it! 😊 For the best help, try asking about: orders, cart, products, payments, delivery, or returns.";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean matches(String msg, String... keywords) {
        for (String kw : keywords) {
            if (msg.contains(kw)) return true;
        }
        return false;
    }

    private String extractGeminiText(String json) {
        try {
            int textIdx = json.indexOf("\"text\":");
            if (textIdx == -1) return null;
            int start = json.indexOf("\"", textIdx + 7) + 1;
            int end = start;
            while (end < json.length()) {
                if (json.charAt(end) == '"' && json.charAt(end - 1) != '\\') break;
                end++;
            }
            return json.substring(start, end)
                    .replace("\\n", "\n")
                    .replace("\\\"", "\"")
                    .replace("\\'", "'")
                    .replace("\\\\", "\\");
        } catch (Exception e) {
            logger.error("Failed to extract Gemini text: {}", e.getMessage());
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