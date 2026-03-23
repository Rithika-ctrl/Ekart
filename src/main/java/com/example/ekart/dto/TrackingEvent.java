/**
 * File: TrackingEvent.java
 * Description: DTO representing types of tracking events for order lifecycle.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.dto;

import java.time.LocalDateTime;

/**
 * DTO for tracking history events.
 * Used to return timestamped location updates for order tracking.
 */
public class TrackingEvent {

    private LocalDateTime timestamp;
    private TrackingStatus status;
    private String location;
    private String description;

    public TrackingEvent() {}

    public TrackingEvent(LocalDateTime timestamp, TrackingStatus status, String location, String description) {
        this.timestamp = timestamp;
        this.status = status;
        this.location = location;
        this.description = description;
    }

    // ─── Getters & Setters ───────────────────────────────────────

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public TrackingStatus getStatus() {
        return status;
    }
    public void setStatus(TrackingStatus status) {
        this.status = status;
    }

    public String getLocation() {
        return location;
    }
    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }
}
