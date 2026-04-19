package com.example.ekart.repository;

// ================================================================
// NEW FILE: src/main/java/com/example/ekart/repository/AutoAssignLogRepository.java
// ================================================================

import com.example.ekart.dto.AutoAssignLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AutoAssignLogRepository extends JpaRepository<AutoAssignLog, Integer> {

    List<AutoAssignLog> findByDeliveryBoyIdOrderByAssignedAtDesc(int deliveryBoyId);

    List<AutoAssignLog> findTop50ByOrderByAssignedAtDesc();
}