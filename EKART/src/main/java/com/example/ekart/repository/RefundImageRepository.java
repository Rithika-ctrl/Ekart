package com.example.ekart.repository;

import com.example.ekart.dto.RefundImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundImageRepository extends JpaRepository<RefundImage, Integer> {

    /** Find all images for a given refund request */
    List<RefundImage> findByRefundId(int refundId);

    /** Count images for a given refund (used to enforce 5-image cap) */
    long countByRefundId(int refundId);

    /** Delete all images for a refund (cleanup) */
    void deleteByRefundId(int refundId);
}