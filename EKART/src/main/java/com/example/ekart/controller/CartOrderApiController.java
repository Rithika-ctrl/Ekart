package com.example.ekart.controller;

import java.time.LocalDateTime;
import java.util.*;

import com.example.ekart.dto.*;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.helper.JwtUtil;
import com.example.ekart.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * ⚠️ DEPRECATED — DO NOT USE THIS CONTROLLER
 * 
 * This controller has been deprecated and is scheduled for removal.
 * Use {@link ReactApiController} instead (/api/react/cart/* and /api/react/orders/*).
 * 
 * ISSUE: Duplicate cart controllers create confusion and risk of double-handling.
 * - CartOrderApiController uses /api/cart/* endpoints (LEGACY)
 * - ReactApiController uses /api/react/cart/* endpoints (CURRENT)
 * 
 * MIGRATION GUIDE:
 * 1. Frontend (React): already uses /api/react/* endpoints ✅
 * 2. Flutter app: migrate from /api/cart/* → /api/flutter/* or /api/react/*
 * 3. Any mobile app using /api/cart/*: redirect to /api/react/cart/*
 * 
 * LEGACY ENDPOINTS (DO NOT USE):
 *   GET    /api/cart                → use /api/react/cart instead
 *   POST   /api/cart/add/{id}       → use /api/react/cart/add instead
 *   DELETE /api/cart/remove/{id}    → use /api/react/cart/remove/{productId} instead
 *   POST   /api/cart/increase/{id}  → use /api/react/cart/update instead
 *   POST   /api/cart/decrease/{id}  → use /api/react/cart/update instead
 *   POST   /api/orders/place        → use /api/react/orders/place instead
 *   GET    /api/orders/my           → use /api/react/orders instead
 *   GET    /api/orders/{id}         → use /api/react/orders/{id} instead
 *   POST   /api/orders/{id}/cancel  → use /api/react/orders/{id}/cancel instead
 * 
 * CONFIGURATION:
 * - Disabled by default: ekart.api.legacy-cart.enabled=false (see application.properties)
 * - Status: @Deprecated(since = "0.0.1", forRemoval = true)
 * - Removal: Next major version
 * 
 * For Flutter app, use FlutterApiController instead: {@link FlutterApiController}
 * 
 * @see ReactApiController
 * @see FlutterApiController
 * @deprecated Use {@link ReactApiController} (/api/react) instead
 */
@Deprecated(since = "0.0.1", forRemoval = true)
@ConditionalOnProperty(name = "ekart.api.legacy-cart.enabled", havingValue = "true", matchIfMissing = false)
@RestController
@CrossOrigin(origins = "*")
public class CartOrderApiController {

    // ── S1192 String constants ──
    private static final String K_AUTHORIZATION                     = "Authorization";
    private static final String K_MESSAGE                           = "message";
    private static final String K_PRICE                             = "price";
    private static final String K_QUANTITY                          = "quantity";
    private static final String K_SUCCESS                           = "success";

    private static final Logger LOGGER = LoggerFactory.getLogger(CartOrderApiController.class);

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final JwtUtil jwtUtil;
    private final EmailSender emailSender;

    public CartOrderApiController(
            CustomerRepository customerRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            ItemRepository itemRepository,
            JwtUtil jwtUtil,
            EmailSender emailSender) {
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
        this.jwtUtil = jwtUtil;
        this.emailSender = emailSender;
    }



    // ══════════════════════════════════════════════════════════
    //  CART
    // ══════════════════════════════════════════════════════════

    /** GET /api/cart */
    @GetMapping("/api/cart")
    public ResponseEntity<Map<String, Object>> getCart(
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Customer customer = getCustomer(authHeader);
        Map<String, Object> res = new HashMap<>();
        if (customer == null) return unauthorized(res);

        customer = customerRepository.findById(customer.getId()).orElse(null);
        List<Item> items = customer.getCart().getItems();

        // ✅ FIX: use lineTotal (unitPrice × qty) for accurate subtotal
        double subtotal       = items.stream().mapToDouble(i ->
                i.getUnitPrice() > 0 ? i.getLineTotal() : i.getPrice()).sum();
        double deliveryCharge = subtotal >= 500 ? 0 : 40;
        double total          = subtotal + deliveryCharge;

        res.put(K_SUCCESS,        true);
        res.put("items",          items.stream().map(this::buildItemMap).toList());
        res.put("itemCount",      items.size());
        res.put("subtotal",       subtotal);
        res.put("deliveryCharge", deliveryCharge);
        res.put("total",          total);
        res.put("freeDelivery",   subtotal >= 500);
        return ResponseEntity.ok(res);
    }

    /** POST /api/cart/add/{productId} */
    @PostMapping("/api/cart/add/{productId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> addToCart(
            @PathVariable int productId,
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Customer customer = getCustomer(authHeader);
        Map<String, Object> res = new HashMap<>();
        if (customer == null) return unauthorized(res);

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null || !product.isApproved()) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Product not found");
            return ResponseEntity.status(404).body(res);
        }
        if (product.getStock() <= 0) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Product is out of stock");
            return ResponseEntity.status(400).body(res);
        }

        customer = customerRepository.findById(customer.getId()).orElseThrow();

        // Check if already in cart → increase qty instead
        List<Item> cartItems = customer.getCart().getItems();
        for (Item item : cartItems) {
            if (item.getProductId() != null && item.getProductId() == productId) {
                int newQty = item.getQuantity() + 1;
                double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : product.getPrice();
                item.setUnitPrice(unitPrice);
                item.setQuantity(newQty);
                item.setPrice(unitPrice * newQty); // ✅ FIX: clean multiply, no drift
                itemRepository.save(item);
                res.put(K_SUCCESS, true);
                res.put(K_MESSAGE, "Quantity increased");
                res.put("cartCount", cartItems.size());
                return ResponseEntity.ok(res);
            }
        }

        // Add new item
        Item newItem = new Item();
        newItem.setName(product.getName());
        newItem.setDescription(product.getDescription());
        newItem.setUnitPrice(product.getPrice());        // ✅ FIX: store unit price
        newItem.setPrice(product.getPrice());            // line total = 1 × unitPrice
        newItem.setCategory(product.getCategory());
        newItem.setImageLink(product.getImageLink());
        newItem.setProductId(product.getId());
        newItem.setQuantity(1);
        newItem.setCart(customer.getCart());

        customer.getCart().getItems().add(newItem);
        customerRepository.save(customer);

        res.put(K_SUCCESS,   true);
        res.put(K_MESSAGE,   "Added to cart");
        res.put("cartCount", customer.getCart().getItems().size());
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/cart/remove/{itemId} */
    @DeleteMapping("/api/cart/remove/{itemId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @PathVariable int itemId,
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Customer customer = getCustomer(authHeader);
        Map<String, Object> res = new HashMap<>();
        if (customer == null) return unauthorized(res);

        customer = customerRepository.findById(customer.getId()).orElseThrow();
        List<Item> items = customer.getCart().getItems();
        items.removeIf(i -> i.getId() == itemId);
        customerRepository.save(customer);
        itemRepository.deleteById(itemId);

        res.put(K_SUCCESS, true);
        res.put(K_MESSAGE, "Item removed");
        return ResponseEntity.ok(res);
    }

    /** POST /api/cart/increase/{itemId} */
    @PostMapping("/api/cart/increase/{itemId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> increaseQty(
            @PathVariable int itemId,
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        Item item = itemRepository.findById(itemId).orElse(null);
        if (item == null) { res.put(K_SUCCESS, false); return ResponseEntity.status(404).body(res); }

        // ✅ FIX: prefer stored unitPrice, fallback to product price
        double unitPrice = item.getUnitPrice() > 0
                ? item.getUnitPrice()
                : productRepository.findById(item.getProductId() != null ? item.getProductId() : -1)
                        .map(Product::getPrice).orElse(item.getPrice());

        int newQty = item.getQuantity() + 1;
        item.setUnitPrice(unitPrice);
        item.setQuantity(newQty);
        item.setPrice(unitPrice * newQty); // ✅ FIX: exact multiply, no drift
        itemRepository.save(item);

        res.put(K_SUCCESS,  true);
        res.put(K_QUANTITY, item.getQuantity());
        res.put(K_PRICE,    item.getPrice());
        return ResponseEntity.ok(res);
    }

    /** POST /api/cart/decrease/{itemId} */
    @PostMapping("/api/cart/decrease/{itemId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> decreaseQty(
            @PathVariable int itemId,
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        Item item = itemRepository.findById(itemId).orElse(null);
        if (item == null) { res.put(K_SUCCESS, false); return ResponseEntity.status(404).body(res); }

        if (item.getQuantity() <= 1) {
            // Remove item if qty reaches 0
            customer = customerRepository.findById(customer.getId()).orElseThrow();
            customer.getCart().getItems().removeIf(i -> i.getId() == itemId);
            customerRepository.save(customer);
            itemRepository.deleteById(itemId);
            res.put(K_SUCCESS, true);
            res.put("removed", true);
            return ResponseEntity.ok(res);
        }

        // ✅ FIX: exact multiply, no drift
        double unitPrice = item.getUnitPrice() > 0
                ? item.getUnitPrice()
                : item.getPrice() / Math.max(item.getQuantity(), 1);

        int newQty = item.getQuantity() - 1;
        item.setUnitPrice(unitPrice);
        item.setQuantity(newQty);
        item.setPrice(unitPrice * newQty);
        itemRepository.save(item);

        res.put(K_SUCCESS,  true);
        res.put("removed",  false);
        res.put(K_QUANTITY, item.getQuantity());
        res.put(K_PRICE,    item.getPrice());
        return ResponseEntity.ok(res);
    }

    // ══════════════════════════════════════════════════════════
    //  ORDERS
    // ══════════════════════════════════════════════════════════

    /** POST /api/orders/place — Place COD order */
    @PostMapping("/api/orders/place")
    @Transactional
    public ResponseEntity<Map<String, Object>> placeOrder(
            @RequestBody Map<String, String> body,
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        customer = customerRepository.findById(customer.getId()).orElseThrow();
        List<Item> cartItems = customer.getCart().getItems();

        if (cartItems.isEmpty()) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Cart is empty");
            return ResponseEntity.badRequest().body(res);
        }

        String paymentMode  = body.getOrDefault("paymentMode", "Cash on Delivery");
        String deliveryTime = body.getOrDefault("deliveryTime", "Standard Delivery");

        // Calculate totals
        double subtotal       = cartItems.stream().mapToDouble(Item::getPrice).sum();
        double deliveryCharge = subtotal >= 500 ? 0 : 40;
        double grandTotal     = subtotal + deliveryCharge;

        // Build order
        Order order = new Order();
        order.setCustomer(customer);
        order.setOrderDate(LocalDateTime.now());
        order.setTotalPrice(subtotal);
        order.setDeliveryCharge(deliveryCharge);
        order.setAmount(grandTotal);
        order.setPaymentMode(paymentMode);
        order.setDeliveryTime(deliveryTime);
        order.setRazorpayPaymentId("COD_NA");
        order.setRazorpayOrderId("COD_ORDER");
        order.setTrackingStatus(TrackingStatus.PROCESSING);
        order.setReplacementRequested(false);

        // Clone cart items to order
        List<Item> orderItems = new ArrayList<>();
        for (Item cartItem : cartItems) {
            Item newItem = new Item();
            newItem.setName(cartItem.getName());
            newItem.setUnitPrice(cartItem.getUnitPrice());
            newItem.setPrice(cartItem.getPrice());
            newItem.setQuantity(cartItem.getQuantity());
            newItem.setCategory(cartItem.getCategory());
            newItem.setDescription(cartItem.getDescription());
            newItem.setImageLink(cartItem.getImageLink());
            newItem.setProductId(cartItem.getProductId());
            orderItems.add(newItem);
        }
        order.setItems(orderItems);
        orderRepository.save(order);

        // Clear cart
        List<Item> toDelete = new ArrayList<>(cartItems);
        customer.getCart().getItems().clear();
        customerRepository.save(customer);
        itemRepository.deleteAll(toDelete);

        res.put(K_SUCCESS,  true);
        res.put(K_MESSAGE,  "Order placed successfully!");
        res.put("orderId",  order.getId());
        res.put("total",    grandTotal);
        res.put("tracking", order.getTrackingStatus().name());
        return ResponseEntity.ok(res);
    }

    /** GET /api/orders/my — Get all orders for logged-in customer */
    @GetMapping("/api/orders/my")
    public ResponseEntity<Map<String, Object>> myOrders(
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        customer = customerRepository.findById(customer.getId()).orElseThrow();
        List<Order> orders = orderRepository.findByCustomer(customer);

        orders.sort(Comparator.comparing(Order::getOrderDate,
                Comparator.nullsLast(Comparator.reverseOrder())));

        res.put(K_SUCCESS, true);
        res.put("count",   orders.size());
        res.put("orders",  orders.stream().map(this::buildOrderMap).toList());
        return ResponseEntity.ok(res);
    }

    /** GET /api/orders/{id} — Single order detail */
    @GetMapping("/api/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @PathVariable int id,
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customer.getId()) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Order not found");
            return ResponseEntity.status(404).body(res);
        }

        res.put(K_SUCCESS, true);
        res.put("order",   buildOrderMap(order));
        return ResponseEntity.ok(res);
    }

    /** POST /api/orders/{id}/cancel */
    @PostMapping("/api/orders/{id}/cancel")
    @Transactional
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @PathVariable int id,
            @RequestHeader(K_AUTHORIZATION) String authHeader) {

        Map<String, Object> res = new HashMap<>();
        Customer customer = getCustomer(authHeader);
        if (customer == null) return unauthorized(res);

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customer.getId()) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Order not found");
            return ResponseEntity.status(404).body(res);
        }

        if (order.getTrackingStatus() == TrackingStatus.DELIVERED) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Cannot cancel a delivered order");
            return ResponseEntity.badRequest().body(res);
        }

        for (Item item : order.getItems()) {
            if (item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(p -> {
                    p.setStock(p.getStock() + item.getQuantity());
                    productRepository.save(p);
                });
            }
        }

        order.setTrackingStatus(TrackingStatus.CANCELLED);
        orderRepository.save(order);

        // Send cancellation email — async, fire-and-forget
        try {
            emailSender.sendOrderCancellation(
                customer, order.getAmount(), order.getId(),
                new java.util.ArrayList<>(order.getItems())
            );
        } catch (Exception e) {
            LOGGER.warn("[CartOrderApi] Cancellation email failed for order #{}: {}",
                order.getId(), e.getMessage(), e);
        }

        res.put(K_SUCCESS, true);
        res.put(K_MESSAGE, "Order cancelled successfully");
        return ResponseEntity.ok(res);
    }

    // ══════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════

    private Customer getCustomer(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) return null;
        int id = jwtUtil.getCustomerId(token);
        return customerRepository.findById(id).orElse(null);
    }

    private ResponseEntity<Map<String, Object>> unauthorized(Map<String, Object> res) {
        res.put(K_SUCCESS, false);
        res.put(K_MESSAGE, "Unauthorized. Please login.");
        return ResponseEntity.status(401).body(res);
    }

    private Map<String, Object> buildItemMap(Item i) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",        i.getId());
        m.put("name",      i.getName());
        m.put("unitPrice", i.getUnitPrice());                                          // ✅ FIX
        m.put("lineTotal", i.getUnitPrice() > 0 ? i.getLineTotal() : i.getPrice());   // ✅ FIX
        m.put(K_PRICE,     i.getPrice());     // kept for backwards compat
        m.put(K_QUANTITY,  i.getQuantity());
        m.put("category",  i.getCategory());
        m.put("imageLink", i.getImageLink());
        m.put("productId", i.getProductId());
        return m;
    }

    private Map<String, Object> buildOrderMap(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",             o.getId());
        m.put("amount",         o.getAmount());
        m.put("totalPrice",     o.getTotalPrice());
        m.put("deliveryCharge", o.getDeliveryCharge());
        m.put("deliveryTime",   o.getDeliveryTime());
        m.put("orderDate",      o.getOrderDate() != null ? o.getOrderDate().toString() : null);
        m.put("trackingStatus", o.getTrackingStatus().name());
        m.put("currentCity",    o.getCurrentCity());
        m.put("replacementReq", o.isReplacementRequested());
        m.put("items",          o.getItems().stream().map(this::buildItemMap).toList());
        return m;
    }
}