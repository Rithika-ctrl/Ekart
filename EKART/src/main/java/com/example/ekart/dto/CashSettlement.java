package com.example.ekart.dto;
import java.util.Optional;
import java.time.LocalDateTime;


import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/CashSettlement.java
 *
 * Tracks cash collection and settlement from delivery boys to warehouse
 * and subsequently to admin for verification and vendor payment.
 *
 * Status progression:
 * PENDING (submitted by delivery boy)
 * → VERIFIED (verified by admin after photo/proof review)
 * → PAID (warehouse staff receives payment or admin settles payment)
 *
 * Commission split: Admin keeps 20%, Vendor gets 80%
 */
@Entity(name = "cash_settlement")
@Table(name = "cash_settlement", indexes = {
    @Index(name = "idx_cs_warehouse", columnList = "warehouse_id"),
    @Index(name = "idx_cs_status", columnList = "settlement_status"),
    @Index(name = "idx_cs_submitted_at", columnList = "submitted_at")
})
public class CashSettlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "settlement_batch_number", length = 50, unique = true, nullable = true)
    private String settlementBatchNumber;

    @Column(name = "total_amount_collected", columnDefinition = "FLOAT8 DEFAULT 0")
    private double totalAmountCollected = 0;

    @Column(name = "admin_commission", columnDefinition = "FLOAT8 DEFAULT 0")
    private double adminCommission = 0;

    @Column(name = "vendor_pay_amount", columnDefinition = "FLOAT8 DEFAULT 0")
    private double vendorPayAmount = 0;

    @Column(name = "settlement_status", length = 50, nullable = false)
    private String settlementStatus = "PENDING";

    @Column(name = "submitted_by_staff_id", nullable = true)
    private Integer submittedByStaffId;

    @Column(name = "order_count", columnDefinition = "INT DEFAULT 0")
    private int orderCount = 0;

    @Column(name = "submitted_at", nullable = true)
    private LocalDateTime submittedAt;

    @Column(name = "proof_photo_url", length = 1000, nullable = true)
    private String proofPhotoUrl;

    @Column(name = "verified_by_admin_id", nullable = true)
    private Integer verifiedByAdminId;

    @Column(name = "verified_at", nullable = true)
    private LocalDateTime verifiedAt;

    @Column(name = "paid_to_warehouse_at", nullable = true)
    private LocalDateTime paidToWarehouseAt;

    @Column(name = "approved_at", nullable = true)
    private LocalDateTime approvedAt;

    @Column(name = "description", length = 500, nullable = true)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // ─── Getters & Setters ────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }

    public String getSettlementBatchNumber() { return settlementBatchNumber; }
    public void setSettlementBatchNumber(String settlementBatchNumber) { this.settlementBatchNumber = settlementBatchNumber; }

    public double getTotalAmountCollected() { return totalAmountCollected; }
    public void setTotalAmountCollected(double totalAmountCollected) { this.totalAmountCollected = totalAmountCollected; }

    /**
     * Convenience setter: set total cash collected (alias for setTotalAmountCollected).
     */
    public void setTotalCashCollected(double totalCashCollected) { this.totalAmountCollected = totalCashCollected; }

    public double getAdminCommission() { return adminCommission; }
    public void setAdminCommission(double adminCommission) { this.adminCommission = adminCommission; }

    public double getVendorPayAmount() { return vendorPayAmount; }
    public void setVendorPayAmount(double vendorPayAmount) { this.vendorPayAmount = vendorPayAmount; }

    /**
     * Convenience setter: set vendor share (alias for setVendorPayAmount).
     */
    public void setVendorShare(double vendorShare) { this.vendorPayAmount = vendorShare; }

    public String getSettlementStatus() { return settlementStatus; }
    public void setSettlementStatus(String settlementStatus) { this.settlementStatus = settlementStatus; }

    public Integer getSubmittedByStaffId() { return submittedByStaffId; }
    public void setSubmittedByStaffId(Integer submittedByStaffId) { this.submittedByStaffId = submittedByStaffId; }

    public int getOrderCount() { return orderCount; }
    public void setOrderCount(int orderCount) { this.orderCount = orderCount; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public String getProofPhotoUrl() { return proofPhotoUrl; }
    public void setProofPhotoUrl(String proofPhotoUrl) { this.proofPhotoUrl = proofPhotoUrl; }

    public Integer getVerifiedByAdminId() { return verifiedByAdminId; }
    public void setVerifiedByAdminId(Integer verifiedByAdminId) { this.verifiedByAdminId = verifiedByAdminId; }

    public LocalDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }

    public LocalDateTime getPaidToWarehouseAt() { return paidToWarehouseAt; }
    public void setPaidToWarehouseAt(LocalDateTime paidToWarehouseAt) { this.paidToWarehouseAt = paidToWarehouseAt; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    /**
     * Convenience getter: get notes (alias for getDescription).
     */
    public String getNotes() { return description; }

    /**
     * Convenience setter: set notes (alias for setDescription).
     */
    public void setNotes(String notes) { this.description = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    // ─── Convenience Methods ────────────────────────────────────────

    /**
     * Convenience method: get warehouse ID
     */
    public int getWarehouseId() {
        return warehouse != null ? warehouse.getId() : -1;
    }

    /**
     * Convenience method: set warehouse by ID
     */
    public void setWarehouseId(int warehouseId) {
        if (warehouseId > 0) {
            Warehouse w = new Warehouse();
            w.setId(warehouseId);
            this.warehouse = w;
        }
    }

    /**
     * Convenience method: get approved by admin ID (same as verifiedByAdminId)
     */
    public Integer getApprovedByAdminId() {
        return verifiedByAdminId;
    }

    /**
     * Convenience method: set approved by admin ID
     */
    public void setApprovedByAdminId(Integer adminId) {
        this.verifiedByAdminId = adminId;
    }

    /**
     * Convenience method: get total cash collected (same as totalAmountCollected)
     */
    public double getTotalCashCollected() {
        return totalAmountCollected;
    }

    /**
     * Convenience method: get vendor share (same as vendorPayAmount)
     */
    public double getVendorShare() {
        return vendorPayAmount;
    }
}

