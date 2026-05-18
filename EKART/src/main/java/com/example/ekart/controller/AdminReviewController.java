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
        List<Review> filtered   = applyFilters(allReviews, filter, search);
        filtered.sort(this::compareByCreatedAtDesc);

        populateStarStats(map, allReviews);
        map.put("reviews",            filtered);
        map.put("totalReviews",       allReviews.size());
        map.put("filteredCount",      filtered.size());
        map.put("activeFilter",       filter);
        map.put("searchQuery",        search);
        map.put("productReviewStats", buildProductStats(allReviews));

        return "admin-review-managment.html";
    }

    /** Apply rating-filter then keyword search to produce the display list. */
    private List<Review> applyFilters(List<Review> all, String filter, String search) {
        List<Review> result = new ArrayList<>(all);
        if (!filter.equals("all")) {
            try {
                int starFilter = Integer.parseInt(filter);
                result = result.stream().filter(r -> r.getRating() == starFilter).toList();
            } catch (NumberFormatException ignored) { /* non-numeric value — keep all */ }
        }
        if (!search.isBlank()) {
            String q = search.toLowerCase();
            result = result.stream()
                    .filter(r -> matchesSearch(r, q))
                    .toList();
        }
        return result;
    }

    private boolean matchesSearch(Review r, String q) {
        return (r.getCustomerName() != null && r.getCustomerName().toLowerCase().contains(q))
            || (r.getComment()      != null && r.getComment().toLowerCase().contains(q))
            || (r.getProduct()      != null && r.getProduct().getName().toLowerCase().contains(q));
    }

    private int compareByCreatedAtDesc(Review a, Review b) {
        if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
        if (a.getCreatedAt() == null) return 1;
        if (b.getCreatedAt() == null) return -1;
        return b.getCreatedAt().compareTo(a.getCreatedAt());
    }

    /** Populate the per-star count and percentage model attributes. */
    private void populateStarStats(ModelMap map, List<Review> all) {
        long five  = all.stream().filter(r -> r.getRating() == 5).count();
        long four  = all.stream().filter(r -> r.getRating() == 4).count();
        long three = all.stream().filter(r -> r.getRating() == 3).count();
        long two   = all.stream().filter(r -> r.getRating() == 2).count();
        long one   = all.stream().filter(r -> r.getRating() == 1).count();
        int  total = all.size();

        OptionalDouble avg = all.stream().mapToInt(Review::getRating).average();
        double avgRating   = avg.isPresent() ? Math.round(avg.getAsDouble() * 10.0) / 10.0 : 0.0;

        map.put("fiveStars",  (int) five);
        map.put("fourStars",  (int) four);
        map.put("threeStars", (int) three);
        map.put("twoStars",   (int) two);
        map.put("oneStar",    (int) one);
        map.put("avgRating",  avgRating);
        map.put("pct5", total > 0 ? (int)(five  * 100 / total) : 0);
        map.put("pct4", total > 0 ? (int)(four  * 100 / total) : 0);
        map.put("pct3", total > 0 ? (int)(three * 100 / total) : 0);
        map.put("pct2", total > 0 ? (int)(two   * 100 / total) : 0);
        map.put("pct1", total > 0 ? (int)(one   * 100 / total) : 0);
    }

    /** Build per-product review count + average, sorted by review count desc. */
    private List<Map<String, Object>> buildProductStats(List<Review> all) {
        Map<String, long[]> productStats = new LinkedHashMap<>();
        for (Review r : all) {
            if (r.getProduct() == null) continue;
            String pName = r.getProduct().getName();
            productStats.computeIfAbsent(pName, k -> new long[]{0, 0});
            productStats.get(pName)[0]++;
            productStats.get(pName)[1] += r.getRating();
        }
        List<Map<String, Object>> stats = new ArrayList<>();
        for (Map.Entry<String, long[]> entry : productStats.entrySet()) {
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("productName", entry.getKey());
            stat.put(K_COUNT, entry.getValue()[0]);
            double pAvg = entry.getValue()[0] > 0
                    ? Math.round((entry.getValue()[1] / (double) entry.getValue()[0]) * 10.0) / 10.0
                    : 0.0;
            stat.put("avgRating", pAvg);
            stats.add(stat);
        }
        stats.sort((a, b) -> Long.compare((long) b.get(K_COUNT), (long) a.get(K_COUNT)));
        return stats;
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