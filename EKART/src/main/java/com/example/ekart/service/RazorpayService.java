package com.example.ekart.service;

import java.util.HashMap;
import java.util.Map;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * RazorpayService — Handles Razorpay payment order creation and signature verification
 * 
 * SECURITY:
 * - Razorpay keys must be in environment variables (never in code)
 * - Signature verification is mandatory on callback
 * - Order IDs are persisted to database for audit trail
 */
@Service
public class RazorpayService {

    @Value("${RAZORPAY_KEY_ID:#{null}}")
    private String razorpayKeyId;

    @Value("${RAZORPAY_KEY_SECRET:#{null}}")
    private String razorpayKeySecret;

    private RazorpayClient razorpayClient;

    /**
     * Initialize Razorpay client on first use
     */
    private void ensureClientInitialized() throws RazorpayException {
        if (razorpayClient == null) {
            if (razorpayKeyId == null || razorpayKeySecret == null) {
                throw new IllegalStateException("Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
            }
            razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        }
    }

    /**
     * Create a Razorpay order for payment
     * 
     * @param totalAmount Amount in paise (₹100 = 10000 paise)
     * @param orderId EKART order ID (for reference)
     * @param customerEmail Customer email
     * @param customerPhone Customer phone
     * @return Map with razorpayOrderId, key, amount, currency, etc.
     */
    public Map<String, Object> createOrder(double totalAmount, int orderId, String customerEmail, String customerPhone) throws RazorpayException {
        ensureClientInitialized();

        try {
            // Convert ₹ to paise (multiply by 100)
            long amountInPaise = (long) (totalAmount * 100);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "ekart-order-" + orderId);
            orderRequest.put("notes", new JSONObject()
                    .put("orderId", orderId)
                    .put("description", "EKART Order #" + orderId)
            );

            com.razorpay.Order orderResponse = razorpayClient.orders.create(orderRequest);
            String razorpayOrderId = String.valueOf(orderResponse.get("id"));

            Map<String, Object> result = new HashMap<>();
            result.put("razorpayOrderId", razorpayOrderId);
            result.put("razorpayKeyId", razorpayKeyId);
            result.put("amount", amountInPaise);
            result.put("currency", "INR");
            result.put("customerEmail", customerEmail);
            result.put("customerPhone", customerPhone);
            result.put("orderId", orderId);
            result.put("succeeded", true);

            return result;

        } catch (RazorpayException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("succeeded", false);
            error.put("message", "Failed to create Razorpay order: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Verify Razorpay payment signature
     * 
     * REQUIRED: Verify signature before marking payment as successful
     * Prevents tampering with payment details
     * 
     * @param razorpayOrderId Order ID from Razorpay
     * @param razorpayPaymentId Payment ID from Razorpay
     * @param signature Signature from Razorpay callback
     * @return true if signature is valid, false otherwise
     */
    public boolean verifySignature(String razorpayOrderId, String razorpayPaymentId, String signature) {
        try {
            String payload = razorpayOrderId + "|" + razorpayPaymentId;
            String computed_signature = hmacSHA256(payload, razorpayKeySecret);
            return computed_signature.equals(signature);
        } catch (Exception e) {
            System.err.println("Signature verification failed: " + e.getMessage());
            return false;
        }
    }

    /**
     * HMAC-SHA256 hash for signature verification
     */
    private String hmacSHA256(String data, String secret) throws Exception {
        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
        javax.crypto.spec.SecretKeySpec secretKeySpec = new javax.crypto.spec.SecretKeySpec(
                secret.getBytes(), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] digest = mac.doFinal(data.getBytes());
        StringBuilder hexString = new StringBuilder();
        for (byte b : digest) {
            hexString.append(String.format("%02x", b));
        }
        return hexString.toString();
    }
}
