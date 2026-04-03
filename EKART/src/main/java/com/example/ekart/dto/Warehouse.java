package com.example.ekart.dto;

import jakarta.persistence.*;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/Warehouse.java
 *
 * NEW FILE — copy as-is into that location.
 *
 * Represents a physical warehouse that serves a set of pin codes.
 * When an order is placed, the system auto-assigns the warehouse
 * whose servedPinCodes contains the customer's delivery pin code.
 */
@Entity
@Table(name = "warehouse")
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** e.g. "Chennai Central Warehouse" */
    @Column(nullable = false, length = 100)
    private String name;

    /** e.g. "Chennai" */
    @Column(nullable = false, length = 100)
    private String city;

    /** e.g. "Tamil Nadu" */
    @Column(nullable = false, length = 100)
    private String state;

    /** e.g. "WH-001" — auto-generated after save */
    @Column(name = "warehouse_code", unique = true, nullable = true, length = 20)
    private String warehouseCode;

    /**
     * Comma-separated 6-digit pin codes this warehouse serves.
     * e.g. "600001,600002,600003,600004"
     * On order placement we check if customerPinCode is in this list.
     */
    @Column(name = "served_pin_codes", nullable = false, length = 5000)
    private String servedPinCodes = "";

    private boolean active = true;

    // ── Getters & Setters ─────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getWarehouseCode() { return warehouseCode; }
    public void setWarehouseCode(String warehouseCode) { this.warehouseCode = warehouseCode; }

    public String getServedPinCodes() { return servedPinCodes; }
    public void setServedPinCodes(String servedPinCodes) { this.servedPinCodes = servedPinCodes; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    /** Returns true if this warehouse serves the given pin code. */
    public boolean serves(String pinCode) {
        if (pinCode == null || pinCode.isBlank() || servedPinCodes == null) return false;
        String pin = pinCode.trim();
        for (String p : servedPinCodes.split(",")) {
            if (p.trim().equals(pin)) return true;
        }
        return false;
    }
}
