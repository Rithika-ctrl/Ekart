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

    // ── S1192 String constants ──
    private static final String K_CUSTOMER                          = "customer";
    private static final String K_FAILURE                           = "failure";
    private static final String K_PLEASE_LOGIN_FIRST                = "Please login first";
    private static final String K_REDIRECT_CUSTOMER_LOGIN           = "redirect:/customer/login";
    private static final String K_REDIRECT_CUSTOMER_PROFILE         = "redirect:/customer/profile";

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
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, K_PLEASE_LOGIN_FIRST);
            return K_REDIRECT_CUSTOMER_LOGIN;
        }
        Customer dbCustomer = customerRepository.findById(customer.getId()).orElse(customer);
        map.put(K_CUSTOMER, dbCustomer);
        return "customer-proflie.html";
    }

    /**
     * POST /customer/upload-profile-image
     */
    @PostMapping("/customer/upload-profile-image")
    public String uploadProfileImage(
            @RequestParam("profileImage") MultipartFile file,
            HttpSession session) {

        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, K_PLEASE_LOGIN_FIRST);
            return K_REDIRECT_CUSTOMER_LOGIN;
        }
        if (file == null || file.isEmpty()) {
            session.setAttribute(K_FAILURE, "Please select an image to upload");
            return K_REDIRECT_CUSTOMER_PROFILE;
        }
        try {
            String imageUrl = cloudinaryHelper.saveToCloudinary(file);
            Customer dbCustomer = customerRepository.findById(customer.getId()).orElse(null);
            if (dbCustomer != null) {
                dbCustomer.setProfileImage(imageUrl);
                customerRepository.save(dbCustomer);
                dbCustomer.setPassword(null);
                session.setAttribute(K_CUSTOMER, dbCustomer);
            }
            session.setAttribute("success", "Profile photo updated successfully");
        } catch (Exception e) {
            session.setAttribute(K_FAILURE, "Failed to upload image: " + e.getMessage());
        }
        return K_REDIRECT_CUSTOMER_PROFILE;
    }

    /**
     * GET /customer/remove-profile-image
     */
    @GetMapping("/customer/remove-profile-image")
    public String removeProfileImage(HttpSession session) {
        Customer customer = (Customer) session.getAttribute(K_CUSTOMER);
        if (customer == null) {
            session.setAttribute(K_FAILURE, K_PLEASE_LOGIN_FIRST);
            return K_REDIRECT_CUSTOMER_LOGIN;
        }
        try {
            Customer dbCustomer = customerRepository.findById(customer.getId()).orElse(null);
            if (dbCustomer != null) {
                dbCustomer.setProfileImage(null);
                customerRepository.save(dbCustomer);
                dbCustomer.setPassword(null);
                session.setAttribute(K_CUSTOMER, dbCustomer);
            }
            session.setAttribute("success", "Profile photo removed");
        } catch (Exception e) {
            session.setAttribute(K_FAILURE, "Could not remove photo: " + e.getMessage());
        }
        return K_REDIRECT_CUSTOMER_PROFILE;
    }
}