package com.example.ekart.controller;

import com.example.ekart.dto.Review;
import com.example.ekart.repository.ReviewRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.OptionalDouble;

/**
 * ✅ FIX A — Fixes BUG A + BUG B + BUG G
 *
 * BUG A: admin-review-managment.html nav had <a href="/admin/reviews"> but no controller existed.
 * BUG B: Delete button used /admin/delete-review/{id} but no controller existed.
 * BUG G: admin-review-managment.html was never returned by any controller — page was unreachable.
 *
 * HOW TO USE:
 *   Place this file in: src/main/java/com/example/ekart/controller/AdminReviewController.java
 *   No other file needs to change.
 */
@Controller
public class AdminReviewController {

    @Autowired
    private ReviewRepository reviewRepository;

    /**
     * GET /admin/reviews
     * Loads the admin-review-managment.html page with all review stats.
     * Matches the model attributes expected by the template:
     *   reviews, totalReviews, fiveStars, fourStars, threeStars, twoStars, oneStar, avgRating
     */
    @GetMapping("/admin/reviews")
    public String adminReviews(HttpSession session, ModelMap map) {
        // Auth guard
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Please login as admin");
            return "redirect:/admin/login";
        }

        List<Review> reviews = reviewRepository.findAll();

        // Count by star rating
        long fiveStars   = reviews.stream().filter(r -> r.getRating() == 5).count();
        long fourStars   = reviews.stream().filter(r -> r.getRating() == 4).count();
        long threeStars  = reviews.stream().filter(r -> r.getRating() == 3).count();
        long twoStars    = reviews.stream().filter(r -> r.getRating() == 2).count();
        long oneStar     = reviews.stream().filter(r -> r.getRating() == 1).count();

        OptionalDouble avg = reviews.stream().mapToInt(Review::getRating).average();
        double avgRating = avg.isPresent() ? Math.round(avg.getAsDouble() * 10.0) / 10.0 : 0.0;

        map.put("reviews",      reviews);
        map.put("totalReviews", reviews.size());
        map.put("fiveStars",    (int) fiveStars);
        map.put("fourStars",    (int) fourStars);
        map.put("threeStars",   (int) threeStars);
        map.put("twoStars",     (int) twoStars);
        map.put("oneStar",      (int) oneStar);
        map.put("avgRating",    avgRating);

        return "admin-review-managment.html";
    }

    /**
     * GET /admin/delete-review/{id}
     * Deletes a review by ID and redirects back to the reviews page.
     */
    @GetMapping("/admin/delete-review/{id}")
    public String deleteReview(@PathVariable int id, HttpSession session) {
        // Auth guard
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Please login as admin");
            return "redirect:/admin/login";
        }

        try {
            reviewRepository.deleteById(id);
            session.setAttribute("success", "Review deleted successfully");
        } catch (Exception e) {
            session.setAttribute("failure", "Could not delete review: " + e.getMessage());
        }

        return "redirect:/admin/reviews";
    }
}