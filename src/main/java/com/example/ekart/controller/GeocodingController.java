package com.example.ekart.controller;

import com.example.ekart.helper.PinCodeValidator;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * GeocodingController
 *
 * Backend proxy for PIN code lookup from coordinates.
 * The frontend sends lat/lon → this controller calls external APIs
 * server-side (no CORS issues) → returns PIN to frontend.
 *
 * Why server-side instead of direct JS calls?
 * 1. No CORS problems — browser blocks many API calls directly
 * 2. No API key exposure in frontend JS
 * 3. Server can retry across multiple APIs transparently
 * 4. Consistent results regardless of browser/network
 *
 * Endpoint: GET /api/geocode/pin?lat=12.97&lon=77.59
 * Returns:  { success, pin, city, state, source }
 */
@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    private static final int CONNECT_TIMEOUT = 4000; // 4 seconds
    private static final int READ_TIMEOUT    = 5000; // 5 seconds

    /**
     * AUTO endpoint — detects PIN from the user's IP address.
     * No GPS, no permission, no button click needed.
     * Called on page load — returns PIN silently if found.
     *
     * GET /api/geocode/auto
     * Returns: { success, pin, city, state, source }
     */
    @GetMapping("/auto")
    public ResponseEntity<Map<String, Object>> autoDetectFromIp(HttpServletRequest request) {
        Map<String, Object> res = new HashMap<>();

        String ip = extractClientIp(request);

        // Skip for localhost/private IPs — can't geo-locate these
        if (isPrivateIp(ip)) {
            res.put("success", false);
            res.put("message", "Running on localhost — cannot detect PIN from IP.");
            return ResponseEntity.ok(res);
        }

        try {
            // ip-api.com returns city, region, zip, country — free, no key needed
            // Fields: status,country,countryCode,region,regionName,city,zip,lat,lon
            String url = "http://ip-api.com/json/" + ip + "?fields=status,country,countryCode,regionName,city,zip";
            String body = httpGet(url, "Ekart-App/1.0", "en");

            if (body == null || !body.contains("\"success\"")) {
                res.put("success", false);
                res.put("message", "IP lookup failed.");
                return ResponseEntity.ok(res);
            }

            String countryCode = extractJson(body, "countryCode");
            if (!"IN".equalsIgnoreCase(countryCode)) {
                res.put("success", false);
                res.put("outsideIndia", true);
                res.put("country", extractJson(body, "country"));
                res.put("message", "Location outside India.");
                return ResponseEntity.ok(res);
            }

            String city  = extractJson(body, "city");
            String state = extractJson(body, "regionName");
            String zip   = extractJson(body, "zip");

            // ip-api.com returns Indian PIN in the "zip" field
            if (zip != null) {
                String pin = zip.replaceAll("[^0-9]", "").trim();
                if (pin.length() >= 6) pin = pin.substring(0, 6);
                if (PinCodeValidator.isValid(pin)) {
                    res.put("success", true);
                    res.put("pin",    pin);
                    res.put("city",   city  != null ? city  : "");
                    res.put("state",  state != null ? state : "");
                    res.put("source", "ip-api");
                    return ResponseEntity.ok(res);
                }
            }

            // ip-api gave city but no valid zip — try postalpincode.in with city name
            if (city != null && !city.isBlank()) {
                Map<String, Object> postal = callPostalPincode(city);
                if (postal != null) {
                    res.put("success", true);
                    res.put("pin",    postal.get("pin"));
                    res.put("city",   city);
                    res.put("state",  state != null ? state : "");
                    res.put("source", "ip-api+postalpincode");
                    return ResponseEntity.ok(res);
                }
            }

            // At least return city/state even if no PIN
            res.put("success", false);
            res.put("pinMissing", true);
            res.put("city",   city  != null ? city  : "");
            res.put("state",  state != null ? state : "");
            res.put("message", "Detected " + city + " but could not find PIN. Please enter manually.");

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Auto-detection failed: " + e.getMessage());
        }

        return ResponseEntity.ok(res);
    }

    // ── Helper: extract real client IP ───────────────────────────────────────
    private String extractClientIp(HttpServletRequest request) {
        String fwd = request.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        String real = request.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) return real.trim();
        return request.getRemoteAddr();
    }

    private boolean isPrivateIp(String ip) {
        if (ip == null) return true;
        return ip.equals("127.0.0.1") || ip.equals("::1")
            || ip.startsWith("10.") || ip.startsWith("192.168.")
            || ip.startsWith("172.16.") || ip.startsWith("172.17.")
            || ip.startsWith("172.18.") || ip.startsWith("172.19.")
            || ip.startsWith("172.2")   || ip.startsWith("172.30.")
            || ip.startsWith("172.31.")
            || ip.equals("0:0:0:0:0:0:0:1");
    }

    /**
     * Main endpoint — frontend calls this with coordinates.
     * Tries 3 APIs in order, returns first successful PIN.
     *
     * GET /api/geocode/pin?lat=12.9716&lon=77.5946
     */
    @GetMapping("/pin")
    public ResponseEntity<Map<String, Object>> getPinFromCoordinates(
            @RequestParam double lat,
            @RequestParam double lon) {

        Map<String, Object> res = new HashMap<>();

        // Basic bounds check — India is roughly 8°N–37°N, 68°E–97°E
        if (lat < 6.0 || lat > 38.0 || lon < 68.0 || lon > 98.0) {
            res.put("success", false);
            res.put("message", "Location is outside India. Ekart delivers only within India.");
            res.put("outsideIndia", true);
            return ResponseEntity.ok(res);
        }

        // ── Stage 1: Nominatim (OpenStreetMap) ───────────────────────────────
        try {
            Map<String, Object> nominatim = callNominatim(lat, lon);
            if (nominatim != null) {
                res.putAll(nominatim);
                res.put("success", true);
                res.put("source", "nominatim");
                return ResponseEntity.ok(res);
            }
        } catch (Exception e) {
            System.err.println("[Geocoding] Nominatim failed: " + e.getMessage());
        }

        // ── Stage 2: BigDataCloud (free, no key) ──────────────────────────────
        try {
            Map<String, Object> bdc = callBigDataCloud(lat, lon);
            if (bdc != null) {
                String city = (String) bdc.getOrDefault("city", "");
                String state = (String) bdc.getOrDefault("state", "");

                // Stage 2b: use city name to look up PIN via postalpincode.in
                if (!city.isBlank()) {
                    Map<String, Object> postal = callPostalPincode(city);
                    if (postal != null) {
                        res.put("pin",   postal.get("pin"));
                        res.put("city",  city);
                        res.put("state", state);
                        res.put("success", true);
                        res.put("source", "bigdatacloud+postalpincode");
                        return ResponseEntity.ok(res);
                    }
                }

                // BigDataCloud gave city but postal API failed — return city/state at least
                res.put("city",  city);
                res.put("state", state);
                res.put("success", false);
                res.put("pinMissing", true);
                res.put("message", "Could not find PIN code for your area. City detected: " + city + ". Please enter PIN manually.");
                return ResponseEntity.ok(res);
            }
        } catch (Exception e) {
            System.err.println("[Geocoding] BigDataCloud failed: " + e.getMessage());
        }

        // ── All APIs failed ───────────────────────────────────────────────────
        res.put("success", false);
        res.put("message", "Could not detect your location. Please enter your PIN code manually.");
        return ResponseEntity.ok(res);
    }

    /**
     * Separate endpoint: look up PIN by city name directly.
     * Used as fallback when coordinates don't yield a PIN.
     * GET /api/geocode/by-city?city=Bengaluru
     */
    @GetMapping("/by-city")
    public ResponseEntity<Map<String, Object>> getPinByCity(@RequestParam String city) {
        Map<String, Object> res = new HashMap<>();
        try {
            Map<String, Object> result = callPostalPincode(city);
            if (result != null) {
                res.put("success", true);
                res.putAll(result);
            } else {
                res.put("success", false);
                res.put("message", "No PIN found for: " + city);
            }
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Lookup failed: " + e.getMessage());
        }
        return ResponseEntity.ok(res);
    }

    // ── Private API callers ───────────────────────────────────────────────────

    private Map<String, Object> callNominatim(double lat, double lon) throws Exception {
        String url = "https://nominatim.openstreetmap.org/reverse?format=json&lat="
                + lat + "&lon=" + lon + "&addressdetails=1";
        String body = httpGet(url, "Ekart-App/1.0", "en");
        if (body == null || body.isBlank()) return null;

        // Parse manually — no Jackson dependency needed for this simple response
        String countryCode = extractJson(body, "country_code");
        if (!"in".equalsIgnoreCase(countryCode)) return null; // outside India

        String postcode = extractJson(body, "postcode");
        String city     = firstNonBlank(
            extractJson(body, "city"),
            extractJson(body, "town"),
            extractJson(body, "village"),
            extractJson(body, "county")
        );
        String state = extractJson(body, "state");

        // Clean postcode — Nominatim sometimes returns ranges like "560001-560010"
        if (postcode != null) {
            String cleaned = postcode.replaceAll("[^0-9]", "");
            if (cleaned.length() >= 6) {
                String pin = cleaned.substring(0, 6);
                if (PinCodeValidator.isValid(pin)) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("pin",   pin);
                    r.put("city",  city != null ? city : "");
                    r.put("state", state != null ? state : "");
                    return r;
                }
            }
        }

        // Nominatim connected but no valid postcode — try city fallback
        if (city != null && !city.isBlank()) {
            Map<String, Object> postal = callPostalPincode(city);
            if (postal != null) {
                postal.put("city",  city);
                postal.put("state", state != null ? state : "");
                return postal;
            }
        }

        return null;
    }

    private Map<String, Object> callBigDataCloud(double lat, double lon) throws Exception {
        String url = "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="
                + lat + "&longitude=" + lon + "&localityLanguage=en";
        String body = httpGet(url, "Ekart-App/1.0", "en");
        if (body == null || body.isBlank()) return null;

        String countryCode = extractJson(body, "countryCode");
        if (!"IN".equalsIgnoreCase(countryCode)) return null;

        String city  = firstNonBlank(extractJson(body, "city"), extractJson(body, "locality"));
        String state = extractJson(body, "principalSubdivision");

        Map<String, Object> r = new HashMap<>();
        r.put("city",  city  != null ? city  : "");
        r.put("state", state != null ? state : "");
        return r;
    }

    private Map<String, Object> callPostalPincode(String cityName) throws Exception {
        String encoded = URLEncoder.encode(cityName.trim(), StandardCharsets.UTF_8);
        String url = "https://api.postalpincode.in/postoffice/" + encoded;
        String body = httpGet(url, "Ekart-App/1.0", "en");
        if (body == null || body.isBlank()) return null;

        // Response: [{"Status":"Success","PostOffice":[{"Name":"...","Pincode":"560001",...}]}]
        if (!body.contains("\"Success\"")) return null;

        // Extract first Pincode value
        String pin = extractJson(body, "Pincode");
        if (pin != null && PinCodeValidator.isValid(pin)) {
            // Also extract post office name for display
            String officeName = extractJson(body, "Name");
            Map<String, Object> r = new HashMap<>();
            r.put("pin",        pin);
            r.put("postOffice", officeName != null ? officeName : cityName);
            return r;
        }
        return null;
    }

    // ── HTTP helper ───────────────────────────────────────────────────────────

    private String httpGet(String urlStr, String userAgent, String acceptLang) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(CONNECT_TIMEOUT);
        conn.setReadTimeout(READ_TIMEOUT);
        conn.setRequestMethod("GET");
        conn.setRequestProperty("User-Agent",      userAgent);
        conn.setRequestProperty("Accept-Language", acceptLang);
        conn.setRequestProperty("Accept",          "application/json");

        int status = conn.getResponseCode();
        if (status != 200) return null;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }

    // ── JSON extraction (simple regex — avoids Jackson import for this controller) ──

    /**
     * Extracts the first value for a given key from a JSON string.
     * Handles both string values ("key":"value") and numeric ("key":123456).
     */
    private String extractJson(String json, String key) {
        // Match "key":"value"
        String pattern1 = "\"" + key + "\":\"";
        int idx = json.indexOf(pattern1);
        if (idx >= 0) {
            int start = idx + pattern1.length();
            int end   = json.indexOf("\"", start);
            if (end > start) return json.substring(start, end).trim();
        }
        // Match "key":123456  (numeric — for PIN codes)
        String pattern2 = "\"" + key + "\":";
        idx = json.indexOf(pattern2);
        if (idx >= 0) {
            int start = idx + pattern2.length();
            // Read until comma, brace, or bracket
            int end = start;
            while (end < json.length() && ",}]".indexOf(json.charAt(end)) < 0) end++;
            String val = json.substring(start, end).trim().replace("\"", "");
            if (!val.isBlank()) return val;
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v;
        return null;
    }
}