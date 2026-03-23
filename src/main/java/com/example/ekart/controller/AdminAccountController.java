/**
 * File: AdminAccountController.java
 * Description: Admin account management endpoints and pages.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.example.ekart.service.AdminAccountService;

import jakarta.servlet.http.HttpSession;

/**
 * Admin Account Controller for User Oversight Dashboard.
 * Provides endpoints for managing customer accounts.
 */
@Controller
public class AdminAccountController {

    @Autowired
    private AdminAccountService adminAccountService;

    // ==================== PAGE ROUTES ====================

    /**
     * Admin accounts oversight page.
     */
    @GetMapping("/admin/accounts")
    public String loadAccountsPage(HttpSession session, ModelMap map) {
        // Get all accounts with metadata
        List<Map<String, Object>> accounts = adminAccountService.getAllAccountsWithMetadata();
        map.put("accounts", accounts);
        
        // Get stats
        Map<String, Object> stats = adminAccountService.getAccountStats();
        map.put("stats", stats);
        
        return "admin-accounts.html";
    }

    // ==================== REST API ENDPOINTS ====================

    /**
     * GET /api/admin/accounts - Get all accounts with metadata.
     */
    @GetMapping("/api/admin/accounts")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAllAccounts(
            @RequestParam(required = false) String search) {
        
        Map<String, Object> response = new HashMap<>();
        
        List<Map<String, Object>> accounts;
        if (search != null && !search.trim().isEmpty()) {
            accounts = adminAccountService.searchAccounts(search);
        } else {
            accounts = adminAccountService.getAllAccountsWithMetadata();
        }
        
        response.put("success", true);
        response.put("accounts", accounts);
        response.put("count", accounts.size());
        
        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/admin/accounts/:id/status - Toggle account active status.
     */
    @PatchMapping("/api/admin/accounts/{id}/status")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateAccountStatus(
            @PathVariable int id,
            @RequestBody Map<String, Object> payload) {
        
        boolean activate = Boolean.TRUE.equals(payload.get("isActive"));
        Map<String, Object> result = adminAccountService.toggleAccountStatus(id, activate);
        
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * GET /api/admin/accounts/:id/profile - Get detailed user profile.
     */
    @GetMapping("/api/admin/accounts/{id}/profile")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getUserProfile(@PathVariable int id) {
        Map<String, Object> profile = adminAccountService.getUserProfile(id);
        
        if (profile.containsKey("error")) {
            return ResponseEntity.badRequest().body(profile);
        }
        
        return ResponseEntity.ok(profile);
    }

    /**
     * POST /api/admin/accounts/:id/reset-password - Generate password reset link.
     */
    @PostMapping("/api/admin/accounts/{id}/reset-password")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> resetPassword(@PathVariable int id) {
        Map<String, Object> result = adminAccountService.generatePasswordResetLink(id);
        
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * GET /api/admin/accounts/stats - Get account statistics.
     */
    @GetMapping("/api/admin/accounts/stats")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = adminAccountService.getAccountStats();
        stats.put("success", true);
        return ResponseEntity.ok(stats);
    }

    /**
     * DELETE /api/admin/accounts/:id - Permanently delete a customer account.
     */
    @DeleteMapping("/api/admin/accounts/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> deleteAccount(
            @PathVariable int id,
            HttpSession session) {

        if (session.getAttribute("admin") == null) {
            return ResponseEntity.status(401).body(
                java.util.Map.of("success", false, "message", "Admin login required"));
        }

        Map<String, Object> result = adminAccountService.deleteAccount(id);

        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }
}