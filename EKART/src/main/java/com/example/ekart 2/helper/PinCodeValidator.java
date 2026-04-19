package com.example.ekart.helper;

import java.util.Set;

/**
 * Server-side Indian PIN code validator.
 *
 * Rules:
 *   1. Exactly 6 digits, no letters or special characters.
 *   2. First two digits must be a valid Indian postal circle prefix.
 *
 * Valid prefixes by postal circle:
 *   11-19  Delhi, Haryana, Punjab, Himachal Pradesh, J&K
 *   20-28  Uttar Pradesh, Uttarakhand
 *   30-34  Rajasthan
 *   36-39  Gujarat
 *   40-49  Maharashtra, Madhya Pradesh, Chhattisgarh, Goa
 *   50-53  Andhra Pradesh, Telangana
 *   56-59  Karnataka
 *   60-66  Tamil Nadu, Puducherry
 *   67-69  Kerala, Lakshadweep
 *   70-74  West Bengal, Andaman & Nicobar
 *   75-77  Odisha
 *   78-79  Assam, North-East states
 *   80-85  Bihar, Jharkhand
 *   90-99  Army Post Office (APO)
 *
 * Gaps that do NOT exist in India: 10, 29, 35, 54, 55, 86-89
 * These gaps are what distinguish Indian PINs from other countries'
 * 6-digit postal codes (e.g. Russia starts at 10xxxx, 29xxxx exists etc.)
 */
public class PinCodeValidator {

    private static final Set<String> VALID_PREFIXES = Set.of(
        "11","12","13","14","15","16","17","18","19",
        "20","21","22","23","24","25","26","27","28",
        "30","31","32","33","34",
        "36","37","38","39",
        "40","41","42","43","44","45","46","47","48","49",
        "50","51","52","53",
        "56","57","58","59",
        "60","61","62","63","64","65","66",
        "67","68","69",
        "70","71","72","73","74",
        "75","76","77",
        "78","79",
        "80","81","82","83","84","85",
        "90","91","92","93","94","95","96","97","98","99"
    );

    /**
     * Returns true only if the value is a valid Indian PIN code.
     */
    public static boolean isValid(String pin) {
        if (pin == null) return false;
        String trimmed = pin.trim();
        if (!trimmed.matches("\\d{6}")) return false;          // must be exactly 6 digits
        return VALID_PREFIXES.contains(trimmed.substring(0, 2)); // prefix must be a known Indian circle
    }

    /**
     * Cleans a comma-separated list of pin codes, keeping only valid Indian ones.
     * Used when vendors submit allowedPinCodes for a product.
     * Returns a cleaned comma-separated string, or null if none are valid.
     */
    public static String filterValidPins(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String cleaned = java.util.Arrays.stream(raw.split(","))
            .map(String::trim)
            .filter(PinCodeValidator::isValid)
            .collect(java.util.stream.Collectors.joining(","));
        return cleaned.isBlank() ? null : cleaned;
    }

    public static final String ERROR_MESSAGE =
        "Please enter a valid Indian pin code (6 digits, valid postal circle).";
}