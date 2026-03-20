package com.example.ekart.controller;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.ui.Model;

/**
 * Global exception handler — handles 404 and unexpected errors.
 * Moved from service package (was wrongly placed as ErrorService there).
 * error.html receives errorMessage; production sets include-stacktrace=never.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoResourceFoundException.class)
    public String handleNotFound() {
        return "404.html";
    }

    @ExceptionHandler(Exception.class)
    public String handleAll(Exception e, Model model) {
        // Stack trace goes to server logs only (include-stacktrace=never in properties)
        e.printStackTrace();
        model.addAttribute("errorMessage", e.getClass().getSimpleName() + ": " + e.getMessage());
        return "error.html";
    }
}
