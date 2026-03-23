package com.example.ekart.dto;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
public class StockAlert {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    @ManyToOne private Product product;
    @ManyToOne private Vendor vendor;
    private int stockLevel;
    private LocalDateTime alertTime;
    private boolean emailSent;
    private boolean acknowledged;
    private String message;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    public int getStockLevel() { return stockLevel; }
    public void setStockLevel(int stockLevel) { this.stockLevel = stockLevel; }
    public LocalDateTime getAlertTime() { return alertTime; }
    public void setAlertTime(LocalDateTime alertTime) { this.alertTime = alertTime; }
    public boolean isEmailSent() { return emailSent; }
    public void setEmailSent(boolean emailSent) { this.emailSent = emailSent; }
    public boolean isAcknowledged() { return acknowledged; }
    public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}