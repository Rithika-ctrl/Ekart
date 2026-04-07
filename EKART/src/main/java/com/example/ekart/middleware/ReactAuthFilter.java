package com.example.ekart.middleware;

import com.example.ekart.helper.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * JWT authentication filter for /api/react/** endpoints.
 *
 * PUBLIC paths (no token required):
 *   POST /api/react/auth/**          — login, register, forgot-password, OTP, reset
 *   GET  /api/react/products/**      — product catalogue (browsable without login)
 *   POST /api/react/assistant/chat   — AI chat works for guests too
 *
 * PROTECTED paths (Bearer JWT required):
 *   Everything else under /api/react/**
 *
 * ADMIN-ONLY paths (Bearer JWT with role=ADMIN required):
 *   /api/react/admin/**              — any non-ADMIN token is rejected with 403
 *                                        no token at all is rejected with 401
 *
 * Token contract (issued by login endpoints):
 *   JWT signed with HS256, claims: sub=<id>, email=<email>, role=<CUSTOMER|VENDOR|ADMIN|DELIVERY>
 *
 * The filter extracts (id, role) from the token and writes them into request attributes:
 *   react.userId  — int
 *   react.role    — String (CUSTOMER | VENDOR | ADMIN | DELIVERY)
 *
 * Controllers that currently read X-Customer-Id / X-Vendor-Id headers keep working —
 * but the filter ALSO verifies that the header value matches the token subject,
 * preventing one user from spoofing another by changing the header.
 *
 * SECURITY FIX (Admin APIs Unprotected):
 *   Admin path detection is now done with isAdminPath() which correctly matches:
 *     - /admin/<anything>   (sub.startsWith("/admin/"))
 *     - /admin              (exact match — unlikely but safe)
 *   A request with NO token to any /admin/** path is rejected 401 before role check.
 *   A request with a valid non-ADMIN token to any /admin/** path is rejected 403.
 *   This is defence-in-depth: FlutterApiController.requireAdmin() is a second layer.
 */
@Component
public class ReactAuthFilter extends OncePerRequestFilter {

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

    // ── Helper: is this path an admin path? ──────────────────────────────────
    private boolean isAdminPath(String sub) {
        // sub is the URI with /api/react stripped, e.g. "/admin/users"
        // Match /admin/<anything> or bare /admin (no trailing slash)
        return sub.startsWith("/admin/") || sub.equals("/admin");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // This filter only applies to /api/flutter/**
        return !request.getRequestURI().startsWith("/api/react/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String sub = request.getRequestURI().substring("/api/react".length()); // e.g. /cart

        // ── Public endpoints — pass through without a token ───────────────────
        // Admin paths are explicitly EXCLUDED from the public list even if
        // something in PUBLIC_PREFIXES accidentally matched — the isAdminPath()
        // check below runs first for admin paths.
        if (!isAdminPath(sub)) {
            for (String prefix : PUBLIC_PREFIXES) {
                if (sub.startsWith(prefix)) {
                    chain.doFilter(request, response);
                    return;
                }
            }
        }

        // ── All other endpoints (including ALL admin/**) require a valid Bearer JWT ──
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

        // ── Admin-only path guard ─────────────────────────────────────────────
        // Any request to /api/react/admin/** MUST carry an ADMIN token.
        // A valid CUSTOMER, VENDOR, or DELIVERY token is explicitly rejected here
        // so that non-admin roles can never reach admin data even with a valid JWT.
        if (isAdminPath(sub)) {
            if (!"ADMIN".equals(role)) {
                reject(response, 403,
                    "Admin access required — your token role is '" + role + "'");
                return;
            }
        }

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
        request.setAttribute("react.userId", userId);
        request.setAttribute("react.role",   role);

        // Build Spring Security authentication so role matchers in SecurityConfig
        // enforce authorization at framework level as well.
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
        SecurityContextHolder.getContext().setAuthentication(authentication);

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