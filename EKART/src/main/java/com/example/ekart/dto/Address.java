package com.example.ekart.dto;

import jakarta.persistence.*;
import java.io.Serializable;

/**
 * Structured delivery address.
 * Fields added: recipientName, houseStreet, city, state, postalCode.
 * Legacy `details` is kept so existing saved addresses are not lost —
 * getFormattedAddress() returns structured data when available,
 * otherwise falls back to the old flat details string.
 */
@Entity
public class Address implements Serializable {
    private static final long serialVersionUID = 1L;

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
     * Uses structured fields when present; falls back to legacy {@code details}.
     */
    public String getFormattedAddress() {
        if (recipientName == null || recipientName.isBlank()) {
            return details != null ? details : "";
        }
        StringBuilder sb = new StringBuilder(recipientName.trim());
        appendIfPresent(sb, houseStreet);
        appendIfPresent(sb, city);
        appendStatePostal(sb);
        return sb.toString();
    }

    /** Appends a newline + trimmed value when the field is non-blank. */
    private void appendIfPresent(StringBuilder sb, String value) {
        if (value != null && !value.isBlank()) {
            sb.append("\n").append(value.trim());
        }
    }

    /** Appends the state / postal-code line in the correct format. */
    private void appendStatePostal(StringBuilder sb) {
        boolean hasState  = state      != null && !state.isBlank();
        boolean hasPostal = postalCode != null && !postalCode.isBlank();
        if (hasState && hasPostal) {
            sb.append(", ").append(state.trim()).append(" — ").append(postalCode.trim());
        } else if (hasState) {
            sb.append(", ").append(state.trim());
        } else if (hasPostal) {
            sb.append(" — ").append(postalCode.trim());
        }
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