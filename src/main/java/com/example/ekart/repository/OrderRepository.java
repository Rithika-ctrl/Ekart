package com.example.ekart.repository;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/repository/OrderRepository.java
// ================================================================

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.DeliveryBoy;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.dto.Vendor;
import com.example.ekart.dto.Warehouse;

public interface OrderRepository extends JpaRepository<Order, Integer> {

    // ── Customer queries ─────────────────────────────────────────

    List<Order> findByCustomer(Customer customer);

    // ── Vendor queries ───────────────────────────────────────────

    /**
     * Returns all orders that contain at least one item belonging
     * to this vendor's products. Works for both legacy single-orders
     * and the new sub-order model.
     */
    @Query("SELECT DISTINCT o FROM shopping_order o " +
           "JOIN o.items i " +
           "WHERE i.productId IN " +
           "(SELECT p.id FROM Product p WHERE p.vendor = :vendor)")
    List<Order> findOrdersByVendor(@Param("vendor") Vendor vendor);

    @Query("SELECT DISTINCT o FROM shopping_order o " +
           "JOIN o.items i " +
           "WHERE i.productId IN " +
           "(SELECT p.id FROM Product p WHERE p.vendor = :vendor) " +
           "AND o.orderDate >= :from AND o.orderDate <= :to")
    List<Order> findOrdersByVendorAndDateRange(
        @Param("vendor") Vendor vendor,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    // ── Delivery system queries ──────────────────────────────────

    List<Order> findByDeliveryBoy(DeliveryBoy deliveryBoy);

    List<Order> findByTrackingStatus(TrackingStatus status);

    List<Order> findByWarehouse(Warehouse warehouse);

    // ── Sub-order grouping ───────────────────────────────────────

    /**
     * Returns all sub-orders belonging to the same customer purchase.
     * Used on order-success and order-history to group split orders.
     */
    List<Order> findByParentOrderId(Integer parentOrderId);
}