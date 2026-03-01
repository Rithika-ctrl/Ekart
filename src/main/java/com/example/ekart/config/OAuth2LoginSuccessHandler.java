package com.example.ekart.config;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
import com.example.ekart.service.SocialAuthService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Handles successful OAuth2 authentication.
 * Sets the appropriate session attributes based on login type (customer/vendor).
 */
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Autowired
    private SocialAuthService socialAuthService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        
        // Extract provider info from authentication token
        String provider = "unknown";
        if (authentication instanceof OAuth2AuthenticationToken) {
            provider = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
        }

        HttpSession session = request.getSession();

        // Determine login type from session (set by OAuth2Controller)
        String loginType = (String) session.getAttribute("oauth_login_type");
        if (loginType == null) {
            loginType = "customer";
        }

        String providerDisplayName = getProviderDisplayName(provider);

        if ("vendor".equals(loginType)) {
            // Process vendor OAuth login
            Vendor vendor = socialAuthService.processVendorOAuth(
                email,
                extractName(oAuth2User, provider),
                provider,
                extractProviderId(oAuth2User, provider)
            );
            
            session.setAttribute("vendor", vendor);
            session.setAttribute("success", "Login Successful via " + providerDisplayName);
            session.removeAttribute("oauth_login_type");
            response.sendRedirect("/vendor/home");
            return;
        }

        // Default: customer OAuth login
        Customer customer = socialAuthService.processCustomerOAuth(
            email,
            extractName(oAuth2User, provider),
            provider,
            extractProviderId(oAuth2User, provider)
        );
        
        session.setAttribute("customer", customer);
        session.setAttribute("success", "Login Successful via " + providerDisplayName);
        session.removeAttribute("oauth_login_type");
        response.sendRedirect("/customer/home");
    }

    private String getProviderDisplayName(String provider) {
        switch (provider.toLowerCase()) {
            case "google": return "Google";
            case "github": return "GitHub";
            default: return "Social Login";
        }
    }

    private String extractProviderId(OAuth2User oAuth2User, String provider) {
        if ("google".equals(provider)) {
            return oAuth2User.getAttribute("sub");
        } else if ("github".equals(provider)) {
            Object id = oAuth2User.getAttribute("id");
            return id != null ? id.toString() : null;
        }
        return null;
    }

    private String extractName(OAuth2User oAuth2User, String provider) {
        if ("google".equals(provider)) {
            return oAuth2User.getAttribute("name");
        } else if ("github".equals(provider)) {
            String name = oAuth2User.getAttribute("name");
            if (name == null || name.isEmpty()) {
                name = oAuth2User.getAttribute("login");
            }
            return name;
        }
        return null;
    }
}
