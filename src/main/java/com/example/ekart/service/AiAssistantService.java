package com.example.ekart.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class AiAssistantService {

    private static final Logger logger = LoggerFactory.getLogger(AiAssistantService.class);

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    // System prompt — tells Claude it is Ekart's assistant
    private String buildSystemPrompt(String role) {
        return "You are Ekart Assistant, a helpful AI for the Ekart e-commerce platform. " +
               "Keep all replies short, friendly, and to the point (max 3-4 sentences). " +
               "The current user role is: " + role + ". " +
               "If role is 'customer': help with orders, cart, products, delivery, returns, payments. " +
               "If role is 'vendor': help with adding products, stock alerts, sales reports, store front. " +
               "If role is 'admin': help with approving products, managing users, refunds. " +
               "If role is 'guest': encourage them to register or login. " +
               "Do not answer questions unrelated to shopping or Ekart. " +
               "If asked something outside scope, politely say you can only help with Ekart-related questions.";
    }

    public String getReply(String userMessage, String role) {
        // Try Gemini API first if key is configured
        if (apiKey != null && !apiKey.isBlank()) {
            try {
                String reply = getGeminiReply(userMessage, role);
                if (reply != null) {
                    return reply;
                }
            } catch (Exception e) {
                logger.warn("Gemini API failed: {}", e.getMessage());
                // Fall through to local response
            }
        }
        
        // Fallback to local AI responses
        return getLocalAiResponse(userMessage, role);
    }

    private String getGeminiReply(String userMessage, String role) throws Exception {
        String jsonBody = "{\"contents\":[{\"parts\":[{\"text\":"
            + toJson(buildSystemPrompt(role) + "\n\nUser: " + userMessage)
            + "}]}]}";

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(
                "https://generativelanguage.googleapis.com/v1beta/models/"
                + "gemini-1.5-flash:generateContent?key=" + apiKey))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();

        HttpResponse<String> response = httpClient.send(request,
            HttpResponse.BodyHandlers.ofString());

        logger.info("Gemini API Status: {}", response.statusCode());
        
        if (response.statusCode() == 200) {
            String result = extractGeminiText(response.body());
            logger.info("Gemini response: {}", result);
            return result;
        } else {
            logger.error("Gemini API error - Status: {}", response.statusCode());
            logger.error("Response: {}", response.body());
            return null;
        }
    }

    /**
     * Fallback: Local AI responses without external API
     * Provides smart responses based on keywords
     */
    private String getLocalAiResponse(String userMessage, String role) {
        String msg = userMessage.toLowerCase().trim();
        
        // Smart keyword-based responses
        if (msg.contains("order") || msg.contains("track")) {
            if (role.equals("customer")) {
                return "📦 You can track your orders in the 'Track Orders' section. Just click on any order to see real-time delivery updates!";
            }
            return "Orders are managed through the Orders section of your dashboard.";
        }
        
        if (msg.contains("product") || msg.contains("add") || msg.contains("upload")) {
            if (role.equals("vendor")) {
                return "➕ To add products: Go to 'Add Product' → Fill details → Upload images → Set price & stock. Need help?";
            } else if (role.equals("customer")) {
                return "🛍️ Browse all products in 'View Products'. Use filters & search to find what you need!";
            }
        }
        
        if (msg.contains("payment") || msg.contains("pay") || msg.contains("price")) {
            return "💳 We accept all major payment methods. You can securely checkout in the cart. Your payment details are encrypted!";
        }
        
        if (msg.contains("return") || msg.contains("refund")) {
            return "🔄 Returns are easy! Go to 'Order History' → Select order → Click 'Return' → Follow the steps. Refunds are processed in 5-7 days.";
        }
        
        if (msg.contains("stock") || msg.contains("alert")) {
            if (role.equals("vendor")) {
                return "📊 Stock alerts help you manage inventory. Set thresholds in product settings to get notified when items run low.";
            }
        }
        
        if (msg.contains("hello") || msg.contains("hi") || msg.contains("hey")) {
            return "👋 Hi there! I'm the Ekart Assistant. Ask me about orders, products, payments, or delivery!";
        }
        
        if (msg.contains("help") || msg.contains("what can")) {
            if (role.equals("customer")) {
                return "I can help with: orders, products, cart, returns, payments, wishlist & delivery tracking. What do you need?";
            } else if (role.equals("vendor")) {
                return "I can help vendors with: adding products, stock management, sales reports & store settings. How can I assist?";
            }
            return "I can help with Ekart-related questions. Ask me anything about shopping!";
        }
        
        // Default helpful message
        return "Got it! 😊 I can help with orders, products, payments, and more. What would you like to know?";
    }

    private String extractGeminiText(String json) {
        try {
            int textIndex = json.indexOf("\"text\":");
            int start = json.indexOf("\"", textIndex + 7) + 1;
            int end   = json.indexOf("\"", start);
            while (end > 0 && json.charAt(end - 1) == '\\') {
                end = json.indexOf("\"", end + 1);
            }
            return json.substring(start, end)
                .replace("\\n", "\n")
                .replace("\\\"", "\"");
        } catch (Exception e) {
            return null;
        }
    }

    // Simple JSON string escaper
    private String toJson(String text) {
        return "\"" + text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                + "\"";
    }

}