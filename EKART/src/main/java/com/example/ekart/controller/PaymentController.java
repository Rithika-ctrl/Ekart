package com.example.ekart.controller;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PaymentController {

    // ── S1192 String constants ──
    private static final String K_COD                               = "COD";
    private static final String K_CODE                              = "code";
    private static final String K_DESCRIPTION                       = "description";
    private static final String K_ICON                              = "icon";
    private static final String K_NAME                              = "name";
    private static final String K_ORDERID                           = "orderId";
    private static final String K_RAZORPAY                          = "RAZORPAY";
    private static final Logger LOGGER = LoggerFactory.getLogger(PaymentController.class);

    // String constants to avoid duplications (fixes S1192)
    private static final String KEY_SUCCESS = "success";
    private static final String KEY_MESSAGE = "message";
    private static final String KEY_PAYMENT_METHOD = "paymentMethod";
    private static final String KEY_AMOUNT = "amount";
    private static final String KEY_PAYMENT_STATUS = "paymentStatus";

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
     *     KEY_SUCCESS: true,
     *     "methods": [
     *       {
     *         K_CODE: K_RAZORPAY,
     *         K_NAME: "Online Payment (Razorpay)",
     *         K_DESCRIPTION: "Pay securely online...",
     *         K_ICON: "credit-card"
     *       },
     *       {
     *         K_CODE: K_COD,
     *         K_NAME: "Cash On Delivery",
     *         K_DESCRIPTION: "Pay when delivered...",
     *         K_ICON: "cash"
     *       }
     *     ],
     *     "default": K_RAZORPAY
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
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Not logged in");
                return ResponseEntity.status(401).body(res);
            }

            // Get available methods
            List<String> availableMethods = paymentMethodService.getAvailablePaymentMethods(
                    customer, deliveryPinCode);

            // Build method objects
            List<Map<String, String>> methods = new ArrayList<>();
            for (String method : availableMethods) {
                Map<String, String> methodObj = new LinkedHashMap<>();
                methodObj.put(K_CODE, method);
                methodObj.put(K_NAME, paymentMethodService.getPaymentMethodDisplayName(method));
                methodObj.put(K_DESCRIPTION, paymentMethodService.getPaymentMethodDescription(method));
                methodObj.put(K_ICON, paymentMethodService.getPaymentMethodIcon(method));
                methods.add(methodObj);
            }

            res.put(KEY_SUCCESS, true);
            res.put("methods", methods);
            res.put("default", paymentMethodService.getDefaultPaymentMethod(customer));
            return ResponseEntity.ok(res);

        } catch (IllegalArgumentException e) {
            LOGGER.error("Invalid payment method request: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching payment methods: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            LOGGER.error("Unexpected error fetching payment methods: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching payment methods: " + e.getMessage());
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
     *     KEY_PAYMENT_METHOD: K_COD | K_RAZORPAY,
     *     "deliveryPinCode": "560001",
     *     "deliveryAddress": "123 Main St, Bangalore",
     *     "items": [ { ... } ]
     *   }
     *
     * Response (for COD):
     *   {
     *     KEY_SUCCESS: true,
     *     KEY_MESSAGE: "COD order created",
     *     K_ORDERID: 12345,
     *     KEY_PAYMENT_METHOD: K_COD,
     *     KEY_AMOUNT: 500.00,
     *     "status": "PROCESSING"
     *   }
     *
     * Response (for Razorpay):
     *   {
     *     KEY_SUCCESS: true,
     *     KEY_MESSAGE: "Proceed to Razorpay payment",
     *     "razorpayOrderId": "order_xxx",
     *     "razorpayKey": "rzp_xxx",
     *     KEY_AMOUNT: 50000  (in paise)
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
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Not logged in");
                return ResponseEntity.status(401).body(res);
            }

            // Extract payload
            String paymentMethod = (String) payload.get(KEY_PAYMENT_METHOD);
            String deliveryPinCode = (String) payload.get("deliveryPinCode");
            double totalAmount = ((Number) payload.getOrDefault("totalAmount", 0)).doubleValue();
            double deliveryCharge = ((Number) payload.getOrDefault("deliveryCharge", 0)).doubleValue();

            // Validate payment method
            String validationError = paymentMethodService.validatePaymentMethod(paymentMethod);
            if (!validationError.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, validationError);
                return ResponseEntity.ok(res);
            }

            // Check availability
            if (!paymentMethodService.isPaymentMethodAvailable(paymentMethod, customer, deliveryPinCode)) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Payment method not available for this location");
                return ResponseEntity.ok(res);
            }

            // Route based on payment method
            if (K_COD.equalsIgnoreCase(paymentMethod)) {
                return handleCodCheckout(totalAmount, deliveryCharge, res);
            } else {
                return handleRazorpayCheckout(totalAmount, deliveryCharge, res);
            }

        } catch (IllegalArgumentException e) {
            LOGGER.error("Invalid checkout parameters: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Checkout error: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            LOGGER.error("Unexpected checkout error: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Checkout error: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * Handle COD checkout - create order without payment validation.
     */
    private ResponseEntity<Map<String, Object>> handleCodCheckout(
            double itemAmount, double deliveryCharge,
            Map<String, Object> res) {

        try {
            // Note: Order creation service integration pending (see #TODO-PAYMENT)
            // Currently returns order placeholder response

            double totalAmount = itemAmount + deliveryCharge;

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "COD order created successfully");
            res.put(KEY_PAYMENT_METHOD, K_COD);
            res.put(KEY_AMOUNT, totalAmount);
            res.put("instruction", "You will pay ₹" + totalAmount + " in cash when order is delivered");
            res.put("status", "PROCESSING");

            return ResponseEntity.ok(res);

        } catch (IllegalStateException | IllegalArgumentException e) {
            LOGGER.error("Invalid COD checkout request: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "COD checkout failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            LOGGER.error("Unexpected error during COD checkout: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "COD checkout failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * Handle Razorpay checkout - initiate payment gateway.
     */
    private ResponseEntity<Map<String, Object>> handleRazorpayCheckout(
            double itemAmount, double deliveryCharge,
            Map<String, Object> res) {

        try {
            // Note: Razorpay gateway integration pending (see #TODO-PAYMENT)

            double totalAmount = itemAmount + deliveryCharge;

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Proceed to Razorpay payment");
            res.put(KEY_PAYMENT_METHOD, K_RAZORPAY);
            res.put(KEY_AMOUNT, (int) (totalAmount * 100));  // In paise
            res.put("currency", "INR");

            return ResponseEntity.ok(res);

        } catch (IllegalStateException | IllegalArgumentException e) {
            LOGGER.error("Invalid Razorpay checkout request: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Razorpay checkout failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            LOGGER.error("Unexpected error during Razorpay checkout: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Razorpay checkout failed: " + e.getMessage());
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
     *     K_ORDERID: 12345,
     *     "deliveryBoyId": 567,
     *     "otpVerified": true,
     *     "collectionNotes": "Customer paid in full"
     *   }
     *
     * Response:
     *   {
     *     KEY_SUCCESS: true,
     *     KEY_MESSAGE: "COD collected for Order #12345",
     *     KEY_PAYMENT_STATUS: "COLLECTED"
     *   }
     */
    @PostMapping("/cod/mark-collected")
    public ResponseEntity<Map<String, Object>> markCodCollected(
            @RequestBody Map<String, Object> payload) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            int orderId = ((Number) payload.get(K_ORDERID)).intValue();
            int deliveryBoyId = ((Number) payload.get("deliveryBoyId")).intValue();
            String notes = (String) payload.getOrDefault("collectionNotes", "");

            // Mark as collected
            Order order = codPaymentService.markCodCollected(orderId, deliveryBoyId, notes);

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "COD collected for Order #" + orderId);
            res.put(KEY_PAYMENT_STATUS, order.getPaymentStatus());
            res.put(KEY_AMOUNT, order.getCodAmount());

            return ResponseEntity.ok(res);

        } catch (IllegalArgumentException | IllegalStateException e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error marking COD collected: " + e.getMessage());
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
     *     KEY_SUCCESS: true,
     *     "orders": [
     *       {
     *         "id": 12345,
     *         "customerName": "John Doe",
     *         KEY_AMOUNT: 500.00,
     *         KEY_PAYMENT_STATUS: "COLLECTED",
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
                        order.put(KEY_AMOUNT, o.getCodAmount());
                        order.put(KEY_PAYMENT_STATUS, o.getPaymentStatus());
                        order.put("collectedAt", o.getCodCollectionTimestamp());
                        DeliveryBoy db = o.getDeliveryBoy();
                        order.put("deliveryBoyName", db != null ? db.getName() : "Unknown");
                        return order;
                    })
                    .toList();

            res.put(KEY_SUCCESS, true);
            res.put("count", orderList.size());
            res.put("orders", orderList);

            return ResponseEntity.ok(res);

        } catch (NullPointerException e) {
            LOGGER.error("Data integrity issue while fetching COD orders: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching COD orders: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        } catch (Exception e) {
            LOGGER.error("Unexpected error fetching COD orders: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Error fetching COD orders: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/admin/cod/verify-payment
     * Admin verifies COD payment.
     *
     * Request Body:
     *   {
     *     K_ORDERID: 12345,
     *     "adminId": 99,
     *     "verificationNotes": "Cash amount verified"
     *   }
     *
     * Response:
     *   {
     *     KEY_SUCCESS: true,
     *     KEY_MESSAGE: "Order #12345 payment verified",
     *     KEY_PAYMENT_STATUS: "VERIFIED"
     *   }
     */
    @PostMapping("/admin/cod/verify-payment")
    public ResponseEntity<Map<String, Object>> verifyCodPayment(
            @RequestBody Map<String, Object> payload) {

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            int orderId = ((Number) payload.get(K_ORDERID)).intValue();
            int adminId = ((Number) payload.get("adminId")).intValue();
            String notes = (String) payload.getOrDefault("verificationNotes", "");

            Order order = codPaymentService.verifyCodPayment(orderId, adminId, notes);

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Order #" + orderId + " payment verified");
            res.put(KEY_PAYMENT_STATUS, order.getPaymentStatus());

            return ResponseEntity.ok(res);

        } catch (IllegalArgumentException e) {
            LOGGER.error("Invalid COD verification request: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.badRequest().body(res);
        } catch (IllegalStateException e) {
            LOGGER.error("Invalid COD order state: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.status(409).body(res);
        } catch (Exception e) {
            LOGGER.error("Unexpected error verifying COD payment: {}", e.getMessage(), e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }
}