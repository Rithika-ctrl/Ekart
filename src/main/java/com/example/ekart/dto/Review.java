package com.example.ekart.dto;

import jakarta.persistence.*;
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
}