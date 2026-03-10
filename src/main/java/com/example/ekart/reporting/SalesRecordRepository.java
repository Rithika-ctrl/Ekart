package com.example.ekart.reporting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for the REPORTING database.
 * All queries here run on ekart_reporting_db, NOT the main DB.
 */
public interface SalesRecordRepository extends JpaRepository<SalesRecord, Integer> {

    // ── 1. All records for a specific vendor ──
    List<SalesRecord> findByVendorId(int vendorId);

    // ── 2. Records for a vendor within a date range ──
    @Query("SELECT s FROM SalesRecord s WHERE s.vendorId = :vendorId AND s.orderDate BETWEEN :from AND :to")
    List<SalesRecord> findByVendorIdAndDateRange(
            @Param("vendorId") int vendorId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // ── 3. Total revenue earned by a vendor ──
    @Query("SELECT COALESCE(SUM(s.itemPrice * s.quantity), 0) FROM SalesRecord s WHERE s.vendorId = :vendorId")
    double getTotalRevenueByVendor(@Param("vendorId") int vendorId);

    // ── 4. Total revenue for a vendor within a date range ──
    @Query("SELECT COALESCE(SUM(s.itemPrice * s.quantity), 0) FROM SalesRecord s WHERE s.vendorId = :vendorId AND s.orderDate BETWEEN :from AND :to")
    double getRevenueByVendorAndDateRange(
            @Param("vendorId") int vendorId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // ── 5. Product-wise order count for a vendor ──
    // Returns: [productName, totalQuantitySold]
    @Query("SELECT s.productName, SUM(s.quantity) FROM SalesRecord s WHERE s.vendorId = :vendorId GROUP BY s.productName ORDER BY SUM(s.quantity) DESC")
    List<Object[]> getProductWiseSales(@Param("vendorId") int vendorId);

    // ── 6. Category-wise revenue for a vendor ──
    // Returns: [category, totalRevenue]
    @Query("SELECT s.category, SUM(s.itemPrice * s.quantity) FROM SalesRecord s WHERE s.vendorId = :vendorId GROUP BY s.category ORDER BY SUM(s.itemPrice * s.quantity) DESC")
    List<Object[]> getCategoryWiseRevenue(@Param("vendorId") int vendorId);

    // ── 7. Total orders count for a vendor ──
    @Query("SELECT COUNT(DISTINCT s.orderId) FROM SalesRecord s WHERE s.vendorId = :vendorId")
    long getTotalOrdersByVendor(@Param("vendorId") int vendorId);

    // ── 8. Total orders count for a vendor within a date range ──
    @Query("SELECT COUNT(DISTINCT s.orderId) FROM SalesRecord s WHERE s.vendorId = :vendorId AND s.orderDate BETWEEN :from AND :to")
    long getOrderCountByVendorAndDateRange(
            @Param("vendorId") int vendorId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // ── 9. Total items sold for a vendor within a date range ──
    @Query("SELECT COALESCE(SUM(s.quantity), 0) FROM SalesRecord s WHERE s.vendorId = :vendorId AND s.orderDate BETWEEN :from AND :to")
    long getItemsSoldByVendorAndDateRange(
            @Param("vendorId") int vendorId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // ─────────────────────────────────────────────────────────────
    //  ADMIN-LEVEL QUERIES (platform-wide)
    // ─────────────────────────────────────────────────────────────

    // ── 10. Platform total revenue ──
    @Query("SELECT COALESCE(SUM(s.itemPrice * s.quantity), 0) FROM SalesRecord s")
    double getPlatformTotalRevenue();

    // ── 11. Platform total revenue within date range ──
    @Query("SELECT COALESCE(SUM(s.itemPrice * s.quantity), 0) FROM SalesRecord s WHERE s.orderDate BETWEEN :from AND :to")
    double getPlatformRevenueByDateRange(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // ── 12. Platform total orders ──
    @Query("SELECT COUNT(DISTINCT s.orderId) FROM SalesRecord s")
    long getPlatformTotalOrders();

    // ── 13. Top vendors by revenue: [vendorId, vendorName, totalRevenue] ──
    @Query("SELECT s.vendorId, s.vendorName, SUM(s.itemPrice * s.quantity) FROM SalesRecord s GROUP BY s.vendorId, s.vendorName ORDER BY SUM(s.itemPrice * s.quantity) DESC")
    List<Object[]> getTopVendorsByRevenue();

    // ── 14. Platform-wide category revenue: [category, totalRevenue] ──
    @Query("SELECT s.category, SUM(s.itemPrice * s.quantity) FROM SalesRecord s GROUP BY s.category ORDER BY SUM(s.itemPrice * s.quantity) DESC")
    List<Object[]> getPlatformCategoryRevenue();

    // ── 15. Daily revenue trend: [date, revenue] ──
    @Query("SELECT FUNCTION('DATE', s.orderDate), SUM(s.itemPrice * s.quantity) FROM SalesRecord s WHERE s.orderDate >= :since GROUP BY FUNCTION('DATE', s.orderDate) ORDER BY FUNCTION('DATE', s.orderDate) ASC")
    List<Object[]> getDailyRevenueSince(@Param("since") LocalDateTime since);

    // ── 16. Idempotency guard — prevent double-recording an order ──
    boolean existsByOrderId(int orderId);
}