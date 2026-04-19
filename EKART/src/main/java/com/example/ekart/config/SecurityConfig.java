package com.example.ekart.config;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/config/SecurityConfig.java
// REPLACE your existing file with this complete version.
// Change from original: added /delivery/login and /delivery/otp/**
//   to the permitAll list so delivery boys can reach login without auth.
// ================================================================

import com.example.ekart.service.CustomOAuth2UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.ekart.middleware.ReactAuthFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CustomOAuth2UserService customOAuth2UserService;
    private final ReactAuthFilter reactAuthFilter;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    public SecurityConfig(
            CustomOAuth2UserService customOAuth2UserService,
            ReactAuthFilter reactAuthFilter,
            OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler) {
        this.customOAuth2UserService = customOAuth2UserService;
        this.reactAuthFilter = reactAuthFilter;
        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
    }





    /**
     * CHAIN 1 — Handles all REST API requests (/api/react/** and deprecated /api/flutter/**).
     * Completely stateless: no session, no OAuth2, no redirects.
     * Runs FIRST (Order=1) so OAuth2 chain never sees these requests.
     *
     * SECURITY CONTEXT:
     *   - /api/react/** uses JWT via ReactAuthFilter and role-based matchers below
     *   - /api/flutter/** is explicitly kept permitAll for backward compatibility
     *     (deprecated controller path; clients should migrate to /api/react/**)
     */
    @Bean
    @Order(1)
    public SecurityFilterChain reactApiFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/react/**", "/api/flutter/**")
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Deprecated Flutter API remains explicit for compatibility.
                .requestMatchers("/api/flutter/**").permitAll()

                // React public endpoints.
                .requestMatchers(
                    "/api/react/auth/**",
                    "/api/react/products/**",
                    "/api/react/banners",
                    "/api/react/home-banners",
                    "/api/react/assistant/chat"
                ).permitAll()

                // Role-based React API protection.
                .requestMatchers("/api/react/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/react/warehouse/**").hasRole("WAREHOUSE")
                .requestMatchers("/api/react/vendor/**").hasRole("VENDOR")
                .requestMatchers("/api/react/delivery/**").hasRole("DELIVERY")

                // All remaining React routes require any authenticated JWT role.
                .anyRequest().authenticated()
            )
            // JWT validation for /api/react/**; the filter builds Spring Security auth context.
            .addFilterBefore(reactAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * CHAIN 2 — Handles all other web routes (website, admin, OAuth2 login etc.)
     * Runs SECOND (Order=2).
     * 
     * SECURITY: Enforces role-based URL protection for Thymeleaf routes.
     * - Public routes are permitAll
     * - Protected routes require authenticated users
     * - Invalid roles are rejected at framework level (defense-in-depth with AuthGuard)
     */
    @Bean
    @Order(2)
    public SecurityFilterChain webFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // ── Public routes (anyone can access) ────────────────────────────
                .requestMatchers(
                    "/", "/guest/**",
                    "/static/**", "/css/**", "/js/**", "/images/**",
                    "/oauth2/**", "/login/oauth2/**",
                    "/admin/test-data/**"
                ).permitAll()
                
                // ── Authentication routes (unauthenticated users only) ───────────
                .requestMatchers(
                    "/customer/login", "/customer/register",
                    "/customer/otp/**", "/customer/forgot-password", "/customer/reset-password/**",
                    "/vendor/login", "/vendor/register", "/vendor/otp/**", "/vendor/forgot-password",
                    "/vendor/reset-password/**", "/admin/login", "/admin-login.html",
                    "/delivery/login", "/delivery/register", "/delivery/pending",
                    "/delivery/warehouses", "/delivery/otp/**"
                ).permitAll()
                
                // ── Admin-only routes (requires ROLE_ADMIN) ─────────────────────
                .requestMatchers("/admin/**").hasRole("ADMIN")
                
                // ── Vendor routes (requires ROLE_VENDOR) ──────────────────────
                .requestMatchers("/vendor/**").hasRole("VENDOR")
                
                // ── Customer routes (requires ROLE_CUSTOMER or ROLE_DELIVERY) ──
                .requestMatchers("/customer/**").hasAnyRole("CUSTOMER", "DELIVERY")
                
                // ── Delivery routes (requires ROLE_DELIVERY) ──────────────────
                .requestMatchers("/delivery/**").hasRole("DELIVERY")
                
                // ── Deny all other requests ───────────────────────────────────
                .anyRequest().denyAll()
            )
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/customer/login")
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
                .successHandler(oAuth2LoginSuccessHandler)
            )
            .formLogin(form -> form.disable());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}