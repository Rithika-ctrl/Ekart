/**
 * File: RecentlyViewedController.java
 * Description: Controller for managing and exposing recently viewed products.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Product;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ProductRepository;

import jakarta.servlet.http.HttpSession;

/**
 * REST API controller for Recently Viewed Products feature.
 * 
 * Provides endpoints for:
 * - Fetching product details by IDs (for the recently viewed bar)
 * - Syncing recently viewed products to/from the database for logged-in users
 */
@RestController
@RequestMapping("/api/recently-viewed")
public class RecentlyViewedController {

    private static final int MAX_RECENTLY_VIEWED = 10;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CustomerRepository customerRepository;

    /**
     * Get products by IDs (for recently viewed bar rendering).
     * Only returns approved products with basic info needed for display.
     */
    @GetMapping("/products")
    public ResponseEntity<List<ProductSummary>> getProducts(
            @RequestParam(required = false) String ids) {

        if (ids == null || ids.isBlank()) {
            return ResponseEntity.ok(new ArrayList<>());
        }

        try {
            // Parse comma-separated IDs
            List<Integer> productIds = Arrays.stream(ids.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .distinct()
                    .limit(MAX_RECENTLY_VIEWED)
                    .collect(Collectors.toList());

            if (productIds.isEmpty()) {
                return ResponseEntity.ok(new ArrayList<>());
            }

            // Fetch products by IDs
            List<Product> products = productRepository.findAllById(productIds);

            // Convert to summary DTOs (only approved products)
            List<ProductSummary> summaries = products.stream()
                    .filter(Product::isApproved)
                    .map(p -> new ProductSummary(
                            p.getId(),
                            p.getName(),
                            p.getPrice(),
                            p.getImageLink(),
                            p.getStock()))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(summaries);

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(new ArrayList<>());
        }
    }

    /**
     * Sync recently viewed products TO the database (for logged-in customers).
     * Stores the product IDs in customer session/profile.
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncToServer(
            @RequestBody SyncRequest request,
            HttpSession session) {

        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return ResponseEntity.ok(Map.of("synced", false, "message", "Not logged in"));
        }

        try {
            List<Integer> productIds = request.getProductIds();
            if (productIds == null || productIds.isEmpty()) {
                return ResponseEntity.ok(Map.of("synced", true, "count", 0));
            }

            // Remove duplicates and limit to MAX
            Set<Integer> uniqueIds = new LinkedHashSet<>(productIds);
            List<Integer> limitedIds = uniqueIds.stream()
                    .limit(MAX_RECENTLY_VIEWED)
                    .collect(Collectors.toList());

            // Store as comma-separated string in customer profile
            String idsString = limitedIds.stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(","));

            // Update customer with recently viewed
            Optional<Customer> custOpt = customerRepository.findById(customer.getId());
            if (custOpt.isPresent()) {
                Customer cust = custOpt.get();
                cust.setRecentlyViewedProducts(idsString);
                customerRepository.save(cust);
            }

            return ResponseEntity.ok(Map.of("synced", true, "count", limitedIds.size()));

        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("synced", false, "message", e.getMessage()));
        }
    }

    /**
     * Get recently viewed products FROM the database (for logged-in customers).
     * Returns the stored product IDs.
     */
    @GetMapping("/sync")
    public ResponseEntity<Map<String, Object>> loadFromServer(HttpSession session) {

        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return ResponseEntity.ok(Map.of("productIds", new ArrayList<>()));
        }

        try {
            Optional<Customer> custOpt = customerRepository.findById(customer.getId());
            if (custOpt.isPresent()) {
                Customer cust = custOpt.get();
                String idsString = cust.getRecentlyViewedProducts();
                
                if (idsString != null && !idsString.isBlank()) {
                    List<Integer> productIds = Arrays.stream(idsString.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .map(Integer::parseInt)
                            .collect(Collectors.toList());
                    return ResponseEntity.ok(Map.of("productIds", productIds));
                }
            }
            return ResponseEntity.ok(Map.of("productIds", new ArrayList<>()));

        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("productIds", new ArrayList<>()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DTOs
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lightweight product summary for the recently viewed bar.
     */
    public static class ProductSummary {
        private int id;
        private String name;
        private double price;
        private String imageLink;
        private int stock;

        public ProductSummary(int id, String name, double price, String imageLink, int stock) {
            this.id = id;
            this.name = name;
            this.price = price;
            this.imageLink = imageLink;
            this.stock = stock;
        }

        public int getId() { return id; }
        public String getName() { return name; }
        public double getPrice() { return price; }
        public String getImageLink() { return imageLink; }
        public int getStock() { return stock; }
    }

    /**
     * Request body for sync endpoint.
     */
    public static class SyncRequest {
        private List<Integer> productIds;

        public List<Integer> getProductIds() { return productIds; }
        public void setProductIds(List<Integer> productIds) { this.productIds = productIds; }
    }
}
