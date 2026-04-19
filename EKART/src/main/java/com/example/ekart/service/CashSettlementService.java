package com.example.ekart.service;
import java.util.stream.Collectors;
import java.util.Optional;
import java.time.LocalDateTime;

// ================================================================
// NEW FILE: src/main/java/com/example/ekart/service/CashSettlementService.java
//
// Purpose:
//   Manages multi-warehouse cash settlement workflow for COD orders.
//   - Warehouse staff collects verified COD cash and submits batches
//   - Admin reviews and approves settlements
//   - Commission split: 20% to admin (platform fee), 80% to vendor
//   - Tracks settlement status and payment history for vendors
//
// Key Entities:
//   - CashSettlement: Represents a batch of COD orders submitted for settlement
//   - SettlementOrderMapping: Links orders to their settlement batch
//   - Order: COD field cash_settlement_id links to settlement
//
// Workflow:
//   1. Warehouse staff collects verified COD orders
//   2. Staff submits batch with list of order IDs
//   3. CashSettlementService creates CashSettlement batch (status=SUBMITTED)
//   4. Admin reviews batch (sees orders, amounts, vendor totals)
//   5. Admin approves batch (status=APPROVED)
//   6. Settlement processed: admin gets commission, vendor gets remainder
//   7. Orders marked SETTLED, payment_status=SETTLED
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class CashSettlementService {

    private static final Logger log = LoggerFactory.getLogger(CashSettlementService.class);


    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final CashSettlementRepository cashSettlementRepository;
    private final SettlementOrderMappingRepository settlementOrderMappingRepository;
    private final OrderRepository orderRepository;
    private final VendorRepository vendorRepository;
    private final WarehouseRepository warehouseRepository;
    private final TrackingEventLogRepository trackingEventLogRepository;
    private final CodPaymentService codPaymentService;
    private final EmailSender emailSender;

    public CashSettlementService(
            CashSettlementRepository cashSettlementRepository,
            SettlementOrderMappingRepository settlementOrderMappingRepository,
            OrderRepository orderRepository,
            VendorRepository vendorRepository,
            WarehouseRepository warehouseRepository,
            TrackingEventLogRepository trackingEventLogRepository,
            CodPaymentService codPaymentService,
            EmailSender emailSender) {
        this.cashSettlementRepository = cashSettlementRepository;
        this.settlementOrderMappingRepository = settlementOrderMappingRepository;
        this.orderRepository = orderRepository;
        this.vendorRepository = vendorRepository;
        this.warehouseRepository = warehouseRepository;
        this.trackingEventLogRepository = trackingEventLogRepository;
        this.codPaymentService = codPaymentService;
        this.emailSender = emailSender;
    }

    // Commission split: 20% to admin (platform), 80% to vendor
    public static final double ADMIN_COMMISSION_RATE = 0.20;
    public static final double VENDOR_SHARE_RATE = 0.80;


    // ─────────────────────────────────────────────────────────────────────────
    // SETTLEMENT BATCH SUBMISSION (by Warehouse Staff)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Warehouse staff submits a batch of verified COD orders for settlement.
     * Creates CashSettlement record with initial status SUBMITTED.
     *
     * Preconditions:
     *   - All orders must be COD orders
     *   - All orders must have paymentStatus=VERIFIED (verified by admin)
     *   - Orders must not already be settled (cashSettlementId must be null)
     *
     * @param warehouseId Warehouse submitting the batch
     * @param orderId List of order IDs to include in settlement
     * @param submittedByStaffId Warehouse staff ID submitting
     * @param notes Optional notes about the batch
     * @return Created CashSettlement batch
     */
    @Transactional
    public CashSettlement submitSettlementBatch(int warehouseId, List<Integer> orderIds,
                                                 int submittedByStaffId, String notes) {
        if (orderIds == null || orderIds.isEmpty()) {
            throw new IllegalArgumentException("Order list cannot be empty");
        }

        // Validate all orders exist and are eligible
        List<Order> orders = new ArrayList<>();
        for (Integer orderId : orderIds) {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                throw new IllegalArgumentException("Order not found: " + orderId);
            }

            // Must be COD
            if (!codPaymentService.isCodOrder(order)) {
                throw new IllegalStateException("Order " + orderId + " is not a COD order");
            }

            // Must be VERIFIED
            if (!order.getPaymentStatus().equals("VERIFIED")) {
                throw new IllegalStateException("Order " + orderId + " payment_status is " +
                        order.getPaymentStatus() + ", expected VERIFIED");
            }

            // Must not already be settled
            if (order.getCashSettlementId() != null) {
                throw new IllegalStateException("Order " + orderId + " is already settled (settlement_id: " +
                        order.getCashSettlementId() + ")");
            }

            orders.add(order);
        }

        // Calculate totals
        double totalCashCollected = orders.stream()
                .mapToDouble(o -> o.getCodAmount() != null ? o.getCodAmount() : 0)
                .sum();

        double adminCommission = totalCashCollected * ADMIN_COMMISSION_RATE;
        double vendorShare = totalCashCollected * VENDOR_SHARE_RATE;

        // Create CashSettlement record
        CashSettlement settlement = new CashSettlement();
        settlement.setWarehouseId(warehouseId);
        settlement.setSubmittedByStaffId(submittedByStaffId);
        settlement.setSubmittedAt(LocalDateTime.now());
        settlement.setSettlementStatus("SUBMITTED");  // Awaiting admin approval
        settlement.setTotalCashCollected(totalCashCollected);
        settlement.setAdminCommission(adminCommission);
        settlement.setVendorShare(vendorShare);
        settlement.setOrderCount(orderIds.size());
        settlement.setNotes(notes != null ? notes : "");
        settlement.setApprovedAt(null);  // Not approved yet
        settlement.setApprovedByAdminId(null);

        settlement = cashSettlementRepository.save(settlement);

        // Create order mappings
        for (Order order : orders) {
            SettlementOrderMapping mapping = new SettlementOrderMapping();
            mapping.setSettlementId(settlement.getId());
            mapping.setOrderId(order.getId());
            mapping.setOrderAmount(order.getCodAmount());
            mapping.setVendorId(order.getVendor().getId());
            settlementOrderMappingRepository.save(mapping);
        }

        // Log event
        logSettlementEvent(settlement, "Settlement batch submitted",
            "Warehouse staff submitted " + orderIds.size() + " orders. Total: ₹" + totalCashCollected +
            " (Admin: ₹" + adminCommission + ", Vendor: ₹" + vendorShare + ")");

        return settlement;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SETTLEMENT APPROVAL (by Admin)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin approves a submitted cash settlement batch.
     * Updates settlement status to APPROVED and processes fund distribution.
     *
     * @param settlementId Settlement batch ID
     * @param approvedByAdminId Admin ID approving
     * @param approvalNotes Optional approval notes
     * @return Approved settlement
     */
    @Transactional
    public CashSettlement approveCashSettlement(int settlementId, int approvedByAdminId, String approvalNotes) {
        CashSettlement settlement = cashSettlementRepository.findById(settlementId).orElse(null);
        if (settlement == null) {
            throw new IllegalArgumentException("Settlement not found: " + settlementId);
        }

        if (!settlement.getSettlementStatus().equals("SUBMITTED")) {
            throw new IllegalStateException("Settlement " + settlementId + " status is " +
                    settlement.getSettlementStatus() + ", expected SUBMITTED");
        }

        // Mark as approved
        settlement.setSettlementStatus("APPROVED");
        settlement.setApprovedAt(LocalDateTime.now());
        settlement.setApprovedByAdminId(approvedByAdminId);
        settlement = cashSettlementRepository.save(settlement);

        // Get all orders in this settlement and mark them as settled
        List<SettlementOrderMapping> mappings = settlementOrderMappingRepository.findBySettlementId(settlementId);
        List<Integer> orderIds = mappings.stream()
                .map(SettlementOrderMapping::getOrderId)
                .collect(Collectors.toList());

        codPaymentService.markOrdersAsSettled(settlementId, orderIds);

        // Log event
        logSettlementEvent(settlement, "Settlement approved",
            "Admin approved settlement. Admin commission: ₹" + settlement.getAdminCommission() +
            ". Vendor share: ₹" + settlement.getVendorShare() + ". " +
            (approvalNotes != null ? approvalNotes : ""));

        return settlement;
    }

    /**
     * Admin rejects a submitted cash settlement batch.
     * Settlement returns to SUBMITTED state. Orders can be re-submitted.
     *
     * @param settlementId Settlement batch ID
     * @param rejectionReason Reason for rejection
     * @return Rejected settlement (status remains SUBMITTED)
     */
    @Transactional
    public CashSettlement rejectCashSettlement(int settlementId, String rejectionReason) {
        CashSettlement settlement = cashSettlementRepository.findById(settlementId).orElse(null);
        if (settlement == null) {
            throw new IllegalArgumentException("Settlement not found: " + settlementId);
        }

        if (!settlement.getSettlementStatus().equals("SUBMITTED")) {
            throw new IllegalStateException("Can only reject SUBMITTED settlements");
        }

        // Set notes but keep status as SUBMITTED for resubmission
        settlement.setNotes((settlement.getNotes() != null ? settlement.getNotes() : "") +
            "\n[REJECTED] " + (rejectionReason != null ? rejectionReason : "Admin rejected"));

        settlement = cashSettlementRepository.save(settlement);

        logSettlementEvent(settlement, "Settlement rejected",
            "Admin rejected settlement. Reason: " + rejectionReason);

        return settlement;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SETTLEMENT QUERIES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all pending settlements (awaiting admin approval).
     *
     * @return List of settlements with status=SUBMITTED
     */
    public List<CashSettlement> getPendingSettlements() {
        return cashSettlementRepository.findBySettlementStatus("SUBMITTED");
    }

    /**
     * Get all approved settlements.
     *
     * @return List of settlements with status=APPROVED
     */
    public List<CashSettlement> getApprovedSettlements() {
        return cashSettlementRepository.findBySettlementStatus("APPROVED");
    }

    /**
     * Get all settlements for a specific warehouse.
     *
     * @param warehouseId Warehouse ID
     * @return List of settlements from this warehouse
     */
    public List<CashSettlement> getSettlementsForWarehouse(int warehouseId) {
        return cashSettlementRepository.findByWarehouseId(warehouseId);
    }

    /**
     * Get all settlements submitted by a specific staff member.
     *
     * @param staffId Warehouse staff ID
     * @return List of settlements submitted by this staff
     */
    public List<CashSettlement> getSettlementsSubmittedByStaff(int staffId) {
        return cashSettlementRepository.findBySubmittedByStaffId(staffId);
    }

    /**
     * Get settlement details with all linked orders.
     *
     * @param settlementId Settlement ID
     * @return Settlement with order details
     */
    public Map<String, Object> getSettlementDetails(int settlementId) {
        CashSettlement settlement = cashSettlementRepository.findById(settlementId).orElse(null);
        if (settlement == null) {
            return null;
        }

        Map<String, Object> details = new LinkedHashMap<>();

        // Settlement info
        details.put("id", settlement.getId());
        details.put("warehouseId", settlement.getWarehouseId());
        details.put("status", settlement.getSettlementStatus());
        details.put("submittedAt", settlement.getSubmittedAt());
        details.put("approvedAt", settlement.getApprovedAt());
        details.put("totalCashCollected", settlement.getTotalCashCollected());
        details.put("adminCommission", settlement.getAdminCommission());
        details.put("vendorShare", settlement.getVendorShare());
        details.put("orderCount", settlement.getOrderCount());

        // Order breakdown
        List<SettlementOrderMapping> mappings = settlementOrderMappingRepository.findBySettlementId(settlementId);
        List<Map<String, Object>> orders = new ArrayList<>();

        // Group by vendor
        Map<Integer, Double> vendorTotals = new LinkedHashMap<>();
        for (SettlementOrderMapping mapping : mappings) {
            vendorTotals.merge(mapping.getVendorId(), mapping.getOrderAmount(), Double::sum);

            Map<String, Object> order = new LinkedHashMap<>();
            order.put("orderId", mapping.getOrderId());
            order.put("vendorId", mapping.getVendorId());
            order.put("amount", mapping.getOrderAmount());
            orders.add(order);
        }

        details.put("orders", orders);
        details.put("vendorTotals", vendorTotals);

        return details;
    }

    /**
     * Get settlement history for a specific vendor.
     * Shows vendor their approved settlements and commission payments.
     *
     * @param vendorId Vendor ID
     * @return List of approvedSettlements involving this vendor
     */
    public List<Map<String, Object>> getVendorSettlementHistory(int vendorId) {
        List<SettlementOrderMapping> mappings = settlementOrderMappingRepository.findByVendorId(vendorId);

        // Get unique settlement IDs from mappings
        Set<Integer> settlementIds = mappings.stream()
                .map(SettlementOrderMapping::getSettlementId)
                .collect(Collectors.toSet());

        List<Map<String, Object>> history = new ArrayList<>();

        for (Integer settlementId : settlementIds) {
            CashSettlement settlement = cashSettlementRepository.findById(settlementId).orElse(null);
            if (settlement != null && "APPROVED".equals(settlement.getSettlementStatus())) {
                // Calculate this vendor's share in this settlement
                double vendorAmount = mappings.stream()
                        .filter(m -> m.getSettlementId() == settlementId && m.getVendorId() == vendorId)
                        .mapToDouble(m -> m.getOrderAmount())
                        .sum();

                // Vendor gets 80% of their collected amount
                double vendorPayout = vendorAmount * VENDOR_SHARE_RATE;

                Map<String, Object> settlementRecord = new LinkedHashMap<>();
                settlementRecord.put("settlementId", settlementId);
                settlementRecord.put("approvedAt", settlement.getApprovedAt());
                settlementRecord.put("vendorCollected", vendorAmount);
                settlementRecord.put("adminCommission", vendorAmount * ADMIN_COMMISSION_RATE);
                settlementRecord.put("vendorPayout", vendorPayout);
                settlementRecord.put("orderCount", (int) mappings.stream()
                        .filter(m -> m.getSettlementId() == settlementId && m.getVendorId() == vendorId)
                        .count());

                history.add(settlementRecord);
            }
        }

        // Sort by approval date (newest first)
        history.sort((a, b) -> {
            LocalDateTime aTime = (LocalDateTime) a.get("approvedAt");
            LocalDateTime bTime = (LocalDateTime) b.get("approvedAt");
            return bTime.compareTo(aTime);
        });

        return history;
    }

    /**
     * Calculate total amount owed to a vendor from all approved settlements.
     *
     * @param vendorId Vendor ID
     * @return Total payout amount (80% of collected COD)
     */
    public double calculateTotalVendorPayout(int vendorId) {
        List<Map<String, Object>> history = getVendorSettlementHistory(vendorId);
        return history.stream()
                .mapToDouble(s -> (Double) s.get("vendorPayout"))
                .sum();
    }

    /**
     * Get settlement statistics for admin dashboard.
     *
     * @return Map with totals: totalCashCollected, totalAdminCommission, settlementsCount
     */
    public Map<String, Object> getSettlementStatistics() {
        List<CashSettlement> allApprovedSettlements = getApprovedSettlements();

        double totalCash = allApprovedSettlements.stream()
                .mapToDouble(CashSettlement::getTotalCashCollected)
                .sum();

        double totalAdminCommission = allApprovedSettlements.stream()
                .mapToDouble(CashSettlement::getAdminCommission)
                .sum();

        double totalVendorPayouts = allApprovedSettlements.stream()
                .mapToDouble(CashSettlement::getVendorShare)
                .sum();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalCashSettled", totalCash);
        stats.put("totalAdminCommission", totalAdminCommission);
        stats.put("totalVendorPayouts", totalVendorPayouts);
        stats.put("settlementsCount", allApprovedSettlements.size());
        stats.put("pendingSettlementsCount", getPendingSettlements().size());

        return stats;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Logs a settlement-related event to TrackingEventLog.
     *
     * @param settlement Settlement
     * @param eventTitle Event title
     * @param eventDescription Event description
     */
    private void logSettlementEvent(CashSettlement settlement, String eventTitle, String eventDescription) {
        try {
            // Log to CashSettlement audit trail (future: add settlement_audit_log table)
            log.info("[SETTLEMENT] {}: {}", eventTitle, eventDescription);
        } catch (Exception e) {
            log.error("[CashSettlementService] Failed to log settlement event: {}", e.getMessage());
        }
    }

    /**
     * Format currency for display.
     *
     * @param amount Amount in rupees
     * @return Formatted string "₹X,XXX.XX"
     */
    public static String formatCurrency(double amount) {
        return String.format("₹%,.2f", amount);
    }
}


