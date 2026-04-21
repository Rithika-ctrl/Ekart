package com.example.ekart.dto;

public class EligibleDeliveryBoyItem {

    private final int id;
    private final String name;
    private final String code;
    private final String pins;
    private final String warehouse;
    private final boolean isAvailable;
    private final int activeOrders;
    private final int slots;
    private final boolean atCap;

    public EligibleDeliveryBoyItem(int id, String name, String code, String pins, String warehouse,
                                   boolean isAvailable, int activeOrders, int slots, boolean atCap) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.pins = pins;
        this.warehouse = warehouse;
        this.isAvailable = isAvailable;
        this.activeOrders = activeOrders;
        this.slots = slots;
        this.atCap = atCap;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public String getPins() { return pins; }
    public String getWarehouse() { return warehouse; }
    public boolean isAvailable() { return isAvailable; }
    public int getActiveOrders() { return activeOrders; }
    public int getSlots() { return slots; }
    public boolean isAtCap() { return atCap; }
}