package com.example.ekart.service;
import java.util.Random;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.dto.Wishlist;
import com.example.ekart.dto.Refund;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.WishlistRepository;
import com.example.ekart.repository.RefundRepository;

import jakarta.transaction.Transactional;

/**
 * Admin Account Service for User Oversight Dashboard.
 * Provides account management functions for admins.
 */
@Service
@Transactional
public class AdminAccountService {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountService.class);

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final WishlistRepository wishlistRepository;
    private final RefundRepository refundRepository;
    private final EmailSender emailSender;

    public AdminAccountService(
            CustomerRepository customerRepository,
            OrderRepository orderRepository,
            WishlistRepository wishlistRepository,
            RefundRepository refundRepository,
            EmailSender emailSender) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
        this.wishlistRepository = wishlistRepository;
        this.refundRepository = refundRepository;
        this.emailSender = emailSender;
    }






    // @Autowired
    // private ItemRepository itemRepository; // unused


    /**
     * Get all users with summarized metadata for admin oversight.
     */
    public List<Map<String, Object>> getAllAccountsWithMetadata() {
        List<Customer> customers = customerRepository.findAll();
        return customers.stream()
                .map(this::customerToMetadataMap)
                .toList();
    }

    /**
     * Search users by email or name.
     */
    public List<Map<String, Object>> searchAccounts(String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllAccountsWithMetadata();
        }
        List<Customer> customers = customerRepository.searchByNameOrEmail(query.trim());
        return customers.stream()
                .map(this::customerToMetadataMap)
                .toList();
    }

    /**
     * Convert customer to metadata map with aggregated info.
     */
    private Map<String, Object> customerToMetadataMap(Customer customer) {
        Map<String, Object> data = new HashMap<>();
        
        data.put("id", customer.getId());
        data.put("name", customer.getName());
        data.put("email", customer.getEmail());
        data.put("mobile", customer.getMobile());
        data.put("role", customer.getRole().name());
        data.put("isActive", customer.isActive());
        data.put("verified", customer.isVerified());
        data.put("provider", customer.getProvider()); // OAuth provider if any
        data.put("lastLogin", customer.getLastLogin());
        
        // Aggregate order count
        List<Order> orders = orderRepository.findByCustomer(customer);
        data.put("totalOrders", orders.size());
        
        // Calculate total spent
        double totalSpent = orders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED)
                .mapToDouble(Order::getAmount)
                .sum();
        data.put("totalSpent", totalSpent);
        
        return data;
    }

    /**
     * Toggle account active status (activate/deactivate).
     */
    public Map<String, Object> toggleAccountStatus(int customerId, boolean activate) {
        Map<String, Object> result = new HashMap<>();
        
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            result.put("success", false);
            result.put("message", "Customer not found");
            return result;
        }
        
        customer.setActive(activate);
        customerRepository.save(customer);
        
        result.put("success", true);
        result.put("message", activate ? "Account activated successfully" : "Account deactivated successfully");
        result.put("isActive", customer.isActive());
        
        // Log the action
        log.info("[ADMIN] Account {} {} by admin", customer.getEmail(), (activate ? "activated" : "deactivated"));
        
        return result;
    }

    /**
     * Get detailed user profile for admin view (orders, wishlist, spending).
     */
    public Map<String, Object> getUserProfile(int customerId) {
        Map<String, Object> profile = new HashMap<>();
        
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            profile.put("error", "Customer not found");
            return profile;
        }
        
        // Basic info
        profile.put("id", customer.getId());
        profile.put("name", customer.getName());
        profile.put("email", customer.getEmail());
        profile.put("mobile", customer.getMobile());
        profile.put("role", customer.getRole().name());
        profile.put("isActive", customer.isActive());
        profile.put("verified", customer.isVerified());
        profile.put("lastLogin", customer.getLastLogin());
        profile.put("provider", customer.getProvider());
        
        // Recent orders (last 10)
        List<Order> allOrders = orderRepository.findByCustomer(customer);
        allOrders.sort((a, b) -> {
            if (a.getOrderDate() == null && b.getOrderDate() == null) return 0;
            if (a.getOrderDate() == null) return 1;
            if (b.getOrderDate() == null) return -1;
            return b.getOrderDate().compareTo(a.getOrderDate());
        });
        
        List<Map<String, Object>> recentOrders = allOrders.stream()
                .limit(10)
                .map(this::orderToMap)
                .toList();
        profile.put("recentOrders", recentOrders);
        profile.put("totalOrders", allOrders.size());
        
        // Active wishlist items
        List<Wishlist> wishlists = wishlistRepository.findByCustomer(customer);
        List<Map<String, Object>> wishlistItems = wishlists.stream()
                .map(w -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", w.getId());
                    item.put("productName", w.getProduct().getName());
                    item.put("productPrice", w.getProduct().getPrice());
                    item.put("addedAt", w.getAddedAt());
                    return item;
                })
                .toList();
        profile.put("wishlistItems", wishlistItems);
        profile.put("wishlistCount", wishlists.size());
        
        // Spending summary
        double totalSpent = allOrders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED)
                .mapToDouble(Order::getAmount)
                .sum();
        profile.put("totalSpent", totalSpent);
        
        // Calculate average order value
        long deliveredCount = allOrders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED)
                .count();
        profile.put("averageOrderValue", deliveredCount > 0 ? totalSpent / deliveredCount : 0);

        // Saved delivery addresses
        List<Map<String, Object>> addresses = customer.getAddresses() == null
            ? Collections.emptyList()
            : customer.getAddresses().stream().map(a -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id",            a.getId());
                m.put("recipientName", a.getRecipientName());
                m.put("houseStreet",   a.getHouseStreet());
                m.put("city",          a.getCity());
                m.put("state",         a.getState());
                m.put("postalCode",    a.getPostalCode());
                m.put("details",       a.getDetails());
                m.put("formatted",     a.getFormattedAddress());
                return m;
              }).toList();
        profile.put("addresses", addresses);

        return profile;
    }

    /**
     * Helper to convert Order to a map.
     */
    private Map<String, Object> orderToMap(Order order) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", order.getId());
        map.put("orderDate", order.getOrderDate());
        map.put("amount", order.getAmount());
        map.put("status", order.getTrackingStatus() != null ? order.getTrackingStatus().getDisplayName() : "Pending");
        map.put("itemCount", order.getItems() != null ? order.getItems().size() : 0);
        return map;
    }

    /**
     * Generate password reset link for a user.
     * Sets a new OTP and returns reset URL.
     */
    public Map<String, Object> generatePasswordResetLink(int customerId) {
        Map<String, Object> result = new HashMap<>();
        
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            result.put("success", false);
            result.put("message", "Customer not found");
            return result;
        }
        
        // Generate new OTP
        int otp = new Random().nextInt(100000, 1000000);
        // Note: setOtp() is deprecated; OTP is handled through OtpService in modern flows
        // For backward compatibility with password reset, we store in local variable only
        
        // Build reset URL
        String resetUrl = "/customer/reset-password/" + customer.getId() + "/" + otp;
        result.put("success", true);
        result.put("resetUrl", resetUrl);
        result.put("otp", otp);
        result.put("email", customer.getEmail());
        
        // Send email notification (optional)
        try {
            emailSender.sendPasswordResetByAdmin(customer);
            result.put("emailSent", true);
        } catch (Exception e) {
            result.put("emailSent", false);
            result.put("emailError", e.getMessage());
        }
        
        log.info("[ADMIN] Password reset link generated for: {}", customer.getEmail());
        
        return result;
    }

    /**
     * Get account statistics for dashboard.
     */
    public Map<String, Object> getAccountStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long totalAccounts = customerRepository.count();
        long activeAccounts = customerRepository.countByActive(true);
        long suspendedAccounts = customerRepository.countByActive(false);
        
        stats.put("totalAccounts", totalAccounts);
        stats.put("activeAccounts", activeAccounts);
        stats.put("suspendedAccounts", suspendedAccounts);
        
        return stats;
    }

    /**
     * Permanently delete a customer account and all associated data.
     */
    public Map<String, Object> deleteAccount(int customerId) {
        Map<String, Object> result = new HashMap<>();

        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            result.put("success", false);
            result.put("message", "Customer not found");
            return result;
        }

        String name = customer.getName();

        // 1. Delete wishlist entries
        List<Wishlist> wishlist = wishlistRepository.findByCustomer(customer);
        if (!wishlist.isEmpty()) { wishlistRepository.deleteAll(wishlist); wishlistRepository.flush(); }

        // 2. Delete refunds
        List<Refund> refunds = refundRepository.findByCustomer(customer);
        if (!refunds.isEmpty()) { refundRepository.deleteAll(refunds); refundRepository.flush(); }

        // 3. Delete orders (CascadeType.ALL handles order items)
        List<Order> orders = orderRepository.findByCustomer(customer);
        if (!orders.isEmpty()) { orderRepository.deleteAll(orders); orderRepository.flush(); }

        // 4. Delete customer (CascadeType.ALL handles cart + addresses)
        customerRepository.delete(customer);

        result.put("success", true);
        result.put("message", "Account of " + name + " deleted successfully");
        return result;
    }
}


