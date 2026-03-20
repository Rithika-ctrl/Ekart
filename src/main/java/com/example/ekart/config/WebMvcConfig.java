package com.example.ekart.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.example.ekart.middleware.AuthGuard;
import com.example.ekart.middleware.IndiaOnlyInterceptor;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired private AuthGuard authGuard;
    @Autowired private IndiaOnlyInterceptor indiaOnlyInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {

        // Geo-block: runs first on every request
        registry.addInterceptor(indiaOnlyInterceptor)
            .addPathPatterns("/**")
            .excludePathPatterns(
                "/blocked",
                "/css/**", "/js/**", "/images/**", "/static/**",
                "/api/flutter/**"
            )
            .order(1);

        // RBAC guard: protects admin routes
        registry.addInterceptor(authGuard)
            .addPathPatterns(
                "/admin/**",
                "/api/admin/**",
                "/refund-management/**",
                "/content-management/**",
                "/security-settings/**",
                "/order-management/**",
                "/reports/**"
            )
            .excludePathPatterns(
                "/admin/login",
                "/css/**", "/js/**", "/images/**", "/static/**"
            )
            .order(2);
    }
}