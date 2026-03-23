
/**
 * File: AdminReviewController.java
 * Description: Handles admin review management, including listing, filtering, deleting, and bulk operations on product reviews.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import com.example.ekart.dto.Review;
import com.example.ekart.repository.ReviewRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Controller
public class AdminReviewController {

    @Autowired
    private ReviewRepository reviewRepository;

    /**
     * Displays the admin review management page with stats, filtering, and star distribution.
     * URL: /admin/reviews
     * Access: Admin only
     * @param filter Filter by star rating (optional)
     * @param search Search query for customer name, comment, or product (optional)
     * @param session HTTP session for admin authentication
     * @param map ModelMap for passing data to the view
     * @return Name of the Thymeleaf template for admin review management
     */
    @GetMapping("/admin/reviews")
    public String adminReviews(
            @RequestParam(required = false, defaultValue = "all") String filter,
            @RequestParam(required = false, defaultValue = "") String search,
            HttpSession session,
            ModelMap map) {

        // Check admin authentication
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Please login as admin");
            return "redirect:/admin/login";
        }

        // Fetch all reviews from repository
        List<Review> allReviews = reviewRepository.findAll();

        // Calculate star distribution for reviews
        long fiveStars  = allReviews.stream().filter(r -> r.getRating() == 5).count();
        long fourStars  = allReviews.stream().filter(r -> r.getRating() == 4).count();
        long threeStars = allReviews.stream().filter(r -> r.getRating() == 3).count();
        long twoStars   = allReviews.stream().filter(r -> r.getRating() == 2).count();
        long oneStar    = allReviews.stream().filter(r -> r.getRating() == 1).count();

        // Calculate average rating
        OptionalDouble avg = allReviews.stream().mapToInt(Review::getRating).average();
        double avgRating = avg.isPresent() ? Math.round(avg.getAsDouble() * 10.0) / 10.0 : 0.0;

        // Filter reviews by star rating if filter is set
        List<Review> filtered = new ArrayList<>(allReviews);

        if (!filter.equals("all")) {
            try {
                int starFilter = Integer.parseInt(filter);
                filtered = filtered.stream()
                        .filter(r -> r.getRating() == starFilter)
                        .collect(Collectors.toList());
            } catch (NumberFormatException ignored) {}
        }

        // Search reviews by customer name, comment, or product name
        if (!search.isBlank()) {
            String q = search.toLowerCase();
            filtered = filtered.stream()
                    .filter(r -> (r.getCustomerName() != null && r.getCustomerName().toLowerCase().contains(q))
                              || (r.getComment() != null && r.getComment().toLowerCase().contains(q))
                              || (r.getProduct() != null && r.getProduct().getName().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }

        // Sort reviews by newest first
        filtered.sort((a, b) -> {
            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        // Calculate product-wise review stats (count and average rating)
        // Map: productName → {count, avgRating}
        Map<String, long[]> productStats = new LinkedHashMap<>();
        for (Review r : allReviews) {
            if (r.getProduct() == null) continue;
            String pName = r.getProduct().getName();
            productStats.computeIfAbsent(pName, k -> new long[]{0, 0});
            productStats.get(pName)[0]++;                    // count
            productStats.get(pName)[1] += r.getRating();     // sum of ratings
        }
        // Convert product stats to list of maps for Thymeleaf
        List<Map<String, Object>> productReviewStats = new ArrayList<>();
        for (Map.Entry<String, long[]> entry : productStats.entrySet()) {
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("productName", entry.getKey());
            stat.put("count", entry.getValue()[0]);
            double pAvg = entry.getValue()[0] > 0
                    ? Math.round((entry.getValue()[1] / (double) entry.getValue()[0]) * 10.0) / 10.0
                    : 0.0;
            stat.put("avgRating", pAvg);
            productReviewStats.add(stat);
        }
        // Sort products by most reviewed
        productReviewStats.sort((a, b) -> Long.compare((long) b.get("count"), (long) a.get("count")));

        // Calculate percent widths for star distribution bar
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
     * Deletes a review by ID and redirects back to the admin review page.
     * URL: /admin/delete-review/{id}
     * Access: Admin only
     * @param id Review ID to delete
     * @param session HTTP session for admin authentication
     * @return Redirect to admin review management page
     */
    @GetMapping("/admin/delete-review/{id}")
    public String deleteReview(@PathVariable int id, HttpSession session) {
        // Check admin authentication
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Please login as admin");
            return "redirect:/admin/login";
        }
        try {
            // Attempt to delete review by ID
            reviewRepository.deleteById(id);
            session.setAttribute("success", "Review deleted successfully");
        } catch (Exception e) {
            // Handle deletion failure
            session.setAttribute("failure", "Could not delete review: " + e.getMessage());
        }
        return "redirect:/admin/reviews";
    }

    /**
     * Deletes all reviews for a specific product by product name (bulk delete).
     * URL: /admin/bulk-delete-reviews
     * Access: Admin only
     * @param productName Name of the product to delete reviews for
     * @param session HTTP session for admin authentication
     * @return Redirect to admin review management page
     */
    @PostMapping("/admin/bulk-delete-reviews")
    public String bulkDeleteReviews(@RequestParam String productName, HttpSession session) {
        // Check admin authentication
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Please login as admin");
            return "redirect:/admin/login";
        }
        try {
            // Find all reviews for the given product name
            List<Review> toDelete = reviewRepository.findAll().stream()
                    .filter(r -> r.getProduct() != null
                              && r.getProduct().getName().equalsIgnoreCase(productName))
                    .collect(Collectors.toList());
            // Delete all matching reviews
            reviewRepository.deleteAll(toDelete);
            session.setAttribute("success", "Deleted " + toDelete.size() + " reviews for \"" + productName + "\"");
        } catch (Exception e) {
            // Handle bulk deletion failure
            session.setAttribute("failure", "Bulk delete failed: " + e.getMessage());
        }
        return "redirect:/admin/reviews";
    }
}