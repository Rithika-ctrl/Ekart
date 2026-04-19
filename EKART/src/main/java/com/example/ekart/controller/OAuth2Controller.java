package com.example.ekart.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.ekart.config.OAuthProviderValidator;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
import com.example.ekart.service.SocialAuthService;

import jakarta.servlet.http.HttpSession;

/**
 * Controller for OAuth2/Social Authentication endpoints.
 * Kept separate from main EkartController to minimize changes to core auth logic.
 * Uses OAuthProviderValidator middleware to enforce role-based provider access.
 */
@Controller
public class OAuth2Controller {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final SocialAuthService socialAuthService;
    private final OAuthProviderValidator providerValidator;

    public OAuth2Controller(
            SocialAuthService socialAuthService,
            OAuthProviderValidator providerValidator) {
        this.socialAuthService = socialAuthService;
        this.providerValidator = providerValidator;
    }




    /**
     * Initiates OAuth flow by setting the login type before redirecting to provider.
     * Validates that the provider is allowed for the given account type.
     * 
     * @param provider OAuth provider (google, facebook, instagram, github)
     * @param type Account type (customer, vendor, admin)
     */
    @GetMapping("/oauth2/authorize/{provider}")
    public String initiateOAuth(@PathVariable String provider,
                                @RequestParam(defaultValue = "customer") String type,
                                HttpSession session) {
        
        // Strip "flutter-" prefix for validation — flutter-customer/flutter-vendor
        // share the same provider allowlist as their base roles.
        // The full type is stored in the session so OAuth2LoginSuccessHandler
        // can redirect back to the React app instead of a Thymeleaf page.
        String baseType = type.startsWith("flutter-") ? type.substring("flutter-".length()) : type;

        // Validate provider access using middleware
        if (!providerValidator.isProviderAllowed(provider, baseType)) {
            String providerName = providerValidator.getProviderDisplayName(provider);
            session.setAttribute("failure", providerName + " login is not available for " + baseType + " accounts");
            return getRedirectForType(baseType);
        }

        session.setAttribute("oauth_login_type", type);   // preserve full type e.g. "flutter-customer"
        return "redirect:/oauth2/authorization/" + provider;
    }

    /**
     * Endpoint to link an OAuth provider to an existing logged-in customer account.
     * Customer must already be logged in via email/password.
     */
    @GetMapping("/customer/link-oauth/{provider}")
    public String linkCustomerOAuth(@PathVariable String provider, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Please login first to link your social account");
            return "redirect:/customer/login";
        }
        
        // Validate provider is allowed for customers
        if (!providerValidator.isProviderAllowed(provider, "customer")) {
            session.setAttribute("failure", providerValidator.getProviderDisplayName(provider) + " is not available for customer accounts");
            return "redirect:/customer/home";
        }
        
        // Set a flag so success handler knows this is a linking operation
        session.setAttribute("oauth_link_mode", "customer");
        session.setAttribute("oauth_link_customer_id", customer.getId());
        return "redirect:/oauth2/authorization/" + provider;
    }

    /**
     * Endpoint to link an OAuth provider to an existing logged-in vendor account.
     */
    @GetMapping("/vendor/link-oauth/{provider}")
    public String linkVendorOAuth(@PathVariable String provider, HttpSession session) {
        Vendor vendor = (Vendor) session.getAttribute("vendor");
        if (vendor == null) {
            session.setAttribute("failure", "Please login first to link your social account");
            return "redirect:/vendor/login";
        }
        
        // Validate provider is allowed for vendors
        if (!providerValidator.isProviderAllowed(provider, "vendor")) {
            session.setAttribute("failure", providerValidator.getProviderDisplayName(provider) + " is not available for vendor accounts");
            return "redirect:/vendor/home";
        }
        
        session.setAttribute("oauth_link_mode", "vendor");
        session.setAttribute("oauth_link_vendor_id", vendor.getId());
        return "redirect:/oauth2/authorization/" + provider;
    }

    /**
     * Unlink OAuth provider from customer account.
     * Only allowed if customer has a password set.
     */
    @PostMapping("/customer/unlink-oauth")
    public String unlinkCustomerOAuth(HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Please login first");
            return "redirect:/customer/login";
        }

        if (customer.getPassword() == null) {
            session.setAttribute("failure", "Cannot unlink - you need to set a password first");
            return "redirect:/customer/home";
        }

        if (socialAuthService.unlinkOAuthFromCustomer(customer.getId())) {
            // Update session with unlinked customer
            customer.setProvider(null);
            customer.setProviderId(null);
            session.setAttribute("customer", customer);
            session.setAttribute("success", "Social account unlinked successfully");
        } else {
            session.setAttribute("failure", "Failed to unlink social account");
        }

        return "redirect:/customer/home";
    }

    /**
     * Helper to get redirect URL based on account type.
     */
    private String getRedirectForType(String type) {
        switch (type.toLowerCase()) {
            case "vendor": return "redirect:/vendor/login";
            case "admin": return "redirect:/admin/login";
            default: return "redirect:/customer/login";
        }
    }
}