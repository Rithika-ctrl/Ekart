package com.example.ekart.service;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.ui.Model;

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
}