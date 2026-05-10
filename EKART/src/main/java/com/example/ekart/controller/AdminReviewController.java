package com.example.ekart.controller;

import com.example.ekart.dto.Review;
import com.example.ekart.repository.ReviewRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
public class AdminReviewController {

    // ── S1192 String constants ──
    private static final String K_ADMIN                             = "admin";
    private static final String K_COUNT                             = "count";
    private static final String K_FAILURE                           = "failure";
    private static final String K_PLEASE_LOGIN_AS_ADMIN             = "Please login as admin";
    private static final String K_REDIRECT_ADMIN_LOGIN              = "redirect:/admin/login";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final ReviewRepository reviewRepository;

    public AdminReviewController(
            ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }



    /**
     * GET /admin/reviews
     * Full review management page with stats, filtering, and star distribution.
     */
    @GetMapping("/admin/reviews")
    public String adminReviews(
            @RequestParam(required = false, defaultValue = "all") String filter,
            @RequestParam(required = false, defaultValue = "") String search,
            HttpSession session,
            ModelMap map) {

        if (session.getAttribute(K_ADMIN) == null) {
            session.setAttribute(K_FAILURE, K_PLEASE_LOGIN_AS_ADMIN);
            return K_REDIRECT_ADMIN_LOGIN;
        }

        List<Review> allReviews = reviewRepository.findAll();

        // ── Star distribution ────────────────────────────────────────
        long fiveStars  = allReviews.stream().filter(r -> r.getRating() == 5).count();
        long fourStars  = allReviews.stream().filter(r -> r.getRating() == 4).count();
        long threeStars = allReviews.stream().filter(r -> r.getRating() == 3).count();
        long twoStars   = allReviews.stream().filter(r -> r.getRating() == 2).count();
        long oneStar    = allReviews.stream().filter(r -> r.getRating() == 1).count();

        OptionalDouble avg = allReviews.stream().mapToInt(Review::getRating).average();
        double avgRating = avg.isPresent() ? Math.round(avg.getAsDouble() * 10.0) / 10.0 : 0.0;

        // ── Filter by rating ─────────────────────────────────────────
        List<Review> filtered = new ArrayList<>(allReviews);

        if (!filter.equals("all")) {
            try {
                int starFilter = Integer.parseInt(filter);
                filtered = filtered.stream()
                        .filter(r -> r.getRating() == starFilter)
                        .toList();
            } catch (NumberFormatException ignored) { /* non-numeric value — use default */ }
        }

        // ── Search by customer name or comment ───────────────────────
        if (!search.isBlank()) {
            String q = search.toLowerCase();
            filtered = filtered.stream()
                    .filter(r -> (r.getCustomerName() != null && r.getCustomerName().toLowerCase().contains(q))
                              || (r.getComment() != null && r.getComment().toLowerCase().contains(q))
                              || (r.getProduct() != null && r.getProduct().getName().toLowerCase().contains(q)))
                    .toList();
        }

        // ── Sort newest first ─────────────────────────────────────────
        filtered.sort((a, b) -> {
            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        // ── Product-wise review stats ─────────────────────────────────
        // Map: productName → {count, avgRating}
        Map<String, long[]> productStats = new LinkedHashMap<>();
        for (Review r : allReviews) {
            if (r.getProduct() == null) continue;
            String pName = r.getProduct().getName();
            productStats.computeIfAbsent(pName, k -> new long[]{0, 0});
            productStats.get(pName)[0]++;                    // count
            productStats.get(pName)[1] += r.getRating();     // sum of ratings
        }
        // Convert to list of maps for Thymeleaf
        List<Map<String, Object>> productReviewStats = new ArrayList<>();
        for (Map.Entry<String, long[]> entry : productStats.entrySet()) {
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("productName", entry.getKey());
            stat.put(K_COUNT, entry.getValue()[0]);
            double pAvg = entry.getValue()[0] > 0
                    ? Math.round((entry.getValue()[1] / (double) entry.getValue()[0]) * 10.0) / 10.0
                    : 0.0;
            stat.put("avgRating", pAvg);
            productReviewStats.add(stat);
        }
        // Sort by most reviewed
        productReviewStats.sort((a, b) -> Long.compare((long) b.get(K_COUNT), (long) a.get(K_COUNT)));

        // ── Percent widths for star distribution bar ─────────────────
        int total = allReviews.size();
        map.put("pct5", total > 0 ? (int)(fiveStars  * 100 / total) : 0);
        map.put("pct4", total > 0 ? (int)(fourStars  * 100 / total) : 0);
        map.put("pct3", total > 0 ? (int)(threeStars * 100 / total) : 0);
        map.put("pct2", total > 0 ? (int)(twoStars   * 100 / total) : 0);
        map.put("pct1", total > 0 ? (int)(oneStar    * 100 / total) : 0);

        map.put("reviews",            filtered);
        map.put("totalReviews",       total);
        map.put("filteredCount",      filtered.size());
        map.put("fiveStars",          (int) fiveStars);
        map.put("fourStars",          (int) fourStars);
        map.put("threeStars",         (int) threeStars);
        map.put("twoStars",           (int) twoStars);
        map.put("oneStar",            (int) oneStar);
        map.put("avgRating",          avgRating);
        map.put("activeFilter",       filter);
        map.put("searchQuery",        search);
        map.put("productReviewStats", productReviewStats);

        return "admin-review-managment.html";
    }

    /**
     * GET /admin/delete-review/{id}
     * Deletes a review and redirects back.
     */
    @GetMapping("/admin/delete-review/{id}")
    public String deleteReview(@PathVariable int id, HttpSession session) {
        if (session.getAttribute(K_ADMIN) == null) {
            session.setAttribute(K_FAILURE, K_PLEASE_LOGIN_AS_ADMIN);
            return K_REDIRECT_ADMIN_LOGIN;
        }
        try {
            reviewRepository.deleteById(id);
            session.setAttribute("success", "Review deleted successfully");
        } catch (Exception e) {
            session.setAttribute(K_FAILURE, "Could not delete review: " + e.getMessage());
        }
        return "redirect:/admin/reviews";
    }

    /**
     * POST /admin/bulk-delete-reviews
     * Deletes all reviews for a specific product by product name.
     */
    @PostMapping("/admin/bulk-delete-reviews")
    public String bulkDeleteReviews(@RequestParam String productName, HttpSession session) {
        if (session.getAttribute(K_ADMIN) == null) {
            session.setAttribute(K_FAILURE, K_PLEASE_LOGIN_AS_ADMIN);
            return K_REDIRECT_ADMIN_LOGIN;
        }
        try {
            List<Review> toDelete = reviewRepository.findAll().stream()
                    .filter(r -> r.getProduct() != null
                              && r.getProduct().getName().equalsIgnoreCase(productName))
                    .toList();
            reviewRepository.deleteAll(toDelete);
            session.setAttribute("success", "Deleted " + toDelete.size() + " reviews for \"" + productName + "\"");
        } catch (Exception e) {
            session.setAttribute(K_FAILURE, "Bulk delete failed: " + e.getMessage());
        }
        return "redirect:/admin/reviews";
    }
}