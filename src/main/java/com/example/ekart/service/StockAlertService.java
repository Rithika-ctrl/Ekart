/**
 * File: StockAlertService.java
 * Description: Service managing stock alerts and vendor notifications.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import com.example.ekart.dto.Product;
import com.example.ekart.dto.StockAlert;
import com.example.ekart.dto.Vendor;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.StockAlertRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class StockAlertService {

	@Autowired
	private StockAlertRepository stockAlertRepository;

	@Autowired
	private ProductRepository productRepository;

	@Autowired
	private EmailSender emailSender;

	// 🔥 CHECK AND CREATE ALERT IF STOCK IS LOW
	public void checkStockLevel(Product product) {
		// Set default threshold if missing
		if (product.getStockAlertThreshold() == null) {
			product.setStockAlertThreshold(10);
			productRepository.save(product);
		}
		
		if (product.getStock() <= product.getStockAlertThreshold()) {
			// Check if alert already exists for this product
			if (!stockAlertRepository.existsByProductAndAcknowledgedFalse(product)) {
				createStockAlert(product);
			}
		}
	}

	// 🔥 CREATE NEW STOCK ALERT
	private void createStockAlert(Product product) {
		StockAlert alert = new StockAlert();
		alert.setProduct(product);
		alert.setVendor(product.getVendor());
		alert.setStockLevel(product.getStock());
		alert.setAlertTime(LocalDateTime.now());
		alert.setEmailSent(false);
		alert.setAcknowledged(false);
		alert.setMessage("Stock level for '" + product.getName() + "' is low (" 
				+ product.getStock() + " units). Threshold: " + product.getStockAlertThreshold());

		stockAlertRepository.save(alert);

		// Send email notification
		try {
			emailSender.sendStockAlert(product.getVendor(), product, product.getStock());
			alert.setEmailSent(true);
			stockAlertRepository.save(alert);
		} catch (Exception e) {
			System.err.println("Failed to send stock alert email: " + e.getMessage());
		}
	}

	// 🔥 GET ALL ALERTS FOR A VENDOR
	public List<StockAlert> getVendorAlerts(Vendor vendor) {
		return stockAlertRepository.findByVendor(vendor);
	}

	// 🔥 GET UNACKNOWLEDGED ALERTS FOR A VENDOR
	public List<StockAlert> getUnacknowledgedAlerts(Vendor vendor) {
		return stockAlertRepository.findByVendorAndAcknowledgedFalse(vendor);
	}

	// 🔥 ACKNOWLEDGE AN ALERT
	public String acknowledgeAlert(int alertId, HttpSession session) {
		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		StockAlert alert = stockAlertRepository.findById(alertId).orElse(null);

		if (alert == null || alert.getVendor().getId() != vendor.getId()) {
			session.setAttribute("failure", "Invalid Alert");
			return "redirect:/stock-alerts";
		}

		alert.setAcknowledged(true);
		stockAlertRepository.save(alert);

		session.setAttribute("success", "Alert acknowledged");
		return "redirect:/stock-alerts";
	}

	// 🔥 VIEW ALL STOCK ALERTS
	public String viewStockAlerts(HttpSession session, ModelMap map) {
		if (session.getAttribute("vendor") == null) {
			session.setAttribute("failure", "Login First");
			return "redirect:/vendor/login";
		}

		Vendor vendor = (Vendor) session.getAttribute("vendor");
		List<StockAlert> alerts = getVendorAlerts(vendor);
		List<StockAlert> unacknowledged = getUnacknowledgedAlerts(vendor);

		map.put("alerts", alerts);
		map.put("unacknowledgedCount", unacknowledged.size());

		return "stock-alerts.html";
	}

	// 🔥 CHECK ALL VENDOR PRODUCTS FOR LOW STOCK
	public void checkAllVendorProducts(Vendor vendor) {
		List<Product> products = productRepository.findByVendor(vendor);
		for (Product product : products) {
			checkStockLevel(product);
		}
	}
}
