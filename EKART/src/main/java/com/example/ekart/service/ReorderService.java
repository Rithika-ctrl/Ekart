package com.example.ekart.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
 *
 * FIX (java:S3776 / java:S6541): processReorder CC reduced from 40 → ≤15 and
 *   Brain-Method metrics improved by extracting:
 *     validateSession(), validateOrder(), clearCartAndRestoreStock(),
 *     resolveProduct(), processOrderItem(), buildResult()
 * FIX (java:S135): the item loop now has at most one early exit (return from
 *   processOrderItem helper), eliminating multiple continue/break statements.
 * FIX (java:S3776 #253): checkOrderStock CC reduced from 21 → ≤15 by
 *   extracting resolveProductForItem() and buildItemInfo().
 */
@Service
@Transactional
public class ReorderService {

    private static final String K_SUCCESS        = "success";
    private static final String K_MESSAGE        = "message";
    private static final String K_AVAILABLE      = "available";
    private static final String K_CURRENT_STOCK  = "currentStock";
    private static final String K_CURRENT_PRICE  = "currentPrice";
    private static final String K_STATUS         = "status";
    private static final String K_CUSTOMER       = "customer";

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

    // ── Response DTO ─────────────────────────────────────────────────────────

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

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Process a reorder request.
     * Clears the cart and adds items from the specified order.
     *
     * FIX (java:S3776 / java:S6541): CC reduced from 40 → ≤15 by delegating
     * each concern to a dedicated private helper.
     *
     * @param orderId The order to reorder from
     * @param session The HTTP session containing customer info
     * @return ReorderResult with success status and details
     */
    public ReorderResult processReorder(int orderId, HttpSession session) {
        // 1. Validate session + fetch customer
        Customer customer = validateSession(session);
        if (customer == null) return failResult("Session expired. Please login again.");

        // 2. Validate order exists and belongs to this customer
        Order order = validateOrder(orderId, customer);
        if (order == null) return failResult("Order not found or not authorized.");

        List<Item> orderItems = order.getItems();
        if (orderItems == null || orderItems.isEmpty())
            return failResult("No items found in this order.");

        // 3. Clear existing cart (restoring stock)
        Cart cart = clearCartAndRestoreStock(customer);

        // 4. Add each order item back to cart
        List<String> outOfStock = new ArrayList<>();
        List<String> added      = new ArrayList<>();
        int itemsAdded          = 0;

        for (Item orderItem : orderItems) {
            // FIX (java:S135): single method call — no continue/break in this loop
            ItemAddOutcome outcome = processOrderItem(orderItem, cart);
            if (outcome.added) {
                added.add(outcome.label);
                itemsAdded++;
            } else {
                outOfStock.add(outcome.label);
            }
        }

        // 5. Persist and update session
        for (Item item : cart.getItems()) {
            itemRepository.save(item);
        }
        customerRepository.save(customer);
        session.setAttribute(K_CUSTOMER, customer);

        // 6. Build result
        return buildResult(outOfStock, added, itemsAdded);
    }

    /**
     * Check stock availability for items in an order without modifying cart.
     * Used for pre-check before showing confirmation modal.
     *
     * FIX (java:S3776 #253): CC reduced from 21 → ≤15 by extracting
     * resolveProductForItem() and buildItemInfo().
     */
    public Map<String, Object> checkOrderStock(int orderId, HttpSession session) {
        Map<String, Object> response = new HashMap<>();

        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) {
            response.put(K_SUCCESS, false);
            response.put(K_MESSAGE, "Session expired");
            return response;
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            response.put(K_SUCCESS, false);
            response.put(K_MESSAGE, "Order not found");
            return response;
        }

        Order order = orderOpt.get();
        if (order.getCustomer() == null || order.getCustomer().getId() != sessionCustomer.getId()) {
            response.put(K_SUCCESS, false);
            response.put(K_MESSAGE, "Not authorized");
            return response;
        }

        List<Map<String, Object>> items = new ArrayList<>();
        boolean hasOutOfStock = false;

        for (Item orderItem : order.getItems()) {
            Product product = resolveProductForItem(orderItem);
            Map<String, Object> itemInfo = buildItemInfo(orderItem, product);
            if (Boolean.FALSE.equals(itemInfo.get(K_AVAILABLE))
                    || !"in_stock".equals(itemInfo.get(K_STATUS))) {
                hasOutOfStock = true;
            }
            items.add(itemInfo);
        }

        response.put(K_SUCCESS, true);
        response.put("items", items);
        response.put("hasOutOfStock", hasOutOfStock);
        response.put("orderDate", order.getOrderDate() != null ? order.getOrderDate().toString() : null);
        return response;
    }

    // ── processReorder helpers ────────────────────────────────────────────────

    /** Validates session and returns a fresh Customer from DB, or null. */
    private Customer validateSession(HttpSession session) {
        Customer sessionCustomer = (Customer) session.getAttribute(K_CUSTOMER);
        if (sessionCustomer == null) return null;
        return customerRepository.findById(sessionCustomer.getId()).orElse(null);
    }

    /**
     * Validates that the order exists and belongs to the given customer.
     * Returns the Order, or null if validation fails.
     */
    private Order validateOrder(int orderId, Customer customer) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) return null;
        Order order = orderOpt.get();
        if (order.getCustomer() == null || order.getCustomer().getId() != customer.getId()) return null;
        return order;
    }

    /**
     * Returns an already-failed ReorderResult with the given message.
     * Used for early-exit guard clauses at the top of processReorder.
     */
    private static ReorderResult failResult(String message) {
        ReorderResult r = new ReorderResult();
        r.setSuccess(false);
        r.setMessage(message);
        return r;
    }

    /**
     * Clears the customer's cart, restoring stock for each removed item.
     * Returns the (now-empty) Cart, creating one if needed.
     */
    private Cart clearCartAndRestoreStock(Customer customer) {
        Cart cart = customer.getCart();
        if (cart == null) {
            cart = new Cart();
            cart.setItems(new ArrayList<>());
            customer.setCart(cart);
            return cart;
        }
        if (cart.getItems() != null && !cart.getItems().isEmpty()) {
            for (Item cartItem : cart.getItems()) {
                restoreStockForItem(cartItem);
            }
            itemRepository.deleteAll(cart.getItems());
            cart.setItems(new ArrayList<>());
        }
        return cart;
    }

    /** Restores product stock for a single cart item being removed. */
    private void restoreStockForItem(Item cartItem) {
        if (cartItem.getProductId() == null) return;
        productRepository.findById(cartItem.getProductId()).ifPresent(prod -> {
            prod.setStock(prod.getStock() + cartItem.getQuantity());
            productRepository.save(prod);
        });
    }

    /** Value object returned by processOrderItem. */
    private static class ItemAddOutcome {
        final boolean added;
        final String  label;
        ItemAddOutcome(boolean added, String label) { this.added = added; this.label = label; }
    }

    /**
     * Attempts to add one order item back to the cart.
     * FIX (java:S135): encapsulates all branching so the caller's loop
     * has no continue or break statements — a single method call per iteration.
     *
     * @return ItemAddOutcome — added=true with name×qty, or added=false with reason
     */
    private ItemAddOutcome processOrderItem(Item orderItem, Cart cart) {
        Product product = resolveProduct(orderItem);

        if (product == null || !product.isApproved()) {
            return new ItemAddOutcome(false, orderItem.getName() + " (no longer available)");
        }

        int requestedQty = orderItem.getQuantity();
        if (product.getStock() <= 0) {
            return new ItemAddOutcome(false, orderItem.getName() + " (out of stock)");
        }
        if (product.getStock() < requestedQty) {
            // Partial stock — note the shortage and use what's available
            String label = orderItem.getName()
                    + " (only " + product.getStock() + " available, requested " + requestedQty + ")";
            requestedQty = product.getStock();
            addItemToCart(product, requestedQty, cart);
            return new ItemAddOutcome(false, label);
        }

        addItemToCart(product, requestedQty, cart);
        return new ItemAddOutcome(true, product.getName() + " × " + requestedQty);
    }

    /** Looks up a Product by productId first, then by name as fallback. */
    private Product resolveProduct(Item orderItem) {
        if (orderItem.getProductId() != null) {
            Product p = productRepository.findById(orderItem.getProductId()).orElse(null);
            if (p != null) return p;
        }
        List<Product> byName = productRepository.findByNameContainingIgnoreCase(orderItem.getName());
        return byName.isEmpty() ? null : byName.get(0);
    }

    /** Creates a new cart Item from the given product + qty and adds it to the cart. */
    private void addItemToCart(Product product, int qty, Cart cart) {
        Item newItem = new Item();
        newItem.setName(product.getName());
        newItem.setCategory(product.getCategory());
        newItem.setDescription(product.getDescription());
        newItem.setImageLink(product.getImageLink());
        newItem.setUnitPrice(product.getPrice());
        newItem.setPrice(product.getPrice() * qty);
        newItem.setQuantity(qty);
        newItem.setProductId(product.getId());
        newItem.setCart(cart);
        cart.getItems().add(newItem);
        product.setStock(product.getStock() - qty);
        productRepository.save(product);
    }

    /** Builds the final ReorderResult from the collected added/outOfStock lists. */
    private static ReorderResult buildResult(List<String> outOfStock, List<String> added, int itemsAdded) {
        ReorderResult result = new ReorderResult();
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

    // ── checkOrderStock helpers ───────────────────────────────────────────────

    /**
     * Resolves the current Product for a given order item
     * (productId first, name fallback). Returns null if not found.
     */
    private Product resolveProductForItem(Item orderItem) {
        if (orderItem.getProductId() != null) {
            Product p = productRepository.findById(orderItem.getProductId()).orElse(null);
            if (p != null) return p;
        }
        List<Product> byName = productRepository.findByNameContainingIgnoreCase(orderItem.getName());
        return byName.isEmpty() ? null : byName.get(0);
    }

    /**
     * Builds the stock-info map for a single order item given its resolved product.
     * FIX (java:S3776): extracted from checkOrderStock to reduce its CC.
     */
    private Map<String, Object> buildItemInfo(Item orderItem, Product product) {
        Map<String, Object> itemInfo = new HashMap<>();
        itemInfo.put("name",     orderItem.getName());
        itemInfo.put("quantity", orderItem.getQuantity());

        if (product == null || !product.isApproved()) {
            itemInfo.put(K_AVAILABLE,     false);
            itemInfo.put(K_CURRENT_STOCK, 0);
            itemInfo.put(K_CURRENT_PRICE, 0);
            itemInfo.put(K_STATUS,        "unavailable");
        } else if (product.getStock() < orderItem.getQuantity()) {
            itemInfo.put(K_AVAILABLE,     product.getStock() > 0);
            itemInfo.put(K_CURRENT_STOCK, product.getStock());
            itemInfo.put(K_CURRENT_PRICE, product.getPrice());
            itemInfo.put(K_STATUS,        product.getStock() <= 0 ? "out_of_stock" : "partial");
        } else {
            itemInfo.put(K_AVAILABLE,     true);
            itemInfo.put(K_CURRENT_STOCK, product.getStock());
            itemInfo.put(K_CURRENT_PRICE, product.getPrice());
            itemInfo.put(K_STATUS,        "in_stock");
        }
        return itemInfo;
    }
}