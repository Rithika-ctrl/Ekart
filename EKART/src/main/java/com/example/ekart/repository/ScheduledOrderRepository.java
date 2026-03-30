package com.example.ekart.repository;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/repository/ScheduledOrderRepository.java
// ================================================================

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.ScheduledOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ScheduledOrderRepository extends JpaRepository<ScheduledOrder, Long> {

    /**
     * All scheduled orders for a given customer, newest first.
     * Used by GET /api/flutter/scheduled-orders
     */
    List<ScheduledOrder> findByCustomerOrderByCreatedAtDesc(Customer customer);

    /**
     * All ACTIVE orders whose next delivery date is on or before today.
     * Called by the daily cron job to fire due deliveries.
     */
    @Query("SELECT so FROM ScheduledOrder so " +
           "WHERE so.status = 'ACTIVE' " +
           "AND so.nextDeliveryDate <= :today")
    List<ScheduledOrder> findDueOrders(@Param("today") LocalDate today);

    /**
     * Ownership check — ensures a customer can only modify their own schedules.
     * Used before any PUT or DELETE operation.
     */
    Optional<ScheduledOrder> findByIdAndCustomer(Long id, Customer customer);
}