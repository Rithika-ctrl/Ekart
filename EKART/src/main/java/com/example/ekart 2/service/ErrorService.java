package com.example.ekart.service;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.ui.Model;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MissingRequestHeaderException;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class ErrorService {

    @ExceptionHandler(NoResourceFoundException.class)
    public String handle() {
        return "404.html";
    }

    // 🔥 TEMP DEBUG — shows real error in browser
    @ExceptionHandler(Exception.class)
    public String handleAll(Exception e, Model map) {
        e.printStackTrace(); // prints full stack trace in terminal
        map.addAttribute("errorMessage", e.getClass().getSimpleName() + ": " + e.getMessage());
        return "error.html";
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<Map<String, Object>> handleMissingHeader(MissingRequestHeaderException e) {
        // Log for debugging
        e.printStackTrace();
        Map<String, Object> res = new HashMap<>();
        res.put("success", false);
        res.put("message", "Missing request header: " + e.getHeaderName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
    }
}