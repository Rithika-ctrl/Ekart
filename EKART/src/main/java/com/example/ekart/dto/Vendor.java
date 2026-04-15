package com.example.ekart.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.io.Serializable;
import java.util.List;

@Entity
@Data
@Table(indexes = { @Index(name = "idx_vendor_email", columnList = "email") })
public class Vendor implements Serializable {
	private static final long serialVersionUID = 1L;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;

	@Size(min = 5, max = 30, message = "* Enter Between 5~30 Charecters")
	private String name;

	@Email(message = "* Enter Proper Email")
	@NotEmpty(message = "* It is Required Field")
	private String email;

	@DecimalMin(value = "6000000000", message = "* Enter Proper Mobile Number")
	@DecimalMax(value = "9999999999", message = "* Enter Proper Mobile Number")
	private long mobile;

	@Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
			message = "* Enter atleast 8 charecters consisting of one uppercase, one lowercase, one number, one special charecter")
	private String password;

	@Transient
	@Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
			message = "* Enter atleast 8 charecters consisting of one uppercase, one lowercase, one number, one special charecter")
	private String confirmPassword;

	// ─── OTP Management (Feature #2 Security Fix)
	// otpHash: BCrypt hashed OTP (never store plain OTP in DB)
	// otpExpiry: Timestamp when OTP expires (5 min default)
	@Column(nullable = true, length = 100)
	private String otpHash;

	@Column(nullable = true)
	private LocalDateTime otpExpiry;

	@Deprecated // Use otpHash field instead
	private int otp;

	private boolean verified;

	// OAuth2 fields
	@Column(nullable = true)
	private String provider;

	@Column(nullable = true)
	private String providerId;

	// 🔥 NEW: Unique Vendor Display ID e.g. VND-00001
	@Column(unique = true, nullable = true)
	private String vendorCode;

	// Storefront description shown on vendor's public store page
	@Column(nullable = true, columnDefinition = "TEXT")
	private String description;

	// City where vendor is located (used for auto-assigning warehouses)
	@Column(nullable = true, length = 100)
	private String city;

	// Stock alerts for products - cascade delete when vendor is deleted
	@OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<StockAlert> stockAlerts;

	// Products - cascade delete when vendor is deleted
	@OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<Product> products;

	// Sales reports - cascade delete when vendor is deleted
	@OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<SalesReport> salesReports;

	// ── Getters & Setters ──────────────────────────────────────
	public int getId() { return id; }
	public void setId(int id) { this.id = id; }

	public String getName() { return name; }
	public void setName(String name) { this.name = name; }

	public String getEmail() { return email; }
	public void setEmail(String email) { this.email = email; }

	public long getMobile() { return mobile; }
	public void setMobile(long mobile) { this.mobile = mobile; }

	public String getPassword() { return password; }
	public void setPassword(String password) { this.password = password; }

	public String getConfirmPassword() { return confirmPassword; }
	public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }

	public int getOtp() { return otp; }
	public String getOtpHash() { return otpHash; }
	public void setOtpHash(String otpHash) { this.otpHash = otpHash; }
	public LocalDateTime getOtpExpiry() { return otpExpiry; }
	public void setOtpExpiry(LocalDateTime otpExpiry) { this.otpExpiry = otpExpiry; }

	@Deprecated // Use setOtpHash() instead
	public void setOtp(int otp) { this.otp = otp; }

	public boolean isVerified() { return verified; }
	public void setVerified(boolean verified) { this.verified = verified; }

	public String getProvider() { return provider; }
	public void setProvider(String provider) { this.provider = provider; }

	public String getProviderId() { return providerId; }
	public void setProviderId(String providerId) { this.providerId = providerId; }

	// 🔥 NEW
	public String getVendorCode() { return vendorCode; }
	public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }

	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }

	public String getCity() { return city; }
	public void setCity(String city) { this.city = city; }

	public List<StockAlert> getStockAlerts() { return stockAlerts; }
	public void setStockAlerts(List<StockAlert> stockAlerts) { this.stockAlerts = stockAlerts; }

	public List<Product> getProducts() { return products; }
	public void setProducts(List<Product> products) { this.products = products; }

	public List<SalesReport> getSalesReports() { return salesReports; }
	public void setSalesReports(List<SalesReport> salesReports) { this.salesReports = salesReports; }
}