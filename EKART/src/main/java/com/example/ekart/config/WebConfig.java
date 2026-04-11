package com.example.ekart.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import com.example.ekart.middleware.DeprecationInterceptor;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * WebConfig.java
 * ─────────────────────────────────────────────────────────────────────────────
 * Registers Spring MVC interceptors and configures web request handling.
 * 
 * Currently registers:
 *  - DeprecationInterceptor: Monitors legacy Thymeleaf route access
 * 
 * Future interceptors can be registered here:
 *  - RequestLoggingInterceptor
 *  - SecurityHeadersInterceptor
 *  - CacheControlInterceptor
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private DeprecationInterceptor deprecationInterceptor;

    /**
     * Register all interceptors with Spring MVC.
     * Interceptors are executed in registration order.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Deprecation interceptor runs first to detect legacy route access
        registry.addInterceptor(deprecationInterceptor)
                .addPathPatterns("/**")  // Apply to all paths
                .excludePathPatterns(
                    "/api/**",           // Exclude API routes (new React endpoints)
                    "/static/**",        // Exclude static resources
                    "/css/**",           // Exclude CSS
                    "/js/**",            // Exclude JavaScript
                    "/images/**",        // Exclude images
                    "/media/**"          // Exclude media files
                );
    }
}
