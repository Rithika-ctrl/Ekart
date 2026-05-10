package com.example.ekart.repository;
import java.util.Optional;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Wishlist;

public interface WishlistRepository extends JpaRepository<Wishlist, Integer> {
    
    // Find all wishlist items for a customer
    @EntityGraph(attributePaths = "product")
    List<Wishlist> findByCustomer(Customer customer);
    
    // Find a specific wishlist entry by customer and product
    Optional<Wishlist> findByCustomerAndProduct(Customer customer, Product product);
    
    // Check if product exists in customer's wishlist
    boolean existsByCustomerAndProduct(Customer customer, Product product);
    
    // Delete a wishlist entry by customer and product
    void deleteByCustomerAndProduct(Customer customer, Product product);
    
    // Count items in customer's wishlist
    long countByCustomer(Customer customer);
}

