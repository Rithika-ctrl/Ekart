package com.example.ekart.repository;
import java.util.Optional;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/repository/DeliveryOtpRepository.java
// NEW FILE — create this file
// ================================================================

import com.example.ekart.dto.DeliveryOtp;
import com.example.ekart.dto.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryOtpRepository extends JpaRepository<DeliveryOtp, Integer> {

    /** Find the active OTP for a specific order */
    Optional<DeliveryOtp> findByOrder(Order order);
}

