package com.example.ekart.dto;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

/**
 * Persistent record of a customer-reported order dispute or issue.
 *
 * Each row is immutable after creation (disputes are never updated — a new row
 * is added for each report).  Admin visibility is provided via the admin
 * dashboard by querying this table.
 */
@Entity
public class OrderDispute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** The order the customer is disputing. */
    @ManyToOne
    private Order order;

    /** The customer who raised the dispute. */
    @ManyToOne
    private Customer customer;

    /** Short reason category supplied by the customer (e.g. "Wrong item"). */
    @Column(length = 255, nullable = false)
    private String reason;

    /** Optional free-text description provided by the customer. */
    @Column(length = 2000)
    private String description;

    /** IP address of the request, stored for fraud/audit purposes. */
    @Column(length = 64)
    private String reportedFromIp;

    /** Timestamp set automatically on insert. */
    @CreationTimestamp
    private LocalDateTime reportedAt;

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getReportedFromIp() { return reportedFromIp; }
    public void setReportedFromIp(String reportedFromIp) { this.reportedFromIp = reportedFromIp; }

    public LocalDateTime getReportedAt() { return reportedAt; }
    public void setReportedAt(LocalDateTime reportedAt) { this.reportedAt = reportedAt; }
}