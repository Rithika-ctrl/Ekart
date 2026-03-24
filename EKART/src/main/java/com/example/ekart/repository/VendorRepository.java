package com.example.ekart.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.ekart.dto.Vendor;

public interface VendorRepository extends JpaRepository<Vendor, Integer> {

	boolean existsByEmail(String string);

	boolean existsByMobile(long mobile);

	Vendor findByMobile(long mobile);

	Vendor findByEmail(String email);

	// OAuth2 lookup
	Vendor findByProviderAndProviderId(String provider, String providerId);

	// 🔥 NEW: Find by vendor display code
	Vendor findByVendorCode(String vendorCode);

	// 🔥 NEW: Get the highest existing vendor code number
	// so we can generate the next one in sequence
	@Query("SELECT MAX(v.vendorCode) FROM Vendor v WHERE v.vendorCode IS NOT NULL")
	String findMaxVendorCode();
}