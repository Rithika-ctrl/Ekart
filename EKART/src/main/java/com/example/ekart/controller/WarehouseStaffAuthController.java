package com.example.ekart.controller;

import com.example.ekart.dto.WarehouseStaff;
import com.example.ekart.service.WarehouseStaffService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * LOCATION: src/main/java/com/example/ekart/controller/WarehouseStaffAuthController.java
 *
 * REST API for warehouse staff authentication and management.
 *
 * Endpoints:
 * - POST /warehouse/login
 * - POST /warehouse/logout
 * - POST /warehouse/verify-otp
 * - POST /warehouse/change-password
 * - GET /warehouse/dashboard
 * - GET /warehouse/staff/list (admin only)
 */
@RestController
@RequestMapping("/warehouse")
public class WarehouseStaffAuthController {

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final WarehouseStaffService staffService;

    public WarehouseStaffAuthController(
            WarehouseStaffService staffService) {
        this.staffService = staffService;
    }

    private static final String EMAIL_KEY = "email";
    private static final String PASSWORD_KEY = "password";
    private static final String MOBILE_KEY = "mobile";
    private static final String STAFF_ID_KEY = "staff_id";
    private static final String WAREHOUSE_ID_KEY = "warehouse_id";
    private static final String ERROR_KEY = "error";
    private static final String SUCCESS_KEY = "success";
    private static final String MESSAGE_KEY = "message";
    private static final String STAFF_NAME_KEY = "staff_name";
    private static final String ROLE_KEY = "role";
    private static final String LAST_LOGIN_KEY = "last_login";
    private static final String DATA_KEY = "data";
    private static final String TOTAL_KEY = "total";
    private static final String STAFF_KEY = "staff";
    private static final String NAME_KEY = "name";
    private static final String ID_KEY = "id";
    private static final String VERIFIED_KEY = "verified";
    private static final String ACTIVE_KEY = "active";
    private static final String WAREHOUSE_NAME_KEY = "warehouse_name";
    private static final String IS_MANAGER_KEY = "is_manager";
    private static final String CREDENTIALS_SENT_TO_EMAIL_KEY = "credentials_sent_to_email";
    private static final String NOT_LOGGED_IN_MESSAGE = "Not logged in";
    private static final String STAFF_ID_REQUIRED_MESSAGE = "Staff ID is required";

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /warehouse/login
     * Authenticate staff with email and password.
     *
     * Request body:
     * {
     *   "email": "staff@warehouse.com",
     *   "password": "SecurePass123!",
     *   "warehouse_id": 1
     * }
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, Object> request, HttpSession session) {
        String email = (String) request.get(EMAIL_KEY);
        String password = (String) request.get(PASSWORD_KEY);

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of(ERROR_KEY, "Email and password are required"));
        }

        try {
            // Authenticate
            WarehouseStaff staff = staffService.authenticateStaff(email, password);
            if (staff == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(ERROR_KEY, "Invalid email or password"));
            }

            // Store in session
            staffService.setStaffInSession(session, staff);

            // Response
            return ResponseEntity.ok(Map.of(
                SUCCESS_KEY, true,
                MESSAGE_KEY, "Login successful",
                STAFF_ID_KEY, staff.getId(),
                STAFF_NAME_KEY, staff.getName(),
                WAREHOUSE_ID_KEY, staff.getWarehouseId(),
                ROLE_KEY, staff.getRole()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(ERROR_KEY, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR_KEY, "Login failed: " + e.getMessage()));
        }
    }

    /**
     * POST /warehouse/logout
     * Clear staff session.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpSession session) {
        staffService.clearStaffSession(session);
        return ResponseEntity.ok(Map.of(
            SUCCESS_KEY, true,
            MESSAGE_KEY, "Logout successful"
        ));
    }

    /**
     * POST /warehouse/verify-otp
     * Verify email with OTP sent during registration.
     *
     * Request body:
     * {
     *   "staff_id": 5,
     *   "otp": 123456
     * }
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, Object> request) {
        Integer staffId = ((Number) request.get(STAFF_ID_KEY)).intValue();
        Integer otp = ((Number) request.get("otp")).intValue();

        if (staffId == null || otp == null) {
            return ResponseEntity.badRequest()
                .body(Map.of(ERROR_KEY, "Staff ID and OTP are required"));
        }

        try {
            boolean verified = staffService.verifyStaffEmail(staffId, otp);
            if (!verified) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(ERROR_KEY, "Invalid OTP"));
            }

            return ResponseEntity.ok(Map.of(
                SUCCESS_KEY, true,
                MESSAGE_KEY, "Email verified successfully. You can now login."
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR_KEY, "Verification failed: " + e.getMessage()));
        }
    }

    /**
     * POST /warehouse/change-password
     * Update staff password.
     *
     * Request body:
     * {
     *   "old_password": "CurrentPass123!",
     *   "new_password": "NewPass456!"
     * }
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> request, HttpSession session) {
        WarehouseStaff staff = staffService.getStaffFromSession(session);
        if (staff == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(ERROR_KEY, NOT_LOGGED_IN_MESSAGE));
        }

        String oldPassword = request.get("old_password");
        String newPassword = request.get("new_password");

        if (oldPassword == null || oldPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of(ERROR_KEY, "Old and new passwords are required"));
        }

        try {
            boolean updated = staffService.updatePassword(staff.getId(), oldPassword, newPassword);
            if (!updated) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(ERROR_KEY, "Old password is incorrect"));
            }

            return ResponseEntity.ok(Map.of(
                SUCCESS_KEY, true,
                MESSAGE_KEY, "Password updated successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR_KEY, "Password update failed: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD & SESSION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /warehouse/dashboard
     * Get current staff session info and dashboard data.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(HttpSession session) {
        WarehouseStaff staff = staffService.getStaffFromSession(session);
        if (staff == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(ERROR_KEY, NOT_LOGGED_IN_MESSAGE));
        }

        try {
            var dashboard = new LinkedHashMap<String, Object>();
            dashboard.put(STAFF_ID_KEY, staff.getId());
            dashboard.put(STAFF_NAME_KEY, staff.getName());
            dashboard.put(EMAIL_KEY, staff.getEmail());
            dashboard.put(WAREHOUSE_ID_KEY, staff.getWarehouseId());
            dashboard.put(WAREHOUSE_NAME_KEY, staff.getWarehouse().getName());
            dashboard.put(ROLE_KEY, staff.getRole());
            dashboard.put(IS_MANAGER_KEY, staff.isManager());
            dashboard.put(LAST_LOGIN_KEY, staff.getLastLogin());

            return ResponseEntity.ok(Map.of(
                SUCCESS_KEY, true,
                DATA_KEY, dashboard
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR_KEY, "Failed to load dashboard: " + e.getMessage()));
        }
    }

    /**
     * GET /warehouse/staff/list
     * Get all staff in warehouse (admin only).
     *
     * Query params:
     * - warehouse_id (required)
     */
    @GetMapping("/staff/list")
    public ResponseEntity<Map<String, Object>> getStaffList(@RequestParam int warehouse_id, HttpSession session) {
        WarehouseStaff currentStaff = staffService.getStaffFromSession(session);
        if (currentStaff == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(ERROR_KEY, NOT_LOGGED_IN_MESSAGE));
        }

        // Only managers can view staff list
        if (!currentStaff.isManager()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(ERROR_KEY, "Only warehouse managers can view staff list"));
        }

        try {
            var staffList = staffService.getActiveStaffByWarehouse(warehouse_id);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put(SUCCESS_KEY, true);
            response.put(TOTAL_KEY, staffList.size());
            response.put(STAFF_KEY, staffList.stream()
                .map(s -> Map.of(
                    ID_KEY, s.getId(),
                    NAME_KEY, s.getName(),
                    EMAIL_KEY, s.getEmail(),
                    MOBILE_KEY, s.getMobile(),
                    ROLE_KEY, s.getRole(),
                    VERIFIED_KEY, s.isVerified(),
                    ACTIVE_KEY, s.isActive(),
                    LAST_LOGIN_KEY, s.getLastLogin() != null ? s.getLastLogin().toString() : "Never"
                ))
                .toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR_KEY, "Failed to fetch staff list: " + e.getMessage()));
        }
    }

    /**
     * POST /warehouse/staff/create (admin only)
     * Create new warehouse staff account.
     * Returns generated credentials for display to admin.
     *
     * Request body:
     * {
     *   "name": "John Doe",
     *   "email": "john@warehouse.com",
     *   "mobile": "9876543210",
     *   "warehouse_id": 1,
     *   "role": "WAREHOUSE_STAFF"
     * }
     *
     * Response includes: staff_id, email, password (plain text), name
     */
    @PostMapping("/staff/create")
    public ResponseEntity<Map<String, Object>> createStaff(@RequestBody Map<String, Object> request, HttpSession session) {
        WarehouseStaff currentStaff = staffService.getStaffFromSession(session);
        if (currentStaff == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(ERROR_KEY, NOT_LOGGED_IN_MESSAGE));
        }

        // Only managers can create staff
        if (!currentStaff.isManager()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(ERROR_KEY, "Only warehouse managers can create staff"));
        }

        String name = (String) request.get(NAME_KEY);
        String email = (String) request.get(EMAIL_KEY);
        String mobile = (String) request.get(MOBILE_KEY);
        Integer warehouseId = ((Number) request.get(WAREHOUSE_ID_KEY)).intValue();
        String role = (String) request.get("role");

        if (name == null || email == null || mobile == null || warehouseId == null) {
            return ResponseEntity.badRequest()
                .body(Map.of(ERROR_KEY, "Name, email, mobile, and warehouse_id are required"));
        }

        try {
            Map<String, Object> creationResult = staffService.createStaffAccount(name, email, mobile, warehouseId, role);
            WarehouseStaff newStaff = (WarehouseStaff) creationResult.get("staff");
            String plainPassword = (String) creationResult.get("password");

            // Return credentials to admin (plain password for display)
            Map<String, Object> response = new LinkedHashMap<>();
            response.put(SUCCESS_KEY, true);
            response.put(MESSAGE_KEY, "Staff account created successfully");
            response.put(STAFF_ID_KEY, newStaff.getId());
            response.put(EMAIL_KEY, newStaff.getEmail());
            response.put(PASSWORD_KEY, plainPassword);  // Plain text password
            response.put(NAME_KEY, newStaff.getName());
            response.put(MOBILE_KEY, newStaff.getMobile());
            response.put(ROLE_KEY, newStaff.getRole());
            response.put(CREDENTIALS_SENT_TO_EMAIL_KEY, true);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(Map.of(ERROR_KEY, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR_KEY, "Staff creation failed: " + e.getMessage()));
        }
    }

    /**
     * POST /warehouse/staff/deactivate
     * Deactivate staff account (manager only).
     *
     * Request body:
     * {
     *   "staff_id": 5
     * }
     */
    @PostMapping("/staff/deactivate")
    public ResponseEntity<Map<String, Object>> deactivateStaff(@RequestBody Map<String, Integer> request, HttpSession session) {
        WarehouseStaff currentStaff = staffService.getStaffFromSession(session);
        if (currentStaff == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(ERROR_KEY, NOT_LOGGED_IN_MESSAGE));
        }

        if (!currentStaff.isManager()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(ERROR_KEY, "Only warehouse managers can deactivate staff"));
        }

        Integer staffId = request.get(STAFF_ID_KEY);
        if (staffId == null) {
            return ResponseEntity.badRequest()
                .body(Map.of(ERROR_KEY, STAFF_ID_REQUIRED_MESSAGE));
        }

        try {
            staffService.deactivateStaff(staffId);
            return ResponseEntity.ok(Map.of(
                SUCCESS_KEY, true,
                MESSAGE_KEY, "Staff account deactivated"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR_KEY, "Deactivation failed: " + e.getMessage()));
        }
    }

    /**
     * POST /warehouse/staff/reactivate
     * Reactivate staff account (manager only).
     *
     * Request body:
     * {
     *   "staff_id": 5
     * }
     */
    @PostMapping("/staff/reactivate")
    public ResponseEntity<Map<String, Object>> reactivateStaff(@RequestBody Map<String, Integer> request, HttpSession session) {
        WarehouseStaff currentStaff = staffService.getStaffFromSession(session);
        if (currentStaff == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(ERROR_KEY, NOT_LOGGED_IN_MESSAGE));
        }

        if (!currentStaff.isManager()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(ERROR_KEY, "Only warehouse managers can reactivate staff"));
        }

        Integer staffId = request.get(STAFF_ID_KEY);
        if (staffId == null) {
            return ResponseEntity.badRequest()
                .body(Map.of(ERROR_KEY, STAFF_ID_REQUIRED_MESSAGE));
        }

        try {
            staffService.reactivateStaff(staffId);
            return ResponseEntity.ok(Map.of(
                SUCCESS_KEY, true,
                MESSAGE_KEY, "Staff account reactivated"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(ERROR_KEY, "Reactivation failed: " + e.getMessage()));
        }
    }
}
