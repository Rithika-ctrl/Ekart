package com.example.ekart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Refund;
import com.example.ekart.dto.RefundStatus;

/**
 * Repository for Refund entity operations.
 */
public interface RefundRepository extends JpaRepository<Refund, Integer> {

    // Find all refunds by status
    List<Refund> findByStatus(RefundStatus status);

    // Find all refunds for a specific customer
    List<Refund> findByCustomer(Customer customer);

    // Find all refunds for a specific order
    List<Refund> findByOrder(Order order);

    // Check if a refund already exists for an order (prevent duplicates)
    boolean existsByOrderAndStatus(Order order, RefundStatus status);

    // Find pending refunds count
    long countByStatus(RefundStatus status);

    // Find all refunds ordered by requestedAt descending (most recent first)
    List<Refund> findAllByOrderByRequestedAtDesc();

    // Find refunds by status ordered by requestedAt
    List<Refund> findByStatusOrderByRequestedAtDesc(RefundStatus status);

    // Find processed refunds (not pending)
    List<Refund> findByStatusNotOrderByProcessedAtDesc(RefundStatus status);
}
