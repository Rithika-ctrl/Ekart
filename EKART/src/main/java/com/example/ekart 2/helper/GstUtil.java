package com.example.ekart.helper;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * GST Utility for Ekart — Indian e-commerce GST handling.
 *
 * APPROACH: Prices in Ekart are already GST-inclusive (the customer sees and
 * pays the all-in price). This utility back-calculates the GST component so it
 * can be displayed as a line item on carts, payment pages, and invoices — the
 * same way Amazon India and Flipkart work.
 *
 * Formula (back-calculation from inclusive price):
 *   GST amount   = price × rate / (1 + rate)
 *   Taxable base = price - GST amount
 *
 * Rates follow Indian GST slabs (as of 2024-25):
 *   0%  — fresh food, unprocessed grocery, books, newspapers
 *   5%  — packaged food, medicines, baby products, footwear < ₹1000
 *  12%  — processed food, sports goods, toys, non-AC restaurants
 *  18%  — electronics, mobile phones, beauty/cosmetics, fashion > ₹1000,
 *          home appliances, restaurant (AC)
 *  28%  — luxury goods, large appliances (not currently used in Ekart)
 *
 * Category matching is case-insensitive and keyword-based so it works
 * with Ekart's free-text category strings (e.g. "Chips", "Electronics",
 * "Men's Wear").
 */
public class GstUtil {

    /**
     * Category keyword → GST rate mapping.
     * Checked in insertion order; first match wins.
     * Keys are lowercase substrings of the category name.
     */
    private static final LinkedHashMap<String, Double> CATEGORY_RATES = new LinkedHashMap<>();

    static {
        // 0% slab — raw / unprocessed / essential
        CATEGORY_RATES.put("book",          0.00);
        CATEGORY_RATES.put("newspaper",     0.00);
        CATEGORY_RATES.put("journal",       0.00);
        CATEGORY_RATES.put("fresh",         0.00);
        CATEGORY_RATES.put("vegetable",     0.00);
        CATEGORY_RATES.put("fruit",         0.00);
        CATEGORY_RATES.put("grain",         0.00);
        CATEGORY_RATES.put("rice",          0.00);
        CATEGORY_RATES.put("pulse",         0.00);
        CATEGORY_RATES.put("salt",          0.00);

        // 5% slab — packaged food, medicine, baby
        CATEGORY_RATES.put("food",          0.05);
        CATEGORY_RATES.put("beverage",      0.05);
        CATEGORY_RATES.put("drink",         0.05);
        CATEGORY_RATES.put("juice",         0.05);
        CATEGORY_RATES.put("tea",           0.05);
        CATEGORY_RATES.put("coffee",        0.05);
        CATEGORY_RATES.put("grocery",       0.05);
        CATEGORY_RATES.put("dairy",         0.05);
        CATEGORY_RATES.put("milk",          0.05);
        CATEGORY_RATES.put("butter",        0.05);
        CATEGORY_RATES.put("cheese",        0.05);
        CATEGORY_RATES.put("paneer",        0.05);
        CATEGORY_RATES.put("egg",           0.05);
        CATEGORY_RATES.put("bread",         0.05);
        CATEGORY_RATES.put("bakery",        0.05);
        CATEGORY_RATES.put("snack",         0.05);
        CATEGORY_RATES.put("chip",          0.05);
        CATEGORY_RATES.put("biscuit",       0.05);
        CATEGORY_RATES.put("wafer",         0.05);
        CATEGORY_RATES.put("chocolate",     0.05);
        CATEGORY_RATES.put("sweet",         0.05);
        CATEGORY_RATES.put("ice cream",     0.05);
        CATEGORY_RATES.put("icecream",      0.05);
        CATEGORY_RATES.put("medicine",      0.05);
        CATEGORY_RATES.put("pharma",        0.05);
        CATEGORY_RATES.put("supplement",    0.05);
        CATEGORY_RATES.put("vitamin",       0.05);
        CATEGORY_RATES.put("ayurved",       0.05);
        CATEGORY_RATES.put("first aid",     0.05);
        CATEGORY_RATES.put("sanitizer",     0.05);
        CATEGORY_RATES.put("baby",          0.05);
        CATEGORY_RATES.put("infant",        0.05);
        CATEGORY_RATES.put("oil",           0.05);
        CATEGORY_RATES.put("spice",         0.05);
        CATEGORY_RATES.put("masala",        0.05);
        CATEGORY_RATES.put("staple",        0.05);
        CATEGORY_RATES.put("daily product", 0.05);

        // 12% slab — processed food, sports, toys, footwear, stationery
        CATEGORY_RATES.put("sport",         0.12);
        CATEGORY_RATES.put("fitness",       0.12);
        CATEGORY_RATES.put("gym",           0.12);
        CATEGORY_RATES.put("outdoor",       0.12);
        CATEGORY_RATES.put("toy",           0.12);
        CATEGORY_RATES.put("game",          0.12);
        CATEGORY_RATES.put("board game",    0.12);
        CATEGORY_RATES.put("puzzle",        0.12);
        CATEGORY_RATES.put("footwear",      0.12);
        CATEGORY_RATES.put("shoe",          0.12);
        CATEGORY_RATES.put("sandal",        0.12);
        CATEGORY_RATES.put("slipper",       0.12);
        CATEGORY_RATES.put("boot",          0.12);
        CATEGORY_RATES.put("stationery",    0.12);
        CATEGORY_RATES.put("stationary",    0.12);  // common misspelling
        CATEGORY_RATES.put("office",        0.12);
        CATEGORY_RATES.put("pen",           0.12);
        CATEGORY_RATES.put("notebook",      0.12);
        CATEGORY_RATES.put("kitchen",       0.12);
        CATEGORY_RATES.put("cookware",      0.12);
        CATEGORY_RATES.put("utensil",       0.12);
        CATEGORY_RATES.put("cloth",         0.12);
        CATEGORY_RATES.put("fashion",       0.12);
        CATEGORY_RATES.put("apparel",       0.12);
        CATEGORY_RATES.put("shirt",         0.12);
        CATEGORY_RATES.put("dress",         0.12);
        CATEGORY_RATES.put("wear",          0.12);
        CATEGORY_RATES.put("jeans",         0.12);
        CATEGORY_RATES.put("kurta",         0.12);
        CATEGORY_RATES.put("saree",         0.12);
        CATEGORY_RATES.put("bag",           0.12);
        CATEGORY_RATES.put("luggage",       0.12);
        CATEGORY_RATES.put("wallet",        0.12);
        CATEGORY_RATES.put("handbag",       0.12);
        CATEGORY_RATES.put("backpack",      0.12);
        CATEGORY_RATES.put("accessory",     0.12);
        CATEGORY_RATES.put("accessories",   0.12);
        CATEGORY_RATES.put("jewel",         0.12);
        CATEGORY_RATES.put("watch",         0.12);
        CATEGORY_RATES.put("ring",          0.12);
        CATEGORY_RATES.put("necklace",      0.12);
        CATEGORY_RATES.put("bracelet",      0.12);
        CATEGORY_RATES.put("decor",         0.12);
        CATEGORY_RATES.put("home good",     0.12);
        CATEGORY_RATES.put("household",     0.12);
        CATEGORY_RATES.put("cleaning",      0.12);
        CATEGORY_RATES.put("bedding",       0.12);
        CATEGORY_RATES.put("furniture",     0.12);

        // 18% slab — electronics, beauty, personal care, health devices
        CATEGORY_RATES.put("electronic",    0.18);
        CATEGORY_RATES.put("mobile",        0.18);
        CATEGORY_RATES.put("phone",         0.18);
        CATEGORY_RATES.put("laptop",        0.18);
        CATEGORY_RATES.put("computer",      0.18);
        CATEGORY_RATES.put("tablet",        0.18);
        CATEGORY_RATES.put("camera",        0.18);
        CATEGORY_RATES.put("audio",         0.18);
        CATEGORY_RATES.put("headphone",     0.18);
        CATEGORY_RATES.put("speaker",       0.18);
        CATEGORY_RATES.put("tv",            0.18);
        CATEGORY_RATES.put("appliance",     0.18);
        CATEGORY_RATES.put("beauty",        0.18);
        CATEGORY_RATES.put("cosmetic",      0.18);
        CATEGORY_RATES.put("makeup",        0.18);
        CATEGORY_RATES.put("skincare",      0.18);
        CATEGORY_RATES.put("haircare",      0.18);
        CATEGORY_RATES.put("shampoo",       0.18);
        CATEGORY_RATES.put("cream",         0.18);
        CATEGORY_RATES.put("lotion",        0.18);
        CATEGORY_RATES.put("perfume",       0.18);
        CATEGORY_RATES.put("fragrance",     0.18);
        CATEGORY_RATES.put("soap",          0.18);
        CATEGORY_RATES.put("detergent",     0.18);
        CATEGORY_RATES.put("hygiene",       0.18);
        CATEGORY_RATES.put("personal care", 0.18);
        CATEGORY_RATES.put("pet",           0.18);
        CATEGORY_RATES.put("plant",         0.18);
        CATEGORY_RATES.put("garden",        0.18);
        CATEGORY_RATES.put("car",           0.18);
        CATEGORY_RATES.put("auto",          0.18);
        CATEGORY_RATES.put("tyre",          0.18);
    }

    /** Default rate for categories that don't match any keyword (18%). */
    private static final double DEFAULT_RATE = 0.18;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Returns the GST rate (0.0 – 0.28) for the given product category.
     * Matching is case-insensitive and keyword-based.
     */
    public static double getGstRate(String category) {
        if (category == null || category.isBlank()) return DEFAULT_RATE;
        String lower = category.toLowerCase().trim();
        for (Map.Entry<String, Double> entry : CATEGORY_RATES.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return DEFAULT_RATE;
    }

    /**
     * Returns the GST rate as an integer percentage (e.g. 18 for 18%).
     */
    public static int getGstRatePercent(String category) {
        return (int) Math.round(getGstRate(category) * 100);
    }

    /**
     * Back-calculates the GST amount from a GST-inclusive price.
     * GST = inclusivePrice × rate / (1 + rate)
     *
     * @param inclusivePrice  the price the customer already paid (GST included)
     * @param category        product category name
     * @return GST amount (2 decimal places, rounded half-up)
     */
    public static double calculateGst(double inclusivePrice, String category) {
        double rate = getGstRate(category);
        if (rate == 0.0) return 0.0;
        double gst = inclusivePrice * rate / (1.0 + rate);
        return Math.round(gst * 100.0) / 100.0;
    }

    /**
     * Returns the taxable base (price excluding GST) from a GST-inclusive price.
     * taxableBase = inclusivePrice - GST
     */
    public static double getTaxableBase(double inclusivePrice, String category) {
        return Math.round((inclusivePrice - calculateGst(inclusivePrice, category)) * 100.0) / 100.0;
    }

    /**
     * Calculates total GST across a collection of line items.
     * Each item contributes: calculateGst(lineTotal, category)
     *
     * @param items  list of items (any object with getName/getCategory/getPrice/getLineTotal)
     */
    public static double calculateTotalGst(java.util.List<com.example.ekart.dto.Item> items) {
        if (items == null || items.isEmpty()) return 0.0;
        double total = 0.0;
        for (com.example.ekart.dto.Item item : items) {
            double lineTotal = item.getUnitPrice() > 0
                    ? item.getUnitPrice() * item.getQuantity()
                    : item.getPrice();
            total += calculateGst(lineTotal, item.getCategory());
        }
        return Math.round(total * 100.0) / 100.0;
    }

    /**
     * Returns a human-readable GST label for display.
     * e.g. "GST (18%)" or "GST (5%)"
     */
    public static String getGstLabel(String category) {
        int pct = getGstRatePercent(category);
        return "GST (" + pct + "%)";
    }

    /**
     * Returns a mixed-rate label when items span multiple GST slabs.
     * e.g. "GST (5–18%)" or "GST (18%)" if all same.
     */
    public static String getMixedGstLabel(java.util.List<com.example.ekart.dto.Item> items) {
        if (items == null || items.isEmpty()) return "GST";
        java.util.Set<Integer> rates = new java.util.TreeSet<>();
        for (com.example.ekart.dto.Item item : items) {
            rates.add(getGstRatePercent(item.getCategory()));
        }
        if (rates.size() == 1) return "GST (" + rates.iterator().next() + "%)";
        int min = rates.stream().min(Integer::compareTo).orElse(0);
        int max = rates.stream().max(Integer::compareTo).orElse(18);
        return "GST (" + min + "–" + max + "%)";
    }
}