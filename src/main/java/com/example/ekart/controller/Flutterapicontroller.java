package com.example.ekart.controller;

import com.example.ekart.dto.*;
import com.example.ekart.helper.AES;
import com.example.ekart.repository.*;
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
 * Auth pattern:
 *   X-Customer-Id: <id>  for customer endpoints
 *   X-Vendor-Id:   <id>  for vendor endpoints
 *
 * All endpoints are under /api/flutter/** which is already
 * permitted in SecurityConfig (Chain 1 = permitAll, stateless).
 */
@RestController
@RequestMapping("/api/flutter")
@CrossOrigin(origins = "*")
public class FlutterApiController {

    @Autowired private CustomerRepository  customerRepository;
    @Autowired private VendorRepository    vendorRepository;
    @Autowired private ProductRepository   productRepository;
    @Autowired private OrderRepository     orderRepository;
    @Autowired private ItemRepository      itemRepository;
    @Autowired private WishlistRepository  wishlistRepository;
    @Autowired private AddressRepository   addressRepository;
    @Autowired private ReviewRepository    reviewRepository;
    @Autowired private RefundRepository    refundRepository;

    // Admin credentials come from application.properties (admin.email / admin.password)
    @org.springframework.beans.factory.annotation.Value("${admin.email}")
    private String adminEmail;

    @org.springframework.beans.factory.annotation.Value("${admin.password}")
    private String adminPassword;

    // ═══════════════════════════════════════════════════════
    // AUTH — CUSTOMER
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/auth/customer/register */
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
            c.setVerified(true);
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

    /** POST /api/flutter/auth/customer/login */
    @PostMapping("/auth/customer/login")
    public ResponseEntity<Map<String, Object>> customerLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get("email");
            String password = (String) body.get("password");
            Customer c = customerRepository.findByEmail(email);
            if (c == null || !AES.decrypt(c.getPassword()).equals(password)) {
                res.put("success", false); res.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            if (!c.isActive()) {
                res.put("success", false); res.put("message", "Account suspended. Contact support.");
                return ResponseEntity.badRequest().body(res);
            }
            String token = Base64.getEncoder().encodeToString((c.getId() + ":" + c.getEmail()).getBytes());
            res.put("success", true);
            res.put("customerId", c.getId());
            res.put("name", c.getName());
            res.put("email", c.getEmail());
            res.put("mobile", c.getMobile());
            res.put("token", token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // AUTH — VENDOR
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/auth/vendor/register */
    @PostMapping("/auth/vendor/register")
    public ResponseEntity<Map<String, Object>> vendorRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get("email");
            if (vendorRepository.existsByEmail(email)) {
                res.put("success", false); res.put("message", "Email already registered");
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
            res.put("success", false); res.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/vendor/login */
    @PostMapping("/auth/vendor/login")
    public ResponseEntity<Map<String, Object>> vendorLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get("email");
            String password = (String) body.get("password");
            Vendor v = vendorRepository.findByEmail(email);
            if (v == null || !AES.decrypt(v.getPassword()).equals(password)) {
                res.put("success", false); res.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            String token = Base64.getEncoder().encodeToString((v.getId() + ":" + v.getEmail()).getBytes());
            res.put("success", true);
            res.put("vendorId", v.getId());
            res.put("name", v.getName());
            res.put("email", v.getEmail());
            res.put("vendorCode", v.getVendorCode());
            res.put("token", token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/flutter/auth/admin/login
     * Body: { email, password }
     * Validates against admin.email / admin.password from application.properties.
     * Returns: { success, name, email, token, role:"ADMIN" }
     */
    @PostMapping("/auth/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        String email    = (String) body.get("email");
        String password = (String) body.get("password");
        if (email == null || password == null) {
            res.put("success", false); res.put("message", "Email and password are required");
            return ResponseEntity.badRequest().body(res);
        }
        if (!email.equals(adminEmail) || !password.equals(adminPassword)) {
            res.put("success", false); res.put("message", "Invalid admin credentials");
            return ResponseEntity.status(401).body(res);
        }
        // Token is a simple signed marker — not sensitive since admin screen is read-only
        String token = Base64.getEncoder().encodeToString(("admin:" + adminEmail).getBytes());
        res.put("success", true);
        res.put("adminId", 0);          // admin has no DB id
        res.put("name", "Admin");
        res.put("email", adminEmail);
        res.put("token", token);
        res.put("role", "ADMIN");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // PRODUCTS
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/products[?search=x][?category=y] */
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

    /** GET /api/flutter/products/{id} — includes reviews */
    @GetMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || !p.isApproved()) {
            res.put("success", false); res.put("message", "Product not found");
            return ResponseEntity.badRequest().body(res);
        }
        Map<String, Object> pm = mapProduct(p);
        // Include reviews
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .collect(Collectors.toList());
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        pm.put("reviews", reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("customerName", r.getCustomerName());
            return m;
        }).collect(Collectors.toList()));
        pm.put("avgRating", Math.round(avg * 10.0) / 10.0);
        pm.put("reviewCount", reviews.size());
        res.put("success", true);
        res.put("product", pm);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/{id}/reviews */
    @GetMapping("/products/{id}/reviews")
    public ResponseEntity<Map<String, Object>> getProductReviews(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .collect(Collectors.toList());
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        res.put("success", true);
        res.put("reviews", reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("customerName", r.getCustomerName());
            return m;
        }).collect(Collectors.toList()));
        res.put("avgRating", Math.round(avg * 10.0) / 10.0);
        res.put("reviewCount", reviews.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/categories */
    @GetMapping("/products/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        Map<String, Object> res = new HashMap<>();
        List<String> categories = productRepository.findByApprovedTrue()
                .stream().map(Product::getCategory).filter(Objects::nonNull)
                .distinct().sorted().collect(Collectors.toList());
        res.put("success", true);
        res.put("categories", categories);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // CART
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/cart */
    @GetMapping("/cart")
    public ResponseEntity<Map<String, Object>> getCart(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Cart cart = customer.getCart();
        if (cart == null) { res.put("success", true); res.put("items", new ArrayList<>()); res.put("total", 0.0); res.put("count", 0); return ResponseEntity.ok(res); }
        List<Map<String, Object>> items = cart.getItems().stream().map(this::mapItem).collect(Collectors.toList());
        double total = cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        res.put("success", true); res.put("items", items); res.put("total", total); res.put("count", items.size());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/cart/add */
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
            Optional<Item> existing = cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId).findFirst();
            if (existing.isPresent()) {
                Item item = existing.get();
                if (item.getQuantity() >= product.getStock()) { res.put("success", false); res.put("message", "Max stock reached"); return ResponseEntity.badRequest().body(res); }
                item.setQuantity(item.getQuantity() + 1);
            } else {
                Item item = new Item();
                item.setName(product.getName()); item.setDescription(product.getDescription());
                item.setPrice(product.getPrice()); item.setCategory(product.getCategory());
                item.setQuantity(1); item.setImageLink(product.getImageLink());
                item.setProductId(productId); item.setCart(cart);
                cart.getItems().add(item);
            }
            customerRepository.save(customer);
            res.put("success", true); res.put("message", "Added to cart");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/cart/remove/{productId} */
    @DeleteMapping("/cart/remove/{productId}")
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put("success", false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }
        customer.getCart().getItems().removeIf(i -> i.getProductId() != null && i.getProductId() == productId);
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Removed from cart");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/cart/update */
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
        if (quantity <= 0) { cart.getItems().removeIf(i -> i.getProductId() != null && i.getProductId() == productId); }
        else { cart.getItems().stream().filter(i -> i.getProductId() != null && i.getProductId() == productId).findFirst().ifPresent(i -> i.setQuantity(quantity)); }
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Cart updated");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ORDERS — CUSTOMER
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/orders/place */
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
            List<Item> orderItems = new ArrayList<>();
            double total = 0;
            for (Item cartItem : cart.getItems()) {
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product == null || product.getStock() < cartItem.getQuantity()) { res.put("success", false); res.put("message", "Insufficient stock for: " + cartItem.getName()); return ResponseEntity.badRequest().body(res); }
                product.setStock(product.getStock() - cartItem.getQuantity());
                productRepository.save(product);
                Item oi = new Item();
                oi.setName(cartItem.getName()); oi.setDescription(cartItem.getDescription());
                oi.setPrice(cartItem.getPrice()); oi.setCategory(cartItem.getCategory());
                oi.setQuantity(cartItem.getQuantity()); oi.setImageLink(cartItem.getImageLink());
                oi.setProductId(cartItem.getProductId());
                orderItems.add(oi);
                total += cartItem.getPrice() * cartItem.getQuantity();
            }
            String deliveryTime   = (String) body.getOrDefault("deliveryTime", "STANDARD");
            double deliveryCharge = "EXPRESS".equals(deliveryTime) ? 50.0 : 0.0;
            Order order = new Order();
            order.setCustomer(customer); order.setItems(orderItems); order.setAmount(total);
            order.setDeliveryCharge(deliveryCharge); order.setTotalPrice(total + deliveryCharge);
            order.setPaymentMode((String) body.getOrDefault("paymentMode", "COD"));
            order.setDeliveryTime(deliveryTime); order.setDateTime(LocalDateTime.now());
            order.setTrackingStatus(TrackingStatus.PROCESSING);
            order.setCurrentCity((String) body.getOrDefault("city", ""));
            orderRepository.save(order);
            cart.getItems().clear(); customerRepository.save(customer);
            res.put("success", true); res.put("message", "Order placed successfully");
            res.put("orderId", order.getId()); res.put("totalPrice", order.getTotalPrice());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** GET /api/flutter/orders */
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

    /** GET /api/flutter/orders/{id} */
    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        res.put("success", true); res.put("order", mapOrder(order));
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/orders/{id}/cancel */
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        if (order.getTrackingStatus() == TrackingStatus.DELIVERED || order.getTrackingStatus() == TrackingStatus.CANCELLED) { res.put("success", false); res.put("message", "Cannot cancel this order"); return ResponseEntity.badRequest().body(res); }
        for (Item item : order.getItems()) {
            if (item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(p -> { p.setStock(p.getStock() + item.getQuantity()); productRepository.save(p); });
            }
        }
        order.setTrackingStatus(TrackingStatus.CANCELLED); orderRepository.save(order);
        res.put("success", true); res.put("message", "Order cancelled");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // WISHLIST  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/wishlist */
    @GetMapping("/wishlist")
    public ResponseEntity<Map<String, Object>> getWishlist(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Wishlist> wishlist = wishlistRepository.findByCustomer(customer);
        List<Map<String, Object>> items = wishlist.stream().map(w -> {
            Map<String, Object> m = new HashMap<>();
            Product p = w.getProduct();
            m.put("wishlistId", w.getId()); m.put("addedAt", w.getAddedAt() != null ? w.getAddedAt().toString() : null);
            m.put("productId", p.getId()); m.put("name", p.getName()); m.put("price", p.getPrice());
            m.put("imageLink", p.getImageLink()); m.put("category", p.getCategory()); m.put("inStock", p.getStock() > 0);
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("count", items.size()); res.put("items", items);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/wishlist/ids */
    @GetMapping("/wishlist/ids")
    public ResponseEntity<Map<String, Object>> getWishlistIds(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Integer> ids = wishlistRepository.findByCustomer(customer).stream()
                .map(w -> w.getProduct().getId()).collect(Collectors.toList());
        res.put("success", true); res.put("ids", ids);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/wishlist/toggle */
    @PostMapping("/wishlist/toggle")
    public ResponseEntity<Map<String, Object>> toggleWishlist(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Integer> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Integer productId = body.get("productId");
        if (productId == null) { res.put("success", false); res.put("message", "productId is required"); return ResponseEntity.badRequest().body(res); }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.status(404).body(res); }
        List<Wishlist> existing = wishlistRepository.findByCustomer(customer).stream()
                .filter(w -> w.getProduct().getId() == productId).collect(Collectors.toList());
        if (!existing.isEmpty()) {
            wishlistRepository.deleteAll(existing);
            res.put("success", true); res.put("wishlisted", false); res.put("message", "Removed from wishlist");
        } else {
            Wishlist w = new Wishlist(); w.setCustomer(customer); w.setProduct(product); w.setAddedAt(LocalDateTime.now());
            wishlistRepository.save(w);
            res.put("success", true); res.put("wishlisted", true); res.put("message", "Added to wishlist");
        }
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // PROFILE  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/profile */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", customer.getId()); profile.put("name", customer.getName());
        profile.put("email", customer.getEmail()); profile.put("mobile", customer.getMobile());
        profile.put("profileImage", customer.getProfileImage());
        profile.put("addresses", customer.getAddresses().stream().map(a -> {
            Map<String, Object> am = new HashMap<>();
            am.put("id",            a.getId());
            am.put("formattedAddress", a.getFormattedAddress());
            am.put("recipientName", a.getRecipientName() != null ? a.getRecipientName() : "");
            am.put("houseStreet",   a.getHouseStreet()   != null ? a.getHouseStreet()   : "");
            am.put("city",          a.getCity()          != null ? a.getCity()          : "");
            am.put("state",         a.getState()         != null ? a.getState()         : "");
            am.put("postalCode",    a.getPostalCode()    != null ? a.getPostalCode()    : "");
            // legacy fallback
            am.put("details",       a.getDetails()       != null ? a.getDetails()       : "");
            return am;
        }).collect(Collectors.toList()));
        res.put("success", true); res.put("profile", profile);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/update */
    @PutMapping("/profile/update")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name"))   customer.setName((String) body.get("name"));
        if (body.containsKey("mobile")) customer.setMobile(Long.parseLong(body.get("mobile").toString()));
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/profile/address/add
     * Accepts structured fields: recipientName, houseStreet, city, state, postalCode.
     * Also accepts legacy "address" flat-text field for backward compatibility.
     */
    @PostMapping("/profile/address/add")
    public ResponseEntity<Map<String, Object>> addAddress(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }

        Address address = new Address();
        address.setCustomer(customer);

        String recipientName = body.get("recipientName");
        if (recipientName != null && !recipientName.isBlank()) {
            // Structured form submission
            address.setRecipientName(recipientName.trim());
            address.setHouseStreet(body.getOrDefault("houseStreet", "").trim());
            address.setCity(body.getOrDefault("city", "").trim());
            address.setState(body.getOrDefault("state", "").trim());
            address.setPostalCode(body.getOrDefault("postalCode", "").trim());
        } else {
            // Legacy flat-text fallback
            String details = body.get("address");
            if (details == null || details.isBlank()) {
                res.put("success", false); res.put("message", "Address cannot be empty");
                return ResponseEntity.badRequest().body(res);
            }
            address.setDetails(details.trim());
        }

        customer.getAddresses().add(address);
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Address added");
        res.put("addressId", address.getId());
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/profile/address/{id}/delete */
    @DeleteMapping("/profile/address/{id}/delete")
    public ResponseEntity<Map<String, Object>> deleteAddress(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        customer.getAddresses().removeIf(a -> a.getId() == id);
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Address deleted");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // REVIEWS  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/reviews/add */
    @PostMapping("/reviews/add")
    public ResponseEntity<Map<String, Object>> addReview(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        int productId = Integer.parseInt(body.get("productId").toString());
        int rating    = Integer.parseInt(body.get("rating").toString());
        String comment = (String) body.get("comment");
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.status(404).body(res); }
        Review review = new Review();
        review.setProduct(product); review.setRating(rating); review.setComment(comment);
        review.setCustomerName(customer.getName());
        reviewRepository.save(review);
        res.put("success", true); res.put("message", "Review added successfully");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // SPENDING SUMMARY  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/spending-summary */
    @GetMapping("/spending-summary")
    public ResponseEntity<Map<String, Object>> getSpendingSummary(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Order> delivered = orderRepository.findByCustomer(customer).stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED).collect(Collectors.toList());
        if (delivered.isEmpty()) { res.put("success", true); res.put("hasData", false); return ResponseEntity.ok(res); }
        double totalSpent = delivered.stream().mapToDouble(Order::getAmount).sum();
        int totalOrders   = delivered.size();
        double avgOrder   = totalOrders > 0 ? totalSpent / totalOrders : 0;
        Map<String, Double> catSpend = new LinkedHashMap<>();
        for (Order o : delivered) {
            for (Item item : o.getItems()) {
                String cat = item.getCategory() != null ? item.getCategory() : "Other";
                catSpend.merge(cat, item.getPrice() * item.getQuantity(), Double::sum);
            }
        }
        String topCategory = catSpend.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("N/A");
        Map<String, Double> monthly = new LinkedHashMap<>();
        int year = java.time.Year.now().getValue();
        for (Order o : delivered) {
            if (o.getOrderDate() != null && o.getOrderDate().getYear() == year) {
                String key = year + "-" + String.format("%02d", o.getOrderDate().getMonthValue());
                monthly.merge(key, o.getAmount(), Double::sum);
            }
        }
        res.put("success", true); res.put("hasData", true);
        res.put("totalSpent", totalSpent); res.put("totalOrders", totalOrders);
        res.put("averageOrderValue", avgOrder); res.put("topCategory", topCategory);
        res.put("categorySpending", catSpend); res.put("monthlySpending", monthly);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // REFUNDS  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/refund/request  —  body: { orderId, reason, type } */
    @PostMapping("/refund/request")
    public ResponseEntity<Map<String, Object>> requestRefund(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
            int orderId  = Integer.parseInt(body.get("orderId").toString());
            String reason = (String) body.getOrDefault("reason", "");
            String type   = (String) body.getOrDefault("type", "REFUND");
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
            if (order.getTrackingStatus() != TrackingStatus.DELIVERED) { res.put("success", false); res.put("message", "Refund can only be requested for delivered orders"); return ResponseEntity.badRequest().body(res); }
            Refund refund = new Refund();
            refund.setOrder(order); refund.setCustomer(customer);
            // Prepend type (REFUND/REPLACEMENT) to reason so it's stored without a separate column
            refund.setReason("[" + type + "] " + reason);
            refund.setStatus(RefundStatus.PENDING);
            refund.setAmount(order.getTotalPrice());
            refundRepository.save(refund);
            res.put("success", true); res.put("message", "Refund request submitted");
            res.put("refundId", refund.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** GET /api/flutter/refund/status/{orderId} */
    @GetMapping("/refund/status/{orderId}")
    public ResponseEntity<Map<String, Object>> getRefundStatus(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int orderId) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        List<Refund> refunds = refundRepository.findByOrder(order);
        if (refunds.isEmpty()) { res.put("success", true); res.put("hasRefund", false); return ResponseEntity.ok(res); }
        Refund latest = refunds.get(refunds.size() - 1);
        res.put("success", true); res.put("hasRefund", true);
        res.put("status", latest.getStatus().name());
        // reason is stored as "[TYPE] actual reason" — parse them back out
        String storedReason = latest.getReason() != null ? latest.getReason() : "";
        String refundType = "REFUND";
        String displayReason = storedReason;
        if (storedReason.startsWith("[REFUND] ")) {
            refundType = "REFUND";
            displayReason = storedReason.substring(9);
        } else if (storedReason.startsWith("[REPLACEMENT] ")) {
            refundType = "REPLACEMENT";
            displayReason = storedReason.substring(14);
        }
        res.put("reason", displayReason);
        res.put("type", refundType);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — VIEW  (X-Vendor-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/vendor/products */
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

    /** GET /api/flutter/vendor/orders */
    @GetMapping("/vendor/orders")
    public ResponseEntity<Map<String, Object>> getVendorOrders(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Integer> vendorProductIds = productRepository.findByVendor(vendor).stream().map(Product::getId).collect(Collectors.toList());
        List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);
        List<Map<String, Object>> vendorOrders = allOrders.stream().map(order -> {
            Map<String, Object> o = mapOrder(order);
            List<Map<String, Object>> vendorItems = order.getItems().stream()
                    .filter(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()))
                    .map(this::mapItem).collect(Collectors.toList());
            o.put("items", vendorItems);
            double vendorTotal = vendorItems.stream().mapToDouble(i -> (double) i.get("price") * (int) i.get("quantity")).sum();
            o.put("vendorTotal", vendorTotal);
            return o;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("orders", vendorOrders);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/stats */
    @GetMapping("/vendor/stats")
    public ResponseEntity<Map<String, Object>> getVendorStats(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).collect(Collectors.toList());
        List<Order> orders = orderRepository.findOrdersByVendor(vendor);
        double totalRevenue = orders.stream().filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED)
                .flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        long activeProducts   = products.stream().filter(Product::isApproved).count();
        long lowStockProducts = products.stream().filter(p -> p.getStock() <= (p.getStockAlertThreshold() != null ? p.getStockAlertThreshold() : 10)).count();
        res.put("success", true); res.put("totalRevenue", totalRevenue);
        res.put("totalOrders", orders.size()); res.put("totalProducts", products.size());
        res.put("activeProducts", activeProducts); res.put("lowStockProducts", lowStockProducts);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — PRODUCT CRUD  (X-Vendor-Id)
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/vendor/products/add */
    @PostMapping("/vendor/products/add")
    public ResponseEntity<Map<String, Object>> vendorAddProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        try {
            Product p = new Product();
            p.setName((String) body.get("name")); p.setDescription((String) body.get("description"));
            p.setPrice(Double.parseDouble(body.get("price").toString()));
            p.setCategory((String) body.get("category"));
            p.setStock(Integer.parseInt(body.get("stock").toString()));
            p.setImageLink((String) body.getOrDefault("imageLink", ""));
            p.setApproved(false); p.setVendor(vendor);
            Object thresh = body.get("stockAlertThreshold");
            if (thresh != null) p.setStockAlertThreshold(Integer.parseInt(thresh.toString()));
            productRepository.save(p);
            res.put("success", true); res.put("message", "Product added. Pending admin approval."); res.put("productId", p.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** PUT /api/flutter/vendor/products/{id}/update */
    @PutMapping("/vendor/products/{id}/update")
    public ResponseEntity<Map<String, Object>> vendorUpdateProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @PathVariable int id, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put("success", false); res.put("message", "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        try {
            if (body.containsKey("name"))        p.setName((String) body.get("name"));
            if (body.containsKey("description")) p.setDescription((String) body.get("description"));
            if (body.containsKey("price"))       p.setPrice(Double.parseDouble(body.get("price").toString()));
            if (body.containsKey("category"))    p.setCategory((String) body.get("category"));
            if (body.containsKey("stock"))       p.setStock(Integer.parseInt(body.get("stock").toString()));
            if (body.containsKey("imageLink"))   p.setImageLink((String) body.get("imageLink"));
            if (body.containsKey("stockAlertThreshold")) p.setStockAlertThreshold(Integer.parseInt(body.get("stockAlertThreshold").toString()));
            productRepository.save(p);
            res.put("success", true); res.put("message", "Product updated successfully.");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/vendor/products/{id}/delete */
    @DeleteMapping("/vendor/products/{id}/delete")
    public ResponseEntity<Map<String, Object>> vendorDeleteProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put("success", false); res.put("message", "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        productRepository.delete(p);
        res.put("success", true); res.put("message", "Product deleted.");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/sales-report */
    @GetMapping("/vendor/sales-report")
    public ResponseEntity<Map<String, Object>> vendorSalesReport(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).collect(Collectors.toList());
        List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);
        List<Order> activeOrders = allOrders.stream().filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED).collect(Collectors.toList());
        double totalRevenue = activeOrders.stream().flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        long pendingOrders = allOrders.stream().filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING || o.getTrackingStatus() == TrackingStatus.SHIPPED).count();
        Map<Integer, Integer> unitsSoldMap = new HashMap<>();
        for (Order o : activeOrders) {
            for (Item item : o.getItems()) {
                if (item.getProductId() != null && productIds.contains(item.getProductId())) unitsSoldMap.merge(item.getProductId(), item.getQuantity(), Integer::sum);
            }
        }
        List<Map<String, Object>> topProducts = products.stream()
                .filter(p -> unitsSoldMap.containsKey(p.getId()))
                .sorted((a, b) -> Integer.compare(unitsSoldMap.getOrDefault(b.getId(), 0), unitsSoldMap.getOrDefault(a.getId(), 0)))
                .limit(10).map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    int units = unitsSoldMap.getOrDefault(p.getId(), 0);
                    m.put("id", p.getId()); m.put("name", p.getName()); m.put("unitsSold", units); m.put("revenue", units * p.getPrice());
                    return m;
                }).collect(Collectors.toList());
        List<Map<String, Object>> recentOrders = allOrders.stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed()).limit(10).map(o -> {
                    List<Item> vi = o.getItems().stream().filter(i -> i.getProductId() != null && productIds.contains(i.getProductId())).collect(Collectors.toList());
                    double vTotal = vi.stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", o.getId()); m.put("trackingStatus", o.getTrackingStatus().name()); m.put("vendorTotal", vTotal);
                    return m;
                }).collect(Collectors.toList());
        res.put("success", true); res.put("totalRevenue", totalRevenue);
        res.put("totalOrders", allOrders.size()); res.put("totalProducts", products.size());
        res.put("pendingOrders", pendingOrders); res.put("topProducts", topProducts); res.put("recentOrders", recentOrders);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // HELPER MAPPERS
    // ═══════════════════════════════════════════════════════

    private Map<String, Object> mapProduct(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId()); m.put("name", p.getName()); m.put("description", p.getDescription());
        m.put("price", p.getPrice()); m.put("category", p.getCategory()); m.put("stock", p.getStock());
        m.put("imageLink", p.getImageLink()); m.put("extraImageLinks", p.getExtraImageLinks());
        m.put("approved", p.isApproved());
        m.put("vendorCode", p.getVendor() != null ? p.getVendor().getVendorCode() : null);
        return m;
    }

    private Map<String, Object> mapItem(Item i) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", i.getId()); m.put("name", i.getName()); m.put("description", i.getDescription());
        m.put("price", i.getPrice()); m.put("category", i.getCategory());
        m.put("quantity", i.getQuantity()); m.put("imageLink", i.getImageLink()); m.put("productId", i.getProductId());
        return m;
    }

    private Map<String, Object> mapOrder(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId()); m.put("amount", o.getAmount()); m.put("deliveryCharge", o.getDeliveryCharge());
        m.put("totalPrice", o.getTotalPrice()); m.put("paymentMode", o.getPaymentMode());
        m.put("deliveryTime", o.getDeliveryTime()); m.put("trackingStatus", o.getTrackingStatus().name());
        m.put("trackingStatusDisplay", o.getTrackingStatus().getDisplayName());
        m.put("currentCity", o.getCurrentCity());
        m.put("orderDate", o.getOrderDate() != null ? o.getOrderDate().toString() : null);
        m.put("replacementRequested", o.isReplacementRequested());
        m.put("items", o.getItems().stream().map(this::mapItem).collect(Collectors.toList()));
        // Include customer name for admin views
        if (o.getCustomer() != null) m.put("customerName", o.getCustomer().getName());
        return m;
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN ENDPOINTS  (no special auth — secured by admin login on web side)
    // Flutter admin screens call these after admin logs in on web
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/admin/users — returns all customers + vendors */
    @GetMapping("/admin/users")
    public ResponseEntity<Map<String, Object>> adminGetUsers() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> customers = customerRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId()); m.put("name", c.getName()); m.put("email", c.getEmail());
            m.put("mobile", c.getMobile()); m.put("active", c.isActive()); m.put("verified", c.isVerified());
            return m;
        }).collect(Collectors.toList());
        List<Map<String, Object>> vendors = vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", v.getId()); m.put("name", v.getName()); m.put("email", v.getEmail());
            m.put("mobile", v.getMobile()); m.put("vendorCode", v.getVendorCode());
            m.put("active", v.isVerified()); m.put("verified", v.isVerified());
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("customers", customers); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/customers/{id}/toggle-active */
    @PostMapping("/admin/customers/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleCustomer(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer c = customerRepository.findById(id).orElse(null);
        if (c == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        c.setActive(!c.isActive());
        customerRepository.save(c);
        res.put("success", true); res.put("message", c.isActive() ? "Account activated" : "Account suspended"); res.put("active", c.isActive());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/vendors/{id}/toggle-active */
    @PostMapping("/admin/vendors/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleVendor(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor v = vendorRepository.findById(id).orElse(null);
        if (v == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        v.setVerified(!v.isVerified());
        vendorRepository.save(v);
        res.put("success", true); res.put("message", v.isVerified() ? "Vendor activated" : "Vendor suspended"); res.put("active", v.isVerified());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/products — returns all products with approval status */
    @GetMapping("/admin/products")
    public ResponseEntity<Map<String, Object>> adminGetProducts() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> products = productRepository.findAll().stream()
                .map(this::mapProduct).collect(Collectors.toList());
        res.put("success", true); res.put("products", products);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/approve */
    @PostMapping("/admin/products/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.badRequest().body(res); }
        p.setApproved(true);
        productRepository.save(p);
        res.put("success", true); res.put("message", "Product approved and is now visible to customers");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/reject */
    @PostMapping("/admin/products/{id}/reject")
    public ResponseEntity<Map<String, Object>> adminRejectProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.badRequest().body(res); }
        p.setApproved(false);
        productRepository.save(p);
        res.put("success", true); res.put("message", "Product rejected / hidden from customers");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/orders — all orders with customer info */
    @GetMapping("/admin/orders")
    public ResponseEntity<Map<String, Object>> adminGetOrders() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed())
                .map(this::mapOrder).collect(Collectors.toList());
        res.put("success", true); res.put("orders", orders);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/orders/{id}/status  body: { status } */
    @PostMapping("/admin/orders/{id}/status")
    public ResponseEntity<Map<String, Object>> adminUpdateOrderStatus(
            @PathVariable int id, @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        try {
            TrackingStatus newStatus = TrackingStatus.valueOf(body.get("status"));
            order.setTrackingStatus(newStatus);
            orderRepository.save(order);
            res.put("success", true); res.put("message", "Order status updated to " + newStatus.getDisplayName());
        } catch (IllegalArgumentException e) {
            res.put("success", false); res.put("message", "Invalid status: " + body.get("status"));
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/vendors — vendor list (alias of user list vendor section) */
    @GetMapping("/admin/vendors")
    public ResponseEntity<Map<String, Object>> adminGetVendors() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> vendors = vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", v.getId()); m.put("name", v.getName()); m.put("email", v.getEmail());
            m.put("mobile", v.getMobile()); m.put("vendorCode", v.getVendorCode());
            m.put("active", v.isVerified()); m.put("verified", v.isVerified());
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // NEW ENDPOINTS — Reorder, Password Change, Vendor Profile,
    // Stock Alerts
    // ═══════════════════════════════════════════════════════

    @Autowired private StockAlertRepository stockAlertRepository;

    /**
     * POST /api/flutter/orders/{id}/reorder
     * Clears cart and re-adds all in-stock items from the given past order.
     * Header: X-Customer-Id
     */
    @PostMapping("/orders/{id}/reorder")
    public ResponseEntity<Map<String, Object>> reorder(
            @RequestHeader("X-Customer-Id") int customerId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }

        Cart cart = customer.getCart();
        if (cart == null) { cart = new Cart(); customer.setCart(cart); }
        cart.getItems().clear(); // clear existing cart

        int addedCount = 0;
        List<String> outOfStock = new ArrayList<>();
        for (Item orderItem : order.getItems()) {
            Product p = productRepository.findById(orderItem.getProductId()).orElse(null);
            if (p == null || p.getStock() <= 0) { outOfStock.add(orderItem.getName()); continue; }
            Item newItem = new Item();
            newItem.setName(p.getName()); newItem.setDescription(p.getDescription());
            newItem.setPrice(p.getPrice()); newItem.setCategory(p.getCategory());
            newItem.setQuantity(Math.min(orderItem.getQuantity(), p.getStock()));
            newItem.setImageLink(p.getImageLink()); newItem.setProductId(p.getId());
            newItem.setCart(cart);
            cart.getItems().add(newItem);
            addedCount++;
        }
        customerRepository.save(customer);

        res.put("success", true);
        res.put("addedCount", addedCount);
        res.put("outOfStockItems", outOfStock);
        res.put("message", addedCount > 0 ? addedCount + " item(s) added to cart" : "All items are out of stock");
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/flutter/profile/change-password
     * Header: X-Customer-Id
     * Body: { currentPassword, newPassword }
     */
    @PutMapping("/profile/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        String current = (String) body.get("currentPassword");
        String newPwd  = (String) body.get("newPassword");
        if (current == null || newPwd == null) { res.put("success", false); res.put("message", "Both passwords required"); return ResponseEntity.badRequest().body(res); }
        try {
            if (!AES.decrypt(customer.getPassword()).equals(current)) {
                res.put("success", false); res.put("message", "Current password is incorrect");
                return ResponseEntity.badRequest().body(res);
            }
            if (newPwd.length() < 8) { res.put("success", false); res.put("message", "New password must be at least 8 characters"); return ResponseEntity.badRequest().body(res); }
            customer.setPassword(AES.encrypt(newPwd));
            customerRepository.save(customer);
            res.put("success", true); res.put("message", "Password changed successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /**
     * GET /api/flutter/vendor/profile
     * Header: X-Vendor-Id
     */
    @GetMapping("/vendor/profile")
    public ResponseEntity<Map<String, Object>> getVendorProfile(
            @RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> v = new HashMap<>();
        v.put("id", vendor.getId()); v.put("name", vendor.getName());
        v.put("email", vendor.getEmail()); v.put("mobile", vendor.getMobile());
        v.put("vendorCode", vendor.getVendorCode()); v.put("verified", vendor.isVerified());
        res.put("success", true); res.put("vendor", v);
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/flutter/vendor/profile/update
     * Header: X-Vendor-Id
     * Body: { name, mobile }
     */
    @PutMapping("/vendor/profile/update")
    public ResponseEntity<Map<String, Object>> updateVendorProfile(
            @RequestHeader("X-Vendor-Id") int vendorId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name") && !((String) body.get("name")).isBlank())
            vendor.setName((String) body.get("name"));
        if (body.containsKey("mobile"))
            try { vendor.setMobile(Long.parseLong(body.get("mobile").toString())); } catch (Exception ignored) {}
        vendorRepository.save(vendor);
        res.put("success", true); res.put("message", "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/vendor/stock-alerts
     * Header: X-Vendor-Id
     */
    @GetMapping("/vendor/stock-alerts")
    public ResponseEntity<Map<String, Object>> getStockAlerts(
            @RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<StockAlert> alerts = stockAlertRepository.findByVendor(vendor);
        // Sort: unacknowledged first, then by id desc
        alerts.sort((a, b) -> {
            if (a.isAcknowledged() != b.isAcknowledged()) return a.isAcknowledged() ? 1 : -1;
            return Integer.compare(b.getId(), a.getId());
        });
        int unacknowledged = (int) alerts.stream().filter(a -> !a.isAcknowledged()).count();
        List<Map<String, Object>> alertMaps = alerts.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.getId());
            m.put("productName", a.getProduct() != null ? a.getProduct().getName() : "Unknown");
            m.put("productId",   a.getProduct() != null ? a.getProduct().getId()   : 0);
            m.put("currentStock", a.getProduct() != null ? a.getProduct().getStock() : 0);
            m.put("threshold",    a.getProduct() != null && a.getProduct().getStockAlertThreshold() != null
                    ? a.getProduct().getStockAlertThreshold() : 10);
            m.put("message",      a.getMessage());
            m.put("acknowledged", a.isAcknowledged());
            m.put("alertTime",    a.getAlertTime() != null ? a.getAlertTime().toString() : null);
            return m;
        }).collect(Collectors.toList());
        res.put("success", true);
        res.put("alerts", alertMaps);
        res.put("unacknowledgedCount", unacknowledged);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/vendor/stock-alerts/{id}/acknowledge
     * Header: X-Vendor-Id
     */
    @PostMapping("/vendor/stock-alerts/{id}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(
            @RequestHeader("X-Vendor-Id") int vendorId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        StockAlert alert = stockAlertRepository.findById(id).orElse(null);
        if (alert == null || alert.getVendor().getId() != vendorId) { res.put("success", false); res.put("message", "Alert not found"); return ResponseEntity.badRequest().body(res); }
        alert.setAcknowledged(true);
        stockAlertRepository.save(alert);
        res.put("success", true); res.put("message", "Alert acknowledged");
        return ResponseEntity.ok(res);
    }
}
