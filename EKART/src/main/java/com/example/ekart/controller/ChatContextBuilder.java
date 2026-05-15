package com.example.ekart.controller;

import com.example.ekart.dto.*;
import com.example.ekart.repository.*;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * FIX: Issue 160 (S6541) — Brain Method refactor.
 *
 * All context-building logic extracted from ChatController into this
 * focused @Component, reducing ChatController to a thin REST handler.
 *
 * Responsibilities:
 *   buildForCustomer  — customer orders, cart, refunds, addresses
 *   buildForVendor    — vendor products, low-stock alerts, orders
 *   buildForAdmin     — pending approvals, refunds, order summary
 */
@Component
public class ChatContextBuilder {

    // FIX: Issue 161 — S1192: constant replaces the 3 duplicate " total | " literals
    private static final String TOTAL_SEP = " total | ";

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final OrderRepository    orderRepository;
    private final ProductRepository  productRepository;
    private final CustomerRepository customerRepository;
    private final RefundRepository   refundRepository;

    public ChatContextBuilder(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            RefundRepository refundRepository) {
        this.orderRepository    = orderRepository;
        this.productRepository  = productRepository;
        this.customerRepository = customerRepository;
        this.refundRepository   = refundRepository;
    }

    // ── CUSTOMER ──────────────────────────────────────────────────────────────

    public String buildForCustomer(Customer sessionUser) {
        Customer c = customerRepository.findById(sessionUser.getId()).orElse(sessionUser);

        StringBuilder ctx = new StringBuilder();
        ctx.append("=== CUSTOMER DATA ===\n");
        ctx.append("Name: ").append(c.getName()).append("\n");
        ctx.append("Email: ").append(c.getEmail()).append("\n");
        ctx.append("Customer ID: ").append(c.getId()).append("\n");

        appendCart(ctx, c);
        appendOrders(ctx, c);
        appendPendingRefunds(ctx, c);
        appendAddresses(ctx, c);

        return ctx.toString();
    }

    private void appendCart(StringBuilder ctx, Customer c) {
        if (c.getCart() == null || c.getCart().getItems() == null
                || c.getCart().getItems().isEmpty()) {
            ctx.append("\nCART: Empty\n");
            return;
        }

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
    }

    private void appendOrders(StringBuilder ctx, Customer c) {
        List<Order> orders = orderRepository.findByCustomer(c);
        if (orders.isEmpty()) {
            ctx.append("\nORDERS: No orders placed yet.\n");
            return;
        }

        orders.sort((a, b) -> {
            if (a.getOrderDate() == null) return 1;
            if (b.getOrderDate() == null) return -1;
            return b.getOrderDate().compareTo(a.getOrderDate());
        });

        List<Order> recent = orders.stream().limit(10).toList();
        ctx.append("\nORDERS (").append(orders.size()).append(" total, showing last ")
           .append(recent.size()).append("):\n");

        for (Order o : recent) {
            appendOrderLine(ctx, o);
        }
    }


    /** Appends a single order summary line to ctx — extracted to reduce appendOrders cognitive complexity. */
    private void appendOrderLine(StringBuilder ctx, Order o) {
        ctx.append("  Order #").append(o.getId())
           .append(" | ₹").append(String.format("%.0f", o.getAmount()))
           .append(" | Status: ").append(o.getTrackingStatus().getDisplayName())
           .append(" | Items: ");

        if (o.getItems() != null && !o.getItems().isEmpty()) {
            ctx.append(o.getItems().stream()
                    .map(i -> i.getName() + " ×" + i.getQuantity())
                    .collect(Collectors.joining(", ")));
        }
        if (o.getOrderDate() != null) {
            ctx.append(" | Placed: ").append(o.getOrderDate().format(DATE_FMT));
        }
        if (o.getDeliveryTime() != null && !o.getDeliveryTime().isBlank()) {
            ctx.append(" | ETA: ").append(o.getDeliveryTime());
        }
        if (o.getCurrentCity() != null && !o.getCurrentCity().isBlank()
                && o.getTrackingStatus() != TrackingStatus.DELIVERED) {
            ctx.append(" | Currently at: ").append(o.getCurrentCity());
        }
        ctx.append("\n");
    }
    private void appendPendingRefunds(StringBuilder ctx, Customer c) {
        List<Refund> pendingRefunds = refundRepository.findByCustomer(c).stream()
                .filter(r -> r.getStatus() == RefundStatus.PENDING)
                .toList();

        if (pendingRefunds.isEmpty()) return;

        ctx.append("\nPENDING REFUNDS (").append(pendingRefunds.size()).append("):\n");
        for (Refund r : pendingRefunds) {
            ctx.append("  - Refund #").append(r.getId())
               .append(" | Order #").append(r.getOrder() != null ? r.getOrder().getId() : "?")
               .append(" | ₹").append(String.format("%.0f", r.getAmount()))
               .append(" | Reason: ").append(r.getReason())
               .append("\n");
        }
    }

    private void appendAddresses(StringBuilder ctx, Customer c) {
        if (c.getAddresses() == null || c.getAddresses().isEmpty()) return;
        ctx.append("\nSAVED ADDRESSES: ").append(c.getAddresses().size()).append("\n");
        for (Address a : c.getAddresses()) {
            ctx.append("  - ").append(a.getRecipientName() != null ? a.getRecipientName() : "")
               .append(", ").append(a.getCity() != null ? a.getCity() : "")
               .append(" ").append(a.getPostalCode() != null ? a.getPostalCode() : "")
               .append("\n");
        }
    }

    // ── VENDOR ────────────────────────────────────────────────────────────────

    public String buildForVendor(Vendor v) {
        StringBuilder ctx = new StringBuilder();
        ctx.append("=== VENDOR DATA ===\n");
        ctx.append("Name: ").append(v.getName()).append("\n");
        ctx.append("Email: ").append(v.getEmail()).append("\n");
        ctx.append("Vendor ID: ").append(v.getId()).append("\n");
        if (v.getVendorCode() != null) {
            ctx.append("Vendor Code: ").append(v.getVendorCode()).append("\n");
        }

        appendVendorProducts(ctx, v);
        appendVendorOrders(ctx, v);

        return ctx.toString();
    }

    private void appendVendorProducts(StringBuilder ctx, Vendor v) {
        List<Product> products = productRepository.findByVendor(v);
        long approved = products.stream().filter(Product::isApproved).count();
        long pending  = products.stream().filter(p -> !p.isApproved()).count();
        ctx.append("\nPRODUCTS: ").append(products.size()).append(" total (")
           .append(approved).append(" live, ").append(pending).append(" pending approval)\n");

        if (products.isEmpty()) return;

        List<Product> lowStock = products.stream()
                .filter(p -> p.getStock() <= (p.getStockAlertThreshold() != null
                        ? p.getStockAlertThreshold() : 10))
                .toList();

        if (!lowStock.isEmpty()) {
            ctx.append("  LOW STOCK ALERT (").append(lowStock.size()).append(" products):\n");
            for (Product p : lowStock.stream().limit(5).toList()) {
                ctx.append("    - ").append(p.getName())
                   .append(" | Stock: ").append(p.getStock())
                   .append(" | ₹").append(String.format("%.0f", p.getPrice())).append("\n");
            }
        }

        ctx.append("  RECENT PRODUCTS (up to 10):\n");
        for (Product p : products.stream().limit(10).toList()) {
            ctx.append("    - [").append(p.isApproved() ? "LIVE" : "PENDING").append("] ")
               .append(p.getName())
               .append(" | ₹").append(String.format("%.0f", p.getPrice()))
               .append(" | Stock: ").append(p.getStock())
               .append(" | Category: ").append(p.getCategory())
               .append("\n");
        }
    }

    private void appendVendorOrders(StringBuilder ctx, Vendor v) {
        List<Order> vendorOrders = orderRepository.findOrdersByVendor(v);
        if (vendorOrders.isEmpty()) {
            ctx.append("\nORDERS: No orders for your products yet.\n");
            return;
        }

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

        ctx.append("\nORDERS: ").append(vendorOrders.size()).append(TOTAL_SEP)
           .append(pendingOrders).append(" pending | Total revenue: ₹")
           .append(String.format("%.0f", totalRevenue)).append("\n");

        ctx.append("  RECENT ORDERS (last 5):\n");
        for (Order o : vendorOrders.stream().limit(5).toList()) {
            ctx.append("    Order #").append(o.getId())
               .append(" | ₹").append(String.format("%.0f", o.getAmount()))
               .append(" | ").append(o.getTrackingStatus().getDisplayName());
            if (o.getOrderDate() != null) {
                ctx.append(" | ").append(o.getOrderDate().format(DATE_FMT));
            }
            ctx.append("\n");
        }
    }

    // ── ADMIN ─────────────────────────────────────────────────────────────────

    public String buildForAdmin() {
        StringBuilder ctx = new StringBuilder();
        ctx.append("=== ADMIN DASHBOARD DATA ===\n");

        appendAdminProducts(ctx);
        appendAdminRefunds(ctx);
        appendAdminOrders(ctx);

        long totalCustomers = customerRepository.count();
        ctx.append("\nCUSTOMERS: ").append(totalCustomers).append(" registered\n");

        return ctx.toString();
    }

    private void appendAdminProducts(StringBuilder ctx) {
        List<Product> allProducts = productRepository.findAll();
        long pendingProducts  = allProducts.stream().filter(p -> !p.isApproved()).count();
        long approvedProducts = allProducts.stream().filter(Product::isApproved).count();

        ctx.append("PRODUCTS: ").append(allProducts.size()).append(TOTAL_SEP)
           .append(approvedProducts).append(" approved | ")
           .append(pendingProducts).append(" pending approval\n");

        if (pendingProducts > 0) {
            ctx.append("  PENDING APPROVALS:\n");
            allProducts.stream()
                       .filter(p -> !p.isApproved())
                       .limit(10)
                       .forEach(p -> ctx.append("    - ").append(p.getName())
                               .append(" | ₹").append(String.format("%.0f", p.getPrice()))
                               .append(" | by ").append(p.getVendor() != null
                                       ? p.getVendor().getName() : "Unknown")
                               .append("\n"));
        }
    }

    private void appendAdminRefunds(StringBuilder ctx) {
        long pendingRefunds = refundRepository.countByStatus(RefundStatus.PENDING);
        List<Refund> recentRefunds =
                refundRepository.findByStatusOrderByRequestedAtDesc(RefundStatus.PENDING);

        ctx.append("\nREFUNDS: ").append(pendingRefunds).append(" pending\n");
        if (!recentRefunds.isEmpty()) {
            ctx.append("  PENDING REFUNDS (top 5):\n");
            recentRefunds.stream().limit(5).forEach(r ->
                ctx.append("    - Refund #").append(r.getId())
                   .append(" | ₹").append(String.format("%.0f", r.getAmount()))
                   .append(" | Order #").append(r.getOrder() != null ? r.getOrder().getId() : "?")
                   .append(" | Customer: ").append(r.getCustomer() != null
                           ? r.getCustomer().getName() : "?")
                   .append("\n"));
        }
    }

    private void appendAdminOrders(StringBuilder ctx) {
        List<Order> allOrders = orderRepository.findAll();
        long processingOrders = allOrders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING).count();
        long deliveredOrders  = allOrders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED).count();
        long cancelledOrders  = allOrders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.CANCELLED).count();

        ctx.append("\nALL ORDERS: ").append(allOrders.size()).append(TOTAL_SEP)
           .append(processingOrders).append(" processing | ")
           .append(deliveredOrders).append(" delivered | ")
           .append(cancelledOrders).append(" cancelled\n");
    }
}