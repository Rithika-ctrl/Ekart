package com.example.ekart.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Vendor;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.service.AdminService;
import com.example.ekart.service.BannerService;
import com.example.ekart.service.CustomerService;
import com.example.ekart.service.VendorService;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@Controller
public class EkartController {

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
public String paymentSuccess(Order order, @RequestParam(required=false, defaultValue="Cash on Delivery") String paymentMode, HttpSession session) {
    Customer customer = (Customer) session.getAttribute("customer");
    double finalAmount = 0;
    if (customer != null && customer.getCart() != null) {
        for (Item item : customer.getCart().getItems()) finalAmount += item.getPrice();
    }
    order.setAmount(finalAmount);

    String result = customerService.paymentSuccess(order, session);  // clears cart, saves order

    // ✅ Fetch the saved order to get the cloned items
    if (customer != null && result.contains("home")) {
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
    public String saveAddress(@RequestParam String address, HttpSession session) {
        return customerService.saveAddress(address, session);
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

    // ── SHARED ────────────────────────────────────────────────────────────────

    @GetMapping({"/logout", "/customer/logout", "/admin/logout", "/vendor/logout"})
    public String logout(HttpSession session) {
        return adminService.logout(session);
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