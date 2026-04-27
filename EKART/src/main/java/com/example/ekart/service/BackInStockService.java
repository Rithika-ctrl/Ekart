package com.example.ekart.service;
import java.util.Optional;
import java.time.LocalDateTime;

import com.example.ekart.dto.BackInStockSubscription;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Product;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.BackInStockRepository;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class BackInStockService {

    // ── S1192 String constants ──
    private static final String K_MESSAGE                           = "message";
    private static final String K_SUBSCRIBED                        = "subscribed";
    private static final String K_SUCCESS                           = "success";

    private static final Logger log = LoggerFactory.getLogger(BackInStockService.class);



    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final BackInStockRepository backInStockRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final EmailSender emailSender;
    private final com.example.ekart.helper.JwtUtil jwtUtil;

    public BackInStockService(
            BackInStockRepository backInStockRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            EmailSender emailSender,
            com.example.ekart.helper.JwtUtil jwtUtil) {
        this.backInStockRepository = backInStockRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.emailSender = emailSender;
        this.jwtUtil = jwtUtil;
    }

    // ── SUBSCRIBE ──────────────────────────────────────────────────────────
    /**
     * Subscribe a customer to back-in-stock notifications for a product.
     * Returns a result map with { success, message, subscribed }.
     */
    public Map<String, Object> subscribe(int productId, HttpServletRequest request) {
        Customer sessionCustomer = resolveCustomer(request);
        if (sessionCustomer == null) {
            return Map.of(K_SUCCESS, false, K_MESSAGE, "Please log in to subscribe.");
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return Map.of(K_SUCCESS, false, K_MESSAGE, "Product not found.");
        }

        // If product is actually in stock, no need to subscribe
        if (product.getStock() > 0) {
            return Map.of(K_SUCCESS, false, K_MESSAGE, "Product is already in stock! Add it to your cart.");
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
                    K_SUCCESS,    true,
                    K_SUBSCRIBED, true,
                    K_MESSAGE,    "You are already subscribed. We'll email you when it's back!"
                );
            }
            // Previously notified — reuse the existing row by resetting it
            sub.setNotified(false);
            sub.setNotifiedAt(null);
            sub.setSubscribedAt(java.time.LocalDateTime.now());
            backInStockRepository.save(sub);
            return Map.of(
                K_SUCCESS,    true,
                K_SUBSCRIBED, true,
                K_MESSAGE,    "Done! We'll email you at " + customer.getEmail() + " when it's back in stock."
            );
        }

        // No existing row — fresh subscription
        BackInStockSubscription sub = new BackInStockSubscription(customer, product);
        backInStockRepository.save(sub);

        return Map.of(
            K_SUCCESS,    true,
            K_SUBSCRIBED, true,
            K_MESSAGE,    "Done! We'll email you at " + customer.getEmail() + " when it's back in stock."
        );
    }

    // ── UNSUBSCRIBE ────────────────────────────────────────────────────────
    public Map<String, Object> unsubscribe(int productId, HttpServletRequest request) {
        Customer sessionCustomer = resolveCustomer(request);
        if (sessionCustomer == null) {
            return Map.of(K_SUCCESS, false, K_MESSAGE, "Not logged in.");
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);
        Product product   = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return Map.of(K_SUCCESS, false, K_MESSAGE, "Product not found.");
        }

        Optional<BackInStockSubscription> sub =
                backInStockRepository.findByCustomerAndProduct(customer, product);
        sub.ifPresent(backInStockRepository::delete);

        return Map.of(
            K_SUCCESS,    true,
            K_SUBSCRIBED, false,
            K_MESSAGE,    "Unsubscribed from back-in-stock notifications."
        );
    }

    // ── CHECK STATUS ───────────────────────────────────────────────────────
    /**
     * Returns true if the logged-in customer has a pending subscription for productId.
     */
    public boolean isSubscribed(int productId, HttpServletRequest request) {
        Customer sessionCustomer = resolveCustomer(request);
        if (sessionCustomer == null) return false;

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(null);
        if (customer == null) return false;

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return false;

        return backInStockRepository.existsByCustomerAndProductAndNotifiedFalse(customer, product);
    }

    /**
     * Resolve the customer from (in order): HTTP session attribute, Authorization Bearer token, X-Customer-Id header
     */
    private Customer resolveCustomer(HttpServletRequest request) {
        // 1) Session
        if (request != null) {
            HttpSession session = request.getSession(false);
            if (session != null) {
                Object o = session.getAttribute("customer");
                if (o instanceof Customer) return (Customer) o;
            }

            // 2) Authorization: Bearer <token>
            String auth = request.getHeader("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) {
                String token = auth.substring(7);
                try {
                    if (jwtUtil.isValid(token)) {
                        int cid = jwtUtil.getCustomerId(token);
                        return customerRepository.findById(cid).orElse(null);
                    }
                } catch (Exception ignored) {}
            }

            // 3) X-Customer-Id header (fallback)
            String xcid = request.getHeader("X-Customer-Id");
            if (xcid != null) {
                try {
                    int cid = Integer.parseInt(xcid);
                    return customerRepository.findById(cid).orElse(null);
                } catch (NumberFormatException ignored) {}
            }
        }
        return null;
    }

    // ── NOTIFY ALL SUBSCRIBERS (called when stock is restored) ─────────────
    /**
     * Called automatically when a product's stock goes from 0 → positive.
     * Sends email to every pending subscriber and marks them as notified.
     */
    public void notifySubscribers(Product product) {
        if (product.getStock() <= 0) return; // guard: only notify when actually in stock

        List<BackInStockSubscription> subs =
                backInStockRepository.findByProductAndNotifiedFalse(product);
        if (subs.isEmpty()) return;

        for (BackInStockSubscription sub : subs) {
            try {
                emailSender.sendBackInStockNotification(sub.getCustomer(), product);
                sub.setNotified(true);
                sub.setNotifiedAt(LocalDateTime.now());
                backInStockRepository.save(sub);
            } catch (Exception e) {
                log.error("[BackInStock] Failed to notify customer {}: {}", sub.getCustomer().getEmail(), e.getMessage());
            }
        }
        log.info("[BackInStock] Notified {} subscriber(s) for product: {}", subs.size(), product.getName());
    }

    // ── SUBSCRIBER COUNT (for vendor/admin info) ────────────────────────────
    public long getSubscriberCount(int productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return 0;
        return backInStockRepository.countPendingByProduct(product);
    }
}