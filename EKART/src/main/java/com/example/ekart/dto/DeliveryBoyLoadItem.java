package com.example.ekart.dto;

/**
 * S107 fix: 10-param constructor replaced with static Builder pattern.
 * Usage: new DeliveryBoyLoadItem.Builder(id, name, code).isOnline(...).build()
 */
public class DeliveryBoyLoadItem {

    private final int     id;
    private final String  name;
    private final String  code;
    private final boolean isOnline;
    private final int     activeOrders;
    private final int     slots;
    private final int     maxConcurrent;
    private final boolean atCap;
    private final String  pins;
    private final String  warehouse;

    private DeliveryBoyLoadItem(Builder b) {
        this.id            = b.id;
        this.name          = b.name;
        this.code          = b.code;
        this.isOnline      = b.isOnline;
        this.activeOrders  = b.activeOrders;
        this.slots         = b.slots;
        this.maxConcurrent = b.maxConcurrent;
        this.atCap         = b.atCap;
        this.pins          = b.pins;
        this.warehouse     = b.warehouse;
    }

    // ── Builder ──────────────────────────────────────────────────────────────
    public static class Builder {
        private final int    id;
        private final String name;
        private final String code;
        private boolean isOnline;
        private int     activeOrders;
        private int     slots;
        private int     maxConcurrent;
        private boolean atCap;
        private String  pins;
        private String  warehouse;

        public Builder(int id, String name, String code) {
            this.id   = id;
            this.name = name;
            this.code = code;
        }

        public Builder isOnline(boolean v)      { this.isOnline = v;       return this; }
        public Builder activeOrders(int v)      { this.activeOrders = v;   return this; }
        public Builder slots(int v)             { this.slots = v;          return this; }
        public Builder maxConcurrent(int v)     { this.maxConcurrent = v;  return this; }
        public Builder atCap(boolean v)         { this.atCap = v;          return this; }
        public Builder pins(String v)           { this.pins = v;           return this; }
        public Builder warehouse(String v)      { this.warehouse = v;      return this; }

        public DeliveryBoyLoadItem build() { return new DeliveryBoyLoadItem(this); }
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    public int     getId()            { return id; }
    public String  getName()          { return name; }
    public String  getCode()          { return code; }
    public boolean isOnline()         { return isOnline; }
    public int     getActiveOrders()  { return activeOrders; }
    public int     getSlots()         { return slots; }
    public int     getMaxConcurrent() { return maxConcurrent; }
    public boolean isAtCap()          { return atCap; }
    public String  getPins()          { return pins; }
    public String  getWarehouse()     { return warehouse; }
}