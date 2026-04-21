package com.example.ekart.service;
import java.time.LocalDateTime;

import java.util.List;
import java.time.LocalDate;

import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import com.example.ekart.dto.Product;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.dto.Wishlist;
import com.example.ekart.dto.Refund;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.VendorRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.WishlistRepository;
import com.example.ekart.repository.RefundRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class AdminService {

	private static final String REDIRECT_ADMIN_LOGIN = "redirect:/admin/login";
	private static final String LOGIN_FIRST = "Login First";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final AdminAuthService adminAuthService;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final VendorRepository vendorRepository;
    private final OrderRepository orderRepository;
    private final WishlistRepository wishlistRepository;
    private final RefundRepository refundRepository;

    public AdminService(
            AdminAuthService adminAuthService,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            VendorRepository vendorRepository,
            OrderRepository orderRepository,
            WishlistRepository wishlistRepository,
            RefundRepository refundRepository) {
        this.adminAuthService = adminAuthService;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.vendorRepository = vendorRepository;
        this.orderRepository = orderRepository;
        this.wishlistRepository = wishlistRepository;
        this.refundRepository = refundRepository;
    }









	// private ItemRepository itemRepository; // unused

	// Banner text stored via @Value — set in application.properties or .env
	// No longer uses static fields (static fields reset on restart and are shared JVM-wide)
	@org.springframework.beans.factory.annotation.Value("${ekart.banner.title:Welcome to Ekart}")
	private String bannerTitle;

	@org.springframework.beans.factory.annotation.Value("${ekart.banner.subtitle:Your one-stop shopping destination}")
	private String bannerSubtitle;

	@org.springframework.beans.factory.annotation.Value("${admin.email:admin@ekart.com}")
	private String adminEmail;

	// ---------------- LOGOUT ----------------
	public String logout(HttpSession session) {
		session.invalidate(); // 🔥 clear all sessions safely
		return "redirect:/";
	}

	// ---------------- LOGIN ----------------
	public String adminLogin(String email, String password, HttpSession session) {

		// Use AdminAuthService for database-backed authentication with brute force protection
		com.example.ekart.dto.AuthenticationResult authResult = adminAuthService.authenticate(email, password);
		
		if (!authResult.isSuccess()) {
			session.setAttribute("failure", authResult.getMessage());
			return REDIRECT_ADMIN_LOGIN;
		}

		// Check if 2FA is required
		if (authResult.isRequires2FA()) {
			// In a web session context, we'd store adminId and require 2FA verification
			// For now, store in session and redirect to 2FA verification page
			session.setAttribute("adminId", authResult.getAdminId());
			session.setAttribute("requires2FA", true);
			session.setAttribute("info", "Please provide 2FA code from your authenticator app");
			return "redirect:/admin/verify-2fa";
		}

		// Authentication successful without 2FA
		session.setAttribute("admin", email);
		session.setAttribute("adminId", authResult.getAdminId());
		session.setAttribute("success", "Login Success as Admin");
		return "redirect:/admin/home";
	}

	// ---------------- HOME ----------------
	public String loadAdminHome(HttpSession session) {

		if (session.getAttribute("admin") != null)
			return "admin-home.html";

		session.setAttribute("failure", LOGIN_FIRST);
		return REDIRECT_ADMIN_LOGIN;
	}

	// ---------------- APPROVE PRODUCTS ----------------
	public String approveProducts(HttpSession session, ModelMap map) {

		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
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
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
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
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
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

	// ============ DELETE CUSTOMER ============
	@Transactional
	public String deleteCustomer(int id, HttpSession session) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
		}

		Customer customer = customerRepository.findById(id).orElse(null);
		if (customer == null) {
			session.setAttribute("failure", "Customer not found");
			return "redirect:/admin/search-users";
		}

		// 1. Delete wishlist entries
		List<Wishlist> wishlist = wishlistRepository.findByCustomer(customer);
		if (!wishlist.isEmpty()) { wishlistRepository.deleteAll(wishlist); wishlistRepository.flush(); }

		// 2. Delete refunds
		List<Refund> refunds = refundRepository.findByCustomer(customer);
		if (!refunds.isEmpty()) { refundRepository.deleteAll(refunds); refundRepository.flush(); }

		// 3. Delete orders (CascadeType.ALL handles order items)
		List<Order> orders = orderRepository.findByCustomer(customer);
		if (!orders.isEmpty()) { orderRepository.deleteAll(orders); orderRepository.flush(); }

		// 4. Delete customer (CascadeType.ALL handles cart + addresses)
		customerRepository.delete(customer);

		session.setAttribute("success", "Customer account deleted successfully");
		return "redirect:/admin/search-users";
	}

	// ============ DELETE VENDOR ============
	@Transactional
	public String deleteVendor(int id, HttpSession session) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
		}

		Vendor vendor = vendorRepository.findById(id).orElse(null);
		if (vendor == null) {
			session.setAttribute("failure", "Vendor not found");
			return "redirect:/admin/search-users";
		}

		// 1. Nullify vendor reference on products (don't delete products, just unlink)
		//    Products remain on platform but become unowned — admin can then delete them separately
		List<Product> products = productRepository.findAll().stream()
				.filter(p -> p.getVendor() != null && p.getVendor().getId() == vendor.getId())
				.toList();
		for (Product p : products) {
			p.setVendor(null);
			p.setApproved(false);
			productRepository.save(p);
		}

		// 2. Delete vendor
		vendorRepository.delete(vendor);

		session.setAttribute("success", "Vendor account deleted successfully");
		return "redirect:/admin/search-users";
	}

	// ============ REFUND MANAGEMENT ============
	public String refundManagement(HttpSession session, ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
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
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
		}

		Order order = orderRepository.findById(orderId).orElse(null);
		if (order == null) {
			session.setAttribute("failure", "Order not found");
			return "redirect:/refund-management";
		}

		if ("approve".equals(action)) {
			// ✅ FIX: Set TrackingStatus to REFUNDED so the order shows correctly
			//         everywhere — view-orders badge, track-single-order banner, etc.
			//         Previously only cleared replacementRequested but never updated status.
			order.setReplacementRequested(false);
			order.setTrackingStatus(TrackingStatus.REFUNDED);
			orderRepository.save(order);
			session.setAttribute("success", "Refund approved for Order #" + orderId);
		} else if ("deny".equals(action)) {
			order.setReplacementRequested(false);
			// Status stays as-is when denied — order is not refunded
			orderRepository.save(order);
			session.setAttribute("success", "Refund request denied for Order #" + orderId);
		}

		return "redirect:/refund-management";
	}

	// ============ CONTENT MANAGEMENT ============
	public String contentManagement(HttpSession session, ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
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
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
		}
		// Update instance fields (survives current session; restart resets to .properties defaults)
		this.bannerTitle = (title != null && !title.isBlank()) ? title : this.bannerTitle;
		this.bannerSubtitle = (subtitle != null && !subtitle.isBlank()) ? subtitle : this.bannerSubtitle;
		session.setAttribute("success", "Banner content updated successfully");
		return "redirect:/content-management";
	}

	// ============ SECURITY SETTINGS ============
	public String securitySettings(HttpSession session, ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
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
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
		}

		if (!newPassword.equals(confirmPassword)) {
			session.setAttribute("failure", "New passwords do not match");
			return "redirect:/security-settings";
		}

		if (newPassword.length() < 6) {
			session.setAttribute("failure", "Password must be at least 6 characters");
			return "redirect:/security-settings";
		}

		// Get adminId from session (set during login)
		Integer adminId = (Integer) session.getAttribute("adminId");
		if (adminId == null) {
			session.setAttribute("failure", "Admin ID not found. Please login again.");
			return REDIRECT_ADMIN_LOGIN;
		}

		// Use AdminAuthService to change password (validates current password via BCrypt)
		com.example.ekart.dto.PasswordChangeResult changeResult = 
			adminAuthService.changePassword(adminId, currentPassword, newPassword);

		if (!changeResult.isSuccess()) {
			session.setAttribute("failure", changeResult.getMessage());
			return "redirect:/security-settings";
		}

		session.setAttribute("success", "Password changed successfully");
		return "redirect:/security-settings";
	}

	// ============ ANALYTICS & REPORTS ============
	public String analytics(HttpSession session, ModelMap map) {
		if (session.getAttribute("admin") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_ADMIN_LOGIN;
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

