package com.example.ekart.reporting;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * REPORTING ENTITY (Main PostgreSQL DB)
 * One row = one item sold in one order.
 * Tracks: sales, product-wise orders, category revenue.
 * 
 * Consolidated with main database for unified queryability.
 */
@Entity
@Table(name = "sales_record")
public class SalesRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    // Order relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private com.example.ekart.dto.Order order;
    private LocalDateTime orderDate;
    private double orderTotal;
    private double deliveryCharge;

    // Product relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private com.example.ekart.dto.Product product;
    private String productName;
    private String category;
    private double itemPrice;
    private int quantity;

    // Vendor relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private com.example.ekart.dto.Vendor vendor;
    private String vendorName;

    // Customer relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private com.example.ekart.dto.Customer customer;
    private String customerName;

    // ─── Getters & Setters ───────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public com.example.ekart.dto.Order getOrder() { return order; }
    public void setOrder(com.example.ekart.dto.Order order) { this.order = order; }

    public LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDateTime orderDate) { this.orderDate = orderDate; }

    public double getOrderTotal() { return orderTotal; }
    public void setOrderTotal(double orderTotal) { this.orderTotal = orderTotal; }

    public double getDeliveryCharge() { return deliveryCharge; }
    public void setDeliveryCharge(double deliveryCharge) { this.deliveryCharge = deliveryCharge; }

    public com.example.ekart.dto.Product getProduct() { return product; }
    public void setProduct(com.example.ekart.dto.Product product) { this.product = product; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public double getItemPrice() { return itemPrice; }
    public void setItemPrice(double itemPrice) { this.itemPrice = itemPrice; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public com.example.ekart.dto.Vendor getVendor() { return vendor; }
    public void setVendor(com.example.ekart.dto.Vendor vendor) { this.vendor = vendor; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public com.example.ekart.dto.Customer getCustomer() { return customer; }
    public void setCustomer(com.example.ekart.dto.Customer customer) { this.customer = customer; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
}