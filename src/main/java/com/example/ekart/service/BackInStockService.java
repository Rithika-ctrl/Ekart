/**
 * File: BackInStockService.java
 * Description: Service handling back-in-stock subscription lifecycle (subscribe, unsubscribe, notify subscribers).
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.service;

import com.example.ekart.dto.BackInStockSubscription;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Product;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.BackInStockRepository;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class BackInStockService {

    @Autowired private BackInStockRepository backInStockRepository;
    @Autowired private ProductRepository     productRepository;
    @Autowired private CustomerRepository    customerRepository;
    @Autowired private EmailSender           emailSender;

    // ── SUBSCRIBE ──────────────────────────────────────────────────────────
    /**
     * Subscribe the logged-in customer to back-in-stock notifications for a product.
     * @param productId ID of the product to subscribe to
     * @param session HTTP session containing logged-in customer
     * @return Map with keys: success (boolean), message (String), subscribed (boolean)
     */
    public Map<String, Object> subscribe(int productId, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            return Map.of("success", false, "message", "Please log in to subscribe.");
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return Map.of("success", false, "message", "Product not found.");
        }

        // If product is actually in stock, no need to subscribe
        if (product.getStock() > 0) {
            return Map.of("success", false, "message", "Product is already in stock! Add it to your cart.");
        }

        // Fetch fresh customer from DB
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);

        // Check if any existing subscription row exists (notified or not)
        Optional<BackInStockSubscription> existingSub =
                backInStockRepository.findByCustomerAndProduct(customer, product);

        if (existingSub.isPresent()) {
            BackInStockSubscription sub = existingSub.get();
            if (!sub.isNotified()) {
                // Already has an active (unnotified) subscription
                return Map.of(
                    "success",    true,
                    "subscribed", true,
                    "message",    "You are already subscribed. We'll email you when it's back!"
                );
            }
            // Previously notified — reuse the existing row by resetting it
            sub.setNotified(false);
            sub.setNotifiedAt(null);
            sub.setSubscribedAt(java.time.LocalDateTime.now());
            backInStockRepository.save(sub);
            return Map.of(
                "success",    true,
                "subscribed", true,
                "message",    "Done! We'll email you at " + customer.getEmail() + " when it's back in stock."
            );
        }

        // No existing row — fresh subscription
        // Create and persist new subscription
        BackInStockSubscription sub = new BackInStockSubscription(customer, product);
        backInStockRepository.save(sub);

        return Map.of(
            "success",    true,
            "subscribed", true,
            "message",    "Done! We'll email you at " + customer.getEmail() + " when it's back in stock."
        );
    }

    // ── UNSUBSCRIBE ────────────────────────────────────────────────────────
    /**
     * Unsubscribe the logged-in customer from back-in-stock notifications for a product.
     * @param productId ID of the product to unsubscribe from
     * @param session HTTP session containing logged-in customer
     * @return Map with keys: success (boolean), message (String), subscribed (boolean)
     */
    public Map<String, Object> unsubscribe(int productId, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            return Map.of("success", false, "message", "Not logged in.");
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);
        Product product   = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return Map.of("success", false, "message", "Product not found.");
        }

        Optional<BackInStockSubscription> sub =
            backInStockRepository.findByCustomerAndProduct(customer, product);
        // If subscription exists, delete it
        sub.ifPresent(backInStockRepository::delete);

        return Map.of(
            "success",    true,
            "subscribed", false,
            "message",    "Unsubscribed from back-in-stock notifications."
        );
    }

    // ── CHECK STATUS ───────────────────────────────────────────────────────
    /**
     * Check whether the logged-in customer currently has a pending (unnotified) subscription.
     * @param productId ID of the product to check
     * @param session HTTP session containing logged-in customer
     * @return true if a pending subscription exists, false otherwise
     */
    public boolean isSubscribed(int productId, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) return false;

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(null);
        if (customer == null) return false;

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return false;

        // Check repository for pending (notified=false) subscription
        return backInStockRepository.existsByCustomerAndProductAndNotifiedFalse(customer, product);
    }

    // ── NOTIFY ALL SUBSCRIBERS (called when stock is restored) ─────────────
    /**
     * Notify all pending subscribers for a product when it becomes available.
     * @param product Product entity which became available
     * This method sends emails and marks subscriptions as notified.
     */
    public void notifySubscribers(Product product) {
        if (product.getStock() <= 0) return; // guard: only notify when actually in stock

        // Fetch all pending (notified=false) subscriptions for the product
        List<BackInStockSubscription> subs =
                backInStockRepository.findByProductAndNotifiedFalse(product);
        if (subs.isEmpty()) return;

        for (BackInStockSubscription sub : subs) {
            try {
                // Send notification email
                emailSender.sendBackInStockNotification(sub.getCustomer(), product);
                // Mark subscription as notified and save
                sub.setNotified(true);
                sub.setNotifiedAt(LocalDateTime.now());
                backInStockRepository.save(sub);
            } catch (Exception e) {
                // Log and continue notifying others
                System.err.println("[BackInStock] Failed to notify customer "
                        + sub.getCustomer().getEmail() + ": " + e.getMessage());
            }
        }
        System.out.println("[BackInStock] Notified " + subs.size()
                + " subscriber(s) for product: " + product.getName());
    }

    // ── SUBSCRIBER COUNT (for vendor/admin info) ────────────────────────────
    /**
     * Get number of pending subscribers for a product.
     * @param productId ID of the product
     * @return Count of pending subscriptions
     */
    public long getSubscriberCount(int productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return 0;
        // Delegate to repository to count pending subscriptions
        return backInStockRepository.countPendingByProduct(product);
    }
}