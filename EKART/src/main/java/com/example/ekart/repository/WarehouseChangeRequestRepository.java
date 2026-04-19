package com.example.ekart.repository;
import java.util.Optional;

// LOCATION: src/main/java/com/example/ekart/repository/WarehouseChangeRequestRepository.java
// NEW FILE — copy as-is.

import com.example.ekart.dto.DeliveryBoy;
import com.example.ekart.dto.WarehouseChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WarehouseChangeRequestRepository extends JpaRepository<WarehouseChangeRequest, Integer> {

    /** All pending requests — for admin panel */
    List<WarehouseChangeRequest> findByStatusOrderByRequestedAtDesc(WarehouseChangeRequest.Status status);

    /** Check if a delivery boy already has a pending request */
    Optional<WarehouseChangeRequest> findByDeliveryBoyAndStatus(
            DeliveryBoy deliveryBoy, WarehouseChangeRequest.Status status);

    /** All requests for a delivery boy (history) */
    List<WarehouseChangeRequest> findByDeliveryBoyOrderByRequestedAtDesc(DeliveryBoy deliveryBoy);
}
