package com.example.ekart.config;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

/**
 * Middleware/Validator for OAuth provider access control.
 * Controls which OAuth providers are available for each role type.
 * 
 * This approach prevents direct injection into core auth files by
 * using a centralized wrapper for provider validation.
 */
@Component
public class OAuthProviderValidator {

    // Provider access map by role type
    private static final Map<String, List<String>> ALLOWED_PROVIDERS = new HashMap<>();

    static {
        // Customer can use: Google, Facebook, Instagram
        ALLOWED_PROVIDERS.put("customer", Arrays.asList("google", "facebook", "instagram"));
        
        // Vendor can use: Google, Facebook, Instagram
        ALLOWED_PROVIDERS.put("vendor", Arrays.asList("google", "facebook", "instagram"));
        
        // Admin can use: Google, Facebook, Instagram, GitHub (all providers)
        ALLOWED_PROVIDERS.put("admin", Arrays.asList("google", "facebook", "instagram", "github"));
    }

    /**
     * Check if a provider is allowed for the given role type.
     * 
     * @param provider OAuth provider name (google, facebook, instagram, github)
     * @param roleType User role type (customer, vendor, admin)
     * @return true if provider is allowed for this role
     */
    public boolean isProviderAllowed(String provider, String roleType) {
        if (provider == null || roleType == null) {
            return false;
        }
        
        List<String> allowed = ALLOWED_PROVIDERS.get(roleType.toLowerCase());
        if (allowed == null) {
            return false;
        }
        
        return allowed.contains(provider.toLowerCase());
    }

    /**
     * Get list of allowed providers for a role type.
     * Useful for rendering login buttons.
     * 
     * @param roleType User role type (customer, vendor, admin)
     * @return List of allowed provider names
     */
    public List<String> getAllowedProviders(String roleType) {
        return ALLOWED_PROVIDERS.getOrDefault(roleType.toLowerCase(), Arrays.asList());
    }

    /**
     * Get display name for a provider.
     */
    public String getProviderDisplayName(String provider) {
        switch (provider.toLowerCase()) {
            case "google": return "Google";
            case "facebook": return "Facebook";
            case "instagram": return "Instagram";
            case "github": return "GitHub";
            default: return provider;
        }
    }

    /**
     * Check if GitHub login attempt is from admin.
     * Returns error message if not allowed, null if allowed.
     */
    public String validateGitHubAccess(String roleType) {
        if ("github".equals(roleType) || isProviderAllowed("github", roleType)) {
            return null;
        }
        return "GitHub login is only available for Admin accounts";
    }
}
