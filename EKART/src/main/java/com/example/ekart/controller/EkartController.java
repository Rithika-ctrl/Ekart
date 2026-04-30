package com.example.ekart.controller;

import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import com.opencsv.CSVReader;
import java.io.InputStreamReader;

import java.io.IOException;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Order;
import com.example.ekart.service.RefundService;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Vendor;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.service.AdminService;
import com.example.ekart.service.BannerService;
import com.example.ekart.service.CategoryService;
import com.example.ekart.service.CustomerService;
import com.example.ekart.service.GuestService;
import com.example.ekart.service.VendorService;
import com.example.ekart.helper.PinCodeValidator;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@Controller
public class EkartController {

    // ── S1192 String constants ──
    private static final String K_ADMIN                             = "admin";
    private static final String K_BLOCKEDITEMS                      = "blockedItems";
    private static final String K_CUSTOMER                          = "customer";
    private static final String K_FAILURE                           = "failure";
    private static final String K_HASRESTRICTIONS                   = "hasRestrictions";
    private static final String K_LOGIN_FIRST                       = "Login First";
    private static final String K_MESSAGE                           = "message";
    private static final String K_REDIRECT_CUSTOMER_LOGIN           = "redirect:/customer/login";
    private static final String K_SUCCESS                           = "success";
    private static final String K_TOTALSPENT                        = "totalSpent";

    // ── BULK PRODUCT INDUCTION ──────────────────────────────────────────────
    @PostMapping("/add-product/bulk-upload")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> bulkProductUpload(
            @RequestPart("file") MultipartFile file,
            HttpSession session) {
        Map<String, Object> res = new HashMap<>();
        if (session.getAttribute("vendor") == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Login required");
            return ResponseEntity.status(401).body(res);
        }
        Vendor vendor = (Vendor) session.getAttribute("vendor");
        int added = 0, failed = 0;
        List<String> errors = new ArrayList<>();
        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            String[] header = reader.readNext();
            if (header == null) {
                res.put(K_SUCCESS, false);
                res.put(K_MESSAGE, "CSV is empty");
                return ResponseEntity.badRequest().body(res);
            }
            // Map header columns to indices (case-insensitive)
            Map<String, Integer> colIdx = new HashMap<>();
            for (int i = 0; i < header.length; i++) colIdx.put(header[i].trim().toLowerCase(), i);
            String[] row;
            int rowNum = 1;
            while ((row = reader.readNext()) != null) {
                rowNum++;
                try {
                    // Columns match add-product.html form exactly
                    String name       = getCsvValue(row, colIdx, "product name");
                    String desc       = getCsvValue(row, colIdx, "description");
                    String mrpStr     = getCsvValue(row, colIdx, "mrp");
                    String priceStr   = getCsvValue(row, colIdx, "price");
                    String qtyStr     = getCsvValue(row, colIdx, "stock");
                    String category   = getCsvValue(row, colIdx, "category");
                    String alertStr   = getCsvValue(row, colIdx, "stock alert threshold");
                    String pinCodes   = getCsvValue(row, colIdx, "allowed pin codes");
                    String imageUrl   = getCsvValue(row, colIdx, "image url");

                    // Required: name, price, stock (same as form)
                    if (name == null || priceStr == null || qtyStr == null ||
                        name.trim().isEmpty() || priceStr.trim().isEmpty() || qtyStr.trim().isEmpty()) {
                        failed++;
                        errors.add("Row " + rowNum + ": Missing required fields (Product Name, Price, Stock)");
                        continue;
                    }

                    double price = Double.parseDouble(priceStr);
                    int qty      = Integer.parseInt(qtyStr);

                    double mrp = 0;
                    if (mrpStr != null && !mrpStr.isBlank()) {
                        try { mrp = Double.parseDouble(mrpStr); } catch (NumberFormatException ignored) { /* non-numeric value — use default */ }
                    }

                    int alertThreshold = 10; // same default as form
                    if (alertStr != null && !alertStr.isBlank()) {
                        try { alertThreshold = Integer.parseInt(alertStr); } catch (NumberFormatException ignored) { /* non-numeric value — use default */ }
                    }

                    Product p = new Product();
                    p.setName(name.trim());
                    p.setDescription(desc != null ? desc.trim() : "");
                    p.setCategory(category != null && !category.isBlank() ? category.trim() : "General");
                    p.setPrice(price);
                    if (mrp > price) p.setMrp(mrp);
                    p.setStock(qty);
                    p.setStockAlertThreshold(alertThreshold);
                    if (pinCodes != null && !pinCodes.isBlank()) p.setAllowedPinCodes(pinCodes.trim());
                    if (imageUrl != null && !imageUrl.isBlank()) p.setImageLink(imageUrl.trim());
                    p.setVendor(vendor);
                    p.setApproved(false);
                    productRepository.save(p);
                    added++;
                } catch (Exception ex) {
                    failed++;
                    errors.add("Row " + rowNum + ": " + ex.getMessage());
                }
            }
        } catch (Exception e) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Failed to process CSV: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
        res.put(K_SUCCESS, true);
        res.put(K_MESSAGE, "Added: " + added + ", Failed: " + failed + (errors.isEmpty() ? "" : ". Errors: " + String.join("; ", errors)));
        return ResponseEntity.ok(res);

    }

    // Helper for safe CSV value extraction (case-insensitive)
    private String getCsvValue(String[] row, Map<String, Integer> colIdx, String colName) {
        Integer idx = colIdx.get(colName.toLowerCase());
        if (idx == null || idx < 0 || idx >= row.length) return null;
        return row[idx];
    }

    // ── Dependencies (constructor injection — replaces @Autowired field injection) ──
    private final VendorService vendorService;
    private final AdminService adminService;
    private final ItemRepository itemRepository;
    private final OrderRepository orderRepository;
    private final CustomerService customerService;
    private final CustomerRepository customerRepository;
    private final com.example.ekart.service.StockAlertService stockAlertService;
    private final com.example.ekart.service.OrderTrackingService orderTrackingService;
    private final BannerService bannerService;
    private final CategoryService categoryService;
    private final com.example.ekart.service.UserAdminService userAdminService;
    private final GuestService guestService;
    private final ProductRepository productRepository;
    private final RefundService refundService;

    public EkartController(VendorService vendorService,
                           AdminService adminService,
                           ItemRepository itemRepository,
                           OrderRepository orderRepository,
                           CustomerService customerService,
                           CustomerRepository customerRepository,
                           com.example.ekart.service.StockAlertService stockAlertService,
                           com.example.ekart.service.OrderTrackingService orderTrackingService,
                           BannerService bannerService,
                           CategoryService categoryService,
                           com.example.ekart.service.UserAdminService userAdminService,
                           GuestService guestService,
                           ProductRepository productRepository,
                           RefundService refundService) {
        this.vendorService = vendorService;
        this.adminService = adminService;
        this.itemRepository = itemRepository;
        this.orderRepository = orderRepository;
        this.customerService = customerService;
        this.customerRepository = customerRepository;
        this.stockAlertService = stockAlertService;
        this.orderTrackingService = orderTrackingService;
        this.bannerService = bannerService;
        this.categoryService = categoryService;
        this.userAdminService = userAdminService;
        this.guestService = guestService;
        this.productRepository = productRepository;
        this.refundService = refundService;
    }

    // ── GUEST ─────────────────────────────────────────────────────────────────

    @GetMapping("/guest/start")
    public String startGuest(HttpSession session) {
        return guestService.startGuestSession(session);
    }

    @GetMapping("/guest/browse")
    public String guestBrowse(HttpSession session, ModelMap map) {
        return guestService.loadGuestBrowse(session, map);
    }

    @GetMapping("/guest/search")
    public String guestSearch(@RequestParam(required = false, defaultValue = "") String query,
                               HttpSession session, ModelMap map) {
        return guestService.guestSearch(query, session, map);
    }

    @GetMapping("/guest/exit")
    public String exitGuest(HttpSession session) {
        session.removeAttribute("guest");
        return "redirect:/";
    }

    // ── HOME ──────────────────────────────────────────────────────────────────

    @GetMapping
    public String loadHomePage(ModelMap map) {
        // Load active banners for carousel
        map.put("banners", bannerService.getHomeBanners());
        return "home.html";
    }

    // ── ERROR PAGES ───────────────────────────────────────────────────────────

    @GetMapping("/403")
    public String loadForbiddenPage() {
        return "403.html";
    }

    @GetMapping("/blocked")
    public String loadBlockedPage() {
        return "blocked.html";
    }

    // ── PRODUCT BROWSE (web, with optional category filter) ──────────────────

    @GetMapping("/products")
    public String browseProducts(@RequestParam(required = false) String cat,
                                 HttpSession session, ModelMap map) {
        return customerService.viewProductsByCategory(cat, session, map);
    }


    // ── VENDOR ───────────────────────────────────────────────────────────────

    @GetMapping("/vendor/register")
    public String loadVendorRegistration(ModelMap map, Vendor vendor) {
        return vendorService.loadRegistration(map, vendor);
    }

    @PostMapping("/vendor/register")
    public String vendorRegistration(@Valid Vendor vendor, BindingResult result, HttpSession session) {
        return vendorService.registration(vendor, result, session);
    }

    @GetMapping("/vendor/otp/{id}")
    public String loadOtpPage(@PathVariable int id, ModelMap map) {
        return vendorService.loadOtpPage(id, map);
    }

    @PostMapping("/vendor/otp")
    public String verifyOtp(@RequestParam int id, @RequestParam int otp, HttpSession session) {
        return vendorService.verifyOtp(id, otp, session);
    }

    @GetMapping("/vendor/login")
    public String loadLogin() {
        return "vendor-login.html";
    }

    @GetMapping("/vendor/forgot-password")
    public String loadVendorForgotPassword() {
        return vendorService.loadForgotPasswordPage();
    }

    @PostMapping("/vendor/forgot-password")
    public String vendorForgotPassword(@RequestParam String email, HttpSession session) {
        return vendorService.sendResetOtp(email, session);
    }

    @GetMapping("/vendor/reset-password/{id}")
    public String loadVendorResetPassword(@PathVariable int id, ModelMap map) {
        return vendorService.loadResetPasswordPage(id, map);
    }

    @PostMapping("/vendor/reset-password")
    public String vendorResetPassword(@RequestParam int id, @RequestParam int otp,
            @RequestParam String password, @RequestParam String confirmPassword, HttpSession session) {
        return vendorService.resetPassword(id, otp, password, confirmPassword, session);
    }

    @PostMapping("/vendor/login")
    public String login(@RequestParam String email, @RequestParam String password, HttpSession session) {
        return vendorService.login(email, password, session);
    }

    @GetMapping("/vendor/home")
    public String loadHome(HttpSession session, ModelMap map) {
        return vendorService.loadHome(session, map);
    }

    @GetMapping("/vendor/store-front")
    public String loadVendorStoreFront(HttpSession session, ModelMap map) {
        return vendorService.loadStoreFront(session, map);
    }

    @PostMapping("/vendor/store-front/update")
    public String updateVendorStoreFront(@RequestParam String name, @RequestParam long mobile, HttpSession session) {
        return vendorService.updateStoreFront(name, mobile, session);
    }

    @GetMapping("/add-product")
    public String loadAddProduct(HttpSession session, org.springframework.ui.ModelMap map) {
        map.put("allSubCategories", categoryService.getAllSubCategories());
        return vendorService.laodAddProduct(session);
    }

    @PostMapping("/add-product")
    public String addProduct(Product product, HttpSession session) throws IOException {
        return vendorService.laodAddProduct(product, session);
    }

    @GetMapping("/manage-products")
    public String manageProducts(HttpSession session, ModelMap map) {
        return vendorService.manageProducts(session, map);
    }

    @GetMapping("/delete/{id}")
    public String delete(@PathVariable int id, HttpSession session) {
        return vendorService.delete(id, session);
    }

    @GetMapping("/edit/{id}")
    public String editProduct(@PathVariable int id, ModelMap map, HttpSession session) {
        map.put("allSubCategories", categoryService.getAllSubCategories());
        return vendorService.editProduct(id, map, session);
    }

    @PostMapping("/update-product")
    public String updateProduct(Product product, HttpSession session) throws IOException {
        return vendorService.updateProduct(product, session);
    }

    @GetMapping("/vendor/sales-report")
    public String vendorSalesReport(HttpSession session, ModelMap map) {
        return vendorService.loadSalesReport(session, map);
    }

    // API endpoint for AJAX polling (returns JSON only)
    @GetMapping("/vendor/sales-report-api")
    public org.springframework.http.ResponseEntity<java.util.Map<String, Object>> vendorSalesReportAPI(HttpSession session) {
        return vendorService.getSalesReportJSON(session);
    }

    // Backfill existing orders into reporting DB (called from Sync button)
    @PostMapping("/vendor/sync-reporting")
    public org.springframework.http.ResponseEntity<java.util.Map<String, Object>> vendorSyncReporting(HttpSession session) {
        return vendorService.syncReportingDb(session);
    }

    // ── Vendor marks order as PACKED — ready for delivery team pickup
    @PostMapping("/vendor/order/{id}/ready")
    @ResponseBody
    public org.springframework.http.ResponseEntity<java.util.Map<String, Object>> vendorMarkOrderReady(
            @PathVariable int id, HttpSession session) {
        return vendorService.markOrderReady(id, session);
    }

    // ── Vendor orders page
    @GetMapping("/vendor/orders")
    public String vendorOrders(HttpSession session, ModelMap map) {
        return vendorService.loadVendorOrders(session, map);
    }

    // ── CUSTOMER ─────────────────────────────────────────────────────────────

    @GetMapping("/customer/register")
    public String loadCustomerRegistration(ModelMap map, Customer customer) {
        return customerService.loadRegistration(map, customer);
    }

    @PostMapping("/customer/register")
    public String customerRegistration(@Valid Customer customer, BindingResult result, HttpSession session) {
        return customerService.registration(customer, result, session);
    }

    @GetMapping("/customer/otp/{id}")
    public String loadOtpPage1(@PathVariable int id, ModelMap map) {
        map.put("id", id);
        return "customer-otp.html";
    }

    @PostMapping("/customer/otp")
    public String verifyOtp1(@RequestParam int id, @RequestParam int otp, HttpSession session) {
        return customerService.verifyOtp(id, otp, session);
    }

    @GetMapping("/customer/login")
    public String loadCustomerLogin() {
        return "customer-login.html";
    }

    @GetMapping("/customer/forgot-password")
    public String loadCustomerForgotPassword() {
        return customerService.loadForgotPasswordPage();
    }

    @PostMapping("/customer/forgot-password")
    public String customerForgotPassword(@RequestParam String email, HttpSession session) {
        return customerService.sendResetOtp(email, session);
    }

    @GetMapping("/customer/reset-password/{id}")
    public String loadCustomerResetPassword(@PathVariable int id, ModelMap map) {
        return customerService.loadResetPasswordPage(id, map);
    }

    @PostMapping("/customer/reset-password")
    public String customerResetPassword(@RequestParam int id, @RequestParam int otp,
            @RequestParam String password, @RequestParam String confirmPassword, HttpSession session) {
        return customerService.resetPassword(id, otp, password, confirmPassword, session);
    }

    @PostMapping("/customer/login")
    public String customerLogin(@RequestParam String email, @RequestParam String password, HttpSession session) {
        return customerService.login(email, password, session);
    }

    @GetMapping("/customer/home")
    public String loadCustomerHome(HttpSession session, ModelMap map) {
        return customerService.loadCustomerHome(session, map);
    }

    @GetMapping({"/view-products", "/customer/view-products"})
    public String viewProducts(HttpSession session, ModelMap map) {
        return customerService.viewProducts(session, map);
    }

    @GetMapping("/search-products")
    public String searchProducts(@RequestParam(required = false) String query,
                                 HttpSession session, ModelMap map) {
        if (query != null && !query.isBlank()) {
            return customerService.search(query, session, map);
        }
        return customerService.searchProducts(session);
    }

    @PostMapping("/search-products")
    public String search(@RequestParam String query, HttpSession session, ModelMap map) {
        return customerService.search(query, session, map);
    }

    @GetMapping({"/view-cart", "/customer/view-cart"})
    public String viewCart(HttpSession session, ModelMap map) {
        return customerService.viewCart(session, map);
    }

    @GetMapping("/add-cart/{id}")
    public String addToCart(@PathVariable int id, HttpSession session) {
        return customerService.addToCart(id, session);
    }

    @GetMapping("/remove-from-cart/{id}")
    public String removeFromCart(@PathVariable int id, HttpSession session) {
        return customerService.removeFromCart(id, session);
    }

    @GetMapping("/increase/{id}")
    public String increase(@PathVariable int id, HttpSession session) {
        return customerService.increase(id, session);
    }

    @GetMapping("/decrease/{id}")
    public String decrease(@PathVariable int id, HttpSession session) {
        return customerService.decrease(id, session);
    }

    // ── AJAX endpoints — return JSON, no page reload ──────────────────────

    @PostMapping("/ajax/cart/increase/{id}")
    @ResponseBody
    public java.util.Map<String, Object> ajaxIncrease(@PathVariable int id, HttpSession session) {
        return customerService.ajaxIncrease(id, session);
    }

    @PostMapping("/ajax/cart/decrease/{id}")
    @ResponseBody
    public java.util.Map<String, Object> ajaxDecrease(@PathVariable int id, HttpSession session) {
        return customerService.ajaxDecrease(id, session);
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/ajax/cart/remove/{id}")
    @ResponseBody
    public java.util.Map<String, Object> ajaxRemove(@PathVariable int id, HttpSession session) {
        return customerService.ajaxRemove(id, session);
    }

    @GetMapping("/payment")
    public String payment(HttpSession session, ModelMap map) {
        return customerService.payment(session, map);
    }

    @GetMapping("/success")
    public String paymentSuccessPage(HttpSession session) {
        if (session.getAttribute(K_CUSTOMER) == null) {
            session.setAttribute(K_FAILURE, K_LOGIN_FIRST);
            return K_REDIRECT_CUSTOMER_LOGIN;
        }
        return "redirect:/customer/home";
    }

    @GetMapping("/order-success")
    public String orderSuccessPage(HttpSession session, ModelMap map) {
        if (session.getAttribute(K_CUSTOMER) == null) {
            session.setAttribute(K_FAILURE, K_LOGIN_FIRST);
            return K_REDIRECT_CUSTOMER_LOGIN;
        }
        // Pass last order details to the template
        Object orderId      = session.getAttribute("lastOrderId");
        Object amount       = session.getAttribute("lastOrderAmount");
        Object deliveryTime = session.getAttribute("lastOrderDeliveryTime");
        Object paymentMode  = session.getAttribute("lastOrderPaymentMode");
        Object subOrderIds  = session.getAttribute("lastSubOrderIds");  // e.g. "12,13,14"

        map.put("orderId",      orderId != null ? orderId : "—");
        map.put("orderAmount",  amount != null ? String.format("%.2f", (double) amount) : "—");
        map.put("deliveryTime", deliveryTime != null ? deliveryTime : "Standard (3–5 days)");
        map.put("paymentMode",  paymentMode != null ? paymentMode : "Cash on Delivery");
        // subOrderIds is a comma-separated string of all sub-order IDs
        map.put("subOrderIds",  subOrderIds != null ? subOrderIds.toString() : "");

        // GST amount — stored in session by CustomerService.paymentSuccess()
        Object gstAmount = session.getAttribute("lastOrderGst");
        map.put("gstAmount", gstAmount != null ? gstAmount : 0.0);

        // Clear after use so refreshing doesn't re-show
        session.removeAttribute("lastOrderId");
        session.removeAttribute("lastSubOrderIds");
        session.removeAttribute("lastOrderAmount");
        session.removeAttribute("lastOrderDeliveryTime");
        session.removeAttribute("lastOrderPaymentMode");
        session.removeAttribute("lastOrderGst");

        return "order-success.html";
    }

    @PostMapping("/success")
    public String paymentSuccess(
            @RequestParam(required=false) String razorpayPaymentId,
            @RequestParam(required=false) String razorpayOrderId,
            @RequestParam(required=false, defaultValue="Cash on Delivery") String paymentMode,
            @RequestParam(required=false) String deliveryTime,
            @RequestParam(required=false) String amount,
            @RequestParam(required=false) String deliveryPinCode,
            HttpSession session) {

        // Build Order manually — avoids Spring binding errors from the @ManyToOne Customer field
        Order order = new Order();
        order.setRazorpayPaymentId(razorpayPaymentId);
        order.setRazorpayOrderId(razorpayOrderId);
        order.setDeliveryTime(deliveryTime);
        order.setPaymentMode(paymentMode);
        order.setReplacementRequested(false);

        // ✅ FIX 1: Use the amount sent from the frontend (includes tomorrow delivery surcharge ₹129).
        //           Previously this recalculated from cart and always missed the surcharge.
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        double finalAmount = 0;
        if (amount != null && !amount.isBlank()) {
            try { finalAmount = Double.parseDouble(amount); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        }
        // Fallback to cart total if frontend amount is missing/unparseable
        if (finalAmount == 0 && customer != null && customer.getCart() != null) {
            for (Item item : customer.getCart().getItems()) finalAmount += item.getPrice();
        }
        order.setAmount(finalAmount);

        // Validate pin code is Indian before order is placed
        if (deliveryPinCode != null && !deliveryPinCode.isBlank()
                && !PinCodeValidator.isValid(deliveryPinCode.trim())) {
            session.setAttribute(K_FAILURE, PinCodeValidator.ERROR_MESSAGE);
            return "redirect:/payment";
        }

        // Email is sent inside CustomerService.paymentSuccess() — no duplicate needed here
        return customerService.paymentSuccess(order, deliveryPinCode, session);
    }

    // ── PIN CODE DELIVERABILITY CHECK ─────────────────────────────────────
    /**
     * GET /api/check-pincode?pinCode=560001
     * AJAX endpoint used by payment.html to validate cart items against pin code
     * restrictions set by vendors. Requires an active customer session.
     */
    @GetMapping("/api/check-pincode")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> checkPincode(
            @RequestParam String pinCode,
            HttpSession session) {

        Map<String, Object> res = new HashMap<>();
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);

        if (sessionCustomer == null) {
            res.put(K_HASRESTRICTIONS, false);
            res.put(K_BLOCKEDITEMS, Collections.emptyList());
            return ResponseEntity.ok(res);
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);
        String pin = pinCode.trim();

        // Reject non-Indian pin codes immediately
        if (!PinCodeValidator.isValid(pin)) {
            res.put(K_SUCCESS, false);
            res.put(K_HASRESTRICTIONS, false);
            res.put(K_BLOCKEDITEMS, Collections.emptyList());
            res.put(K_MESSAGE, PinCodeValidator.ERROR_MESSAGE);
            return ResponseEntity.badRequest().body(res);
        }

        boolean hasRestrictions = false;
        List<String> blockedItems = new ArrayList<>();

        for (Item item : customer.getCart().getItems()) {
            if (item.getProductId() == null) continue;
            Product product = productRepository.findById(item.getProductId()).orElse(null);
            if (product == null) continue;
            if (product.isRestrictedByPinCode()) {
                hasRestrictions = true;
                if (!product.isDeliverableTo(pin)) {
                    blockedItems.add(product.getName());
                }
            }
        }

        res.put(K_HASRESTRICTIONS, hasRestrictions);
        res.put(K_BLOCKEDITEMS,    blockedItems);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/view-orders")
    public String viewOrders(HttpSession session, ModelMap map) {
        return customerService.viewOrders(session, map);
    }

    @GetMapping({"/order-history", "/customer/order-history"})
    public String orderHistory(HttpSession session, ModelMap map) {
        return customerService.viewOrderHistory(session, map);
    }

    @GetMapping({"/track-orders", "/customer/track-orders"})
    public String trackOrders(HttpSession session, ModelMap map) {
        return customerService.trackOrders(session, map);
    }

    // ── SINGLE ORDER TRACKING ──────────────────────────────────────────────────
    @GetMapping("/track/{orderId}")
    public String trackSingleOrder(@PathVariable int orderId, HttpSession session, ModelMap map) {
        com.example.ekart.dto.Customer customer = (com.example.ekart.dto.Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, K_LOGIN_FIRST);
            return K_REDIRECT_CUSTOMER_LOGIN;
        }

        com.example.ekart.dto.Order order = orderTrackingService.getOrderForCustomer(orderId, session);
        if (order == null) {
            session.setAttribute(K_FAILURE, "Order not found or access denied");
            return "redirect:/customer/order-history";
        }

        map.put("order", order);
        map.put("trackingStatus", order.getTrackingStatus());
        map.put("progressPercent", order.getTrackingStatus().getProgressPercent());
        
        // Calculate estimated delivery (48 hours from order date)
        if (order.getOrderDate() != null && order.getTrackingStatus() != com.example.ekart.dto.TrackingStatus.DELIVERED) {
            map.put("estimatedDelivery", order.getOrderDate().plusHours(48));
        }

        return "track-single-order.html";
    }

    @GetMapping("/cancel-order/{id}")
    public String cancelOrder(@PathVariable int id, HttpSession session) {
        return customerService.cancelOrder(id, session);
    }

    @GetMapping("/request-replacement/{id}")
    public String requestReplacement(@PathVariable int id, HttpSession session) {
        return customerService.requestReplacement(id, session);
    }

    // Fix: /request-refund was missing — customer-refund-report.html posts here
    @PostMapping("/request-refund")
    public String requestRefund(@RequestParam int orderId,
                                @RequestParam String reason,
                                @RequestParam(required = false) String details,
                                HttpSession session) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, "Please login first");
            return K_REDIRECT_CUSTOMER_LOGIN;
        }
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            session.setAttribute(K_FAILURE, "Order not found");
            return "redirect:/view-orders";
        }
        String fullReason = (details != null && !details.isBlank()) ? reason + " — " + details : reason;
        java.util.Map<String, Object> result = refundService.createRefundRequest(
                order, customer, order.getTotalPrice(), fullReason);
        if ((Boolean) result.get(K_SUCCESS)) {
            int refundId = (int) result.get("refundId");
            session.setAttribute(K_SUCCESS, "Refund request submitted successfully!");
            return "redirect:/customer/refund/report/" + orderId + "?refundId=" + refundId;
        } else {
            session.setAttribute(K_FAILURE, result.get(K_MESSAGE).toString());
            return "redirect:/customer/refund/report/" + orderId;
        }
    }

    @PostMapping("/add-review")
    public String addReview(@RequestParam int productId, @RequestParam int rating,
            @RequestParam String comment, HttpSession session) {
        customerService.addReview(productId, rating, comment, session);
        return "redirect:/view-products";
    }

    @GetMapping("/customer/address")
    public String loadAddress(HttpSession session, ModelMap map) {
        return customerService.loadAddressPage(session, map);
    }

    @PostMapping("/customer/save-address")
    public String saveAddress(
            @RequestParam String recipientName,
            @RequestParam String houseStreet,
            @RequestParam String city,
            @RequestParam String state,
            @RequestParam String postalCode,
            HttpSession session) {
        if (!PinCodeValidator.isValid(postalCode)) {
            session.setAttribute(K_FAILURE, PinCodeValidator.ERROR_MESSAGE);
            return "redirect:/customer/address";
        }
        return customerService.saveAddress(recipientName, houseStreet, city, state, postalCode, session);
    }

    @GetMapping("/customer/delete-address/{id}")
    public String deleteAddress(@PathVariable int id, HttpSession session) {
        return customerService.deleteAddress(id, session);
    }

    // ── ADMIN ─────────────────────────────────────────────────────────────────

    @GetMapping("/admin/login")
    public String loadAdminLogin() {
        return "admin-login.html";
    }

    @PostMapping("/admin/login")
    public String adminLogin(@RequestParam String email, @RequestParam String password, HttpSession session) {
        return adminService.adminLogin(email, password, session);
    }

    @GetMapping("/admin/home")
    public String loadAdminHome(HttpSession session) {
        return adminService.loadAdminHome(session);
    }

    @GetMapping("/approve-products")
    public String approveProducts(HttpSession session, ModelMap map) {
        return adminService.approveProducts(session, map);
    }

    @GetMapping("/change/{id}")
    public String changeStatus(@PathVariable int id, HttpSession session) {
        return adminService.changeStatus(id, session);
    }

    // AJAX — toggle single product approval (no page refresh)
    @PostMapping("/api/admin/products/{id}/toggle-approval")
    @ResponseBody
    public java.util.Map<String, Object> toggleApprovalAjax(
            @PathVariable int id, HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        if (session.getAttribute(K_ADMIN) == null) {
            res.put(K_SUCCESS, false); res.put(K_MESSAGE, "Unauthorized"); return res;
        }
        com.example.ekart.dto.Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            res.put(K_SUCCESS, false); res.put(K_MESSAGE, "Product not found"); return res;
        }
        product.setApproved(!product.isApproved());
        productRepository.save(product);
        res.put(K_SUCCESS, true);
        res.put("approved", product.isApproved());
        res.put(K_MESSAGE, product.isApproved() ? "Approved" : "Hidden");
        return res;
    }

    // AJAX — approve ALL pending products at once
    @PostMapping("/api/admin/products/approve-all")
    @ResponseBody
    public java.util.Map<String, Object> approveAllPending(HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        if (session.getAttribute(K_ADMIN) == null) {
            res.put(K_SUCCESS, false); res.put(K_MESSAGE, "Unauthorized"); return res;
        }
        java.util.List<com.example.ekart.dto.Product> pending = productRepository.findAll()
                .stream().filter(p -> !p.isApproved()).toList();
        pending.forEach(p -> p.setApproved(true));
        productRepository.saveAll(pending);
        res.put(K_SUCCESS, true);
        res.put("approvedCount", pending.size());
        res.put(K_MESSAGE, "Approved " + pending.size() + " products");
        return res;
    }

    // AJAX — get live product counts
    @GetMapping("/api/admin/products/counts")
    @ResponseBody
    public java.util.Map<String, Object> productCounts(HttpSession session) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        if (session.getAttribute(K_ADMIN) == null) {
            res.put(K_SUCCESS, false); return res;
        }
        java.util.List<com.example.ekart.dto.Product> all = productRepository.findAll();
        long approved = all.stream().filter(com.example.ekart.dto.Product::isApproved).count();
        long pending  = all.stream().filter(p -> !p.isApproved()).count();
        res.put(K_SUCCESS, true);
        res.put("total",    all.size());
        res.put("approved", approved);
        res.put("pending",  pending);
        return res;
    }

    @GetMapping("/admin/search-users")
    public String adminSearchUsers(HttpSession session, ModelMap map) {
        return adminService.searchUsers(session, map);
    }

    @GetMapping("/refund-management")
    public String refundManagement(HttpSession session, ModelMap map) {
        return adminService.refundManagement(session, map);
    }

    @PostMapping("/process-refund/{orderId}")
    public String processRefund(@PathVariable int orderId, @RequestParam String action, HttpSession session) {
        return adminService.processRefund(orderId, action, session);
    }

    @GetMapping("/content-management")
    public String contentManagement(HttpSession session, ModelMap map) {
        return adminService.contentManagement(session, map);
    }

    @PostMapping("/update-banner")
    public String updateBanner(@RequestParam String bannerTitle, @RequestParam String bannerSubtitle, HttpSession session) {
        return adminService.updateBanner(bannerTitle, bannerSubtitle, session);
    }

    @GetMapping("/security-settings")
    public String securitySettings(HttpSession session, ModelMap map) {
        return adminService.securitySettings(session, map);
    }

    @PostMapping("/update-admin-password")
    public String updateAdminPassword(@RequestParam String currentPassword, @RequestParam String newPassword, 
                                       @RequestParam String confirmPassword, HttpSession session) {
        return adminService.updateAdminPassword(currentPassword, newPassword, confirmPassword, session);
    }

    @GetMapping("/analytics")
    public String analytics(HttpSession session, ModelMap map) {
        return adminService.analytics(session, map);
    }

    @GetMapping("/user-spending")
    public String userSpending(HttpSession session, ModelMap map) {
        if (session.getAttribute(K_ADMIN) == null) {
            session.setAttribute(K_FAILURE, "Please login as admin");
            return "redirect:/admin/login";
        }

        List<Customer> allCustomers = customerRepository.findAll();

        // Build per-customer spending rows — only DELIVERED orders count
        List<java.util.Map<String, Object>> spendingData = new java.util.ArrayList<>();
        double platformTotal = 0;
        int activeCustomers = 0;

        for (Customer c : allCustomers) {
            List<com.example.ekart.dto.Order> delivered = orderRepository.findByCustomer(c)
                    .stream()
                    .filter(o -> o.getTrackingStatus() == com.example.ekart.dto.TrackingStatus.DELIVERED)
                    .toList();

            double totalSpent = delivered.stream()
                    .mapToDouble(com.example.ekart.dto.Order::getAmount).sum();
            int orderCount = delivered.size();
            double avgOrder = orderCount > 0 ? totalSpent / orderCount : 0;

            java.util.Map<String, Object> row = new java.util.HashMap<>();
            row.put("name",       c.getName());
            row.put("email",      c.getEmail());
            row.put("orderCount", orderCount);
            row.put(K_TOTALSPENT, totalSpent);
            row.put("avgOrder",   avgOrder);
            spendingData.add(row);

            platformTotal += totalSpent;
            if (orderCount > 0) activeCustomers++;
        }

        // Sort by totalSpent descending — top spenders first
        spendingData.sort((a, b) -> Double.compare(
                ((Number) b.get(K_TOTALSPENT)).doubleValue(),
                ((Number) a.get(K_TOTALSPENT)).doubleValue()));

        double avgSpendPerCustomer = allCustomers.isEmpty() ? 0
                : platformTotal / allCustomers.size();

        map.put("spendingData",         spendingData);
        map.put("platformTotal",        platformTotal);
        map.put("totalCustomers",       allCustomers.size());
        map.put("activeCustomers",      activeCustomers);
        map.put("avgSpendPerCustomer",  avgSpendPerCustomer);

        return "user-spending.html";
    }

    // ── BANNER CONTENT MANAGEMENT (Admin Only) ─────────────────────────────────

    @GetMapping("/admin/content")
    public String adminContent(HttpSession session, ModelMap map) {
        return bannerService.loadContentPage(session, map);
    }

    @PostMapping("/admin/content/add")
    public String addBanner(@RequestParam String title, @RequestParam String imageUrl,
                            @RequestParam(required = false) String linkUrl, HttpSession session) {
        return bannerService.addBanner(title, imageUrl, linkUrl, session);
    }

    @PostMapping("/admin/content/add-upload")
    public String addBannerWithUpload(
            @RequestParam String title,
            @RequestParam("imageFile") MultipartFile imageFile,
            @RequestParam(required = false) String linkUrl,
            HttpSession session) {
        return bannerService.addBannerWithUpload(title, imageFile, linkUrl, session);
    }

    @PostMapping("/admin/content/toggle/{id}")
    public String toggleBanner(@PathVariable int id, HttpSession session) {
        return bannerService.toggleBanner(id, session);
    }

    @PostMapping("/admin/content/delete/{id}")
    public String deleteBanner(@PathVariable int id, HttpSession session) {
        return bannerService.deleteBanner(id, session);
    }

    @PostMapping("/admin/content/toggle-home/{id}")
    public String toggleBannerHome(@PathVariable int id, HttpSession session) {
        return bannerService.toggleShowOnHome(id, session);
    }

    @PostMapping("/admin/content/toggle-customer-home/{id}")
    public String toggleBannerCustomerHome(@PathVariable int id, HttpSession session) {
        return bannerService.toggleShowOnCustomerHome(id, session);
    }

    @PostMapping("/admin/content/update/{id}")
    public String updateBannerDetails(@PathVariable int id, @RequestParam String title, 
                                       @RequestParam String imageUrl, @RequestParam(required = false) String linkUrl,
                                       HttpSession session) {
        return bannerService.updateBanner(id, title, imageUrl, linkUrl, session);
    }

    // ── USER ADMIN / RBAC MANAGEMENT (Admin Only) ─────────────────────────────

    @GetMapping("/admin/security")
    public String adminSecurity(HttpSession session, ModelMap map) {
        return userAdminService.loadSecurityPage(session, map);
    }

    @PostMapping("/admin/security/update-role/{id}")
    public String updateUserRole(@PathVariable int id, @RequestParam String role, HttpSession session) {
        return userAdminService.updateUserRole(id, role, session);
    }

    @GetMapping("/product/{id}")
    public String viewProductDetail(@PathVariable int id, HttpSession session, ModelMap map) {
        return customerService.viewProductDetail(id, session, map);
    }

    // ── SHARED ────────────────────────────────────────────────────────────────

    // ── ADMIN DELETE CUSTOMER / VENDOR ──────────────────────────────────
    @GetMapping("/admin/delete-customer/{id}")
    public String adminDeleteCustomer(@PathVariable int id, HttpSession session) {
        return adminService.deleteCustomer(id, session);
    }

    @GetMapping("/admin/delete-vendor/{id}")
    public String adminDeleteVendor(@PathVariable int id, HttpSession session) {
        return adminService.deleteVendor(id, session);
    }

    @GetMapping({"/logout", "/customer/logout", "/admin/logout", "/vendor/logout"})
    public String logout(HttpSession session) {
        return adminService.logout(session);
    }

    // ── DELETE ACCOUNT ──────────────────────────────────────────────────
    @GetMapping("/customer/delete-account")
    public String deleteAccount(HttpSession session) {
        return customerService.deleteAccount(session);
    }

    @GetMapping("/stock-alerts")
    public String viewStockAlerts(HttpSession session, ModelMap map) {
        return stockAlertService.viewStockAlerts(session, map);
    }

    @GetMapping("/acknowledge-alert/{id}")
    public String acknowledgeAlert(@PathVariable int id, HttpSession session) {
        return stockAlertService.acknowledgeAlert(id, session);
    }
}