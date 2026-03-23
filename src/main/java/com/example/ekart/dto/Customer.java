/**
 * File: Customer.java
 * Description: DTO representing a registered customer and profile fields.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
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
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
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

	// ✅ FIX B: Added profileImage field required by customer-proflie.html
	//    template uses ${customer.profileImage} — this field was missing from entity.
	//    JPA will auto-add this column to the customer table on next startup (ddl-auto=update).
	@Column(nullable = true, length = 500)
	private String profileImage;

}
