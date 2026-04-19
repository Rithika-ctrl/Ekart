package com.example.ekart.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ekart.dto.CashSettlement;
import com.example.ekart.dto.Warehouse;

/**
 * LOCATION: src/main/java/com/example/ekart/repository/CashSettlementRepository.java
 *
 * Repository for accessing cash settlement data.
 * Provides queries for tracking COD cash collection, verification, and payment.
 */
public interface CashSettlementRepository extends JpaRepository<CashSettlement, Integer> {

    /**
     * Find all settlements for a specific warehouse ordered by creation date.
     */
    List<CashSettlement> findByWarehouseOrderByCreatedAtDesc(Warehouse warehouse);

    /**
     * Find all settlements with a specific status.
     */
    List<CashSettlement> findBySettlementStatus(String status);

    /**
     * Find all pending settlements across all warehouses.
     */
    @Query("SELECT cs FROM cash_settlement cs " +
           "WHERE cs.settlementStatus = 'PENDING' " +
           "ORDER BY cs.submittedAt ASC")
    List<CashSettlement> findAllPendingSettlements();

    /**
     * Find settlements by warehouse and status.
     */
    List<CashSettlement> findByWarehouseAndSettlementStatus(Warehouse warehouse, String status);

    /**
     * Find settlement by batch number.
     */
    Optional<CashSettlement> findBySettlementBatchNumber(String batchNumber);

    /**
     * Get verified settlements awaiting payment.
     */
    @Query("SELECT cs FROM cash_settlement cs " +
           "WHERE cs.settlementStatus = 'VERIFIED' " +
           "AND cs.paidToWarehouseAt IS NULL " +
           "ORDER BY cs.verifiedAt ASC")
    List<CashSettlement> findVerifiedAwaitingPayment();

    /**
     * Get total collected amount by warehouse for a date range.
     */
    @Query("SELECT COALESCE(SUM(cs.totalAmountCollected), 0) " +
           "FROM cash_settlement cs " +
           "WHERE cs.warehouse = :warehouse " +
           "AND cs.settlementStatus = 'PAID' " +
           "AND cs.submittedAt BETWEEN :startDate AND :endDate")
    double getTotalCollectedByWarehouseForPeriod(
        @Param("warehouse") Warehouse warehouse,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Get total commission earned by admin for a date range.
     */
    @Query("SELECT COALESCE(SUM(cs.adminCommission), 0) " +
           "FROM cash_settlement cs " +
           "WHERE cs.settlementStatus = 'PAID' " +
           "AND cs.submittedAt BETWEEN :startDate AND :endDate")
    double getTotalAdminCommissionForPeriod(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Count settlements by status for a warehouse.
     */
    long countByWarehouseAndSettlementStatus(Warehouse warehouse, String status);

    /**
     * Find settlements by warehouse ID.
     */
    @Query("SELECT cs FROM cash_settlement cs " +
           "WHERE cs.warehouse.id = :warehouseId " +
           "ORDER BY cs.createdAt DESC")
    List<CashSettlement> findByWarehouseId(@Param("warehouseId") int warehouseId);

    /**
     * Find settlements submitted by a specific staff member.
     */
    @Query("SELECT cs FROM cash_settlement cs " +
           "WHERE cs.submittedByStaffId = :staffId " +
           "ORDER BY cs.submittedAt DESC")
    List<CashSettlement> findBySubmittedByStaffId(@Param("staffId") int staffId);
}
