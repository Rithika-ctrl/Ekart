/**
 * File: PolicyPageController.java
 * Description: Controller for serving policy pages (policies, privacy, terms).
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PolicyPageController {

    @GetMapping("/policies")
    public String policies() {
        return "policies";
    }

    @GetMapping("/privacy")
    public String privacy() {
        return "privacy";
    }

    @GetMapping("/terms")
    public String terms() {
        return "terms";
    }

    @GetMapping("/cookies")
    public String cookies() {
        return "cookies";
    }
}