package com.example.ekart.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Transient;

@Entity(name = "shopping_order")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String razorpay_payment_id;
    private String razorpay_order_id;

    private double amount;
    private LocalDateTime dateTime;

    // 🔥 NEW FEATURE FIELD
    private double deliveryCharge;

    private double totalPrice;

    @CreationTimestamp
    private LocalDateTime orderDate;

    private String deliveryTime;

    // 🔥 REPLACEMENT REQUEST — stored in DB
    private boolean replacementRequested = false;

    // 🔥 REAL-TIME TRACKING — tracking status for shipment
    @Enumerated(EnumType.STRING)
    private TrackingStatus trackingStatus = TrackingStatus.PROCESSING;

    // 🔥 CURRENT CITY — location tracking for shipment
    @Column(length = 100)
    private String currentCity;

    // 🔥 RETURN ELIGIBILITY — not stored in DB, computed at runtime
    @Transient
    private boolean returnEligible;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<Item> items = new ArrayList<Item>();

    @ManyToOne
    private Customer customer;

    // ─── Getters & Setters ───────────────────────────────────────

    public int getId() {
        return id;
    }
    public void setId(int id) {
        this.id = id;
    }

    public Customer getCustomer() {
        return customer;
    }
    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public String getRazorpay_payment_id() {
        return razorpay_payment_id;
    }
    public void setRazorpay_payment_id(String razorpay_payment_id) {
        this.razorpay_payment_id = razorpay_payment_id;
    }

    public String getRazorpay_order_id() {
        return razorpay_order_id;
    }
    public void setRazorpay_order_id(String razorpay_order_id) {
        this.razorpay_order_id = razorpay_order_id;
    }

    public double getAmount() {
        return amount;
    }
    public void setAmount(double amount) {
        this.amount = amount;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }
    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }

    public double getDeliveryCharge() {
        return deliveryCharge;
    }
    public void setDeliveryCharge(double deliveryCharge) {
        this.deliveryCharge = deliveryCharge;
    }

    public double getTotalPrice() {
        return totalPrice;
    }
    public void setTotalPrice(double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public LocalDateTime getOrderDate() {
        return orderDate;
    }
    public void setOrderDate(LocalDateTime orderDate) {
        this.orderDate = orderDate;
    }

    public String getDeliveryTime() {
        return deliveryTime;
    }
    public void setDeliveryTime(String deliveryTime) {
        this.deliveryTime = deliveryTime;
    }

    public boolean isReplacementRequested() {
        return replacementRequested;
    }
    public void setReplacementRequested(boolean replacementRequested) {
        this.replacementRequested = replacementRequested;
    }

    public TrackingStatus getTrackingStatus() {
        // Return default PROCESSING if null (for existing orders before tracking was added)
        return trackingStatus != null ? trackingStatus : TrackingStatus.PROCESSING;
    }
    public void setTrackingStatus(TrackingStatus trackingStatus) {
        this.trackingStatus = trackingStatus;
    }

    public String getCurrentCity() {
        return currentCity;
    }
    public void setCurrentCity(String currentCity) {
        this.currentCity = currentCity;
    }

    public boolean isReturnEligible() {
        return returnEligible;
    }
    public void setReturnEligible(boolean returnEligible) {
        this.returnEligible = returnEligible;
    }

    public List<Item> getItems() {
        return items;
    }
    public void setItems(List<Item> items) {
        this.items = items;
    }
}