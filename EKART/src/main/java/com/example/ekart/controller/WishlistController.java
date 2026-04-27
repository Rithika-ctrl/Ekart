package com.example.ekart.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Product;
import com.example.ekart.service.WishlistService;
import com.example.ekart.service.WishlistService.ToggleResult;

import jakarta.servlet.http.HttpSession;

@Controller
public class WishlistController {

    // ── S1192 String constants ──
    private static final String K_CUSTOMER                          = "customer";
    private static final String K_MESSAGE                           = "message";
    private static final String K_SUCCESS                           = "success";
    private static final String K_WISHLISTCOUNT                     = "wishlistCount";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final WishlistService wishlistService;

    public WishlistController(
            WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    
    
    // ───────────────────────────────────────────────────────────────────────────
    // REST API ENDPOINTS
    // ───────────────────────────────────────────────────────────────────────────
    
    /**
     * Toggle a product in the wishlist (add if not present, remove if present)
     * POST /api/wishlist/toggle
     */
    @PostMapping("/api/wishlist/toggle")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> toggleWishlist(
            @RequestBody Map<String, Integer> body,
            HttpSession session) {
        
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            return ResponseEntity.status(401).body(Map.of(
                K_SUCCESS, false,
                K_MESSAGE, "Please login to add items to wishlist"
            ));
        }
        
        Integer productId = body.get("productId");
        if (productId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                K_SUCCESS, false,
                K_MESSAGE, "Product ID is required"
            ));
        }
        
        ToggleResult result = wishlistService.toggleWishlistItem(productId, session);
        
        Map<String, Object> response = new HashMap<>();
        response.put(K_SUCCESS, result.isSuccess());
        response.put("added", result.isAdded());
        response.put(K_MESSAGE, result.getMessage());
        response.put(K_WISHLISTCOUNT, wishlistService.getWishlistCount(session));
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get all products in the user's wishlist
     * GET /api/wishlist
     */
    @GetMapping("/api/wishlist")
    @ResponseBody
    public ResponseEntity<Object> getWishlist(HttpSession session) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            return ResponseEntity.status(401).body(Map.of(
                K_SUCCESS, false,
                K_MESSAGE, "Please login to view wishlist"
            ));
        }
        
        List<Product> products = wishlistService.getWishlistProducts(session);
        
        // Map products to a simpler response format
        List<Map<String, Object>> productList = products.stream()
            .map(p -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id", p.getId());
                item.put("name", p.getName());
                item.put("description", p.getDescription());
                item.put("price", p.getPrice());
                item.put("stock", p.getStock());
                item.put("imageLink", p.getImageLink());
                item.put("category", p.getCategory());
                return item;
            })
            .toList();
        
        return ResponseEntity.ok(Map.of(
            K_SUCCESS, true,
            "products", productList,
            "count", productList.size()
        ));
    }
    
    /**
     * Get wishlist product IDs (for checking which items are in wishlist)
     * GET /api/wishlist/ids
     */
    @GetMapping("/api/wishlist/ids")
    @ResponseBody
    public ResponseEntity<Object> getWishlistIds(HttpSession session) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            return ResponseEntity.status(401).body(Map.of(
                K_SUCCESS, false,
                "productIds", Set.of()
            ));
        }
        
        Set<Integer> productIds = wishlistService.getWishlistProductIds(session);
        return ResponseEntity.ok(Map.of(
            K_SUCCESS, true,
            "productIds", productIds
        ));
    }
    
    /**
     * Remove a product from wishlist
     * DELETE /api/wishlist/{productId}
     */
    @DeleteMapping("/api/wishlist/{productId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> removeFromWishlist(
            @PathVariable int productId,
            HttpSession session) {
        
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            return ResponseEntity.status(401).body(Map.of(
                K_SUCCESS, false,
                K_MESSAGE, "Please login"
            ));
        }
        
        boolean removed = wishlistService.removeFromWishlist(productId, session);
        
        return ResponseEntity.ok(Map.of(
            K_SUCCESS, removed,
            K_MESSAGE, removed ? "Removed from wishlist" : "Item not found in wishlist",
            K_WISHLISTCOUNT, wishlistService.getWishlistCount(session)
        ));
    }
    
    // ───────────────────────────────────────────────────────────────────────────
    // PAGE ENDPOINTS
    // ───────────────────────────────────────────────────────────────────────────
    
    /**
     * Wishlist page
     * GET /account/wishlist
     */
    @GetMapping("/account/wishlist")
    public String wishlistPage(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute("failure", "Please login to view your wishlist");
            return "redirect:/customer/login";
        }
        
        List<Product> products = wishlistService.getWishlistProducts(session);
        map.put("products", products);
        map.put(K_WISHLISTCOUNT, products.size());
        
        return "wishlist.html";
    }
}