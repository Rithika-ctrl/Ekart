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
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;

@Entity
public class Product {

	@Id
	@GeneratedValue(generator = "product_id")
	@SequenceGenerator(name = "product_id", initialValue = 121001, allocationSize = 1)
	private int id;

	private String name;
	private String description;
	private double price;       // Selling / discounted price (what customer pays)

	/** Original MRP — if > price, shows strikethrough with discount badge. 0 = no MRP set. */
	@Column(columnDefinition = "DOUBLE DEFAULT 0")
	private Double mrp;
	private String category;
	private int stock;
	private Integer stockAlertThreshold = 10;
	private String imageLink;

	@Column(length = 2000)
	private String extraImageLinks;

	private String videoLink;
	private boolean approved = false;

	// Pin code delivery restriction: comma-separated 6-digit codes.
	// If null or blank → deliverable everywhere. Set by vendor.
	@Column(length = 1000)
	private String allowedPinCodes;

	@ManyToOne
	private Vendor vendor;

	@Transient
	private MultipartFile image;

	@Transient
	private java.util.List<MultipartFile> extraImages;

	@Transient
	private MultipartFile video;

	@OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
	private java.util.List<Review> reviews;

	public java.util.List<String> getExtraImageList() {
		if (extraImageLinks == null || extraImageLinks.isBlank()) return new java.util.ArrayList<>();
		return java.util.Arrays.asList(extraImageLinks.split(","));
	}

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

	public String getAllowedPinCodes() { return allowedPinCodes; }
	public void setAllowedPinCodes(String allowedPinCodes) { this.allowedPinCodes = allowedPinCodes; }

	/** Returns the list of allowed pin codes. Empty list = no restriction. */
	public java.util.List<String> getAllowedPinCodeList() {
		if (allowedPinCodes == null || allowedPinCodes.isBlank()) return new java.util.ArrayList<>();
		return java.util.Arrays.stream(allowedPinCodes.split(","))
				.map(String::trim).filter(s -> !s.isEmpty()).collect(java.util.stream.Collectors.toList());
	}

	/** True if this product has at least one pin code restriction set. */
	public boolean isRestrictedByPinCode() {
		return !getAllowedPinCodeList().isEmpty();
	}

	/** True if the product is deliverable to the given pin code (or has no restriction). */
	public boolean isDeliverableTo(String pinCode) {
		if (!isRestrictedByPinCode()) return true;
		if (pinCode == null || pinCode.isBlank()) return false;
		return getAllowedPinCodeList().contains(pinCode.trim());
	}
	public MultipartFile getImage() { return image; }
	public void setImage(MultipartFile image) { this.image = image; }
	public java.util.List<MultipartFile> getExtraImages() { return extraImages; }
	public void setExtraImages(java.util.List<MultipartFile> extraImages) { this.extraImages = extraImages; }
	public MultipartFile getVideo() { return video; }
	public void setVideo(MultipartFile video) { this.video = video; }
	public java.util.List<Review> getReviews() { return reviews; }
	public void setReviews(java.util.List<Review> reviews) { this.reviews = reviews; }

	public double getMrp() { return mrp != null ? mrp : 0.0; }
	public void setMrp(Double mrp) { this.mrp = (mrp != null) ? mrp : 0.0; }

	/** Returns discount percentage rounded to nearest int. 0 if no MRP or no discount. */
	public int getDiscountPercent() {
		if (mrp <= 0 || mrp <= price) return 0;
		return (int) Math.round((mrp - price) / mrp * 100);
	}

	/** True when product has a meaningful discount set */
	public boolean isDiscounted() {
		return mrp > 0 && mrp > price;
	}
}