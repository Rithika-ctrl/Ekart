/**
 * File: CustomOAuth2UserService.java
 * Description: OAuth2 user service delegating account creation/linking to SocialAuthService.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

/**
 * Custom OAuth2 User Service that delegates account management to SocialAuthService.
 * This class only handles OAuth2 protocol concerns; business logic is in SocialAuthService.
 * 
 * Supported providers: Google, Facebook, Instagram, GitHub
 */
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Autowired
    private SocialAuthService socialAuthService;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId();
        String providerId = extractProviderId(oAuth2User, provider);
        String email = extractEmail(oAuth2User, provider);
        String name = extractName(oAuth2User, provider);

        if (email == null || email.isEmpty()) {
            throw new OAuth2AuthenticationException("Email not available from " + provider);
        }

        // Delegate to SocialAuthService for account lookup/creation/linking
        // Default to customer account creation for OAuth
        socialAuthService.processCustomerOAuth(email, name, provider, providerId);

        return oAuth2User;
    }

    private String extractProviderId(OAuth2User oAuth2User, String provider) {
        Map<String, Object> attributes = oAuth2User.getAttributes();
        switch (provider.toLowerCase()) {
            case "google":
                return (String) attributes.get("sub");
            case "github":
                Object githubId = attributes.get("id");
                return githubId != null ? githubId.toString() : null;
            case "facebook":
                return (String) attributes.get("id");
            case "instagram":
                Object instaId = attributes.get("id");
                return instaId != null ? instaId.toString() : null;
            default:
                return null;
        }
    }

    private String extractEmail(OAuth2User oAuth2User, String provider) {
        // Instagram doesn't provide email in basic display API
        if ("instagram".equals(provider.toLowerCase())) {
            // Use username as identifier for Instagram
            String username = oAuth2User.getAttribute("username");
            return username != null ? username + "@instagram.user" : null;
        }
        return oAuth2User.getAttribute("email");
    }

    private String extractName(OAuth2User oAuth2User, String provider) {
        Map<String, Object> attributes = oAuth2User.getAttributes();
        switch (provider.toLowerCase()) {
            case "google":
                return (String) attributes.get("name");
            case "github":
                String name = (String) attributes.get("name");
                if (name == null || name.isEmpty()) {
                    name = (String) attributes.get("login");
                }
                return name;
            case "facebook":
                return (String) attributes.get("name");
            case "instagram":
                return (String) attributes.get("username");
            default:
                return null;
        }
    }
}
