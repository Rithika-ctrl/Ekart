package com.example.ekart.dto;
import java.time.LocalDateTime;


import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/WarehouseStaff.java
 *
 * Represents warehouse staff who manage order receiving, assignment, and settlement.
 *
 * Roles:
 * - WAREHOUSE_STAFF: Basic staff member (receive orders, assign delivery boys)
 * - WAREHOUSE_MANAGER: Senior staff (approve settlements, generate reports)
 *
 * Workflow:
 * 1. Registration: Admin creates staff account with warehouse assignment
 * 2. Email verification: Staff verifies email via OTP
 * 3. Login: Staff logs in with email + password
 * 4. Dashboard: Access warehouse operations (receive orders, assign boys, view settlements)
 */
@Entity(name = "warehouse_staff")
@Table(name = "warehouse_staff", indexes = {
    @Index(name = "idx_ws_email", columnList = "email"),
    @Index(name = "idx_ws_warehouse", columnList = "warehouse_id"),
    @Index(name = "idx_ws_role", columnList = "role")
})
public class WarehouseStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Size(min = 3, max = 50, message = "* Name must be 3-50 characters")
    @Column(nullable = false, length = 50)
    private String name;

    @Email(message = "* Enter a valid email")
    @NotEmpty(message = "* Email is required")
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 20)
    private String mobile;

    /** AES encrypted password */
    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "role", nullable = false, length = 50, columnDefinition = "VARCHAR(50) DEFAULT 'WAREHOUSE_STAFF'")
    private String role = "WAREHOUSE_STAFF";  // WAREHOUSE_STAFF or WAREHOUSE_MANAGER

    @ManyToOne(optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    /** True once email OTP is verified */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean verified = false;

    /** Admin can deactivate account */
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean active = true;

    @Column(nullable = true)
    private LocalDateTime lastLogin;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ─── Getters & Setters ────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getLastLogin() { return lastLogin; }
    public void setLastLogin(LocalDateTime lastLogin) { this.lastLogin = lastLogin; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // ─── Convenience Methods ────────────────────────────────────────

    public boolean isManager() {
        return "WAREHOUSE_MANAGER".equalsIgnoreCase(role);
    }

    public int getWarehouseId() {
        return warehouse != null ? warehouse.getId() : -1;
    }
}

