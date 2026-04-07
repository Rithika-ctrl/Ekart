package com.example.ekart.repository;

import com.example.ekart.dto.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Integer> {

    // All reviews for a specific product (use @Query because product is @ManyToOne)
    @Query("SELECT r FROM Review r WHERE r.product.id = :productId")
    List<Review> findByProductId(@Param("productId") int productId);

    // All reviews by a specific customer name
    List<Review> findByCustomerName(String customerName);

    // Reviews with a specific star rating
    List<Review> findByRating(int rating);

    // Count reviews per rating (for stats bar)
    @Query("SELECT r.rating, COUNT(r) FROM Review r GROUP BY r.rating ORDER BY r.rating DESC")
    List<Object[]> countByRatingGrouped();

    // Average rating across all reviews
    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Review r")
    double getOverallAverageRating();

    // Average rating for a specific product
    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Review r WHERE r.product.id = :productId")
    double getAverageRatingByProduct(@Param("productId") int productId);

    // Total review count for a product
    @Query("SELECT COUNT(r) FROM Review r WHERE r.product.id = :productId")
    long countByProductId(@Param("productId") int productId);

    // Check if customer already reviewed a product (by name match)
    @Query("SELECT COUNT(r) > 0 FROM Review r WHERE r.product.id = :productId AND r.customerName = :customerName")
    boolean existsByProductIdAndCustomerName(@Param("productId") int productId, @Param("customerName") String customerName);

    // Check if customer already reviewed a product (authoritative FK-based check)
    @Query("SELECT COUNT(r) > 0 FROM Review r WHERE r.product.id = :productId AND r.customer.id = :customerId")
    boolean existsByProductIdAndCustomerId(@Param("productId") int productId, @Param("customerId") int customerId);

    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.customer.id = :customerId ORDER BY r.id DESC")
    Optional<Review> findLatestByProductIdAndCustomerId(@Param("productId") int productId, @Param("customerId") int customerId);
}