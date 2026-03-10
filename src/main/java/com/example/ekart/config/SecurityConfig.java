package com.example.ekart.config;

import com.example.ekart.service.CustomOAuth2UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * ✅ UPDATED SecurityConfig — Added CORS for Flutter/mobile API access
 *
 * Replace: src/main/java/com/example/ekart/config/SecurityConfig.java
 *
 * Changes from original:
 *   1. Added corsConfigurationSource() bean
 *   2. Added .cors(...) to the filter chain
 *   Everything else is unchanged.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private CustomOAuth2UserService customOAuth2UserService;

    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ✅ NEW: Enable CORS so Flutter app can call the API
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // CSRF disabled (existing app uses custom session auth)
            .csrf(csrf -> csrf.disable())

            // Authorization
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/", "/guest/**",
                    "/customer/login", "/customer/register",
                    "/customer/otp/**", "/customer/forgot-password", "/customer/reset-password/**",
                    "/vendor/login", "/vendor/register", "/vendor/otp/**", "/vendor/forgot-password",
                    "/vendor/reset-password/**", "/admin/login", "/admin-login.html",
                    "/static/**", "/css/**", "/js/**",
                    "/api/**"   // ✅ All /api/** routes are public (JWT handles auth internally)
                ).permitAll()
                .anyRequest().permitAll()
            )

            // OAuth2 Login
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

    /**
     * ✅ NEW: CORS configuration — allows Flutter app and any web client to call the API
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Allow all origins (Flutter mobile, web browsers, Postman)
        config.setAllowedOriginPatterns(List.of("*"));

        // Allow all HTTP methods
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Allow all headers including Authorization (for JWT Bearer token)
        config.setAllowedHeaders(List.of("*"));

        // Allow credentials (cookies, auth headers)
        config.setAllowCredentials(true);

        // Cache preflight for 1 hour
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}