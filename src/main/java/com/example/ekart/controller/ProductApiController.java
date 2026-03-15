package com.example.ekart.controller;

import com.example.ekart.dto.Product;
import com.example.ekart.dto.Review;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ REST API — Products
 * Used by Flutter mobile app.
 *
 * Place in: src/main/java/com/example/ekart/controller/ProductApiController.java
 *
 * Endpoints:
 *   GET /api/products              → all approved products
 *   GET /api/products?cat=fashion  → by category
 *   GET /api/products?q=phone      → search
 *   GET /api/products/{id}         → single product detail
 *   GET /api/products/categories   → list of all categories
 *   GET /api/products/{id}/reviews → reviews for a product
 */
@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductApiController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    // ── GET ALL / SEARCH / FILTER ──────────────────────────────────────────
    @GetMapping
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(required = false, defaultValue = "") String cat,
            @RequestParam(required = false, defaultValue = "") String q) {

        Map<String, Object> res = new HashMap<>();
        List<Product> products;

        if (!q.isBlank()) {
            // Search by name, description, category
            Set<Product> found = new LinkedHashSet<>();
            found.addAll(productRepository.findByNameContainingIgnoreCase(q));
            found.addAll(productRepository.findByDescriptionContainingIgnoreCase(q));
            found.addAll(productRepository.findByCategoryContainingIgnoreCase(q));
            products = found.stream()
                    .filter(Product::isApproved)
                    .collect(Collectors.toList());
        } else if (!cat.isBlank()) {
            products = productRepository.findByCategoryAndApprovedTrue(cat);
        } else {
            products = productRepository.findByApprovedTrue();
        }

        res.put("success", true);
        res.put("count", products.size());
        res.put("products", products.stream()
                .map(this::buildProductMap)
                .collect(Collectors.toList()));
        return ResponseEntity.ok(res);
    }

    // ── GET SINGLE PRODUCT ─────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();

        Product product = productRepository.findById(id).orElse(null);
        if (product == null || !product.isApproved()) {
            res.put("success", false);
            res.put("message", "Product not found");
            return ResponseEntity.status(404).body(res);
        }

        // Build full product detail with vendor info and reviews
        Map<String, Object> p = buildProductMap(product);

        // Add vendor info
        if (product.getVendor() != null) {
            Map<String, Object> vendor = new HashMap<>();
            vendor.put("id",   product.getVendor().getId());
            vendor.put("name", product.getVendor().getName());
            p.put("vendor", vendor);
        }

        // Add reviews
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .collect(Collectors.toList());

        double avgRating = reviews.stream()
                .mapToInt(Review::getRating)
                .average().orElse(0.0);

        p.put("reviews", reviews.stream().map(r -> {
            Map<String, Object> rv = new HashMap<>();
            rv.put("id",           r.getId());
            rv.put("rating",       r.getRating());
            rv.put("comment",      r.getComment());
            rv.put("customerName", r.getCustomerName());
            return rv;
        }).collect(Collectors.toList()));

        p.put("avgRating",    Math.round(avgRating * 10.0) / 10.0);
        p.put("reviewCount",  reviews.size());

        // Extra images (comma-separated string → list)
        if (product.getExtraImageLinks() != null && !product.getExtraImageLinks().isBlank()) {
            p.put("extraImages", Arrays.asList(product.getExtraImageLinks().split(",")));
        } else {
            p.put("extraImages", List.of());
        }

        res.put("success", true);
        res.put("product", p);
        return ResponseEntity.ok(res);
    }

    // ── GET ALL CATEGORIES ─────────────────────────────────────────────────
    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        Map<String, Object> res = new HashMap<>();

        List<String> categories = productRepository.findByApprovedTrue().stream()
                .map(Product::getCategory)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        res.put("success",    true);
        res.put("categories", categories);
        return ResponseEntity.ok(res);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────

    private Map<String, Object> buildProductMap(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",          p.getId());
        m.put("name",        p.getName());
        m.put("description", p.getDescription());
        m.put("price",       p.getPrice());
        m.put("category",    p.getCategory());
        m.put("stock",       p.getStock());
        m.put("imageLink",   p.getImageLink());
        m.put("videoLink",   p.getVideoLink());
        m.put("approved",    p.isApproved());
        m.put("inStock",     p.getStock() > 0);
        return m;
    }
}