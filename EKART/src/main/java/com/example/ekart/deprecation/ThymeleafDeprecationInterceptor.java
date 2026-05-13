package com.example.ekart.deprecation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger LOGGER = LoggerFactory.getLogger(ThymeleafDeprecationInterceptor.class);

    // Skip tracking for these routes
    private static final String[] SKIP_PATTERNS = {
        "/api/", "/assets/", "/js/", "/css/", "/images/", "/static/"
    };

    // ── Injected dependencies ────────────────────────────────────────────────
    private final ThymeleafDeprecationTracker tracker;

    // Constructor injection — tracker is required (ThymeleafDeprecationTracker is a @Component).
    // Making it required lets SonarQube (and the compiler) see that the tracker is never null,
    // so preHandle's 'return false' branch (when a deprecated route is matched) is reachable.
    public ThymeleafDeprecationInterceptor(ThymeleafDeprecationTracker tracker) {
        this.tracker = tracker;
    }


    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        String route = path.startsWith(contextPath) ? path.substring(contextPath.length()) : path;

        // Block deprecated routes if a replacement exists
        String replacement = tracker.getReplacementRoute(route);
        if (replacement != null) {
            response.sendError(HttpServletResponse.SC_GONE, "This route is deprecated. Please use the new API: " + replacement);
            return false;
        }

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
                // FIX S1126: Replace if-then-else with a single return statement
                return true;
            }
        }

        // Skip error pages and status pages
        // Main routes are important for tracking, so we never skip them
        return false;
    }

    /**
     * Extract user ID from session object.
     * Tries common field names: id, userId, customerId, vendorId.
     */
    private String extractUserId(Object user) {
        if (user == null) return null;
        // FIX S1141: Extract nested try block into a separate method
        try {
            return extractIdByReflection(user);
        } catch (ReflectiveOperationException e) {
            LOGGER.debug("Could not extract user id via reflection: {}", e.getMessage());
        }
        return null;
    }

    /**
     * FIX S1141: Extracted nested try block — attempts to read a known ID field via reflection.
     * FIX S3011: Removed field.setAccessible(true) — accessibility bypass is a security risk.
     *            Only public fields (or fields accessible without override) will be read.
     */
    private String extractIdByReflection(Object user) throws ReflectiveOperationException {
        for (String fieldName : new String[]{"id", "customerId", "vendorId", "userId"}) {
            try {
                // FIX S3011: Do NOT call field.setAccessible(true); only access public/accessible fields
                var field = user.getClass().getField(fieldName);
                Object value = field.get(user);
                return value != null ? value.toString() : null;
            } catch (NoSuchFieldException e) {
                LOGGER.trace("Field {} not found on user class, trying next", fieldName);
            }
        }
        return null;
    }
}