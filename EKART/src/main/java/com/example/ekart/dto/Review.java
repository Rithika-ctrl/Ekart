package com.example.ekart.dto;
import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(
    uniqueConstraints = @UniqueConstraint(
        name = "uk_review_customer_product",
        columnNames = {"customer_id", "product_id"}
    )
)
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private int rating;

    @Column(length = 1000)
    private String comment;

    private String customerName;

    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne
    private Product product;

    @PrePersist
    public void prePersist() {
        syncCustomerNameFromCustomer();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        syncCustomerNameFromCustomer();
    }

    private void syncCustomerNameFromCustomer() {
        if (customer != null && customer.getName() != null && !customer.getName().isBlank()) {
            customerName = customer.getName();
        }
    }

    // ── Getters & Setters ──────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getCustomerName() {
        if (customer != null && customer.getName() != null && !customer.getName().isBlank()) {
            return customer.getName();
        }
        return customerName;
    }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) {
        this.customer = customer;
        syncCustomerNameFromCustomer();
    }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    // Helper: returns star string like "★★★★☆"
    public String getStarDisplay() {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) sb.append(i <= rating ? "★" : "☆");
        return sb.toString();
    }
}
