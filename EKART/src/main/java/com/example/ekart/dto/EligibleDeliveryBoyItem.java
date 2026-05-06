package com.example.ekart.dto;

/**
 * S107 fix: 9-param constructor replaced with static Builder pattern.
 * Usage: new EligibleDeliveryBoyItem.Builder(id, name, code).pins(...).build()
 */
public class EligibleDeliveryBoyItem {

    private final int     id;
    private final String  name;
    private final String  code;
    private final String  pins;
    private final String  warehouse;
    private final boolean isAvailable;
    private final int     activeOrders;
    private final int     slots;
    private final boolean atCap;

    private EligibleDeliveryBoyItem(Builder b) {
        this.id           = b.id;
        this.name         = b.name;
        this.code         = b.code;
        this.pins         = b.pins;
        this.warehouse    = b.warehouse;
        this.isAvailable  = b.isAvailable;
        this.activeOrders = b.activeOrders;
        this.slots        = b.slots;
        this.atCap        = b.atCap;
    }

    // ── Builder ──────────────────────────────────────────────────────────────
    public static class Builder {
        private final int    id;
        private final String name;
        private final String code;
        private String  pins;
        private String  warehouse;
        private boolean isAvailable;
        private int     activeOrders;
        private int     slots;
        private boolean atCap;

        public Builder(int id, String name, String code) {
            this.id   = id;
            this.name = name;
            this.code = code;
        }

        public Builder pins(String v)          { this.pins = v;          return this; }
        public Builder warehouse(String v)     { this.warehouse = v;     return this; }
        public Builder isAvailable(boolean v)  { this.isAvailable = v;   return this; }
        public Builder activeOrders(int v)     { this.activeOrders = v;  return this; }
        public Builder slots(int v)            { this.slots = v;         return this; }
        public Builder atCap(boolean v)        { this.atCap = v;         return this; }

        public EligibleDeliveryBoyItem build() { return new EligibleDeliveryBoyItem(this); }
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    public int     getId()           { return id; }
    public String  getName()         { return name; }
    public String  getCode()         { return code; }
    public String  getPins()         { return pins; }
    public String  getWarehouse()    { return warehouse; }
    public boolean isAvailable()     { return isAvailable; }
    public int     getActiveOrders() { return activeOrders; }
    public int     getSlots()        { return slots; }
    public boolean isAtCap()         { return atCap; }
}