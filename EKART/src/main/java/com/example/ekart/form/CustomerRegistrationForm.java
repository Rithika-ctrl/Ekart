package com.example.ekart.form;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Form POJO for customer registration.
 * <p>
 * Replaces the {@code @Entity Customer} as a Spring MVC model-attribute parameter,
 * fixing SonarQube java:S4684 (persistent entity used as request body).
 * Only contains fields the user is expected to submit via the HTML form.
 */
public class CustomerRegistrationForm {

    @Size(min = 5, max = 30, message = "* Enter Between 5~30 Charecters")
    private String name;

    @Email(message = "* Enter Proper Email")
    @NotEmpty(message = "* It is Required Field")
    private String email;

    @DecimalMin(value = "6000000000", message = "* Enter Proper Mobile Number")
    @DecimalMax(value = "9999999999", message = "* Enter Proper Mobile Number")
    private long mobile;

    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
             message = "* Password must be 8+ chars with upper, lower, digit and special character")
    private String password;

    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
             message = "* Password must be 8+ chars with upper, lower, digit and special character")
    private String confirmPassword;

    // ── Getters & Setters ───────────────────────────────────────────────────

    public String getName()                    { return name; }
    public void   setName(String name)         { this.name = name; }

    public String getEmail()                   { return email; }
    public void   setEmail(String email)       { this.email = email; }

    public long   getMobile()                  { return mobile; }
    public void   setMobile(long mobile)       { this.mobile = mobile; }

    public String getPassword()                { return password; }
    public void   setPassword(String p)        { this.password = p; }

    public String getConfirmPassword()         { return confirmPassword; }
    public void   setConfirmPassword(String p) { this.confirmPassword = p; }
}