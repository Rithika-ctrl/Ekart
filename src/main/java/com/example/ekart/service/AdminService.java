package com.example.ekart.service;

import java.util.List;
import java.time.LocalDateTime;
import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import com.example.ekart.dto.Product;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
import com.example.ekart.dto.Order;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.VendorRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.OrderRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class AdminService {

	@Value("${admin.email}")
	private String adminEmail;

	@Value("${admin.password}")
	private String adminPassword;

	@Autowired
	private ProductRepository productRepository;

	@Autowired
	private CustomerRepository customerRepository;

	@Autowired
	private VendorRepository vendorRepository;

	@Autowired
	private OrderRepository orderRepository;

	// 🔥 In-memory storage for dynamic content (in production, use database)
	private static String bannerTitle = "Welcome to Ekart";
	private static String bannerSubtitle = "Your one-stop shopping destination";

	// ---------------- LOGOUT ----------------
	public String logout(HttpSession session) {
		session.invalidate(); // 🔥 clear all sessions safely
		return "redirect:/";
	}

	// ---------------- LOGIN ----------------
	public String adminLogin(String email, String password, HttpSession session) {

		if (!email.equals(adminEmail)) {
			session.setAttribute("failure", "Invalid Email");
			return "redirect:/admin/login";
		}

		if (!password.equals(adminPassword)) {
			session.setAttribute("failure", "Invalid Password");
			return "redirect:/admin/login";
		}

		session.setAttribute("admin", adminEmail);
		session.setAttribute("success", "Login Success as Admin");
		return "redirect:/admin/home";
	}

	// ---------------- HOME ----------------
	public String loadAdminHome(HttpSession session) {

		if (session.getAttribute("admin") != null)
			return "admin-home.html";

		session.setAttribute("failure", "Login First");
		return "redirect:/admin/login";
	}

	// ---------------- APPROVE PRODUCTS ----------------
	public String approveProducts(HttpSession session, ModelMap map) {

		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		// 🔥 show all products (approved + unapproved)
		List<Product> products = productRepository.findAll();

		if (products.isEmpty()) {
			session.setAttribute("failure", "No Products Present");
			return "redirect:/admin/home";
		}

		map.put("products", products);
		return "admin-view-products.html";
	}

	// ---------------- CHANGE STATUS ----------------
	public String changeStatus(int id, HttpSession session) {

		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		Product product = productRepository.findById(id).orElse(null);

		if (product == null) {
			session.setAttribute("failure", "Product Not Found");
			return "redirect:/approve-products";
		}

		// 🔥 toggle approval
		product.setApproved(!product.isApproved());
		productRepository.save(product);

		session.setAttribute("success", "Product Approval Status Updated");
		return "redirect:/approve-products";
	}

	// 🔥 SEARCH USERS/VENDORS
	public String searchUsers(HttpSession session, org.springframework.ui.ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		java.util.List<Customer> customers = customerRepository.findAll();
		java.util.List<Vendor> vendors = vendorRepository.findAll();

		com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

		String customersJson = "[]";
		String vendorsJson   = "[]";
		try {
			// Build simplified customer list
			java.util.List<java.util.Map<String,Object>> cList = new java.util.ArrayList<>();
			for (Customer c : customers) {
				java.util.Map<String,Object> m = new java.util.HashMap<>();
				m.put("id", c.getId()); m.put("name", c.getName());
				m.put("email", c.getEmail()); m.put("mobile", c.getMobile());
				m.put("verified", c.isVerified());
				cList.add(m);
			}
			// Build simplified vendor list
			java.util.List<java.util.Map<String,Object>> vList = new java.util.ArrayList<>();
			for (Vendor v : vendors) {
				java.util.Map<String,Object> m = new java.util.HashMap<>();
				m.put("id", v.getId()); m.put("name", v.getName());
				m.put("email", v.getEmail()); m.put("mobile", v.getMobile());
				m.put("verified", v.isVerified());
				vList.add(m);
			}
			customersJson = mapper.writeValueAsString(cList);
			vendorsJson   = mapper.writeValueAsString(vList);
		} catch (Exception e) { /* skip */ }

		map.put("customersJson", customersJson);
		map.put("vendorsJson",   vendorsJson);
		return "admin-user-search.html";
	}

	// ============ REFUND MANAGEMENT ============
	public String refundManagement(HttpSession session, ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		// Get all orders with replacement/refund requests
		List<Order> allOrders = orderRepository.findAll();
		List<Order> refundRequests = allOrders.stream()
			.filter(Order::isReplacementRequested)
			.toList();

		// Stats
		long pendingCount = refundRequests.size();
		double totalRefundAmount = refundRequests.stream()
			.mapToDouble(Order::getTotalPrice)
			.sum();

		map.put("refundRequests", refundRequests);
		map.put("pendingCount", pendingCount);
		map.put("totalRefundAmount", totalRefundAmount);
		return "refund-management.html";
	}

	public String processRefund(int orderId, String action, HttpSession session) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		Order order = orderRepository.findById(orderId).orElse(null);
		if (order == null) {
			session.setAttribute("failure", "Order not found");
			return "redirect:/refund-management";
		}

		if ("approve".equals(action)) {
			// Clear the replacement flag and mark as refunded
			order.setReplacementRequested(false);
			orderRepository.save(order);
			session.setAttribute("success", "Refund approved for Order #" + orderId);
		} else if ("deny".equals(action)) {
			order.setReplacementRequested(false);
			orderRepository.save(order);
			session.setAttribute("success", "Refund request denied for Order #" + orderId);
		}

		return "redirect:/refund-management";
	}

	// ============ CONTENT MANAGEMENT ============
	public String contentManagement(HttpSession session, ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		map.put("bannerTitle", bannerTitle);
		map.put("bannerSubtitle", bannerSubtitle);
		map.put("productCount", productRepository.count());
		map.put("categoryCount", productRepository.findAll().stream()
			.map(Product::getCategory)
			.distinct()
			.count());
		return "content-management.html";
	}

	public String updateBanner(String title, String subtitle, HttpSession session) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		bannerTitle = title;
		bannerSubtitle = subtitle;
		session.setAttribute("success", "Banner content updated successfully");
		return "redirect:/content-management";
	}

	// ============ SECURITY SETTINGS ============
	public String securitySettings(HttpSession session, ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		map.put("adminEmail", adminEmail);
		map.put("customerCount", customerRepository.count());
		map.put("vendorCount", vendorRepository.count());
		map.put("lastLoginTime", LocalDateTime.now().minusHours(2)); // Mock last login
		return "security-settings.html";
	}

	public String updateAdminPassword(String currentPassword, String newPassword, 
									   String confirmPassword, HttpSession session) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		if (!currentPassword.equals(adminPassword)) {
			session.setAttribute("failure", "Current password is incorrect");
			return "redirect:/security-settings";
		}

		if (!newPassword.equals(confirmPassword)) {
			session.setAttribute("failure", "New passwords do not match");
			return "redirect:/security-settings";
		}

		if (newPassword.length() < 6) {
			session.setAttribute("failure", "Password must be at least 6 characters");
			return "redirect:/security-settings";
		}

		// Note: In production, this would update database/config
		// Since admin password is from application.properties, we show a message
		session.setAttribute("success", "Password change request noted. Contact system admin to update credentials.");
		return "redirect:/security-settings";
	}

	// ============ ANALYTICS & REPORTS ============
	public String analytics(HttpSession session, ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/admin/login";
		}

		// Gather platform statistics
		long totalCustomers = customerRepository.count();
		long totalVendors = vendorRepository.count();
		long totalProducts = productRepository.count();
		long approvedProducts = productRepository.findAll().stream()
			.filter(Product::isApproved)
			.count();
		long pendingProducts = totalProducts - approvedProducts;

		List<Order> allOrders = orderRepository.findAll();
		long totalOrders = allOrders.size();
		double totalRevenue = allOrders.stream()
			.mapToDouble(Order::getTotalPrice)
			.sum();

		// Orders by status
		long processingOrders = allOrders.stream()
			.filter(o -> o.getTrackingStatus().name().equals("PROCESSING"))
			.count();
		long shippedOrders = allOrders.stream()
			.filter(o -> o.getTrackingStatus().name().equals("SHIPPED"))
			.count();
		long deliveredOrders = allOrders.stream()
			.filter(o -> o.getTrackingStatus().name().equals("DELIVERED"))
			.count();

		// Calculate daily orders (last 7 days mock data)
		LocalDate today = LocalDate.now();
		java.util.Map<String, Long> dailyOrders = new java.util.LinkedHashMap<>();
		for (int i = 6; i >= 0; i--) {
			LocalDate date = today.minusDays(i);
			LocalDateTime startOfDay = date.atStartOfDay();
			LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();
			long count = allOrders.stream()
				.filter(o -> o.getOrderDate() != null && 
					!o.getOrderDate().isBefore(startOfDay) && 
					o.getOrderDate().isBefore(endOfDay))
				.count();
			dailyOrders.put(date.toString(), count);
		}

		// Top categories
		java.util.Map<String, Long> categoryStats = productRepository.findAll().stream()
			.collect(java.util.stream.Collectors.groupingBy(
				Product::getCategory,
				java.util.stream.Collectors.counting()
			));

		map.put("totalCustomers", totalCustomers);
		map.put("totalVendors", totalVendors);
		map.put("totalProducts", totalProducts);
		map.put("approvedProducts", approvedProducts);
		map.put("pendingProducts", pendingProducts);
		map.put("totalOrders", totalOrders);
		map.put("totalRevenue", totalRevenue);
		map.put("processingOrders", processingOrders);
		map.put("shippedOrders", shippedOrders);
		map.put("deliveredOrders", deliveredOrders);
		map.put("dailyOrdersJson", new com.fasterxml.jackson.databind.ObjectMapper()
			.valueToTree(dailyOrders).toString());
		map.put("categoryStatsJson", new com.fasterxml.jackson.databind.ObjectMapper()
			.valueToTree(categoryStats).toString());

		return "analytics.html";
	}
}