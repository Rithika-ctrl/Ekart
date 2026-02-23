package com.example.ekart.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ekart.dto.Vendor;

public interface VendorRepository extends JpaRepository<Vendor, Integer> {

	boolean existsByEmail(String string);

	boolean existsByMobile(long mobile);

	Vendor findByMobile(long mobile);

	Vendor findByEmail(String email);

}
