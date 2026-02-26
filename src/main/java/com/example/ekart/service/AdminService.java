package com.example.ekart.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import com.example.ekart.dto.Product;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.VendorRepository;
import com.example.ekart.repository.ProductRepository;

import jakarta.servlet.http.HttpSession;

@Service
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
}