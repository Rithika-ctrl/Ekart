package com.example.ekart.service;

import com.example.ekart.dto.*;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.WarehouseStaffRepository;
import com.example.ekart.repository.WarehouseRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;


/**
 * LOCATION: src/main/java/com/example/ekart/service/WarehouseStaffService.java
 *
 * Service for warehouse staff authentication, registration, and management.
 *
 * Key features:
 * - Staff registration by admin (email verification via OTP)
 * - Login with email + password
 * - Session management
 * - Role-based access (WAREHOUSE_STAFF, WAREHOUSE_MANAGER)
 */
@Service
@Transactional
public class WarehouseStaffService {

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final WarehouseStaffRepository staffRepository;
    private final WarehouseRepository warehouseRepository;
    private final EmailSender emailSender;

    public WarehouseStaffService(
            WarehouseStaffRepository staffRepository,
            WarehouseRepository warehouseRepository,
            EmailSender emailSender) {
        this.staffRepository = staffRepository;
        this.warehouseRepository = warehouseRepository;
        this.emailSender = emailSender;
    }



    private final Random random = new Random();

    // ─────────────────────────────────────────────────────────────────────────
    // REGISTRATION (by Admin)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin creates a new warehouse staff account.
     * Generates strong password and marks as verified.
     * Returns both staff record and plain-text password for display to admin.
     *
     * @param name Staff name
     * @param email Staff email (unique)
     * @param mobile Staff phone number
     * @param warehouseId Warehouse assignment
     * @param role WAREHOUSE_STAFF or WAREHOUSE_MANAGER
     * @return Map containing "staff" (WarehouseStaff) and "password" (plain text)
     */
    public Map<String, Object> createStaffAccount(String name, String email, String mobile,
                                                     int warehouseId, String role) {
        // Check if email already exists
        if (staffRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered: " + email);
        }

        // Get warehouse
        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            throw new IllegalArgumentException("Warehouse not found: " + warehouseId);
        }

        // Create staff record
        WarehouseStaff staff = new WarehouseStaff();
        staff.setName(name);
        staff.setEmail(email);
        staff.setMobile(mobile);
        staff.setWarehouse(warehouse);
        staff.setRole(role != null ? role : "WAREHOUSE_STAFF");  // Default role
        staff.setActive(true);
        staff.setVerified(true);  // Auto-verified (no OTP needed)

        // Generate strong random password
        String plainPassword = generateStrongPassword();
        String encryptedPassword = AES.encrypt(plainPassword);
        staff.setPassword(encryptedPassword);

        staff = staffRepository.save(staff);

        // Send credentials email
        try {
            emailSender.sendWarehouseStaffCredentials(staff, plainPassword);
        } catch (Exception e) {
            System.err.println("[WarehouseStaffService] Credentials email failed: " + e.getMessage());
        }

        // Return both staff and plain password
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("staff", staff);
        result.put("password", plainPassword);
        result.put("staff_id", staff.getId());
        result.put("email", staff.getEmail());

        return result;
    }

    /**
     * Generate a strong random password (12 chars: uppercase, lowercase, digits, special).
     *
     * @return Strong random password
     */
    private String generateStrongPassword() {
        String uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lowercase = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String special = "!@#$%^&*";
        String all = uppercase + lowercase + digits + special;

        StringBuilder password = new StringBuilder();
        password.append(uppercase.charAt(random.nextInt(uppercase.length())));
        password.append(lowercase.charAt(random.nextInt(lowercase.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(special.charAt(random.nextInt(special.length())));

        for (int i = 0; i < 8; i++) {
            password.append(all.charAt(random.nextInt(all.length())));
        }

        // Shuffle password
        String[] chars = password.toString().split("");
        for (int i = 0; i < chars.length; i++) {
            int randomIndex = random.nextInt(chars.length);
            String temp = chars[i];
            chars[i] = chars[randomIndex];
            chars[randomIndex] = temp;
        }

        return String.join("", chars);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Authenticate warehouse staff with email and password.
     *
     * @param email Staff email
     * @param password Staff password (encrypted)
     * @return Authenticated staff record, or null if invalid
     */
    public WarehouseStaff authenticateStaff(String email, String password) {
        Optional<WarehouseStaff> staffOpt = staffRepository.findByEmail(email);
        if (staffOpt.isEmpty()) {
            return null;
        }

        WarehouseStaff staff = staffOpt.get();

        // Check if verified
        if (!staff.isVerified()) {
            throw new IllegalStateException("Email not verified. Please verify OTP first.");
        }

        // Check if active
        if (!staff.isActive()) {
            throw new IllegalStateException("Account deactivated. Contact administrator.");
        }

        // Verify password
        String decryptedPassword = AES.decrypt(staff.getPassword());
        if (!decryptedPassword.equals(password)) {
            return null;  // Invalid password
        }

        // Update last login
        staff.setLastLogin(LocalDateTime.now());
        staffRepository.save(staff);

        return staff;
    }

    /**
     * Verify staff email with OTP.
     *
     * @param staffId Staff ID
     * @param otp OTP code entered by staff
     * @return true if verified, false if OTP mismatch
     */
    public boolean verifyStaffEmail(int staffId, int otp) {
        WarehouseStaff staff = staffRepository.findById(staffId).orElse(null);
        if (staff == null) {
            return false;
        }

        // Verify OTP (currently stored as password)
        String decryptedPassword = AES.decrypt(staff.getPassword());
        if (!decryptedPassword.equals(String.valueOf(otp))) {
            return false;
        }

        // Generate permanent password (user will set this later)
        // For now, use a random password
        String tempPassword = AES.encrypt("WH@Staff" + staffId);
        staff.setPassword(tempPassword);
        staff.setVerified(true);
        staffRepository.save(staff);

        return true;
    }

    /**
     * Update staff password.
     *
     * @param staffId Staff ID
     * @param oldPassword Current password
     * @param newPassword New password
     * @return true if updated, false if old password incorrect
     */
    public boolean updatePassword(int staffId, String oldPassword, String newPassword) {
        WarehouseStaff staff = staffRepository.findById(staffId).orElse(null);
        if (staff == null) {
            return false;
        }

        // Verify old password
        String decryptedPassword = AES.decrypt(staff.getPassword());
        if (!decryptedPassword.equals(oldPassword)) {
            return false;
        }

        // Set new password
        String encryptedPassword = AES.encrypt(newPassword);
        staff.setPassword(encryptedPassword);
        staffRepository.save(staff);

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SESSION MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Store staff in session after successful login.
     *
     * @param session HTTP session
     * @param staff Authenticated staff
     */
    public void setStaffInSession(HttpSession session, WarehouseStaff staff) {
        session.setAttribute("warehouse_staff_id", staff.getId());
        session.setAttribute("warehouse_staff_name", staff.getName());
        session.setAttribute("warehouse_staff_email", staff.getEmail());
        session.setAttribute("warehouse_staff_role", staff.getRole());
        session.setAttribute("warehouse_id", staff.getWarehouseId());
        session.setMaxInactiveInterval(30 * 60);  // 30 minutes timeout
    }

    /**
     * Get staff from session.
     *
     * @param session HTTP session
     * @return Staff if in session, null otherwise
     */
    public WarehouseStaff getStaffFromSession(HttpSession session) {
        Integer staffId = (Integer) session.getAttribute("warehouse_staff_id");
        if (staffId == null) {
            return null;
        }

        return staffRepository.findById(staffId).orElse(null);
    }

    /**
     * Clear staff from session (logout).
     *
     * @param session HTTP session
     */
    public void clearStaffSession(HttpSession session) {
        session.removeAttribute("warehouse_staff_id");
        session.removeAttribute("warehouse_staff_name");
        session.removeAttribute("warehouse_staff_email");
        session.removeAttribute("warehouse_staff_role");
        session.removeAttribute("warehouse_id");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAFF MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all active staff in a warehouse.
     *
     * @param warehouseId Warehouse ID
     * @return List of active staff
     */
    public List<WarehouseStaff> getActiveStaffByWarehouse(int warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            return List.of();
        }

        return staffRepository.findByWarehouseAndActive(warehouse, true);
    }

    /**
     * Get all managers in a warehouse.
     *
     * @param warehouseId Warehouse ID
     * @return List of managers
     */
    public List<WarehouseStaff> getManagersByWarehouse(int warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            return List.of();
        }

        return staffRepository.findManagersByWarehouse(warehouse);
    }

    /**
     * Deactivate staff account.
     *
     * @param staffId Staff ID
     */
    public void deactivateStaff(int staffId) {
        WarehouseStaff staff = staffRepository.findById(staffId).orElse(null);
        if (staff != null) {
            staff.setActive(false);
            staffRepository.save(staff);
        }
    }

    /**
     * Reactivate staff account.
     *
     * @param staffId Staff ID
     */
    public void reactivateStaff(int staffId) {
        WarehouseStaff staff = staffRepository.findById(staffId).orElse(null);
        if (staff != null) {
            staff.setActive(true);
            staffRepository.save(staff);
        }
    }

    /**
     * Update staff role.
     *
     * @param staffId Staff ID
     * @param newRole New role (WAREHOUSE_STAFF or WAREHOUSE_MANAGER)
     */
    public void updateStaffRole(int staffId, String newRole) {
        WarehouseStaff staff = staffRepository.findById(staffId).orElse(null);
        if (staff != null) {
            staff.setRole(newRole);
            staff.setUpdatedAt(LocalDateTime.now());
            staffRepository.save(staff);
        }
    }

    /**
     * Get staff count by warehouse.
     *
     * @param warehouseId Warehouse ID
     * @return Count of active staff
     */
    public long getStaffCountByWarehouse(int warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            return 0;
        }

        return staffRepository.countByWarehouseAndActive(warehouse, true);
    }
}
