package com.example.ekart.dto;

import java.util.List;

public class WarehouseDeliveryBoysResponse {

    private final boolean success;
    private final String message;
    private final List<WarehouseDeliveryBoyItem> deliveryBoys;

    private WarehouseDeliveryBoysResponse(boolean success, String message, List<WarehouseDeliveryBoyItem> deliveryBoys) {
        this.success = success;
        this.message = message;
        this.deliveryBoys = deliveryBoys;
    }

    public static WarehouseDeliveryBoysResponse success(List<WarehouseDeliveryBoyItem> deliveryBoys) {
        return new WarehouseDeliveryBoysResponse(true, null, List.copyOf(deliveryBoys));
    }

    public static WarehouseDeliveryBoysResponse failure(String message) {
        return new WarehouseDeliveryBoysResponse(false, message, List.of());
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public List<WarehouseDeliveryBoyItem> getDeliveryBoys() { return deliveryBoys; }
}