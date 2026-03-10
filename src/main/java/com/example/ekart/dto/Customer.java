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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.Serializable;

@Entity
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

	// ✅ FIX B: Added profileImage field required by customer-proflie.html
	//    template uses ${customer.profileImage} — this field was missing from entity.
	//    JPA will auto-add this column to the customer table on next startup (ddl-auto=update).
	@Column(nullable = true, length = 500)
	private String profileImage;

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
	public void setOtp(int otp) { this.otp = otp; }
	public boolean isVerified() { return verified; }
	public void setVerified(boolean verified) { this.verified = verified; }
	public Role getRole() { return role; }
	public void setRole(Role role) { this.role = role; }
	public boolean isActive() { return active; }
	public void setActive(boolean active) { this.active = active; }
	public LocalDateTime getLastLogin() { return lastLogin; }
	public void setLastLogin(LocalDateTime lastLogin) { this.lastLogin = lastLogin; }
	public String getProvider() { return provider; }
	public void setProvider(String provider) { this.provider = provider; }
	public String getProviderId() { return providerId; }
	public void setProviderId(String providerId) { this.providerId = providerId; }
	public Cart getCart() { return cart; }
	public void setCart(Cart cart) { this.cart = cart; }
	public List<Address> getAddresses() { return addresses; }
	public void setAddresses(List<Address> addresses) { this.addresses = addresses; }
	public String getRecentlyViewedProducts() { return recentlyViewedProducts; }
	public void setRecentlyViewedProducts(String s) { this.recentlyViewedProducts = s; }

	// ✅ FIX B: getter/setter for profileImage
	public String getProfileImage() { return profileImage; }
	public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
}