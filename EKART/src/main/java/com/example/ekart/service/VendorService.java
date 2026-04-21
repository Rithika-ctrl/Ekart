package com.example.ekart.service;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/service/VendorService.java
// REPLACE your existing file with this complete version.
// Changes from original:
//   1. Added imports for TrackingEventLog, TrackingStatus, TrackingEventLogRepository
//   2. Added @Autowired for trackingEventLogRepository
//   3. Added markOrderReady() method — vendor marks order as PACKED
//   4. Added loadVendorOrders() method — vendor sees their orders
// ================================================================

import com.example.ekart.helper.PinCodeValidator;

import java.io.IOException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;

import com.example.ekart.dto.Product;
import com.example.ekart.dto.Vendor;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingEventLog;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.CloudinaryHelper;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.VendorRepository;
import com.example.ekart.repository.TrackingEventLogRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import com.example.ekart.dto.SalesReport;
import com.example.ekart.repository.SalesReportRepository;
import com.example.ekart.reporting.ReportingService;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;

import com.example.ekart.dto.Item;


@Service
@Transactional
public class VendorService {

	private static final Logger LOGGER = LoggerFactory.getLogger(VendorService.class);

	private static final String REDIRECT_VENDOR_LOGIN = "redirect:/vendor/login";
	private static final String REDIRECT_VENDOR_HOME = "redirect:/vendor/home";
	private static final String REDIRECT_VENDOR_STOREFRONT = "redirect:/vendor/store-front";
	private static final String LOGIN_FIRST = "Login First";

    /**
     * Groups all VendorService dependencies into a single injectable object,
     * keeping the constructor parameter count within the S107 limit of 7.
     * {@code @Component} lets Spring discover and populate this record via
     * its canonical constructor — no manual @Bean factory needed.
     */
    @org.springframework.stereotype.Component
    public record Dependencies(
            VendorRepository vendorRepository,
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CloudinaryHelper cloudinaryHelper,
            StockAlertService stockAlertService,
            BackInStockService backInStockService,
            EmailSender emailSender,
            ItemRepository itemRepository,
            SalesReportRepository salesReportRepository,
            ReportingService reportingService,
            TrackingEventLogRepository trackingEventLogRepository,
            OtpService otpService
    ) {}

    // ── Injected dependencies ────────────────────────────────────────────────
    private final VendorRepository vendorRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CloudinaryHelper cloudinaryHelper;
    private final StockAlertService stockAlertService;
    private final BackInStockService backInStockService;
    private final EmailSender emailSender;
    private final ItemRepository itemRepository;
    private final SalesReportRepository salesReportRepository;
    private final ReportingService reportingService;
    private final TrackingEventLogRepository trackingEventLogRepository;
    private final OtpService otpService;

    public VendorService(Dependencies deps) {
        this.vendorRepository             = deps.vendorRepository();
        this.orderRepository              = deps.orderRepository();
        this.productRepository            = deps.productRepository();
        this.cloudinaryHelper             = deps.cloudinaryHelper();
        this.stockAlertService            = deps.stockAlertService();
        this.backInStockService           = deps.backInStockService();
        this.emailSender                  = deps.emailSender();
        this.itemRepository               = deps.itemRepository();
        this.salesReportRepository        = deps.salesReportRepository();
        this.reportingService             = deps.reportingService();
        this.trackingEventLogRepository   = deps.trackingEventLogRepository();
        this.otpService                   = deps.otpService();
    }












    // ── NEW: for delivery system ──────────────────────────────────
    // ─────────────────────────────────────────────────────────────

    // ── NEW: OTP Service (secure OTP management) ──────────────────
    // ─────────────────────────────────────────────────────────────

	// ---------------- REGISTER ----------------
	public String loadRegistration(ModelMap map, Vendor vendor) {
		map.put("vendor", vendor);
		return "vendor-register.html";
	}

    private String generateVendorCode(int vendorId) {
        return String.format("VND-%05d", vendorId);
    }

	public String registration(@Valid Vendor vendor, BindingResult result, HttpSession session) {

		if (!vendor.getPassword().equals(vendor.getConfirmPassword()))
			result.rejectValue("confirmPassword", "error.confirmPassword",
					"* Password and Confirm Password should match");

		// Allow re-registration if email exists but NOT verified
		Vendor existing = vendorRepository.findByEmail(vendor.getEmail());
		if (existing != null && existing.isVerified())
			result.rejectValue("email", "error.email", "* Email already exists. Please login instead.");

		if (result.hasErrors())
			return "vendor-register.html";

		// 🔒 NEW: Use secure OTP service instead of plain Random
		vendor.setPassword(AES.encrypt(vendor.getPassword()));
		vendor.setVerified(false);

		vendorRepository.save(vendor);

        String vendorCode = generateVendorCode(vendor.getId());
        vendor.setVendorCode(vendorCode);
        vendorRepository.save(vendor);

		try {
			// Generate secure OTP (BCrypt hashed, stored in AuthenticationOtp table)
			String plainOtp = otpService.generateAndStoreOtp(vendor.getEmail(), OtpService.PURPOSE_VENDOR_REGISTER);
			// Send plain OTP to email (never stored in plain text)
			emailSender.sendVendorOtpSecure(vendor, plainOtp);
		} catch (Exception e) {
			LOGGER.warn("Vendor OTP email failed: {}", e.getMessage(), e);
		}

		session.setAttribute("success", "OTP Sent Successfully to your email");
		return "redirect:/vendor/otp/" + vendor.getId();
	}

	// ---------------- OTP PAGE ----------------
	public String loadOtpPage(int id, ModelMap map) {
		map.put("id", id);
		return "vendor-otp.html";
	}

	// ---------------- OTP VERIFY ----------------
	public String verifyOtp(int id, int otp, HttpSession session) {

		Vendor vendor = vendorRepository.findById(id).orElseThrow();

		// 🔒 NEW: Verify OTP using secure service (hashed comparison)
		OtpService.VerificationResult result = otpService.verifyOtp(vendor.getEmail(), String.format("%06d", otp), OtpService.PURPOSE_VENDOR_REGISTER);
		
		if (result.success) {
			vendor.setVerified(true);
			vendorRepository.save(vendor);
			session.setAttribute("success", "Vendor Verified Successfully");
			return "redirect:/";
		}

		session.setAttribute("failure", result.message);
		return "redirect:/vendor/otp/" + id;
	}

	// ---------------- LOGIN ----------------
	public String login(String email, String password, HttpSession session) {

		Vendor vendor = vendorRepository.findByEmail(email);

		if (vendor == null) {
			session.setAttribute("failure", "Invalid Email");
			return REDIRECT_VENDOR_LOGIN;
		}

		if (!AES.decrypt(vendor.getPassword()).equals(password)) {
			session.setAttribute("failure", "Invalid Password");
			return REDIRECT_VENDOR_LOGIN;
		}

		if (!vendor.isVerified()) {

			try {
				// 🔒 NEW: Use secure OTP service to resend
				String plainOtp = otpService.resendOtp(vendor.getEmail(), OtpService.PURPOSE_VENDOR_REGISTER);
				emailSender.sendVendorOtpSecure(vendor, plainOtp);
			} catch (Exception e) {
				LOGGER.warn("Vendor OTP resend email failed: {}", e.getMessage(), e);
			}

			session.setAttribute("success", "OTP Sent to your email. Please verify first.");
			return "redirect:/vendor/otp/" + vendor.getId();
		}

		session.setAttribute("vendor", vendor);
		session.setAttribute("success", "Login Successful");
		return REDIRECT_VENDOR_HOME;
	}

	public String loadForgotPasswordPage() {
		return "vendor-forgot-password.html";
	}

	public String sendResetOtp(String email, HttpSession session) {
		Vendor vendor = vendorRepository.findByEmail(email);
		if (vendor == null) {
			session.setAttribute("failure", "No account found with this email");
			return "redirect:/vendor/forgot-password";
		}

		try {
			// 🔒 NEW: Use secure OTP service
			String plainOtp = otpService.generateAndStoreOtp(vendor.getEmail(), OtpService.PURPOSE_PASSWORD_RESET);
			emailSender.sendVendorOtpSecure(vendor, plainOtp);
		} catch (Exception e) {
			LOGGER.warn("Vendor password reset OTP email failed: {}", e.getMessage(), e);
		}

		session.setAttribute("success", "OTP sent to your registered email");
		return "redirect:/vendor/reset-password/" + vendor.getId();
	}

	public String loadResetPasswordPage(int id, ModelMap map) {
		map.put("id", id);
		return "vendor-reset-password.html";
	}

	public String resetPassword(int id, int otp, String password, String confirmPassword, HttpSession session) {
		Vendor vendor = vendorRepository.findById(id).orElse(null);
		if (vendor == null) {
			session.setAttribute("failure", "Invalid reset request");
			return "redirect:/vendor/forgot-password";
		}

		// 🔒 NEW: Verify OTP using secure service (hashed comparison)
		OtpService.VerificationResult result = otpService.verifyOtp(vendor.getEmail(), String.format("%06d", otp), OtpService.PURPOSE_PASSWORD_RESET);
		if (!result.success) {
			session.setAttribute("failure", result.message);
			return "redirect:/vendor/reset-password/" + id;
		}

		if (password == null || confirmPassword == null || !password.equals(confirmPassword)) {
			session.setAttribute("failure", "Password and Confirm Password should match");
			return "redirect:/vendor/reset-password/" + id;
		}

		String passwordRegex = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
		if (!password.matches(passwordRegex)) {
			session.setAttribute("failure",
					"Password must have 8+ characters with uppercase, lowercase, number and special character");
			return "redirect:/vendor/reset-password/" + id;
		}

		vendor.setPassword(AES.encrypt(password));
		vendorRepository.save(vendor);

		session.setAttribute("success", "Password reset successful. Please login");
		return REDIRECT_VENDOR_LOGIN;
	}

	// ---------------- HOME ----------------
	public String loadHome(HttpSession session) {
		if (session.getAttribute("vendor") != null)
			return "vendor-home.html";

		session.setAttribute("failure", LOGIN_FIRST);
		return REDIRECT_VENDOR_LOGIN;
	}

	public String loadHome(HttpSession session, ModelMap map) {
		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		int alertCount = stockAlertService.getUnacknowledgedAlerts(vendor).size();
		map.put("alertCount", alertCount);

		return "vendor-home.html";
	}

	// ---------------- STORE FRONT ----------------
	public String loadStoreFront(HttpSession session, ModelMap map) {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		Vendor sessionVendor = (Vendor) session.getAttribute("vendor");
		Vendor vendor = vendorRepository.findById(sessionVendor.getId()).orElse(sessionVendor);
		session.setAttribute("vendor", vendor);

		int productCount = productRepository.findByVendor(vendor).size();
		int alertCount = stockAlertService.getUnacknowledgedAlerts(vendor).size();

		map.put("vendor", vendor);
		map.put("productCount", productCount);
		map.put("alertCount", alertCount);

		return "vendor-store-front.html";
	}

	public String updateStoreFront(String name, long mobile, HttpSession session) {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		String updatedName = name == null ? "" : name.trim();
		if (updatedName.length() < 5 || updatedName.length() > 30) {
			session.setAttribute("failure", "Name must be between 5 and 30 characters");
			return REDIRECT_VENDOR_STOREFRONT;
		}

		if (mobile < 6000000000L || mobile > 9999999999L) {
			session.setAttribute("failure", "Enter a valid mobile number");
			return REDIRECT_VENDOR_STOREFRONT;
		}

		Vendor sessionVendor = (Vendor) session.getAttribute("vendor");
		Vendor vendor = vendorRepository.findById(sessionVendor.getId()).orElse(sessionVendor);

		Vendor existingMobileVendor = vendorRepository.findByMobile(mobile);
		if (existingMobileVendor != null && existingMobileVendor.getId() != vendor.getId()) {
			session.setAttribute("failure", "Mobile number already exists");
			return REDIRECT_VENDOR_STOREFRONT;
		}

		vendor.setName(updatedName);
		vendor.setMobile(mobile);
		vendorRepository.save(vendor);
		session.setAttribute("vendor", vendor);

		session.setAttribute("success", "Vendor profile updated successfully");
		return REDIRECT_VENDOR_STOREFRONT;
	}

	// ---------------- ADD PRODUCT ----------------
	public String laodAddProduct(HttpSession session) {
		if (session.getAttribute("vendor") != null)
			return "add-product.html";

		session.setAttribute("failure", LOGIN_FIRST);
		return REDIRECT_VENDOR_LOGIN;
	}

	public String laodAddProduct(Product product, HttpSession session) throws IOException {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");

		product.setVendor(vendor);
		product.setApproved(false);

		try {
			if (product.getImage() != null && !product.getImage().isEmpty()) {
				product.setImageLink(cloudinaryHelper.saveToCloudinary(product.getImage()));
			}

			if (product.getExtraImages() != null && !product.getExtraImages().isEmpty()) {
				java.util.List<String> extraUrls = new java.util.ArrayList<>();
				for (org.springframework.web.multipart.MultipartFile img : product.getExtraImages()) {
					if (img != null && !img.isEmpty()) {
						extraUrls.add(cloudinaryHelper.saveToCloudinary(img));
					}
				}
				if (!extraUrls.isEmpty()) {
					product.setExtraImageLinks(String.join(",", extraUrls));
				}
			}

			if (product.getVideo() != null && !product.getVideo().isEmpty()) {
				try {
					product.setVideoLink(cloudinaryHelper.saveVideoToCloudinary(product.getVideo()));
				} catch (Exception videoEx) {
					LOGGER.warn("Video upload failed (skipped): {}", videoEx.getMessage(), videoEx);
					session.setAttribute("warning", "Product saved but video upload failed. You can add a video later by editing the product.");
				}
			}

		} catch (Exception e) {
			LOGGER.error("Cloudinary upload error: {}", e.getMessage(), e);
			session.setAttribute("failure", "Image upload failed: " + e.getMessage() + ". Check your Cloudinary credentials.");
			return "redirect:/add-product";
		}

		productRepository.save(product);
		stockAlertService.checkStockLevel(product);

		session.setAttribute("success", "Product added successfully! Waiting for admin approval.");
		return REDIRECT_VENDOR_HOME;
	}

	// ---------------- MANAGE PRODUCTS ----------------
	public String manageProducts(HttpSession session, ModelMap map) {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		List<Product> products = productRepository.findByVendor(vendor);

		map.put("products", products);
		return "vendor-view-products.html";
	}

	// ---------------- DELETE PRODUCT ----------------
	public String delete(int id, HttpSession session) {
		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		Product product = productRepository.findById(id).orElse(null);

		if (product == null || product.getVendor() == null || product.getVendor().getId() != vendor.getId()) {
			session.setAttribute("failure", "You can delete only your own products");
			return "redirect:/manage-products";
		}

		List<Item> items = itemRepository.findByProductId(product.getId());
		if (items != null && !items.isEmpty()) {
			itemRepository.deleteAll(items);
		}

		productRepository.delete(product);

		session.setAttribute("success", "Product Deleted Successfully");
		return "redirect:/manage-products";
	}

	// ---------------- EDIT PRODUCT ----------------
	public String editProduct(int id, ModelMap map, HttpSession session) {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		Product product = productRepository.findById(id).orElse(null);

		if (product == null || product.getVendor() == null || product.getVendor().getId() != vendor.getId()) {
			session.setAttribute("failure", "You can edit only your own products");
			return "redirect:/manage-products";
		}

		map.put("product", product);
		return "edit-product.html";
	}

	// ---------------- UPDATE PRODUCT ----------------
	public String updateProduct(Product product, HttpSession session) throws IOException {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		Product existingProduct = productRepository.findById(product.getId()).orElse(null);

		if (existingProduct == null || existingProduct.getVendor() == null
				|| existingProduct.getVendor().getId() != vendor.getId()) {
			session.setAttribute("failure", "You can update only your own products");
			return "redirect:/manage-products";
		}

		int oldStock = existingProduct.getStock();

		existingProduct.setName(product.getName());
		existingProduct.setDescription(product.getDescription());
		existingProduct.setPrice(product.getPrice());
		existingProduct.setMrp(product.getMrp());
		existingProduct.setCategory(product.getCategory());
		existingProduct.setStock(product.getStock());

		String filteredPins = PinCodeValidator.filterValidPins(product.getAllowedPinCodes());
		existingProduct.setAllowedPinCodes(filteredPins);

		if (product.getStockAlertThreshold() != null && product.getStockAlertThreshold() > 0) {
			existingProduct.setStockAlertThreshold(product.getStockAlertThreshold());
		} else if (existingProduct.getStockAlertThreshold() == null) {
			existingProduct.setStockAlertThreshold(10);
		}

		if (product.getImage() != null && !product.getImage().isEmpty()) {
			existingProduct.setImageLink(cloudinaryHelper.saveToCloudinary(product.getImage()));
		}

		if (product.getExtraImages() != null && !product.getExtraImages().isEmpty()) {
			java.util.List<String> extraUrls = new java.util.ArrayList<>();
			for (org.springframework.web.multipart.MultipartFile img : product.getExtraImages()) {
				if (img != null && !img.isEmpty()) {
					extraUrls.add(cloudinaryHelper.saveToCloudinary(img));
				}
			}
			if (!extraUrls.isEmpty()) {
				existingProduct.setExtraImageLinks(String.join(",", extraUrls));
			}
		}

		if (product.getVideo() != null && !product.getVideo().isEmpty()) {
			existingProduct.setVideoLink(cloudinaryHelper.saveVideoToCloudinary(product.getVideo()));
		}

		productRepository.save(existingProduct);
		stockAlertService.checkStockLevel(existingProduct);

		if (oldStock == 0 && existingProduct.getStock() > 0) {
			backInStockService.notifySubscribers(existingProduct);
		}

		session.setAttribute("success", "Product Updated Successfully");
		return "redirect:/manage-products";
	}

	// ── NEW: Vendor views orders containing their products ────────

	/**
	 * Shows vendor their orders split into:
	 *   pendingOrders    — PROCESSING (need to pack)
	 *   inProgressOrders — PACKED / SHIPPED / OUT_FOR_DELIVERY
	 *   deliveredOrders  — DELIVERED
	 */
	public String loadVendorOrders(HttpSession session, ModelMap map) {
		Vendor vendor = (Vendor) session.getAttribute("vendor");
		if (vendor == null) {
			session.setAttribute("failure", LOGIN_FIRST);
			return REDIRECT_VENDOR_LOGIN;
		}

		List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);

		List<Order> pendingOrders    = new java.util.ArrayList<>();
		List<Order> inProgressOrders = new java.util.ArrayList<>();
		List<Order> deliveredOrders  = new java.util.ArrayList<>();

		for (Order o : allOrders) {
			TrackingStatus s = o.getTrackingStatus();
			if (s == TrackingStatus.PROCESSING) {
				pendingOrders.add(o);
			} else if (s == TrackingStatus.PACKED
					|| s == TrackingStatus.SHIPPED
					|| s == TrackingStatus.OUT_FOR_DELIVERY) {
				inProgressOrders.add(o);
			} else if (s == TrackingStatus.DELIVERED) {
				deliveredOrders.add(o);
			}
		}

		map.put("vendor", vendor);
		map.put("pendingOrders",    pendingOrders);
		map.put("inProgressOrders", inProgressOrders);
		map.put("deliveredOrders",  deliveredOrders);
		return "vendor-orders.html";
	}

	/**
	 * Vendor marks an order as PACKED — ready for pickup by delivery team.
	 * Called via POST /vendor/order/{id}/ready
	 */
@Transactional
	public ResponseEntity<java.util.Map<String, Object>> markOrderReady(int orderId, HttpSession session) {
		java.util.Map<String, Object> res = new java.util.LinkedHashMap<>();

		try {
			Vendor vendor = (Vendor) session.getAttribute("vendor");
			if (vendor == null) {
				res.put("success", false); res.put("message", LOGIN_FIRST);
				return ResponseEntity.status(401).body(res);
			}

			Order order = orderRepository.findById(orderId).orElse(null);
			if (order == null) {
				res.put("success", false); res.put("message", "Order not found");
				return ResponseEntity.ok(res);
			}

			if (order.getTrackingStatus() != TrackingStatus.PROCESSING) {
				res.put("success", false);
				res.put("message", "Order is already in status: " + order.getTrackingStatus().getDisplayName());
				return ResponseEntity.ok(res);
			}

			// Safe access of lazy warehouse field
			String city = "Warehouse";
			try {
				if (order.getWarehouse() != null) {
					city = order.getWarehouse().getCity();
				} else if (order.getCurrentCity() != null && !order.getCurrentCity().isBlank()) {
					city = order.getCurrentCity();
				}
			} catch (Exception lazyEx) {
				LOGGER.warn("[VendorService] Warehouse lazy load (non-fatal): {}", lazyEx.getMessage(), lazyEx);
			}

			order.setTrackingStatus(TrackingStatus.PACKED);
			order.setCurrentCity(city);
			orderRepository.save(order);

			// Log tracking event — non-fatal if it fails
			try {
				TrackingEventLog log = new TrackingEventLog(
					order, TrackingStatus.PACKED, city,
					"Order packed and ready for pickup by delivery team",
					"vendor"
				);
				trackingEventLogRepository.save(log);
			} catch (Exception logEx) {
				LOGGER.warn("[VendorService] TrackingEventLog save (non-fatal): {}", logEx.getMessage(), logEx);
			}

			res.put("success", true);
			res.put("message", "Order #" + orderId + " marked as Packed. Admin will assign delivery boy.");
			return ResponseEntity.ok(res);

		} catch (Exception e) {
			LOGGER.error("[VendorService] markOrderReady error: {}", e.getMessage(), e);
			res.put("success", false);
			res.put("message", "Server error: " + e.getMessage());
			return ResponseEntity.ok(res);
		}
	}


    // ---------------- SALES REPORT ----------------
    public String loadSalesReport(HttpSession session, org.springframework.ui.ModelMap map) {
        Vendor vendor = (Vendor) session.getAttribute("vendor");
        if (vendor == null) {
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_VENDOR_LOGIN;
        }

        int vendorId = vendor.getId();
        map.put("vendorId",   vendorId);
        map.put("vendorName", vendor.getName());
        map.put("vendorCode", vendor.getVendorCode());

        java.time.LocalDate today     = java.time.LocalDate.now();
        java.time.LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        java.time.LocalDate monthStart= today.with(TemporalAdjusters.firstDayOfMonth());

        java.time.LocalDateTime todayStart  = today.atStartOfDay();
        java.time.LocalDateTime todayEnd    = today.atTime(23, 59, 59);
        java.time.LocalDateTime weekStartDT = weekStart.atStartOfDay();
        java.time.LocalDateTime monthStartDT= monthStart.atStartOfDay();
        java.time.LocalDateTime now         = java.time.LocalDateTime.now();

        java.util.Map<String, Object> daily   = reportingService.buildVendorSummary(vendorId, todayStart,   todayEnd);
        java.util.Map<String, Object> weekly  = reportingService.buildVendorSummary(vendorId, weekStartDT,  now);
        java.util.Map<String, Object> monthly = reportingService.buildVendorSummary(vendorId, monthStartDT, now);
        java.util.Map<String, Object> overall = reportingService.buildVendorOverallSummary(vendorId);

        saveSalesReport(vendor, "DAILY",   today,      daily);
        saveSalesReport(vendor, "WEEKLY",  weekStart,  weekly);
        saveSalesReport(vendor, "MONTHLY", monthStart, monthly);

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

        List<com.example.ekart.reporting.SalesRecord> records = reportingService.getVendorRecords(vendorId);
        java.util.List<java.util.Map<String, Object>> ordersJson = new java.util.ArrayList<>();
        for (com.example.ekart.reporting.SalesRecord r : records) {
            if (r.getOrderDate() == null) continue;
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("id",          r.getOrderId());
            m.put("amount",      r.getItemPrice() * r.getQuantity());
            m.put("orderDate",   r.getOrderDate().toString());
            m.put("productName", r.getProductName());
            m.put("category",    r.getCategory());
            m.put("quantity",    r.getQuantity());
            ordersJson.add(m);
        }

        String json = "[]";
        try { json = mapper.writeValueAsString(ordersJson); } catch (Exception e) { /* skip */ }

        map.put("daily",      daily);
        map.put("weekly",     weekly);
        map.put("monthly",    monthly);
        map.put("overall",    overall);
        map.put("ordersJson", json);
        return "vendor-sales-report.html";
    }

    // Unused helper method - kept for potential future use
    /*
    private java.util.Map<String, Object> buildSummary(
            List<com.example.ekart.dto.Order> orders,
            java.util.Set<Integer> vendorProductIds) {

        double revenue   = 0;
        int    itemsSold = 0;
        int    vendorOrderCount = 0;

        for (com.example.ekart.dto.Order o : orders) {
            boolean hasVendorItem = false;
            for (Item item : o.getItems()) {
                if (item.getProductId() != null && vendorProductIds.contains(item.getProductId())) {
                    revenue   += item.getPrice();
                    itemsSold += item.getQuantity();
                    hasVendorItem = true;
                }
            }
            if (hasVendorItem) vendorOrderCount++;
        }

        double avg = vendorOrderCount == 0 ? 0 : revenue / vendorOrderCount;

        java.util.Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("totalRevenue",   revenue);
        summary.put("totalOrders",    vendorOrderCount);
        summary.put("totalItemsSold", itemsSold);
        summary.put("avgOrderValue",  Math.round(avg * 100.0) / 100.0);
        return summary;
    }
    */

    private void saveSalesReport(Vendor vendor, String type,
            java.time.LocalDate date, java.util.Map<String, Object> summary) {
        try {
            SalesReport report = salesReportRepository
                .findByVendorAndReportTypeAndReportDate(vendor, type, date)
                .orElse(new SalesReport());

            report.setVendor(vendor);
            report.setReportType(type);
            report.setReportDate(date);
            report.setTotalRevenue((double) summary.get("totalRevenue"));
            report.setTotalOrders((int)    summary.get("totalOrders"));
            report.setTotalItemsSold((int) summary.get("totalItemsSold"));
            report.setAvgOrderValue((double) summary.get("avgOrderValue"));
            report.setGeneratedAt(java.time.LocalDateTime.now());

            salesReportRepository.save(report);
        } catch (Exception e) {
			LOGGER.warn("Failed to save SalesReport: {}", e.getMessage(), e);
        }
    }

    public org.springframework.http.ResponseEntity<java.util.Map<String, Object>> getSalesReportJSON(jakarta.servlet.http.HttpSession session) {
        Vendor vendor = (Vendor) session.getAttribute("vendor");
        if (vendor == null) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(new java.util.HashMap<>());
        }

        List<com.example.ekart.reporting.SalesRecord> records = reportingService.getVendorRecords(vendor.getId());

        java.util.List<java.util.Map<String, Object>> ordersJson = new java.util.ArrayList<>();
        for (com.example.ekart.reporting.SalesRecord r : records) {
            if (r.getOrderDate() == null) continue;
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("id",          r.getOrderId());
            m.put("amount",      r.getItemPrice() * r.getQuantity());
            m.put("orderDate",   r.getOrderDate().toString());
            m.put("productName", r.getProductName());
            m.put("category",    r.getCategory());
            m.put("quantity",    r.getQuantity());
            ordersJson.add(m);
        }

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("ordersJson", ordersJson);
        response.put("timestamp",  java.time.LocalDateTime.now().toString());

        return org.springframework.http.ResponseEntity.ok(response);
    }

    @Transactional
    public org.springframework.http.ResponseEntity<java.util.Map<String, Object>> syncReportingDb(
            jakarta.servlet.http.HttpSession session) {

        Vendor vendor = (Vendor) session.getAttribute("vendor");
        if (vendor == null) {
            return org.springframework.http.ResponseEntity
                    .status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "Not logged in"));
        }

        List<com.example.ekart.dto.Order> orders = orderRepository.findOrdersByVendor(vendor);

        int synced = 0;
        for (com.example.ekart.dto.Order order : orders) {
            try {
                reportingService.recordOrder(order);
                synced++;
            } catch (Exception e) {
				LOGGER.warn("[Sync] Failed order {}: {}", order.getId(), e.getMessage(), e);
            }
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("synced",  synced);
        result.put("total",   orders.size());
        result.put("message", "Synced " + synced + " of " + orders.size() + " orders");
        return org.springframework.http.ResponseEntity.ok(result);
    }
}
