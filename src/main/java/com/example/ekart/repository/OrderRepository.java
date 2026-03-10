package com.example.ekart.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Vendor;

public interface OrderRepository extends JpaRepository<Order, Integer> {

	List<Order> findByCustomer(Customer customer);

	// 🔥 NEW: Get all orders that contain at least one item
	// whose product belongs to the given vendor
	@Query("SELECT DISTINCT o FROM shopping_order o " +
		   "JOIN o.items i " +
		   "WHERE i.productId IN " +
		   "(SELECT p.id FROM Product p WHERE p.vendor = :vendor)")
	List<Order> findOrdersByVendor(@Param("vendor") Vendor vendor);

	// 🔥 NEW: Vendor orders filtered by date range (for daily/weekly/monthly)
	@Query("SELECT DISTINCT o FROM shopping_order o " +
		   "JOIN o.items i " +
		   "WHERE i.productId IN " +
		   "(SELECT p.id FROM Product p WHERE p.vendor = :vendor) " +
		   "AND o.orderDate >= :from AND o.orderDate <= :to")
	List<Order> findOrdersByVendorAndDateRange(
		@Param("vendor") Vendor vendor,
		@Param("from") LocalDateTime from,
		@Param("to") LocalDateTime to
	);
}