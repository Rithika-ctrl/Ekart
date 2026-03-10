// package com.example.ekart.config;

// import com.example.ekart.service.CustomOAuth2UserService;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.security.config.annotation.web.builders.HttpSecurity;
// import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
// import org.springframework.security.web.SecurityFilterChain;
// import org.springframework.web.cors.CorsConfiguration;
// import org.springframework.web.cors.CorsConfigurationSource;
// import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

// import java.util.List;

// /**
//  * ✅ UPDATED SecurityConfig — Added CORS for Flutter/mobile API access
//  *
//  * Replace: src/main/java/com/example/ekart/config/SecurityConfig.java
//  *
//  * Changes from original:
//  *   1. Added corsConfigurationSource() bean
//  *   2. Added .cors(...) to the filter chain
//  *   Everything else is unchanged.
//  */
// @Configuration
// @EnableWebSecurity
// public class SecurityConfig {

//     @Autowired
//     private CustomOAuth2UserService customOAuth2UserService;

//     @Autowired
//     private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

//     @Bean
//     public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
//         http
//             // ✅ NEW: Enable CORS so Flutter app can call the API
//             .cors(cors -> cors.configurationSource(corsConfigurationSource()))

//             // CSRF disabled (existing app uses custom session auth)
//             .csrf(csrf -> csrf.disable())

//             // Authorization
//             .authorizeHttpRequests(auth -> auth
//                 .requestMatchers(
//                     "/", "/guest/**",
//                     "/customer/login", "/customer/register",
//                     "/customer/otp/**", "/customer/forgot-password", "/customer/reset-password/**",
//                     "/vendor/login", "/vendor/register", "/vendor/otp/**", "/vendor/forgot-password",
//                     "/vendor/reset-password/**", "/admin/login", "/admin-login.html",
//                     "/static/**", "/css/**", "/js/**",
//                     "/api/**"   // ✅ All /api/** routes are public (JWT handles auth internally)
//                 ).permitAll()
//                 .anyRequest().permitAll()
//             )

//             // OAuth2 Login — only for web, not API routes
//             .oauth2Login(oauth2 -> oauth2
//                 .loginPage("/customer/login")
//                 .userInfoEndpoint(userInfo -> userInfo
//                     .userService(customOAuth2UserService)
//                 )
//                 .successHandler(oAuth2LoginSuccessHandler)
//             )

//             // ✅ For API routes: return 401 instead of redirecting to login page
//             .exceptionHandling(ex -> ex
//                 .defaultAuthenticationEntryPointFor(
//                     (request, response, authException) -> {
//                         response.setStatus(401);
//                         response.setContentType("application/json");
//                         response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized\"}");
//                     },
//                     new org.springframework.security.web.util.matcher.AntPathRequestMatcher("/api/flutter/**")
//                 )
//             )

//             .formLogin(form -> form.disable());

//         return http.build();
//     }

//     /**
//      * ✅ NEW: CORS configuration — allows Flutter app and any web client to call the API
//      */
//     @Bean
//     public CorsConfigurationSource corsConfigurationSource() {
//         CorsConfiguration config = new CorsConfiguration();

//         // Allow all origins (Flutter mobile, web browsers, Postman)
//         config.setAllowedOriginPatterns(List.of("*"));

//         // Allow all HTTP methods
//         config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

//         // Allow all headers including custom Flutter headers
//         config.setAllowedHeaders(List.of("*"));
//         config.setExposedHeaders(List.of("*"));

//         // Must be false when using wildcard origins
//         config.setAllowCredentials(false);

//         // Cache preflight for 1 hour
//         config.setMaxAge(3600L);

//         UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
//         source.registerCorsConfiguration("/**", config);
//         return source;
//     }
// }


package com.example.ekart.config;

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

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private CustomOAuth2UserService customOAuth2UserService;

    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    /**
     * ✅ CHAIN 1 — Handles ALL /api/flutter/** requests.
     * Completely stateless: no session, no OAuth2, no redirects.
     * Runs FIRST (Order=1) so OAuth2 chain never sees these requests.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain flutterApiFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/flutter/**")          // Only match Flutter API paths
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()                // All /api/flutter/** = public
            );
        // No formLogin, no OAuth2 — pure REST
        return http.build();
    }

    /**
     * ✅ CHAIN 2 — Handles all other web routes (website, admin, OAuth2 login etc.)
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
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}