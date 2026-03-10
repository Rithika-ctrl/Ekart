package com.example.ekart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ekart.dto.Product;
import com.example.ekart.dto.StockAlert;
import com.example.ekart.dto.Vendor;

public interface StockAlertRepository extends JpaRepository<StockAlert, Integer> {
	
	// Find all alerts for a specific vendor
	List<StockAlert> findByVendor(Vendor vendor);
	
	// Find unacknowledged alerts for a vendor
	List<StockAlert> findByVendorAndAcknowledgedFalse(Vendor vendor);
	
	// Find alerts for a specific product
	List<StockAlert> findByProduct(Product product);
	
	// Check if an alert already exists for a product
	boolean existsByProductAndAcknowledgedFalse(Product product);
}
