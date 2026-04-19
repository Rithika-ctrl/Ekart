package com.example.ekart.repository;

import com.example.ekart.dto.ReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewImageRepository extends JpaRepository<ReviewImage, Integer> {

    /** Find all images for a given review */
    List<ReviewImage> findByReviewId(int reviewId);

    /** Count images for a given review (used to enforce 5-image cap) */
    long countByReviewId(int reviewId);

    /** Delete all images belonging to a review (e.g. when review is deleted) */
    void deleteByReviewId(int reviewId);
}