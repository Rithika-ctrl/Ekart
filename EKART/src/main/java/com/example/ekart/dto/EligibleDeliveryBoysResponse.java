package com.example.ekart.dto;

import java.util.List;

public class EligibleDeliveryBoysResponse {

    private final boolean success;
    private final String message;
    private final List<EligibleDeliveryBoyItem> deliveryBoys;
    private final String orderPin;

    private EligibleDeliveryBoysResponse(boolean success, String message,
                                         List<EligibleDeliveryBoyItem> deliveryBoys, String orderPin) {
        this.success = success;
        this.message = message;
        this.deliveryBoys = deliveryBoys;
        this.orderPin = orderPin;
    }

    public static EligibleDeliveryBoysResponse success(List<EligibleDeliveryBoyItem> deliveryBoys, String orderPin) {
        return new EligibleDeliveryBoysResponse(true, null, List.copyOf(deliveryBoys), orderPin);
    }

    public static EligibleDeliveryBoysResponse failure(String message) {
        return new EligibleDeliveryBoysResponse(false, message, List.of(), null);
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public List<EligibleDeliveryBoyItem> getDeliveryBoys() { return deliveryBoys; }
    public String getOrderPin() { return orderPin; }
}