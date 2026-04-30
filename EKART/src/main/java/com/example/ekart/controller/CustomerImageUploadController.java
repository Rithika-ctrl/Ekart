package com.example.ekart.controller;

import com.example.ekart.dto.*;
import com.example.ekart.helper.CloudinaryHelper;
import com.example.ekart.repository.*;
import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Handles all customer-facing image upload scenarios:
 *
 *  1. Review images   — POST /customer/review/{reviewId}/upload-image
 *                     — GET  /customer/review/{reviewId}/images           (AJAX fetch)
 *                     — POST /customer/review/{reviewId}/delete-image/{imageId}
 *
 *  2. Refund evidence — POST /customer/refund/{refundId}/upload-image
 *                     — GET  /customer/refund/{refundId}/images           (AJAX fetch)
 *                     — POST /customer/refund/{refundId}/delete-image/{imageId}
 *
 *  3. Product page    — POST /customer/product/{productId}/upload-image
 *                       (Attaches an image to the customer's latest review for that product)
 *
 *  4. Profile area    — See CustomerProfileController for /customer/upload-profile-image
 *                       (already implemented — this controller does NOT duplicate it)
 *
 * All endpoints require an active customer session.
 * Cloudinary is used for storage (same helper as profile photos).
 * Max 5 images per review or refund request.
 */
@Controller
public class CustomerImageUploadController {

    // ── S1192 String constants ──
    private static final String K_COUNT                             = "count";
    private static final String K_FAILURE                           = "failure";
    private static final String K_IMAGES                            = "images";
    private static final String K_MAXIMUM                           = "Maximum ";
    private static final String K_MESSAGE                           = "message";
    private static final String K_REDIRECT_CUSTOMER_LOGIN           = "redirect:/customer/login";
    private static final String K_REDIRECT_PRODUCT                  = "redirect:/product/";
    private static final String K_REDIRECT_VIEW_ORDERS              = "redirect:/view-orders";
    private static final String K_REDIRECT_VIEW_PRODUCTS            = "redirect:/view-products";
    private static final String K_SUCCESS                           = "success";
    private static final String K_IMAGE_URL                         = "imageUrl";

    private static final int MAX_IMAGES_PER_ENTITY = 5;

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CloudinaryHelper cloudinaryHelper;
    private final ReviewRepository reviewRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final RefundRepository refundRepository;
    private final RefundImageRepository refundImageRepository;

    public CustomerImageUploadController(
            CloudinaryHelper cloudinaryHelper,
            ReviewRepository reviewRepository,
            ReviewImageRepository reviewImageRepository,
            RefundRepository refundRepository,
            RefundImageRepository refundImageRepository) {
        this.cloudinaryHelper = cloudinaryHelper;
        this.reviewRepository = reviewRepository;
        this.reviewImageRepository = reviewImageRepository;
        this.refundRepository = refundRepository;
        this.refundImageRepository = refundImageRepository;
    }







    // @Autowired
    // private ProductRepository productRepository; // unused

    // @Autowired
    // private CustomerRepository customerRepository; // unused

    // ══════════════════════════════════════════════════════════
    //  1. REVIEW IMAGE UPLOADS
    // ══════════════════════════════════════════════════════════

    /**
     * POST /customer/review/{reviewId}/upload-image
     * Accepts up to 5 images per review (enforced). Uploaded via multipart form.
     * Redirects back to view-products with a success/failure flash message.
     */
    @PostMapping("/customer/review/{reviewId}/upload-image")
    @Transactional
    public String uploadReviewImage(
            @PathVariable int reviewId,
            @RequestParam(K_IMAGES) List<MultipartFile> files,
            HttpSession session) {

        Customer customer = requireCustomer(session);
        if (customer == null) return K_REDIRECT_CUSTOMER_LOGIN;

        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null) {
            session.setAttribute(K_FAILURE, "Review not found");
            return K_REDIRECT_VIEW_PRODUCTS;
        }

        // Ownership check — only the author can attach images
        if (review.getCustomer() == null || review.getCustomer().getId() != customer.getId()) {
            session.setAttribute(K_FAILURE, "You can only add images to your own reviews");
            return K_REDIRECT_VIEW_PRODUCTS;
        }

        long existing = reviewImageRepository.countByReviewId(reviewId);
        int slots = (int) (MAX_IMAGES_PER_ENTITY - existing);

        if (slots <= 0) {
            session.setAttribute(K_FAILURE, K_MAXIMUM + MAX_IMAGES_PER_ENTITY + " images allowed per review");
            return K_REDIRECT_VIEW_PRODUCTS;
        }

        int uploaded = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < Math.min(files.size(), slots); i++) {
            MultipartFile file = files.get(i);
            if (file == null || file.isEmpty()) continue;

            if (!isValidImage(file)) {
                errors.add(file.getOriginalFilename() + " is not a valid image (JPG/PNG/WEBP only, max 5MB)");
                continue;
            }

            try {
                String url = cloudinaryHelper.saveToCloudinary(file);
                ReviewImage img = new ReviewImage();
                img.setReview(review);
                img.setImageUrl(url);
                reviewImageRepository.save(img);
                uploaded++;
            } catch (Exception e) {
                errors.add("Failed to upload " + file.getOriginalFilename() + ": " + e.getMessage());
            }
        }

        if (uploaded > 0) {
            session.setAttribute(K_SUCCESS, uploaded + " image(s) added to your review");
        }
        if (!errors.isEmpty()) {
            session.setAttribute(K_FAILURE, String.join("; ", errors));
        }

        return K_REDIRECT_PRODUCT + review.getProduct().getId();
    }

    /**
     * GET /customer/review/{reviewId}/images   (AJAX / JSON)
     * Returns all image URLs for a review — used by the product detail page carousel.
     */
    @GetMapping("/customer/review/{reviewId}/images")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getReviewImages(
            @PathVariable int reviewId,
            HttpSession session) {

        Map<String, Object> res = new HashMap<>();

        List<ReviewImage> images = reviewImageRepository.findByReviewId(reviewId);
        List<Map<String, Object>> data = new ArrayList<>();
        for (ReviewImage img : images) {
            Map<String, Object> m = new HashMap<>();
            m.put("id",       img.getId());
            m.put(K_IMAGE_URL, img.getImageUrl());
            data.add(m);
        }

        res.put(K_SUCCESS, true);
        res.put(K_IMAGES,  data);
        res.put(K_COUNT,   data.size());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /customer/review/{reviewId}/delete-image/{imageId}
     * Customer removes one of their own review images.
     */
    @PostMapping("/customer/review/{reviewId}/delete-image/{imageId}")
    @Transactional
    public String deleteReviewImage(
            @PathVariable int reviewId,
            @PathVariable int imageId,
            HttpSession session) {

        Customer customer = requireCustomer(session);
        if (customer == null) return K_REDIRECT_CUSTOMER_LOGIN;

        ReviewImage img = reviewImageRepository.findById(imageId).orElse(null);
        if (img == null || img.getReview().getId() != reviewId) {
            session.setAttribute(K_FAILURE, "Image not found");
            return K_REDIRECT_VIEW_PRODUCTS;
        }

        // Ownership check
        if (img.getReview().getCustomer() == null || img.getReview().getCustomer().getId() != customer.getId()) {
            session.setAttribute(K_FAILURE, "You can only delete your own review images");
            return K_REDIRECT_VIEW_PRODUCTS;
        }

        reviewImageRepository.delete(img);
        session.setAttribute(K_SUCCESS, "Image removed from review");
        return K_REDIRECT_PRODUCT + img.getReview().getProduct().getId();
    }

    // ══════════════════════════════════════════════════════════
    //  2. REFUND / ISSUE REPORT — EVIDENCE IMAGE UPLOADS
    // ══════════════════════════════════════════════════════════

    /**
     * GET /customer/refund/report/{orderId}
     * Loads the refund/issue report form page where customer writes reason
     * and optionally uploads evidence images.
     */
    @GetMapping("/customer/refund/report/{orderId}")
    public String loadRefundReportPage(
            @PathVariable int orderId,
            HttpSession session,
            ModelMap map) {

        Customer customer = requireCustomer(session);
        if (customer == null) return K_REDIRECT_CUSTOMER_LOGIN;

        map.put("orderId", orderId);
        return "customer-refund-report.html";
    }

    /**
     * POST /customer/refund/{refundId}/upload-image
     * Upload evidence images to an existing refund request.
     * Refund must already exist (created via existing refund flow).
     */
    @PostMapping("/customer/refund/{refundId}/upload-image")
    @Transactional
    public String uploadRefundImage(
            @PathVariable int refundId,
            @RequestParam(K_IMAGES) List<MultipartFile> files,
            HttpSession session) {

        Customer customer = requireCustomer(session);
        if (customer == null) return K_REDIRECT_CUSTOMER_LOGIN;

        Refund refund = refundRepository.findById(refundId).orElse(null);
        if (refund == null) {
            session.setAttribute(K_FAILURE, "Refund request not found");
            return K_REDIRECT_VIEW_ORDERS;
        }

        // Ownership check
        if (refund.getCustomer().getId() != customer.getId()) {
            session.setAttribute(K_FAILURE, "Access denied");
            return K_REDIRECT_VIEW_ORDERS;
        }

        long existing = refundImageRepository.countByRefundId(refundId);
        int slots = (int) (MAX_IMAGES_PER_ENTITY - existing);

        if (slots <= 0) {
            session.setAttribute(K_FAILURE, K_MAXIMUM + MAX_IMAGES_PER_ENTITY + " evidence images allowed per request");
            return K_REDIRECT_VIEW_ORDERS;
        }

        int uploaded = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < Math.min(files.size(), slots); i++) {
            MultipartFile file = files.get(i);
            if (file == null || file.isEmpty()) continue;

            if (!isValidImage(file)) {
                errors.add(file.getOriginalFilename() + " is not a valid image (JPG/PNG/WEBP only, max 5MB)");
                continue;
            }

            try {
                String url = cloudinaryHelper.saveToCloudinary(file);
                RefundImage img = new RefundImage();
                img.setRefund(refund);
                img.setImageUrl(url);
                refundImageRepository.save(img);
                uploaded++;
            } catch (Exception e) {
                errors.add("Failed to upload " + file.getOriginalFilename() + ": " + e.getMessage());
            }
        }

        if (uploaded > 0) {
            session.setAttribute(K_SUCCESS, uploaded + " evidence image(s) uploaded to your refund request");
        }
        if (!errors.isEmpty()) {
            session.setAttribute(K_FAILURE, String.join("; ", errors));
        }

        return K_REDIRECT_VIEW_ORDERS;
    }

    /**
     * GET /customer/refund/{refundId}/images   (AJAX / JSON)
     * Returns all evidence images for a refund — used by admin refund page too.
     */
    @GetMapping("/customer/refund/{refundId}/images")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getRefundImages(
            @PathVariable int refundId,
            HttpSession session) {

        Map<String, Object> res = new HashMap<>();

        // Allow both admin and the owning customer to fetch images
        boolean isAdmin    = session.getAttribute("admin") != null;
        Customer customer  = (Customer) session.getAttribute("customer");

        if (!isAdmin && customer == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Login required");
            return ResponseEntity.status(401).body(res);
        }

        Refund refund = refundRepository.findById(refundId).orElse(null);
        if (refund == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Refund not found");
            return ResponseEntity.status(404).body(res);
        }

        // Customer ownership check (admin sees all)
        if (!isAdmin && refund.getCustomer().getId() != customer.getId()) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Access denied");
            return ResponseEntity.status(403).body(res);
        }

        List<RefundImage> images = refundImageRepository.findByRefundId(refundId);
        List<Map<String, Object>> data = new ArrayList<>();
        for (RefundImage img : images) {
            Map<String, Object> m = new HashMap<>();
            m.put("id",       img.getId());
            m.put(K_IMAGE_URL, img.getImageUrl());
            data.add(m);
        }

        res.put(K_SUCCESS, true);
        res.put(K_IMAGES,  data);
        res.put(K_COUNT,   data.size());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /customer/refund/{refundId}/delete-image/{imageId}
     * Customer removes one of their own refund evidence images.
     */
    @PostMapping("/customer/refund/{refundId}/delete-image/{imageId}")
    @Transactional
    public String deleteRefundImage(
            @PathVariable int refundId,
            @PathVariable int imageId,
            HttpSession session) {

        Customer customer = requireCustomer(session);
        if (customer == null) return K_REDIRECT_CUSTOMER_LOGIN;

        RefundImage img = refundImageRepository.findById(imageId).orElse(null);
        if (img == null || img.getRefund().getId() != refundId) {
            session.setAttribute(K_FAILURE, "Image not found");
            return K_REDIRECT_VIEW_ORDERS;
        }

        if (img.getRefund().getCustomer().getId() != customer.getId()) {
            session.setAttribute(K_FAILURE, "You can only delete your own images");
            return K_REDIRECT_VIEW_ORDERS;
        }

        refundImageRepository.delete(img);
        session.setAttribute(K_SUCCESS, "Evidence image removed");
        return K_REDIRECT_VIEW_ORDERS;
    }

    // ══════════════════════════════════════════════════════════
    //  3. PRODUCT DETAIL PAGE — quick image upload (attaches to review)
    // ══════════════════════════════════════════════════════════

    /**
     * POST /customer/product/{productId}/upload-image
     * Shortcut: upload images directly from the product detail page.
     * Attaches to the customer's most recent review for this product.
     * If no review exists yet, redirects with a prompt to write one first.
     */
    @PostMapping("/customer/product/{productId}/upload-image")
    @Transactional
    public String uploadProductPageImage(
            @PathVariable int productId,
            @RequestParam(K_IMAGES) List<MultipartFile> files,
            HttpSession session) {

        Customer customer = requireCustomer(session);
        if (customer == null) return K_REDIRECT_CUSTOMER_LOGIN;

        // Find the customer's most recent review for this product
        Review latestReview = reviewRepository.findLatestByProductIdAndCustomerId(productId, customer.getId())
            .orElse(null);

        if (latestReview == null) {
            session.setAttribute(K_FAILURE, "Please write a review for this product before uploading images");
            return K_REDIRECT_PRODUCT + productId;
        }

        // Delegate to the same review-upload logic
        long existing = reviewImageRepository.countByReviewId(latestReview.getId());
        int slots = (int) (MAX_IMAGES_PER_ENTITY - existing);

        if (slots <= 0) {
            session.setAttribute(K_FAILURE, K_MAXIMUM + MAX_IMAGES_PER_ENTITY + " images already uploaded for your review");
            return K_REDIRECT_PRODUCT + productId;
        }

        int uploaded = 0;
        for (int i = 0; i < Math.min(files.size(), slots); i++) {
            MultipartFile file = files.get(i);
            if (file == null || file.isEmpty()) continue;
            if (!isValidImage(file)) continue;

            try {
                String url = cloudinaryHelper.saveToCloudinary(file);
                ReviewImage img = new ReviewImage();
                img.setReview(latestReview);
                img.setImageUrl(url);
                reviewImageRepository.save(img);
                uploaded++;
            } catch (Exception e) {
                session.setAttribute(K_FAILURE, "Upload failed: " + e.getMessage());
            }
        }

        if (uploaded > 0) {
            session.setAttribute(K_SUCCESS, uploaded + " image(s) added to your review");
        }

        return K_REDIRECT_PRODUCT + productId;
    }

    // ══════════════════════════════════════════════════════════
    //  ADMIN — view refund evidence (AJAX helper used by admin-refunds page)
    // ══════════════════════════════════════════════════════════

    /**
     * GET /api/admin/refunds/{refundId}/images
     * Admin endpoint to fetch evidence images when reviewing a refund.
     * Returns JSON list of image URLs.
     */
    @GetMapping("/api/admin/refunds/{refundId}/images")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> adminGetRefundImages(
            @PathVariable int refundId,
            HttpSession session) {

        Map<String, Object> res = new HashMap<>();

        if (session.getAttribute("admin") == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Admin login required");
            return ResponseEntity.status(401).body(res);
        }

        List<RefundImage> images = refundImageRepository.findByRefundId(refundId);
        List<Map<String, Object>> data = new ArrayList<>();
        for (RefundImage img : images) {
            Map<String, Object> m = new HashMap<>();
            m.put("id",       img.getId());
            m.put(K_IMAGE_URL, img.getImageUrl());
            data.add(m);
        }

        res.put(K_SUCCESS, true);
        res.put(K_IMAGES,  data);
        res.put(K_COUNT,   data.size());
        return ResponseEntity.ok(res);
    }

    // ══════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════

    /** Pull customer from session or return null */
    private Customer requireCustomer(HttpSession session) {
        Customer c = (Customer) session.getAttribute("customer");
        if (c == null) {
            session.setAttribute(K_FAILURE, "Please login first");
        }
        return c;
    }

    /**
     * Validates file is an image and within 5MB.
     * Accepted types: image/jpeg, image/png, image/webp
     */
    private boolean isValidImage(MultipartFile file) {
        if (file == null || file.isEmpty()) return false;

        String contentType = file.getContentType();
        if (contentType == null) return false;

        boolean validType = contentType.equals("image/jpeg")
                || contentType.equals("image/png")
                || contentType.equals("image/webp");

        boolean validSize = file.getSize() <= 5 * 1024 * 1024; // 5MB

        return validType && validSize;
    }
}