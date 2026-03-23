/**
 * File: Order.java
 * Description: DTO representing a customer order and its associated items and status.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
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
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/Order.java
 *
 * Each Order now represents ONE vendor's items within a customer purchase.
 * When a customer has items from N vendors, N sub-orders are created,
 * all sharing the same parentOrderId so they can be grouped on the UI.
 *
 * parentOrderId = null  → single-vendor order (legacy / single vendor cart)
 * parentOrderId = X     → sub-order belonging to group X
 */
@Entity(name = "shopping_order")
@Table(name = "shopping_order", indexes = {
    @Index(name = "idx_order_date",     columnList = "orderDate"),
    @Index(name = "idx_order_customer", columnList = "customer_id"),
    @Index(name = "idx_order_parent",   columnList = "parentOrderId")
})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String razorpay_payment_id;
    private String razorpay_order_id;

    private double amount;
    private LocalDateTime dateTime;

    @Column(columnDefinition = "DOUBLE DEFAULT 0")
    private double deliveryCharge;

    @Column(columnDefinition = "DOUBLE DEFAULT 0")
    private double totalPrice;

    /**
     * GST component back-calculated from the order's item prices (inclusive pricing).
     * Stored at order placement time so invoices and history always show the correct
     * GST even if rates change later.
     * 0.0 for legacy orders placed before GST tracking was added.
     */
    @Column(columnDefinition = "DOUBLE DEFAULT 0")
    private double gstAmount;

    private String paymentMode;

    @CreationTimestamp
    private LocalDateTime orderDate;

    private String deliveryTime;

    private boolean replacementRequested = false;

    @Column(length = 50)
    @Enumerated(EnumType.STRING)
    private TrackingStatus trackingStatus = TrackingStatus.PROCESSING;

    @Column(length = 100)
    private String currentCity;

    @Transient
    private boolean returnEligible;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<Item> items = new ArrayList<Item>();

    @ManyToOne
    private Customer customer;

    // ─── DELIVERY SYSTEM FIELDS ───────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_boy_id")
    private DeliveryBoy deliveryBoy;

    @Column(length = 10)
    private String deliveryPinCode;

    /**
     * Snapshot of the customer's delivery address at checkout.
     * Format: "RecipientName | HouseStreet, City, State - PostalCode"
     */
    @Column(length = 500)
    private String deliveryAddress;

    // ─── SUB-ORDER SUPPORT ────────────────────────────────────────

    /**
     * When a cart has items from multiple vendors, one sub-order is
     * created per vendor. All sub-orders in the same purchase share
     * the same parentOrderId (= the id of the first sub-order saved).
     *
     * null  → single-vendor order or legacy order
     * non-null → this order is part of a multi-vendor split purchase
     */
    @Column(nullable = true)
    private Integer parentOrderId;

    /**
     * The vendor who owns the items in this sub-order.
     * null for legacy orders.
     */
    @Column(nullable = true)
    private Integer vendorId;

    @Column(nullable = true, length = 100)
    private String vendorName;

    // ─── Getters & Setters ────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public String getRazorpay_payment_id() { return razorpay_payment_id; }
    public void setRazorpay_payment_id(String razorpay_payment_id) { this.razorpay_payment_id = razorpay_payment_id; }

    public String getRazorpay_order_id() { return razorpay_order_id; }
    public void setRazorpay_order_id(String razorpay_order_id) { this.razorpay_order_id = razorpay_order_id; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public LocalDateTime getDateTime() { return dateTime; }
    public void setDateTime(LocalDateTime dateTime) { this.dateTime = dateTime; }

    public double getDeliveryCharge() { return deliveryCharge; }
    public void setDeliveryCharge(double deliveryCharge) { this.deliveryCharge = deliveryCharge; }

    public double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(double totalPrice) { this.totalPrice = totalPrice; }

    public double getGstAmount() { return gstAmount; }
    public void setGstAmount(double gstAmount) { this.gstAmount = gstAmount; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }

    public LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDateTime orderDate) { this.orderDate = orderDate; }

    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }

    public boolean isReplacementRequested() { return replacementRequested; }
    public void setReplacementRequested(boolean replacementRequested) { this.replacementRequested = replacementRequested; }

    public TrackingStatus getTrackingStatus() {
        return trackingStatus != null ? trackingStatus : TrackingStatus.PROCESSING;
    }
    public void setTrackingStatus(TrackingStatus trackingStatus) { this.trackingStatus = trackingStatus; }

    public String getCurrentCity() { return currentCity; }
    public void setCurrentCity(String currentCity) { this.currentCity = currentCity; }

    public boolean isReturnEligible() { return returnEligible; }
    public void setReturnEligible(boolean returnEligible) { this.returnEligible = returnEligible; }

    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }

    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }

    public DeliveryBoy getDeliveryBoy() { return deliveryBoy; }
    public void setDeliveryBoy(DeliveryBoy deliveryBoy) { this.deliveryBoy = deliveryBoy; }

    public String getDeliveryPinCode() { return deliveryPinCode; }
    public void setDeliveryPinCode(String deliveryPinCode) { this.deliveryPinCode = deliveryPinCode; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public Integer getParentOrderId() { return parentOrderId; }
    public void setParentOrderId(Integer parentOrderId) { this.parentOrderId = parentOrderId; }

    public Integer getVendorId() { return vendorId; }
    public void setVendorId(Integer vendorId) { this.vendorId = vendorId; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }
}