package com.example.ekart.dto;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    
    private String details;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;
}