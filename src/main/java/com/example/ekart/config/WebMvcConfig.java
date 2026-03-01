package com.example.ekart.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.example.ekart.middleware.AuthGuard;

/**
 * Web MVC Configuration for registering interceptors.
 * Keeps RBAC logic separate from main application to avoid Git conflicts.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private AuthGuard authGuard;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authGuard)
            .addPathPatterns(
                "/admin/**",           // All admin routes
                "/refund-management/**",
                "/content-management/**",
                "/security-settings/**",
                "/order-management/**",
                "/reports/**"
            )
            .excludePathPatterns(
                "/admin/login",        // Allow login page access
                "/css/**",
                "/js/**",
                "/images/**",
                "/static/**"
            );
    }
}
