package com.example.ekart.controller;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.razorpay.Order;
import com.example.ekart.dto.Cart;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Vendor;
import com.example.ekart.helper.CloudinaryHelper;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.service.AdminService;
import com.example.ekart.service.CustomerService;
import com.example.ekart.service.VendorService;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;

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
    com.example.ekart.helper.EmailSender emailSender; // Add this line

	@Autowired
	com.example.ekart.service.StockAlertService stockAlertService;

	@GetMapping
	public String loadHomePage() {
		return "home.html";
	}

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
		return vendorService.loadOtpPage(id,map);
	}

	@GetMapping("/remove-from-cart/{id}")
public String removeFromCart(@PathVariable int id, HttpSession session) {
    return customerService.removeFromCart(id, session);
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
	public String vendorResetPassword(@RequestParam int id, @RequestParam int otp, @RequestParam String password,
			@RequestParam String confirmPassword, HttpSession session) {
		return vendorService.resetPassword(id, otp, password, confirmPassword, session);
	}

	@PostMapping("/vendor/login")
	public String login(@RequestParam String email, @RequestParam String password, HttpSession session) {
		return  vendorService.login(email, password, session);
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

	@GetMapping("/logout")
	public String logout(HttpSession session) {
		return adminService.logout(session);
	}

	@GetMapping("/add-product")
	public String loadAddProduct(HttpSession session) {
		return vendorService.laodAddProduct(session);
	}

	@PostMapping("/add-product")
	public String addProduct(Product product, HttpSession session) throws IOException {
	return vendorService.laodAddProduct(product,session);

	}

	@GetMapping("/manage-products")
	public String manageProducts(HttpSession session, ModelMap map) {
		return vendorService.manageProducts(session,map);
	}

	@GetMapping("/delete/{id}")
	public String delete(@PathVariable int id, HttpSession session) {
		return vendorService.delete(id,session);
	}

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
	public String customerResetPassword(@RequestParam int id, @RequestParam int otp, @RequestParam String password,
			@RequestParam String confirmPassword, HttpSession session) {
		return customerService.resetPassword(id, otp, password, confirmPassword, session);
	}

	@PostMapping("/customer/login")
	public String customerLogin(@RequestParam String email, @RequestParam String password, HttpSession session) {
		return customerService.login(email, password, session);
	}

	@GetMapping("/customer/home")
	public String loadCustomerHome(HttpSession session) {
		return customerService.loadCustomerHome(session);
	}

	@GetMapping("/admin/login")
	public String loadAdminLogin() {
		return "admin-login.html";
	}

	@PostMapping("/admin/login")
	public String adminLogin(@RequestParam String email, @RequestParam String password, HttpSession session) {
		return adminService.adminLogin(email,password,session);
	}

	@GetMapping("/admin/home")
	public String loadAdminHome(HttpSession session) {
		return adminService.loadAdminHome(session);
	}

	@GetMapping("/approve-products")
	public String approveProducts(HttpSession session, ModelMap map) {
		return adminService.approveProducts(session,map);
	}

	@GetMapping("/change/{id}")
	public String changeStatus(@PathVariable int id, HttpSession session) {
		return adminService.changeStatus(id,session);
	}

	@GetMapping("/edit/{id}")
	public String editProduct(@PathVariable int id, ModelMap map, HttpSession session) {
		return vendorService.editProduct(id,map,session);
	}

	@PostMapping("/update-product")
	public String updateProduct(Product product, HttpSession session) throws IOException {
		return vendorService.updateProduct(product,session);
	}

	@GetMapping("/view-products")
	public String viewProducts(HttpSession session, ModelMap map) {
		return customerService.viewProducts(session,map);
	}

	@GetMapping("/search-products")
	public String searchProducts(HttpSession session) {
		return customerService.searchProducts(session);
	}

	@PostMapping("/search-products")
	public String search(@RequestParam String query, HttpSession session, ModelMap map) {
		return customerService.search(query,session,map);
	}

	@GetMapping("/view-cart")
	public String viewCart(HttpSession session, ModelMap map) {
		return customerService.viewCart(session,map);
	}

	@GetMapping("/add-cart/{id}")
	public String addToCart(@PathVariable int id, HttpSession session) {
		return customerService.addToCart(id,session);
	}

	@GetMapping("/increase/{id}")
	public String increase(@PathVariable int id, HttpSession session) {
	return customerService.increase(id,session);
	}

	@GetMapping("/decrease/{id}")
	public String decrease(@PathVariable int id, HttpSession session) {
		return customerService.decrease(id,session);
	}

	@GetMapping("/payment")
	public String payment(HttpSession session, ModelMap map) {
		return customerService.payment(session,map);
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
    public String paymentSuccess(com.example.ekart.dto.Order order, HttpSession session) {
	return customerService.paymentSuccess(order, session);
}
	@GetMapping("/view-orders")
	public String viewOrders(HttpSession session, ModelMap map) {
		return customerService.viewOrders(session,map);
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
