package com.example.ekart.controller;

import com.example.ekart.dto.Coupon;
import com.example.ekart.repository.CouponRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Controller
public class CouponController {

    @Autowired
    private CouponRepository couponRepository;

    // ── ADMIN: View all coupons ──────────────────────────────────────
    @GetMapping("/admin/coupons")
    public String adminCoupons(HttpSession session, ModelMap map) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Login first");
            return "redirect:/admin/login";
        }
        List<Coupon> allCoupons = couponRepository.findAllByOrderByIdDesc();
        map.put("coupons", allCoupons);
        map.put("activeCoupons", allCoupons.stream().filter(Coupon::isActive).count());
        map.put("totalUses", allCoupons.stream().mapToInt(Coupon::getUsedCount).sum());
        return "admin-coupons.html";
    }

    // ── ADMIN: Create coupon ─────────────────────────────────────────
    @PostMapping("/admin/coupons/create")
    public String createCoupon(
            @RequestParam String code,
            @RequestParam String description,
            @RequestParam String type,
            @RequestParam double value,
            @RequestParam(defaultValue = "0") double minOrderAmount,
            @RequestParam(defaultValue = "0") double maxDiscount,
            @RequestParam(defaultValue = "0") int usageLimit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            HttpSession session) {

        if (session.getAttribute("admin") == null) return "redirect:/admin/login";

        // Check duplicate
        if (couponRepository.findByCode(code.toUpperCase().trim()).isPresent()) {
            session.setAttribute("failure", "Coupon code '" + code.toUpperCase() + "' already exists!");
            return "redirect:/admin/coupons";
        }

        Coupon coupon = new Coupon();
        coupon.setCode(code.toUpperCase().trim());
        coupon.setDescription(description);
        coupon.setType(Coupon.CouponType.valueOf(type));
        coupon.setValue(value);
        coupon.setMinOrderAmount(minOrderAmount);
        coupon.setMaxDiscount(maxDiscount);
        coupon.setUsageLimit(usageLimit);
        coupon.setExpiryDate(expiryDate);
        coupon.setActive(true);
        couponRepository.save(coupon);

        session.setAttribute("success", "Coupon '" + coupon.getCode() + "' created successfully!");
        return "redirect:/admin/coupons";
    }

    // ── ADMIN: Toggle active/inactive ───────────────────────────────
    @PostMapping("/admin/coupons/toggle/{id}")
    public String toggleCoupon(@PathVariable int id, HttpSession session) {
        if (session.getAttribute("admin") == null) return "redirect:/admin/login";
        couponRepository.findById(id).ifPresent(c -> {
            c.setActive(!c.isActive());
            couponRepository.save(c);
        });
        return "redirect:/admin/coupons";
    }

    // ── ADMIN: Delete coupon ─────────────────────────────────────────
    @PostMapping("/admin/coupons/delete/{id}")
    public String deleteCoupon(@PathVariable int id, HttpSession session) {
        if (session.getAttribute("admin") == null) return "redirect:/admin/login";
        couponRepository.deleteById(id);
        session.setAttribute("success", "Coupon deleted.");
        return "redirect:/admin/coupons";
    }

    // ── CUSTOMER: View available coupons page ───────────────────────
    @GetMapping("/customer/coupons")
    public String customerCoupons(HttpSession session, ModelMap map) {
        if (session.getAttribute("customer") == null) {
            session.setAttribute("failure", "Login first");
            return "redirect:/customer/login";
        }
        List<Coupon> activeCoupons = couponRepository.findByActiveTrue();
        // Only show unexpired + within usage limit
        List<Coupon> valid = activeCoupons.stream()
                .filter(Coupon::isValid)
                .toList();
        map.put("coupons", valid);
        map.put("customer", session.getAttribute("customer"));
        return "customer-coupons.html";
    }

    // ── API: Validate coupon (called by cart page) ───────────────────
    @GetMapping("/api/coupon/validate")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> validateCoupon(
            @RequestParam String code,
            @RequestParam(defaultValue = "0") double amount,
            HttpSession session) {

        Map<String, Object> res = new HashMap<>();
        if (session.getAttribute("customer") == null) {
            res.put("success", false);
            res.put("message", "Please login to apply coupon");
            return ResponseEntity.ok(res);
        }

        Optional<Coupon> opt = couponRepository.findByCode(code.toUpperCase().trim());
        if (opt.isEmpty()) {
            res.put("success", false);
            res.put("message", "Invalid coupon code");
            return ResponseEntity.ok(res);
        }

        Coupon coupon = opt.get();
        if (!coupon.isValid()) {
            res.put("success", false);
            res.put("message", "This coupon has expired or reached its usage limit");
            return ResponseEntity.ok(res);
        }

        if (amount < coupon.getMinOrderAmount()) {
            res.put("success", false);
            res.put("message", "Minimum order amount ₹" + (int)coupon.getMinOrderAmount() + " required for this coupon");
            return ResponseEntity.ok(res);
        }

        double discount = coupon.calculateDiscount(amount);
        res.put("success", true);
        res.put("code", coupon.getCode());
        res.put("description", coupon.getDescription());
        res.put("type", coupon.getType().name());
        res.put("value", coupon.getValue());
        res.put("discount", discount);
        res.put("typeLabel", coupon.getTypeLabel());
        res.put("message", coupon.getDescription() + " — saving ₹" + (int)discount);
        return ResponseEntity.ok(res);
    }

    // ── API: Get all active coupons (for cart page display) ─────────
    @GetMapping("/api/coupons/active")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getActiveCoupons(HttpSession session) {
        List<Coupon> coupons = couponRepository.findByActiveTrue();
        List<Map<String, Object>> result = coupons.stream()
                .filter(Coupon::isValid)
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("code", c.getCode());
                    m.put("description", c.getDescription());
                    m.put("typeLabel", c.getTypeLabel());
                    m.put("minOrderAmount", c.getMinOrderAmount());
                    m.put("expiryDate", c.getExpiryDate() != null ? c.getExpiryDate().toString() : null);
                    return m;
                }).toList();
        return ResponseEntity.ok(result);
    }

    // ── API: Increment usedCount after successful order ──────────────
    @PostMapping("/api/coupon/use")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> useCoupon(
            @RequestParam String code, HttpSession session) {
        Map<String, Object> res = new HashMap<>();
        if (session.getAttribute("customer") == null) {
            res.put("success", false); return ResponseEntity.ok(res);
        }
        couponRepository.findByCode(code.toUpperCase()).ifPresent(c -> {
            c.setUsedCount(c.getUsedCount() + 1);
            couponRepository.save(c);
        });
        res.put("success", true);
        return ResponseEntity.ok(res);
    }
}