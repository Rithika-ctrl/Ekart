package com.example.ekart.controller;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/controller/DeliveryBoyController.java
// REPLACE your existing file.
//
// New endpoints:
//   POST /delivery/warehouse-change/request  → submit change request
// ================================================================

import com.example.ekart.service.DeliveryBoyService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
public class DeliveryBoyController {

    @Autowired
    private DeliveryBoyService deliveryBoyService;

    // ── Auth ──────────────────────────────────────────────────────

    @GetMapping("/delivery/register")
    public String registerPage(ModelMap map) {
        return deliveryBoyService.loadRegisterPage(map);
    }

    @PostMapping("/delivery/register")
    public String register(@RequestParam String name,
                            @RequestParam String email,
                            @RequestParam long mobile,
                            @RequestParam String password,
                            @RequestParam String confirmPassword,
                            @RequestParam(required = false, defaultValue = "0") int warehouseId,
                            HttpSession session) {
        return deliveryBoyService.selfRegister(name, email, mobile, password, confirmPassword, warehouseId, session);
    }

    @GetMapping("/delivery/login")
    public String loginPage() { return deliveryBoyService.loadLoginPage(); }

    @PostMapping("/delivery/login")
    public String login(@RequestParam String email,
                         @RequestParam String password,
                         HttpSession session) {
        return deliveryBoyService.login(email, password, session);
    }

    @GetMapping("/delivery/otp/{id}")
    public String otpPage(@PathVariable int id, ModelMap map) {
        return deliveryBoyService.loadOtpPage(id, map);
    }

    @PostMapping("/delivery/otp/{id}")
    public String verifyOtp(@PathVariable int id, @RequestParam int otp, HttpSession session) {
        return deliveryBoyService.verifyOtp(id, otp, session);
    }

    @GetMapping("/delivery/pending")
    public String pendingPage() { return deliveryBoyService.loadPendingPage(); }

    @GetMapping("/delivery/warehouses")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getWarehouses() {
        return deliveryBoyService.getActiveWarehouses();
    }

    @GetMapping("/delivery/logout")
    public String logout(HttpSession session) { return deliveryBoyService.logout(session); }

    // ── Dashboard ─────────────────────────────────────────────────

    @GetMapping("/delivery/home")
    public String home(HttpSession session, ModelMap map) {
        return deliveryBoyService.loadHome(session, map);
    }

    // ── Order actions (AJAX) ──────────────────────────────────────

    @PostMapping("/delivery/order/{id}/pickup")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> markPickedUp(@PathVariable int id, HttpSession session) {
        return deliveryBoyService.markPickedUp(id, session);
    }

    @PostMapping("/delivery/order/{id}/deliver")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> confirmDelivery(@PathVariable int id,
                                                                 @RequestParam int otp,
                                                                 HttpSession session) {
        return deliveryBoyService.confirmDelivery(id, otp, session);
    }

    // ── Warehouse Change Request ──────────────────────────────────

    /**
     * Delivery boy submits a warehouse transfer request.
     * Body params: warehouseId (int), reason (String)
     */
    @PostMapping("/delivery/warehouse-change/request")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> requestWarehouseChange(
            @RequestParam int warehouseId,
            @RequestParam(required = false, defaultValue = "") String reason,
            HttpSession session) {
        return deliveryBoyService.submitWarehouseChangeRequest(warehouseId, reason, session);
    }
}