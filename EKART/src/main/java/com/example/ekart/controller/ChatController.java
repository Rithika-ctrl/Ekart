package com.example.ekart.controller;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
import com.example.ekart.service.AiAssistantService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * LOCATION: src/main/java/com/example/ekart/controller/ChatController.java
 *
 * Thin REST handler for the AI chat endpoint.
 *
 * FIX: Issue 160 (S6541 Brain Method) — all context-building logic has been
 *   extracted to {@link ChatContextBuilder}, reducing this class well below
 *   SonarQube's Brain Method thresholds (LOC, complexity, nesting, variables).
 * FIX: Issue 159 (S1172 unused parameter) — buildContext() no longer accepts
 *   the unused {@code session} parameter; session data is resolved here and
 *   passed as typed objects to ChatContextBuilder.
 */
@RestController
public class ChatController {

    private static final String K_CUSTOMER = "customer";
    private static final String K_VENDOR   = "vendor";
    private static final String K_ADMIN    = "admin";

    private final AiAssistantService aiAssistantService;
    private final ChatContextBuilder contextBuilder;

    public ChatController(
            AiAssistantService aiAssistantService,
            ChatContextBuilder contextBuilder) {
        this.aiAssistantService = aiAssistantService;
        this.contextBuilder     = contextBuilder;
    }

    // ── POST /chat ────────────────────────────────────────────────────────────

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        String userMessage = ((String) body.getOrDefault("message", "")).trim();
        if (userMessage.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("reply", "Please type a message."));
        }

        // ── Resolve role & user ───────────────────────────────────────────────
        String role     = "guest";
        String userName = "there";
        String context  = "=== GUEST USER ===\nNot logged in. Browsing as guest.\n";

        if (session.getAttribute(K_CUSTOMER) != null) {
            Customer c = (Customer) session.getAttribute(K_CUSTOMER);
            role       = K_CUSTOMER;
            userName   = c.getName();
            context    = contextBuilder.buildForCustomer(c);

        } else if (session.getAttribute(K_VENDOR) != null) {
            Vendor v = (Vendor) session.getAttribute(K_VENDOR);
            role     = K_VENDOR;
            userName = v.getName();
            context  = contextBuilder.buildForVendor(v);

        } else if (session.getAttribute(K_ADMIN) != null) {
            role     = K_ADMIN;
            userName = "Admin";
            context  = contextBuilder.buildForAdmin();
        }

        // ── Get AI reply ──────────────────────────────────────────────────────
        @SuppressWarnings("unchecked")
        List<Map<String, String>> history =
                (List<Map<String, String>>) body.getOrDefault("history", new ArrayList<>());

        String reply = aiAssistantService.getReply(userMessage, role, userName, context, history);

        return ResponseEntity.ok(Map.of(
                "reply", reply,
                "role",  role,
                "name",  userName
        ));
    }
}