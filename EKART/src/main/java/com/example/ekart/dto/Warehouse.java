package com.example.ekart.dto;

import jakarta.persistence.*;
import java.util.Random;

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

    /**
     * Latitude coordinate for warehouse location.
     * Used for calculating distances to intermediate hubs in multi-city routing.
     */
    @Column(name = "latitude", nullable = true)
    private Double latitude;

    /**
     * Longitude coordinate for warehouse location.
     * Used for calculating distances to intermediate hubs in multi-city routing.
     */
    @Column(name = "longitude", nullable = true)
    private Double longitude;

    /**
     * Distance from delivery location in kilometers.
     * Calculated during multi-city routing to find optimal intermediate hub.
     */
    @Column(name = "distance_from_location_km", nullable = true)
    private Double distanceFromLocationKm;

    /** 8-digit numeric login ID, auto-generated when warehouse is created by admin.
     *  e.g. 12345678. This is used by warehouse staff to log in. */
    @Column(name = "warehouse_login_id", unique = true, nullable = true, length = 8)
    private String warehouseLoginId;

    /** 6-digit numeric password, auto-generated when warehouse is created by admin.
     *  Stored as AES-encrypted string. Plain text is shown to admin once only. */
    @Column(name = "warehouse_login_password", nullable = true, length = 255)
    private String warehouseLoginPassword;

    /** Contact email for the warehouse (used to send credentials). */
    @Column(name = "contact_email", nullable = true, length = 100)
    private String contactEmail;

    /** Contact phone for the warehouse. */
    @Column(name = "contact_phone", nullable = true, length = 15)
    private String contactPhone;

    /** City of the warehouse (display name, may differ from routing city). */
    @Column(name = "address", nullable = true, length = 300)
    private String address;

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

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getDistanceFromLocationKm() { return distanceFromLocationKm; }
    public void setDistanceFromLocationKm(Double distanceFromLocationKm) { this.distanceFromLocationKm = distanceFromLocationKm; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getWarehouseLoginId() { return warehouseLoginId; }
    public void setWarehouseLoginId(String warehouseLoginId) { this.warehouseLoginId = warehouseLoginId; }

    public String getWarehouseLoginPassword() { return warehouseLoginPassword; }
    public void setWarehouseLoginPassword(String warehouseLoginPassword) { this.warehouseLoginPassword = warehouseLoginPassword; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    /** Returns true if this warehouse serves the given pin code. */
    public boolean serves(String pinCode) {
        if (pinCode == null || pinCode.isBlank() || servedPinCodes == null) return false;
        String pin = pinCode.trim();
        for (String p : servedPinCodes.split(",")) {
            if (p.trim().equals(pin)) return true;
        }
        return false;
    }

    /**
     * Calculates the distance between this warehouse and another warehouse
     * using the Haversine formula (great-circle distance).
     * Returns distance in kilometers.
     */
    public double calculateDistanceTo(Warehouse other) {
        if (this.latitude == null || this.longitude == null ||
            other.latitude == null || other.longitude == null) {
            return Double.MAX_VALUE;  // Unknown distance
        }

        double lat1 = Math.toRadians(this.latitude);
        double lon1 = Math.toRadians(this.longitude);
        double lat2 = Math.toRadians(other.latitude);
        double lon2 = Math.toRadians(other.longitude);

        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(lat1) * Math.cos(lat2) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double radiusEarth = 6371;  // km

        return radiusEarth * c;
    }

    /** Generate a random 8-digit numeric string for warehouse login ID. */
    public static String generateLoginId() {
        Random rng = new Random();
        int num = 10000000 + rng.nextInt(90000000);
        return String.valueOf(num);
    }

    /** Generate a random 6-digit numeric string for warehouse login password. */
    public static String generateLoginPassword() {
        Random rng = new Random();
        int num = 100000 + rng.nextInt(900000);
        return String.valueOf(num);
    }
}
