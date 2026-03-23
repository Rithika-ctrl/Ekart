/**
 * File: Role.java
 * Description: DTO/enum representing user roles (ADMIN, CUSTOMER, VENDOR, etc.).
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
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
