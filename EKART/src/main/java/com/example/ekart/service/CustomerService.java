package com.example.ekart.service;
import com.example.ekart.dto.Address;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/service/CustomerService.java
// REPLACE your existing file with this complete version.
// Changes from original:
//   1. Added imports for Warehouse, TrackingEventLog, WarehouseRepository,
//      TrackingEventLogRepository
//   2. Added @Autowired for warehouseRepository and trackingEventLogRepository
//   3. In paymentSuccess(): saves deliveryPinCode on order, auto-assigns warehouse,
//      logs PROCESSING event into TrackingEventLog
// ================================================================

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;


import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;

import com.example.ekart.dto.Cart;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Review;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Wishlist;
import com.example.ekart.dto.Refund;
import com.example.ekart.dto.Vendor;
import com.example.ekart.dto.Warehouse;
import com.example.ekart.dto.TrackingEventLog;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.form.CustomerRegistrationForm;

import com.example.ekart.helper.AES;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.AddressRepository;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.ReviewRepository;
import com.example.ekart.repository.WishlistRepository;
import com.example.ekart.repository.RefundRepository;
import com.example.ekart.repository.WarehouseRepository;
import com.example.ekart.repository.TrackingEventLogRepository;
import com.example.ekart.helper.GstUtil;
import com.example.ekart.service.OtpService;
import com.example.ekart.reporting.ReportingService;

import jakarta.servlet.http.HttpSession;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;


@Service
@Transactional
public class CustomerService {

    // ── S1192 String constants ──
    private static final String K_CARTEMPTY                         = "cartEmpty";
    private static final String K_CARTTOTAL                         = "cartTotal";
    private static final String K_CUSTOMER                          = "customer";
    private static final String K_DELIVERYCHARGE                    = "deliveryCharge";
    private static final String K_FAILURE                           = "failure";
    private static final String K_FREEDELIVERY                      = "freeDelivery";
    private static final String K_ITEM_NOT_FOUND                    = "Item not found";
    private static final String K_MESSAGE                           = "message";
    private static final String K_ORDERS                            = "orders";
    private static final String K_PRODUCTS                          = "products";
    private static final String K_QUERY                             = "query";
    private static final String K_REDIRECT_CUSTOMER_RESET_PASSWORD  = "redirect:/customer/reset-password/";
    private static final String K_REDIRECT_VIEW_ORDERS              = "redirect:/view-orders";
    private static final String K_SESSION_EXPIRED                   = "Session expired";
    private static final String K_SUCCESS                           = "success";
    private static final String K_THIS_PRODUCT_IS_NO_LONGER_AVAILABLE = "This product is no longer available.";

    private static final Logger LOGGER = LoggerFactory.getLogger(CustomerService.class);
    
    private static final String REDIRECT_CUSTOMER_LOGIN = "redirect:/customer/login";
    private static final String REDIRECT_CUSTOMER_HOME = "redirect:/customer/home";
    private static final String REDIRECT_VIEW_CART = "redirect:/view-cart";
    private static final String LOGIN_FIRST = "Login First";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final ItemRepository itemRepository;
    private final OrderRepository orderRepository;
    private final EmailSender emailSender;
    private final ReviewRepository reviewRepository;
    private final AddressRepository addressRepository;
    private final SearchService searchService;
    private final BannerService bannerService;
    private final CategoryService categoryService;
    private final ReportingService reportingService;
    private final WishlistRepository wishlistRepository;
    private final RefundRepository refundRepository;
    private final WarehouseRepository warehouseRepository;
    private final TrackingEventLogRepository trackingEventLogRepository;
    private final OtpService otpService;

    public CustomerService(
            CustomerRepository customerRepository,
            ProductRepository productRepository,
            ItemRepository itemRepository,
            OrderRepository orderRepository,
            EmailSender emailSender,
            ReviewRepository reviewRepository,
            AddressRepository addressRepository,
            SearchService searchService,
            BannerService bannerService,
            CategoryService categoryService,
            ReportingService reportingService,
            WishlistRepository wishlistRepository,
            RefundRepository refundRepository,
            WarehouseRepository warehouseRepository,
            TrackingEventLogRepository trackingEventLogRepository,
            OtpService otpService) {
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.itemRepository = itemRepository;
        this.orderRepository = orderRepository;
        this.emailSender = emailSender;
        this.reviewRepository = reviewRepository;
        this.addressRepository = addressRepository;
        this.searchService = searchService;
        this.bannerService = bannerService;
        this.categoryService = categoryService;
        this.reportingService = reportingService;
        this.wishlistRepository = wishlistRepository;
        this.refundRepository = refundRepository;
        this.warehouseRepository = warehouseRepository;
        this.trackingEventLogRepository = trackingEventLogRepository;
        this.otpService = otpService;
    }















    // ── NEW: for delivery system ──────────────────────────────────

    // ─────────────────────────────────────────────────────────────

    /** Razorpay publishable key — injected from application.properties: razorpay.key.id */
    @org.springframework.beans.factory.annotation.Value("${razorpay.key.id:}")
    private String razorpayKeyId;

    // ---------------- REGISTER ----------------
    public String loadRegistration(ModelMap map, CustomerRegistrationForm form) {
        map.put(K_CUSTOMER, form);
        return "customer-register.html";
    }

    public String registration(CustomerRegistrationForm form, BindingResult result, HttpSession session) {
        Customer customer = new Customer();
        customer.setName(form.getName());
        customer.setEmail(form.getEmail());
        customer.setMobile(form.getMobile());
        customer.setPassword(form.getPassword());
        customer.setConfirmPassword(form.getConfirmPassword());

        if (!customer.getPassword().equals(customer.getConfirmPassword()))
            result.rejectValue("confirmPassword", "error.confirmPassword",
                    "* Password and Confirm Password Should Match");

        // Allow re-registration if email exists but NOT verified
        Customer existing = customerRepository.findByEmail(customer.getEmail());
        if (existing != null && existing.isVerified())
            result.rejectValue("email", "error.email", "* Email Already Exists. Please login instead.");

        if (customerRepository.existsByMobile(customer.getMobile()))
            result.rejectValue("mobile", "error.mobile", "* Mobile Number Already Exists");

        if (result.hasErrors())
            return "customer-register.html";

        customer.setPassword(AES.encrypt(customer.getPassword()));
        customerRepository.save(customer);

        String plainOtp = otpService.generateAndStoreOtp(customer.getEmail(), OtpService.PURPOSE_CUSTOMER_REGISTER);

        try {
            emailSender.send(customer, plainOtp);
        } catch (Exception e) {
            LOGGER.error("Customer OTP email failed: {}", e.getMessage(), e);
        }

        session.setAttribute(K_SUCCESS, "OTP Sent Successfully to your email");
        return "redirect:/customer/otp/" + customer.getId();
    }

    public String verifyOtp(int id, int otp, HttpSession session) {
        Customer customer = customerRepository.findById(id).orElseThrow();

        OtpService.VerificationResult result = otpService.verifyOtp(
                customer.getEmail(), String.format("%06d", otp), OtpService.PURPOSE_CUSTOMER_REGISTER);

        if (result.success) {
            customer.setVerified(true);
            customerRepository.save(customer);
            session.setAttribute(K_SUCCESS, "Account verified! Please log in.");
            return REDIRECT_CUSTOMER_LOGIN;
        }

        session.setAttribute(K_FAILURE, "OTP Mismatch");
        return "redirect:/customer/otp/" + customer.getId();
    }

    // ---------------- LOGIN ----------------
    public String login(String email, String password, HttpSession session) {

        Customer customer = customerRepository.findByEmail(email);

        if (customer == null) {
            session.setAttribute(K_FAILURE, "Invalid Email");
            return REDIRECT_CUSTOMER_LOGIN;
        }

        if (!AES.decrypt(customer.getPassword()).equals(password)) {
            session.setAttribute(K_FAILURE, "Invalid Password");
            return REDIRECT_CUSTOMER_LOGIN;
        }

        if (!customer.isVerified()) {
            session.setAttribute(K_FAILURE, "Verify Email First");
            return REDIRECT_CUSTOMER_LOGIN;
        }

        if (!customer.isActive()) {
            session.setAttribute(K_FAILURE, "Your account has been suspended.");
            return REDIRECT_CUSTOMER_LOGIN;
        }

        if (customer.getCart() == null) {
            Cart cart = new Cart();
            cart.setItems(new ArrayList<>());
            customer.setCart(cart);
        }

        customer.setLastLogin(LocalDateTime.now());
        customerRepository.save(customer);

        session.removeAttribute("guest");
        session.setAttribute(K_CUSTOMER, customer);
        session.setAttribute(K_SUCCESS, "Login Successful");
        return REDIRECT_CUSTOMER_HOME;
    }

    public String loadForgotPasswordPage() {
        return "customer-forgot-password.html";
    }

    public String sendResetOtp(String email, HttpSession session) {
        Customer customer = customerRepository.findByEmail(email);
        if (customer == null) {
            session.setAttribute(K_FAILURE, "No account found with this email");
            return "redirect:/customer/forgot-password";
        }

        String plainOtp = otpService.generateAndStoreOtp(customer.getEmail(), OtpService.PURPOSE_PASSWORD_RESET);
        emailSender.send(customer, plainOtp);

        session.setAttribute(K_SUCCESS, "OTP sent to your registered email");
        return K_REDIRECT_CUSTOMER_RESET_PASSWORD + customer.getId();
    }

    public String loadResetPasswordPage(int id, ModelMap map) {
        map.put("id", id);
        return "customer-reset-password.html";
    }

    public String resetPassword(int id, int otp, String newCredential, String credentialConfirm, HttpSession session) {
        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) {
            session.setAttribute(K_FAILURE, "Invalid reset request");
            return "redirect:/customer/forgot-password";
        }

        OtpService.VerificationResult otpResult = otpService.verifyOtp(
                customer.getEmail(), String.format("%06d", otp), OtpService.PURPOSE_PASSWORD_RESET);
        if (!otpResult.success) {
            session.setAttribute(K_FAILURE, "Invalid OTP");
            return K_REDIRECT_CUSTOMER_RESET_PASSWORD + id;
        }

        if (newCredential == null || credentialConfirm == null || !newCredential.equals(credentialConfirm)) {
            session.setAttribute(K_FAILURE, "Password and Confirm Password should match");
            return K_REDIRECT_CUSTOMER_RESET_PASSWORD + id;
        }

        String credentialStrengthRegex = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
        if (!newCredential.matches(credentialStrengthRegex)) {
            session.setAttribute(K_FAILURE,
                    "Password must have 8+ characters with uppercase, lowercase, number and special character");
            return K_REDIRECT_CUSTOMER_RESET_PASSWORD + id;
        }

        customer.setPassword(AES.encrypt(newCredential));
        customerRepository.save(customer);

        session.setAttribute(K_SUCCESS, "Password reset successful. Please login");
        return REDIRECT_CUSTOMER_LOGIN;
    }

    public String loadCustomerHome(HttpSession session, org.springframework.ui.ModelMap map) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);
        int cartCount = 0;
        if (customer.getCart() != null && customer.getCart().getItems() != null) {
            cartCount = customer.getCart().getItems().size();
        }
        map.put("cartCount", cartCount);

        List<Product> products = productRepository.findByApprovedTrue();
        map.put(K_PRODUCTS, products);

        java.util.Map<String, Long> subCatCounts = new java.util.LinkedHashMap<>();
        for (Product p : products) {
            if (p.getCategory() != null && !p.getCategory().isBlank()) {
                String cat = p.getCategory().trim();
                subCatCounts.put(cat, subCatCounts.getOrDefault(cat, 0L) + 1L);
            }
        }

        java.util.List<com.example.ekart.dto.Category> parentCategories = categoryService.getParentCategories();
        map.put("parentCategories", parentCategories);
        map.put("subCatCounts", subCatCounts);
        map.put("allSubCategories", categoryService.getAllSubCategories());
        map.put("banners", bannerService.getCustomerHomeBanners());

        return "customer-home.html";
    }

    // ---------------- PRODUCT DETAIL ----------------
    public String viewProductDetail(int id, HttpSession session, ModelMap map) {
        boolean isGuest = session.getAttribute(K_CUSTOMER) == null
                       && session.getAttribute("vendor") == null;
        map.put("isGuestView", isGuest);

        Product product = productRepository.findById(id).orElse(null);
        if (product == null || !product.isApproved()) {
            if (!isGuest) session.setAttribute(K_FAILURE, "Product not found");
            return isGuest ? "redirect:/" : REDIRECT_CUSTOMER_HOME;
        }

        List<Product> similar = productRepository.findByCategoryAndApprovedTrue(product.getCategory())
                .stream()
                .filter(p -> p.getId() != product.getId())
                .toList();

        map.put("product", product);
        map.put("similar", similar);
        return "product-detail.html";
    }

    // ---------------- VIEW PRODUCTS ----------------
    public String viewProducts(HttpSession session, ModelMap map) {

        if (session.getAttribute(K_CUSTOMER) == null)
            return REDIRECT_CUSTOMER_LOGIN;

        List<Product> products = productRepository.findByApprovedTrue();

        if (products.isEmpty()) {
            session.setAttribute(K_FAILURE, "No Products Available");
            return REDIRECT_CUSTOMER_HOME;
        }

        map.put(K_PRODUCTS, products);
        return "customer-view-products.html";
    }

    public String viewProductsByCategory(String cat, HttpSession session, ModelMap map) {
        List<Product> products;
        if (cat != null && !cat.isBlank()) {
            products = productRepository.findByCategoryContainingIgnoreCase(cat);
            map.put("selectedCategory", cat);
        } else {
            products = productRepository.findByApprovedTrue();
        }
        map.put(K_PRODUCTS, products);

        if (session.getAttribute(K_CUSTOMER) != null) {
            return "customer-view-products.html";
        }
        return "guest-browse.html";
    }

    // ---------------- SEARCH ----------------
    public String searchProducts() {
        return "search.html";
    }

    public String search(String query, ModelMap map) {
        HashSet<Product> products = new HashSet<>();
        products.addAll(productRepository.findByNameContainingIgnoreCase(query));
        products.addAll(productRepository.findByDescriptionContainingIgnoreCase(query));
        products.addAll(productRepository.findByCategoryContainingIgnoreCase(query));

        if (products.isEmpty()) {
            String corrected = searchService.findFuzzyMatch(query);
            if (corrected != null && !corrected.equalsIgnoreCase(query)) {
                products.addAll(productRepository.findByNameContainingIgnoreCase(corrected));
                products.addAll(productRepository.findByDescriptionContainingIgnoreCase(corrected));
                products.addAll(productRepository.findByCategoryContainingIgnoreCase(corrected));
                map.put("correctedQuery", corrected);
                map.put("originalQuery", query);
                map.put(K_QUERY, corrected);
            } else {
                map.put(K_QUERY, query);
            }
        } else {
            map.put(K_QUERY, query);
        }

        map.put(K_PRODUCTS, products);
        return "search.html";
    }

    // ---------------- ADD TO CART ----------------
    public String addToCart(int id, HttpSession session) {

        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);

        if (sessionCustomer == null) {
            session.setAttribute(K_FAILURE, "Session Expired, Login Again");
            return REDIRECT_CUSTOMER_LOGIN;
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        Product product = productRepository.findById(id).orElseThrow();

        Cart cart = customer.getCart();
        if (cart.getItems() == null)
            cart.setItems(new ArrayList<>());

        boolean exists = cart.getItems()
                .stream()
                .anyMatch(i -> i.getName().equals(product.getName()));

        if (exists) {
            session.setAttribute(K_FAILURE, "Product already in cart");
            return REDIRECT_CUSTOMER_HOME;
        }

        if (product.getStock() <= 0) {
            session.setAttribute(K_FAILURE, "Sorry, this product is out of stock.");
            return REDIRECT_CUSTOMER_HOME;
        }

        Item item = new Item();
        item.setName(product.getName());
        item.setCategory(product.getCategory());
        item.setDescription(product.getDescription());
        item.setImageLink(product.getImageLink());
        item.setUnitPrice(product.getPrice());
        item.setPrice(product.getPrice());
        item.setQuantity(1);
        item.setProductId(product.getId());

        item.setCart(cart);
        cart.getItems().add(item);

        product.setStock(product.getStock() - 1);

        itemRepository.save(item);
        productRepository.save(product);
        customerRepository.save(customer);

        session.setAttribute(K_SUCCESS, "Added to cart");
        return REDIRECT_CUSTOMER_HOME;
    }

    // ---------------- VIEW CART ----------------
    public String viewCart(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }

        customer = customerRepository.findById(customer.getId()).orElseThrow();
        List<Item> items = customer.getCart().getItems();

        double totalPrice = 0;
        if (items != null) {
            for (Item item : items) {
                totalPrice += item.getLineTotal() > 0 ? item.getLineTotal() : item.getPrice();
            }
        }

        map.put("items", items);
        map.put("totalPrice", totalPrice);

        return "view-cart.html";
    }

    // ---------------- INCREASE QUANTITY ----------------
    public void increase(int id, HttpSession session) {
        Item item = itemRepository.findById(id).orElseThrow();

        if (item.getProductId() == null) {
            session.setAttribute(K_FAILURE, K_THIS_PRODUCT_IS_NO_LONGER_AVAILABLE);
            return;
        }
        Product product = productRepository.findById(item.getProductId()).orElse(null);
        if (product == null) {
            session.setAttribute(K_FAILURE, K_THIS_PRODUCT_IS_NO_LONGER_AVAILABLE);
            return;
        }

        if (product.getStock() <= 0) {
            session.setAttribute(K_FAILURE, "No more stock available for this product.");
            return;
        }

        int newQty = item.getQuantity() + 1;
        item.setQuantity(newQty);
        double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : product.getPrice();
        item.setUnitPrice(unitPrice);
        item.setPrice(unitPrice * newQty);
        product.setStock(product.getStock() - 1);

        itemRepository.save(item);
        productRepository.save(product);
    }

    // ---------------- DECREASE QUANTITY ----------------
    public void decrease(int id, HttpSession session) {
        Item item = itemRepository.findById(id).orElseThrow();

        Product product = null;
        if (item.getProductId() != null) {
            product = productRepository.findById(item.getProductId()).orElse(null);
        }

        if (product == null) {
            item.getCart().getItems().removeIf(i -> i.getId() == item.getId());
            itemRepository.delete(item);
            session.setAttribute(K_FAILURE, K_THIS_PRODUCT_IS_NO_LONGER_AVAILABLE);
            return;
        }

        if (item.getQuantity() > 1) {
            int newQty = item.getQuantity() - 1;
            item.setQuantity(newQty);
            double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : product.getPrice();
            item.setUnitPrice(unitPrice);
            item.setPrice(unitPrice * newQty);
            itemRepository.save(item);
        } else {
            item.getCart().getItems().removeIf(i -> i.getId() == item.getId());
            itemRepository.delete(item);
        }

        product.setStock(product.getStock() + 1);
        productRepository.save(product);
    }

    // ---------------- REMOVE FROM CART ----------------
    @Transactional
    public String removeFromCart(int id, HttpSession session) {
        Item item = itemRepository.findById(id).orElseThrow();

        if (item.getProductId() != null) {
            productRepository.findById(item.getProductId()).ifPresent(product -> {
                product.setStock(product.getStock() + item.getQuantity());
                productRepository.save(product);
            });
        }

        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        customer.getCart().getItems().removeIf(i -> i.getId() == id);
        customerRepository.save(customer);
        itemRepository.deleteById(id);

        session.setAttribute(K_SUCCESS, "Item Removed from Cart");
        return REDIRECT_VIEW_CART;
    }

    // ── AJAX: increase ────────────────────────────────────────────
    public java.util.Map<String, Object> ajaxIncrease(int id, HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            res.put(K_SUCCESS, false); res.put(K_MESSAGE, K_SESSION_EXPIRED); return res;
        }
        Item item = itemRepository.findById(id).orElse(null);
        if (item == null) { res.put(K_SUCCESS, false); res.put(K_MESSAGE, K_ITEM_NOT_FOUND); return res; }
        if (item.getProductId() == null) { res.put(K_SUCCESS, false); res.put(K_MESSAGE, "Product unavailable"); return res; }
        Product product = productRepository.findById(item.getProductId()).orElse(null);
        if (product == null) { res.put(K_SUCCESS, false); res.put(K_MESSAGE, "Product no longer available"); return res; }
        if (product.getStock() <= 0) { res.put(K_SUCCESS, false); res.put(K_MESSAGE, "No more stock available"); return res; }

        int newQty = item.getQuantity() + 1;
        double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : product.getPrice();
        item.setUnitPrice(unitPrice);
        item.setQuantity(newQty);
        item.setPrice(unitPrice * newQty);
        product.setStock(product.getStock() - 1);
        itemRepository.save(item);
        productRepository.save(product);

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        double cartTotal = customer.getCart().getItems().stream()
            .mapToDouble(i -> i.getUnitPrice() > 0 ? i.getLineTotal() : i.getPrice())
            .sum();

        res.put(K_SUCCESS, true);
        res.put("quantity", newQty);
        res.put("lineTotal", unitPrice * newQty);
        res.put("unitPrice", unitPrice);
        res.put(K_CARTTOTAL, cartTotal);
        res.put(K_FREEDELIVERY, cartTotal >= 500);
        res.put(K_DELIVERYCHARGE, cartTotal >= 500 ? 0 : 40);
        res.put(K_CARTEMPTY, false);
        return res;
    }

    // ── AJAX: decrease ────────────────────────────────────────────
    // FIX (java:S3776 issue 200): ajaxDecrease CC reduced from 22 to ≤15 by
    //   extracting removeItemWhenQtyOne() and decreaseItemQty() private helpers.
    public java.util.Map<String, Object> ajaxDecrease(int id, HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            res.put(K_SUCCESS, false); res.put(K_MESSAGE, K_SESSION_EXPIRED); return res;
        }
        Item item = itemRepository.findById(id).orElse(null);
        if (item == null) { res.put(K_SUCCESS, false); res.put(K_MESSAGE, K_ITEM_NOT_FOUND); return res; }

        Product product = item.getProductId() != null
            ? productRepository.findById(item.getProductId()).orElse(null) : null;

        boolean removed;
        if (item.getQuantity() <= 1) {
            removeItemWhenQtyOne(id, sessionCustomer, product);
            removed = true;
        } else {
            decreaseItemQty(item, product);
            removed = false;
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        double cartTotal = customer.getCart().getItems().stream()
            .mapToDouble(i -> i.getUnitPrice() > 0 ? i.getLineTotal() : i.getPrice())
            .sum();

        res.put(K_SUCCESS, true);
        res.put("removed", removed);
        if (!removed) {
            res.put("quantity", item.getQuantity());
            res.put("lineTotal", item.getPrice());
            res.put("unitPrice", item.getUnitPrice());
        }
        res.put(K_CARTTOTAL, cartTotal);
        res.put(K_FREEDELIVERY, cartTotal >= 500);
        res.put(K_DELIVERYCHARGE, cartTotal >= 500 ? 0 : 40);
        res.put(K_CARTEMPTY, customer.getCart().getItems().isEmpty());
        return res;
    }

    /** Removes the item from the cart and restores stock when qty would drop to 0. */
    private void removeItemWhenQtyOne(int id, Customer sessionCustomer, Product product) {
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        customer.getCart().getItems().removeIf(i -> i.getId() == id);
        customerRepository.save(customer);
        itemRepository.deleteById(id);
        if (product != null) {
            product.setStock(product.getStock() + 1);
            productRepository.save(product);
        }
    }

    /** Decrements the item quantity by 1 and restores one unit of stock. */
    private void decreaseItemQty(Item item, Product product) {
        int newQty = item.getQuantity() - 1;
        double fallbackPrice = (product != null) ? product.getPrice() : item.getPrice();
        double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : fallbackPrice;
        item.setUnitPrice(unitPrice);
        item.setQuantity(newQty);
        item.setPrice(unitPrice * newQty);
        itemRepository.save(item);
        if (product != null) {
            product.setStock(product.getStock() + 1);
            productRepository.save(product);
        }
    }

    // ── AJAX: remove ──────────────────────────────────────────────
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Object> ajaxRemove(int id, HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            res.put(K_SUCCESS, false); res.put(K_MESSAGE, K_SESSION_EXPIRED); return res;
        }
        Item item = itemRepository.findById(id).orElse(null);
        if (item == null) { res.put(K_SUCCESS, false); res.put(K_MESSAGE, K_ITEM_NOT_FOUND); return res; }

        if (item.getProductId() != null) {
            productRepository.findById(item.getProductId()).ifPresent(p -> {
                p.setStock(p.getStock() + item.getQuantity());
                productRepository.save(p);
            });
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        customer.getCart().getItems().removeIf(i -> i.getId() == id);
        customerRepository.save(customer);
        itemRepository.deleteById(id);

        double cartTotal = customer.getCart().getItems().stream()
            .mapToDouble(i -> i.getUnitPrice() > 0 ? i.getLineTotal() : i.getPrice())
            .sum();

        res.put(K_SUCCESS, true);
        res.put(K_CARTTOTAL, cartTotal);
        res.put(K_FREEDELIVERY, cartTotal >= 500);
        res.put(K_DELIVERYCHARGE, cartTotal >= 500 ? 0 : 40);
        res.put(K_CARTEMPTY, customer.getCart().getItems().isEmpty());
        return res;
    }

    // ---------------- PAYMENT PAGE ----------------
    // FIX (java:S3776 issue 171): payment() CC reduced from 22 to ≤15 by
    //   extracting buildCartSummary() and buildRecommendations() private helpers.
    public String payment(HttpSession session, ModelMap map) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        List<Item> items = customer.getCart().getItems();

        if (items == null || items.isEmpty()) {
            session.setAttribute(K_FAILURE, "Your cart is empty! Add products before paying.");
            return REDIRECT_VIEW_CART;
        }

        // ── Summarise cart ────────────────────────────────────────
        double[] cartSummary = buildCartSummary(items);
        double cartTotal = cartSummary[0];
        java.util.LinkedHashSet<String> categorySet = buildCategorySet(items);

        // ── Recommendations ───────────────────────────────────────
        java.util.Set<String> cartItemNames = new java.util.HashSet<>();
        for (Item item : items) cartItemNames.add(item.getName());
        java.util.List<Product> recommendations = buildRecommendations(categorySet, cartItemNames);

        String categoryLabel  = String.join(" & ", categorySet);
        double deliveryCharge = (cartTotal >= 500) ? 0 : 40;
        double finalAmount    = cartTotal + deliveryCharge;

        map.put(K_CARTTOTAL,             cartTotal);
        map.put(K_DELIVERYCHARGE,        deliveryCharge);
        map.put("amount",                finalAmount);
        map.put(K_CUSTOMER,              customer);
        map.put("cartItems",             items);
        map.put("recommendedProducts",   recommendations);
        map.put("cartItemCategory",      categoryLabel);
        map.put("razorpayKeyId",         razorpayKeyId != null ? razorpayKeyId : "");

        // ── GST breakdown ─────────────────────────────────────────
        double gstAmount   = GstUtil.calculateTotalGst(items);
        double taxableBase = Math.round((cartTotal - gstAmount) * 100.0) / 100.0;
        String gstLabel    = GstUtil.getMixedGstLabel(items);
        map.put("gstAmount",   gstAmount);
        map.put("taxableBase", taxableBase);
        map.put("gstLabel",    gstLabel);

        return "payment.html";
    }

    /** Sums item prices and returns [cartTotal] in a single-element array. */
    private double[] buildCartSummary(List<Item> items) {
        double total = 0;
        for (Item item : items) total += item.getPrice();
        return new double[]{ total };
    }

    /** Collects non-blank categories from cart items in insertion order. */
    private java.util.LinkedHashSet<String> buildCategorySet(List<Item> items) {
        java.util.LinkedHashSet<String> cats = new java.util.LinkedHashSet<>();
        for (Item item : items) {
            if (item.getCategory() != null && !item.getCategory().isBlank()) {
                cats.add(item.getCategory());
            }
        }
        return cats;
    }

    /** Returns up to 4 approved products from {@code categorySet} not already in the cart. */
    private java.util.List<Product> buildRecommendations(
            java.util.Set<String> categorySet, java.util.Set<String> cartItemNames) {
        java.util.List<Product> recs = new java.util.ArrayList<>();
        for (String cat : categorySet) {
            List<Product> catProducts = productRepository.findByCategoryAndApprovedTrue(cat);
            for (Product p : catProducts) {
                if (!cartItemNames.contains(p.getName())
                        && recs.stream().noneMatch(r -> r.getId() == p.getId())) {
                    recs.add(p);
                    if (recs.size() >= 4) return recs;
                }
            }
            if (recs.size() >= 4) return recs;
        }
        return recs;
    }

    // ---------------- PAYMENT SUCCESS ----------------

    // ================== PAYMENT SUCCESS — SPLIT BY VENDOR ==================
    //
    // When a customer checks out:
    //   1. Group cart items by vendor (via productId → Product → Vendor)
    //   2. Create one sub-order per vendor group
    //   3. All sub-orders share the same parentOrderId
    //   4. Single-vendor cart → one order with parentOrderId = null (legacy behaviour)
    //
    // FIX (java:S3776 issue 172): paymentSuccess CC reduced from 18 to ≤15 by
    //   extracting createVendorSubOrders() and updateSessionAfterOrder() helpers.
    @Transactional
    public String paymentSuccess(Order baseOrder, String deliveryPinCode, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();

        // ── 1. PIN CODE VALIDATION ───────────────────────────────
        String pinValidationError = validatePinCode(customer, deliveryPinCode);
        if (pinValidationError != null) {
            session.setAttribute(K_FAILURE, pinValidationError);
            return "redirect:/payment";
        }

        // ── 2. BUILD ADDRESS SNAPSHOT ────────────────────────────
        String addressSnapshot = buildAddressSnapshot(customer);

        // ── 3. GROUP CART ITEMS BY VENDOR ────────────────────────
        java.util.Map<Integer, java.util.List<Item>> vendorItems = new java.util.LinkedHashMap<>();
        java.util.Map<Integer, Vendor>               vendorMap   = new java.util.LinkedHashMap<>();
        groupCartItemsByVendor(customer, vendorItems, vendorMap);

        // ── 4. CALCULATE OVERALL SUBTOTAL (for delivery charge) ──
        double subtotal    = customer.getCart().getItems().stream().mapToDouble(Item::getPrice).sum();
        double deliveryFee = (subtotal < 500) ? 40.0 : 0.0;

        // ── 5. FIND WAREHOUSE FOR THIS PIN ───────────────────────
        Warehouse matchedWarehouse = findWarehouseForPin(deliveryPinCode);

        // ── 6. CREATE ONE SUB-ORDER PER VENDOR ──────────────────
        VendorOrderResult result = createVendorSubOrders(
                baseOrder, customer, vendorItems, vendorMap,
                new VendorOrderContext(deliveryFee, deliveryPinCode, matchedWarehouse, addressSnapshot));

        // ── 7. SEND CONFIRMATION EMAIL ───────────────────────────
        sendOrderConfirmationEmail(customer, baseOrder, result.firstOrder, result.subOrderIds, subtotal, deliveryFee);

        // ── 8. CLEAR CART ────────────────────────────────────────
        java.util.List<Item> cartItems = new java.util.ArrayList<>(customer.getCart().getItems());
        customer.getCart().getItems().clear();
        customerRepository.save(customer);
        itemRepository.deleteAll(cartItems);
        itemRepository.flush();

        // ── 9. UPDATE SESSION ────────────────────────────────────
        updateSessionAfterOrder(session, customer, baseOrder, result, subtotal, deliveryFee);

        session.setAttribute(K_SUCCESS, "Order Placed Successfully!");
        return "redirect:/order-success";
    }

    /** Value object carrying the results of vendor sub-order creation. */
    private static class VendorOrderResult {
        Order firstOrder;
        java.util.List<Integer> subOrderIds = new java.util.ArrayList<>();
    }

    /**
     * Creates one sub-order per vendor group, links them via parentOrderId,
     * logs a PROCESSING tracking event, and schedules the reporting callback.
     * Groups delivery-related fields to keep createVendorSubOrders within S107 limits.
     */
    private record VendorOrderContext(double deliveryFee, String deliveryPinCode,
                                      Warehouse matchedWarehouse, String addressSnapshot) {}

    private VendorOrderResult createVendorSubOrders(
            Order baseOrder, Customer customer,
            java.util.Map<Integer, java.util.List<Item>> vendorItems,
            java.util.Map<Integer, Vendor> vendorMap,
            VendorOrderContext ctx) {
        double deliveryFee = ctx.deliveryFee();
        String deliveryPinCode = ctx.deliveryPinCode();
        Warehouse matchedWarehouse = ctx.matchedWarehouse();
        String addressSnapshot = ctx.addressSnapshot();

        VendorOrderResult result  = new VendorOrderResult();
        boolean multiVendor       = vendorItems.size() > 1;
        Integer parentId          = null;

        for (java.util.Map.Entry<Integer, java.util.List<Item>> entry : vendorItems.entrySet()) {
            Vendor vendor      = vendorMap.get(entry.getKey());
            double subTotal    = entry.getValue().stream().mapToDouble(Item::getPrice).sum();
            double subDelivery = (result.firstOrder == null) ? deliveryFee : 0.0;

            Order subOrder = buildSubOrder(new SubOrderParams(
                    baseOrder, customer, vendor,
                    entry.getValue(), subTotal, subDelivery,
                    deliveryPinCode, matchedWarehouse, addressSnapshot));

            orderRepository.save(subOrder);
            orderRepository.flush();

            parentId = linkSubOrderToParent(result, subOrder, multiVendor, parentId);

            String whCity = matchedWarehouse != null ? matchedWarehouse.getCity() : "Processing Center";
            subOrder.setCurrentCity(whCity);
            orderRepository.save(subOrder);

            saveInitialTrackingEvent(subOrder, whCity, vendor);

            result.subOrderIds.add(subOrder.getId());
            scheduleReportingAfterCommit(subOrder);
        }
        return result;
    }

    private Integer linkSubOrderToParent(VendorOrderResult result, Order subOrder,
                                         boolean multiVendor, Integer parentId) {
        if (result.firstOrder == null) {
            result.firstOrder = subOrder;
            if (multiVendor) {
                int newParentId = subOrder.getId();
                subOrder.setParentOrderId(newParentId);
                orderRepository.save(subOrder);
                return newParentId;
            }
        } else {
            subOrder.setParentOrderId(parentId);
            orderRepository.save(subOrder);
        }
        return parentId;
    }

    private void saveInitialTrackingEvent(Order subOrder, String whCity, Vendor vendor) {
        String note = "Order placed successfully. Payment confirmed."
                + (vendor != null ? " Vendor: " + vendor.getName() : "");
        trackingEventLogRepository.save(new TrackingEventLog(
                subOrder, TrackingStatus.PROCESSING, whCity, note, "system"));
    }

    private void scheduleReportingAfterCommit(Order subOrder) {
        final Order finalSubOrder = subOrder;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    Order saved = orderRepository.findById(finalSubOrder.getId()).orElse(finalSubOrder);
                    reportingService.recordOrder(saved);
                } catch (Exception e) {
                    LOGGER.error("recordOrder failed: {}", e.getMessage(), e);
                }
            }
        });
    }

    /** Writes all order-related attributes into the HTTP session after a successful checkout. */
    private void updateSessionAfterOrder(
            HttpSession session, Customer customer,
            Order baseOrder, VendorOrderResult result,
            double subtotal, double deliveryFee) {

        Customer updatedCustomer = customerRepository.findById(customer.getId()).orElseThrow();
        session.setAttribute(K_CUSTOMER, updatedCustomer);

        String subOrderIdsStr = result.subOrderIds.stream()
                .map(String::valueOf)
                .reduce((a, b) -> a + "," + b)
                .orElse(String.valueOf(result.firstOrder.getId()));

        session.setAttribute("lastOrderId",          result.firstOrder.getId());
        session.setAttribute("lastSubOrderIds",       subOrderIdsStr);
        session.setAttribute("lastOrderAmount",       subtotal + deliveryFee);
        session.setAttribute("lastOrderDeliveryTime", baseOrder.getDeliveryTime());
        session.setAttribute("lastOrderPaymentMode",
                baseOrder.getPaymentMode() != null ? baseOrder.getPaymentMode() : "Cash on Delivery");

        double totalSessionGst = result.subOrderIds.stream()
                .mapToDouble(sid -> {
                    try {
                        return orderRepository.findById(sid)
                                .map(com.example.ekart.dto.Order::getGstAmount).orElse(0.0);
                    } catch (Exception e) { return 0.0; }
                }).sum();
        session.setAttribute("lastOrderGst", Math.round(totalSessionGst * 100.0) / 100.0);
    }

    // ── paymentSuccess helpers (S6541 extraction) ────────────────────────────

    /** Returns an error message if a cart item cannot be delivered, null otherwise. */
    private String validatePinCode(Customer customer, String deliveryPinCode) {
        if (deliveryPinCode != null && !deliveryPinCode.isBlank()) {
            return checkPinDeliverability(customer, deliveryPinCode.trim());
        }
        return checkPinRestrictions(customer);
    }

    /** Returns an error if any cart product cannot be delivered to the given pin, null otherwise. */
    private String checkPinDeliverability(Customer customer, String pin) {
        for (Item cartItem : customer.getCart().getItems()) {
            if (cartItem.getProductId() == null) continue;
            Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
            if (product != null && !product.isDeliverableTo(pin)) {
                return "\"" + product.getName() + "\" cannot be delivered to pin code " + pin +
                       ". Please remove it from your cart or try a different pin code.";
            }
        }
        return null;
    }

    /** Returns an error if any cart product has pin-code restrictions and no pin was provided, null otherwise. */
    private String checkPinRestrictions(Customer customer) {
        for (Item cartItem : customer.getCart().getItems()) {
            if (cartItem.getProductId() == null) continue;
            Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
            if (product != null && product.isRestrictedByPinCode()) {
                return "\"" + product.getName() + "\" has delivery restrictions. " +
                       "Please verify your pin code on the payment page before placing the order.";
            }
        }
        return null;
    }

    /** Builds a formatted address snapshot string from the customer's latest saved address. */
    private String buildAddressSnapshot(Customer customer) {
        if (customer.getAddresses() == null || customer.getAddresses().isEmpty()) return null;
        Address addr = customer.getAddresses().get(customer.getAddresses().size() - 1);
        StringBuilder sb = new StringBuilder();
        if (addr.getRecipientName() != null && !addr.getRecipientName().isBlank())
            sb.append(addr.getRecipientName()).append(" | ");
        if (addr.getHouseStreet() != null && !addr.getHouseStreet().isBlank())
            sb.append(addr.getHouseStreet()).append(", ");
        if (addr.getCity() != null && !addr.getCity().isBlank())
            sb.append(addr.getCity());
        if (addr.getState() != null && !addr.getState().isBlank())
            sb.append(", ").append(addr.getState());
        if (addr.getPostalCode() != null && !addr.getPostalCode().isBlank())
            sb.append(" - ").append(addr.getPostalCode());
        String snap = sb.toString().trim().replaceAll("[,\\s]+$", "");
        return snap.isEmpty() ? null : snap;
    }

    /** Groups the customer's cart items by vendor into the provided maps. */
    private void groupCartItemsByVendor(Customer customer,
            java.util.Map<Integer, java.util.List<Item>> vendorItems,
            java.util.Map<Integer, Vendor> vendorMap) {
        for (Item cartItem : customer.getCart().getItems()) {
            if (cartItem.getProductId() == null) continue;
            Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
            Vendor vendor = (product != null) ? product.getVendor() : null;
            int vKey = (vendor != null) ? vendor.getId() : 0;
            vendorItems.computeIfAbsent(vKey, k -> new java.util.ArrayList<>()).add(cartItem);
            if (vendor != null) vendorMap.put(vKey, vendor);
        }
    }

    /** Looks up the warehouse that serves the given pin code, or null if none found. */
    private Warehouse findWarehouseForPin(String deliveryPinCode) {
        if (deliveryPinCode == null || deliveryPinCode.isBlank()) return null;
        java.util.List<Warehouse> matches = warehouseRepository.findByPinCode(deliveryPinCode.trim());
        return matches.isEmpty() ? null : matches.get(0);
    }

    /** Parameter object for buildSubOrder — reduces the method's parameter count (fixes java:S107).
     *  Using a record eliminates the explicit 9-parameter constructor (java:S107 on constructor). */
    private record SubOrderParams(
            Order baseOrder, Customer customer, Vendor vendor,
            java.util.List<Item> group, double subTotal, double subDelivery,
            String deliveryPinCode, Warehouse matchedWarehouse, String addressSnapshot) {}

    /** Builds (but does not save) a sub-order for one vendor's group of items. */
    private Order buildSubOrder(SubOrderParams p) {
        Order baseOrder = p.baseOrder();
        Customer customer = p.customer();
        Vendor vendor = p.vendor();
        java.util.List<Item> group = p.group();
        double subTotal = p.subTotal();
        double subDelivery = p.subDelivery();
        String deliveryPinCode = p.deliveryPinCode();
        Warehouse matchedWarehouse = p.matchedWarehouse();
        String addressSnapshot = p.addressSnapshot();

        java.util.List<Item> orderItems = new java.util.ArrayList<>();
        for (Item ci : group) {
            Item newItem = new Item();
            newItem.setName(ci.getName());
            newItem.setPrice(ci.getPrice());
            newItem.setUnitPrice(ci.getUnitPrice() > 0
                    ? ci.getUnitPrice()
                    : ci.getPrice() / Math.max(ci.getQuantity(), 1));
            newItem.setQuantity(ci.getQuantity());
            newItem.setCategory(ci.getCategory());
            newItem.setDescription(ci.getDescription());
            newItem.setImageLink(ci.getImageLink());
            newItem.setProductId(ci.getProductId());
            orderItems.add(newItem);
        }

        Order subOrder = new Order();
        subOrder.setCustomer(customer);
        subOrder.setOrderDate(java.time.LocalDateTime.now());
        subOrder.setRazorpayPaymentId(baseOrder.getRazorpayPaymentId());
        subOrder.setRazorpayOrderId(baseOrder.getRazorpayOrderId());
        subOrder.setPaymentMode(baseOrder.getPaymentMode());
        subOrder.setDeliveryTime(baseOrder.getDeliveryTime());
        subOrder.setTotalPrice(subTotal);
        subOrder.setDeliveryCharge(subDelivery);
        subOrder.setAmount(subTotal + subDelivery);
        subOrder.setTrackingStatus(TrackingStatus.PROCESSING);
        subOrder.setReplacementRequested(false);
        subOrder.setItems(orderItems);
        subOrder.setGstAmount(GstUtil.calculateTotalGst(orderItems));
        if (vendor != null)                                       subOrder.setVendor(vendor);
        if (deliveryPinCode != null && !deliveryPinCode.isBlank()) subOrder.setDeliveryPinCode(deliveryPinCode.trim());
        if (matchedWarehouse != null)                             subOrder.setWarehouse(matchedWarehouse);
        if (addressSnapshot != null)                              subOrder.setDeliveryAddress(addressSnapshot);
        return subOrder;
    }

    /** Sends the order-confirmation email; logs but does not propagate failures. */
    private void sendOrderConfirmationEmail(Customer customer, Order baseOrder,
            Order firstOrder, java.util.List<Integer> subOrderIds,
            double subtotal, double deliveryFee) {
        try {
            String paymentMode  = (baseOrder.getPaymentMode() != null && !baseOrder.getPaymentMode().isBlank())
                                  ? baseOrder.getPaymentMode() : "Cash on Delivery";
            String deliverySlot = (baseOrder.getDeliveryTime() != null && !baseOrder.getDeliveryTime().isBlank())
                                  ? baseOrder.getDeliveryTime() : "";
            java.util.List<Item> allItems = new java.util.ArrayList<>();
            for (int sid : subOrderIds) {
                Order so = orderRepository.findById(sid).orElse(null);
                if (so != null) allItems.addAll(so.getItems());
            }
            emailSender.sendOrderConfirmation(
                    customer, subtotal + deliveryFee,
                    firstOrder.getId(), paymentMode, deliverySlot, allItems);
        } catch (Exception e) {
            LOGGER.error("Order confirmation email failed (non-fatal): {}", e.getMessage(), e);
        }
    }

    // ---------------- DELETE ACCOUNT ----------------
    @Transactional
    public String deleteAccount(HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(null);
        if (customer == null) {
            session.setAttribute(K_FAILURE, "Account not found");
            return REDIRECT_CUSTOMER_HOME;
        }

        List<Wishlist> wishlistItems = wishlistRepository.findByCustomer(customer);
        if (!wishlistItems.isEmpty()) {
            wishlistRepository.deleteAll(wishlistItems);
            wishlistRepository.flush();
        }

        List<Refund> refunds = refundRepository.findByCustomer(customer);
        if (!refunds.isEmpty()) {
            refundRepository.deleteAll(refunds);
            refundRepository.flush();
        }

        List<Order> orders = orderRepository.findByCustomer(customer);
        if (!orders.isEmpty()) {
            orderRepository.deleteAll(orders);
            orderRepository.flush();
        }

        customerRepository.delete(customer);
        session.invalidate();

        return "redirect:/customer/login?deleted=true";
    }

    // ---------------- VIEW ORDERS ----------------
    public String viewOrders(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }

        List<Order> orders = orderRepository.findByCustomer(customer);

        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(7);
        java.util.Map<Integer, Boolean> returnEligibleMap = new java.util.HashMap<>();
        java.util.Map<Integer, Boolean> replacementRequestedMap = new java.util.HashMap<>();

        for (Order order : orders) {
            boolean eligible = order.getOrderDate() != null && order.getOrderDate().isAfter(cutoff);
            returnEligibleMap.put(order.getId(), eligible);

            boolean replaced = false;
            try { replaced = order.isReplacementRequested(); } catch (Exception e) { replaced = false; }
            replacementRequestedMap.put(order.getId(), replaced);
        }

        map.put(K_ORDERS, orders);
        map.put("returnEligibleMap", returnEligibleMap);
        map.put("replacementRequestedMap", replacementRequestedMap);
        return "view-orders.html";
    }

    @Transactional
    public String cancelOrder(int id, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }

        Order order = orderRepository.findById(id).orElseThrow();
        double amount = order.getAmount();
        int orderId = order.getId();
        List<Item> orderItems = new java.util.ArrayList<>(order.getItems());

        for (Item item : order.getItems()) {
            List<Product> products = productRepository.findByNameContainingIgnoreCase(item.getName());
            if (!products.isEmpty()) {
                Product product = products.get(0);
                product.setStock(product.getStock() + item.getQuantity());
                productRepository.save(product);
            }
        }

        try {
            emailSender.sendOrderCancellation(sessionCustomer, amount, orderId, orderItems);
        } catch (Exception e) {
            LOGGER.error("Cancellation email failed to send: {}", e.getMessage(), e);
        }

        orderRepository.delete(order);

        session.setAttribute(K_SUCCESS, "Order #" + orderId + " Cancelled Successfully");
        return K_REDIRECT_VIEW_ORDERS;
    }

    @Transactional
    public String requestReplacement(int orderId, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            session.setAttribute(K_FAILURE, "Order not found");
            return K_REDIRECT_VIEW_ORDERS;
        }

        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(7);
        if (order.getOrderDate() == null || order.getOrderDate().isBefore(cutoff)) {
            session.setAttribute(K_FAILURE, "Replacement window has expired (7 days only)");
            return K_REDIRECT_VIEW_ORDERS;
        }

        if (order.isReplacementRequested()) {
            session.setAttribute(K_FAILURE, "Replacement already requested for this order");
            return K_REDIRECT_VIEW_ORDERS;
        }

        order.setReplacementRequested(true);
        orderRepository.save(order);

        try {
            emailSender.sendReplacementRequest(sessionCustomer, order.getAmount(),
                    order.getId(), order.getItems());
        } catch (Exception e) {
            LOGGER.error("Replacement email failed: {}", e.getMessage(), e);
        }

        session.setAttribute(K_SUCCESS, "Replacement requested for Order #" + orderId + ". Our team will contact you shortly.");
        return K_REDIRECT_VIEW_ORDERS;
    }

    public void addReview(int productId, int rating, String comment, HttpSession session) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) return;

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return;

        boolean alreadyReviewed = reviewRepository.existsByProductIdAndCustomerId(productId, customer.getId());
        if (alreadyReviewed) return;

        int safeRating = Math.max(1, Math.min(5, rating));

        Review review = new Review();
        review.setRating(safeRating);
        review.setComment(comment);
        review.setCustomer(customer);
        review.setProduct(product);

        reviewRepository.save(review);
    }

    public List<Product> getProductsByCategory(String category, String currentName) {
        List<Product> list = productRepository.findByCategoryAndApprovedTrue(category);
        list.removeIf(p -> p.getName().equalsIgnoreCase(currentName));
        return list.size() > 2 ? list.subList(0, 2) : list;
    }

    // ---------------- ORDER HISTORY ----------------
    public String viewOrderHistory(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }
        List<Order> orders = orderRepository.findByCustomer(customer);
        map.put(K_ORDERS, orders);
        return "order-history.html";
    }

    // ---------------- TRACK ORDERS ----------------
    public String trackOrders(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return REDIRECT_CUSTOMER_LOGIN;
        }
        List<Order> orders = orderRepository.findByCustomer(customer);

        // Show real status — no time-based simulation anymore.
        // The progressWidthMap is derived from the actual TrackingStatus on each order.
        java.util.Map<Integer, Integer> trackingStepMap = new java.util.HashMap<>();
        java.util.Map<Integer, Integer> progressWidthMap = new java.util.HashMap<>();

        for (Order order : orders) {
            int step = order.getTrackingStatus().getStepIndex();
            int width = order.getTrackingStatus().getProgressPercent();
            trackingStepMap.put(order.getId(), step);
            progressWidthMap.put(order.getId(), width);
        }

        map.put(K_ORDERS, orders);
        map.put("trackingStepMap", trackingStepMap);
        map.put("progressWidthMap", progressWidthMap);
        return "track-orders.html";
    }

    // ---------------- ADDRESS ----------------
    public String loadAddressPage(HttpSession session, ModelMap map) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) return REDIRECT_CUSTOMER_LOGIN;

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        map.put(K_CUSTOMER, customer);
        return "address-page.html";
    }

    public String saveAddress(String recipientName, String houseStreet,
                              String city, String state, String postalCode,
                              HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();

        Address newAddress = new Address();
        newAddress.setRecipientName(recipientName != null ? recipientName.trim() : "");
        newAddress.setHouseStreet(houseStreet != null ? houseStreet.trim() : "");
        newAddress.setCity(city != null ? city.trim() : "");
        newAddress.setState(state != null ? state.trim() : "");
        newAddress.setPostalCode(postalCode != null ? postalCode.trim() : "");
        newAddress.setCustomer(customer);

        customer.getAddresses().add(newAddress);
        customerRepository.save(customer);

        return "redirect:/customer/address";
    }

    public String deleteAddress(int id) {
        addressRepository.deleteById(id);
        return "redirect:/customer/address";
    }
}