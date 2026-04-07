package com.example.ekart.middleware;

import com.example.ekart.helper.DeliveryRefreshTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * JWT Token Interceptor for Delivery Boy REST API endpoints.
 * 
 * PROTECTED PATH PATTERNS:
 * - /api/react/delivery/** (all delivery management endpoints)
 * - /api/react/delivery-app/** (delivery app endpoints)
 * 
 * PUBLIC PATHS (excluded):
 * - /api/react/auth/delivery/register
 * - /api/react/auth/delivery/login
 * - /api/react/auth/delivery/verify-otp
 * - /api/react/auth/delivery/resend-otp
 * - /api/react/auth/delivery/refresh (token refresh)
 * - /api/react/auth/delivery/warehouses
 * 
 * SECURITY:
 * 1. Extracts "Authorization: Bearer <accessToken>" from requests
 * 2. Validates token using DeliveryRefreshTokenUtil
 * 3. Stores delivery boy info in request attributes for controllers
 * 4. Returns 401 Unauthorized if token invalid/expired
 * 
 * TOKEN STRUCTURE:
 * - Type: access or refresh
 * - Subject: delivery boy ID
 * - Claims: email, type (access/refresh)
 * - Expiry: 15 minutes for access, 7 days for refresh
 * 
 * USAGE:
 * Register in WebMvcConfig:
 *   registry.addInterceptor(deliveryJwtInterceptor)
 *       .addPathPatterns("/api/react/delivery/**", "/api/react/delivery-app/**")
 *       .excludePathPatterns(
 *           "/api/react/auth/delivery/**"
 *       );
 */
@Component
public class DeliveryJwtInterceptor implements HandlerInterceptor {

    @Autowired(required = false)
    private DeliveryRefreshTokenUtil deliveryRefreshTokenUtil;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        // Skip if DeliveryRefreshTokenUtil not available
        if (deliveryRefreshTokenUtil == null) {
            return true;
        }

        // Extract Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Missing or invalid Authorization header\"}");
            return false;
        }

        // Extract token
        String accessToken = authHeader.substring(7); // Remove "Bearer "

        // Validate token
        if (!deliveryRefreshTokenUtil.isValidAccessToken(accessToken)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Invalid or expired access token. Please refresh.\"}");
            return false;
        }

        // Extract delivery boy info and store in request
        try {
            int deliveryBoyId = deliveryRefreshTokenUtil.getDeliveryBoyId(accessToken);
            String email = deliveryRefreshTokenUtil.getEmail(accessToken);

            // Store in request attributes for controller access
            request.setAttribute("deliveryBoyId", deliveryBoyId);
            request.setAttribute("deliveryBoyEmail", email);
            request.setAttribute("accessToken", accessToken);

            return true;

        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Token validation error: " + e.getMessage() + "\"}");
            return false;
        }
    }
}
