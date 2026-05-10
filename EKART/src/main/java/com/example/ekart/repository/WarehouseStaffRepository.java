package com.example.ekart.repository;
import java.util.Optional;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ekart.dto.WarehouseStaff;
import com.example.ekart.dto.Warehouse;

/**
 * LOCATION: src/main/java/com/example/ekart/repository/WarehouseStaffRepository.java
 *
 * Repository for warehouse staff data access.
 */
public interface WarehouseStaffRepository extends JpaRepository<WarehouseStaff, Integer> {

    /**
     * Find warehouse staff by email.
     */
    Optional<WarehouseStaff> findByEmail(String email);

    /**
     * Find all active staff in a warehouse.
     */
    List<WarehouseStaff> findByWarehouseAndActive(Warehouse warehouse, boolean active);

    /**
     * Find all staff in a warehouse.
     */
    List<WarehouseStaff> findByWarehouse(Warehouse warehouse);

    /**
     * Find all managers in a warehouse.
     */
    @Query("SELECT ws FROM warehouse_staff ws " +
           "WHERE ws.warehouse = :warehouse AND ws.role = 'WAREHOUSE_MANAGER' " +
           "ORDER BY ws.createdAt DESC")
    List<WarehouseStaff> findManagersByWarehouse(@Param("warehouse") Warehouse warehouse);

    /**
     * Check if email exists.
     */
    boolean existsByEmail(String email);

    /**
     * Find verified staff by email.
     */
    Optional<WarehouseStaff> findByEmailAndVerified(String email, boolean verified);

    /**
     * Find all verified staff in a warehouse.
     */
    List<WarehouseStaff> findByWarehouseAndVerifiedAndActive(Warehouse warehouse, boolean verified, boolean active);

    /**
     * Count active staff in a warehouse.
     */
    long countByWarehouseAndActive(Warehouse warehouse, boolean active);
}

