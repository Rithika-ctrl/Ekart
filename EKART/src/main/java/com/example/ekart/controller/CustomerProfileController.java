package com.example.ekart.controller;

import com.example.ekart.dto.Customer;
import com.example.ekart.helper.CloudinaryHelper;
import com.example.ekart.repository.CustomerRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@Controller
public class CustomerProfileController {

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final CloudinaryHelper cloudinaryHelper;
    private final CustomerRepository customerRepository;

    public CustomerProfileController(
            CloudinaryHelper cloudinaryHelper,
            CustomerRepository customerRepository) {
        this.cloudinaryHelper = cloudinaryHelper;
        this.customerRepository = customerRepository;
    }



    /**
     * GET /customer/profile  (also accepts legacy typo URL /customer/proflie)
     */
    @GetMapping({"/customer/profile", "/customer/proflie"})
    public String loadProfile(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Please login first");
            return "redirect:/customer/login";
        }
        Customer dbCustomer = customerRepository.findById(customer.getId()).orElse(customer);
        map.put("customer", dbCustomer);
        return "customer-proflie.html";
    }

    /**
     * POST /customer/upload-profile-image
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
            String imageUrl = cloudinaryHelper.saveToCloudinary(file);
            Customer dbCustomer = customerRepository.findById(customer.getId()).orElse(null);
            if (dbCustomer != null) {
                dbCustomer.setProfileImage(imageUrl);
                customerRepository.save(dbCustomer);
                dbCustomer.setPassword(null);
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