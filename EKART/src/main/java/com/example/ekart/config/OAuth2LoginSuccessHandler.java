package com.example.ekart.config;
import java.time.LocalDateTime;

import java.io.IOException;

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
 *   K_CUSTOMER         → Thymeleaf web flow, redirect to /customer/home
 *   K_VENDOR           → Thymeleaf web flow, redirect to /vendor/home
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

    // ── S1192 String constants ──
    private static final String K_INSTAGRAM                         = "instagram";
    private static final String K_CUSTOMER                         = "customer";
    private static final String K_NAME                              = "name";
    private static final String K_VENDOR                            = "vendor";




    /**
     * React dev-server origin for the flutter OAuth callback redirect.
     * In production, change this to wherever the React build is served.
     */
    private static final String REACT_ORIGIN = "http://localhost:3000";
    private static final String KEY_OAUTH_LOGIN_TYPE = "oauth_login_type";
    private static final String PROVIDER_GOOGLE = "google";
    private static final String PROVIDER_GITHUB = "github";
    private static final String PROVIDER_FACEBOOK = "facebook";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final SocialAuthService socialAuthService;
    private final CustomerRepository customerRepository;
    private final JwtUtil jwtUtil;

    public OAuth2LoginSuccessHandler(
            SocialAuthService socialAuthService,
            CustomerRepository customerRepository,
            JwtUtil jwtUtil) {
        this.socialAuthService = socialAuthService;
        this.customerRepository = customerRepository;
        this.jwtUtil = jwtUtil;
    }


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
        String loginType     = (String) session.getAttribute(KEY_OAUTH_LOGIN_TYPE);
        if (loginType == null) loginType = K_CUSTOMER;

        String name          = extractName(oAuth2User, provider);
        String pid           = extractProviderId(oAuth2User, provider);
        String providerDisplay = getProviderDisplayName(provider);

        // ── React / Flutter flows ─────────────────────────────────────────────
        if (loginType.startsWith("flutter-")) {
            // Handle linking flows first (before removing attribute)
            if ("flutter-link-customer".equals(loginType)) {
                Integer linkId = (Integer) session.getAttribute("oauth_link_customer_id");
                session.removeAttribute(KEY_OAUTH_LOGIN_TYPE);
                session.removeAttribute("oauth_link_customer_id");
                if (linkId != null) {
                    socialAuthService.linkOAuthToCustomer(linkId, provider, pid);
                }
                response.sendRedirect(REACT_ORIGIN + "/oauth2/link-callback?status=linked&provider=" + enc(providerDisplay));
                return;
            }
            if ("flutter-link-vendor".equals(loginType)) {
                Integer linkId = (Integer) session.getAttribute("oauth_link_vendor_id");
                session.removeAttribute(KEY_OAUTH_LOGIN_TYPE);
                session.removeAttribute("oauth_link_vendor_id");
                if (linkId != null) {
                    socialAuthService.linkOAuthToVendor(linkId, provider, pid);
                }
                response.sendRedirect(REACT_ORIGIN + "/oauth2/link-callback?status=linked&provider=" + enc(providerDisplay));
                return;
            }

            session.removeAttribute(KEY_OAUTH_LOGIN_TYPE);

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
        if (K_VENDOR.equals(loginType)) {
            Vendor v = socialAuthService.processVendorOAuth(email, name, provider, pid);
            session.setAttribute(K_VENDOR, v);
            session.setAttribute("success", "Login Successful via " + providerDisplay);
            session.removeAttribute(KEY_OAUTH_LOGIN_TYPE);
            response.sendRedirect("/vendor/home");
            return;
        }

        Customer c = socialAuthService.processCustomerOAuth(email, name, provider, pid);
        if (!c.isActive()) {
            session.setAttribute("failure", "Your account has been suspended.");
            session.removeAttribute(KEY_OAUTH_LOGIN_TYPE);
            response.sendRedirect("/customer/login");
            return;
        }
        c.setLastLogin(LocalDateTime.now());
        customerRepository.save(c);
        session.setAttribute(K_CUSTOMER, c);
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
            case PROVIDER_GOOGLE   -> "Google";
            case PROVIDER_GITHUB   -> "GitHub";
            case PROVIDER_FACEBOOK -> "Facebook";
            case K_INSTAGRAM -> "Instagram";
            default          -> "Social Login";
        };
    }

    private String extractProviderId(OAuth2User u, String provider) {
        return switch (provider.toLowerCase()) {
            case PROVIDER_GOOGLE -> u.getAttribute("sub");
            case PROVIDER_GITHUB -> {
                Object id = u.getAttribute("id");
                yield id != null ? id.toString() : null;
            }
            case PROVIDER_FACEBOOK -> {
                Object id = u.getAttribute("id");
                yield id != null ? id.toString() : null;
            }
            case K_INSTAGRAM -> {
                Object id = u.getAttribute("id");
                yield id != null ? id.toString() : null;
            }
            default -> null;
        };
    }

    private String extractName(OAuth2User u, String provider) {
        return switch (provider.toLowerCase()) {
            case PROVIDER_GOOGLE   -> u.getAttribute(K_NAME);
            case PROVIDER_GITHUB   -> {
                String n = u.getAttribute(K_NAME);
                if (n == null || n.isEmpty()) n = u.getAttribute("login");
                yield n;
            }
            case PROVIDER_FACEBOOK -> u.getAttribute(K_NAME);
            case K_INSTAGRAM -> {
                String name = u.getAttribute("username");
                if (name == null || name.isEmpty()) name = u.getAttribute(K_NAME);
                yield name;
            }
            default         -> u.getAttribute(K_NAME);
        };
    }
}