package com.example.ekart.controller;
import com.example.ekart.dto.Address;

import java.time.LocalDateTime;
// ================================================================
// NEW FILE: src/main/java/com/example/ekart/controller/PaymentController.java
//
// Purpose:
//   REST API endpoints for payment method selection and COD workflows.
//   - GET /api/payment/methods - Get available payment methods for customer
//   - POST /api/checkout/initiate - Initiate checkout with selected payment method
//   - POST /api/cod/mark-collected - Mark COD cash as collected (used by delivery module)
//   - GET /api/cod/orders-for-admin - Admin view of COD orders for verification
//
// Used by:
//   - Checkout UI (payment method selection)
//   - Admin dashboard (COD verification/settlement)
//   - Delivery boy app (COD cash collection)
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PaymentController {

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final PaymentMethodService paymentMethodService;
    private final CodPaymentService codPaymentService;

    public PaymentController(
            PaymentMethodService paymentMethodService,
            CodPaymentService codPaymentService) {
        this.paymentMethodService = paymentMethodService;
        this.codPaymentService = codPaymentService;
    }



    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT METHOD SELECTION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/payment/methods
     * Returns available payment methods for customer at checkout.
     *
     * Request params:
     *   - deliveryPinCode: Customer's delivery PIN code
     *
     * Response:
     *   {
     *     "success": true,
     *     "methods": [
     *       {
     *         "code": "RAZORPAY",
     *         "name": "Online Payment (Razorpay)",
     *         "description": "Pay securely online...",
     *         "icon": "credit-card"
     *       },
     *       {
     *         "code": "COD",
     *         "name": "Cash On Delivery",
     *         "description": "Pay when delivered...",
     *         "icon": "cash"
     *       }
     *     ],
     *     "default": "RAZORPAY"
     *   }
     */
    @GetMapping("/payment/methods")
    public ResponseEntity<Map<String, Object>> getPaymentMethods(
            @RequestParam String deliveryPinCode,
            HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            Customer customer = (Customer) session.getAttribute("customer");
            if (customer == null) {
                res.put("success", false);
                res.put("message", "Not logged in");
                return ResponseEntity.status(401).body(res);
            }

            // Get available methods
            List<String> availableMethods = paymentMethodService.getAvailablePaymentMethods(
                    customer, deliveryPinCode);

            // Build method objects
            List<Map<String, String>> methods = new ArrayList<>();
            for (String method : availableMethods) {
                Map<String, String> methodObj = new LinkedHashMap<>();
                methodObj.put("code", method);
                methodObj.put("name", paymentMethodService.getPaymentMethodDisplayName(method));
                methodObj.put("description", paymentMethodService.getPaymentMethodDescription(method));
                methodObj.put("icon", paymentMethodService.getPaymentMethodIcon(method));
                methods.add(methodObj);
            }

            res.put("success", true);
            res.put("methods", methods);
            res.put("default", paymentMethodService.getDefaultPaymentMethod(customer));
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Error fetching payment methods: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHECKOUT INITIATION (with payment method)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/checkout/initiate
     * Creates order(s) using specified payment method.
     *
     * Request Body:
     *   {
     *     "paymentMethod": "COD" | "RAZORPAY",
     *     "deliveryPinCode": "560001",
     *     "deliveryAddress": "123 Main St, Bangalore",
     *     "items": [ { ... } ]
     *   }
     *
     * Response (for COD):
     *   {
     *     "success": true,
     *     "message": "COD order created",
     *     "orderId": 12345,
     *     "paymentMethod": "COD",
     *     "amount": 500.00,
     *     "status": "PROCESSING"
     *   }
     *
     * Response (for Razorpay):
     *   {
     *     "success": true,
     *     "message": "Proceed to Razorpay payment",
     *     "razorpayOrderId": "order_xxx",
     *     "razorpayKey": "rzp_xxx",
     *     "amount": 50000  (in paise)
     *   }
     */
    @PostMapping("/checkout/initiate")
    public ResponseEntity<Map<String, Object>> initiateCheckout(
            @RequestBody Map<String, Object> payload,
            HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            // Validate customer
            Customer customer = (Customer) session.getAttribute("customer");
            if (customer == null) {
                res.put("success", false);
                res.put("message", "Not logged in");
                return ResponseEntity.status(401).body(res);
            }

            // Extract payload
            String paymentMethod = (String) payload.get("paymentMethod");
            String deliveryPinCode = (String) payload.get("deliveryPinCode");
            String deliveryAddress = (String) payload.get("deliveryAddress");
            double totalAmount = ((Number) payload.getOrDefault("totalAmount", 0)).doubleValue();
            double deliveryCharge = ((Number) payload.getOrDefault("deliveryCharge", 0)).doubleValue();

            // Validate payment method
            String validationError = paymentMethodService.validatePaymentMethod(paymentMethod);
            if (!validationError.isEmpty()) {
                res.put("success", false);
                res.put("message", validationError);
                return ResponseEntity.ok(res);
            }

            // Check availability
            if (!paymentMethodService.isPaymentMethodAvailable(paymentMethod, customer, deliveryPinCode)) {
                res.put("success", false);
                res.put("message", "Payment method not available for this location");
                return ResponseEntity.ok(res);
            }

            // Route based on payment method
            if ("COD".equalsIgnoreCase(paymentMethod)) {
                return handleCodCheckout(customer, deliveryPinCode, deliveryAddress, totalAmount, deliveryCharge, res);
            } else {
                return handleRazorpayCheckout(customer, totalAmount, deliveryCharge, res);
            }

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Checkout error: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * Handle COD checkout - create order without payment validation.
     */
    private ResponseEntity<Map<String, Object>> handleCodCheckout(
            Customer customer, String pinCode, String address,
            double itemAmount, double deliveryCharge,
            Map<String, Object> res) {

        try {
            // TODO: Call existing order creation service to create Order entity
            // For now, return placeholder

            double totalAmount = itemAmount + deliveryCharge;

            res.put("success", true);
            res.put("message", "COD order created successfully");
            res.put("paymentMethod", "COD");
            res.put("amount", totalAmount);
            res.put("instruction", "You will pay ₹" + totalAmount + " in cash when order is delivered");
            res.put("status", "PROCESSING");

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "COD checkout failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * Handle Razorpay checkout - initiate payment gateway.
     */
    private ResponseEntity<Map<String, Object>> handleRazorpayCheckout(
            Customer customer,
            double itemAmount, double deliveryCharge,
            Map<String, Object> res) {

        try {
            // TODO: Call existing Razorpay payment gateway integration

            double totalAmount = itemAmount + deliveryCharge;

            res.put("success", true);
            res.put("message", "Proceed to Razorpay payment");
            res.put("paymentMethod", "RAZORPAY");
            res.put("amount", (int) (totalAmount * 100));  // In paise
            res.put("currency", "INR");

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Razorpay checkout failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COD COLLECTION BY DELIVERY BOY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/cod/mark-collected
     * Called by delivery boy app when COD cash is collected at doorstep.
     *
     * Request Body:
     *   {
     *     "orderId": 12345,
     *     "deliveryBoyId": 567,
     *     "otpVerified": true,
     *     "collectionNotes": "Customer paid in full"
     *   }
     *
     * Response:
     *   {
     *     "success": true,
     *     "message": "COD collected for Order #12345",
     *     "paymentStatus": "COLLECTED"
     *   }
     */
    @PostMapping("/cod/mark-collected")
    public ResponseEntity<Map<String, Object>> markCodCollected(
            @RequestBody Map<String, Object> payload) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            int orderId = ((Number) payload.get("orderId")).intValue();
            int deliveryBoyId = ((Number) payload.get("deliveryBoyId")).intValue();
            String notes = (String) payload.getOrDefault("collectionNotes", "");

            // Mark as collected
            Order order = codPaymentService.markCodCollected(orderId, deliveryBoyId, notes);

            res.put("success", true);
            res.put("message", "COD collected for Order #" + orderId);
            res.put("paymentStatus", order.getPaymentStatus());
            res.put("amount", order.getCodAmount());

            return ResponseEntity.ok(res);

        } catch (IllegalArgumentException | IllegalStateException e) {
            res.put("success", false);
            res.put("message", e.getMessage());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Error marking COD collected: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: COD VERIFICATION & MONITORING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/cod/orders-for-verification
     * Admin dashboard: list COD orders ready for verification.
     *
     * Response:
     *   {
     *     "success": true,
     *     "orders": [
     *       {
     *         "id": 12345,
     *         "customerName": "John Doe",
     *         "amount": 500.00,
     *         "paymentStatus": "COLLECTED",
     *         "collectedAt": "2026-04-14T10:30:00",
     *         "deliveryBoyName": "Raj Kumar"
     *       }
     *     ]
     *   }
     */
    @GetMapping("/admin/cod/orders-for-verification")
    public ResponseEntity<Map<String, Object>> getCodOrdersForVerification() {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            List<Order> orders = codPaymentService.getCodOrdersReadyForVerification();

            List<Map<String, Object>> orderList = orders.stream()
                    .map(o -> {
                        Map<String, Object> order = new LinkedHashMap<>();
                        order.put("id", o.getId());
                        order.put("customerName", o.getCustomer().getFullName());
                        order.put("amount", o.getCodAmount());
                        order.put("paymentStatus", o.getPaymentStatus());
                        order.put("collectedAt", o.getCodCollectionTimestamp());
                        DeliveryBoy db = o.getDeliveryBoy();
                        order.put("deliveryBoyName", db != null ? db.getName() : "Unknown");
                        return order;
                    })
                    .collect(Collectors.toList());

            res.put("success", true);
            res.put("count", orderList.size());
            res.put("orders", orderList);

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Error fetching COD orders: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/admin/cod/verify-payment
     * Admin verifies COD payment.
     *
     * Request Body:
     *   {
     *     "orderId": 12345,
     *     "adminId": 99,
     *     "verificationNotes": "Cash amount verified"
     *   }
     *
     * Response:
     *   {
     *     "success": true,
     *     "message": "Order #12345 payment verified",
     *     "paymentStatus": "VERIFIED"
     *   }
     */
    @PostMapping("/admin/cod/verify-payment")
    public ResponseEntity<Map<String, Object>> verifyCodPayment(
            @RequestBody Map<String, Object> payload) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            int orderId = ((Number) payload.get("orderId")).intValue();
            int adminId = ((Number) payload.get("adminId")).intValue();
            String notes = (String) payload.getOrDefault("verificationNotes", "");

            Order order = codPaymentService.verifyCodPayment(orderId, adminId, notes);

            res.put("success", true);
            res.put("message", "Order #" + orderId + " payment verified");
            res.put("paymentStatus", order.getPaymentStatus());

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }
}



