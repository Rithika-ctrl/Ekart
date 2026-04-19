package com.example.ekart.service;
import java.util.stream.Collectors;
import java.util.Optional;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Role;
import com.example.ekart.repository.CustomerRepository;

import jakarta.servlet.http.HttpSession;

/**
 * Service for Admin user management and RBAC operations.
 * Handles fetching users, updating roles, and role-based access control.
 * 
 * NOTE: This service is separate from Social Login and Banner Management.
 */
@Service
public class UserAdminService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CustomerRepository customerRepository;

    public UserAdminService(
            CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }



    /**
     * Load the security/RBAC management page
     */
    public String loadSecurityPage(HttpSession session, ModelMap map) {
        if (session.getAttribute("admin") == null) {
            // Also check if customer has ADMIN role
            Customer customer = (Customer) session.getAttribute("customer");
            if (customer == null || customer.getRole() != Role.ADMIN) {
                session.setAttribute("failure", "Admin access required");
                return "redirect:/admin/login";
            }
        }

        List<Customer> allUsers = customerRepository.findAll();
        map.put("users", allUsers);
        map.put("roles", Role.values());
        map.put("totalUsers", allUsers.size());
        map.put("adminCount", allUsers.stream().filter(c -> c.getRole() == Role.ADMIN).count());
        map.put("orderManagerCount", allUsers.stream().filter(c -> c.getRole() == Role.ORDER_MANAGER).count());
        map.put("customerCount", allUsers.stream().filter(c -> c.getRole() == Role.CUSTOMER).count());
        
        return "admin-security.html";
    }

    /**
     * Get all users (API endpoint)
     */
    public List<Customer> getAllUsers(HttpSession session) {
        if (!isAdminUser(session)) {
            return List.of();
        }
        return customerRepository.findAll();
    }

    /**
     * Update a user's role
     */
    public String updateUserRole(int userId, String newRole, HttpSession session) {
        if (!isAdminUser(session)) {
            session.setAttribute("failure", "Admin access required");
            return "redirect:/admin/login";
        }

        Optional<Customer> optCustomer = customerRepository.findById(userId);
        if (optCustomer.isEmpty()) {
            session.setAttribute("failure", "User not found");
            return "redirect:/admin/security";
        }

        Customer customer = optCustomer.get();
        
        try {
            Role role = Role.valueOf(newRole.toUpperCase());
            Role oldRole = customer.getRole();
            customer.setRole(role);
            customerRepository.save(customer);

            // If the updated user is currently logged in, update their session
            Customer sessionCustomer = (Customer) session.getAttribute("customer");
            if (sessionCustomer != null && sessionCustomer.getId() == userId) {
                session.setAttribute("customer", customer);
            }

            session.setAttribute("success", 
                "User \"" + customer.getName() + "\" role changed from " + oldRole + " to " + role);
        } catch (IllegalArgumentException e) {
            session.setAttribute("failure", "Invalid role: " + newRole);
        }

        return "redirect:/admin/security";
    }

    /**
     * Search users by name or email
     */
    public List<Customer> searchUsers(String query, HttpSession session) {
        if (!isAdminUser(session)) {
            return List.of();
        }

        if (query == null || query.trim().isEmpty()) {
            return customerRepository.findAll();
        }

        String searchQuery = query.toLowerCase().trim();
        return customerRepository.findAll().stream()
            .filter(c -> 
                (c.getName() != null && c.getName().toLowerCase().contains(searchQuery)) ||
                (c.getEmail() != null && c.getEmail().toLowerCase().contains(searchQuery))
            )
            .collect(Collectors.toList());
    }

    /**
     * Check if current session has admin privileges
     */
    private boolean isAdminUser(HttpSession session) {
        if (session.getAttribute("admin") != null) {
            return true;
        }
        Customer customer = (Customer) session.getAttribute("customer");
        return customer != null && customer.getRole() == Role.ADMIN;
    }

    /**
     * Get user by ID
     */
    public Customer getUserById(int id, HttpSession session) {
        if (!isAdminUser(session)) {
            return null;
        }
        return customerRepository.findById(id).orElse(null);
    }
}


