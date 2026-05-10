package com.example.ekart.repository;
import java.util.Optional;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ekart.dto.Order;
import com.example.ekart.dto.WarehouseTransferLeg;
import com.example.ekart.dto.Warehouse;

/**
 * LOCATION: src/main/java/com/example/ekart/repository/WarehouseTransferLegRepository.java
 *
 * Repository for accessing warehouse transfer leg data.
 * Provides queries for tracking warehouse-to-warehouse transfers.
 */
public interface WarehouseTransferLegRepository extends JpaRepository<WarehouseTransferLeg, Integer> {

    /**
     * Find all transfer legs for a given order.
     * Ordered by leg sequence to show the complete transfer journey.
     */
    List<WarehouseTransferLeg> findByOrderOrderByLegSequence(Order order);

    /**
     * Find all transfer legs from a specific warehouse.
     */
    List<WarehouseTransferLeg> findByFromWarehouse(Warehouse warehouse);

    /**
     * Find all transfer legs to a specific warehouse.
     */
    List<WarehouseTransferLeg> findByToWarehouse(Warehouse warehouse);

    /**
     * Find all pending/in-transit transfer legs for a warehouse.
     */
    @Query("SELECT wtl FROM warehouse_transfer_leg wtl " +
           "WHERE wtl.fromWarehouse = :warehouse " +
           "AND wtl.status IN (:statuses) " +
           "ORDER BY wtl.initiatedAt DESC")
    List<WarehouseTransferLeg> findPendingTransfersFromWarehouse(
        @Param("warehouse") Warehouse warehouse,
        @Param("statuses") List<String> statuses
    );

    /**
     * Find transfer leg by order and sequence number.
     */
    Optional<WarehouseTransferLeg> findByOrderAndLegSequence(Order order, int legSequence);

    /**
     * Find all transfer legs with a specific status.
     */
    List<WarehouseTransferLeg> findByStatus(String status);

    /**
     * Count pending transfers for a warehouse.
     */
    long countByFromWarehouseAndStatus(Warehouse warehouse, String status);
}

