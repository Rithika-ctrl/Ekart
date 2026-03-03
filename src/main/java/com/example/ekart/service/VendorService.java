package com.example.ekart.service;

import java.io.IOException;
import java.util.List;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;

import com.example.ekart.dto.Product;
import com.example.ekart.dto.Vendor;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.CloudinaryHelper;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.VendorRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import com.example.ekart.dto.SalesReport;
import com.example.ekart.repository.SalesReportRepository;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.stream.Collectors;

import com.example.ekart.dto.Item;


@Service
public class VendorService {

	@Autowired
	private VendorRepository vendorRepository;

	@Autowired
	private OrderRepository orderRepository;

	@Autowired
	private ProductRepository productRepository;

	@Autowired
	private CloudinaryHelper cloudinaryHelper;

	@Autowired
	private StockAlertService stockAlertService;

	@Autowired
	private EmailSender emailSender;

	@Autowired
	private ItemRepository itemRepository;

	@Autowired
    private SalesReportRepository salesReportRepository;

	// ---------------- REGISTER ----------------
	public String loadRegistration(ModelMap map, Vendor vendor) {
		map.put("vendor", vendor);
		return "vendor-register.html";
	}
	// 🔥 NEW: Generate unique vendor code like VND-00001
    // Add this private method inside VendorService class
    private String generateVendorCode(int vendorId) {
        return String.format("VND-%05d", vendorId);
    }

	public String registration(@Valid Vendor vendor, BindingResult result, HttpSession session) {

		if (!vendor.getPassword().equals(vendor.getConfirmPassword()))
			result.rejectValue("confirmPassword", "error.confirmPassword",
					"* Password and Confirm Password should match");

		if (vendorRepository.existsByEmail(vendor.getEmail()))
			result.rejectValue("email", "error.email", "* Email already exists");

		if (result.hasErrors())
			return "vendor-register.html";

		// 🔥 GENERATE OTP
		int otp = new Random().nextInt(100000, 1000000);
		vendor.setOtp(otp);
		vendor.setPassword(AES.encrypt(vendor.getPassword()));
		vendor.setVerified(false);

		vendorRepository.save(vendor);

// 🔥 Generate unique Vendor ID after save (we need the DB id first)
        String vendorCode = generateVendorCode(vendor.getId());
        vendor.setVendorCode(vendorCode);
        vendorRepository.save(vendor);

		try {
			emailSender.send(vendor);
		} catch (Exception e) {
			System.err.println("Vendor OTP email failed: " + e.getMessage());
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

		if (vendor.getOtp() == otp) {
			vendor.setVerified(true);
			vendorRepository.save(vendor);
			session.setAttribute("success", "Vendor Verified Successfully");
			return "redirect:/";
		}

		session.setAttribute("failure", "OTP Mismatch");
		return "redirect:/vendor/otp/" + id;
	}

	// ---------------- LOGIN ----------------
	public String login(String email, String password, HttpSession session) {

		Vendor vendor = vendorRepository.findByEmail(email);

		if (vendor == null) {
			session.setAttribute("failure", "Invalid Email");
			return "redirect:/vendor/login";
		}

		if (!AES.decrypt(vendor.getPassword()).equals(password)) {
			session.setAttribute("failure", "Invalid Password");
			return "redirect:/vendor/login";
		}

		// 🔥 IF NOT VERIFIED → SEND OTP AGAIN
		if (!vendor.isVerified()) {

			int otp = new Random().nextInt(100000, 1000000);
			vendor.setOtp(otp);
			vendorRepository.save(vendor);

			try {
				emailSender.send(vendor);
			} catch (Exception e) {
				System.err.println("Vendor OTP resend email failed: " + e.getMessage());
			}

			session.setAttribute("success", "OTP Sent to your email. Please verify first.");
			return "redirect:/vendor/otp/" + vendor.getId();
		}

		// ✅ VERIFIED → LOGIN SUCCESS
		session.setAttribute("vendor", vendor);
		session.setAttribute("success", "Login Successful");
		return "redirect:/vendor/home";
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

		int otp = new Random().nextInt(100000, 1000000);
		vendor.setOtp(otp);
		vendorRepository.save(vendor);
		emailSender.send(vendor);

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

		if (vendor.getOtp() != otp) {
			session.setAttribute("failure", "Invalid OTP");
			return "redirect:/vendor/reset-password/" + id;
		}

		if (password == null || confirmPassword == null || !password.equals(confirmPassword)) {
			session.setAttribute("failure", "Password and Confirm Password should match");
			return "redirect:/vendor/reset-password/" + id;
		}

		String passwordRegex = "^.*(?=.{8,})(?=..*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$";
		if (!password.matches(passwordRegex)) {
			session.setAttribute("failure",
					"Password must have 8+ characters with uppercase, lowercase, number and special character");
			return "redirect:/vendor/reset-password/" + id;
		}

		vendor.setPassword(AES.encrypt(password));
		vendorRepository.save(vendor);

		session.setAttribute("success", "Password reset successful. Please login");
		return "redirect:/vendor/login";
	}

	// ---------------- HOME ----------------
	public String loadHome(HttpSession session) {
		if (session.getAttribute("vendor") != null)
			return "vendor-home.html";

		session.setAttribute("failure", "Login First");
		return "redirect:/vendor/login";
	}

	// 🔥 Load vendor home with stock alert count
	public String loadHome(HttpSession session, ModelMap map) {
		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		int alertCount = stockAlertService.getUnacknowledgedAlerts(vendor).size();
		map.put("alertCount", alertCount);

		return "vendor-home.html";
	}

	// ---------------- STORE FRONT (PROFILE) ----------------
	public String loadStoreFront(HttpSession session, ModelMap map) {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
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
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
		}

		String updatedName = name == null ? "" : name.trim();
		if (updatedName.length() < 5 || updatedName.length() > 30) {
			session.setAttribute("failure", "Name must be between 5 and 30 characters");
			return "redirect:/vendor/store-front";
		}

		if (mobile < 6000000000L || mobile > 9999999999L) {
			session.setAttribute("failure", "Enter a valid mobile number");
			return "redirect:/vendor/store-front";
		}

		Vendor sessionVendor = (Vendor) session.getAttribute("vendor");
		Vendor vendor = vendorRepository.findById(sessionVendor.getId()).orElse(sessionVendor);

		Vendor existingMobileVendor = vendorRepository.findByMobile(mobile);
		if (existingMobileVendor != null && existingMobileVendor.getId() != vendor.getId()) {
			session.setAttribute("failure", "Mobile number already exists");
			return "redirect:/vendor/store-front";
		}

		vendor.setName(updatedName);
		vendor.setMobile(mobile);
		vendorRepository.save(vendor);
		session.setAttribute("vendor", vendor);

		session.setAttribute("success", "Vendor profile updated successfully");
		return "redirect:/vendor/store-front";
	}

	// ---------------- ADD PRODUCT ----------------
	public String laodAddProduct(HttpSession session) {
		if (session.getAttribute("vendor") != null)
			return "add-product.html";

		session.setAttribute("failure", "Login First");
		return "redirect:/vendor/login";
	}

	public String laodAddProduct(Product product, HttpSession session) throws IOException {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");

		product.setVendor(vendor);
		product.setApproved(false);

		// Upload main image
		if (product.getImage() != null && !product.getImage().isEmpty()) {
			product.setImageLink(cloudinaryHelper.saveToCloudinary(product.getImage()));
		}

		// 🔥 Upload extra images
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

		// 🔥 Upload video
		if (product.getVideo() != null && !product.getVideo().isEmpty()) {
			product.setVideoLink(cloudinaryHelper.saveVideoToCloudinary(product.getVideo()));
		}

		productRepository.save(product);
		stockAlertService.checkStockLevel(product);

		session.setAttribute("success", "Product added. Waiting for admin approval.");
		return "redirect:/vendor/home";
	}

	// ---------------- MANAGE PRODUCTS ----------------
	public String manageProducts(HttpSession session, ModelMap map) {

		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		List<Product> products = productRepository.findByVendor(vendor);

		map.put("products", products);
		return "vendor-view-products.html";
	}

	// ---------------- DELETE PRODUCT ----------------
	public String delete(int id, HttpSession session) {
		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		Product product = productRepository.findById(id).orElse(null);

		if (product == null || product.getVendor() == null || product.getVendor().getId() != vendor.getId()) {
			session.setAttribute("failure", "You can delete only your own products");
			return "redirect:/manage-products";
		}

		List<Item> items = itemRepository.findByName(product.getName());
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
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
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
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		Product existingProduct = productRepository.findById(product.getId()).orElse(null);

		if (existingProduct == null || existingProduct.getVendor() == null
				|| existingProduct.getVendor().getId() != vendor.getId()) {
			session.setAttribute("failure", "You can update only your own products");
			return "redirect:/manage-products";
		}

		existingProduct.setName(product.getName());
		existingProduct.setDescription(product.getDescription());
		existingProduct.setPrice(product.getPrice());
		existingProduct.setCategory(product.getCategory());
		existingProduct.setStock(product.getStock());
		
		// Update stock alert threshold if provided
		if (product.getStockAlertThreshold() != null && product.getStockAlertThreshold() > 0) {
			existingProduct.setStockAlertThreshold(product.getStockAlertThreshold());
		} else if (existingProduct.getStockAlertThreshold() == null) {
			existingProduct.setStockAlertThreshold(10); // set default if missing
		}

		if (product.getImage() != null && !product.getImage().isEmpty()) {
			existingProduct.setImageLink(cloudinaryHelper.saveToCloudinary(product.getImage()));
		}

		// 🔥 Update extra images (append to existing or replace)
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

		// 🔥 Update video
		if (product.getVideo() != null && !product.getVideo().isEmpty()) {
			existingProduct.setVideoLink(cloudinaryHelper.saveVideoToCloudinary(product.getVideo()));
		}

		productRepository.save(existingProduct);
		
		// 🔥 Check stock level after update
		stockAlertService.checkStockLevel(existingProduct);

		session.setAttribute("success", "Product Updated Successfully");
		return "redirect:/manage-products";
	}

    // 🔥 SALES REPORT
    // 🔥 SALES REPORT — FIXED (vendor-filtered, DB-persisted)
    public String loadSalesReport(HttpSession session, org.springframework.ui.ModelMap map) {
        Vendor vendor = (Vendor) session.getAttribute("vendor");
        if (vendor == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/vendor/login";
        }

        // 🔥 Add vendor info to header
        map.put("vendorId", vendor.getId());
        map.put("vendorName", vendor.getName());
        map.put("vendorCode", vendor.getVendorCode());

        java.time.LocalDate today = java.time.LocalDate.now();

        // ── Date ranges ──────────────────────────────────────────
        java.time.LocalDateTime todayStart   = today.atStartOfDay();
        java.time.LocalDateTime todayEnd     = today.atTime(23, 59, 59);

        java.time.LocalDate weekStart        = today.with(DayOfWeek.MONDAY);
        java.time.LocalDateTime weekStartDT  = weekStart.atStartOfDay();

        java.time.LocalDate monthStart       = today.with(TemporalAdjusters.firstDayOfMonth());
        java.time.LocalDateTime monthStartDT = monthStart.atStartOfDay();

        // ── Fetch vendor-specific orders ─────────────────────────
        List<com.example.ekart.dto.Order> dailyOrders   = orderRepository.findOrdersByVendorAndDateRange(vendor, todayStart, todayEnd);
        List<com.example.ekart.dto.Order> weeklyOrders  = orderRepository.findOrdersByVendorAndDateRange(vendor, weekStartDT, todayEnd);
        List<com.example.ekart.dto.Order> monthlyOrders = orderRepository.findOrdersByVendorAndDateRange(vendor, monthStartDT, todayEnd);
        List<com.example.ekart.dto.Order> allOrders     = orderRepository.findOrdersByVendor(vendor);

        // ── Get this vendor's product IDs ─────────────────────────
        java.util.Set<Integer> vendorProductIds = productRepository.findByVendor(vendor)
            .stream()
            .map(p -> p.getId())
            .collect(Collectors.toSet());

        // ── Build summary stats ───────────────────────────────────
        java.util.Map<String, Object> daily   = buildSummary(dailyOrders,   vendorProductIds);
        java.util.Map<String, Object> weekly  = buildSummary(weeklyOrders,  vendorProductIds);
        java.util.Map<String, Object> monthly = buildSummary(monthlyOrders, vendorProductIds);
        java.util.Map<String, Object> overall = buildSummary(allOrders,     vendorProductIds);

        // ── Save to DB ────────────────────────────────────────────
        saveSalesReport(vendor, "DAILY",   today,      daily);
        saveSalesReport(vendor, "WEEKLY",  weekStart,  weekly);
        saveSalesReport(vendor, "MONTHLY", monthStart, monthly);

        // ── Build JSON for chart (vendor-filtered only) ───────────
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

        java.util.List<java.util.Map<String, Object>> ordersJson = new java.util.ArrayList<>();
        for (com.example.ekart.dto.Order o : allOrders) {
            if (o.getOrderDate() == null) continue;
            double vendorRevenue = o.getItems().stream()
                .filter(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice())
                .sum();
            long vendorItemCount = o.getItems().stream()
                .filter(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()))
                .count();
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("id",           o.getId());
            m.put("amount",       vendorRevenue);
            m.put("orderDate",    o.getOrderDate().toString());
            m.put("deliveryTime", o.getDeliveryTime() != null ? o.getDeliveryTime() : "Standard");
            m.put("itemCount",    vendorItemCount);
            ordersJson.add(m);
        }

        String json = "[]";
        try { json = mapper.writeValueAsString(ordersJson); } catch (Exception e) { /* skip */ }
        
		map.put("daily",   daily);
        map.put("weekly",  weekly);
        map.put("monthly", monthly);
        map.put("overall", overall);
        map.put("ordersJson", json);
        return "vendor-sales-report.html";
    }

    // ── Helper: calculate summary from order list ─────────────────
    private java.util.Map<String, Object> buildSummary(
            List<com.example.ekart.dto.Order> orders,
            java.util.Set<Integer> vendorProductIds) {

        double revenue   = 0;
        int    itemsSold = 0;
        int    vendorOrderCount = 0; // 🔥 Count only orders with vendor items

        for (com.example.ekart.dto.Order o : orders) {
            boolean hasVendorItem = false;
            for (Item item : o.getItems()) {
                if (item.getProductId() != null && vendorProductIds.contains(item.getProductId())) {
                    revenue   += item.getPrice();
                    itemsSold += item.getQuantity();
                    hasVendorItem = true;
                }
            }
            if (hasVendorItem) vendorOrderCount++; // 🔥 Count orders with vendor items
        }

        double avg = vendorOrderCount == 0 ? 0 : revenue / vendorOrderCount;

        java.util.Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("totalRevenue",   revenue);
        summary.put("totalOrders",    vendorOrderCount); // 🔥 Use vendor order count
        summary.put("totalItemsSold", itemsSold);
        summary.put("avgOrderValue",  Math.round(avg * 100.0) / 100.0);
        return summary;
    }

    // ── Helper: save or update SalesReport in DB ──────────────────
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
            System.err.println("Failed to save SalesReport: " + e.getMessage());
        }
    }
}