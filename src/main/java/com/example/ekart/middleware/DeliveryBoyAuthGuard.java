package com.example.ekart.middleware;

import com.example.ekart.dto.DeliveryBoy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Protects all /delivery/** routes (except login/otp).
 * Redirects to /delivery/login if no deliveryBoy in session.
 *
 * Register this in WebMvcConfig.addInterceptors():
 *
 *   registry.addInterceptor(deliveryBoyAuthGuard)
 *       .addPathPatterns("/delivery/**")
 *       .excludePathPatterns(
 *           "/delivery/login", "/delivery/otp/**",
 *           "/css/**", "/js/**", "/images/**"
 *       )
 *       .order(3);
 */
@Component
public class DeliveryBoyAuthGuard implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                              HttpServletResponse response,
                              Object handler) throws Exception {
        HttpSession session = request.getSession(false);
        if (session != null) {
            DeliveryBoy db = (DeliveryBoy) session.getAttribute("deliveryBoy");
            if (db != null && db.isVerified() && db.isActive() && db.isAdminApproved()) {
                return true;
            }
        }
        response.sendRedirect("/delivery/login");
        return false;
    }
}