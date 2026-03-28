package com.example.ekart.middleware;

import com.example.ekart.helper.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * JWT authentication filter for all /api/flutter/** endpoints.
 *
 * PUBLIC paths (no token required):
 *   POST /api/flutter/auth/**          — login, register, forgot-password, OTP, reset
 *   GET  /api/flutter/products/**      — product catalogue (browsable without login)
 *   POST /api/flutter/assistant/chat   — AI chat works for guests too
 *
 * PROTECTED paths (Bearer JWT required):
 *   Everything else under /api/flutter/**
 *
 * Token contract (issued by login endpoints):
 *   JWT signed with HS256, claims: sub=<id>, email=<email>, role=<CUSTOMER|VENDOR|ADMIN|DELIVERY>
 *
 * The filter extracts (id, role) from the token and writes them into request attributes:
 *   flutter.userId  — int
 *   flutter.role    — String (CUSTOMER | VENDOR | ADMIN | DELIVERY)
 *
 * Controllers that currently read X-Customer-Id / X-Vendor-Id headers keep working —
 * but the filter ALSO verifies that the header value matches the token subject,
 * preventing one user from spoofing another by changing the header.
 */
@Component
public class FlutterAuthFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Paths under /api/flutter that require NO token.
     * Matched as prefix or exact after stripping /api/flutter.
     */
    private static final Set<String> PUBLIC_PREFIXES = Set.of(
            "/auth/",          // all auth flows: login, register, OTP, reset
            "/products",       // GET product list, detail, categories, reviews — read-only catalogue
            "/assistant/chat"  // AI chat — works for guests
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // This filter only applies to /api/flutter/**
        return !request.getRequestURI().startsWith("/api/flutter/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String sub = request.getRequestURI().substring("/api/flutter".length()); // e.g. /cart

        // ── Public endpoints — pass through without a token ───────────────────
        for (String prefix : PUBLIC_PREFIXES) {
            if (sub.startsWith(prefix)) {
                chain.doFilter(request, response);
                return;
            }
        }

        // ── All other endpoints require a valid Bearer JWT ────────────────────
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            reject(response, 401, "Authentication required — send Authorization: Bearer <token>");
            return;
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            reject(response, 401, "Invalid or expired token — please log in again");
            return;
        }

        int    userId = jwtUtil.getCustomerId(token);   // works for all roles (sub = id)
        String role   = jwtUtil.getRole(token);

        // ── Header-ID spoofing check ──────────────────────────────────────────
        // Verify that the identity header matches the token subject.
        // This prevents a logged-in customer from reading another customer's cart
        // by sending X-Customer-Id: <victim-id> with their own valid token.
        String spoofError = checkSpoofing(request, userId, role);
        if (spoofError != null) {
            reject(response, 403, spoofError);
            return;
        }

        // Expose parsed claims to controllers via request attributes
        request.setAttribute("flutter.userId", userId);
        request.setAttribute("flutter.role",   role);

        chain.doFilter(request, response);
    }

    /**
     * Returns an error message if the identity header doesn't match the token,
     * or null if everything is consistent.
     *
     * Admin tokens skip the header check because admin endpoints don't use
     * identity headers — they operate on arbitrary IDs via path variables.
     */
    private String checkSpoofing(HttpServletRequest request, int tokenUserId, String tokenRole) {
        switch (tokenRole) {
            case "CUSTOMER": {
                String h = request.getHeader("X-Customer-Id");
                if (h != null && !h.isBlank()) {
                    try {
                        if (Integer.parseInt(h) != tokenUserId) {
                            return "X-Customer-Id does not match your token identity";
                        }
                    } catch (NumberFormatException e) {
                        return "X-Customer-Id header is not a valid integer";
                    }
                }
                break;
            }
            case "VENDOR": {
                String h = request.getHeader("X-Vendor-Id");
                if (h != null && !h.isBlank()) {
                    try {
                        if (Integer.parseInt(h) != tokenUserId) {
                            return "X-Vendor-Id does not match your token identity";
                        }
                    } catch (NumberFormatException e) {
                        return "X-Vendor-Id header is not a valid integer";
                    }
                }
                break;
            }
            case "DELIVERY": {
                String h = request.getHeader("X-Delivery-Id");
                if (h != null && !h.isBlank()) {
                    try {
                        if (Integer.parseInt(h) != tokenUserId) {
                            return "X-Delivery-Id does not match your token identity";
                        }
                    } catch (NumberFormatException e) {
                        return "X-Delivery-Id header is not a valid integer";
                    }
                }
                break;
            }
            case "ADMIN":
                // Admin token: no identity header to check
                break;
            default:
                return "Unknown role in token: " + tokenRole;
        }
        return null;
    }

    private void reject(HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write(
                MAPPER.writeValueAsString(Map.of("success", false, "message", message))
        );
    }
}