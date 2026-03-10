package com.example.ekart.dto;

/**
 * Role enumeration for Role-Based Access Control (RBAC).
 * Used to differentiate access levels across the application.
 */
public enum Role {
    CUSTOMER,       // Default role - standard user with shopping capabilities
    ORDER_MANAGER,  // Can manage orders, refunds, and view reports
    ADMIN           // Full access - can manage content, security settings, and all admin features
}
