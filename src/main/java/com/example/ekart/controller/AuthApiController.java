
/**
 * File: AuthApiController.java
 * Description: REST API controller for authentication (login, register, get current user) for Flutter mobile app.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import org.springframework.web.bind.annotation.CrossOrigin; // 1. Add this import
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ekart.dto.Customer;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.JwtUtil;
import com.example.ekart.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private JwtUtil jwtUtil;

    // ── LOGIN ──────────────────────────────────────────────────────────────
    /**
     * Login endpoint for Flutter app.
     * @param body Map containing email and password
     * @return ResponseEntity with JWT token and customer info if successful
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();

        String email    = body.get("email");
        String password = body.get("password");

        // Validate input fields
        if (email == null || password == null) {
            res.put("success", false);
            res.put("message", "Email and password are required");
            return ResponseEntity.badRequest().body(res);
        }

        // Fetch customer by email
        Customer customer = customerRepository.findByEmail(email);

        if (customer == null) {
            // No account found for this email
            res.put("success", false);
            res.put("message", "No account found with this email");
            return ResponseEntity.status(401).body(res);
        }

        if (!customer.isVerified()) {
            // Account not verified
            res.put("success", false);
            res.put("message", "Account not verified. Please verify OTP first.");
            return ResponseEntity.status(403).body(res);
        }

        if (!customer.isActive()) {
            // Account deactivated
            res.put("success", false);
            res.put("message", "Your account has been deactivated. Contact support.");
            return ResponseEntity.status(403).body(res);
        }

        // Decrypt and check password
        String decrypted = AES.decrypt(customer.getPassword());
        if (decrypted == null || !decrypted.equals(password)) {
            res.put("success", false);
            res.put("message", "Incorrect password");
            return ResponseEntity.status(401).body(res);
        }

        // Generate JWT token for authenticated user
        String token = jwtUtil.generateToken(
            customer.getId(),
            customer.getEmail(),
            customer.getRole().name()
        );

        res.put("success", true);
        res.put("token", token);
        res.put("customer", buildCustomerMap(customer));
        return ResponseEntity.ok(res);
    }

    // ── REGISTER ───────────────────────────────────────────────────────────
    /**
     * Register endpoint for Flutter app.
     * @param body Map containing name, email, password, mobile
     * @return ResponseEntity with registration result and JWT token
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();

        String name     = (String) body.get("name");
        String email    = (String) body.get("email");
        String password = (String) body.get("password");
        String mobile   = String.valueOf(body.get("mobile"));

        // Basic validation for required fields
        if (name == null || email == null || password == null || mobile == null) {
            res.put("success", false);
            res.put("message", "All fields are required");
            return ResponseEntity.badRequest().body(res);
        }

        // Check if email already registered
        if (customerRepository.findByEmail(email) != null) {
            res.put("success", false);
            res.put("message", "Email already registered");
            return ResponseEntity.status(409).body(res);
        }

        // Create new customer entity
        Customer customer = new Customer();
        customer.setName(name);
        customer.setEmail(email);
        customer.setPassword(AES.encrypt(password));
        customer.setMobile(Long.parseLong(mobile));
        customer.setVerified(true); // For mobile: auto-verify (or implement OTP separately)
        customer.setActive(true);

        // Save customer to database
        customerRepository.save(customer);

        // Auto-login after register: generate JWT token
        String token = jwtUtil.generateToken(
            customer.getId(),
            customer.getEmail(),
            customer.getRole().name()
        );

        res.put("success", true);
        res.put("message", "Registration successful");
        res.put("token", token);
        res.put("customer", buildCustomerMap(customer));
        return ResponseEntity.ok(res);
    }

    // ── GET CURRENT USER (verify token) ───────────────────────────────────
        /**
         * Get current user info from JWT token.
         * @param authHeader Authorization header with Bearer token
         * @return ResponseEntity with customer info if token is valid
         */
        @GetMapping("/me")
        public ResponseEntity<Map<String, Object>> me(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Map<String, Object> res = new HashMap<>();
        // Extract token from Authorization header
        String token = extractToken(authHeader);

        if (token == null || !jwtUtil.isValid(token)) {
            // Token missing or invalid
            res.put("success", false);
            res.put("message", "Invalid or expired token");
            return ResponseEntity.status(401).body(res);
        }

        // Get customer ID from token and fetch customer
        int customerId = jwtUtil.getCustomerId(token);
        Customer customer = customerRepository.findById(customerId).orElse(null);

        if (customer == null) {
            // Customer not found in database
            res.put("success", false);
            res.put("message", "Customer not found");
            return ResponseEntity.status(404).body(res);
        }

        res.put("success", true);
        res.put("customer", buildCustomerMap(customer));
        return ResponseEntity.ok(res);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────

    /**
     * Strip "Bearer " prefix from Authorization header.
     * @param authHeader Authorization header string
     * @return JWT token string or null if not present
     */
    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    /**
     * Build safe customer map for API response (never exposes password).
     * @param c Customer entity
     * @return Map with customer fields for API response
     */
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