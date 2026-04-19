package com.example.ekart.dto;
import java.time.LocalDateTime;

import jakarta.persistence.*;

/**
 * Stores a customer's "Notify Me" subscription for an out-of-stock product.
 * When the product's stock is restored, all subscribers get an email.
 */
@Entity
@Table(name = "back_in_stock_subscription",
       uniqueConstraints = @UniqueConstraint(columnNames = {"customer_id", "product_id"}))
public class BackInStockSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private LocalDateTime subscribedAt;

    /** True once the back-in-stock email has been sent — prevents duplicate emails */
    @Column(nullable = false)
    private boolean notified = false;

    @Column(nullable = true)
    private LocalDateTime notifiedAt;

    // ── Constructors ────────────────────────────────────────────────────
    public BackInStockSubscription() {}

    public BackInStockSubscription(Customer customer, Product product) {
        this.customer     = customer;
        this.product      = product;
        this.subscribedAt = LocalDateTime.now();
        this.notified     = false;
    }

    // ── Getters / Setters ────────────────────────────────────────────────
    public int getId()                          { return id; }
    public void setId(int id)                   { this.id = id; }

    public Customer getCustomer()               { return customer; }
    public void setCustomer(Customer customer)  { this.customer = customer; }

    public Product getProduct()                 { return product; }
    public void setProduct(Product product)     { this.product = product; }

    public LocalDateTime getSubscribedAt()      { return subscribedAt; }
    public void setSubscribedAt(LocalDateTime t){ this.subscribedAt = t; }

    public boolean isNotified()                 { return notified; }
    public void setNotified(boolean notified)   { this.notified = notified; }

    public LocalDateTime getNotifiedAt()        { return notifiedAt; }
    public void setNotifiedAt(LocalDateTime t)  { this.notifiedAt = t; }
}
