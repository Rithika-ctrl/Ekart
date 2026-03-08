package com.example.ekart.dto;

import org.springframework.web.multipart.MultipartFile;
<<<<<<< HEAD
=======

>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Transient;
<<<<<<< HEAD
import jakarta.persistence.CascadeType;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Column;

=======
import lombok.Data;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;

@Data
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
@Entity
public class Product {

	@Id
	@GeneratedValue(generator = "product_id")
<<<<<<< HEAD
	@SequenceGenerator(name = "product_id", initialValue = 121001, allocationSize = 1)
=======
	@SequenceGenerator(
		name = "product_id",
		initialValue = 121001,
		allocationSize = 1
	)
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
	private int id;

	private String name;
	private String description;
	private double price;
	private String category;
	private int stock;
<<<<<<< HEAD
	private Integer stockAlertThreshold = 10;
	private String imageLink;

	@Column(length = 2000)
	private String extraImageLinks;

	private String videoLink;
	private boolean approved = false;

	@ManyToOne
	private Vendor vendor;

	@Transient
	private MultipartFile image;

	@Transient
	private java.util.List<MultipartFile> extraImages;

	@Transient
	private MultipartFile video;

	@OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
	@OrderBy("rating DESC")  // Good reviews (5★) on top, bad (1★) on bottom
	private java.util.List<Review> reviews;

=======

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
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
	public java.util.List<String> getExtraImageList() {
		if (extraImageLinks == null || extraImageLinks.isBlank()) return new java.util.ArrayList<>();
		return java.util.Arrays.asList(extraImageLinks.split(","));
	}

<<<<<<< HEAD
	public int getId() { return id; }
	public void setId(int id) { this.id = id; }
	public String getName() { return name; }
	public void setName(String name) { this.name = name; }
	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }
	public double getPrice() { return price; }
	public void setPrice(double price) { this.price = price; }
	public String getCategory() { return category; }
	public void setCategory(String category) { this.category = category; }
	public int getStock() { return stock; }
	public void setStock(int stock) { this.stock = stock; }
	public Integer getStockAlertThreshold() { return stockAlertThreshold; }
	public void setStockAlertThreshold(Integer stockAlertThreshold) { this.stockAlertThreshold = stockAlertThreshold; }
	public String getImageLink() { return imageLink; }
	public void setImageLink(String imageLink) { this.imageLink = imageLink; }
	public String getExtraImageLinks() { return extraImageLinks; }
	public void setExtraImageLinks(String extraImageLinks) { this.extraImageLinks = extraImageLinks; }
	public String getVideoLink() { return videoLink; }
	public void setVideoLink(String videoLink) { this.videoLink = videoLink; }
	public boolean isApproved() { return approved; }
	public void setApproved(boolean approved) { this.approved = approved; }
	public Vendor getVendor() { return vendor; }
	public void setVendor(Vendor vendor) { this.vendor = vendor; }
	public MultipartFile getImage() { return image; }
	public void setImage(MultipartFile image) { this.image = image; }
	public java.util.List<MultipartFile> getExtraImages() { return extraImages; }
	public void setExtraImages(java.util.List<MultipartFile> extraImages) { this.extraImages = extraImages; }
	public MultipartFile getVideo() { return video; }
	public void setVideo(MultipartFile video) { this.video = video; }
	public java.util.List<Review> getReviews() { return reviews; }
	public void setReviews(java.util.List<Review> reviews) { this.reviews = reviews; }
=======
	@OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
private java.util.List<Review> reviews;

public java.util.List<Review> getReviews() {
    return reviews;
}

public void setReviews(java.util.List<Review> reviews) {
    this.reviews = reviews;
}

>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
}