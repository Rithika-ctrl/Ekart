package com.example.ekart.repository;

import com.example.ekart.dto.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Integer> {

    // All reviews sorted: highest rating first (good on top, bad on bottom)
    List<Review> findAllByOrderByRatingDesc();

    // Reviews for a specific product, sorted best first
    List<Review> findByProductIdOrderByRatingDesc(int productId);

    // Count reviews for a product
    long countByProductId(int productId);

    // Average rating for a product
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId")
    Double findAvgRatingByProductId(int productId);
}