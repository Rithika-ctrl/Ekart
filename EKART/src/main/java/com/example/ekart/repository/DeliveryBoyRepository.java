package com.example.ekart.repository;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/repository/DeliveryBoyRepository.java
// REPLACE your existing file.
//
// Fix: findByPinCode() now uses delimiter-aware matching (same logic as
// WarehouseRepository) so "583121" correctly matches "583121,583122"
// without false-positives or space-sensitivity issues.
// ================================================================

import com.example.ekart.dto.DeliveryBoy;
import com.example.ekart.dto.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DeliveryBoyRepository extends JpaRepository<DeliveryBoy, Integer> {

    DeliveryBoy findByEmail(String email);
    boolean existsByEmail(String email);

    /** All delivery boys in a warehouse */
    List<DeliveryBoy> findByWarehouse(Warehouse warehouse);

    /** All active + approved delivery boys — for admin dropdowns */
    List<DeliveryBoy> findByActiveTrue();

    /** Pending approval: email verified but admin not yet approved */
    List<DeliveryBoy> findByAdminApprovedFalseAndVerifiedTrue();

    /**
     * Active + approved + verified boys whose assignedPinCodes explicitly covers a pin.
     * Uses delimiter-aware matching — tolerates spaces around commas.
     *
     * NOTE: This only matches boys who have explicit pin assignments.
     * Boys with empty assignedPinCodes are NOT returned here — the service
     * layer falls back to warehouse-based matching for them.
     */
    @Query("SELECT d FROM DeliveryBoy d WHERE d.active = true AND d.verified = true " +
           "AND d.adminApproved = true AND d.assignedPinCodes IS NOT NULL " +
           "AND d.assignedPinCodes != '' AND (" +
           "  REPLACE(d.assignedPinCodes, ' ', '') = :pin" +
           "  OR REPLACE(d.assignedPinCodes, ' ', '') LIKE CONCAT(:pin, ',%')" +
           "  OR REPLACE(d.assignedPinCodes, ' ', '') LIKE CONCAT('%,', :pin, ',%')" +
           "  OR REPLACE(d.assignedPinCodes, ' ', '') LIKE CONCAT('%,', :pin)" +
           ")")
    List<DeliveryBoy> findByPinCode(@Param("pin") String pin);

    /**
     * All active + approved + verified boys assigned to a specific warehouse
     * regardless of their pinCode assignment — used as warehouse-based fallback.
     */
    @Query("SELECT d FROM DeliveryBoy d WHERE d.active = true AND d.verified = true " +
           "AND d.adminApproved = true AND d.warehouse = :warehouse")
    List<DeliveryBoy> findActiveByWarehouse(@Param("warehouse") Warehouse warehouse);
}