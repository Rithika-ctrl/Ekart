package com.example.ekart.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Role;
import com.example.ekart.repository.CustomerRepository;

import jakarta.servlet.http.HttpSession;

/**
 * REST API Controller for Admin User Management.
 * Provides JSON endpoints for RBAC operations.
 * 
 * Security: All endpoints require admin session or ADMIN role.
 */
@RestController
@RequestMapping("/api/admin")
public class UserAdminApiController {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CustomerRepository customerRepository;

    public UserAdminApiController(
            CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }



    /**
     * GET /api/admin/users - Fetch all registered users
     */
    @GetMapping("/users")
    public ResponseEntity<Object> getAllUsers(HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Admin access required"));
        }

        List<Customer> users = customerRepository.findAll();
        
        // Map to DTOs to avoid exposing sensitive data
        List<Map<String, Object>> userDtos = users.stream().map(user -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", user.getId());
            dto.put("name", user.getName());
            dto.put("email", user.getEmail());
            dto.put("role", user.getRole().name());
            dto.put("verified", user.isVerified());
            dto.put("provider", user.getProvider());
            return dto;
        }).toList();

        return ResponseEntity.ok(userDtos);
    }

    /**
     * GET /api/admin/users/search - Search users by name or email
     */
    @GetMapping("/users/search")
    public ResponseEntity<Object> searchUsers(@RequestParam String query, HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Admin access required"));
        }

        String searchQuery = query.toLowerCase().trim();
        List<Customer> users = customerRepository.findAll().stream()
            .filter(c -> 
                (c.getName() != null && c.getName().toLowerCase().contains(searchQuery)) ||
                (c.getEmail() != null && c.getEmail().toLowerCase().contains(searchQuery))
            )
            .toList();

        List<Map<String, Object>> userDtos = users.stream().map(user -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", user.getId());
            dto.put("name", user.getName());
            dto.put("email", user.getEmail());
            dto.put("role", user.getRole().name());
            dto.put("verified", user.isVerified());
            return dto;
        }).toList();

        return ResponseEntity.ok(userDtos);
    }

    /**
     * PATCH /api/admin/users/:id/role - Update a user's role
     */
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<Object> updateUserRole(@PathVariable int id, 
                                            @RequestBody Map<String, String> body,
                                            HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Admin access required"));
        }

        String newRole = body.get("role");
        if (newRole == null || newRole.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Role is required"));
        }

        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "User not found"));
        }

        try {
            Role role = Role.valueOf(newRole.toUpperCase());
            Role oldRole = customer.getRole();
            customer.setRole(role);
            customerRepository.save(customer);

            // If the updated user is currently logged in, update their session
            Customer sessionCustomer = (Customer) session.getAttribute("customer");
            if (sessionCustomer != null && sessionCustomer.getId() == id) {
                session.setAttribute("customer", customer);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Role updated successfully");
            response.put("userId", id);
            response.put("oldRole", oldRole.name());
            response.put("newRole", role.name());
            response.put("userName", customer.getName());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid role: " + newRole));
        }
    }

    /**
     * Check if current user has admin privileges
     */
    private boolean isAdmin(HttpSession session) {
        // Check if admin session exists
        if (session.getAttribute("admin") != null) {
            return true;
        }
        // Check if customer has ADMIN role
        Customer customer = (Customer) session.getAttribute("customer");
        return customer != null && customer.getRole() == Role.ADMIN;
    }
}
