package com.example.ekart.controller;

import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import com.opencsv.CSVReader;
import java.io.InputStreamReader;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
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
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Vendor;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.service.AdminService;
import com.example.ekart.service.BannerService;
import com.example.ekart.service.CustomerService;
import com.example.ekart.service.GuestService;
import com.example.ekart.service.VendorService;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@Controller
public class EkartController {

    // ── BULK PRODUCT INDUCTION ──────────────────────────────────────────────
    @PostMapping("/add-product/bulk-upload")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> bulkProductUpload(
            @RequestPart("file") MultipartFile file,
            HttpSession session) {
        Map<String, Object> res = new HashMap<>();
        if (session.getAttribute("vendor") == null) {
            res.put("success", false);
            res.put("message", "Login required");
            return ResponseEntity.status(401).body(res);
        }
        Vendor vendor = (Vendor) session.getAttribute("vendor");
        int added = 0, failed = 0;
        List<String> errors = new ArrayList<>();
        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            String[] header = reader.readNext();
            if (header == null) {
                res.put("success", false);
                res.put("message", "CSV is empty");
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
                    String sku = getCsvValue(row, colIdx, "sku");
                    String name = getCsvValue(row, colIdx, "product name");
                    String desc = getCsvValue(row, colIdx, "description");
                    String priceStr = getCsvValue(row, colIdx, "regular price");
                    String salePriceStr = getCsvValue(row, colIdx, "sale price");
                    String qtyStr = getCsvValue(row, colIdx, "stock quantity");
                    String category = getCsvValue(row, colIdx, "category");
                    String tags = getCsvValue(row, colIdx, "tags");
                    String imageUrl = getCsvValue(row, colIdx, "image url");
                    String weightStr = getCsvValue(row, colIdx, "weight (kg)");

                    // Required fields: name, sku, price, qty
                    if (name == null || sku == null || priceStr == null || qtyStr == null ||
                        name.trim().isEmpty() || sku.trim().isEmpty() || priceStr.trim().isEmpty() || qtyStr.trim().isEmpty()) {
                        failed++;
                        errors.add("Row " + rowNum + ": Missing required fields");
                        continue;
                    }
                    double price = Double.parseDouble(priceStr);
                    int qty = Integer.parseInt(qtyStr);
                    Product p = new Product();
                    p.setName(name.trim());
                    p.setDescription(desc != null ? desc.trim() : "");
                    p.setCategory(category != null && !category.isEmpty() ? category.trim() : "General");
                    p.setPrice(price);
                    p.setStock(qty);
                    p.setVendor(vendor);
                    p.setApproved(false);
                    // Optionally: set imageLink, extra fields if Product supports them
                    if (imageUrl != null && !imageUrl.isEmpty()) p.setImageLink(imageUrl.trim());
                    // If you add SKU, tags, sale price, weight to Product, set them here
                    productRepository.save(p);
                    added++;
                } catch (Exception ex) {
                    failed++;
                    errors.add("Row " + rowNum + ": " + ex.getMessage());
                }
            }
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Failed to process CSV: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
        res.put("success", true);
        res.put("message", "Added: " + added + ", Failed: " + failed + (errors.isEmpty() ? "" : ". Errors: " + String.join("; ", errors)));
        return ResponseEntity.ok(res);

    }

    // Helper for safe CSV value extraction (case-insensitive)
    private String getCsvValue(String[] row, Map<String, Integer> colIdx, String colName) {
        Integer idx = colIdx.get(colName.toLowerCase());
        if (idx == null || idx < 0 || idx >= row.length) return null;
        return row[idx];
    }

    @Autowired
    VendorService vendorService;

    @Autowired
    AdminService adminService;

    @Autowired
    ItemRepository itemRepository;

    @Autowired
    OrderRepository orderRepository;

    @Autowired
    CustomerService customerService;

    @Autowired
    CustomerRepository customerRepository;

    @Autowired
    com.example.ekart.helper.EmailSender emailSender;

    @Autowired
    com.example.ekart.service.StockAlertService stockAlertService;

    @Autowired
    com.example.ekart.service.OrderTrackingService orderTrackingService;

    @Autowired
    BannerService bannerService;

    @Autowired
    com.example.ekart.service.UserAdminService userAdminService;

    @Autowired
    GuestService guestService;

    @Autowired
    ProductRepository productRepository;

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
        map.put("banners", bannerService.getActiveBanners());
        return "home.html";
    }

    // ── ERROR PAGES ───────────────────────────────────────────────────────────

    @GetMapping("/403")
    public String loadForbiddenPage() {
        return "403.html";
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
    public String loadAddProduct(HttpSession session) {
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
    public String searchProducts(HttpSession session) {
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
        if (session.getAttribute("customer") == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }
        return "redirect:/customer/home";
    }

    @GetMapping("/order-success")
    public String orderSuccessPage(HttpSession session) {
        if (session.getAttribute("customer") == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }
        return "order-success.html";
    }

    @PostMapping("/success")
    public String paymentSuccess(
            @RequestParam(required=false) String razorpay_payment_id,
            @RequestParam(required=false) String razorpay_order_id,
            @RequestParam(required=false, defaultValue="Cash on Delivery") String paymentMode,
            @RequestParam(required=false) String deliveryTime,
            @RequestParam(required=false) String amount,
            @RequestParam(required=false) String deliveryPinCode,
            HttpSession session) {

        // Build Order manually — avoids Spring binding errors from the @ManyToOne Customer field
        Order order = new Order();
        order.setRazorpay_payment_id(razorpay_payment_id);
        order.setRazorpay_order_id(razorpay_order_id);
        order.setDeliveryTime(deliveryTime);
        order.setPaymentMode(paymentMode);

        // ✅ FIX 1: Use the amount sent from the frontend (includes tomorrow delivery surcharge ₹129).
        //           Previously this recalculated from cart and always missed the surcharge.
        Customer customer = (Customer) session.getAttribute("customer");
        double finalAmount = 0;
        if (amount != null && !amount.isBlank()) {
            try { finalAmount = Double.parseDouble(amount); } catch (Exception ignored) {}
        }
        // Fallback to cart total if frontend amount is missing/unparseable
        if (finalAmount == 0 && customer != null && customer.getCart() != null) {
            for (Item item : customer.getCart().getItems()) finalAmount += item.getPrice();
        }
        order.setAmount(finalAmount);

        String result = customerService.paymentSuccess(order, deliveryPinCode, session);

        // ✅ FIX 2: Check result contains "order-success" (not "home") since we now redirect there.
        if (customer != null && result.contains("order-success")) {
            try {
                Order savedOrder = orderRepository.findById(order.getId()).orElse(null);
                List<Item> orderItems = savedOrder != null ? savedOrder.getItems() : List.of();
                emailSender.sendOrderConfirmation(customer, finalAmount, order.getId(),
                        paymentMode, order.getDeliveryTime(), orderItems);
            } catch (Exception e) {
                System.err.println("Order confirmation email failed: " + e.getMessage());
            }
        }
        return result;
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
        Customer sessionCustomer = (Customer) session.getAttribute("customer");

        if (sessionCustomer == null) {
            res.put("hasRestrictions", false);
            res.put("blockedItems", Collections.emptyList());
            return ResponseEntity.ok(res);
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);
        String pin = pinCode.trim();

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

        res.put("hasRestrictions", hasRestrictions);
        res.put("blockedItems",    blockedItems);
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
        com.example.ekart.dto.Customer customer = (com.example.ekart.dto.Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }

        com.example.ekart.dto.Order order = orderTrackingService.getOrderForCustomer(orderId, session);
        if (order == null) {
            session.setAttribute("failure", "Order not found or access denied");
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

    @PostMapping("/admin/content/toggle/{id}")
    public String toggleBanner(@PathVariable int id, HttpSession session) {
        return bannerService.toggleBanner(id, session);
    }

    @PostMapping("/admin/content/delete/{id}")
    public String deleteBanner(@PathVariable int id, HttpSession session) {
        return bannerService.deleteBanner(id, session);
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