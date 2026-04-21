package com.example.ekart.dto;

public class DeliveryBoyLoadItem {

    private final int id;
    private final String name;
    private final String code;
    private final boolean isOnline;
    private final int activeOrders;
    private final int slots;
    private final int maxConcurrent;
    private final boolean atCap;
    private final String pins;
    private final String warehouse;

    public DeliveryBoyLoadItem(int id, String name, String code, boolean isOnline, int activeOrders,
                               int slots, int maxConcurrent, boolean atCap, String pins, String warehouse) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.isOnline = isOnline;
        this.activeOrders = activeOrders;
        this.slots = slots;
        this.maxConcurrent = maxConcurrent;
        this.atCap = atCap;
        this.pins = pins;
        this.warehouse = warehouse;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public boolean isOnline() { return isOnline; }
    public int getActiveOrders() { return activeOrders; }
    public int getSlots() { return slots; }
    public int getMaxConcurrent() { return maxConcurrent; }
    public boolean isAtCap() { return atCap; }
    public String getPins() { return pins; }
    public String getWarehouse() { return warehouse; }
}