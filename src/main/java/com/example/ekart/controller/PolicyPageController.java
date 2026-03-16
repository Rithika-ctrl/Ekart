package com.example.ekart.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PolicyPageController {
    @GetMapping("/policies")
    public String policiesPage() {
        return "policies";
    }
}
