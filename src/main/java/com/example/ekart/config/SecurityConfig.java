package com.example.ekart.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

import com.example.ekart.service.CustomOAuth2UserService;

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
            // CSRF disabled for stateless API operations (existing app uses custom session auth)
            .csrf(csrf -> csrf.disable())
            
            // Authorization: Allow public endpoints, custom session-based auth for protected routes
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/", "/guest/**", "/customer/login", "/customer/register", 
                                "/customer/otp/**", "/customer/forgot-password", "/customer/reset-password/**",
                                "/vendor/login", "/vendor/register", "/vendor/otp/**", "/vendor/forgot-password",
                                "/vendor/reset-password/**", "/admin/login", "/admin-login.html",
                                "/static/**", "/css/**", "/js/**", "/api/**")
                    .permitAll()
                // All other requests allowed (existing app uses custom HttpSession-based auth in controllers)
                .anyRequest().permitAll()
            )
            
            // Configure OAuth2 Login
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/customer/login")
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
                .successHandler(oAuth2LoginSuccessHandler)
            )
            
            // Allow form login to coexist
            .formLogin(form -> form.disable());

        return http.build();
    }
}
