package com.example.ekart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.OrderDispute;

/**
 * Spring Data JPA repository for {@link OrderDispute}.
 */
public interface OrderDisputeRepository extends JpaRepository<OrderDispute, Integer> {

    /** All disputes raised against a specific order. */
    List<OrderDispute> findByOrder(Order order);

    /** All disputes raised by a specific customer. */
    List<OrderDispute> findByCustomer(Customer customer);

    /** All disputes, newest first — used by the admin dashboard. */
    List<OrderDispute> findAllByOrderByReportedAtDesc();
}