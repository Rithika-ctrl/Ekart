package com.example.ekart.controller;

import org.springframework.web.bind.annotation.CrossOrigin; // 1. Add this import
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ekart.dto.Customer;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.JwtUtil;
import com.example.ekart.repository.CustomerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * ✅ REST API — Authentication (Login + Register)
 * Used by Flutter mobile app.
 *
 * Place in: src/main/java/com/example/ekart/controller/AuthApiController.java
 *
 * Endpoints:
 *   POST /api/auth/login     → { email, password } → { token, customer }
 *   POST /api/auth/register  → { name, email, password, mobile } → { message }
 *   GET  /api/auth/me        → Bearer token → { customer }
 */
@RestController
@RequestMapping("/api/flutter/auth")
@CrossOrigin(origins = "*") // Allow Flutter, web, any origin
public class AuthApiController {

    // ── S1192 String constants ──
    private static final String K_CUSTOMER                          = "customer";
    private static final String K_MESSAGE                           = "message";
    private static final String K_SUCCESS                           = "success";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CustomerRepository customerRepository;
    private final JwtUtil jwtUtil;

    public AuthApiController(
            CustomerRepository customerRepository,
            JwtUtil jwtUtil) {
        this.customerRepository = customerRepository;
        this.jwtUtil = jwtUtil;
    }




    // ── LOGIN ──────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();

        String email    = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Email and password are required");
            return ResponseEntity.badRequest().body(res);
        }

        Customer customer = customerRepository.findByEmail(email);

        if (customer == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "No account found with this email");
            return ResponseEntity.status(401).body(res);
        }

        if (!customer.isVerified()) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Account not verified. Please verify OTP first.");
            return ResponseEntity.status(403).body(res);
        }

        if (!customer.isActive()) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Your account has been deactivated. Contact support.");
            return ResponseEntity.status(403).body(res);
        }

        String decrypted = AES.decrypt(customer.getPassword());
        if (decrypted == null || !decrypted.equals(password)) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Incorrect password");
            return ResponseEntity.status(401).body(res);
        }

        // Generate JWT token
        String token = jwtUtil.generateToken(
                customer.getId(),
                customer.getEmail(),
                customer.getRole().name()
        );

        res.put(K_SUCCESS, true);
        res.put("token", token);
        res.put(K_CUSTOMER, buildCustomerMap(customer));
        return ResponseEntity.ok(res);
    }

    // ── REGISTER ───────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();

        String name     = (String) body.get("name");
        String email    = (String) body.get("email");
        String password = (String) body.get("password");
        String mobile   = String.valueOf(body.get("mobile"));

        // Basic validation
        if (name == null || email == null || password == null || mobile == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "All fields are required");
            return ResponseEntity.badRequest().body(res);
        }

        if (customerRepository.findByEmail(email) != null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Email already registered");
            return ResponseEntity.status(409).body(res);
        }

        Customer customer = new Customer();
        customer.setName(name);
        customer.setEmail(email);
        customer.setPassword(AES.encrypt(password));
        customer.setMobile(Long.parseLong(mobile));
        customer.setVerified(true); // For mobile: auto-verify (or implement OTP separately)
        customer.setActive(true);

        customerRepository.save(customer);

        // Auto-login after register
        String token = jwtUtil.generateToken(
                customer.getId(),
                customer.getEmail(),
                customer.getRole().name()
        );

        res.put(K_SUCCESS, true);
        res.put(K_MESSAGE, "Registration successful");
        res.put("token", token);
        res.put(K_CUSTOMER, buildCustomerMap(customer));
        return ResponseEntity.ok(res);
    }

    // ── GET CURRENT USER (verify token) ───────────────────────────────────
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Map<String, Object> res = new HashMap<>();
        String token = extractToken(authHeader);

        if (token == null || !jwtUtil.isValid(token)) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Invalid or expired token");
            return ResponseEntity.status(401).body(res);
        }

        int customerId = jwtUtil.getCustomerId(token);
        Customer customer = customerRepository.findById(customerId).orElse(null);

        if (customer == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Customer not found");
            return ResponseEntity.status(404).body(res);
        }

        res.put(K_SUCCESS, true);
        res.put(K_CUSTOMER, buildCustomerMap(customer));
        return ResponseEntity.ok(res);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────

    /** Strip "Bearer " prefix from Authorization header */
    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    /** Build safe customer map (never expose password) */
    public static Map<String, Object> buildCustomerMap(Customer c) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",           c.getId());
        m.put("name",         c.getName());
        m.put("email",        c.getEmail());
        m.put("mobile",       c.getMobile());
        m.put("role",         c.getRole().name());
        m.put("verified",     c.isVerified());
        m.put("active",       c.isActive());
        m.put("profileImage", c.getProfileImage());
        m.put("provider",     c.getProvider());
        return m;
    }
}