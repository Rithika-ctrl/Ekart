package com.example.ekart.repository;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/repository/TrackingEventLogRepository.java
// NEW FILE — create this file
// ================================================================

import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingEventLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrackingEventLogRepository extends JpaRepository<TrackingEventLog, Integer> {

    /**
     * All events for an order sorted oldest first.
     * Used to build the real tracking history on the customer tracking page.
     */
    List<TrackingEventLog> findByOrderOrderByEventTimeAsc(Order order);
}
