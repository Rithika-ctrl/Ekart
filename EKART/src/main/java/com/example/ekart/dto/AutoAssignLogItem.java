package com.example.ekart.dto;

public class AutoAssignLogItem {

    private final int id;
    private final int orderId;
    private final String deliveryBoyName;
    private final String deliveryBoyCode;
    private final String pinCode;
    private final String assignedAt;
    private final int activeOrdersAtAssignment;
    private final int maxConcurrent;

    public AutoAssignLogItem(int id, int orderId, String deliveryBoyName, String deliveryBoyCode,
                             String pinCode, String assignedAt, int activeOrdersAtAssignment,
                             int maxConcurrent) {
        this.id = id;
        this.orderId = orderId;
        this.deliveryBoyName = deliveryBoyName;
        this.deliveryBoyCode = deliveryBoyCode;
        this.pinCode = pinCode;
        this.assignedAt = assignedAt;
        this.activeOrdersAtAssignment = activeOrdersAtAssignment;
        this.maxConcurrent = maxConcurrent;
    }

    public int getId() { return id; }
    public int getOrderId() { return orderId; }
    public String getDeliveryBoyName() { return deliveryBoyName; }
    public String getDeliveryBoyCode() { return deliveryBoyCode; }
    public String getPinCode() { return pinCode; }
    public String getAssignedAt() { return assignedAt; }
    public int getActiveOrdersAtAssignment() { return activeOrdersAtAssignment; }
    public int getMaxConcurrent() { return maxConcurrent; }
}