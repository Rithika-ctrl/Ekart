package com.example.ekart.middleware;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Role;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

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
 */
@Component
public class AuthGuard implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) 
            throws Exception {
        
        String path = request.getRequestURI();
        HttpSession session = request.getSession(false);
        
        // Check if accessing admin-protected routes
        if (isAdminProtectedRoute(path)) {
            
            // Check if admin is logged in (admin uses email in session)
            if (session != null && session.getAttribute("admin") != null) {
                return true; // Admin has full access
            }
            
            // Check if customer with ADMIN role is logged in
            if (session != null) {
                Customer customer = (Customer) session.getAttribute("customer");
                if (customer != null && customer.getRole() == Role.ADMIN) {
                    return true; // Customer with ADMIN role has access
                }
            }
            
            // Unauthorized - redirect to 403
            response.sendRedirect("/403");
            return false;
        }
        
        // Check Order Manager protected routes
        if (isOrderManagerRoute(path)) {
            if (session != null) {
                // Admin has access to everything
                if (session.getAttribute("admin") != null) {
                    return true;
                }
                
                Customer customer = (Customer) session.getAttribute("customer");
                if (customer != null && 
                    (customer.getRole() == Role.ADMIN || customer.getRole() == Role.ORDER_MANAGER)) {
                    return true;
                }
            }
            
            // Unauthorized
            response.sendRedirect("/403");
            return false;
        }
        
        return true; // Allow all other routes
    }
    
    /**
     * Check if the route requires ADMIN role.
     */
    private boolean isAdminProtectedRoute(String path) {
        return path.startsWith("/admin/") && !path.equals("/admin/login")
            || path.startsWith("/api/admin/")
            || path.startsWith("/refund-management/")
            || path.startsWith("/content-management/")
<<<<<<< HEAD
            || path.startsWith("/security-settings/");
=======
            || path.startsWith("/security-settings/")
            || path.equals("/user-spending");
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
    }
    
    /**
     * Check if the route requires ORDER_MANAGER or higher role.
     */
    private boolean isOrderManagerRoute(String path) {
        return path.startsWith("/order-management/")
            || path.startsWith("/reports/");
    }
    
    /**
     * Utility method to check if a user has admin privileges.
     * Can be called from controllers/services.
     */
    public static boolean isAdmin(HttpSession session) {
        if (session == null) return false;
        
        // Check admin session
        if (session.getAttribute("admin") != null) {
            return true;
        }
        
        // Check customer with ADMIN role
        Customer customer = (Customer) session.getAttribute("customer");
        return customer != null && customer.getRole() == Role.ADMIN;
    }
    
    /**
     * Utility method to check if a user has order manager or higher privileges.
     */
    public static boolean isOrderManagerOrHigher(HttpSession session) {
        if (session == null) return false;
        
        if (session.getAttribute("admin") != null) {
            return true;
        }
        
        Customer customer = (Customer) session.getAttribute("customer");
        return customer != null && 
            (customer.getRole() == Role.ADMIN || customer.getRole() == Role.ORDER_MANAGER);
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
