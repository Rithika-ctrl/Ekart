package com.example.ekart.controller;

import com.example.ekart.dto.*;
import com.example.ekart.helper.JwtUtil;
import com.example.ekart.repository.*;
import com.example.ekart.helper.CloudinaryHelper;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ REST API — Profile & Wishlist
 * Used by Flutter mobile app.
 *
 * All routes require: Authorization: Bearer <token>
 *
 * Place in: src/main/java/com/example/ekart/controller/ProfileWishlistApiController.java
 *
 * Endpoints:
 *   GET  /api/profile               → get profile
 *   PUT  /api/profile/update        → update name/mobile
 *   GET  /api/profile/addresses     → get addresses
 *   POST /api/profile/address/add   → add address
 *
 *   GET  /api/mobile/wishlist        → get wishlist
 *   POST /api/mobile/wishlist/toggle → toggle wishlist item
 *   GET  /api/mobile/wishlist/ids    → get wishlist product IDs
 *
 *   POST /api/reviews/add           → add product review
 */
@RestController
@CrossOrigin(origins = "*")
public class ProfileWishlistApiController {

    @Autowired private CustomerRepository customerRepository;
    @Autowired private ProductRepository  productRepository;
    @Autowired private WishlistRepository wishlistRepository;
    // @Autowired private AddressRepository  addressRepository; // unused
    @Autowired private ReviewRepository   reviewRepository;
    @Autowired private JwtUtil            jwtUtil;
    @Autowired private CloudinaryHelper   cloudinaryHelper;

    // ══════════════════════════════════════════════════════════
    //  PROFILE
    // ══════════════════════════════════════════════════════════

    /** GET /api/profile */
    @GetMapping("/api/profile")
    public ResponseEntity<Map<String, Object>> getProfile(
            @RequestHeader("Authorization") String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        customer = customerRepository.findById(customer.getId()).orElseThrow();

        Map<String, Object> profile = new HashMap<>();
        profile.put("id",           customer.getId());
        profile.put("name",         customer.getName());
        profile.put("email",        customer.getEmail());
        profile.put("mobile",       customer.getMobile());
        profile.put("profileImage", customer.getProfileImage());
        profile.put("provider",     customer.getProvider());
        profile.put("verified",     customer.isVerified());

        // Addresses
        profile.put("addresses", customer.getAddresses().stream().map(a -> {
            Map<String, Object> am = new HashMap<>();
            am.put("id",      a.getId());
            am.put("details", a.getDetails());
            return am;
        }).collect(Collectors.toList()));

        res.put("success", true);
        res.put("profile", profile);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/profile/update */
    @PutMapping("/api/profile/update")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestBody Map<String, Object> body,
            @RequestHeader("Authorization") String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        customer = customerRepository.findById(customer.getId()).orElseThrow();

        if (body.containsKey("name"))   customer.setName((String) body.get("name"));
        if (body.containsKey("mobile")) customer.setMobile(Long.parseLong(body.get("mobile").toString()));

        customerRepository.save(customer);

        res.put("success", true);
        res.put("message", "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /** POST /api/profile/address/add */
    @PostMapping("/api/profile/address/add")
    @Transactional
    public ResponseEntity<Map<String, Object>> addAddress(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        String details = body.get("address");
        if (details == null || details.isBlank()) {
            res.put("success", false);
            res.put("message", "Address cannot be empty");
            return ResponseEntity.badRequest().body(res);
        }

        customer = customerRepository.findById(customer.getId()).orElseThrow();

        Address address = new Address();
        address.setDetails(details);
        address.setCustomer(customer);
        customer.getAddresses().add(address);
        customerRepository.save(customer);

        res.put("success", true);
        res.put("message", "Address added");
        return ResponseEntity.ok(res);
    }

    // ══════════════════════════════════════════════════════════
    //  WISHLIST  (using /api/mobile/ prefix to avoid conflict
    //             with existing /api/wishlist session-based routes)
    // ══════════════════════════════════════════════════════════

    /** GET /api/mobile/wishlist */
    @GetMapping("/api/mobile/wishlist")
    public ResponseEntity<Map<String, Object>> getWishlist(
            @RequestHeader("Authorization") String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        List<Wishlist> wishlist = wishlistRepository.findByCustomer(customer);

        List<Map<String, Object>> items = wishlist.stream().map(w -> {
            Map<String, Object> m = new HashMap<>();
            Product p = w.getProduct();
            m.put("wishlistId",  w.getId());
            m.put("addedAt",     w.getAddedAt() != null ? w.getAddedAt().toString() : null);
            m.put("productId",   p.getId());
            m.put("name",        p.getName());
            m.put("price",       p.getPrice());
            m.put("imageLink",   p.getImageLink());
            m.put("category",    p.getCategory());
            m.put("inStock",     p.getStock() > 0);
            return m;
        }).collect(Collectors.toList());

        res.put("success", true);
        res.put("count",   items.size());
        res.put("items",   items);
        return ResponseEntity.ok(res);
    }

    /** POST /api/mobile/wishlist/toggle — { "productId": 5 } */
    @PostMapping("/api/mobile/wishlist/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> toggleWishlist(
            @RequestBody Map<String, Integer> body,
            @RequestHeader("Authorization") String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        Integer productId = body.get("productId");
        if (productId == null) {
            res.put("success", false);
            res.put("message", "productId is required");
            return ResponseEntity.badRequest().body(res);
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put("success", false);
            res.put("message", "Product not found");
            return ResponseEntity.status(404).body(res);
        }

        // Check if already wishlisted
        List<Wishlist> existing = wishlistRepository.findByCustomer(customer).stream()
                .filter(w -> w.getProduct().getId() == productId)
                .collect(Collectors.toList());

        if (!existing.isEmpty()) {
            wishlistRepository.deleteAll(existing);
            res.put("success",     true);
            res.put("wishlisted",  false);
            res.put("message",     "Removed from wishlist");
        } else {
            Wishlist w = new Wishlist();
            w.setCustomer(customer);
            w.setProduct(product);
            w.setAddedAt(LocalDateTime.now());
            wishlistRepository.save(w);
            res.put("success",     true);
            res.put("wishlisted",  true);
            res.put("message",     "Added to wishlist");
        }

        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/profile/upload-image — multipart upload, Authorization: Bearer <token>
     */
    @PostMapping("/api/profile/upload-image")
    @Transactional
    public ResponseEntity<Map<String, Object>> uploadProfileImageApi(
            @RequestParam("profileImage") MultipartFile file,
            @RequestHeader("Authorization") String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        if (file == null || file.isEmpty()) {
            res.put("success", false);
            res.put("message", "No file uploaded");
            return ResponseEntity.badRequest().body(res);
        }

        try {
            String url = cloudinaryHelper.saveToCloudinary(file);
            Customer db = customerRepository.findById(customer.getId()).orElse(null);
            if (db != null) {
                db.setProfileImage(url);
                customerRepository.save(db);
            }
            res.put("success", true);
            res.put("profileImage", url);
            res.put("message", "Profile photo updated");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Upload failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/profile/remove-image — remove profile photo for JWT-authenticated user
     */
    @GetMapping("/api/profile/remove-image")
    @Transactional
    public ResponseEntity<Map<String, Object>> removeProfileImageApi(@RequestHeader("Authorization") String authHeader) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);
        try {
            Customer db = customerRepository.findById(customer.getId()).orElse(null);
            if (db != null) {
                db.setProfileImage(null);
                customerRepository.save(db);
            }
            res.put("success", true);
            res.put("message", "Profile photo removed");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Failed to remove photo: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /** GET /api/mobile/wishlist/ids — returns just the product IDs */
    @GetMapping("/api/mobile/wishlist/ids")
    public ResponseEntity<Map<String, Object>> getWishlistIds(
            @RequestHeader("Authorization") String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        List<Integer> ids = wishlistRepository.findByCustomer(customer).stream()
                .map(w -> w.getProduct().getId())
                .collect(Collectors.toList());

        res.put("success", true);
        res.put("ids",     ids);
        return ResponseEntity.ok(res);
    }

    // ══════════════════════════════════════════════════════════
    //  REVIEWS
    // ══════════════════════════════════════════════════════════

    /** POST /api/reviews/add — { productId, rating, comment } */
    @PostMapping("/api/reviews/add")
    @Transactional
    public ResponseEntity<Map<String, Object>> addReview(
            @RequestBody Map<String, Object> body,
            @RequestHeader("Authorization") String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        int productId = Integer.parseInt(body.get("productId").toString());
        int rating    = Integer.parseInt(body.get("rating").toString());
        String comment = (String) body.get("comment");

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put("success", false);
            res.put("message", "Product not found");
            return ResponseEntity.status(404).body(res);
        }

        if (reviewRepository.existsByProductIdAndCustomerId(productId, customer.getId())) {
            res.put("success", false);
            res.put("message", "You have already reviewed this product");
            return ResponseEntity.badRequest().body(res);
        }

        int safeRating = Math.max(1, Math.min(5, rating));

        Review review = new Review();
        review.setProduct(product);
        review.setRating(safeRating);
        review.setComment(comment);
        review.setCustomer(customer);
        reviewRepository.save(review);

        res.put("success", true);
        res.put("message", "Review added successfully");
        return ResponseEntity.ok(res);
    }

    // ══════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════

    private Customer getCustomer(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) return null;
        return customerRepository.findById(jwtUtil.getCustomerId(token)).orElse(null);
    }

    private ResponseEntity<Map<String, Object>> unauthorized(Map<String, Object> res) {
        res.put("success", false);
        res.put("message", "Unauthorized. Please login.");
        return ResponseEntity.status(401).body(res);
    }
}