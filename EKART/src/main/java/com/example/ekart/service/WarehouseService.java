package com.example.ekart.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.example.ekart.dto.Warehouse;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.WarehouseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * LOCATION: src/main/java/com/example/ekart/service/WarehouseService.java
 *
 * Service for warehouse management operations.
 * 
 * Key features:
 * - Create warehouse with auto-generated login credentials
 * - AES-encrypt password and send to warehouse
 * - Generate unique 8-digit login ID and 6-digit numeric password
 */
@Service
@Transactional
public class WarehouseService {

    private static final Logger LOGGER = LoggerFactory.getLogger(WarehouseService.class);

    // ── Injected dependencies ────────────────────────────────────────────────
    private final WarehouseRepository warehouseRepository;
    private final EmailSender emailSender;

    public WarehouseService(
            WarehouseRepository warehouseRepository,
            EmailSender emailSender) {
        this.warehouseRepository = warehouseRepository;
        this.emailSender = emailSender;
    }




    /**
     * Create a new warehouse with auto-generated login credentials.
     * 
     * @param name Warehouse name
     * @param city City name
     * @param state State name
     * @param servedPinCodes Comma-separated pin codes
     * @param latitude Warehouse latitude
     * @param longitude Warehouse longitude
     * @param contactEmail Contact email for credentials delivery
     * @param contactPhone Contact phone number
     * @param address Physical address
     * @return Map containing warehouse details and plain-text credentials (shown once only)
     */
    public Map<String, Object> createWarehouse(
            String name,
            String city,
            String state,
            String servedPinCodes,
            Double latitude,
            Double longitude,
            String contactEmail,
            String contactPhone,
            String address) {

        // 1. Generate unique 8-digit login ID (retry if collision)
        String loginId;
        int attempts = 0;
        do {
            loginId = Warehouse.generateLoginId();
            attempts++;
            if (attempts > 100) {
                throw new RuntimeException("Could not generate unique warehouse login ID after 100 attempts");
            }
        } while (warehouseRepository.existsByWarehouseLoginId(loginId));

        // 2. Generate 6-digit numeric password
        String plainPassword = Warehouse.generateLoginPassword();

        // 3. AES-encrypt the password for storage
        String encryptedPassword;
        try {
            encryptedPassword = AES.encrypt(plainPassword);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt warehouse password: " + e.getMessage());
        }

        // 4. Auto-generate warehouse code
        String warehouseCode = "WH-" + 
            city.toUpperCase().replaceAll("\\s+", "").substring(0, Math.min(3, city.length())) + 
            "-" + loginId.substring(0, 3);

        // 5. Build and save warehouse
        Warehouse warehouse = new Warehouse();
        warehouse.setName(name);
        warehouse.setCity(city);
        warehouse.setState(state);
        warehouse.setServedPinCodes(servedPinCodes != null ? servedPinCodes : "");
        warehouse.setLatitude(latitude);
        warehouse.setLongitude(longitude);
        warehouse.setContactEmail(contactEmail);
        warehouse.setContactPhone(contactPhone);
        warehouse.setAddress(address);
        warehouse.setWarehouseCode(warehouseCode);
        warehouse.setWarehouseLoginId(loginId);
        warehouse.setWarehouseLoginPassword(encryptedPassword);
        warehouse.setActive(true);

        Warehouse saved = warehouseRepository.save(warehouse);

        // 6. Send credentials email to warehouse contact email
        if (contactEmail != null && !contactEmail.isBlank()) {
            try {
                emailSender.sendWarehouseCredentials(contactEmail, name, loginId, plainPassword, city);
            } catch (Exception e) {
                // Log but don't fail the creation
                LOGGER.error("Failed to send warehouse credentials email: {}", e.getMessage(), e);
            }
        }

        // 7. Return response including PLAIN TEXT credentials (shown to admin once only)
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("warehouseId", saved.getId());
        result.put("warehouseName", saved.getName());
        result.put("warehouseCode", saved.getWarehouseCode());
        result.put("loginId", loginId);
        result.put("loginPassword", plainPassword);
        result.put("message", "Warehouse created. Save these credentials — password will not be shown again.");
        return result;
    }
}