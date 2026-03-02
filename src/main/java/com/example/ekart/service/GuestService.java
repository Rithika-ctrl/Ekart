package com.example.ekart.service;

import java.util.HashSet;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import com.example.ekart.dto.Product;
import com.example.ekart.repository.ProductRepository;

import jakarta.servlet.http.HttpSession;

@Service
public class GuestService {

    @Autowired
    private ProductRepository productRepository;

    // ── Start a guest session ──────────────────────────────────────────────────
    public String startGuestSession(HttpSession session) {
        // Mark this session as a guest (don't overwrite existing customer session)
        if (session.getAttribute("customer") == null) {
            session.setAttribute("guest", true);
        }
        session.setAttribute("success", "Browsing as Guest — Login to add items to cart");
        return "redirect:/guest/browse";
    }

    // ── Load the guest browse page ─────────────────────────────────────────────
    public String loadGuestBrowse(HttpSession session, ModelMap map) {
        // If they already logged in as a customer, redirect them home
        if (session.getAttribute("customer") != null) {
            return "redirect:/customer/home";
        }

        // Mark as guest if not already
        session.setAttribute("guest", true);

        List<Product> products = productRepository.findByApprovedTrue();
        map.put("products", products);
        return "guest-browse.html";
    }

    // ── Guest search ───────────────────────────────────────────────────────────
    public String guestSearch(String query, HttpSession session, ModelMap map) {
        session.setAttribute("guest", true);

        HashSet<Product> products = new HashSet<>();
        if (query != null && !query.isBlank()) {
            products.addAll(productRepository.findByNameContainingIgnoreCase(query));
            products.addAll(productRepository.findByDescriptionContainingIgnoreCase(query));
            products.addAll(productRepository.findByCategoryContainingIgnoreCase(query));
        } else {
            products.addAll(productRepository.findByApprovedTrue());
        }

        map.put("products", products);
        map.put("query", query);
        map.put("isGuest", true);
        return "guest-browse.html";
    }

    // ── End guest session (on login) ───────────────────────────────────────────
    public static void endGuestSession(HttpSession session) {
        session.removeAttribute("guest");
    }
}