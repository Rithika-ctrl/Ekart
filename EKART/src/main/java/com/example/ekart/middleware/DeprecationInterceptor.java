package com.example.ekart.middleware;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.HashMap;
import java.util.Map;

/**
 * DeprecationInterceptor.java
 * ─────────────────────────────────────────────────────────────────────────────
 * Monitors access to legacy Thymeleaf routes and redirects to React SPA equivalents.
 * 
 * DEPRECATION ROADMAP:
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 1 (Current): Log warnings, allow access, redirect with headers
 * Phase 2 (2025-Q2): Redirect with response status 301 (permanent)
 * Phase 3 (2025-Q3): Block entirely (401 Unauthorized) with migration guide
 * 
 * MAPPED ROUTES:
 * ─────────────────────────────────────────────────────────────────────────────
 * Legacy Thymeleaf      →  React SPA Equivalent
 * /admin/accounts       →  /admin/accounts (via SPA)
 * /admin/refunds        →  /admin/refunds (via SPA)
 * /admin/coupons        →  /admin/coupons (via SPA)
 * /admin/reviews        →  /admin/reviews (via SPA)
 * /admin/policies       →  /admin/policies (via SPA)
 * /customer/profile     →  /shop/profile (via SPA)
 * /customer/coupons     →  /shop/coupons (via SPA)
 * /vendor/home          →  /vendor/home (via SPA)
 */
@Component
public class DeprecationInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(DeprecationInterceptor.class);

    /**
     * Map of legacy routes → React SPA routes
     * NOTE: React SPA handled by SpaRouteController catch-all forwarding to /index.html
     */
    private static final Map<String, String> LEGACY_TO_SPA = new HashMap<>();

    static {
        // Admin routes (all forward to same React component, accessed via /admin/*)
        LEGACY_TO_SPA.put("/admin/accounts", "/admin/accounts");
        LEGACY_TO_SPA.put("/admin/refunds", "/admin/refunds");
        LEGACY_TO_SPA.put("/admin/coupons", "/admin/coupons");
        LEGACY_TO_SPA.put("/admin/reviews", "/admin/reviews");
        LEGACY_TO_SPA.put("/admin/policies", "/admin/policies");
        LEGACY_TO_SPA.put("/admin/delivery", "/admin/delivery");
        LEGACY_TO_SPA.put("/admin/warehouses", "/admin/warehouses");
        LEGACY_TO_SPA.put("/admin/delete-review/", "/admin/reviews");
        LEGACY_TO_SPA.put("/admin/bulk-delete-reviews", "/admin/reviews");

        // Customer routes → SPA equivalent
        LEGACY_TO_SPA.put("/customer/profile", "/shop/profile");
        LEGACY_TO_SPA.put("/customer/coupons", "/shop/coupons");
        LEGACY_TO_SPA.put("/customer/security-settings", "/shop/profile/security");
        LEGACY_TO_SPA.put("/customer/refund/report/", "/shop/orders");
        LEGACY_TO_SPA.put("/customer/review/", "/shop/orders");

        // Vendor routes → SPA equivalent
        LEGACY_TO_SPA.put("/vendor/home", "/vendor/home");
    }

    /**
     * Intercepts requests to legacy Thymeleaf routes.
     * Phase 1: log warning + add deprecation header, allow access.
     * Phase 2 (2025-Q2): redirect to SPA (return false) for deprecated routes.
     * User agents should read X-Deprecated header and display warning.
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String requestPath = request.getRequestURI();

        // Check if this is a legacy Thymeleaf route
        String spaPath = findSpaEquivalent(requestPath);
        if (spaPath != null) {
            logger.warn(
                "[DEPRECATION] Legacy Thymeleaf route accessed: {} → Migrated to React SPA: {} (Phase 1: Warning only)",
                requestPath,
                spaPath
            );

            // Add deprecation header so frontend can detect and warn user
            response.setHeader("X-Deprecated", "true");
            response.setHeader("X-SPA-Equivalent", spaPath);
            response.setHeader("X-Deprecation-Message",
                "This page is deprecated. Your browser will be automatically " +
                "redirected to the React SPA in Q2 2025. No action needed now."
            );

            if (isPhase2Active()) {
                // Phase 2: redirect permanently to SPA equivalent
                response.sendRedirect(spaPath);
                return false;
            }
            // Phase 1: Allow access but log
            return true;
        }

        return true;
    }

    /**
     * Returns true when Phase 2 deprecation redirects should be enforced.
     * Flip this to true in Q2 2025 to activate permanent redirects.
     */
    private boolean isPhase2Active() {
        return false; // Phase 1: warning-only mode
    }

    /**
     * Finds the SPA equivalent route for a legacy Thymeleaf path.
     * Handles path parameters like /customer/refund/report/{orderId}
     */
    private String findSpaEquivalent(String requestPath) {
        for (Map.Entry<String, String> mapping : LEGACY_TO_SPA.entrySet()) {
            String legacyPrefix = mapping.getKey();
            String spaPath = mapping.getValue();

            if (requestPath.equals(legacyPrefix) || requestPath.startsWith(legacyPrefix)) {
                // Preserve path parameters for routes like /customer/refund/report/123
                if (requestPath.startsWith(legacyPrefix) && requestPath.length() > legacyPrefix.length()) {
                    String suffix = requestPath.substring(legacyPrefix.length());
                    // Extract ID and reconstruct SPA path
                    return spaPath + suffix;
                }
                return spaPath;
            }
        }
        return null;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
                          ModelAndView modelAndView) throws Exception {
        HandlerInterceptor.super.postHandle(request, response, handler, modelAndView);
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex)
            throws Exception {
        HandlerInterceptor.super.afterCompletion(request, response, handler, ex);
    }
}