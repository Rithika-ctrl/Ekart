package com.example.ekart.reporting;

import java.time.LocalDateTime;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Product;
import com.example.ekart.repository.ProductRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ============================================================
 *  REPORTING SERVICE
 * ============================================================
 *  Called after every order is placed.
 *  Saves sales data into the REPORTING DB (not main DB).
 *  Also provides analytics methods querying only the reporting DB.
 *
 *  Design principles:
 *   - recordOrder() is the single write path — called from CustomerService
 *   - All analytics read from reporting DB only (zero load on main DB)
 *   - Idempotent: re-processing the same orderId is safe
 * ============================================================
 */
@Service
public class ReportingService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final SalesRecordRepository salesRecordRepository;
    private final ProductRepository productRepository;

    public ReportingService(
            SalesRecordRepository salesRecordRepository,
            ProductRepository productRepository) {
        this.salesRecordRepository = salesRecordRepository;
        this.productRepository = productRepository;
    }




    // ──────────────────────────────────────────────────────────────
    //  WRITE: Called when an order is placed → saves to reporting DB
    // ──────────────────────────────────────────────────────────────

    /**
     * Records every line-item of a completed order into the reporting DB.
     * Idempotent: if the orderId already exists in reporting DB, it is skipped
     * to prevent double-counting on retries.
     */
    @Transactional(value = "mainTransactionManager", propagation = Propagation.REQUIRES_NEW)
    public void recordOrder(Order order) {
        if (order == null || order.getItems() == null || order.getItems().isEmpty()) return;

        // Idempotency guard — skip if already recorded
        if (salesRecordRepository.existsByOrderId(order.getId())) return;

        for (Item item : order.getItems()) {
            SalesRecord record = new SalesRecord();

            // Order-level fields
            record.setOrderId(order.getId());
            record.setOrderDate(order.getOrderDate() != null ? order.getOrderDate() : LocalDateTime.now());
            record.setOrderTotal(order.getAmount());
            record.setDeliveryCharge(order.getDeliveryCharge());

            // Item-level fields
            record.setProductId(item.getProductId());
            record.setProductName(item.getName());
            record.setCategory(item.getCategory() != null ? item.getCategory() : "Uncategorized");
            record.setItemPrice(item.getPrice());
            record.setQuantity(item.getQuantity() > 0 ? item.getQuantity() : 1);

            // Customer fields
            if (order.getCustomer() != null) {
                record.setCustomerId(order.getCustomer().getId());
                record.setCustomerName(order.getCustomer().getName());
            }

            // Vendor fields — look up by productId (faster & more reliable than findByName)
            if (item.getProductId() != null) {
                try {
                    Product product = productRepository.findById(item.getProductId()).orElse(null);
                    if (product != null && product.getVendor() != null) {
                        record.setVendorId(product.getVendor().getId());
                        record.setVendorName(product.getVendor().getName());
                    }
                } catch (Exception e) {
                    // Product may have been deleted; store record without vendor info
                }
            }

            salesRecordRepository.save(record);
        }
    }

    // ──────────────────────────────────────────────────────────────
    //  READ: Vendor analytics — all from reporting DB
    // ──────────────────────────────────────────────────────────────

    /** Build a daily/weekly/monthly/overall summary map for a vendor */
    public Map<String, Object> buildVendorSummary(int vendorId, LocalDateTime from, LocalDateTime to) {
        double revenue    = salesRecordRepository.getRevenueByVendorAndDateRange(vendorId, from, to);
        long   orders     = salesRecordRepository.getOrderCountByVendorAndDateRange(vendorId, from, to);
        long   itemsSold  = salesRecordRepository.getItemsSoldByVendorAndDateRange(vendorId, from, to);
        double avg        = orders == 0 ? 0 : Math.round((revenue / orders) * 100.0) / 100.0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalRevenue",   revenue);
        summary.put("totalOrders",    (int) orders);
        summary.put("totalItemsSold", (int) itemsSold);
        summary.put("avgOrderValue",  avg);
        return summary;
    }

    /** Overall (all-time) summary for a vendor */
    public Map<String, Object> buildVendorOverallSummary(int vendorId) {
        double revenue   = salesRecordRepository.getTotalRevenueByVendor(vendorId);
        long   orders    = salesRecordRepository.getTotalOrdersByVendor(vendorId);
        List<SalesRecord> all = salesRecordRepository.findByVendorId(vendorId);
        long itemsSold = all.stream().mapToLong(SalesRecord::getQuantity).sum();
        double avg = orders == 0 ? 0 : Math.round((revenue / orders) * 100.0) / 100.0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalRevenue",   revenue);
        summary.put("totalOrders",    (int) orders);
        summary.put("totalItemsSold", (int) itemsSold);
        summary.put("avgOrderValue",  avg);
        return summary;
    }

    /** Returns all SalesRecords for a vendor (used for JSON chart data) */
    public List<SalesRecord> getVendorRecords(int vendorId) {
        return salesRecordRepository.findByVendorId(vendorId);
    }

    /**
     * Product-wise sales for a vendor: [{productName, totalSold}]
     * ✅ FIX: Added missing result.add(map) inside the loop.
     *         Previously the map was built but never added — always returned [].
     */
    public List<Map<String, Object>> getProductWiseSales(int vendorId) {
        List<Object[]> raw = salesRecordRepository.getProductWiseSales(vendorId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> map = new HashMap<>();
            map.put("productName", row[0]);
            map.put("totalSold",   row[1]);
            result.add(map); // ✅ FIX: This line was missing — result was always empty before
        }
        return result;
    }

    /**
     * Category-wise revenue for a vendor: [{category, totalRevenue}]
     * ✅ FIX: Added missing result.add(map) inside the loop.
     *         Previously the map was built but never added — always returned [].
     */
    public List<Map<String, Object>> getCategoryWiseRevenue(int vendorId) {
        List<Object[]> raw = salesRecordRepository.getCategoryWiseRevenue(vendorId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> map = new HashMap<>();
            map.put("category",     row[0]);
            map.put("totalRevenue", row[1]);
            result.add(map); // ✅ FIX: This line was missing — result was always empty before
        }
        return result;
    }

    // ──────────────────────────────────────────────────────────────
    //  READ: Admin / platform-wide analytics
    // ──────────────────────────────────────────────────────────────

    /** Platform-wide summary (today / this week / this month / overall) */
    public Map<String, Map<String, Object>> buildAdminDashboardSummary() {
        LocalDateTime now         = LocalDateTime.now();
        LocalDate today           = now.toLocalDate();
        LocalDateTime todayStart  = today.atStartOfDay();
        LocalDateTime todayEnd    = today.atTime(23, 59, 59);
        LocalDateTime weekStart   = today.with(DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime monthStart  = today.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();

        Map<String, Map<String, Object>> dashboard = new HashMap<>();
        dashboard.put("today",   buildPlatformPeriodSummary(todayStart,  todayEnd));
        dashboard.put("week",    buildPlatformPeriodSummary(weekStart,   now));
        dashboard.put("month",   buildPlatformPeriodSummary(monthStart,  now));
        dashboard.put("overall", buildPlatformOverallSummary());
        return dashboard;
    }

    private Map<String, Object> buildPlatformPeriodSummary(LocalDateTime from, LocalDateTime to) {
        double revenue = salesRecordRepository.getPlatformRevenueByDateRange(from, to);
        Map<String, Object> m = new HashMap<>();
        m.put("totalRevenue", revenue);
        return m;
    }

    private Map<String, Object> buildPlatformOverallSummary() {
        double revenue = salesRecordRepository.getPlatformTotalRevenue();
        long   orders  = salesRecordRepository.getPlatformTotalOrders();
        double avg     = orders == 0 ? 0 : Math.round((revenue / orders) * 100.0) / 100.0;
        Map<String, Object> m = new HashMap<>();
        m.put("totalRevenue",  revenue);
        m.put("totalOrders",   orders);
        m.put("avgOrderValue", avg);
        return m;
    }

    /** Top vendors by all-time revenue: [{vendorId, vendorName, totalRevenue}] */
    public List<Map<String, Object>> getTopVendorsByRevenue() {
        List<Object[]> raw = salesRecordRepository.getTopVendorsByRevenue();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> m = new HashMap<>();
            m.put("vendorId",     row[0]);
            m.put("vendorName",   row[1]);
            m.put("totalRevenue", row[2]);
            result.add(m);
        }
        return result;
    }

    /** Platform-wide category revenue: [{category, totalRevenue}] */
    public List<Map<String, Object>> getPlatformCategoryRevenue() {
        List<Object[]> raw = salesRecordRepository.getPlatformCategoryRevenue();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> m = new HashMap<>();
            m.put("category",     row[0]);
            m.put("totalRevenue", row[1]);
            result.add(m);
        }
        return result;
    }

    /** Daily revenue trend for the last N days: [{date, revenue}] */
    public List<Map<String, Object>> getDailyRevenueTrend(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<Object[]> raw = salesRecordRepository.getDailyRevenueSince(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> m = new HashMap<>();
            m.put("date",    row[0] != null ? row[0].toString() : "");
            m.put("revenue", row[1]);
            result.add(m);
        }
        return result;
    }

    // Legacy compatibility — kept for any existing callers
    public double getTotalRevenue(int vendorId) {
        return salesRecordRepository.getTotalRevenueByVendor(vendorId);
    }

    public long getTotalOrders(int vendorId) {
        return salesRecordRepository.getTotalOrdersByVendor(vendorId);
    }
}