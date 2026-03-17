package main.java.com.example.ekart.service;

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
     * Subscribe a customer to back-in-stock notifications for a product.
     * Returns a result map with { success, message, subscribed }.
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

        // Check if already subscribed
        if (backInStockRepository.existsByCustomerAndProductAndNotifiedFalse(customer, product)) {
            return Map.of(
                "success",    true,
                "subscribed", true,
                "message",    "You are already subscribed. We'll email you when it's back!"
            );
        }

        // Save subscription
        BackInStockSubscription sub = new BackInStockSubscription(customer, product);
        backInStockRepository.save(sub);

        return Map.of(
            "success",    true,
            "subscribed", true,
            "message",    "Done! We'll email you at " + customer.getEmail() + " when it's back in stock."
        );
    }

    // ── UNSUBSCRIBE ────────────────────────────────────────────────────────
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
        sub.ifPresent(backInStockRepository::delete);

        return Map.of(
            "success",    true,
            "subscribed", false,
            "message",    "Unsubscribed from back-in-stock notifications."
        );
    }

    // ── CHECK STATUS ───────────────────────────────────────────────────────
    /**
     * Returns true if the logged-in customer has a pending subscription for productId.
     */
    public boolean isSubscribed(int productId, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) return false;

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(null);
        if (customer == null) return false;

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return false;

        return backInStockRepository.existsByCustomerAndProductAndNotifiedFalse(customer, product);
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
                System.err.println("[BackInStock] Failed to notify customer "
                        + sub.getCustomer().getEmail() + ": " + e.getMessage());
            }
        }
        System.out.println("[BackInStock] Notified " + subs.size()
                + " subscriber(s) for product: " + product.getName());
    }

    // ── SUBSCRIBER COUNT (for vendor/admin info) ────────────────────────────
    public long getSubscriberCount(int productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return 0;
        return backInStockRepository.countPendingByProduct(product);
    }
}