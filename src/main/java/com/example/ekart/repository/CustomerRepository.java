package com.example.ekart.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ekart.dto.Customer;

public interface CustomerRepository extends JpaRepository<Customer, Integer> {

	boolean existsByEmail(String email);

	boolean existsByMobile(long mobile);

	Customer findByEmail(String email);

	// OAuth2 lookup
	Customer findByProviderAndProviderId(String provider, String providerId);

}
