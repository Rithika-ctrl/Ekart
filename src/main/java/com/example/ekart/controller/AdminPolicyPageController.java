package com.example.ekart.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminPolicyPageController {
    @GetMapping("/admin/policies")
    public String adminPoliciesPage() {
        return "admin-policies";
    }
}
