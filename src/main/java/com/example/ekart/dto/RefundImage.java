package com.example.ekart.dto;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Stores Cloudinary image URLs uploaded by a customer as evidence
 * when reporting an issue or requesting a refund on an order.
 * One Refund can have multiple RefundImage records (up to 5).
 */
@Entity
@Table(name = "refund_images")
@Data
public class RefundImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** Cloudinary URL of the uploaded evidence image */
    @Column(nullable = false, length = 1000)
    private String imageUrl;

    /** The refund request this image belongs to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_id", nullable = false)
    private Refund refund;
}