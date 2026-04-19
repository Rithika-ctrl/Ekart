package com.example.ekart.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.example.ekart.dto.Customer;
import com.example.ekart.service.SpendingAnalyticsService;
import com.example.ekart.service.SpendingAnalyticsService.SpendingSummary;

import jakarta.servlet.http.HttpSession;

/**
 * Controller for customer spending analytics.
 * Provides both REST API and page endpoints.
 */
@Controller
public class SpendingAnalyticsController {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final SpendingAnalyticsService spendingAnalyticsService;

    public SpendingAnalyticsController(
            SpendingAnalyticsService spendingAnalyticsService) {
        this.spendingAnalyticsService = spendingAnalyticsService;
    }



    // ───────────────────────────────────────────────────────────────────────────
    // REST API ENDPOINT
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/account/spending-summary
     * Returns spending analytics data for the logged-in customer.
     * Strict isolation: Only returns data for the authenticated user.
     */
    @GetMapping("/api/account/spending-summary")
    @ResponseBody
    public ResponseEntity<?> getSpendingSummary(HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "Please login to view spending summary"
            ));
        }

        SpendingSummary summary = spendingAnalyticsService.getSpendingSummary(session);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "hasData", summary.isHasData(),
            "totalSpent", summary.getTotalSpent(),
            "totalOrders", summary.getTotalOrders(),
            "averageOrderValue", summary.getAverageOrderValue(),
            "topCategory", summary.getTopCategory(),
            "monthlySpending", summary.getMonthlySpending(),
            "categorySpending", summary.getCategorySpending()
        ));
    }

    // ───────────────────────────────────────────────────────────────────────────
    // PAGE ENDPOINT
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * GET /account/spending
     * Renders the spending summary page.
     */
    @GetMapping("/account/spending")
    public String spendingPage(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Please login to view spending summary");
            return "redirect:/customer/login";
        }

        SpendingSummary summary = spendingAnalyticsService.getSpendingSummary(session);

        map.put("hasData", summary.isHasData());
        map.put("totalSpent", summary.getTotalSpent());
        map.put("totalOrders", summary.getTotalOrders());
        map.put("averageOrderValue", summary.getAverageOrderValue());
        map.put("topCategory", summary.getTopCategory());

        // Pass maps directly - Thymeleaf will serialize them for JavaScript
        map.put("monthlySpending", summary.getMonthlySpending());
        map.put("categorySpending", summary.getCategorySpending());

        return "spending.html";
    }
}
