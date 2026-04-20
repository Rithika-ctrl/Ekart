package com.example.ekart.middleware;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IndiaOnlyInterceptor
 *
 * Blocks requests originating from outside India by looking up the
 * client IP against the free ip-api.com endpoint (no key required,
 * 45 req/min per IP on the free tier — plenty for a project).
 *
 * Flow:
 *   1. Extract the real client IP (handles X-Forwarded-For from Railway/nginx).
 *   2. If the IP is a loopback / private range → allow (dev/localhost).
 *   3. Cache the result per IP so we never call the API twice for the same visitor.
 *   4. If the API says country != "IN" → redirect to /blocked (or JSON for AJAX).
 *   5. If the API call fails (timeout, rate-limit) → ALLOW (fail-open, don't
 *      punish real Indian users because of a lookup error).
 *
 * Pages excluded from blocking:
 *   - /blocked  (the "India only" page itself)
 *   - /css/**, /js/**, /images/** (static assets)
 *   - /api/flutter/** (mobile app — JWT auth handles identity there)
 */
@Component
public class IndiaOnlyInterceptor implements HandlerInterceptor {

    private static final Logger LOGGER = LoggerFactory.getLogger(IndiaOnlyInterceptor.class);

    // Simple in-memory IP → isIndia cache (resets on restart — fine for a project)
    private static final ConcurrentHashMap<String, Boolean> IP_CACHE = new ConcurrentHashMap<>();

    // Paths that are exempt from the India-only check
    private static final Set<String> EXEMPT_PREFIXES = Set.of(
        "/blocked",
        "/css/",
        "/js/",
        "/images/",
        "/static/",
        "/api/flutter/"   // Flutter app auth is handled by JWT, not location
    );

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        String path = request.getRequestURI();
        // CORS preflight requests are OPTIONS. If we block them, browsers surface it as a
        // "CORS error" even though the actual problem is the 403/redirect on OPTIONS.
        // Allow OPTIONS always so Spring's CORS handling can respond correctly.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Skip check for exempt paths
        for (String prefix : EXEMPT_PREFIXES) {
            if (path.startsWith(prefix)) return true;
        }

        String ip = extractClientIp(request);

        // Always allow loopback and private ranges (localhost dev, Railway internal)
        if (isPrivateOrLoopback(ip)) return true;

        // Check cache first
        Boolean cachedResult = IP_CACHE.get(ip);
        if (cachedResult != null) {
            if (!cachedResult) {
                sendBlocked(response, request);
                return false;
            }
            return true;
        }

        // Call ip-api.com to resolve country
        boolean isIndia = resolveIsIndia(ip);
        IP_CACHE.put(ip, isIndia);

        if (!isIndia) {
            sendBlocked(response, request);
            return false;
        }
        return true;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Extract the real client IP, honouring X-Forwarded-For set by Railway/nginx.
     * Takes the FIRST (leftmost) IP in the chain — that's the original client.
     */
    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        return request.getRemoteAddr();
    }

    /**
     * Returns true for loopback (127.x, ::1) and RFC-1918 private ranges
     * (10.x, 172.16-31.x, 192.168.x). These never need a geo-lookup.
     */
    private boolean isPrivateOrLoopback(String ip) {
        if (ip == null) return true;
        return ip.equals("127.0.0.1")
            || ip.equals("::1")
            || ip.equals("0:0:0:0:0:0:0:1")
            || ip.startsWith("10.")
            || ip.startsWith("192.168.")
            || ip.startsWith("172.16.") || ip.startsWith("172.17.")
            || ip.startsWith("172.18.") || ip.startsWith("172.19.")
            || ip.startsWith("172.20.") || ip.startsWith("172.21.")
            || ip.startsWith("172.22.") || ip.startsWith("172.23.")
            || ip.startsWith("172.24.") || ip.startsWith("172.25.")
            || ip.startsWith("172.26.") || ip.startsWith("172.27.")
            || ip.startsWith("172.28.") || ip.startsWith("172.29.")
            || ip.startsWith("172.30.") || ip.startsWith("172.31.");
    }

    /**
     * Calls ip-api.com (free, no API key needed) to check if an IP is in India.
     * Returns true (allow) on ANY error or uncertainty — fail-open aggressively.
     *
     * Why fail-open so aggressively?
     * Many Indian ISPs (Jio, BSNL, Airtel), college networks, and corporate
     * proxies route traffic through IPs that ip-api.com classifies as non-Indian.
     * False positives (blocking real Indian users) are far worse than false
     * negatives (letting a few foreign visitors through).
     * This interceptor is a soft check, not a security control.
     */
    private boolean resolveIsIndia(String ip) {
        try {
            URL url = new URL("http://ip-api.com/json/" + ip + "?fields=countryCode,status");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(2000);
            conn.setReadTimeout(2000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");

            if (conn.getResponseCode() != 200) return true; // fail-open

            try (Scanner scanner = new Scanner(conn.getInputStream())) {
                String body = scanner.useDelimiter("\\A").next();
                // Only block if we get a DEFINITIVE non-India response
                // If status is not "success", fail-open
                if (!body.contains("\"status\":\"success\"")) return true;
                // Only block if countryCode is explicitly non-IN
                return !body.contains("\"countryCode\":\"") || body.contains("\"countryCode\":\"IN\"");
            }
        } catch (IOException e) {
            LOGGER.error("IP lookup failed for {}: {}", ip, e.getMessage(), e);
            return true; // fail-open on any error
        }
    }

    /**
     * For AJAX / fetch / non-GET requests → return JSON 403 so the caller
     * can parse the response cleanly instead of getting an HTML redirect.
     * For normal browser page loads → redirect to /blocked.
     *
     * Detection order:
     *   1. X-Requested-With: XMLHttpRequest  (jQuery / legacy AJAX)
     *   2. Accept header contains application/json  (fetch with default headers)
     *   3. Any non-GET method (POST/PUT/DELETE are never page navigations)
     *   4. Path starts with /api/
     */
    private void sendBlocked(HttpServletResponse response, HttpServletRequest request)
            throws IOException {
        String path   = request.getRequestURI();
        String xrw    = request.getHeader("X-Requested-With");
        String accept = request.getHeader("Accept");
        String method = request.getMethod();

        boolean isAjaxOrFetch = "XMLHttpRequest".equals(xrw)
                || (accept != null && accept.contains("application/json"))
                || !"GET".equalsIgnoreCase(method)
                || path.startsWith("/api/");

        if (isAjaxOrFetch) {
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                "{\"success\":false,\"message\":\"Ekart is available only within India.\"}"
            );
        } else {
            response.sendRedirect("/blocked");
        }
    }
}