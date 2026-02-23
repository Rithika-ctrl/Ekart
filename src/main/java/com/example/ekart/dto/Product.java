package com.example.ekart.dto;

import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Transient;
import lombok.Data;

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

	// Cloudinary image URL
	private String imageLink;

	// 🔥 Admin approval flag
	private boolean approved = false;

	// Vendor who added the product
	@ManyToOne
	private Vendor vendor;

	// Image upload (not stored in DB)
	@Transient
	private MultipartFile image;
}
