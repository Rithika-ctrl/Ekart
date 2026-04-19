package com.example.ekart.deprecation;

import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Tracks usage of deprecated Thymeleaf routes for monitoring and migration planning.
 * Records: route accessed, user role, access count, last access time, and referer (React SPA vs legacy).
 */
@Component
public class ThymeleafDeprecationTracker {

    public static class RouteAccessLog {
        public String route;
        public String userRole;
        public AtomicLong accessCount = new AtomicLong(0);
        public LocalDateTime firstAccess;
        public LocalDateTime lastAccess;
        public String lastReferer;
        public Set<String> userIds = new HashSet<>();

        public RouteAccessLog(String route, String userRole) {
            this.route = route;
            this.userRole = userRole;
            this.firstAccess = LocalDateTime.now();
            this.lastAccess = LocalDateTime.now();
        }

        public Map<String, Object> toMap() {
            return Map.of(
                "route", route,
                "userRole", userRole,
                "accessCount", accessCount.get(),
                "firstAccess", firstAccess.toString(),
                "lastAccess", lastAccess.toString(),
                "uniqueUsers", userIds.size(),
                "lastReferer", lastReferer != null ? lastReferer : "unknown"
            );
        }
    }

    private final Map<String, RouteAccessLog> accessLogs = new ConcurrentHashMap<>();
    private final Map<String, String> routeReplacements = new ConcurrentHashMap<>();

    public ThymeleafDeprecationTracker() {
        initializeRouteReplacements();
    }

    /**
     * Maps deprecated Thymeleaf routes to their React API equivalents
     */
    private void initializeRouteReplacements() {
        // Customer routes mappings
        routeReplacements.put("/customer/register", "/api/react/auth/register");
        routeReplacements.put("/customer/login", "/api/react/auth/login");
        routeReplacements.put("/customer/home", "/api/react/customer");
        routeReplacements.put("/customer/address", "/api/react/customer/addresses");
        routeReplacements.put("/customer/view-products", "/api/react/products");
        routeReplacements.put("/view-products", "/api/react/products");
        routeReplacements.put("/view-cart", "/api/react/cart");
        routeReplacements.put("/customer/view-cart", "/api/react/cart");
        routeReplacements.put("/search-products", "/api/react/products/search");
        routeReplacements.put("/payment", "/api/react/orders/checkout");
        routeReplacements.put("/view-orders", "/api/react/orders");
        routeReplacements.put("/customer/order-history", "/api/react/orders");
        routeReplacements.put("/customer/track-orders", "/api/react/orders");
        routeReplacements.put("/track/{orderId}", "/api/react/orders/{orderId}/track");

        // Vendor routes mappings
        routeReplacements.put("/vendor/register", "/api/react/auth/vendor/register");
        routeReplacements.put("/vendor/login", "/api/react/auth/vendor/login");
        routeReplacements.put("/vendor/home", "/api/react/vendor");
        routeReplacements.put("/vendor/orders", "/api/react/vendor/orders");
        routeReplacements.put("/vendor/sales-report", "/api/react/vendor/reports/sales");
        routeReplacements.put("/add-product", "/api/react/vendor/products/create");
        routeReplacements.put("/manage-products", "/api/react/vendor/products");
        routeReplacements.put("/edit/{id}", "/api/react/vendor/products/{id}");

        // Admin routes mappings
        routeReplacements.put("/admin/login", "/api/react/auth/admin/login");
        routeReplacements.put("/admin/home", "/api/react/admin");
        routeReplacements.put("/admin/content", "/api/react/admin/banners");
        routeReplacements.put("/admin/security", "/api/react/admin/security");
        routeReplacements.put("/approve-products", "/api/react/admin/products");
        routeReplacements.put("/admin/search-users", "/api/react/admin/users/search");
        routeReplacements.put("/refund-management", "/api/react/admin/refunds");
        routeReplacements.put("/analytics", "/api/react/admin/analytics");
    }

    /**
     * Record a route access
     */
    public void recordAccess(String route, String userRole, String userId, String referer) {
        String key = route + "::" + (userRole != null ? userRole : "GUEST");

        RouteAccessLog log = accessLogs.computeIfAbsent(key, k -> new RouteAccessLog(route, userRole));
        log.accessCount.incrementAndGet();
        log.lastAccess = LocalDateTime.now();
        if (userId != null) log.userIds.add(userId);
        if (referer != null && !referer.isEmpty()) log.lastReferer = referer;
    }

    /**
     * Get replacement route for deprecated path
     */
    public String getReplacementRoute(String thymeleafRoute) {
        return routeReplacements.getOrDefault(thymeleafRoute, null);
    }

    /**
     * Get all access logs
     */
    public List<Map<String, Object>> getAllAccessLogs() {
        return accessLogs.values().stream()
            .sorted((a, b) -> Long.compare(b.accessCount.get(), a.accessCount.get()))
            .map(RouteAccessLog::toMap)
            .toList();
    }

    /**
     * Get access statistics for a specific route
     */
    public Map<String, Object> getRouteStats(String route) {
        return accessLogs.entrySet().stream()
            .filter(e -> e.getValue().route.equals(route))
            .findFirst()
            .map(e -> e.getValue().toMap())
            .orElse(null);
    }

    /**
     * Get summary statistics
     */
    public Map<String, Object> getSummaryStats() {
        long totalAccesses = accessLogs.values().stream().mapToLong(l -> l.accessCount.get()).sum();
        long uniqueRoutes = accessLogs.values().stream().map(l -> l.route).distinct().count();
        long uniqueUsers = accessLogs.values().stream().flatMap(l -> l.userIds.stream()).distinct().count();

        return Map.of(
            "totalAccesses", totalAccesses,
            "uniqueRoutes", uniqueRoutes,
            "uniqueUsers", uniqueUsers,
            "trackingStarted", LocalDateTime.now().toString(),
            "routeMappingsCount", routeReplacements.size()
        );
    }

    /**
     * Get deprecation status report grouped by route category
     */
    public Map<String, Object> getDeprecationReport() {
        Map<String, List<Map<String, Object>>> byCategory = new HashMap<>();

        accessLogs.values().forEach(log -> {
            String category = categorizeRoute(log.route);
            byCategory.computeIfAbsent(category, k -> new ArrayList<>()).add(log.toMap());
        });

        return Map.of(
            "summary", getSummaryStats(),
            "byCategory", byCategory,
            "allLogs", getAllAccessLogs()
        );
    }

    private String categorizeRoute(String route) {
        if (route.startsWith("/customer")) return "CUSTOMER";
        if (route.startsWith("/vendor")) return "VENDOR";
        if (route.startsWith("/admin")) return "ADMIN";
        if (route.startsWith("/guest")) return "GUEST";
        return "PUBLIC";
    }

    /**
     * Clear old logs (useful for periodic cleanup)
     */
    public void clearAccessLogs() {
        accessLogs.clear();
    }
}
