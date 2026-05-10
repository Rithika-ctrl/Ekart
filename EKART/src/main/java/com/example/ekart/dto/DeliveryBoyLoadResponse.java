package com.example.ekart.dto;

import java.util.List;

public class DeliveryBoyLoadResponse {

    private final boolean success;
    private final String message;
    private final List<DeliveryBoyLoadItem> deliveryBoys;
    private final int maxConcurrent;

    private DeliveryBoyLoadResponse(boolean success, String message, List<DeliveryBoyLoadItem> deliveryBoys,
                                    int maxConcurrent) {
        this.success = success;
        this.message = message;
        this.deliveryBoys = deliveryBoys;
        this.maxConcurrent = maxConcurrent;
    }

    public static DeliveryBoyLoadResponse success(List<DeliveryBoyLoadItem> deliveryBoys, int maxConcurrent) {
        return new DeliveryBoyLoadResponse(true, null, List.copyOf(deliveryBoys), maxConcurrent);
    }

    public static DeliveryBoyLoadResponse failure(String message) {
        return new DeliveryBoyLoadResponse(false, message, List.of(), 0);
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public List<DeliveryBoyLoadItem> getDeliveryBoys() { return deliveryBoys; }
    public int getMaxConcurrent() { return maxConcurrent; }
}