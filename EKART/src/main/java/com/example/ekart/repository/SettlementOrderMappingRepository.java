package com.example.ekart.repository;
import java.util.Optional;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ekart.dto.SettlementOrderMapping;
import com.example.ekart.dto.CashSettlement;
import com.example.ekart.dto.Order;

/**
 * LOCATION: src/main/java/com/example/ekart/repository/SettlementOrderMappingRepository.java
 *
 * Repository for accessing settlement-order mappings.
 * Provides queries for linking orders to settlements and tracking amounts.
 */
public interface SettlementOrderMappingRepository extends JpaRepository<SettlementOrderMapping, Integer> {

    /**
     * Find all orders in a specific settlement.
     */
    List<SettlementOrderMapping> findBySettlement(CashSettlement settlement);

    /**
     * Find the settlement that contains a specific order.
     */
    Optional<SettlementOrderMapping> findByOrder(Order order);

    /**
     * Get total amount collected for an order across all settlements.
     */
    @Query("SELECT COALESCE(SUM(som.amountCollected), 0) " +
           "FROM settlement_order_mapping som " +
           "WHERE som.order = :order")
    double getTotalAmountCollectedForOrder(@Param("order") Order order);

    /**
     * Get total amount collected in a settlement.
     */
    @Query("SELECT COALESCE(SUM(som.amountCollected), 0) " +
           "FROM settlement_order_mapping som " +
           "WHERE som.settlement = :settlement")
    double getTotalAmountInSettlement(@Param("settlement") CashSettlement settlement);

    /**
     * Check if an order is already in a settlement.
     */
    boolean existsByOrder(Order order);

    /**
     * Get all orders in a settlement with details.
     */
    @Query("SELECT som FROM settlement_order_mapping som " +
           "JOIN FETCH som.order o " +
           "WHERE som.settlement = :settlement " +
           "ORDER BY som.createdAt DESC")
    List<SettlementOrderMapping> findBySettlementWithOrderDetails(@Param("settlement") CashSettlement settlement);

    /**
     * Count orders in a settlement.
     */
    long countBySettlement(CashSettlement settlement);

    /**
     * Find all settlement-order mappings for a specific vendor.
     * Queries through the order's vendor relationship.
     */
    @Query("SELECT som FROM settlement_order_mapping som " +
           "JOIN som.order o " +
           "JOIN o.vendor v " +
           "WHERE v.id = :vendorId " +
           "ORDER BY som.createdAt DESC")
    List<SettlementOrderMapping> findByVendorId(@Param("vendorId") int vendorId);

    /**
     * Find all settlement-order mappings in a specific settlement by ID.
     */
    @Query("SELECT som FROM settlement_order_mapping som " +
           "WHERE som.settlement.id = :settlementId " +
           "ORDER BY som.createdAt DESC")
    List<SettlementOrderMapping> findBySettlementId(@Param("settlementId") int settlementId);
}

