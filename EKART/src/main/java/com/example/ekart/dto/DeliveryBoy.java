package com.example.ekart.dto;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/dto/DeliveryBoy.java
// REPLACE your existing DeliveryBoy.java with this.
// Change from previous version: added adminApproved field.
//
// Flow:
//   Self-register → verified=false, adminApproved=false
//   OTP verified  → verified=true,  adminApproved=false  (shows "pending approval")
//   Admin approves → adminApproved=true                  (can now login)
//   Admin rejects  → active=false                        (blocked message on login)
// ================================================================

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serial;
import java.io.Serializable;

@Entity
@Table(name = "delivery_boy",
       indexes = { @Index(name = "idx_db_email", columnList = "email") })
public class DeliveryBoy implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

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

    @DecimalMin(value = "6000000000", message = "* Enter a valid 10-digit mobile number")
    @DecimalMax(value = "9999999999", message = "* Enter a valid 10-digit mobile number")
    private long mobile;

    /** AES encrypted password */
    private String password;

    @Transient
    private String confirmPassword;

    /** 6-digit OTP for email verification */
    private Integer otp;

    /** True once email OTP is verified */
    private boolean verified = false;

    /**
     * True once admin approves this delivery boy.
     * Self-registered accounts start as false.
     * Admin-created accounts are set to true immediately.
     */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean adminApproved = false;

    /** Admin can deactivate — shows "account deactivated" on login */
    private boolean active = true;

    /**
     * Warehouse assigned by admin after approval.
     * Null for self-registered accounts until admin approves + assigns.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    /** Comma-separated pin codes this delivery boy covers */
    @Column(length = 1000)
    private String assignedPinCodes;

    /** e.g. "DB-00001" — auto-generated after save */
    @Column(unique = true, nullable = true, length = 20)
    private String deliveryBoyCode;

    /** True when delivery boy is online/available for orders */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean isAvailable = false;

    // ── Getters & Setters ─────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public long getMobile() { return mobile; }
    public void setMobile(long mobile) { this.mobile = mobile; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }

    public Integer getOtp() { return otp; }
    public void setOtp(Integer otp) { this.otp = otp; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public boolean isAdminApproved() { return adminApproved; }
    public void setAdminApproved(boolean adminApproved) { this.adminApproved = adminApproved; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }

    public String getAssignedPinCodes() { return assignedPinCodes; }
    public void setAssignedPinCodes(String assignedPinCodes) { this.assignedPinCodes = assignedPinCodes; }

    public String getDeliveryBoyCode() { return deliveryBoyCode; }
    public void setDeliveryBoyCode(String deliveryBoyCode) { this.deliveryBoyCode = deliveryBoyCode; }

    public boolean isAvailable() { return isAvailable; }
    public void setAvailable(boolean available) { isAvailable = available; }

    public boolean covers(String pinCode) {
        if (pinCode == null || pinCode.isBlank() || assignedPinCodes == null) return false;
        String pin = pinCode.trim();
        
        // If assigned to "All", covers all PIN codes
        if (assignedPinCodes.trim().equalsIgnoreCase("all")) return true;
        
        // Otherwise check if PIN is in the comma-separated list
        for (String p : assignedPinCodes.split(",")) {
            if (p.trim().equals(pin)) return true;
        }
        return false;
    }
}