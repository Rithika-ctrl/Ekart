package com.example.ekart.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Single Page Application (SPA) Catch-All Route Controller
 *
 * Purpose:
 *   Redirects all non-API, non-static routes to index.html so React Router
 *   can handle client-side routing. This enables React to manage routes like:
 *   - /shop/home
 *   - /admin/overview
 *   - /delivery/dashboard
 *   - /error/404, /error/403, etc.
 *
 * Priority Order in Spring:
 *   1. /api/** routes       → handled by dedicated API controllers (ReactApiController, etc.)
 *   2. /static/**, /public/ → handled by Spring ResourceHandler (static resources)
 *   3. All other requests   → served by this catch-all controller → index.html
 *
 * React Router then handles the path at runtime:
 *   - Matches authenticated user routes (/shop/*, /admin/*, etc.)
 *   - Shows NotFoundPage for unmatched paths
 *   - Shows error pages for /error/404, /error/403, /error/500, etc.
 *
 * Note: This only executes if no other handler matched the request.
 *       Static files (CSS, JS, etc.) are served directly without hitting this controller.
 */
@Controller
public class SpaRouteController {

    /**
     * Catch-all route for SPA — serves index.html for all non-API paths.
     *
     * Spring will not reach here for:
     *   - /api/**        (Spring Security forwards to API controllers)
     *   - /static/**     (Spring ResourceHandler intercepts)
     *   - /css/**, /js/, /media/ (static resources)
     *
     * All other paths fall through to this catch-all and load the React app.
     * React Router then determines which component to render based on the URL.
     *
     * @return "forward:/index.html" → Request forwarded internally to static index.html
     */
    @GetMapping({
        "/",
        "/shop/**",
        "/vendor/**",
        "/admin/**",
        "/delivery/**",
        "/auth/**",
        "/oauth2/**",
        "/error/**",
        "/**"
    })
    public String catchAll() {
        // Forward to index.html without changing browser URL
        // index.html is in src/main/resources/static/ and served by ResourceHandler
        return "forward:/index.html";
    }
}
