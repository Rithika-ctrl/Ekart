package com.example.ekart.repository;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/repository/OrderRepository.java
// ================================================================

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.DeliveryBoy;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.dto.Vendor;
import com.example.ekart.dto.Warehouse;

public interface OrderRepository extends JpaRepository<Order, Integer> {

    // ── Admin queries (optimized for N+1 prevention) ──────────────

    /**
     * Fetches all orders with items eagerly loaded.
     * Uses @EntityGraph to avoid N+1 queries when admin loads all orders.
     */
    @EntityGraph(attributePaths = "items")
    List<Order> findAll();

    @EntityGraph(attributePaths = "items")
    List<Order> findByCustomer(Customer customer);

    @EntityGraph(attributePaths = "items")
    Optional<Order> findWithItemsById(Integer id);

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

    /**
     * Get all orders at a specific source warehouse with given tracking status.
     * Used for receiving queue: orders at source warehouse ready to be scanned in.
     */
    @Query("SELECT o FROM shopping_order o " +
           "WHERE o.sourceWarehouse.id = :warehouseId " +
           "AND o.trackingStatus = :status")
    List<Order> findBySourceWarehouseIdAndTrackingStatus(
        @Param("warehouseId") int warehouseId,
        @Param("status") TrackingStatus status
    );

    /**
     * Get all orders at a specific destination warehouse with given tracking status.
     * Used for assignment queue: orders ready for delivery boy assignment.
     */
    @Query("SELECT o FROM shopping_order o " +
           "WHERE o.destinationWarehouse.id = :warehouseId " +
           "AND o.trackingStatus = :status")
    List<Order> findByDestinationWarehouseIdAndTrackingStatus(
        @Param("warehouseId") int warehouseId,
        @Param("status") TrackingStatus status
    );

    // ── Sub-order grouping ───────────────────────────────────────

    /**
     * Returns all sub-orders belonging to the same customer purchase.
     * Used on order-success and order-history to group split orders.
     */
    List<Order> findByParentOrderId(Integer parentOrderId);

    /**
     * Get all orders assigned to a delivery boy with specific tracking statuses.
     * Used by delivery boys to see their assigned orders (SHIPPED or OUT_FOR_DELIVERY).
     */
    List<Order> findByFinalDeliveryBoyIdAndTrackingStatusIn(int deliveryBoyId, List<TrackingStatus> statuses);

    /**
     * Find all orders by destination warehouse and payment status.
     * Used for warehouse settlement workflow (COD cash collection).
     * Returns orders with paymentStatus = "COD_SUBMITTED_TO_WAREHOUSE".
     */
    List<Order> findByDestinationWarehouseIdAndPaymentStatus(int warehouseId, String paymentStatus);

    /**
     * Find all orders linked to a cash settlement.
     * Used by admin during settlement verification and payout.
     */
    List<Order> findByCashSettlementId(int cashSettlementId);

    /**
     * Find all orders ordered by date descending (newest first).
     * Used by admin to view all orders paginated.
     */
    List<Order> findAllByOrderByOrderDateDesc();

    /**
     * Find all DELIVERED orders that are NOT PAID.
     * Used to show admin pending vendor payments for payout.
     */
    List<Order> findByTrackingStatusAndPaymentStatusNot(TrackingStatus status, String paymentStatus);
}