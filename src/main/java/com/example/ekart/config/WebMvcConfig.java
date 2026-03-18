package com.example.ekart.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.example.ekart.middleware.AuthGuard;

/**
 * Web MVC Configuration for registering interceptors.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private AuthGuard authGuard;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
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
                "/css/**",
                "/js/**",
                "/images/**",
                "/static/**"
            );
    }
}