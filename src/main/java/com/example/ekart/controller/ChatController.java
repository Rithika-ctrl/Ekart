package com.example.ekart.controller;

import com.example.ekart.service.AiAssistantService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class ChatController {

    @Autowired
    private AiAssistantService aiAssistantService;

    // POST /chat — receives { "message": "...", "role": "customer/vendor/admin" }
    // returns   { "reply": "..." }
    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(
            @RequestBody Map<String, String> body,
            HttpSession session) {

        String userMessage = body.getOrDefault("message", "").trim();
        if (userMessage.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("reply", "Please type a message."));
        }

        // Detect who is logged in for context
        String role = "guest";
        if (session.getAttribute("customer") != null) role = "customer";
        else if (session.getAttribute("vendor") != null)  role = "vendor";
        else if (session.getAttribute("admin") != null)   role = "admin";

        String reply = aiAssistantService.getReply(userMessage, role);
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}