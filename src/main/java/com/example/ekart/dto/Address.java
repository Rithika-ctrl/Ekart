/**
 * File: Address.java
 * Description: DTO representing a postal address for customers and orders.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.dto;

import jakarta.persistence.*;

/**
 * Structured delivery address.
 * Fields added: recipientName, houseStreet, city, state, postalCode.
 * Legacy `details` is kept so existing saved addresses are not lost —
 * getFormattedAddress() returns structured data when available,
 * otherwise falls back to the old flat details string.
 */
@Entity
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    // ── Legacy flat-text field (kept for backward compatibility) ──────────────
    private String details;

    // ── Structured fields (new) ───────────────────────────────────────────────
    @Column(length = 100)
    private String recipientName;

    /** House / flat / building number + street name */
    @Column(length = 200)
    private String houseStreet;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String postalCode;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;

    // ── Convenience helper ────────────────────────────────────────────────────

    /**
     * Returns a neatly formatted address string.
     * Uses structured fields when present; falls back to legacy `details`.
     */
    public String getFormattedAddress() {
        boolean hasStructured = recipientName != null && !recipientName.isBlank();
        if (hasStructured) {
            StringBuilder sb = new StringBuilder();
            sb.append(recipientName.trim());
            if (houseStreet != null && !houseStreet.isBlank())
                sb.append("\n").append(houseStreet.trim());
            if (city != null && !city.isBlank())
                sb.append("\n").append(city.trim());
            if (state != null && !state.isBlank()) {
                if (postalCode != null && !postalCode.isBlank())
                    sb.append(", ").append(state.trim()).append(" — ").append(postalCode.trim());
                else
                    sb.append(", ").append(state.trim());
            } else if (postalCode != null && !postalCode.isBlank()) {
                sb.append(" — ").append(postalCode.trim());
            }
            return sb.toString();
        }
        return details != null ? details : "";
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getHouseStreet() { return houseStreet; }
    public void setHouseStreet(String houseStreet) { this.houseStreet = houseStreet; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
}