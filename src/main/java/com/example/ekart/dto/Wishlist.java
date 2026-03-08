package com.example.ekart.dto;

import java.time.LocalDateTime;
<<<<<<< HEAD
import jakarta.persistence.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"customer_id", "product_id"}))
public class Wishlist {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    @ManyToOne private Customer customer;
    @ManyToOne private Product product;
    private LocalDateTime addedAt;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public LocalDateTime getAddedAt() { return addedAt; }
    public void setAddedAt(LocalDateTime addedAt) { this.addedAt = addedAt; }
}
=======

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

@Data
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"customer_id", "product_id"}))
public class Wishlist {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    
    @ManyToOne
    private Customer customer;
    
    @ManyToOne
    private Product product;
    
    private LocalDateTime addedAt;
}
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
