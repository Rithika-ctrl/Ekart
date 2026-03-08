package com.example.ekart.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Vendor;

public interface ProductRepository extends JpaRepository<Product, Integer> {

    // Vendor-specific products
    List<Product> findByVendor(Vendor vendor);

    // Search methods
    List<Product> findByNameContainingIgnoreCase(String name);
    List<Product> findByDescriptionContainingIgnoreCase(String description);
    List<Product> findByCategoryContainingIgnoreCase(String category);

    // Customer-visible products (approved only)
    List<Product> findByApprovedTrue();

    // Fixes the CustomerService error for recommendations
    List<Product> findByCategoryAndApprovedTrue(String category);
}