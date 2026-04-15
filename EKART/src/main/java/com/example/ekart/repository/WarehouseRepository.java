// ================================================================
// LOCATION: src/main/java/com/example/ekart/repository/WarehouseRepository.java
// REPLACE your existing file.
//
// Fix: Use comma-delimiter-aware matching so "583121" correctly matches
// "583121,583122" AND "583122,583121" AND "583121" alone,
// without false-matching substrings like "58312" inside "583121".
// Also tolerates spaces around commas ("583121, 583122").
// ================================================================
package com.example.ekart.repository;

import com.example.ekart.dto.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface WarehouseRepository extends JpaRepository<Warehouse, Integer> {

    /** All active warehouses — used to populate dropdowns */
    List<Warehouse> findByActiveTrue();

    /**
     * Find the warehouse that serves a given pin code.
     *
     * Matches the pin as a whole token inside a comma-separated list,
     * stripping all spaces first so "583121, 583122" and "583121,583122"
     * are treated identically.
     *
     * Pattern: the normalised string (no spaces) contains one of:
     *   ,{pin},   — pin in the middle
     *   ,{pin}    — pin at the end
     *   {pin},    — pin at the start
     *   {pin}     — pin is the entire value (only one entry)
     *
     * We achieve this cheaply with four LIKE branches ORed together.
     */
    @Query("SELECT w FROM Warehouse w WHERE w.active = true AND (" +
           "  REPLACE(w.servedPinCodes, ' ', '') = :pin" +
           "  OR REPLACE(w.servedPinCodes, ' ', '') LIKE CONCAT(:pin, ',%')" +
           "  OR REPLACE(w.servedPinCodes, ' ', '') LIKE CONCAT('%,', :pin, ',%')" +
           "  OR REPLACE(w.servedPinCodes, ' ', '') LIKE CONCAT('%,', :pin)" +
           ")")
    List<Warehouse> findByPinCode(@Param("pin") String pin);

    /**
     * Check if a warehouse with the given login ID already exists.
     * Used to ensure uniqueness when generating login IDs.
     */
    boolean existsByWarehouseLoginId(String warehouseLoginId);

    /**
     * Find warehouse by its 8-digit numeric login ID.
     * Used for warehouse staff authentication.
     */
    Optional<Warehouse> findByWarehouseLoginId(String warehouseLoginId);
}