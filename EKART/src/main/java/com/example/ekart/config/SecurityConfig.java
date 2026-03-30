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

    @Autowired
    private CustomOAuth2UserService customOAuth2UserService;

    @Autowired
    private ReactAuthFilter reactAuthFilter;

    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    /**
     * CHAIN 1 — Handles ALL /api/flutter/** requests.
     * Completely stateless: no session, no OAuth2, no redirects.
     * Runs FIRST (Order=1) so OAuth2 chain never sees these requests.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain reactApiFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/react/**")
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            )
            // JWT validation — rejects requests missing/invalid token on protected endpoints.
            // Public endpoints (auth/**, products/**, assistant/chat) are whitelisted inside
            // the filter itself, so they pass through regardless.
            .addFilterBefore(reactAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * CHAIN 2 — Handles all other web routes (website, admin, OAuth2 login etc.)
     * Runs SECOND (Order=2).
     */
    @Bean
    @Order(2)
    public SecurityFilterChain webFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/", "/guest/**",
                    "/customer/login", "/customer/register",
                    "/customer/otp/**", "/customer/forgot-password", "/customer/reset-password/**",
                    "/vendor/login", "/vendor/register", "/vendor/otp/**", "/vendor/forgot-password",
                    "/vendor/reset-password/**", "/admin/login", "/admin-login.html",
                    // ── delivery boy public routes ────────────────────────
                    "/delivery/login", "/delivery/register", "/delivery/pending",
                    "/delivery/warehouses", "/delivery/otp/**",
                    // ────────────────────────────────────────────────────
                    "/static/**", "/css/**", "/js/**", "/images/**",
                    "/api/**"
                ).permitAll()
                .anyRequest().permitAll()
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