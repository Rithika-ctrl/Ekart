package com.example.ekart.controller;

import com.example.ekart.dto.*;
import com.example.ekart.repository.*;
import com.example.ekart.service.AiAssistantService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * LOCATION: src/main/java/com/example/ekart/controller/ChatController.java
 *
 * Enhanced chat controller — injects real user data into the AI context
 * so the assistant can give specific, personalised answers instead of
 * generic navigation instructions.
 *
 * Data injected per role:
 *  Customer → last 10 orders (with status/items), cart contents, pending refunds
 *  Vendor   → their products (approved/pending), last 10 orders for their products
 *  Admin    → pending product approvals, pending refunds, recent order counts
 */
@RestController
public class ChatController {

    @Autowired private AiAssistantService aiAssistantService;
    @Autowired private OrderRepository    orderRepository;
    @Autowired private ProductRepository  productRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private RefundRepository   refundRepository;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy");

    // ── POST /chat ────────────────────────────────────────────────────────────

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        String userMessage = ((String) body.getOrDefault("message", "")).trim();
        if (userMessage.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("reply", "Please type a message."));
        }

        // ── Detect role ───────────────────────────────────────────────────────
        String role = "guest";
        String userName = "there";
        Object sessionUser = null;

        if (session.getAttribute("customer") != null) {
            role = "customer";
            Customer c = (Customer) session.getAttribute("customer");
            userName = c.getName();
            sessionUser = c;
        } else if (session.getAttribute("vendor") != null) {
            role = "vendor";
            Vendor v = (Vendor) session.getAttribute("vendor");
            userName = v.getName();
            sessionUser = v;
        } else if (session.getAttribute("admin") != null) {
            role = "admin";
            userName = "Admin";
            sessionUser = session.getAttribute("admin");
        }

        // ── Build context block ───────────────────────────────────────────────
        String contextBlock = buildContext(role, sessionUser, session);

        // ── Get AI reply ──────────────────────────────────────────────────────
        @SuppressWarnings("unchecked")
        List<Map<String, String>> history =
                (List<Map<String, String>>) body.getOrDefault("history", new ArrayList<>());

        String reply = aiAssistantService.getReply(userMessage, role, userName, contextBlock, history);

        return ResponseEntity.ok(Map.of(
                "reply", reply,
                "role",  role,
                "name",  userName
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD CONTEXT — the real user data injected into the AI system prompt
    // ─────────────────────────────────────────────────────────────────────────

    private String buildContext(String role, Object sessionUser, HttpSession session) {
        StringBuilder ctx = new StringBuilder();

        switch (role) {

            // ── CUSTOMER ──────────────────────────────────────────────────────
            case "customer": {
                Customer c = customerRepository.findById(
                        ((Customer) sessionUser).getId()).orElse((Customer) sessionUser);

                ctx.append("=== CUSTOMER DATA ===\n");
                ctx.append("Name: ").append(c.getName()).append("\n");
                ctx.append("Email: ").append(c.getEmail()).append("\n");
                ctx.append("Customer ID: ").append(c.getId()).append("\n");

                // Cart
                if (c.getCart() != null && c.getCart().getItems() != null
                        && !c.getCart().getItems().isEmpty()) {
                    List<Item> cartItems = c.getCart().getItems();
                    double cartTotal = cartItems.stream()
                            .mapToDouble(i -> i.getUnitPrice() > 0
                                    ? i.getUnitPrice() * i.getQuantity()
                                    : i.getPrice())
                            .sum();
                    ctx.append("\nCART (").append(cartItems.size()).append(" items, ₹")
                       .append(String.format("%.0f", cartTotal)).append(" total):\n");
                    for (Item item : cartItems) {
                        double unitP = item.getUnitPrice() > 0 ? item.getUnitPrice()
                                : item.getPrice() / Math.max(item.getQuantity(), 1);
                        ctx.append("  - ").append(item.getName())
                           .append(" × ").append(item.getQuantity())
                           .append(" @ ₹").append(String.format("%.0f", unitP))
                           .append(" [category: ").append(item.getCategory()).append("]\n");
                    }
                    ctx.append("  Delivery: ").append(cartTotal >= 500 ? "FREE" : "₹40").append("\n");
                } else {
                    ctx.append("\nCART: Empty\n");
                }

                // Orders (last 10)
                List<Order> orders = orderRepository.findByCustomer(c);
                if (orders.isEmpty()) {
                    ctx.append("\nORDERS: No orders placed yet.\n");
                } else {
                    // Sort newest first
                    orders.sort((a, b) -> {
                        if (a.getOrderDate() == null) return 1;
                        if (b.getOrderDate() == null) return -1;
                        return b.getOrderDate().compareTo(a.getOrderDate());
                    });
                    List<Order> recent = orders.stream().limit(10).collect(Collectors.toList());
                    ctx.append("\nORDERS (").append(orders.size()).append(" total, showing last ")
                       .append(recent.size()).append("):\n");
                    for (Order o : recent) {
                        ctx.append("  Order #").append(o.getId())
                           .append(" | ₹").append(String.format("%.0f", o.getAmount()))
                           .append(" | Status: ").append(o.getTrackingStatus().getDisplayName())
                           .append(" | Items: ");
                        if (o.getItems() != null && !o.getItems().isEmpty()) {
                            ctx.append(o.getItems().stream()
                                    .map(i -> i.getName() + " ×" + i.getQuantity())
                                    .collect(Collectors.joining(", ")));
                        }
                        if (o.getOrderDate() != null)
                            ctx.append(" | Placed: ").append(o.getOrderDate().format(DATE_FMT));
                        if (o.getDeliveryTime() != null && !o.getDeliveryTime().isBlank())
                            ctx.append(" | ETA: ").append(o.getDeliveryTime());
                        if (o.getCurrentCity() != null && !o.getCurrentCity().isBlank()
                                && o.getTrackingStatus() != TrackingStatus.DELIVERED)
                            ctx.append(" | Currently at: ").append(o.getCurrentCity());
                        ctx.append("\n");
                    }
                }

                // Pending refunds
                List<Refund> refunds = refundRepository.findByCustomer(c);
                List<Refund> pendingRefunds = refunds.stream()
                        .filter(r -> r.getStatus() == RefundStatus.PENDING)
                        .collect(Collectors.toList());
                if (!pendingRefunds.isEmpty()) {
                    ctx.append("\nPENDING REFUNDS (").append(pendingRefunds.size()).append("):\n");
                    for (Refund r : pendingRefunds) {
                        ctx.append("  - Refund #").append(r.getId())
                           .append(" | Order #").append(r.getOrder() != null ? r.getOrder().getId() : "?")
                           .append(" | ₹").append(String.format("%.0f", r.getAmount()))
                           .append(" | Reason: ").append(r.getReason())
                           .append("\n");
                    }
                }

                // Addresses
                if (c.getAddresses() != null && !c.getAddresses().isEmpty()) {
                    ctx.append("\nSAVED ADDRESSES: ").append(c.getAddresses().size()).append("\n");
                    for (Address a : c.getAddresses()) {
                        ctx.append("  - ").append(a.getRecipientName() != null ? a.getRecipientName() : "")
                           .append(", ").append(a.getCity() != null ? a.getCity() : "")
                           .append(" ").append(a.getPostalCode() != null ? a.getPostalCode() : "")
                           .append("\n");
                    }
                }
                break;
            }

            // ── VENDOR ────────────────────────────────────────────────────────
            case "vendor": {
                Vendor v = (Vendor) sessionUser;
                ctx.append("=== VENDOR DATA ===\n");
                ctx.append("Name: ").append(v.getName()).append("\n");
                ctx.append("Email: ").append(v.getEmail()).append("\n");
                ctx.append("Vendor ID: ").append(v.getId()).append("\n");
                if (v.getVendorCode() != null)
                    ctx.append("Vendor Code: ").append(v.getVendorCode()).append("\n");

                // Their products
                List<Product> products = productRepository.findByVendor(v);
                long approved = products.stream().filter(Product::isApproved).count();
                long pending  = products.stream().filter(p -> !p.isApproved()).count();
                ctx.append("\nPRODUCTS: ").append(products.size()).append(" total (")
                   .append(approved).append(" live, ").append(pending).append(" pending approval)\n");

                if (!products.isEmpty()) {
                    // Show low-stock products first
                    List<Product> lowStock = products.stream()
                            .filter(p -> p.getStock() <= (p.getStockAlertThreshold() != null ? p.getStockAlertThreshold() : 10))
                            .collect(Collectors.toList());
                    if (!lowStock.isEmpty()) {
                        ctx.append("  LOW STOCK ALERT (").append(lowStock.size()).append(" products):\n");
                        for (Product p : lowStock.stream().limit(5).collect(Collectors.toList())) {
                            ctx.append("    - ").append(p.getName())
                               .append(" | Stock: ").append(p.getStock())
                               .append(" | ₹").append(String.format("%.0f", p.getPrice())).append("\n");
                        }
                    }
                    // Recent products
                    ctx.append("  RECENT PRODUCTS (up to 10):\n");
                    for (Product p : products.stream().limit(10).collect(Collectors.toList())) {
                        ctx.append("    - [").append(p.isApproved() ? "LIVE" : "PENDING").append("] ")
                           .append(p.getName())
                           .append(" | ₹").append(String.format("%.0f", p.getPrice()))
                           .append(" | Stock: ").append(p.getStock())
                           .append(" | Category: ").append(p.getCategory())
                           .append("\n");
                    }
                }

                // Their orders
                List<Order> vendorOrders = orderRepository.findOrdersByVendor(v);
                if (!vendorOrders.isEmpty()) {
                    vendorOrders.sort((a, b) -> {
                        if (a.getOrderDate() == null) return 1;
                        if (b.getOrderDate() == null) return -1;
                        return b.getOrderDate().compareTo(a.getOrderDate());
                    });
                    long pendingOrders = vendorOrders.stream()
                            .filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING
                                    || o.getTrackingStatus() == TrackingStatus.PACKED)
                            .count();
                    double totalRevenue = vendorOrders.stream()
                            .filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED)
                            .mapToDouble(Order::getAmount).sum();
                    ctx.append("\nORDERS: ").append(vendorOrders.size()).append(" total | ")
                       .append(pendingOrders).append(" pending | Total revenue: ₹")
                       .append(String.format("%.0f", totalRevenue)).append("\n");
                    ctx.append("  RECENT ORDERS (last 5):\n");
                    for (Order o : vendorOrders.stream().limit(5).collect(Collectors.toList())) {
                        ctx.append("    Order #").append(o.getId())
                           .append(" | ₹").append(String.format("%.0f", o.getAmount()))
                           .append(" | ").append(o.getTrackingStatus().getDisplayName());
                        if (o.getOrderDate() != null)
                            ctx.append(" | ").append(o.getOrderDate().format(DATE_FMT));
                        ctx.append("\n");
                    }
                } else {
                    ctx.append("\nORDERS: No orders for your products yet.\n");
                }
                break;
            }

            // ── ADMIN ─────────────────────────────────────────────────────────
            case "admin": {
                ctx.append("=== ADMIN DASHBOARD DATA ===\n");

                // Pending product approvals
                List<Product> allProducts = productRepository.findAll();
                long pendingProducts  = allProducts.stream().filter(p -> !p.isApproved()).count();
                long approvedProducts = allProducts.stream().filter(Product::isApproved).count();
                ctx.append("PRODUCTS: ").append(allProducts.size()).append(" total | ")
                   .append(approvedProducts).append(" approved | ")
                   .append(pendingProducts).append(" pending approval\n");

                if (pendingProducts > 0) {
                    ctx.append("  PENDING APPROVALS:\n");
                    allProducts.stream()
                               .filter(p -> !p.isApproved())
                               .limit(10)
                               .forEach(p -> ctx.append("    - ").append(p.getName())
                                       .append(" | ₹").append(String.format("%.0f", p.getPrice()))
                                       .append(" | by ").append(p.getVendor() != null ? p.getVendor().getName() : "Unknown")
                                       .append("\n"));
                }

                // Pending refunds
                long pendingRefunds = refundRepository.countByStatus(RefundStatus.PENDING);
                List<Refund> recentRefunds = refundRepository.findByStatusOrderByRequestedAtDesc(RefundStatus.PENDING);
                ctx.append("\nREFUNDS: ").append(pendingRefunds).append(" pending\n");
                if (!recentRefunds.isEmpty()) {
                    ctx.append("  PENDING REFUNDS (top 5):\n");
                    recentRefunds.stream().limit(5).forEach(r ->
                        ctx.append("    - Refund #").append(r.getId())
                           .append(" | ₹").append(String.format("%.0f", r.getAmount()))
                           .append(" | Order #").append(r.getOrder() != null ? r.getOrder().getId() : "?")
                           .append(" | Customer: ").append(r.getCustomer() != null ? r.getCustomer().getName() : "?")
                           .append("\n"));
                }

                // All orders summary
                List<Order> allOrders = orderRepository.findAll();
                long processingOrders = allOrders.stream()
                        .filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING).count();
                long deliveredOrders  = allOrders.stream()
                        .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED).count();
                long cancelledOrders  = allOrders.stream()
                        .filter(o -> o.getTrackingStatus() == TrackingStatus.CANCELLED).count();
                ctx.append("\nALL ORDERS: ").append(allOrders.size()).append(" total | ")
                   .append(processingOrders).append(" processing | ")
                   .append(deliveredOrders).append(" delivered | ")
                   .append(cancelledOrders).append(" cancelled\n");

                // Customer count
                long totalCustomers = customerRepository.count();
                ctx.append("\nCUSTOMERS: ").append(totalCustomers).append(" registered\n");
                break;
            }

            default:
                ctx.append("=== GUEST USER ===\nNot logged in. Browsing as guest.\n");
        }

        return ctx.toString();
    }
}