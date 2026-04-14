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
    @Index(name = "idx_order_date",     columnList = "order_date"),
    @Index(name = "idx_order_customer", columnList = "customer_id"),
    @Index(name = "idx_order_parent",   columnList = "parent_order_id")
})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = true, length = 100)
    private String razorpay_payment_id;

    @Column(nullable = true, length = 100)
    private String razorpay_order_id;

    @Column(columnDefinition = "FLOAT8 DEFAULT 0")
    private double amount = 0;

    @Column(name = "date_time", nullable = true)
    private LocalDateTime dateTime;

    @Column(name = "delivery_charge", columnDefinition = "FLOAT8 DEFAULT 0")
    private double deliveryCharge = 0;

    @Column(name = "total_price", columnDefinition = "FLOAT8 DEFAULT 0")
    private double totalPrice = 0;

    /**
     * GST component back-calculated from the order's item prices (inclusive pricing).
     * Stored at order placement time so invoices and history always show the correct
     * GST even if rates change later.
     * 0.0 for legacy orders placed before GST tracking was added.
     */
    @Column(name = "gst_amount", columnDefinition = "FLOAT8 DEFAULT 0")
    private double gstAmount = 0;

    @Column(name = "payment_mode", nullable = true, length = 50)
    private String paymentMode;

    @CreationTimestamp
    @Column(name = "order_date")
    private LocalDateTime orderDate;

    @Column(name = "delivery_time", nullable = true, length = 300)
    private String deliveryTime;

    @Column(name = "replacement_requested", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean replacementRequested = false;

    @Column(name = "tracking_status", length = 50)
    @Enumerated(EnumType.STRING)
    private TrackingStatus trackingStatus = TrackingStatus.PROCESSING;

    @Column(name = "current_city", nullable = true, length = 100)
    private String currentCity;

    @Transient
    private boolean returnEligible;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
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

    @Column(name = "delivery_pin_code", length = 10)
    private String deliveryPinCode;

    /**
     * Snapshot of the customer's delivery address at checkout.
     * Format: "RecipientName | HouseStreet, City, State - PostalCode"
     */
    @Column(name = "delivery_address", length = 500)
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
    @Column(name = "parent_order_id", nullable = true)
    private Integer parentOrderId;

    /**
     * The vendor who owns the items in this sub-order.
     * null for legacy orders. Use this relationship instead of vendorId.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;


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

    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
}