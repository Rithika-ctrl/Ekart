package com.example.ekart.dto;

import jakarta.persistence.*;

@Entity
public class Address {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String details;
    @ManyToOne @JoinColumn(name = "customer_id")
    private Customer customer;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
}