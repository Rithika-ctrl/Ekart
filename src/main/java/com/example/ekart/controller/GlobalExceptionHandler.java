package com.example.ekart.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.ui.Model;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global exception handler — handles 404 and unexpected errors.
 * For AJAX/fetch/non-GET requests returns JSON so the frontend
 * can show a proper error message instead of crashing on r.json().
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoResourceFoundException.class)
    public String handleNotFound() {
        return "404.html";
    }

    @ExceptionHandler(Exception.class)
    public Object handleAll(Exception e, Model model, HttpServletRequest request) {
        e.printStackTrace();

        // Detect AJAX / fetch / non-GET — return JSON so frontend can parse it
        String method  = request.getMethod();
        String accept  = request.getHeader("Accept");
        String xrw     = request.getHeader("X-Requested-With");
        String path    = request.getRequestURI();

        boolean isAjax = "XMLHttpRequest".equals(xrw)
                || (accept != null && accept.contains("application/json"))
                || !"GET".equalsIgnoreCase(method)
                || path.startsWith("/api/");

        if (isAjax) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("success", false);
            body.put("message", "Server error: " + e.getClass().getSimpleName()
                    + (e.getMessage() != null ? " — " + e.getMessage() : ""));
            return ResponseEntity.status(500).body(body);
        }

        // Normal browser page load — show error page
        model.addAttribute("errorMessage", e.getClass().getSimpleName() + ": " + e.getMessage());
        return "error.html";
    }
}