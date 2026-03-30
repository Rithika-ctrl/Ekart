package com.example.ekart.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.Serializable;

@Entity
@Table(indexes = { @Index(name = "idx_customer_email", columnList = "email") })
public class Customer implements Serializable {
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

	@Pattern(regexp = "^.*(?=.{8,})(?=..*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$",
			message = "* Enter atleast 8 charecters consisting of one uppercase, one lowercase, one number, one special charecter")
	private String password;

	@Transient
	@Pattern(regexp = "^.*(?=.{8,})(?=..*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$",
			message = "* Enter atleast 8 charecters consisting of one uppercase, one lowercase, one number, one special charecter")
	private String confirmPassword;

	private int otp;
	private boolean verified;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Role role = Role.CUSTOMER;

	@Column(name = "active", nullable = false, columnDefinition = "boolean default true")
	private boolean active = true;

	@Column(nullable = true)
	private LocalDateTime lastLogin;

	@Column(nullable = true)
	private String provider;

	@Column(nullable = true)
	private String providerId;

	@OneToOne(cascade = CascadeType.ALL)
	private Cart cart = new Cart();

	@OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<Address> addresses = new ArrayList<>();

	@Column(length = 200)
	private String recentlyViewedProducts;

	@Column(nullable = true, length = 500)
	private String profileImage;

	// ─── Getters ────────────────────────────────────────────────────────────────

	public int getId() { return id; }
	public String getName() { return name; }
	public String getEmail() { return email; }
	public long getMobile() { return mobile; }
	public String getPassword() { return password; }
	public String getConfirmPassword() { return confirmPassword; }
	public int getOtp() { return otp; }
	public boolean isVerified() { return verified; }
	public Role getRole() { return role; }
	public boolean isActive() { return active; }
	public LocalDateTime getLastLogin() { return lastLogin; }
	public String getProvider() { return provider; }
	public String getProviderId() { return providerId; }
	public Cart getCart() { return cart; }
	public List<Address> getAddresses() { return addresses; }
	public String getRecentlyViewedProducts() { return recentlyViewedProducts; }
	public String getProfileImage() { return profileImage; }

	// ─── Setters ────────────────────────────────────────────────────────────────

	public void setId(int id) { this.id = id; }
	public void setName(String name) { this.name = name; }
	public void setEmail(String email) { this.email = email; }
	public void setMobile(long mobile) { this.mobile = mobile; }
	public void setPassword(String password) { this.password = password; }
	public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
	public void setOtp(int otp) { this.otp = otp; }
	public void setVerified(boolean verified) { this.verified = verified; }
	public void setRole(Role role) { this.role = role; }
	public void setActive(boolean active) { this.active = active; }
	public void setLastLogin(LocalDateTime lastLogin) { this.lastLogin = lastLogin; }
	public void setProvider(String provider) { this.provider = provider; }
	public void setProviderId(String providerId) { this.providerId = providerId; }
	public void setCart(Cart cart) { this.cart = cart; }
	public void setAddresses(List<Address> addresses) { this.addresses = addresses; }
	public void setRecentlyViewedProducts(String recentlyViewedProducts) { this.recentlyViewedProducts = recentlyViewedProducts; }
	public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
}