package com.example.ekart.dto;

import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Transient;
import lombok.Data;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;

@Data
@Entity
public class Product {

	@Id
	@GeneratedValue(generator = "product_id")
	@SequenceGenerator(
		name = "product_id",
		initialValue = 121001,
		allocationSize = 1
	)
	private int id;

	private String name;
	private String description;
	private double price;
	private String category;
	private int stock;

	// 🔥 Stock alert threshold - notify when stock drops below this level
	private Integer stockAlertThreshold = 10; // default threshold (nullable for existing data)

	// Cloudinary main image URL
	private String imageLink;

	// 🔥 Extra images (stored as comma-separated URLs in DB)
	@Column(length = 2000)
	private String extraImageLinks; // comma-separated URLs

	// 🔥 Product video URL (Cloudinary)
	private String videoLink;

	// 🔥 Admin approval flag
	private boolean approved = false;

	// Vendor who added the product
	@ManyToOne
	private Vendor vendor;

	// Image upload (not stored in DB)
	@Transient
	private MultipartFile image;

	// 🔥 Extra image uploads (not stored in DB)
	@Transient
	private java.util.List<MultipartFile> extraImages;

	// 🔥 Video upload (not stored in DB)
	@Transient
	private MultipartFile video;

	// Helper: get extra image URLs as a list
	public java.util.List<String> getExtraImageList() {
		if (extraImageLinks == null || extraImageLinks.isBlank()) return new java.util.ArrayList<>();
		return java.util.Arrays.asList(extraImageLinks.split(","));
	}

	@OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
private java.util.List<Review> reviews;

public java.util.List<Review> getReviews() {
    return reviews;
}

public void setReviews(java.util.List<Review> reviews) {
    this.reviews = reviews;
}

}