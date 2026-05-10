package com.example.ekart.dto;

public class DeliveryBoyPinsUpdateResponse {

    private final boolean success;
    private final String message;
    private final String oldPins;
    private final String newPins;

    public DeliveryBoyPinsUpdateResponse(boolean success, String message, String oldPins, String newPins) {
        this.success = success;
        this.message = message;
        this.oldPins = oldPins;
        this.newPins = newPins;
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public String getOldPins() { return oldPins; }
    public String getNewPins() { return newPins; }
}