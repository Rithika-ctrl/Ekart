/**
 * File: ReviewImage.java
 * Description: DTO representing an image attached to a product review.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.dto;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Stores Cloudinary image URLs uploaded by a customer when writing a review.
 * One Review can have multiple ReviewImage records (up to 5).
 */
@Entity
@Table(name = "review_images")
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

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Review getReview() {
        return review;
    }

    public void setReview(Review review) {
        this.review = review;
    }
}