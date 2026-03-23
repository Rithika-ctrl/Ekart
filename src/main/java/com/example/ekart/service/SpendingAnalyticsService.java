/**
 * File: SpendingAnalyticsService.java
 * Description: Service computing customer spending analytics and monthly summaries.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.service;

import java.time.LocalDateTime;
import java.time.Month;
import java.time.Year;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.OrderRepository;

import jakarta.servlet.http.HttpSession;

/**
 * Service for customer spending analytics.
 * Provides aggregated spending data by month and category.
 */
@Service
public class SpendingAnalyticsService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    /**
     * Get complete spending summary for the logged-in customer.
     * Only includes DELIVERED orders for accurate spending data.
     */
    public SpendingSummary getSpendingSummary(HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return new SpendingSummary();
        }

        // Re-fetch customer from DB
        customer = customerRepository.findById(customer.getId()).orElse(null);
        if (customer == null) {
            return new SpendingSummary();
        }

        // Get all orders for this customer
        List<Order> allOrders = orderRepository.findByCustomer(customer);

        // Filter only DELIVERED orders for spending calculation
        List<Order> deliveredOrders = allOrders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED)
                .collect(Collectors.toList());

        SpendingSummary summary = new SpendingSummary();

        if (deliveredOrders.isEmpty()) {
            summary.setHasData(false);
            return summary;
        }

        summary.setHasData(true);
        summary.setTotalOrders(deliveredOrders.size());

        // Calculate total spent
        double totalSpent = deliveredOrders.stream()
                .mapToDouble(Order::getAmount)
                .sum();
        summary.setTotalSpent(totalSpent);

        // Calculate monthly spending for current year
        int currentYear = Year.now().getValue();
        Map<String, Double> monthlySpending = calculateMonthlySpending(deliveredOrders, currentYear);
        summary.setMonthlySpending(monthlySpending);

        // Calculate spending by category
        Map<String, Double> categorySpending = calculateCategorySpending(deliveredOrders);
        summary.setCategorySpending(categorySpending);

        // Calculate average order value
        summary.setAverageOrderValue(totalSpent / deliveredOrders.size());

        // Find most purchased category
        if (!categorySpending.isEmpty()) {
            String topCategory = categorySpending.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse("Unknown");
            summary.setTopCategory(topCategory);
        }

        return summary;
    }

    /**
     * Calculate monthly spending for a specific year.
     * Returns a map with month names as keys.
     */
    private Map<String, Double> calculateMonthlySpending(List<Order> orders, int year) {
        // Initialize all months with 0
        Map<String, Double> monthlySpending = new LinkedHashMap<>();
        for (Month month : Month.values()) {
            String monthName = month.name().substring(0, 1) + month.name().substring(1).toLowerCase();
            monthlySpending.put(monthName, 0.0);
        }

        // Aggregate spending by month
        for (Order order : orders) {
            LocalDateTime orderDate = order.getOrderDate();
            if (orderDate != null && orderDate.getYear() == year) {
                String monthName = orderDate.getMonth().name();
                monthName = monthName.substring(0, 1) + monthName.substring(1).toLowerCase();
                monthlySpending.merge(monthName, order.getAmount(), Double::sum);
            }
        }

        return monthlySpending;
    }

    /**
     * Calculate spending by product category.
     */
    private Map<String, Double> calculateCategorySpending(List<Order> orders) {
        Map<String, Double> categorySpending = new HashMap<>();

        for (Order order : orders) {
            for (Item item : order.getItems()) {
                String category = item.getCategory();
                if (category == null || category.trim().isEmpty()) {
                    category = "Uncategorized";
                }
                double itemTotal = item.getPrice() * item.getQuantity();
                categorySpending.merge(category, itemTotal, Double::sum);
            }
        }

        return categorySpending;
    }

    /**
     * DTO for spending summary data.
     */
    public static class SpendingSummary {
        private boolean hasData = false;
        private double totalSpent = 0;
        private int totalOrders = 0;
        private double averageOrderValue = 0;
        private String topCategory = "";
        private Map<String, Double> monthlySpending = new LinkedHashMap<>();
        private Map<String, Double> categorySpending = new HashMap<>();

        // Getters and Setters
        public boolean isHasData() { return hasData; }
        public void setHasData(boolean hasData) { this.hasData = hasData; }

        public double getTotalSpent() { return totalSpent; }
        public void setTotalSpent(double totalSpent) { this.totalSpent = totalSpent; }

        public int getTotalOrders() { return totalOrders; }
        public void setTotalOrders(int totalOrders) { this.totalOrders = totalOrders; }

        public double getAverageOrderValue() { return averageOrderValue; }
        public void setAverageOrderValue(double averageOrderValue) { this.averageOrderValue = averageOrderValue; }

        public String getTopCategory() { return topCategory; }
        public void setTopCategory(String topCategory) { this.topCategory = topCategory; }

        public Map<String, Double> getMonthlySpending() { return monthlySpending; }
        public void setMonthlySpending(Map<String, Double> monthlySpending) { this.monthlySpending = monthlySpending; }

        public Map<String, Double> getCategorySpending() { return categorySpending; }
        public void setCategorySpending(Map<String, Double> categorySpending) { this.categorySpending = categorySpending; }
    }
}
