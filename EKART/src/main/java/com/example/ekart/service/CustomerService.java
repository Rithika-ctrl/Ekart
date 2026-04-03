package com.example.ekart.service;

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
import java.util.Random;

import com.example.ekart.dto.Address;

import org.springframework.beans.factory.annotation.Autowired;
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
// import com.example.ekart.service.SearchService; // unused
// import com.example.ekart.service.BannerService; // unused
// import com.example.ekart.service.CategoryService; // unused
// import com.example.ekart.dto.Category; // unused
import com.example.ekart.reporting.ReportingService;

import jakarta.servlet.http.HttpSession;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;


@Service
@Transactional
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private OrderRepository orderRepository;

    // @Autowired
    // private StockAlertService stockAlertService; // unused

    @Autowired
    private EmailSender emailSender;

	@Autowired
	private ReviewRepository reviewRepository;

	@Autowired
	private AddressRepository addressRepository;

    @Autowired
    private SearchService searchService;

    @Autowired
    private BannerService bannerService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private ReportingService reportingService;

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private RefundRepository refundRepository;

    // ── NEW: for delivery system ──────────────────────────────────
    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private TrackingEventLogRepository trackingEventLogRepository;
    // ─────────────────────────────────────────────────────────────

    /** Razorpay publishable key — injected from application.properties: razorpay.key.id */
    @org.springframework.beans.factory.annotation.Value("${razorpay.key.id:}")
    private String razorpayKeyId;

    // ---------------- REGISTER ----------------
    public String loadRegistration(ModelMap map, Customer customer) {
        map.put("customer", customer);
        return "customer-register.html";
    }

    public String registration(Customer customer, BindingResult result, HttpSession session) {

        if (!customer.getPassword().equals(customer.getConfirmPassword()))
            result.rejectValue("confirmPassword", "error.confirmPassword",
                    "* Password and Confirm Password Should Match");

        if (customerRepository.existsByEmail(customer.getEmail()))
            result.rejectValue("email", "error.email", "* Email Already Exists");

        if (customerRepository.existsByMobile(customer.getMobile()))
            result.rejectValue("mobile", "error.mobile", "* Mobile Number Already Exists");

        if (result.hasErrors())
            return "customer-register.html";

        int otp = new Random().nextInt(100000, 1000000);
        customer.setOtp(otp);
        customer.setPassword(AES.encrypt(customer.getPassword()));
        customerRepository.save(customer);

        try {
            emailSender.send(customer);
        } catch (Exception e) {
            System.err.println("Customer OTP email failed: " + e.getMessage());
        }

        session.setAttribute("success", "OTP Sent Successfully to your email");
        return "redirect:/customer/otp/" + customer.getId();
    }

    public String verifyOtp(int id, int otp, HttpSession session) {
        Customer customer = customerRepository.findById(id).orElseThrow();

        if (customer.getOtp() == otp) {
            customer.setVerified(true);
            customerRepository.save(customer);
            session.setAttribute("success", "Account verified! Please log in.");
            return "redirect:/customer/login";
        }

        session.setAttribute("failure", "OTP Mismatch");
        return "redirect:/customer/otp/" + customer.getId();
    }

    // ---------------- LOGIN ----------------
    public String login(String email, String password, HttpSession session) {

        Customer customer = customerRepository.findByEmail(email);

        if (customer == null) {
            session.setAttribute("failure", "Invalid Email");
            return "redirect:/customer/login";
        }

        if (!AES.decrypt(customer.getPassword()).equals(password)) {
            session.setAttribute("failure", "Invalid Password");
            return "redirect:/customer/login";
        }

        if (!customer.isVerified()) {
            session.setAttribute("failure", "Verify Email First");
            return "redirect:/customer/login";
        }

        if (!customer.isActive()) {
            session.setAttribute("failure", "Your account has been suspended.");
            return "redirect:/customer/login";
        }

        if (customer.getCart() == null) {
            Cart cart = new Cart();
            cart.setItems(new ArrayList<>());
            customer.setCart(cart);
        }

        customer.setLastLogin(LocalDateTime.now());
        customerRepository.save(customer);

        session.removeAttribute("guest");
        session.setAttribute("customer", customer);
        session.setAttribute("success", "Login Successful");
        return "redirect:/customer/home";
    }

    public String loadForgotPasswordPage() {
        return "customer-forgot-password.html";
    }

    public String sendResetOtp(String email, HttpSession session) {
        Customer customer = customerRepository.findByEmail(email);
        if (customer == null) {
            session.setAttribute("failure", "No account found with this email");
            return "redirect:/customer/forgot-password";
        }

        int otp = new Random().nextInt(100000, 1000000);
        customer.setOtp(otp);
        customerRepository.save(customer);
        emailSender.send(customer);

        session.setAttribute("success", "OTP sent to your registered email");
        return "redirect:/customer/reset-password/" + customer.getId();
    }

    public String loadResetPasswordPage(int id, ModelMap map) {
        map.put("id", id);
        return "customer-reset-password.html";
    }

    public String resetPassword(int id, int otp, String password, String confirmPassword, HttpSession session) {
        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) {
            session.setAttribute("failure", "Invalid reset request");
            return "redirect:/customer/forgot-password";
        }

        if (customer.getOtp() != otp) {
            session.setAttribute("failure", "Invalid OTP");
            return "redirect:/customer/reset-password/" + id;
        }

        if (password == null || confirmPassword == null || !password.equals(confirmPassword)) {
            session.setAttribute("failure", "Password and Confirm Password should match");
            return "redirect:/customer/reset-password/" + id;
        }

        String passwordRegex = "^.*(?=.{8,})(?=..*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$";
        if (!password.matches(passwordRegex)) {
            session.setAttribute("failure",
                    "Password must have 8+ characters with uppercase, lowercase, number and special character");
            return "redirect:/customer/reset-password/" + id;
        }

        customer.setPassword(AES.encrypt(password));
        customerRepository.save(customer);

        session.setAttribute("success", "Password reset successful. Please login");
        return "redirect:/customer/login";
    }

    public String loadCustomerHome(HttpSession session, org.springframework.ui.ModelMap map) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);
        int cartCount = 0;
        if (customer.getCart() != null && customer.getCart().getItems() != null) {
            cartCount = customer.getCart().getItems().size();
        }
        map.put("cartCount", cartCount);

        List<Product> products = productRepository.findByApprovedTrue();
        map.put("products", products);

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
        boolean isGuest = session.getAttribute("customer") == null
                       && session.getAttribute("vendor") == null;
        map.put("isGuestView", isGuest);

        Product product = productRepository.findById(id).orElse(null);
        if (product == null || !product.isApproved()) {
            if (!isGuest) session.setAttribute("failure", "Product not found");
            return isGuest ? "redirect:/" : "redirect:/customer/home";
        }

        List<Product> similar = productRepository.findByCategoryAndApprovedTrue(product.getCategory())
                .stream()
                .filter(p -> p.getId() != product.getId())
                .collect(java.util.stream.Collectors.toList());

        map.put("product", product);
        map.put("similar", similar);
        return "product-detail.html";
    }

    // ---------------- VIEW PRODUCTS ----------------
    public String viewProducts(HttpSession session, ModelMap map) {

        if (session.getAttribute("customer") == null)
            return "redirect:/customer/login";

        List<Product> products = productRepository.findByApprovedTrue();

        if (products.isEmpty()) {
            session.setAttribute("failure", "No Products Available");
            return "redirect:/customer/home";
        }

        map.put("products", products);
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
        map.put("products", products);

        if (session.getAttribute("customer") != null) {
            return "customer-view-products.html";
        }
        return "guest-browse.html";
    }

    // ---------------- SEARCH ----------------
    public String searchProducts(HttpSession session) {
        return "search.html";
    }

    public String search(String query, HttpSession session, ModelMap map) {
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
                map.put("query", corrected);
            } else {
                map.put("query", query);
            }
        } else {
            map.put("query", query);
        }

        map.put("products", products);
        return "search.html";
    }

    // ---------------- ADD TO CART ----------------
    public String addToCart(int id, HttpSession session) {

        Customer sessionCustomer = (Customer) session.getAttribute("customer");

        if (sessionCustomer == null) {
            session.setAttribute("failure", "Session Expired, Login Again");
            return "redirect:/customer/login";
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
            session.setAttribute("failure", "Product already in cart");
            return "redirect:/customer/home";
        }

        if (product.getStock() <= 0) {
            session.setAttribute("failure", "Sorry, this product is out of stock.");
            return "redirect:/customer/home";
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

        session.setAttribute("success", "Added to cart");
        return "redirect:/customer/home";
    }

    // ---------------- VIEW CART ----------------
    public String viewCart(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
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
    public String increase(int id, HttpSession session) {
        Item item = itemRepository.findById(id).orElseThrow();

        if (item.getProductId() == null) {
            session.setAttribute("failure", "This product is no longer available.");
            return "redirect:/view-cart";
        }
        Product product = productRepository.findById(item.getProductId()).orElse(null);
        if (product == null) {
            session.setAttribute("failure", "This product is no longer available.");
            return "redirect:/view-cart";
        }

        if (product.getStock() <= 0) {
            session.setAttribute("failure", "No more stock available for this product.");
            return "redirect:/view-cart";
        }

        int newQty = item.getQuantity() + 1;
        item.setQuantity(newQty);
        double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : product.getPrice();
        item.setUnitPrice(unitPrice);
        item.setPrice(unitPrice * newQty);
        product.setStock(product.getStock() - 1);

        itemRepository.save(item);
        productRepository.save(product);

        return "redirect:/view-cart";
    }

    // ---------------- DECREASE QUANTITY ----------------
    public String decrease(int id, HttpSession session) {
        Item item = itemRepository.findById(id).orElseThrow();

        Product product = null;
        if (item.getProductId() != null) {
            product = productRepository.findById(item.getProductId()).orElse(null);
        }

        if (product == null) {
            item.getCart().getItems().removeIf(i -> i.getId() == item.getId());
            itemRepository.delete(item);
            session.setAttribute("failure", "This product is no longer available.");
            return "redirect:/view-cart";
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

        return "redirect:/view-cart";
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

        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        customer.getCart().getItems().removeIf(i -> i.getId() == id);
        customerRepository.save(customer);
        itemRepository.deleteById(id);

        session.setAttribute("success", "Item Removed from Cart");
        return "redirect:/view-cart";
    }

    // ── AJAX: increase ────────────────────────────────────────────
    public java.util.Map<String, Object> ajaxIncrease(int id, HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            res.put("success", false); res.put("message", "Session expired"); return res;
        }
        Item item = itemRepository.findById(id).orElse(null);
        if (item == null) { res.put("success", false); res.put("message", "Item not found"); return res; }
        if (item.getProductId() == null) { res.put("success", false); res.put("message", "Product unavailable"); return res; }
        Product product = productRepository.findById(item.getProductId()).orElse(null);
        if (product == null) { res.put("success", false); res.put("message", "Product no longer available"); return res; }
        if (product.getStock() <= 0) { res.put("success", false); res.put("message", "No more stock available"); return res; }

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
            .mapToDouble(i -> i.getUnitPrice() > 0 ? i.getLineTotal() : i.getPrice()).sum();

        res.put("success", true);
        res.put("quantity", newQty);
        res.put("lineTotal", unitPrice * newQty);
        res.put("unitPrice", unitPrice);
        res.put("cartTotal", cartTotal);
        res.put("freeDelivery", cartTotal >= 500);
        res.put("deliveryCharge", cartTotal >= 500 ? 0 : 40);
        res.put("cartEmpty", false);
        return res;
    }

    // ── AJAX: decrease ────────────────────────────────────────────
    public java.util.Map<String, Object> ajaxDecrease(int id, HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            res.put("success", false); res.put("message", "Session expired"); return res;
        }
        Item item = itemRepository.findById(id).orElse(null);
        if (item == null) { res.put("success", false); res.put("message", "Item not found"); return res; }

        Product product = item.getProductId() != null
            ? productRepository.findById(item.getProductId()).orElse(null) : null;

        boolean removed = false;
        if (item.getQuantity() <= 1) {
            Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
            customer.getCart().getItems().removeIf(i -> i.getId() == id);
            customerRepository.save(customer);
            itemRepository.deleteById(id);
            if (product != null) { product.setStock(product.getStock() + 1); productRepository.save(product); }
            removed = true;
        } else {
            int newQty = item.getQuantity() - 1;
            double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice()
                : (product != null ? product.getPrice() : item.getPrice());
            item.setUnitPrice(unitPrice);
            item.setQuantity(newQty);
            item.setPrice(unitPrice * newQty);
            itemRepository.save(item);
            if (product != null) { product.setStock(product.getStock() + 1); productRepository.save(product); }
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        double cartTotal = customer.getCart().getItems().stream()
            .mapToDouble(i -> i.getUnitPrice() > 0 ? i.getLineTotal() : i.getPrice()).sum();

        res.put("success", true);
        res.put("removed", removed);
        if (!removed) {
            res.put("quantity", item.getQuantity());
            res.put("lineTotal", item.getPrice());
            res.put("unitPrice", item.getUnitPrice());
        }
        res.put("cartTotal", cartTotal);
        res.put("freeDelivery", cartTotal >= 500);
        res.put("deliveryCharge", cartTotal >= 500 ? 0 : 40);
        res.put("cartEmpty", customer.getCart().getItems().isEmpty());
        return res;
    }

    // ── AJAX: remove ──────────────────────────────────────────────
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Object> ajaxRemove(int id, HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            res.put("success", false); res.put("message", "Session expired"); return res;
        }
        Item item = itemRepository.findById(id).orElse(null);
        if (item == null) { res.put("success", false); res.put("message", "Item not found"); return res; }

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
            .mapToDouble(i -> i.getUnitPrice() > 0 ? i.getLineTotal() : i.getPrice()).sum();

        res.put("success", true);
        res.put("cartTotal", cartTotal);
        res.put("freeDelivery", cartTotal >= 500);
        res.put("deliveryCharge", cartTotal >= 500 ? 0 : 40);
        res.put("cartEmpty", customer.getCart().getItems().isEmpty());
        return res;
    }

    // ---------------- PAYMENT PAGE ----------------
    public String payment(HttpSession session, ModelMap map) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        List<Item> items = customer.getCart().getItems();

        if (items == null || items.isEmpty()) {
            session.setAttribute("failure", "Your cart is empty! Add products before paying.");
            return "redirect:/view-cart";
        }

        double cartTotal = 0;
        java.util.LinkedHashSet<String> categorySet = new java.util.LinkedHashSet<>();
        java.util.Set<String> cartItemNames = new java.util.HashSet<>();

        for (Item item : items) {
            cartTotal += item.getPrice();
            if (item.getCategory() != null && !item.getCategory().isBlank()) {
                categorySet.add(item.getCategory());
            }
            cartItemNames.add(item.getName());
        }

        java.util.List<Product> recommendations = new java.util.ArrayList<>();
        for (String cat : categorySet) {
            List<Product> catProducts = productRepository.findByCategoryAndApprovedTrue(cat);
            for (Product p : catProducts) {
                if (!cartItemNames.contains(p.getName()) && recommendations.stream().noneMatch(r -> r.getId() == p.getId())) {
                    recommendations.add(p);
                    if (recommendations.size() >= 4) break;
                }
            }
            if (recommendations.size() >= 4) break;
        }

        String categoryLabel = String.join(" & ", categorySet);
        double deliveryCharge = (cartTotal >= 500) ? 0 : 40;
        double finalAmount = cartTotal + deliveryCharge;

        map.put("cartTotal", cartTotal);
        map.put("deliveryCharge", deliveryCharge);
        map.put("amount", finalAmount);
        map.put("customer", customer);
        map.put("cartItems", items);
        map.put("recommendedProducts", recommendations);
        map.put("cartItemCategory", categoryLabel);

        // Razorpay publishable key — read from application.properties
        // Property: razorpay.key.id (set in application.properties or env)
        map.put("razorpayKeyId", razorpayKeyId != null ? razorpayKeyId : "");

        // ── GST breakdown for payment page ────────────────────────
        double gstAmount = GstUtil.calculateTotalGst(items);
        double taxableBase = Math.round((cartTotal - gstAmount) * 100.0) / 100.0;
        String gstLabel   = GstUtil.getMixedGstLabel(items);
        map.put("gstAmount",   gstAmount);
        map.put("taxableBase", taxableBase);
        map.put("gstLabel",    gstLabel);

        return "payment.html";
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
    @Transactional
    public String paymentSuccess(Order baseOrder, String deliveryPinCode, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();

        // ── 1. PIN CODE VALIDATION ───────────────────────────────
        if (deliveryPinCode != null && !deliveryPinCode.isBlank()) {
            String pin = deliveryPinCode.trim();
            for (Item cartItem : customer.getCart().getItems()) {
                if (cartItem.getProductId() == null) continue;
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product != null && !product.isDeliverableTo(pin)) {
                    session.setAttribute("failure",
                        "\"" + product.getName() + "\" cannot be delivered to pin code " + pin +
                        ". Please remove it from your cart or try a different pin code.");
                    return "redirect:/payment";
                }
            }
        } else {
            for (Item cartItem : customer.getCart().getItems()) {
                if (cartItem.getProductId() == null) continue;
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product != null && product.isRestrictedByPinCode()) {
                    session.setAttribute("failure",
                        "\"" + product.getName() + "\" has delivery restrictions. " +
                        "Please verify your pin code on the payment page before placing the order.");
                    return "redirect:/payment";
                }
            }
        }

        // ── 2. BUILD ADDRESS SNAPSHOT ────────────────────────────
        String addressSnapshot = null;
        if (customer.getAddresses() != null && !customer.getAddresses().isEmpty()) {
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
            if (!snap.isEmpty()) addressSnapshot = snap;
        }

        // ── 3. GROUP CART ITEMS BY VENDOR ────────────────────────
        // Map: vendorId → { vendor, list of cart items }
        java.util.Map<Integer, java.util.List<Item>> vendorItems = new java.util.LinkedHashMap<>();
        java.util.Map<Integer, Vendor>               vendorMap   = new java.util.LinkedHashMap<>();

        for (Item cartItem : customer.getCart().getItems()) {
            if (cartItem.getProductId() == null) continue;
            Product product = productRepository.findById(cartItem.getProductId()).orElse(null);

            int vKey;
            Vendor vendor = null;
            if (product != null && product.getVendor() != null) {
                vendor = product.getVendor();
                vKey   = vendor.getId();
            } else {
                vKey = 0; // unknown vendor — group together
            }

            vendorItems.computeIfAbsent(vKey, k -> new java.util.ArrayList<>()).add(cartItem);
            if (vendor != null) vendorMap.put(vKey, vendor);
        }

        // ── 4. CALCULATE OVERALL SUBTOTAL (for delivery charge) ──
        double subtotal = 0;
        for (Item cartItem : customer.getCart().getItems()) {
            subtotal += cartItem.getPrice();
        }
        double deliveryFee = (subtotal < 500) ? 40.0 : 0.0;

        // ── 5. FIND WAREHOUSE FOR THIS PIN ───────────────────────
        Warehouse matchedWarehouse = null;
        if (deliveryPinCode != null && !deliveryPinCode.isBlank()) {
            java.util.List<Warehouse> matches = warehouseRepository.findByPinCode(deliveryPinCode.trim());
            if (!matches.isEmpty()) matchedWarehouse = matches.get(0);
        }

        // ── 6. CREATE ONE SUB-ORDER PER VENDOR ──────────────────
        boolean multiVendor = vendorItems.size() > 1;
        Integer parentId    = null;   // set after first sub-order is saved
        Order   firstOrder  = null;

        java.util.List<Integer> subOrderIds = new java.util.ArrayList<>();

        for (java.util.Map.Entry<Integer, java.util.List<Item>> entry : vendorItems.entrySet()) {
            int vendorKey         = entry.getKey();
            java.util.List<Item> group = entry.getValue();
            Vendor vendor         = vendorMap.get(vendorKey);

            // Calculate sub-order total
            double subTotal = 0;
            for (Item ci : group) subTotal += ci.getPrice();

            // Only first sub-order carries the delivery charge
            double subDelivery = (firstOrder == null) ? deliveryFee : 0.0;

            // Clone items
            java.util.List<Item> orderItems = new java.util.ArrayList<>();
            for (Item cartItem : group) {
                Item newItem = new Item();
                newItem.setName(cartItem.getName());
                newItem.setPrice(cartItem.getPrice());
                newItem.setUnitPrice(cartItem.getUnitPrice() > 0
                        ? cartItem.getUnitPrice()
                        : cartItem.getPrice() / Math.max(cartItem.getQuantity(), 1));
                newItem.setQuantity(cartItem.getQuantity());
                newItem.setCategory(cartItem.getCategory());
                newItem.setDescription(cartItem.getDescription());
                newItem.setImageLink(cartItem.getImageLink());
                newItem.setProductId(cartItem.getProductId());
                orderItems.add(newItem);
            }

            // Build sub-order
            Order subOrder = new Order();
            subOrder.setCustomer(customer);
            subOrder.setOrderDate(java.time.LocalDateTime.now());
            subOrder.setRazorpay_payment_id(baseOrder.getRazorpay_payment_id());
            subOrder.setRazorpay_order_id(baseOrder.getRazorpay_order_id());
            subOrder.setPaymentMode(baseOrder.getPaymentMode());
            subOrder.setDeliveryTime(baseOrder.getDeliveryTime());
            subOrder.setTotalPrice(subTotal);
            subOrder.setDeliveryCharge(subDelivery);
            subOrder.setAmount(subTotal + subDelivery);
            subOrder.setTrackingStatus(TrackingStatus.PROCESSING);
            subOrder.setReplacementRequested(false);
            subOrder.setItems(orderItems);

            // ── Calculate GST from inclusive prices ───────────────
            double subGst = GstUtil.calculateTotalGst(orderItems);
            subOrder.setGstAmount(subGst);

            // Vendor metadata
            if (vendor != null) {
                subOrder.setVendor(vendor);
            }

            // Delivery fields
            if (deliveryPinCode != null && !deliveryPinCode.isBlank())
                subOrder.setDeliveryPinCode(deliveryPinCode.trim());
            if (matchedWarehouse != null)
                subOrder.setWarehouse(matchedWarehouse);
            if (addressSnapshot != null)
                subOrder.setDeliveryAddress(addressSnapshot);

            // Save sub-order
            orderRepository.save(subOrder);
            orderRepository.flush();

            // Set parentOrderId after first sub-order is persisted
            if (firstOrder == null) {
                firstOrder = subOrder;
                if (multiVendor) {
                    parentId = subOrder.getId();
                    subOrder.setParentOrderId(parentId);
                    orderRepository.save(subOrder);
                }
            } else {
                subOrder.setParentOrderId(parentId);
                orderRepository.save(subOrder);
            }

            // Track event
            String whCity = matchedWarehouse != null ? matchedWarehouse.getCity() : "Processing Center";
            subOrder.setCurrentCity(whCity);
            orderRepository.save(subOrder);

            trackingEventLogRepository.save(new TrackingEventLog(
                subOrder, TrackingStatus.PROCESSING, whCity,
                "Order placed successfully. Payment confirmed." +
                (vendor != null ? " Vendor: " + vendor.getName() : ""),
                "system"
            ));

            subOrderIds.add(subOrder.getId());

            // Record in reporting DB (after commit)
            final Order finalSubOrder = subOrder;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        Order saved = orderRepository.findById(finalSubOrder.getId()).orElse(finalSubOrder);
                        reportingService.recordOrder(saved);
                    } catch (Exception e) {
                        System.err.println("[ReportingService] recordOrder failed: " + e.getMessage());
                    }
                }
            });
        }

        // ── 7. SEND CONFIRMATION EMAIL ───────────────────────────
        // Email uses the first sub-order's total (includes delivery fee)
        try {
            String paymentMode = (baseOrder.getPaymentMode() != null && !baseOrder.getPaymentMode().isBlank())
                    ? baseOrder.getPaymentMode() : "Cash on Delivery";
            String deliverySlot = (baseOrder.getDeliveryTime() != null && !baseOrder.getDeliveryTime().isBlank())
                    ? baseOrder.getDeliveryTime() : "";
            // Collect all items across all sub-orders for email
            java.util.List<Item> allItems = new java.util.ArrayList<>();
            for (int sid : subOrderIds) {
                Order so = orderRepository.findById(sid).orElse(null);
                if (so != null) allItems.addAll(so.getItems());
            }
            emailSender.sendOrderConfirmation(
                    customer, subtotal + deliveryFee,
                    firstOrder.getId(), paymentMode, deliverySlot, allItems);
        } catch (Exception e) {
            System.err.println("Order confirmation email failed (non-fatal): " + e.getMessage());
        }

        // ── 8. CLEAR CART ────────────────────────────────────────
        java.util.List<Item> cartItems = new java.util.ArrayList<>(customer.getCart().getItems());
        customer.getCart().getItems().clear();
        customerRepository.save(customer);
        itemRepository.deleteAll(cartItems);
        itemRepository.flush();

        // ── 9. UPDATE SESSION ────────────────────────────────────
        Customer updatedCustomer = customerRepository.findById(customer.getId()).orElseThrow();
        session.setAttribute("customer", updatedCustomer);

        // Pass sub-order IDs as comma-separated string so order-success can show all
        String subOrderIdsStr = subOrderIds.stream()
                .map(String::valueOf)
                .reduce((a, b) -> a + "," + b)
                .orElse(String.valueOf(firstOrder.getId()));

        session.setAttribute("lastOrderId",           firstOrder.getId());
        session.setAttribute("lastSubOrderIds",        subOrderIdsStr);
        session.setAttribute("lastOrderAmount",        subtotal + deliveryFee);
        session.setAttribute("lastOrderDeliveryTime",  baseOrder.getDeliveryTime());
        session.setAttribute("lastOrderPaymentMode",
                baseOrder.getPaymentMode() != null ? baseOrder.getPaymentMode() : "Cash on Delivery");

        // Store total GST across all sub-orders for the success page
        double totalSessionGst = subOrderIds.stream()
                .mapToDouble(sid -> {
                    try {
                        return orderRepository.findById(sid)
                                .map(com.example.ekart.dto.Order::getGstAmount).orElse(0.0);
                    } catch (Exception e) { return 0.0; }
                }).sum();
        totalSessionGst = Math.round(totalSessionGst * 100.0) / 100.0;
        session.setAttribute("lastOrderGst", totalSessionGst);
        session.setAttribute("success", "Order Placed Successfully!");
        return "redirect:/order-success";
    }

    // ---------------- DELETE ACCOUNT ----------------
    @Transactional
    public String deleteAccount(HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(null);
        if (customer == null) {
            session.setAttribute("failure", "Account not found");
            return "redirect:/customer/home";
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
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
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

        map.put("orders", orders);
        map.put("returnEligibleMap", returnEligibleMap);
        map.put("replacementRequestedMap", replacementRequestedMap);
        return "view-orders.html";
    }

    @Transactional
    public String cancelOrder(int id, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
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
            System.err.println("Cancellation email failed to send.");
        }

        orderRepository.delete(order);

        session.setAttribute("success", "Order #" + orderId + " Cancelled Successfully");
        return "redirect:/view-orders";
    }

    @Transactional
    public String requestReplacement(int orderId, HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            session.setAttribute("failure", "Order not found");
            return "redirect:/view-orders";
        }

        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(7);
        if (order.getOrderDate() == null || order.getOrderDate().isBefore(cutoff)) {
            session.setAttribute("failure", "Replacement window has expired (7 days only)");
            return "redirect:/view-orders";
        }

        if (order.isReplacementRequested()) {
            session.setAttribute("failure", "Replacement already requested for this order");
            return "redirect:/view-orders";
        }

        order.setReplacementRequested(true);
        orderRepository.save(order);

        try {
            emailSender.sendReplacementRequest(sessionCustomer, order.getAmount(),
                    order.getId(), order.getItems());
        } catch (Exception e) {
            System.err.println("Replacement email failed: " + e.getMessage());
        }

        session.setAttribute("success", "Replacement requested for Order #" + orderId + ". Our team will contact you shortly.");
        return "redirect:/view-orders";
    }

    public void addReview(int productId, int rating, String comment, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) return;

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return;

        boolean alreadyReviewed = reviewRepository.existsByProductIdAndCustomerName(productId, customer.getName());
        if (alreadyReviewed) return;

        int safeRating = Math.max(1, Math.min(5, rating));

        Review review = new Review();
        review.setRating(safeRating);
        review.setComment(comment);
        review.setCustomerName(customer.getName());
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
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }
        List<Order> orders = orderRepository.findByCustomer(customer);
        map.put("orders", orders);
        return "order-history.html";
    }

    // ---------------- TRACK ORDERS ----------------
    public String trackOrders(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
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

        map.put("orders", orders);
        map.put("trackingStepMap", trackingStepMap);
        map.put("progressWidthMap", progressWidthMap);
        return "track-orders.html";
    }

    // ---------------- ADDRESS ----------------
    public String loadAddressPage(HttpSession session, ModelMap map) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) return "redirect:/customer/login";

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        map.put("customer", customer);
        return "address-page.html";
    }

    public String saveAddress(String recipientName, String houseStreet,
                              String city, String state, String postalCode,
                              HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
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

    public String deleteAddress(int id, HttpSession session) {
        addressRepository.deleteById(id);
        return "redirect:/customer/address";
    }
}