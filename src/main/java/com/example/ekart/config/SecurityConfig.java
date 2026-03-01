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
            // Disable CSRF for simplicity (existing app doesn't use it)
            .csrf(csrf -> csrf.disable())
            
            // Permit all requests - existing auth is session-based, not Spring Security
            .authorizeHttpRequests(auth -> auth
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
