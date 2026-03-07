package com.example.ekart.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for order tracking API response.
 * Returns current status and timestamped history of location updates.
 */
public class TrackingResponse {

    private int orderId;
    private TrackingStatus currentStatus;
    private String currentCity;
    private LocalDateTime estimatedDelivery;
    private List<TrackingEvent> history;
    private int progressPercent;

    public TrackingResponse() {}

    // ─── Getters & Setters ───────────────────────────────────────

    public int getOrderId() {
        return orderId;
    }
    public void setOrderId(int orderId) {
        this.orderId = orderId;
    }

    public TrackingStatus getCurrentStatus() {
        return currentStatus;
    }
    public void setCurrentStatus(TrackingStatus currentStatus) {
        this.currentStatus = currentStatus;
    }

    public String getCurrentCity() {
        return currentCity;
    }
    public void setCurrentCity(String currentCity) {
        this.currentCity = currentCity;
    }

    public LocalDateTime getEstimatedDelivery() {
        return estimatedDelivery;
    }
    public void setEstimatedDelivery(LocalDateTime estimatedDelivery) {
        this.estimatedDelivery = estimatedDelivery;
    }

    public List<TrackingEvent> getHistory() {
        return history;
    }
    public void setHistory(List<TrackingEvent> history) {
        this.history = history;
    }

    public int getProgressPercent() {
        return progressPercent;
    }
    public void setProgressPercent(int progressPercent) {
        this.progressPercent = progressPercent;
    }
}
