package com.example.ekart.middleware;

import com.example.ekart.helper.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * JWT Token Interceptor for Delivery Boy REST API endpoints.
 *
 * FIX: Previously used DeliveryRefreshTokenUtil to validate tokens, but delivery
 * login issues tokens via JwtUtil (with role="DELIVERY"). Switched to JwtUtil
 * so that token validation is consistent end-to-end:
 *
 *   Login  → JwtUtil.generateToken(id, email, "DELIVERY")  → accessToken
 *   Filter → ReactAuthFilter uses JwtUtil.isValid() + getRole() → passes DELIVERY role
 *   This  → JwtUtil.isValid() + getRole() == "DELIVERY"    → sets deliveryBoyId attribute
 *
 * PROTECTED PATH PATTERNS (registered in WebMvcConfig):
 *   /api/react/delivery/**
 *
 * PUBLIC PATHS (excluded in WebMvcConfig):
 *   /api/react/auth/delivery/**
 */
@Component
public class DeliveryJwtInterceptor implements HandlerInterceptor {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final JwtUtil jwtUtil;

    public DeliveryJwtInterceptor(
            JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }



    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        // ReactAuthFilter already validated the token and set react.userId / react.role.
        // We just read those attributes and re-expose them as deliveryBoyId for the
        // delivery controllers that call request.getAttribute("deliveryBoyId").

        Object roleAttr = request.getAttribute("react.role");
        Object idAttr   = request.getAttribute("react.userId");

        if (idAttr != null && "DELIVERY".equals(roleAttr)) {
            // ReactAuthFilter already did full validation — trust its result.
            request.setAttribute("deliveryBoyId", (Integer) idAttr);
            return true;
        }

        // Fallback: ReactAuthFilter may not have run (e.g. different filter chain order).
        // Do our own validation using JwtUtil directly.
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            rejectJson(response, 401, "Missing or invalid Authorization header");
            return false;
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            rejectJson(response, 401, "Invalid or expired token. Please log in again.");
            return false;
        }

        String role = jwtUtil.getRole(token);
        if (!"DELIVERY".equals(role)) {
            rejectJson(response, 403, "Access denied: delivery token required");
            return false;
        }

        int deliveryBoyId = jwtUtil.getCustomerId(token); // getCustomerId works for all roles (sub = id)
        request.setAttribute("deliveryBoyId", deliveryBoyId);
        return true;
    }

    private void rejectJson(HttpServletResponse response, int status, String message)
            throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write(
            "{\"success\":false,\"message\":\"" + message + "\"}"
        );
    }
}