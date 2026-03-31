package com.example.ekart.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Refund;
import com.example.ekart.dto.RefundStatus;
import com.example.ekart.dto.TrackingStatus;
// import com.example.ekart.helper.EmailSender; // unused
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.RefundRepository;

/**
 * Service for managing refund requests.
 * Handles creation, approval, rejection, and notifications.
 */
@Service
public class RefundService {

    @Autowired
    private RefundRepository refundRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    // private EmailSender emailSender; // unused

    // ───────────────────────────────────────────────────────────────────────────
    // QUERY METHODS
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Get all pending refund requests.
     */
    public List<Refund> getPendingRefunds() {
        return refundRepository.findByStatusOrderByRequestedAtDesc(RefundStatus.PENDING);
    }

    /**
     * Get all processed refunds (approved/rejected).
     */
    public List<Refund> getProcessedRefunds() {
        return refundRepository.findByStatusNotOrderByProcessedAtDesc(RefundStatus.PENDING);
    }

    /**
     * Get all refunds.
     */
    public List<Refund> getAllRefunds() {
        return refundRepository.findAllByOrderByRequestedAtDesc();
    }

    /**
     * Get refund by ID.
     */
    public Refund getRefundById(int id) {
        return refundRepository.findById(id).orElse(null);
    }

    /**
     * Get pending refund count.
     */
    public long getPendingCount() {
        return refundRepository.countByStatus(RefundStatus.PENDING);
    }

    /**
     * Get total pending refund amount.
     */
    public double getTotalPendingAmount() {
        return getPendingRefunds().stream()
                .mapToDouble(Refund::getAmount)
                .sum();
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CUSTOMER METHODS
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Create a refund request from customer.
     * Financial Guard: Amount cannot exceed order total.
     */
    public Map<String, Object> createRefundRequest(Order order, Customer customer, double amount, String reason) {
        // Validate order exists
        if (order == null) {
            return Map.of("success", false, "message", "Order not found");
        }

        // Validate customer owns the order
        if (order.getCustomer().getId() != customer.getId()) {
            return Map.of("success", false, "message", "You can only request refund for your own orders");
        }

        // Check if order is already refunded
        if (order.getTrackingStatus() == TrackingStatus.REFUNDED) {
            return Map.of("success", false, "message", "Order has already been refunded");
        }

        // Check if a pending refund already exists for this order
        if (refundRepository.existsByOrderAndStatus(order, RefundStatus.PENDING)) {
            return Map.of("success", false, "message", "A refund request is already pending for this order");
        }

        // Financial Guard: Amount cannot exceed order total
        double maxRefundable = order.getTotalPrice();
        if (amount > maxRefundable) {
            return Map.of("success", false, 
                "message", "Refund amount cannot exceed order total (₹" + String.format("%.2f", maxRefundable) + ")");
        }

        if (amount <= 0) {
            return Map.of("success", false, "message", "Refund amount must be greater than zero");
        }

        // Create refund request
        Refund refund = new Refund();
        refund.setOrder(order);
        refund.setCustomer(customer);
        refund.setAmount(amount);
        refund.setReason(reason);
        refund.setStatus(RefundStatus.PENDING);

        refundRepository.save(refund);

        return Map.of("success", true, "message", "Refund request submitted successfully", "refundId", refund.getId());
    }

    // ───────────────────────────────────────────────────────────────────────────
    // ADMIN METHODS
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Approve a refund request.
     * Updates refund status to APPROVED and order status to REFUNDED.
     */
    public Map<String, Object> approveRefund(int refundId, String adminEmail) {
        Refund refund = refundRepository.findById(refundId).orElse(null);
        if (refund == null) {
            return Map.of("success", false, "message", "Refund request not found");
        }

        if (refund.getStatus() != RefundStatus.PENDING) {
            return Map.of("success", false, "message", "Refund has already been processed");
        }

        // Update refund status
        refund.setStatus(RefundStatus.APPROVED);
        refund.setProcessedAt(LocalDateTime.now());
        refund.setProcessedBy(adminEmail);
        refundRepository.save(refund);

        // Update order status to REFUNDED
        Order order = refund.getOrder();
        order.setTrackingStatus(TrackingStatus.REFUNDED);
        order.setReplacementRequested(false); // Clear any replacement flag
        orderRepository.save(order);

        // Send notification to customer (stub - can be enhanced)
        sendRefundStatusNotification(refund.getCustomer(), refund, true, null);

        return Map.of("success", true, "message", "Refund approved for Order #" + order.getId());
    }

    /**
     * Reject a refund request.
     * Updates refund status to REJECTED with reason.
     */
    public Map<String, Object> rejectRefund(int refundId, String rejectionReason, String adminEmail) {
        Refund refund = refundRepository.findById(refundId).orElse(null);
        if (refund == null) {
            return Map.of("success", false, "message", "Refund request not found");
        }

        if (refund.getStatus() != RefundStatus.PENDING) {
            return Map.of("success", false, "message", "Refund has already been processed");
        }

        if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
            return Map.of("success", false, "message", "Rejection reason is required");
        }

        // Update refund status
        refund.setStatus(RefundStatus.REJECTED);
        refund.setRejectionReason(rejectionReason);
        refund.setProcessedAt(LocalDateTime.now());
        refund.setProcessedBy(adminEmail);
        refundRepository.save(refund);

        // Clear replacement flag on order
        Order order = refund.getOrder();
        order.setReplacementRequested(false);
        orderRepository.save(order);

        // Send notification to customer (stub - can be enhanced)
        sendRefundStatusNotification(refund.getCustomer(), refund, false, rejectionReason);

        return Map.of("success", true, "message", "Refund rejected for Order #" + order.getId());
    }

    // ───────────────────────────────────────────────────────────────────────────
    // NOTIFICATION STUB
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Send notification to customer about refund status change.
     * This is a stub - can be enhanced to send actual emails.
     */
    private void sendRefundStatusNotification(Customer customer, Refund refund, boolean approved, String rejectionReason) {
        // Log notification (stub for email - can be expanded later)
        String status = approved ? "APPROVED" : "REJECTED";
        System.out.println("📬 REFUND NOTIFICATION:");
        System.out.println("   Customer: " + customer.getName() + " (" + customer.getEmail() + ")");
        System.out.println("   Order #" + refund.getOrder().getId());
        System.out.println("   Amount: ₹" + String.format("%.2f", refund.getAmount()));
        System.out.println("   Status: " + status);
        if (rejectionReason != null) {
            System.out.println("   Rejection Reason: " + rejectionReason);
        }

        // TODO: Implement actual email sending using emailSender
        // You can create a refund-status-email.html template and call:
        // emailSender.sendRefundStatus(customer, refund.getOrder().getId(), refund.getAmount(), approved, rejectionReason);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // MIGRATION HELPER
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Migrate existing replacement requests to the new Refund system.
     * Call this once to convert existing replacementRequested orders to Refund entities.
     */
    public int migrateExistingReplacementRequests() {
        List<Order> ordersWithReplacementRequest = orderRepository.findAll().stream()
                .filter(Order::isReplacementRequested)
                .filter(o -> !refundRepository.existsByOrderAndStatus(o, RefundStatus.PENDING))
                .toList();

        int migrated = 0;
        for (Order order : ordersWithReplacementRequest) {
            Refund refund = new Refund();
            refund.setOrder(order);
            refund.setCustomer(order.getCustomer());
            refund.setAmount(order.getTotalPrice());
            refund.setReason("Legacy replacement/refund request (migrated)");
            refund.setStatus(RefundStatus.PENDING);
            refundRepository.save(refund);
            migrated++;
        }

        System.out.println("🔄 Migrated " + migrated + " existing replacement requests to Refund system");
        return migrated;
    }
}
