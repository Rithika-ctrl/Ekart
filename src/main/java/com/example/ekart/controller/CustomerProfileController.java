package main.java.com.example.ekart.controller;

import com.example.ekart.dto.Customer;
import com.example.ekart.helper.CloudinaryHelper;
import com.example.ekart.repository.CustomerRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

/**
 * ✅ FIX B — Fixes BUG C + BUG D
 *
 * BUG C: customer-proflie.html form posts to /customer/upload-profile-image — no controller existed.
 * BUG D: "Remove Photo" link uses /customer/remove-profile-image — no controller existed.
 *
 * ALSO REQUIRED: Add `profileImage` field to Customer.java (see Part 1 above).
 *
 * HOW TO USE:
 *   1. Add profileImage field to Customer.java (see Part 1 above)
 *   2. Place this file in: src/main/java/com/example/ekart/controller/CustomerProfileController.java
 */
@Controller
public class CustomerProfileController {

    @Autowired
    private CloudinaryHelper cloudinaryHelper;

    @Autowired
    private CustomerRepository customerRepository;

    /**
     * POST /customer/upload-profile-image
     * Accepts multipart file upload, saves to Cloudinary, stores URL on Customer entity.
     */
    @PostMapping("/customer/upload-profile-image")
    public String uploadProfileImage(
            @RequestParam("profileImage") MultipartFile file,
            HttpSession session) {

        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Please login first");
            return "redirect:/customer/login";
        }

        if (file == null || file.isEmpty()) {
            session.setAttribute("failure", "Please select an image to upload");
            return "redirect:/customer/profile";
        }

        try {
            // Upload to Cloudinary and get back the URL
            String imageUrl = cloudinaryHelper.saveToCloudinary(file);

            // Persist to DB
            Customer dbCustomer = customerRepository.findById(customer.getId()).orElse(null);
            if (dbCustomer != null) {
                dbCustomer.setProfileImage(imageUrl);
                customerRepository.save(dbCustomer);

                // Update session so the profile page reflects change immediately
                dbCustomer.setPassword(null); // don't expose password in session
                session.setAttribute("customer", dbCustomer);
            }

            session.setAttribute("success", "Profile photo updated successfully");
        } catch (Exception e) {
            session.setAttribute("failure", "Failed to upload image: " + e.getMessage());
        }

        return "redirect:/customer/profile";
    }

    /**
     * GET /customer/remove-profile-image
     * Clears the profileImage URL from the Customer entity.
     */
    @GetMapping("/customer/remove-profile-image")
    public String removeProfileImage(HttpSession session) {

        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Please login first");
            return "redirect:/customer/login";
        }

        try {
            Customer dbCustomer = customerRepository.findById(customer.getId()).orElse(null);
            if (dbCustomer != null) {
                dbCustomer.setProfileImage(null);
                customerRepository.save(dbCustomer);

                dbCustomer.setPassword(null);
                session.setAttribute("customer", dbCustomer);
            }
            session.setAttribute("success", "Profile photo removed");
        } catch (Exception e) {
            session.setAttribute("failure", "Could not remove photo: " + e.getMessage());
        }

        return "redirect:/customer/profile";
    }
}