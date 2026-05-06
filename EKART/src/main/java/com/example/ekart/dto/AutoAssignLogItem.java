package com.example.ekart.dto;

/**
 * S107 fix: constructor reduced below 8 parameters via static Builder.
 * Callers: new AutoAssignLogItem.Builder(id, orderId).deliveryBoyName(...).build()
 */
public class AutoAssignLogItem {

    private final int    id;
    private final int    orderId;
    private final String deliveryBoyName;
    private final String deliveryBoyCode;
    private final String pinCode;
    private final String assignedAt;
    private final int    activeOrdersAtAssignment;
    private final int    maxConcurrent;

    private AutoAssignLogItem(Builder b) {
        this.id                       = b.id;
        this.orderId                  = b.orderId;
        this.deliveryBoyName          = b.deliveryBoyName;
        this.deliveryBoyCode          = b.deliveryBoyCode;
        this.pinCode                  = b.pinCode;
        this.assignedAt               = b.assignedAt;
        this.activeOrdersAtAssignment = b.activeOrdersAtAssignment;
        this.maxConcurrent            = b.maxConcurrent;
    }

    // ── Builder ──────────────────────────────────────────────────────────────
    public static class Builder {
        private final int id;
        private final int orderId;
        private String deliveryBoyName;
        private String deliveryBoyCode;
        private String pinCode;
        private String assignedAt;
        private int    activeOrdersAtAssignment;
        private int    maxConcurrent;

        public Builder(int id, int orderId) {
            this.id      = id;
            this.orderId = orderId;
        }

        public Builder deliveryBoyName(String v)          { this.deliveryBoyName = v;          return this; }
        public Builder deliveryBoyCode(String v)          { this.deliveryBoyCode = v;          return this; }
        public Builder pinCode(String v)                  { this.pinCode = v;                  return this; }
        public Builder assignedAt(String v)               { this.assignedAt = v;               return this; }
        public Builder activeOrdersAtAssignment(int v)    { this.activeOrdersAtAssignment = v; return this; }
        public Builder maxConcurrent(int v)               { this.maxConcurrent = v;            return this; }

        public AutoAssignLogItem build() { return new AutoAssignLogItem(this); }
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    public int    getId()                       { return id; }
    public int    getOrderId()                  { return orderId; }
    public String getDeliveryBoyName()          { return deliveryBoyName; }
    public String getDeliveryBoyCode()          { return deliveryBoyCode; }
    public String getPinCode()                  { return pinCode; }
    public String getAssignedAt()               { return assignedAt; }
    public int    getActiveOrdersAtAssignment() { return activeOrdersAtAssignment; }
    public int    getMaxConcurrent()            { return maxConcurrent; }
}