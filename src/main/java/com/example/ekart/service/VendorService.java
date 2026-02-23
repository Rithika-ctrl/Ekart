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
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.VendorRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@Service
public class VendorService {

	@Autowired
	private VendorRepository vendorRepository;

	@Autowired
	private ProductRepository productRepository;

	@Autowired
	private CloudinaryHelper cloudinaryHelper;

	// ---------------- REGISTER ----------------
	public String loadRegistration(ModelMap map, Vendor vendor) {
		map.put("vendor", vendor);
		return "vendor-register.html";
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

		// 🔥 PRINT OTP IN TERMINAL (DEV MODE)
		System.out.println("Vendor OTP (Registration): " + vendor.getOtp());

		session.setAttribute("success", "OTP Sent Successfully");
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

			// 🔥 PRINT OTP IN TERMINAL (DEV MODE)
			System.out.println("Vendor OTP (Login): " + vendor.getOtp());

			session.setAttribute("success", "OTP Sent. Please verify first.");
			return "redirect:/vendor/otp/" + vendor.getId();
		}

		// ✅ VERIFIED → LOGIN SUCCESS
		session.setAttribute("vendor", vendor);
		session.setAttribute("success", "Login Successful");
		return "redirect:/vendor/home";
	}

	// ---------------- HOME ----------------
	public String loadHome(HttpSession session) {
		if (session.getAttribute("vendor") != null)
			return "vendor-home.html";

		session.setAttribute("failure", "Login First");
		return "redirect:/vendor/login";
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
		product.setApproved(false); // 🔥 admin approval required
		product.setImageLink(cloudinaryHelper.saveToCloudinary(product.getImage()));

		productRepository.save(product);

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

		productRepository.deleteById(id);
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

		if (product.getImage() != null && !product.getImage().isEmpty()) {
			existingProduct.setImageLink(cloudinaryHelper.saveToCloudinary(product.getImage()));
		}

		productRepository.save(existingProduct);
		session.setAttribute("success", "Product Updated Successfully");
		return "redirect:/manage-products";
	}
}
