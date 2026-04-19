package com.example.ekart.service;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Wishlist;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.WishlistRepository;

import jakarta.servlet.http.HttpSession;

@Service
@Transactional
public class WishlistService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final WishlistRepository wishlistRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    public WishlistService(
            WishlistRepository wishlistRepository,
            CustomerRepository customerRepository,
            ProductRepository productRepository) {
        this.wishlistRepository = wishlistRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
    }

    
    
    
    
    /**
     * Toggle a product in the customer's wishlist.
     * If it exists, remove it. If it doesn't exist, add it.
     * @return true if item was added, false if it was removed
     */
    @Transactional
    public ToggleResult toggleWishlistItem(int productId, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return new ToggleResult(false, false, "Not logged in");
        }
        
        // Re-fetch customer from DB
        customer = customerRepository.findById(customer.getId()).orElse(null);
        if (customer == null) {
            return new ToggleResult(false, false, "Customer not found");
        }
        
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return new ToggleResult(false, false, "Product not found");
        }
        
        // Check if already in wishlist
        if (wishlistRepository.existsByCustomerAndProduct(customer, product)) {
            // Remove from wishlist
            wishlistRepository.deleteByCustomerAndProduct(customer, product);
            return new ToggleResult(true, false, "Removed from wishlist");
        } else {
            // Add to wishlist
            Wishlist wishlist = new Wishlist();
            wishlist.setCustomer(customer);
            wishlist.setProduct(product);
            wishlist.setAddedAt(LocalDateTime.now());
            wishlistRepository.save(wishlist);
            return new ToggleResult(true, true, "Added to wishlist");
        }
    }
    
    /**
     * Get all products in the customer's wishlist
     */
    public List<Product> getWishlistProducts(HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return List.of();
        }
        
        customer = customerRepository.findById(customer.getId()).orElse(null);
        if (customer == null) {
            return List.of();
        }
        
        List<Wishlist> wishlistItems = wishlistRepository.findByCustomer(customer);
        return wishlistItems.stream()
                .map(Wishlist::getProduct)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all wishlist items with full details
     */
    public List<Wishlist> getWishlistItems(HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return List.of();
        }
        
        customer = customerRepository.findById(customer.getId()).orElse(null);
        if (customer == null) {
            return List.of();
        }
        
        return wishlistRepository.findByCustomer(customer);
    }
    
    /**
     * Check if a product is in the customer's wishlist
     */
    public boolean isInWishlist(int productId, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return false;
        }
        
        customer = customerRepository.findById(customer.getId()).orElse(null);
        if (customer == null) {
            return false;
        }
        
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return false;
        }
        
        return wishlistRepository.existsByCustomerAndProduct(customer, product);
    }
    
    /**
     * Get a set of product IDs in the customer's wishlist (for efficient lookup in views)
     */
    public Set<Integer> getWishlistProductIds(HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return Set.of();
        }
        
        customer = customerRepository.findById(customer.getId()).orElse(null);
        if (customer == null) {
            return Set.of();
        }
        
        return wishlistRepository.findByCustomer(customer).stream()
                .map(w -> w.getProduct().getId())
                .collect(Collectors.toSet());
    }
    
    /**
     * Remove a product from wishlist
     */
    @Transactional
    public boolean removeFromWishlist(int productId, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return false;
        }
        
        customer = customerRepository.findById(customer.getId()).orElse(null);
        if (customer == null) {
            return false;
        }
        
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return false;
        }
        
        if (wishlistRepository.existsByCustomerAndProduct(customer, product)) {
            wishlistRepository.deleteByCustomerAndProduct(customer, product);
            return true;
        }
        return false;
    }
    
    /**
     * Get wishlist count for a customer
     */
    public long getWishlistCount(HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return 0;
        }
        
        customer = customerRepository.findById(customer.getId()).orElse(null);
        if (customer == null) {
            return 0;
        }
        
        return wishlistRepository.countByCustomer(customer);
    }
    
    // Result class for toggle operation
    public static class ToggleResult {
        private final boolean success;
        private final boolean added; // true if added, false if removed
        private final String message;
        
        public ToggleResult(boolean success, boolean added, String message) {
            this.success = success;
            this.added = added;
            this.message = message;
        }
        
        public boolean isSuccess() { return success; }
        public boolean isAdded() { return added; }
        public String getMessage() { return message; }
    }
}


