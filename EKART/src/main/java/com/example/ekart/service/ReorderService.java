package com.example.ekart.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.ekart.dto.Cart;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Product;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.ProductRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;

/**
 * Service for Re-Order functionality.
 * Allows customers to quickly reorder items from past orders.
 */
@Service
@Transactional
public class ReorderService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final ItemRepository itemRepository;

    public ReorderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            ItemRepository itemRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.itemRepository = itemRepository;
    }






    /**
     * Response DTO for reorder API
     */
    public static class ReorderResult {
        private boolean success;
        private String message;
        private List<String> outOfStockItems = new ArrayList<>();
        private List<String> addedItems = new ArrayList<>();
        private int totalItemsAdded;

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public List<String> getOutOfStockItems() { return outOfStockItems; }
        public void setOutOfStockItems(List<String> outOfStockItems) { this.outOfStockItems = outOfStockItems; }
        public List<String> getAddedItems() { return addedItems; }
        public void setAddedItems(List<String> addedItems) { this.addedItems = addedItems; }
        public int getTotalItemsAdded() { return totalItemsAdded; }
        public void setTotalItemsAdded(int totalItemsAdded) { this.totalItemsAdded = totalItemsAdded; }
    }

    /**
     * Process a reorder request.
     * Clears the cart and adds items from the specified order.
     * 
     * @param orderId The order to reorder from
     * @param session The HTTP session containing customer info
     * @return ReorderResult with success status and details
     */
    public ReorderResult processReorder(int orderId, HttpSession session) {
        ReorderResult result = new ReorderResult();

        // Verify customer session
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            result.setSuccess(false);
            result.setMessage("Session expired. Please login again.");
            return result;
        }

        // Fetch fresh customer from DB
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(null);
        if (customer == null) {
            result.setSuccess(false);
            result.setMessage("Customer not found. Please login again.");
            return result;
        }

        // Fetch the order
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            result.setSuccess(false);
            result.setMessage("Order not found.");
            return result;
        }

        Order order = orderOpt.get();

        // Verify ownership - customer can only reorder their own orders
        if (order.getCustomer() == null || order.getCustomer().getId() != customer.getId()) {
            result.setSuccess(false);
            result.setMessage("You can only reorder your own orders.");
            return result;
        }

        // Get order items
        List<Item> orderItems = order.getItems();
        if (orderItems == null || orderItems.isEmpty()) {
            result.setSuccess(false);
            result.setMessage("No items found in this order.");
            return result;
        }

        // Ensure cart exists
        Cart cart = customer.getCart();
        if (cart == null) {
            cart = new Cart();
            cart.setItems(new ArrayList<>());
            customer.setCart(cart);
        }

        // Clear existing cart items
        if (cart.getItems() != null && !cart.getItems().isEmpty()) {
            // Return stock for current cart items before clearing
            for (Item cartItem : cart.getItems()) {
                if (cartItem.getProductId() != null) {
                    Optional<Product> prodOpt = productRepository.findById(cartItem.getProductId());
                    if (prodOpt.isPresent()) {
                        Product prod = prodOpt.get();
                        prod.setStock(prod.getStock() + cartItem.getQuantity());
                        productRepository.save(prod);
                    }
                }
            }
            // Delete all cart items
            itemRepository.deleteAll(cart.getItems());
            cart.setItems(new ArrayList<>());
        }

        // Process each item from the old order
        List<String> outOfStock = new ArrayList<>();
        List<String> added = new ArrayList<>();
        int itemsAdded = 0;

        for (Item orderItem : orderItems) {
            // Find the current product (by productId or by name)
            Product product = null;
            if (orderItem.getProductId() != null) {
                product = productRepository.findById(orderItem.getProductId()).orElse(null);
            }
            // Fallback to name search if productId not found
            if (product == null) {
                List<Product> products = productRepository.findByNameContainingIgnoreCase(orderItem.getName());
                if (!products.isEmpty()) {
                    product = products.get(0);
                }
            }

            // Check if product exists and is approved
            if (product == null || !product.isApproved()) {
                outOfStock.add(orderItem.getName() + " (no longer available)");
                continue;
            }

            // Check stock availability
            int requestedQty = orderItem.getQuantity();
            if (product.getStock() < requestedQty) {
                if (product.getStock() <= 0) {
                    outOfStock.add(orderItem.getName() + " (out of stock)");
                    continue;
                } else {
                    // Partial stock available
                    outOfStock.add(orderItem.getName() + " (only " + product.getStock() + " available, requested " + requestedQty + ")");
                    requestedQty = product.getStock(); // Add what's available
                }
            }

            // Create new cart item with CURRENT prices
            Item newItem = new Item();
            newItem.setName(product.getName());
            newItem.setCategory(product.getCategory());
            newItem.setDescription(product.getDescription());
            newItem.setImageLink(product.getImageLink());
            newItem.setPrice(product.getPrice() * requestedQty); // Current price × quantity
            newItem.setQuantity(requestedQty);
            newItem.setProductId(product.getId());
            newItem.setCart(cart);

            cart.getItems().add(newItem);

            // Reduce stock
            product.setStock(product.getStock() - requestedQty);
            productRepository.save(product);

            added.add(newItem.getName() + " × " + requestedQty);
            itemsAdded++;
        }

        // Save cart items and customer
        for (Item item : cart.getItems()) {
            itemRepository.save(item);
        }
        customerRepository.save(customer);

        // Update session
        session.setAttribute("customer", customer);

        // Build result
        result.setOutOfStockItems(outOfStock);
        result.setAddedItems(added);
        result.setTotalItemsAdded(itemsAdded);

        if (itemsAdded == 0) {
            result.setSuccess(false);
            result.setMessage("Could not add any items. All items are out of stock.");
        } else if (!outOfStock.isEmpty()) {
            result.setSuccess(true);
            result.setMessage("Cart updated. Some items were unavailable.");
        } else {
            result.setSuccess(true);
            result.setMessage("All items added to cart successfully!");
        }

        return result;
    }

    /**
     * Check stock availability for items in an order without modifying cart.
     * Used for pre-check before showing confirmation modal.
     */
    public Map<String, Object> checkOrderStock(int orderId, HttpSession session) {
        Map<String, Object> response = new HashMap<>();

        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            response.put("success", false);
            response.put("message", "Session expired");
            return response;
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Order not found");
            return response;
        }

        Order order = orderOpt.get();

        // Verify ownership
        if (order.getCustomer() == null || order.getCustomer().getId() != sessionCustomer.getId()) {
            response.put("success", false);
            response.put("message", "Not authorized");
            return response;
        }

        List<Map<String, Object>> items = new ArrayList<>();
        boolean hasOutOfStock = false;

        for (Item orderItem : order.getItems()) {
            Map<String, Object> itemInfo = new HashMap<>();
            itemInfo.put("name", orderItem.getName());
            itemInfo.put("quantity", orderItem.getQuantity());

            Product product = null;
            if (orderItem.getProductId() != null) {
                product = productRepository.findById(orderItem.getProductId()).orElse(null);
            }
            if (product == null) {
                List<Product> products = productRepository.findByNameContainingIgnoreCase(orderItem.getName());
                if (!products.isEmpty()) {
                    product = products.get(0);
                }
            }

            if (product == null || !product.isApproved()) {
                itemInfo.put("available", false);
                itemInfo.put("currentStock", 0);
                itemInfo.put("currentPrice", 0);
                itemInfo.put("status", "unavailable");
                hasOutOfStock = true;
            } else if (product.getStock() < orderItem.getQuantity()) {
                itemInfo.put("available", product.getStock() > 0);
                itemInfo.put("currentStock", product.getStock());
                itemInfo.put("currentPrice", product.getPrice());
                itemInfo.put("status", product.getStock() <= 0 ? "out_of_stock" : "partial");
                hasOutOfStock = true;
            } else {
                itemInfo.put("available", true);
                itemInfo.put("currentStock", product.getStock());
                itemInfo.put("currentPrice", product.getPrice());
                itemInfo.put("status", "in_stock");
            }

            items.add(itemInfo);
        }

        response.put("success", true);
        response.put("items", items);
        response.put("hasOutOfStock", hasOutOfStock);
        response.put("orderDate", order.getOrderDate() != null ? order.getOrderDate().toString() : null);

        return response;
    }
}
