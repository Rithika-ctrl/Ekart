package com.example.ekart.config;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/config/WebMvcConfig.java
// FIXES:
//   - Registered DeliveryJwtInterceptor for /api/react/delivery/** routes
//     so that deliveryBoyId is set on the request and the availability
//     toggle (and other JWT-protected delivery endpoints) work correctly.
// ================================================================

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.example.ekart.middleware.AuthGuard;
import com.example.ekart.middleware.DeliveryBoyAuthGuard;
import com.example.ekart.middleware.DeliveryJwtInterceptor;
import com.example.ekart.middleware.IndiaOnlyInterceptor;
import com.example.ekart.deprecation.ThymeleafDeprecationInterceptor;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final AuthGuard authGuard;
    private final IndiaOnlyInterceptor indiaOnlyInterceptor;
    private final DeliveryBoyAuthGuard deliveryBoyAuthGuard;
    private final DeliveryJwtInterceptor deliveryJwtInterceptor;
    private final ThymeleafDeprecationInterceptor deprecationInterceptor;

    public WebMvcConfig(
            AuthGuard authGuard,
            IndiaOnlyInterceptor indiaOnlyInterceptor,
            DeliveryBoyAuthGuard deliveryBoyAuthGuard,
            DeliveryJwtInterceptor deliveryJwtInterceptor,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
            ThymeleafDeprecationInterceptor deprecationInterceptor) {
        this.authGuard = authGuard;
        this.indiaOnlyInterceptor = indiaOnlyInterceptor;
        this.deliveryBoyAuthGuard = deliveryBoyAuthGuard;
        this.deliveryJwtInterceptor = deliveryJwtInterceptor;
        this.deprecationInterceptor = deprecationInterceptor;
    }



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

        // Order 3 — Delivery boy auth guard: protects /delivery/** (session-based) routes
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

        // Order 4 — FIX: DeliveryJwtInterceptor was defined but never registered.
        // This interceptor reads the Bearer token and sets request.setAttribute("deliveryBoyId").
        // Without it, all /api/react/delivery/** endpoints (profile, orders, toggle, pickup,
        // deliver, warehouse-change) return 401 "Authentication failed: No valid JWT token".
        registry.addInterceptor(deliveryJwtInterceptor)
            .addPathPatterns("/api/react/delivery/**")
            .excludePathPatterns(
                "/api/react/auth/delivery/**",
                "/css/**", "/js/**", "/images/**", "/static/**"
            )
            .order(4);

        // Order 5 — Deprecation tracking: monitors Thymeleaf route usage
        if (deprecationInterceptor != null) {
            registry.addInterceptor(deprecationInterceptor)
                .addPathPatterns(
                    "/customer/**",
                    "/vendor/**",
                    "/admin/**",
                    "/guest/**",
                    "/view-products",
                    "/view-cart",
                    "/search-products",
                    "/payment",
                    "/success",
                    "/order-*",
                    "/track-*",
                    "/cancel-order/**",
                    "/request-*/**",
                    "/add-review",
                    "/approve-products",
                    "/change/**",
                    "/refund-management",
                    "/content-management",
                    "/security-settings"
                )
                .excludePathPatterns(
                    "/api/**",
                    "/css/**", "/js/**", "/images/**", "/static/**"
                )
                .order(5);
        }
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