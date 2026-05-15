package com.example.ekart.controller;
import java.util.Optional;

import com.example.ekart.dto.Cart;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Product;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * REST endpoint for session-based (web) add-to-cart with quantity selection.
 *
 * POST /api/cart/add-web
 *   Body: { "productId": 5, K_QUANTITY: 3 }
 *   Auth: HttpSession (customer must be logged in)
 *
 * Unlike the original /add-cart/{id} route (which only adds qty=1 and
 * rejects duplicates), this endpoint:
 *   - Accepts any quantity from 1 up to available stock
 *   - If the product is already in the cart, increments the existing qty
 *   - Returns JSON so the page can show a toast without a full reload
 *
 * FIX (java:S3776): addToCartWeb CC reduced from 18 to ≤15 by extracting
 *   validateStockForAdd(), incrementExistingItem(), and addNewItem() helpers.
 */
@RestController
public class CartWebController {

    // ── S1192 String constants ──
    private static final String K_MESSAGE         = "message";
    private static final String K_QUANTITY        = "quantity";
    private static final String K_SUCCESS         = "success";
    private static final String MSG_PRODUCT_NOT_FOUND = "Product not found";

    // ── Dependencies (constructor injection) ──────────────────────────────────
    private final CustomerRepository customerRepository;
    private final ProductRepository  productRepository;
    private final ItemRepository     itemRepository;

    public CartWebController(
            CustomerRepository customerRepository,
            ProductRepository productRepository,
            ItemRepository itemRepository) {
        this.customerRepository = customerRepository;
        this.productRepository  = productRepository;
        this.itemRepository     = itemRepository;
    }

    // ── Main endpoint ─────────────────────────────────────────────────────────

    @PostMapping("/api/cart/add-web")
    @Transactional
    public Map<String, Object> addToCartWeb(
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        Map<String, Object> res = new HashMap<>();

        // ── Auth ──────────────────────────────────────────────────
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            res.put(K_SUCCESS,  false);
            res.put(K_MESSAGE,  "Please log in to add items to cart");
            res.put("redirect", "/customer/login");
            return res;
        }

        // ── Parse request ─────────────────────────────────────────
        int productId;
        int quantity;
        try {
            productId = Integer.parseInt(body.get("productId").toString());
            quantity  = Math.max(1, Integer.parseInt(
                    body.getOrDefault(K_QUANTITY, 1).toString()));
        } catch (Exception e) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Invalid request");
            return res;
        }

        // ── Load entities ─────────────────────────────────────────
        Customer customer = customerRepository.findById(sessionCustomer.getId())
                .orElse(null);
        if (customer == null) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, "Session expired, please log in again");
            return res;
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null || !product.isApproved()) {
            res.put(K_SUCCESS, false);
            res.put(K_MESSAGE, MSG_PRODUCT_NOT_FOUND);
            return res;
        }

        // ── Stock check (initial) ─────────────────────────────────
        Map<String, Object> stockError = validateStockForAdd(product, quantity);
        if (!stockError.isEmpty()) return stockError;

        // ── Cart update ───────────────────────────────────────────
        Cart cart = customer.getCart();
        Optional<Item> existing = cart.getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .findFirst();

        if (existing.isPresent()) {
            Map<String, Object> err = incrementExistingItem(existing.get(), product, quantity, res);
            if (!err.isEmpty()) return err;
        } else {
            addNewItem(cart, product, quantity, customer, res);
        }

        // ── Refresh session & return cart count ───────────────────
        Customer updated = customerRepository.findById(customer.getId()).orElseThrow();
        session.setAttribute("customer", updated);

        res.put("cartCount",   updated.getCart().getItems().size());
        res.put("productName", product.getName());
        res.put(K_QUANTITY,    quantity);

        return res;
    }

    // ── Private helpers (extracted to reduce cognitive complexity) ────────────

    /**
     * Validates that {@code product} has enough stock for the requested
     * {@code quantity}. Returns an error map when validation fails, empty map otherwise.
     */
    private Map<String, Object> validateStockForAdd(Product product, int quantity) {
        if (product.getStock() <= 0) {
            Map<String, Object> err = new HashMap<>();
            err.put(K_SUCCESS, false);
            err.put(K_MESSAGE, "This product is out of stock");
            return err;
        }
        if (product.getStock() < quantity) {
            Map<String, Object> err = new HashMap<>();
            int stock = product.getStock();
            err.put(K_SUCCESS, false);
            err.put(K_MESSAGE, "Only " + stock + " unit" + (stock == 1 ? "" : "s") + " available in stock");
            return err;
        }
        return Collections.emptyMap();
    }

    /**
     * Increments an existing cart item's quantity.
     * Returns an error map if the remaining stock cannot satisfy {@code quantity},
     * empty map (and populates {@code res}) on success.
     */
    private Map<String, Object> incrementExistingItem(
            Item item, Product product, int quantity, Map<String, Object> res) {

        int stockLeft = product.getStock();
        if (quantity > stockLeft) {
            Map<String, Object> err = new HashMap<>();
            err.put(K_SUCCESS, false);
            err.put(K_MESSAGE, "Cannot add " + quantity + " more — only " + stockLeft + " remaining in stock");
            return err;
        }

        int    totalQty  = item.getQuantity() + quantity;
        double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : product.getPrice();
        item.setUnitPrice(unitPrice);
        item.setQuantity(totalQty);
        item.setPrice(unitPrice * totalQty);
        product.setStock(product.getStock() - quantity);

        itemRepository.save(item);
        productRepository.save(product);

        res.put(K_SUCCESS,      true);
        res.put(K_MESSAGE,      "Cart updated — quantity is now " + totalQty);
        res.put("alreadyInCart", true);
        return Collections.emptyMap();
    }

    /**
     * Creates and persists a new {@link Item} in the customer's cart.
     * Populates {@code res} with the success response.
     */
    private void addNewItem(
            Cart cart, Product product, int quantity, Customer customer, Map<String, Object> res) {

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

        res.put(K_SUCCESS,       true);
        res.put("alreadyInCart", false);
        res.put(K_MESSAGE, quantity > 1 ? quantity + " items added to cart!" : "Added to cart!");
    }
}