/**
 * File: AdminPolicyPageController.java
 * Description: Admin page controller for site policy management view.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
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
