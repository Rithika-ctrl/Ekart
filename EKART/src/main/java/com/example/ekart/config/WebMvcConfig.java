package com.example.ekart.config;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/config/WebMvcConfig.java
// REPLACE your existing file with this complete version.
// Change from original: registered DeliveryBoyAuthGuard for /delivery/** routes
// ================================================================

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.example.ekart.middleware.AuthGuard;
import com.example.ekart.middleware.DeliveryBoyAuthGuard;
import com.example.ekart.middleware.IndiaOnlyInterceptor;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired private AuthGuard             authGuard;
    @Autowired private IndiaOnlyInterceptor  indiaOnlyInterceptor;
    @Autowired private DeliveryBoyAuthGuard  deliveryBoyAuthGuard;  // NEW

    @Override
    public void addInterceptors(InterceptorRegistry registry) {

        // Order 1 — Geo-block: runs first on every request
        registry.addInterceptor(indiaOnlyInterceptor)
            .addPathPatterns("/**")
            .excludePathPatterns(
                "/blocked",
                "/css/**", "/js/**", "/images/**", "/static/**",
                "/api/flutter/**"
            )
            .order(1);

        // Order 2 — RBAC guard: protects admin routes
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

        // Order 3 — Delivery boy auth guard: protects /delivery/** routes  NEW
        registry.addInterceptor(deliveryBoyAuthGuard)
            .addPathPatterns("/delivery/**")
            .excludePathPatterns(
                "/delivery/login",
                "/delivery/register",
                "/delivery/pending",
                "/delivery/warehouses",
                "/delivery/otp/**",
                "/css/**", "/js/**", "/images/**", "/static/**"
            )
            .order(3);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Static resources (CSS, JS, images, media) cached for 1 year
        // Vite includes content hash in filenames, so aggressive caching is safe
        registry
                .addResourceHandler("/static/**", "/css/**", "/js/**", "/media/**", "/images/**")
                .addResourceLocations("classpath:/static/", "classpath:/public/")
                .setCachePeriod(31536000);

        // Root-level assets (favicon, robots.txt, CSV uploads)
        registry
                .addResourceHandler("/favicon.ico", "/robots.txt", "/sample-product-upload.csv")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(31536000);
    }
}