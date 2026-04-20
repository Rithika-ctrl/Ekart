package com.example.ekart.service;
import com.example.ekart.dto.Address;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// ================================================================
// NEW FILE: src/main/java/com/example/ekart/service/CodPaymentService.java
//
// Purpose:
//   Manages COD (Cash On Delivery) payment workflow.
//   - Initializes COD orders without Razorpay pre-payment
//   - Tracks payment collection during delivery
//   - Handles COD verification and settlement linkage
//   - Supports admin oversight of COD cash collection
//
// Workflow:
//   1. Customer selects COD at checkout
//   2. Order created with payment_method=COD, paymentStatus=PENDING
//   3. Order proceeds through warehouse (no payment validation required)
//   4. Delivery boy collects cash at doorstep (OTP verification)
//   5. Warehouse staff verifies cash and settles to admin
//   6. Admin receives commission split (20% admin, 80% vendor)
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class CodPaymentService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CodPaymentService.class);

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final OrderRepository orderRepository;
    private final TrackingEventLogRepository trackingEventLogRepository;
    private final CashSettlementRepository cashSettlementRepository;
    private final SettlementOrderMappingRepository settlementOrderMappingRepository;
    private final DeliveryBoyRepository deliveryBoyRepository;
    private final EmailSender emailSender;

    public CodPaymentService(
            OrderRepository orderRepository,
            TrackingEventLogRepository trackingEventLogRepository,
            CashSettlementRepository cashSettlementRepository,
            SettlementOrderMappingRepository settlementOrderMappingRepository,
            DeliveryBoyRepository deliveryBoyRepository,
            EmailSender emailSender) {
        this.orderRepository = orderRepository;
        this.trackingEventLogRepository = trackingEventLogRepository;
        this.cashSettlementRepository = cashSettlementRepository;
        this.settlementOrderMappingRepository = settlementOrderMappingRepository;
        this.deliveryBoyRepository = deliveryBoyRepository;
        this.emailSender = emailSender;
    }



    // ─────────────────────────────────────────────────────────────────────────
    // COD ORDER INITIALIZATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a new COD order without requiring Razorpay pre-payment.
     * Sets payment_method = COD and paymentStatus = PENDING.
     *
     * @param order Order entity with customer, items, delivery address already set
     * @param codAmount Total amount customer will pay in cash (typically order.totalPrice + deliveryCharge)
     * @return Saved order with COD fields initialized
     */
    @Transactional
    public Order initializeCodOrder(Order order, double codAmount) {
        if (order == null) {
            throw new IllegalArgumentException("Order cannot be null");
        }

        if (codAmount <= 0) {
            throw new IllegalArgumentException("COD amount must be greater than 0");
        }

        // Set payment method and COD tracking fields
        order.setPaymentMethod("COD");
        order.setCodAmount(codAmount);
        order.setPaymentStatus("PENDING");  // Payment not yet collected

        // Note: Razorpay fields remain null for COD orders
        // razorpay_payment_id and razorpay_order_id are not set

        // Initialize tracking status to PROCESSING
        order.setTrackingStatus(TrackingStatus.PROCESSING);

        // Save order
        order = orderRepository.save(order);

        // Log event
        logCodEvent(order, "COD order initialized",
            "Customer selected Cash On Delivery. Amount: ₹" + codAmount + ". Awaiting warehouse processing.");

        // Email to customer
        try {
            emailSender.sendCodOrderConfirmation(order.getCustomer(), order);
        } catch (Exception e) {
            LOGGER.error("COD confirmation email failed: {}", e.getMessage(), e);
        }

        return order;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COD COLLECTION BY DELIVERY BOY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Called when delivery boy delivers COD order and customer pays in cash.
     * Updates payment_status from PENDING to COLLECTED.
     *
     * Preconditions:
     *   - Order status: OUT_FOR_DELIVERY
     *   - paymentStatus: PENDING
     *   - deliveryBoy: assigned and currently delivering
     *
     * @param orderId Order being delivered
     * @param deliveryBoyId Delivery boy collecting cash
     * @param description Notes about collection (e.g., "Cash received, ₹500")
     * @return Updated order with paymentStatus = COLLECTED
     */
    @Transactional
    public Order markCodCollected(int orderId, int deliveryBoyId, String description) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }

        // Verify it's a COD order
        if (!isCodOrder(order)) {
            throw new IllegalStateException("Order " + orderId + " is not a COD order");
        }

        // Verify order is currently being delivered
        if (order.getTrackingStatus() != TrackingStatus.OUT_FOR_DELIVERY) {
            throw new IllegalStateException("Order " + orderId + " is not OUT_FOR_DELIVERY. Current status: " + order.getTrackingStatus());
        }

        // Verify payment is not already collected
        if (!order.getPaymentStatus().equals("PENDING")) {
            throw new IllegalStateException("Order " + orderId + " payment status is already " + order.getPaymentStatus());
        }

        // Update payment fields
        order.setCodCollectedBy(deliveryBoyId);
        order.setCodCollectionTimestamp(LocalDateTime.now());
        order.setPaymentStatus("COLLECTED");

        order = orderRepository.save(order);

        // Log event (visible on order tracking/history)
        logCodEvent(order, "COD Payment Collected",
            "Delivery boy collected ₹" + order.getCodAmount() + ". " + (description != null ? description : ""));

        return order;
    }

    /**
     * Called by delivery boy when customer refuses to pay or rejects order.
     * Moves order back to warehouse for return processing.
     *
     * @param orderId Order to mark as collection failed
     * @param reason Reason for collection failure
     * @return Updated order
     */
    @Transactional
    public Order markCodCollectionFailed(int orderId, String reason) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }

        if (!isCodOrder(order)) {
            throw new IllegalStateException("Order is not a COD order");
        }

        // Mark as failed, keep payment status PENDING so can retry
        order.setPaymentStatus("COLLECTION_FAILED");
        order.setTrackingStatus(TrackingStatus.RETURN_IN_PROGRESS); // Or similar return status

        order = orderRepository.save(order);

        logCodEvent(order, "COD Collection Failed",
            "Reason: " + (reason != null ? reason : "Not specified"));

        return order;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COD VERIFICATION BY ADMIN / WAREHOUSE STAFF
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin verifies that COD cash was actually collected and amount is correct.
     * Updates payment_status from COLLECTED to VERIFIED.
     * Called before settlement processing.
     *
     * @param orderId Order to verify
     * @param verifiedBy Admin user ID
     * @param verificationNotes Notes (e.g., cash amount matches, verified with DB)
     * @return Updated order with paymentStatus = VERIFIED
     */
    @Transactional
    public Order verifyCodPayment(int orderId, int verifiedBy, String verificationNotes) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }

        if (!isCodOrder(order)) {
            throw new IllegalStateException("Order is not a COD order");
        }

        if (!order.getPaymentStatus().equals("COLLECTED")) {
            throw new IllegalStateException("Cannot verify COD order with payment_status = " + order.getPaymentStatus() + ". Expected COLLECTED.");
        }

        // Mark as verified
        order.setPaymentStatus("VERIFIED");
        order.setPaymentVerifiedAt(LocalDateTime.now());

        order = orderRepository.save(order);

        logCodEvent(order, "COD Payment Verified",
            "Verified by admin (ID: " + verifiedBy + "). " + (verificationNotes != null ? verificationNotes : ""));

        return order;
    }

    /**
     * Admin rejects COD payment (e.g., if cash amount doesn't match).
     * Sets payment_status to REJECTED so delivery boy can collect again or take back.
     *
     * @param orderId Order to reject
     * @param rejectionReason Reason for rejection
     * @return Updated order
     */
    @Transactional
    public Order rejectCodPayment(int orderId, String rejectionReason) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }

        if (!isCodOrder(order)) {
            throw new IllegalStateException("Order is not a COD order");
        }

        order.setPaymentStatus("REJECTED");
        order = orderRepository.save(order);

        logCodEvent(order, "COD Payment Rejected",
            "Reason: " + (rejectionReason != null ? rejectionReason : "Not specified"));

        // TODO: Notify delivery boy to collect again or take back

        return order;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COD PAYMENT QUERIES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all COD orders with a specific payment status.
     *
     * @param paymentStatus Status to filter by (e.g., "COLLECTED", "VERIFIED", "PENDING")
     * @return List of matching COD orders
     */
    public List<Order> getCodOrdersByPaymentStatus(String paymentStatus) {
        List<Order> allOrders = orderRepository.findAll();
        return allOrders.stream()
                .filter(this::isCodOrder)
                .filter(o -> o.getPaymentStatus() != null && o.getPaymentStatus().equals(paymentStatus))
                .collect(Collectors.toList());
    }

    /**
     * Get COD orders ready for admin verification.
     * These are COLLECTED but not yet VERIFIED.
     *
     * @return List of COD orders with paymentStatus = COLLECTED
     */
    public List<Order> getCodOrdersReadyForVerification() {
        return getCodOrdersByPaymentStatus("COLLECTED");
    }

    /**
     * Get COD orders verified and ready for settlement.
     * These are VERIFIED but not yet SETTLED.
     *
     * @return List of COD orders with paymentStatus = VERIFIED
     */
    public List<Order> getCodOrdersReadyForSettlement() {
        List<Order> allOrders = orderRepository.findAll();
        return allOrders.stream()
                .filter(this::isCodOrder)
                .filter(o -> o.getPaymentStatus() != null && o.getPaymentStatus().equals("VERIFIED"))
                .filter(o -> o.getCashSettlementId() == null)  // Not yet settled
                .collect(Collectors.toList());
    }

    /**
     * Get all COD orders for a specific vendor.
     *
     * @param vendorId Vendor ID
     * @return List of COD orders from this vendor
     */
    public List<Order> getCodOrdersForVendor(int vendorId) {
        List<Order> allOrders = orderRepository.findAll();
        return allOrders.stream()
                .filter(this::isCodOrder)
                .filter(o -> o.getVendor() != null && o.getVendor().getId() == vendorId)
                .collect(Collectors.toList());
    }

    /**
     * Get total COD amount collected but not yet settled for a vendor.
     *
     * @param vendorId Vendor ID
     * @return Sum of codAmount for VERIFIED but unsettled orders
     */
    public double getUnsettledCodAmountForVendor(int vendorId) {
        return getCodOrdersForVendor(vendorId).stream()
                .filter(o -> "VERIFIED".equals(o.getPaymentStatus()))
                .filter(o -> o.getCashSettlementId() == null)
                .mapToDouble(o -> o.getCodAmount() != null ? o.getCodAmount() : 0)
                .sum();
    }

    /**
     * Mark COD orders as settled after warehouse staff submits cash batch.
     *
     * @param settlementId Settlement batch ID
     * @param orderIds Order IDs being settled
     */
    @Transactional
    public void markOrdersAsSettled(int settlementId, List<Integer> orderIds) {
        for (Integer orderId : orderIds) {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order != null && isCodOrder(order)) {
                order.setCashSettlementId(settlementId);
                order.setPaymentStatus("SETTLED");
                orderRepository.save(order);

                logCodEvent(order, "COD Payment Settled",
                    "Included in settlement batch ID: " + settlementId);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Checks if an order is a COD order.
     *
     * @param order Order to check
     * @return true if paymentMethod == "COD"
     */
    public boolean isCodOrder(Order order) {
        return order != null && order.getPaymentMethod() != null && order.getPaymentMethod().equals("COD");
    }

    /**
     * Checks if an order is a Razorpay prepaid order.
     *
     * @param order Order to check
     * @return true if paymentMethod == "RAZORPAY"
     */
    public boolean isRazorpayOrder(Order order) {
        return order != null && order.getPaymentMethod() != null && order.getPaymentMethod().equals("RAZORPAY");
    }

    /**
     * Logs a COD-related event to TrackingEventLog.
     *
     * @param order Order to log for
     * @param eventTitle Event title (e.g., "COD Payment Collected")
     * @param eventDescription Detailed description
     */
    private void logCodEvent(Order order, String eventTitle, String eventDescription) {
        try {
            TrackingEventLog log = new TrackingEventLog(
                order,
                order.getTrackingStatus(),
                order.getCurrentCity() != null ? order.getCurrentCity() : "In Transit",
                "[COD] " + eventTitle + ": " + eventDescription,
                "system"
            );
            trackingEventLogRepository.save(log);
        } catch (Exception e) {
            LOGGER.error("Failed to log COD event: {}", e.getMessage(), e);
        }
    }

    /**
     * Calculates total COD revenue (all collected/verified orders) across all vendors.
     * Used for admin dashboard reporting.
     *
     * @return Total COD amount
     */
    public double calculateTotalCodRevenue() {
        List<Order> allCodOrders = getOrdersByCodStatus(null);
        return allCodOrders.stream()
                .filter(o -> "COLLECTED".equals(o.getPaymentStatus()) || "VERIFIED".equals(o.getPaymentStatus()) || "SETTLED".equals(o.getPaymentStatus()))
                .mapToDouble(o -> o.getCodAmount() != null ? o.getCodAmount() : 0)
                .sum();
    }

    /**
     * Helper to get all orders with specific payment status.
     * If paymentStatus is null, returns all COD orders.
     */
    private List<Order> getOrdersByCodStatus(String paymentStatus) {
        List<Order> allOrders = orderRepository.findAll();
        return allOrders.stream()
                .filter(this::isCodOrder)
                .filter(o -> paymentStatus == null || (o.getPaymentStatus() != null && o.getPaymentStatus().equals(paymentStatus)))
                .collect(Collectors.toList());
    }
}


