package com.example.ekart.controller;

import com.example.ekart.dto.*;
import com.example.ekart.helper.AES;
import com.example.ekart.repository.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Flutter REST API Controller for Ekart Mobile App.
 * Base path: /api/flutter
 *
 * All responses are JSON. Auth uses session token passed as header:
 *   X-Customer-Id: <id>   (for customer endpoints)
 *   X-Vendor-Id: <id>     (for vendor endpoints)
 */
@RestController
@RequestMapping("/api/flutter")
@CrossOrigin(origins = "*")
public class FlutterApiController {

    @Autowired private CustomerRepository customerRepository;
    @Autowired private VendorRepository vendorRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ItemRepository itemRepository;

    // ═══════════════════════════════════════════════════════
    // AUTH — CUSTOMER
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/auth/customer/register
     * Body: { name, email, mobile, password }
     */
    @PostMapping("/auth/customer/register")
    public ResponseEntity<Map<String, Object>> customerRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get("email");
            if (customerRepository.existsByEmail(email)) {
                res.put("success", false);
                res.put("message", "Email already registered");
                return ResponseEntity.badRequest().body(res);
            }

            Customer c = new Customer();
            c.setName((String) body.get("name"));
            c.setEmail(email);
            c.setMobile(Long.parseLong(body.get("mobile").toString()));
            c.setPassword(AES.encrypt((String) body.get("password")));
            c.setVerified(true); // auto-verify for mobile (no email OTP flow)
            c.setRole(Role.CUSTOMER);
            c.setActive(true);
            customerRepository.save(c);

            res.put("success", true);
            res.put("message", "Registered successfully");
            res.put("customerId", c.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/flutter/auth/customer/login
     * Body: { email, password }
     * Returns: { success, customerId, name, email, token }
     */
    @PostMapping("/auth/customer/login")
    public ResponseEntity<Map<String, Object>> customerLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get("email");
            String password = (String) body.get("password");

            Customer c = customerRepository.findByEmail(email);
            if (c == null || !AES.decrypt(c.getPassword()).equals(password)) {
                res.put("success", false);
                res.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            if (!c.isActive()) {
                res.put("success", false);
                res.put("message", "Account suspended. Contact support.");
                return ResponseEntity.badRequest().body(res);
            }

            res.put("success", true);
            res.put("customerId", c.getId());
            res.put("name", c.getName());
            res.put("email", c.getEmail());
            res.put("mobile", c.getMobile());
            // Simple token: base64(id:email) — replace with JWT in production
            String token = Base64.getEncoder().encodeToString((c.getId() + ":" + c.getEmail()).getBytes());
            res.put("token", token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // AUTH — VENDOR
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/auth/vendor/register
     * Body: { name, email, mobile, password }
     */
    @PostMapping("/auth/vendor/register")
    public ResponseEntity<Map<String, Object>> vendorRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get("email");
            if (vendorRepository.existsByEmail(email)) {
                res.put("success", false);
                res.put("message", "Email already registered");
                return ResponseEntity.badRequest().body(res);
            }

            Vendor v = new Vendor();
            v.setName((String) body.get("name"));
            v.setEmail(email);
            v.setMobile(Long.parseLong(body.get("mobile").toString()));
            v.setPassword(AES.encrypt((String) body.get("password")));
            v.setVerified(true);
            vendorRepository.save(v);

            res.put("success", true);
            res.put("message", "Registered successfully. Wait for admin approval.");
            res.put("vendorId", v.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/flutter/auth/vendor/login
     * Body: { email, password }
     */
    @PostMapping("/auth/vendor/login")
    public ResponseEntity<Map<String, Object>> vendorLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get("email");
            String password = (String) body.get("password");

            Vendor v = vendorRepository.findByEmail(email);
            if (v == null || !AES.decrypt(v.getPassword()).equals(password)) {
                res.put("success", false);
                res.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }

            res.put("success", true);
            res.put("vendorId", v.getId());
            res.put("name", v.getName());
            res.put("email", v.getEmail());
            res.put("vendorCode", v.getVendorCode());
            String token = Base64.getEncoder().encodeToString((v.getId() + ":" + v.getEmail()).getBytes());
            res.put("token", token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRODUCTS
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/flutter/products
     * GET /api/flutter/products?search=shoes
     * GET /api/flutter/products?category=Electronics
     */
    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        Map<String, Object> res = new HashMap<>();
        List<Product> products;

        if (search != null && !search.isBlank()) {
            products = productRepository.findByNameContainingIgnoreCase(search)
                    .stream().filter(Product::isApproved).collect(Collectors.toList());
        } else if (category != null && !category.isBlank()) {
            products = productRepository.findByCategoryAndApprovedTrue(category);
        } else {
            products = productRepository.findByApprovedTrue();
        }

        res.put("success", true);
        res.put("products", products.stream().map(this::mapProduct).collect(Collectors.toList()));
        res.put("count", products.size());
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/products/{id}
     */
    @GetMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || !p.isApproved()) {
            res.put("success", false);
            res.put("message", "Product not found");
            return ResponseEntity.badRequest().body(res);
        }
        res.put("success", true);
        res.put("product", mapProduct(p));
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/products/categories
     */
    @GetMapping("/products/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        Map<String, Object> res = new HashMap<>();
        List<String> categories = productRepository.findByApprovedTrue()
                .stream()
                .map(Product::getCategory)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        res.put("success", true);
        res.put("categories", categories);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // CART
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/flutter/cart
     * Header: X-Customer-Id: <id>
     */
    @GetMapping("/cart")
    public ResponseEntity<Map<String, Object>> getCart(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }

        Cart cart = customer.getCart();
        if (cart == null) {
            res.put("success", true);
            res.put("items", new ArrayList<>());
            res.put("total", 0.0);
            return ResponseEntity.ok(res);
        }

        List<Map<String, Object>> items = cart.getItems().stream().map(this::mapItem).collect(Collectors.toList());
        double total = cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();

        res.put("success", true);
        res.put("items", items);
        res.put("total", total);
        res.put("count", items.size());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/cart/add
     * Header: X-Customer-Id: <id>
     * Body: { productId }
     */
    @PostMapping("/cart/add")
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }

            int productId = Integer.parseInt(body.get("productId").toString());
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || !product.isApproved()) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.badRequest().body(res); }
            if (product.getStock() <= 0) { res.put("success", false); res.put("message", "Product out of stock"); return ResponseEntity.badRequest().body(res); }

            Cart cart = customer.getCart();
            if (cart == null) { cart = new Cart(); customer.setCart(cart); }

            // Check if already in cart
            Optional<Item> existing = cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                    .findFirst();

            if (existing.isPresent()) {
                Item item = existing.get();
                if (item.getQuantity() >= product.getStock()) {
                    res.put("success", false); res.put("message", "Max stock reached"); return ResponseEntity.badRequest().body(res);
                }
                item.setQuantity(item.getQuantity() + 1);
            } else {
                Item item = new Item();
                item.setName(product.getName());
                item.setDescription(product.getDescription());
                item.setPrice(product.getPrice());
                item.setCategory(product.getCategory());
                item.setQuantity(1);
                item.setImageLink(product.getImageLink());
                item.setProductId(productId);
                item.setCart(cart);
                cart.getItems().add(item);
            }

            customerRepository.save(customer);
            res.put("success", true);
            res.put("message", "Added to cart");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * DELETE /api/flutter/cart/remove/{productId}
     * Header: X-Customer-Id: <id>
     */
    @DeleteMapping("/cart/remove/{productId}")
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestHeader("X-Customer-Id") int customerId,
            @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put("success", false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }

        Cart cart = customer.getCart();
        cart.getItems().removeIf(i -> i.getProductId() != null && i.getProductId() == productId);
        customerRepository.save(customer);

        res.put("success", true);
        res.put("message", "Removed from cart");
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/flutter/cart/update
     * Header: X-Customer-Id: <id>
     * Body: { productId, quantity }   (quantity = 0 to remove)
     */
    @PutMapping("/cart/update")
    public ResponseEntity<Map<String, Object>> updateCart(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put("success", false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }

        int productId = Integer.parseInt(body.get("productId").toString());
        int quantity  = Integer.parseInt(body.get("quantity").toString());

        Cart cart = customer.getCart();
        if (quantity <= 0) {
            cart.getItems().removeIf(i -> i.getProductId() != null && i.getProductId() == productId);
        } else {
            cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                    .findFirst()
                    .ifPresent(i -> i.setQuantity(quantity));
        }
        customerRepository.save(customer);

        res.put("success", true);
        res.put("message", "Cart updated");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ORDERS — CUSTOMER
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/orders/place
     * Header: X-Customer-Id: <id>
     * Body: { paymentMode, address, city, deliveryTime }
     */
    @PostMapping("/orders/place")
    public ResponseEntity<Map<String, Object>> placeOrder(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }

            Cart cart = customer.getCart();
            if (cart == null || cart.getItems().isEmpty()) { res.put("success", false); res.put("message", "Cart is empty"); return ResponseEntity.badRequest().body(res); }

            // Build order items
            List<Item> orderItems = new ArrayList<>();
            double total = 0;
            for (Item cartItem : cart.getItems()) {
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product == null || product.getStock() < cartItem.getQuantity()) {
                    res.put("success", false); res.put("message", "Insufficient stock for: " + cartItem.getName());
                    return ResponseEntity.badRequest().body(res);
                }
                // Deduct stock
                product.setStock(product.getStock() - cartItem.getQuantity());
                productRepository.save(product);

                Item orderItem = new Item();
                orderItem.setName(cartItem.getName());
                orderItem.setDescription(cartItem.getDescription());
                orderItem.setPrice(cartItem.getPrice());
                orderItem.setCategory(cartItem.getCategory());
                orderItem.setQuantity(cartItem.getQuantity());
                orderItem.setImageLink(cartItem.getImageLink());
                orderItem.setProductId(cartItem.getProductId());
                orderItems.add(orderItem);
                total += cartItem.getPrice() * cartItem.getQuantity();
            }

            String deliveryTime = (String) body.getOrDefault("deliveryTime", "STANDARD");
            double deliveryCharge = "EXPRESS".equals(deliveryTime) ? 50.0 : 0.0;

            Order order = new Order();
            order.setCustomer(customer);
            order.setItems(orderItems);
            order.setAmount(total);
            order.setDeliveryCharge(deliveryCharge);
            order.setTotalPrice(total + deliveryCharge);
            order.setPaymentMode((String) body.getOrDefault("paymentMode", "COD"));
            order.setDeliveryTime(deliveryTime);
            order.setDateTime(LocalDateTime.now());
            order.setTrackingStatus(TrackingStatus.PROCESSING);
            order.setCurrentCity((String) body.getOrDefault("city", ""));
            orderRepository.save(order);

            // Clear cart
            cart.getItems().clear();
            customerRepository.save(customer);

            res.put("success", true);
            res.put("message", "Order placed successfully");
            res.put("orderId", order.getId());
            res.put("totalPrice", order.getTotalPrice());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * GET /api/flutter/orders
     * Header: X-Customer-Id: <id>
     */
    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrders(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }

        List<Order> orders = orderRepository.findByCustomer(customer);
        res.put("success", true);
        res.put("orders", orders.stream().map(this::mapOrder).collect(Collectors.toList()));
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/orders/{id}
     * Header: X-Customer-Id: <id>
     */
    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @RequestHeader("X-Customer-Id") int customerId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) {
            res.put("success", false); res.put("message", "Order not found");
            return ResponseEntity.badRequest().body(res);
        }
        res.put("success", true);
        res.put("order", mapOrder(order));
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/orders/{id}/cancel
     * Header: X-Customer-Id: <id>
     */
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @RequestHeader("X-Customer-Id") int customerId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) {
            res.put("success", false); res.put("message", "Order not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getTrackingStatus() == TrackingStatus.DELIVERED ||
            order.getTrackingStatus() == TrackingStatus.CANCELLED) {
            res.put("success", false); res.put("message", "Cannot cancel this order");
            return ResponseEntity.badRequest().body(res);
        }

        // Restore stock
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

        res.put("success", true);
        res.put("message", "Order cancelled");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR DASHBOARD
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/flutter/vendor/products
     * Header: X-Vendor-Id: <id>
     */
    @GetMapping("/vendor/products")
    public ResponseEntity<Map<String, Object>> getVendorProducts(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }

        List<Product> products = productRepository.findByVendor(vendor);
        res.put("success", true);
        res.put("products", products.stream().map(this::mapProduct).collect(Collectors.toList()));
        res.put("count", products.size());
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/vendor/orders
     * Header: X-Vendor-Id: <id>
     */
    @GetMapping("/vendor/orders")
    public ResponseEntity<Map<String, Object>> getVendorOrders(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }

        List<Integer> vendorProductIds = productRepository.findByVendor(vendor)
                .stream().map(Product::getId).collect(Collectors.toList());

        List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);
        List<Map<String, Object>> vendorOrders = allOrders.stream().map(order -> {
            Map<String, Object> o = mapOrder(order);
            // Only include items that belong to this vendor
            List<Map<String, Object>> vendorItems = order.getItems().stream()
                    .filter(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()))
                    .map(this::mapItem)
                    .collect(Collectors.toList());
            o.put("items", vendorItems);
            double vendorTotal = vendorItems.stream().mapToDouble(i -> (double) i.get("price") * (int) i.get("quantity")).sum();
            o.put("vendorTotal", vendorTotal);
            return o;
        }).collect(Collectors.toList());

        res.put("success", true);
        res.put("orders", vendorOrders);
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/vendor/stats
     * Header: X-Vendor-Id: <id>
     */
    @GetMapping("/vendor/stats")
    public ResponseEntity<Map<String, Object>> getVendorStats(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }

        List<Product> products = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).collect(Collectors.toList());
        List<Order> orders = orderRepository.findOrdersByVendor(vendor);

        double totalRevenue = orders.stream()
                .filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED)
                .flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity())
                .sum();

        long totalOrders = orders.size();
        long activeProducts = products.stream().filter(Product::isApproved).count();
        long lowStockProducts = products.stream().filter(p -> p.getStock() <= (p.getStockAlertThreshold() != null ? p.getStockAlertThreshold() : 10)).count();

        res.put("success", true);
        res.put("totalRevenue", totalRevenue);
        res.put("totalOrders", totalOrders);
        res.put("totalProducts", products.size());
        res.put("activeProducts", activeProducts);
        res.put("lowStockProducts", lowStockProducts);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // HELPER MAPPERS
    // ═══════════════════════════════════════════════════════

    private Map<String, Object> mapProduct(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("description", p.getDescription());
        m.put("price", p.getPrice());
        m.put("category", p.getCategory());
        m.put("stock", p.getStock());
        m.put("imageLink", p.getImageLink());
        m.put("extraImageLinks", p.getExtraImageLinks());
        m.put("approved", p.isApproved());
        m.put("vendorCode", p.getVendor() != null ? p.getVendor().getVendorCode() : null);
        return m;
    }

    private Map<String, Object> mapItem(Item i) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", i.getId());
        m.put("name", i.getName());
        m.put("description", i.getDescription());
        m.put("price", i.getPrice());
        m.put("category", i.getCategory());
        m.put("quantity", i.getQuantity());
        m.put("imageLink", i.getImageLink());
        m.put("productId", i.getProductId());
        return m;
    }

    private Map<String, Object> mapOrder(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId());
        m.put("amount", o.getAmount());
        m.put("deliveryCharge", o.getDeliveryCharge());
        m.put("totalPrice", o.getTotalPrice());
        m.put("paymentMode", o.getPaymentMode());
        m.put("deliveryTime", o.getDeliveryTime());
        m.put("trackingStatus", o.getTrackingStatus().name());
        m.put("trackingStatusDisplay", o.getTrackingStatus().getDisplayName());
        m.put("currentCity", o.getCurrentCity());
        m.put("orderDate", o.getOrderDate() != null ? o.getOrderDate().toString() : null);
        m.put("replacementRequested", o.isReplacementRequested());
        m.put("items", o.getItems().stream().map(this::mapItem).collect(Collectors.toList()));
        return m;
    }
}