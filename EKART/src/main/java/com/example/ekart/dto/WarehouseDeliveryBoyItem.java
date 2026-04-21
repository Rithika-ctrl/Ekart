package com.example.ekart.dto;

public class WarehouseDeliveryBoyItem {

    private final int id;
    private final String name;
    private final String code;
    private final String pins;
    private final boolean isAvailable;
    private final int activeOrders;
    private final boolean atCap;

    public WarehouseDeliveryBoyItem(int id, String name, String code, String pins,
                                    boolean isAvailable, int activeOrders, boolean atCap) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.pins = pins;
        this.isAvailable = isAvailable;
        this.activeOrders = activeOrders;
        this.atCap = atCap;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public String getPins() { return pins; }
    public boolean isAvailable() { return isAvailable; }
    public int getActiveOrders() { return activeOrders; }
    public boolean isAtCap() { return atCap; }
}