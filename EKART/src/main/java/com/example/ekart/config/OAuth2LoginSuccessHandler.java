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
 *   "customer"         → Thymeleaf web flow, redirect to /customer/home
 *   "vendor"           → Thymeleaf web flow, redirect to /vendor/home
 *   "flutter-customer" → React app flow, redirect to React /oauth2/callback with data in query params
 *   "flutter-vendor"   → React app flow, redirect to React /oauth2/callback with data in query params
 *
 * React callback query params:
 *   ?role=CUSTOMER&id=1&name=…&email=…&token=…&provider=Google
 *
 * The `provider` param is consumed by OAuthCallback in App.jsx to display
 * "Signing you in with Google…" / "…GitHub…" etc. on the loading screen.
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

        String name          = extractName(oAuth2User, provider);
        String pid           = extractProviderId(oAuth2User, provider);
        String providerDisplay = getProviderDisplayName(provider);

        // ── React / Flutter flows ─────────────────────────────────────────────
        if (loginType.startsWith("flutter-")) {
            // Handle linking flows first (before removing attribute)
            if ("flutter-link-customer".equals(loginType)) {
                Integer linkId = (Integer) session.getAttribute("oauth_link_customer_id");
                session.removeAttribute("oauth_login_type");
                session.removeAttribute("oauth_link_customer_id");
                if (linkId != null) {
                    socialAuthService.linkOAuthToCustomer(linkId, provider, pid);
                }
                response.sendRedirect(REACT_ORIGIN + "/oauth2/link-callback?status=linked&provider=" + enc(providerDisplay));
                return;
            }
            if ("flutter-link-vendor".equals(loginType)) {
                Integer linkId = (Integer) session.getAttribute("oauth_link_vendor_id");
                session.removeAttribute("oauth_login_type");
                session.removeAttribute("oauth_link_vendor_id");
                if (linkId != null) {
                    socialAuthService.linkOAuthToVendor(linkId, provider, pid);
                }
                response.sendRedirect(REACT_ORIGIN + "/oauth2/link-callback?status=linked&provider=" + enc(providerDisplay));
                return;
            }

            session.removeAttribute("oauth_login_type");

            if ("flutter-vendor".equals(loginType)) {
                Vendor v     = socialAuthService.processVendorOAuth(email, name, provider, pid);
                String token = jwtUtil.generateToken(v.getId(), v.getEmail(), "VENDOR");
                response.sendRedirect(REACT_ORIGIN + "/oauth2/callback"
                        + "?role=VENDOR"
                        + "&id="       + v.getId()
                        + "&name="     + enc(v.getName())
                        + "&email="    + enc(v.getEmail())
                        + "&token="    + token
                        + "&provider=" + enc(providerDisplay));
            } else {
                // flutter-customer (default)
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
                        + "&id="       + c.getId()
                        + "&name="     + enc(c.getName())
                        + "&email="    + enc(c.getEmail())
                        + "&token="    + token
                        + "&provider=" + enc(providerDisplay));
            }
            return;
        }

        // ── Thymeleaf / web flows (unchanged) ────────────────────────────────
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
            case "google"    -> "Google";
            case "github"    -> "GitHub";
            case "facebook"  -> "Facebook";
            case "instagram" -> "Instagram";
            default          -> "Social Login";
        };
    }

    private String extractProviderId(OAuth2User u, String provider) {
        return switch (provider.toLowerCase()) {
            case "google" -> u.getAttribute("sub");
            case "github" -> {
                Object id = u.getAttribute("id");
                yield id != null ? id.toString() : null;
            }
            case "facebook" -> {
                Object id = u.getAttribute("id");
                yield id != null ? id.toString() : null;
            }
            case "instagram" -> {
                Object id = u.getAttribute("id");
                yield id != null ? id.toString() : null;
            }
            default -> null;
        };
    }

    private String extractName(OAuth2User u, String provider) {
        return switch (provider.toLowerCase()) {
            case "google"   -> u.getAttribute("name");
            case "github"   -> {
                String n = u.getAttribute("name");
                if (n == null || n.isEmpty()) n = u.getAttribute("login");
                yield n;
            }
            case "facebook" -> u.getAttribute("name");
            case "instagram" -> {
                String name = u.getAttribute("username");
                if (name == null || name.isEmpty()) name = u.getAttribute("name");
                yield name;
            }
            default         -> u.getAttribute("name");
        };
    }
}