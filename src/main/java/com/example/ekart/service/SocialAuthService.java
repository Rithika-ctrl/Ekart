package com.example.ekart.service;

import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.ekart.dto.Cart;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.VendorRepository;

import jakarta.transaction.Transactional;

/**
 * Service for handling OAuth2/Social Authentication logic.
 * Separated from core authentication to minimize changes to existing auth files.
 * 
 * Responsibilities:
 * - Check if user exists by email or provider credentials
 * - Link social accounts to existing users
 * - Create new users from OAuth providers
 */
@Service
@Transactional
public class SocialAuthService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private VendorRepository vendorRepository;

    /**
     * Process OAuth authentication for a customer.
     * - If user exists by provider+providerId: return existing user
     * - If user exists by email: link OAuth provider and return user
     * - If no user exists: create new customer account
     * 
     * @param email User's email from OAuth provider
     * @param name User's display name from OAuth provider
     * @param provider OAuth provider name (e.g., "google", "github")
     * @param providerId Unique ID from the OAuth provider
     * @return The Customer entity (existing or newly created)
     */
    public Customer processCustomerOAuth(String email, String name, String provider, String providerId) {
        
        // 1. Check if already linked by provider credentials
        Customer existingByProvider = customerRepository.findByProviderAndProviderId(provider, providerId);
        if (existingByProvider != null) {
            return existingByProvider;
        }

        // 2. Check if user exists by email (registered via email/password or different provider)
        Customer existingByEmail = customerRepository.findByEmail(email);
        if (existingByEmail != null) {
            // Link this OAuth provider to existing account
            existingByEmail.setProvider(provider);
            existingByEmail.setProviderId(providerId);
            customerRepository.save(existingByEmail);
            return existingByEmail;
        }

        // 3. Create new customer account from OAuth data
        return createCustomerFromOAuth(email, name, provider, providerId);
    }

    /**
     * Process OAuth authentication for a vendor.
     * Same logic as customer but for vendor accounts.
     */
    public Vendor processVendorOAuth(String email, String name, String provider, String providerId) {
        
        // 1. Check if already linked by provider credentials
        Vendor existingByProvider = vendorRepository.findByProviderAndProviderId(provider, providerId);
        if (existingByProvider != null) {
            return existingByProvider;
        }

        // 2. Check if vendor exists by email
        Vendor existingByEmail = vendorRepository.findByEmail(email);
        if (existingByEmail != null) {
            // Link this OAuth provider to existing vendor account
            existingByEmail.setProvider(provider);
            existingByEmail.setProviderId(providerId);
            vendorRepository.save(existingByEmail);
            return existingByEmail;
        }

        // 3. Create new vendor account from OAuth data
        return createVendorFromOAuth(email, name, provider, providerId);
    }

    /**
     * Find customer by OAuth credentials without creating a new account.
     * Useful when you want to check existence before processing.
     */
    public Customer findCustomerByOAuth(String provider, String providerId) {
        return customerRepository.findByProviderAndProviderId(provider, providerId);
    }

    /**
     * Find vendor by OAuth credentials without creating a new account.
     */
    public Vendor findVendorByOAuth(String provider, String providerId) {
        return vendorRepository.findByProviderAndProviderId(provider, providerId);
    }

    /**
     * Link an OAuth provider to an existing customer account.
     * Returns true if linking was successful, false if customer not found.
     */
    public boolean linkOAuthToCustomer(int customerId, String provider, String providerId) {
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer != null) {
            customer.setProvider(provider);
            customer.setProviderId(providerId);
            customerRepository.save(customer);
            return true;
        }
        return false;
    }

    /**
     * Link an OAuth provider to an existing vendor account.
     */
    public boolean linkOAuthToVendor(int vendorId, String provider, String providerId) {
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor != null) {
            vendor.setProvider(provider);
            vendor.setProviderId(providerId);
            vendorRepository.save(vendor);
            return true;
        }
        return false;
    }

    /**
     * Unlink OAuth provider from a customer account.
     * Only allowed if customer has a password set (can still log in).
     */
    public boolean unlinkOAuthFromCustomer(int customerId) {
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer != null && customer.getPassword() != null) {
            customer.setProvider(null);
            customer.setProviderId(null);
            customerRepository.save(customer);
            return true;
        }
        return false;
    }

    // ==================== Private Helper Methods ====================

    private Customer createCustomerFromOAuth(String email, String name, String provider, String providerId) {
        Customer customer = new Customer();
        customer.setEmail(email);
        customer.setName(sanitizeName(name, email));
        customer.setProvider(provider);
        customer.setProviderId(providerId);
        customer.setVerified(true);  // OAuth users are auto-verified
        customer.setPassword(null);   // No password for OAuth-only users
        customer.setMobile(0);        // Can be updated later in profile
        customer.setOtp(0);
        
        // Initialize cart (required by existing system)
        Cart cart = new Cart();
        cart.setItems(new ArrayList<>());
        customer.setCart(cart);
        customer.setAddresses(new ArrayList<>());

        return customerRepository.save(customer);
    }

    private Vendor createVendorFromOAuth(String email, String name, String provider, String providerId) {
        Vendor vendor = new Vendor();
        vendor.setEmail(email);
        vendor.setName(sanitizeName(name, email));
        vendor.setProvider(provider);
        vendor.setProviderId(providerId);
        vendor.setVerified(true);  // OAuth users are auto-verified
        vendor.setPassword(null);   // No password for OAuth-only users
        vendor.setMobile(0);        // Can be updated later in profile
        vendor.setOtp(0);

        return vendorRepository.save(vendor);
    }

    /**
     * Ensure name meets validation requirements (5-30 chars).
     */
    private String sanitizeName(String name, String email) {
        if (name != null && name.length() >= 5 && name.length() <= 30) {
            return name;
        }
        // Fallback: use email prefix, padded if needed
        String fallback = email.split("@")[0];
        if (fallback.length() < 5) {
            fallback = fallback + "_user";
        }
        if (fallback.length() > 30) {
            fallback = fallback.substring(0, 30);
        }
        return fallback;
    }
}
