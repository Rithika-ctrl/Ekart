package com.example.ekart.config;

import java.io.IOException;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
import com.example.ekart.helper.JwtUtil;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.service.SocialAuthService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Handles successful OAuth2 authentication.
 *
 * login_type values stored in session by OAuth2Controller:
 *   "customer"        → Thymeleaf web flow, redirect to /customer/home
 *   "vendor"          → Thymeleaf web flow, redirect to /vendor/home
 *   "flutter-customer"→ React app flow, redirect to React /oauth2/callback with data in query params
 *   "flutter-vendor"  → React app flow, redirect to React /oauth2/callback with data in query params
 */
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Autowired
    private SocialAuthService socialAuthService;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * React dev-server origin for the flutter OAuth callback redirect.
     * In production, change this to wherever the React build is served.
     */
    private static final String REACT_ORIGIN = "http://localhost:3000";

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email    = oAuth2User.getAttribute("email");
        String provider = "unknown";
        if (authentication instanceof OAuth2AuthenticationToken tok) {
            provider = tok.getAuthorizedClientRegistrationId();
        }

        HttpSession session  = request.getSession();
        String loginType     = (String) session.getAttribute("oauth_login_type");
        if (loginType == null) loginType = "customer";

        String name = extractName(oAuth2User, provider);
        String pid  = extractProviderId(oAuth2User, provider);

        // ── React / Flutter flows ─────────────────────────────────────────────
        if (loginType.startsWith("flutter-")) {
            session.removeAttribute("oauth_login_type");

            if ("flutter-vendor".equals(loginType)) {
                Vendor v    = socialAuthService.processVendorOAuth(email, name, provider, pid);
                String token = jwtUtil.generateToken(v.getId(), v.getEmail(), "VENDOR");
                response.sendRedirect(REACT_ORIGIN + "/oauth2/callback"
                        + "?role=VENDOR"
                        + "&id="    + v.getId()
                        + "&name="  + enc(v.getName())
                        + "&email=" + enc(v.getEmail())
                        + "&token=" + token);
            } else {
                Customer c = socialAuthService.processCustomerOAuth(email, name, provider, pid);
                if (!c.isActive()) {
                    response.sendRedirect(REACT_ORIGIN + "/oauth2/callback?error=suspended");
                    return;
                }
                c.setLastLogin(LocalDateTime.now());
                customerRepository.save(c);
                String token = jwtUtil.generateToken(c.getId(), c.getEmail(), "CUSTOMER");
                response.sendRedirect(REACT_ORIGIN + "/oauth2/callback"
                        + "?role=CUSTOMER"
                        + "&id="    + c.getId()
                        + "&name="  + enc(c.getName())
                        + "&email=" + enc(c.getEmail())
                        + "&token=" + token);
            }
            return;
        }

        // ── Thymeleaf / web flows (unchanged) ────────────────────────────────
        String providerDisplay = getProviderDisplayName(provider);

        if ("vendor".equals(loginType)) {
            Vendor v = socialAuthService.processVendorOAuth(email, name, provider, pid);
            session.setAttribute("vendor", v);
            session.setAttribute("success", "Login Successful via " + providerDisplay);
            session.removeAttribute("oauth_login_type");
            response.sendRedirect("/vendor/home");
            return;
        }

        Customer c = socialAuthService.processCustomerOAuth(email, name, provider, pid);
        if (!c.isActive()) {
            session.setAttribute("failure", "Your account has been suspended.");
            session.removeAttribute("oauth_login_type");
            response.sendRedirect("/customer/login");
            return;
        }
        c.setLastLogin(LocalDateTime.now());
        customerRepository.save(c);
        session.setAttribute("customer", c);
        session.setAttribute("success", "Login Successful via " + providerDisplay);
        session.removeAttribute("oauth_login_type");
        response.sendRedirect("/customer/home");
    }

    private String enc(String value) {
        if (value == null) return "";
        try { return java.net.URLEncoder.encode(value, "UTF-8"); }
        catch (Exception e) { return value; }
    }

    private String getProviderDisplayName(String provider) {
        return switch (provider.toLowerCase()) {
            case "google" -> "Google";
            case "github" -> "GitHub";
            default       -> "Social Login";
        };
    }

    private String extractProviderId(OAuth2User u, String provider) {
        if ("google".equals(provider)) return u.getAttribute("sub");
        if ("github".equals(provider)) {
            Object id = u.getAttribute("id");
            return id != null ? id.toString() : null;
        }
        return null;
    }

    private String extractName(OAuth2User u, String provider) {
        if ("google".equals(provider)) return u.getAttribute("name");
        if ("github".equals(provider)) {
            String n = u.getAttribute("name");
            if (n == null || n.isEmpty()) n = u.getAttribute("login");
            return n;
        }
        return null;
    }
}