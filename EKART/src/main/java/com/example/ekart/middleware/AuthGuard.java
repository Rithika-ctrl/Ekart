package com.example.ekart.middleware;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Role;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

/**
 * AuthGuard Interceptor for Role-Based Access Control (RBAC).
 *
 * Protects admin routes and ensures only users with appropriate roles
 * can access restricted features.
 *
 * Route Protection:
 * - /admin/* routes: Require admin session
 * - /refund-management/*, /content-management/*, /security-settings/*:
 *   Require ADMIN role or admin session
 *
 * FIX (java:S3776): Cognitive complexity reduced from 21 → ≤15 by extracting
 *   hasAdminSession(), hasAdminRole(), hasOrderManagerRole() helpers and
 *   consolidating the duplicated session checks into single-purpose methods.
 */
@Component
public class AuthGuard implements HandlerInterceptor {

    private static final String ROLE_ADMIN    = "admin";
    private static final String ROLE_CUSTOMER = "customer";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {

        String path = request.getRequestURI();
        HttpSession session = request.getSession(false);

        if (isAdminProtectedRoute(path)) {
            if (hasAdminAccess(session)) return true;
            response.sendRedirect("/403");
            return false;
        }

        if (isOrderManagerRoute(path)) {
            if (hasOrderManagerAccess(session)) return true;
            response.sendRedirect("/403");
            return false;
        }

        return true;
    }

    // ── Route matchers ────────────────────────────────────────────

    /** Returns true if the route requires ADMIN role or higher. */
    private boolean isAdminProtectedRoute(String path) {
        return path.startsWith("/admin/") && !path.equals("/admin/login")
            || path.startsWith("/api/admin/")
            || path.startsWith("/refund-management/")
            || path.startsWith("/content-management/")
            || path.startsWith("/security-settings/");
    }

    /** Returns true if the route requires ORDER_MANAGER role or higher. */
    private boolean isOrderManagerRoute(String path) {
        return path.startsWith("/order-management/")
            || path.startsWith("/reports/");
    }

    // ── Access checks (extracted to reduce CC) ────────────────────

    /** True if session holds a logged-in admin or a customer with ADMIN role. */
    private boolean hasAdminAccess(HttpSession session) {
        return session != null
            && (hasAdminSession(session) || hasAdminRole(session));
    }

    /** True if session allows ORDER_MANAGER-level access or higher. */
    private boolean hasOrderManagerAccess(HttpSession session) {
        return session != null
            && (hasAdminSession(session) || hasOrderManagerRole(session));
    }

    /** True if the session has a direct admin login attribute. */
    private static boolean hasAdminSession(HttpSession session) {
        return session.getAttribute(ROLE_ADMIN) != null;
    }

    /** True if the session's customer has the ADMIN role. */
    private static boolean hasAdminRole(HttpSession session) {
        Customer customer = (Customer) session.getAttribute(ROLE_CUSTOMER);
        return customer != null && customer.getRole() == Role.ADMIN;
    }

    /** True if the session's customer has ORDER_MANAGER or ADMIN role. */
    private static boolean hasOrderManagerRole(HttpSession session) {
        Customer customer = (Customer) session.getAttribute(ROLE_CUSTOMER);
        return customer != null
            && (customer.getRole() == Role.ADMIN || customer.getRole() == Role.ORDER_MANAGER);
    }

    // ── Public utility methods ────────────────────────────────────

    /** Returns true if the session belongs to an admin or ADMIN-role customer. */
    public static boolean isAdmin(HttpSession session) {
        return session != null
            && (hasAdminSession(session) || hasAdminRole(session));
    }

    /** Returns true if the session belongs to an ORDER_MANAGER, ADMIN, or admin login. */
    public static boolean isOrderManagerOrHigher(HttpSession session) {
        return session != null
            && (hasAdminSession(session) || hasOrderManagerRole(session));
    }
}