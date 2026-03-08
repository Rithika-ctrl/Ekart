package com.example.ekart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ekart.dto.Customer;

public interface CustomerRepository extends JpaRepository<Customer, Integer> {

	boolean existsByEmail(String email);

	boolean existsByMobile(long mobile);

	Customer findByEmail(String email);

	// OAuth2 lookup
	Customer findByProviderAndProviderId(String provider, String providerId);

	// Admin oversight - search by email or name (case-insensitive)
	@Query("SELECT c FROM Customer c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(c.email) LIKE LOWER(CONCAT('%', :query, '%'))")
	List<Customer> searchByNameOrEmail(@Param("query") String query);

	// Count active/inactive accounts
<<<<<<< HEAD
	long countByActive(boolean active);
=======
	long countByIsActive(boolean isActive);
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57

}
