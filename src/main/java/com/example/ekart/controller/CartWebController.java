/**
 * File: CartWebController.java
 * Description: Web controller for session-based cart operations and quantity selection.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import com.example.ekart.dto.Cart;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Product;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * REST endpoint for session-based (web) add-to-cart with quantity selection.
 *
 * POST /api/cart/add-web
 *   Body: { "productId": 5, "quantity": 3 }
 *   Auth: HttpSession (customer must be logged in)
 *
 * Unlike the original /add-cart/{id} route (which only adds qty=1 and
 * rejects duplicates), this endpoint:
 *   - Accepts any quantity from 1 up to available stock
 *   - If the product is already in the cart, increments the existing qty
 *   - Returns JSON so the page can show a toast without a full reload
 */
@RestController
public class CartWebController {

    @Autowired private CustomerRepository customerRepository;
    @Autowired private ProductRepository  productRepository;
    @Autowired private ItemRepository     itemRepository;

    @PostMapping("/api/cart/add-web")
    @Transactional
    public Map<String, Object> addToCartWeb(
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        Map<String, Object> res = new HashMap<>();

        // ── Auth ──────────────────────────────────────────────────
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            res.put("success",  false);
            res.put("message",  "Please log in to add items to cart");
            res.put("redirect", "/customer/login");
            return res;
        }

        // ── Parse request ─────────────────────────────────────────
        int productId;
        int quantity;
        try {
            productId = Integer.parseInt(body.get("productId").toString());
            quantity  = Math.max(1, Integer.parseInt(
                    body.getOrDefault("quantity", 1).toString()));
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Invalid request");
            return res;
        }

        // ── Load entities ─────────────────────────────────────────
        Customer customer = customerRepository.findById(sessionCustomer.getId())
                .orElse(null);
        if (customer == null) {
            res.put("success", false);
            res.put("message", "Session expired, please log in again");
            return res;
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null || !product.isApproved()) {
            res.put("success", false);
            res.put("message", "Product not found");
            return res;
        }

        // ── Stock check ───────────────────────────────────────────
        if (product.getStock() <= 0) {
            res.put("success", false);
            res.put("message", "This product is out of stock");
            return res;
        }
        if (product.getStock() < quantity) {
            res.put("success", false);
            res.put("message", "Only " + product.getStock() + " unit"
                    + (product.getStock() == 1 ? "" : "s") + " available in stock");
            return res;
        }

        // ── Check if already in cart ──────────────────────────────
        Cart cart = customer.getCart();
        Optional<Item> existing = cart.getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .findFirst();

        if (existing.isPresent()) {
            // Increment existing cart item
            Item item      = existing.get();
            int totalQty   = item.getQuantity() + quantity;
            // Can't exceed available stock (note: stock was already decremented
            // when the item was first added, so remaining stock is what's left)
            int stockLeft  = product.getStock(); // stock remaining in warehouse
            if (quantity > stockLeft) {
                res.put("success", false);
                res.put("message", "Cannot add " + quantity + " more — only "
                        + stockLeft + " remaining in stock");
                return res;
            }

            double unitPrice = item.getUnitPrice() > 0
                    ? item.getUnitPrice()
                    : product.getPrice();
            item.setUnitPrice(unitPrice);
            item.setQuantity(totalQty);
            item.setPrice(unitPrice * totalQty);

            product.setStock(product.getStock() - quantity);

            itemRepository.save(item);
            productRepository.save(product);

            res.put("success", true);
            res.put("message", "Cart updated — quantity is now " + totalQty);
            res.put("alreadyInCart", true);

        } else {
            // Add new cart item
            Item newItem = new Item();
            newItem.setName(product.getName());
            newItem.setCategory(product.getCategory());
            newItem.setDescription(product.getDescription());
            newItem.setImageLink(product.getImageLink());
            newItem.setUnitPrice(product.getPrice());
            newItem.setPrice(product.getPrice() * quantity);
            newItem.setQuantity(quantity);
            newItem.setProductId(product.getId());
            newItem.setCart(cart);

            product.setStock(product.getStock() - quantity);

            cart.getItems().add(newItem);
            itemRepository.save(newItem);
            productRepository.save(product);
            customerRepository.save(customer);

            res.put("success",      true);
            res.put("alreadyInCart", false);
            res.put("message", quantity > 1
                    ? quantity + " items added to cart!"
                    : "Added to cart!");
        }

        // ── Refresh session & return cart count ───────────────────
        Customer updated = customerRepository.findById(customer.getId()).orElseThrow();
        session.setAttribute("customer", updated);

        res.put("cartCount",   updated.getCart().getItems().size());
        res.put("productName", product.getName());
        res.put("quantity",    quantity);

        return res;
    }
}