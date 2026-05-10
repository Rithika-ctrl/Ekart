package com.example.ekart.controller;

import com.example.ekart.dto.Customer;
import com.example.ekart.repository.CustomerRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CustomerSettingsController {
    private static final String K_FAILURE = "failure";
    private static final String LOGIN_FIRST = "Login First";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CustomerRepository customerRepository;

    public CustomerSettingsController(
            CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }



    @GetMapping("/customer/security-settings")
    public String customerSecuritySettings(HttpSession session, ModelMap map) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            session.setAttribute(K_FAILURE, LOGIN_FIRST);
            return "redirect:/customer/login";
        }
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);
        map.put("customerEmail", customer.getEmail());
        map.put("lastLoginTime", customer.getLastLogin());
        map.put("customerName", customer.getName());
        return "customer-security-settings.html";
    }
}
