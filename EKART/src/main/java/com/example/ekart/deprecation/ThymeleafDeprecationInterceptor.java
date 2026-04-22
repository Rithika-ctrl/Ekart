package com.example.ekart.deprecation;

import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.stereotype.Component;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Automatically tracks all Thymeleaf route accesses for deprecation monitoring.
 * Integrates with the deprecation tracker to record usage statistics.
 */
@Component
public class ThymeleafDeprecationInterceptor implements HandlerInterceptor {


    // Skip tracking for these routes
    private static final String[] SKIP_PATTERNS = {
        "/api/", "/assets/", "/js/", "/css/", "/images/", "/static/"
    };

    // ── Injected dependencies ────────────────────────────────────────────────
    private final ThymeleafDeprecationTracker tracker;

    public ThymeleafDeprecationInterceptor(
            @org.springframework.beans.factory.annotation.Autowired(required = false)
            ThymeleafDeprecationTracker tracker) {
        this.tracker = tracker;
    }


    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (tracker == null) {
            return true;
        }

        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        String route = path.startsWith(contextPath) ? path.substring(contextPath.length()) : path;

        // Skip non-Thymeleaf & asset routes
        if (shouldSkip(route)) {
            return true;
        }

        // Determine user role from session
        HttpSession session = request.getSession(false);
        String userRole = null;
        String userId = null;

        if (session != null) {
            if (session.getAttribute("customer") != null) {
                userRole = "CUSTOMER";
                Object customer = session.getAttribute("customer");
                // Extract customer ID if available
                userId = extractUserId(customer);
            } else if (session.getAttribute("vendor") != null) {
                userRole = "VENDOR";
                Object vendor = session.getAttribute("vendor");
                userId = extractUserId(vendor);
            } else if (session.getAttribute("admin") != null) {
                userRole = "ADMIN";
                userId = extractUserId(session.getAttribute("admin"));
            } else if (session.getAttribute("guest") != null) {
                userRole = "GUEST";
            }
        }

        // Get referer to determine if coming from React SPA or old UI
        String referer = request.getHeader("Referer");
        if (referer == null) referer = "";

        // Track the access
        tracker.recordAccess(route, userRole, userId, referer);

        return true;
    }

    private boolean shouldSkip(String route) {
        for (String pattern : SKIP_PATTERNS) {
            if (route.startsWith(pattern)) {
                return true;
            }
        }

        // Skip error pages and status pages
        if (route.equals("/") || route.equals("/products") || route.equals("/product/*")) {
            // Don't skip main routes, they are important for tracking
            return false;
        }

        return false;
    }

    /**
     * Extract user ID from session object
     * Tries common field names: id, userId, customerId, vendorId
     */
    private String extractUserId(Object user) {
        if (user == null) return null;
        try {
            // Try reflection to get the ID field
            for (String fieldName : new String[]{"id", "customerId", "vendorId", "userId"}) {
                try {
                    var field = user.getClass().getDeclaredField(fieldName);
                    field.setAccessible(true);
                    Object value = field.get(user);
                    return value != null ? value.toString() : null;
                } catch (NoSuchFieldException e) {
                    // Continue to next field name
                }
            }
        } catch (Exception e) {
            // Silently fail - just return null
        }
        return null;
    }
}