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
}
