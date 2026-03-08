package com.example.ekart.dto;

import jakarta.persistence.*;
<<<<<<< HEAD

@Entity
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private int rating;
    private String comment;
    private String customerName;
    @ManyToOne private Product product;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
=======
import lombok.Data;

@Entity
@Data
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private int rating; // Will store 1 to 5
    private String comment;
    private String customerName;

    @ManyToOne
    private Product product; // Links the review to a specific product
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
}