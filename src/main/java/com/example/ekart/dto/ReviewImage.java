package com.example.ekart.dto;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Stores Cloudinary image URLs uploaded by a customer when writing a review.
 * One Review can have multiple ReviewImage records (up to 5).
 */
@Entity
@Table(name = "review_images")
@Data
public class ReviewImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** Cloudinary URL of the uploaded image */
    @Column(nullable = false, length = 1000)
    private String imageUrl;

    /** The review this image belongs to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private Review review;
}