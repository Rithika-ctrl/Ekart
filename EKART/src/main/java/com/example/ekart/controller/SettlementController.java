package com.example.ekart.controller;

// ================================================================
// NEW FILE: src/main/java/com/example/ekart/controller/SettlementController.java
//
// Purpose:
//   REST API endpoints for multi-warehouse cash settlement workflow.
//   - Warehouse staff: Submit COD cash batches for settlement
//   - Admin: Review, approve, and monitor settlements
//   - Vendor: View settlement history and payments
//
// Endpoints:
//   - POST /api/settlement/submit-batch (Warehouse staff)
//   - GET /api/admin/settlement/pending (Admin)
//   - POST /api/admin/settlement/approve (Admin)
//   - GET /api/settlement/statistics (Admin dashboard)
//   - GET /api/vendor/settlement/history (Vendor)
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.service.*;
import com.example.ekart.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SettlementController {

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final CashSettlementService cashSettlementService;
    private final CashSettlementRepository cashSettlementRepository;
    private final SettlementOrderMappingRepository settlementOrderMappingRepository;
    private final OrderRepository orderRepository;

    public SettlementController(
            CashSettlementService cashSettlementService,
            CashSettlementRepository cashSettlementRepository,
            SettlementOrderMappingRepository settlementOrderMappingRepository,
            OrderRepository orderRepository) {
        this.cashSettlementService = cashSettlementService;
        this.cashSettlementRepository = cashSettlementRepository;
        this.settlementOrderMappingRepository = settlementOrderMappingRepository;
        this.orderRepository = orderRepository;
    }

    // String constants to avoid duplications (fixes S1192)
    private static final String KEY_SUCCESS = "success";
    private static final String KEY_MESSAGE = "message";
    private static final String KEY_SETTLEMENT_ID = "settlementId";
    private static final String KEY_ADMIN_COMMISSION = "adminCommission";
    private static final String KEY_VENDOR_SHARE = "vendorShare";
    private static final String KEY_STATUS = "status";
    private static final String KEY_ORDER_COUNT = "orderCount";
    private static final String KEY_TOTAL_AMOUNT = "totalAmount";
    private static final String KEY_TOTAL_CASH_COLLECTED = "totalCashCollected";
    private static final String KEY_SUBMITTED_AT = "submittedAt";
    private static final String KEY_SUBMITTED_BY_STAFF_ID = "submittedByStaffId";
    private static final String KEY_WAREHOUSE_ID = "warehouseId";
    private static final String KEY_SETTLEMENTS = "settlements";
    private static final String KEY_COUNT = "count";



    // ─────────────────────────────────────────────────────────────────────────
    // WAREHOUSE STAFF: SUBMIT CASH SETTLEMENT BATCH
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/settlement/submit-batch
     * Warehouse staff submits batch of verified COD orders for settlement.
     *
     * Request Body:
     *   {
     *     "warehouseId": 1,
     *     "orderIds": [101, 102, 103],
     *     "staffId": 5,
     *     "notes": "Batch from morning collection"
     *   }
     *
     * Response:
     *   {
     *     "success": true,
     *     "message": "Settlement batch submitted",
     *     "settlementId": 45,
     *     "orderCount": 3,
     *     "totalAmount": 1500.00,
     *     "adminCommission": 300.00,
     *     "vendorShare": 1200.00
     *   }
     */
    @PostMapping("/settlement/submit-batch")
    public ResponseEntity<Map<String, Object>> submitSettlementBatch(
            @RequestBody Map<String, Object> payload) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            int warehouseId = ((Number) payload.get("warehouseId")).intValue();
            @SuppressWarnings("unchecked")
            List<Integer> orderIds = (List<Integer>) payload.get("orderIds");
            int staffId = ((Number) payload.get("staffId")).intValue();
            String notes = (String) payload.getOrDefault("notes", "");

            if (orderIds == null || orderIds.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Order list cannot be empty");
                return ResponseEntity.badRequest().body(res);
            }

            // Submit batch
            CashSettlement settlement = cashSettlementService.submitSettlementBatch(
                    warehouseId, orderIds, staffId, notes);

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Settlement batch submitted");
            res.put(KEY_SETTLEMENT_ID, settlement.getId());
            res.put(KEY_ORDER_COUNT, settlement.getOrderCount());
            res.put(KEY_TOTAL_AMOUNT, settlement.getTotalCashCollected());
            res.put(KEY_ADMIN_COMMISSION, settlement.getAdminCommission());
            res.put(KEY_VENDOR_SHARE, settlement.getVendorShare());
            res.put(KEY_STATUS, settlement.getSettlementStatus());

            return ResponseEntity.ok(res);

        } catch (IllegalArgumentException | IllegalStateException e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error submitting settlement batch: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: VIEW PENDING SETTLEMENTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/settlement/pending
     * Admin views all pending settlements awaiting approval.
     *
     * Response:
     *   {
     *     "success": true,
     *     "settlements": [
     *       {
     *         "settlementId": 45,
     *         "warehouseId": 1,
     *         "submittedAt": "2026-04-14T10:30:00",
     *         "orderCount": 3,
     *         "totalCashCollected": 1500.00,
     *         "adminCommission": 300.00,
     *         "vendorShare": 1200.00,
     *         "status": "SUBMITTED"
     *       }
     *     ]
     *   }
     */
    @GetMapping("/admin/settlement/pending")
    public ResponseEntity<Map<String, Object>> getPendingSettlements() {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            List<CashSettlement> settlements = cashSettlementService.getPendingSettlements();

            List<Map<String, Object>> settlementList = settlements.stream()
                    .map(s -> {
                        Map<String, Object> settlement = new LinkedHashMap<>();
                        settlement.put(KEY_SETTLEMENT_ID, s.getId());
                        settlement.put(KEY_WAREHOUSE_ID, s.getWarehouseId());
                        settlement.put(KEY_SUBMITTED_AT, s.getSubmittedAt());
                        settlement.put(KEY_SUBMITTED_BY_STAFF_ID, s.getSubmittedByStaffId());
                        settlement.put(KEY_ORDER_COUNT, s.getOrderCount());
                        settlement.put(KEY_TOTAL_CASH_COLLECTED, s.getTotalCashCollected());
                        settlement.put(KEY_ADMIN_COMMISSION, s.getAdminCommission());
                        settlement.put(KEY_VENDOR_SHARE, s.getVendorShare());
                        settlement.put(KEY_STATUS, s.getSettlementStatus());
                        return settlement;
                    })
                    .toList();

            res.put(KEY_SUCCESS, true);
            res.put(KEY_COUNT, settlementList.size());
            res.put(KEY_SETTLEMENTS, settlementList);

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching pending settlements: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/admin/settlement/{settlementId}
     * Admin views details of a specific settlement batch.
     *
     * Response:
     *   {
     *     "success": true,
     *     "settlementId": 45,
     *     "status": "SUBMITTED",
     *     "totalCashCollected": 1500.00,
     *     "adminCommission": 300.00,
     *     "vendorShare": 1200.00,
     *     "orders": [
     *       {
     *         "orderId": 101,
     *         "vendorId": 5,
     *         "amount": 500.00
     *       }
     *     ],
     *     "vendorTotals": { "5": 1000.00, "10": 500.00 }
     *   }
     */
    @GetMapping("/admin/settlement/{settlementId}")
    public ResponseEntity<Map<String, Object>> getSettlementDetails(
            @PathVariable int settlementId) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            Map<String, Object> details = cashSettlementService.getSettlementDetails(settlementId);
            if (details == null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Settlement not found");
                return ResponseEntity.status(404).body(res);
            }

            res.put(KEY_SUCCESS, true);
            res.putAll(details);

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching settlement details: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: APPROVE/REJECT SETTLEMENTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/admin/settlement/{settlementId}/approve
     * Admin approves a submitted settlement batch.
     *
     * Request Body:
     *   {
     *     "adminId": 99,
     *     "approvalNotes": "Verified counts and amounts"
     *   }
     *
     * Response:
     *   {
     *     "success": true,
     *     "message": "Settlement approved",
     *     "settlementId": 45,
     *     "status": "APPROVED",
     *     "adminCommission": 300.00
     *   }
     */
    @PostMapping("/admin/settlement/{settlementId}/approve")
    public ResponseEntity<Map<String, Object>> approveSettlement(
            @PathVariable int settlementId,
            @RequestBody Map<String, Object> payload) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            int adminId = ((Number) payload.get("adminId")).intValue();
            String notes = (String) payload.getOrDefault("approvalNotes", "");

            CashSettlement settlement = cashSettlementService.approveCashSettlement(
                    settlementId, adminId, notes);

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Settlement approved");
            res.put(KEY_SETTLEMENT_ID, settlement.getId());
            res.put(KEY_STATUS, settlement.getSettlementStatus());
            res.put(KEY_ADMIN_COMMISSION, settlement.getAdminCommission());
            res.put(KEY_VENDOR_SHARE, settlement.getVendorShare());
            res.put("approvedAt", settlement.getApprovedAt());

            return ResponseEntity.ok(res);

        } catch (IllegalArgumentException | IllegalStateException e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error approving settlement: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/admin/settlement/{settlementId}/reject
     * Admin rejects a submitted settlement batch.
     *
     * Request Body:
     *   {
     *     "rejectionReason": "Cash count mismatch"
     *   }
     *
     * Response:
     *   {
     *     "success": true,
     *     "message": "Settlement rejected"
     *   }
     */
    @PostMapping("/admin/settlement/{settlementId}/reject")
    public ResponseEntity<Map<String, Object>> rejectSettlement(
            @PathVariable int settlementId,
            @RequestBody Map<String, Object> payload) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            String reason = (String) payload.getOrDefault("rejectionReason", "");

            CashSettlement settlement = cashSettlementService.rejectCashSettlement(settlementId, reason);

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Settlement rejected");
            res.put(KEY_SETTLEMENT_ID, settlement.getId());
            res.put(KEY_STATUS, settlement.getSettlementStatus());

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: SETTLEMENT STATISTICS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/settlement/statistics
     * Admin dashboard: Overall settlement statistics.
     *
     * Response:
     *   {
     *     "success": true,
     *     "totalCashSettled": 50000.00,
     *     "totalAdminCommission": 10000.00,
     *     "totalVendorPayouts": 40000.00,
     *     "settlementsCount": 15,
     *     "pendingSettlementsCount": 2
     *   }
     */
    @GetMapping("/admin/settlement/statistics")
    public ResponseEntity<Map<String, Object>> getSettlementStatistics() {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            Map<String, Object> stats = cashSettlementService.getSettlementStatistics();

            res.put(KEY_SUCCESS, true);
            res.putAll(stats);

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching statistics: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VENDOR: SETTLEMENT HISTORY & PAYMENTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/vendor/settlement/history
     * Vendor views their settlement history and payouts.
     *
     * Response:
     *   {
     *     "success": true,
     *     "settlements": [
     *       {
     *         "settlementId": 45,
     *         "approvedAt": "2026-04-14T15:00:00",
     *         "vendorCollected": 1000.00,
     *         "adminCommission": 200.00,
     *         "vendorPayout": 800.00,
     *         "orderCount": 2
     *       }
     *     ],
     *     "totalPayout": 8000.00
     *   }
     */
    @GetMapping("/vendor/settlement/history")
    public ResponseEntity<Map<String, Object>> getVendorSettlementHistory(
            HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            Vendor vendor = (Vendor) session.getAttribute("vendor");
            if (vendor == null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Not logged in");
                return ResponseEntity.status(401).body(res);
            }

            List<Map<String, Object>> history = cashSettlementService.getVendorSettlementHistory(vendor.getId());
            double totalPayout = cashSettlementService.calculateTotalVendorPayout(vendor.getId());

            res.put(KEY_SUCCESS, true);
            res.put(KEY_SETTLEMENTS, history);
            res.put("totalPayout", totalPayout);

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching settlement history: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/vendor/settlement/summary
     * Vendor views summary of their COD operations.
     *
     * Response:
     *   {
     *     "success": true,
     *     "totalCodCollected": 5000.00,
     *     "totalSettled": 4000.00,
     *     "totalCommissionPaid": 1000.00,
     *     "settlementCount": 5
     *   }
     */
    @GetMapping("/vendor/settlement/summary")
    public ResponseEntity<Map<String, Object>> getVendorSettlementSummary(
            HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            Vendor vendor = (Vendor) session.getAttribute("vendor");
            if (vendor == null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Not logged in");
                return ResponseEntity.status(401).body(res);
            }

            List<Map<String, Object>> history = cashSettlementService.getVendorSettlementHistory(vendor.getId());

            double totalCollected = history.stream()
                    .mapToDouble(s -> (Double) s.get("vendorCollected"))
                    .sum();

            double totalSettled = history.stream()
                    .mapToDouble(s -> (Double) s.get("vendorPayout"))
                    .sum();

            double totalCommission = history.stream()
                    .mapToDouble(s -> (Double) s.get("adminCommission"))
                    .sum();

            res.put(KEY_SUCCESS, true);
            res.put("totalCodCollected", totalCollected);
            res.put("totalSettled", totalSettled);
            res.put("totalCommissionPaid", totalCommission);
            res.put("settlementCount", history.size());

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching settlement summary: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }
}


