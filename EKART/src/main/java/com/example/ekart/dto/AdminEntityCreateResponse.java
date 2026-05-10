package com.example.ekart.dto;

public class AdminEntityCreateResponse {

    private final boolean success;
    private final String message;
    private final Integer warehouseId;
    private final Integer deliveryBoyId;

    private AdminEntityCreateResponse(boolean success, String message, Integer warehouseId, Integer deliveryBoyId) {
        this.success = success;
        this.message = message;
        this.warehouseId = warehouseId;
        this.deliveryBoyId = deliveryBoyId;
    }

    public static AdminEntityCreateResponse failure(String message) {
        return new AdminEntityCreateResponse(false, message, null, null);
    }

    public static AdminEntityCreateResponse warehouseSuccess(String message, int warehouseId) {
        return new AdminEntityCreateResponse(true, message, warehouseId, null);
    }

    public static AdminEntityCreateResponse deliveryBoySuccess(String message, int deliveryBoyId) {
        return new AdminEntityCreateResponse(true, message, null, deliveryBoyId);
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public Integer getWarehouseId() { return warehouseId; }
    public Integer getDeliveryBoyId() { return deliveryBoyId; }
}