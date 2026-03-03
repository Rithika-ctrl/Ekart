package com.example.ekart.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;

import com.example.ekart.dto.Address;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;

import com.example.ekart.dto.Cart;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Review;
import com.example.ekart.dto.Order; 
import com.example.ekart.helper.AES;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.AddressRepository;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.ItemRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.ProductRepository;
import com.example.ekart.repository.ReviewRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;


@Service
@Transactional
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private StockAlertService stockAlertService;

    @Autowired
    private EmailSender emailSender;

	@Autowired
	private ReviewRepository reviewRepository;

	@Autowired
	private AddressRepository addressRepository;

    // ---------------- REGISTER ----------------
    public String loadRegistration(ModelMap map, Customer customer) {
        map.put("customer", customer);
        return "customer-register.html";
    }

    public String registration(Customer customer, BindingResult result, HttpSession session) {

        if (!customer.getPassword().equals(customer.getConfirmPassword()))
            result.rejectValue("confirmPassword", "error.confirmPassword",
                    "* Password and Confirm Password Should Match");

        if (customerRepository.existsByEmail(customer.getEmail()))
            result.rejectValue("email", "error.email", "* Email Already Exists");

        if (customerRepository.existsByMobile(customer.getMobile()))
            result.rejectValue("mobile", "error.mobile", "* Mobile Number Already Exists");

        if (result.hasErrors())
            return "customer-register.html";

        int otp = new Random().nextInt(100000, 1000000);
        customer.setOtp(otp);
        customer.setPassword(AES.encrypt(customer.getPassword()));
        customerRepository.save(customer);

        try {
            emailSender.send(customer);
        } catch (Exception e) {
            System.err.println("Customer OTP email failed: " + e.getMessage());
        }

        session.setAttribute("success", "OTP Sent Successfully to your email");
        return "redirect:/customer/otp/" + customer.getId();
    }

    public String verifyOtp(int id, int otp, HttpSession session) {
        Customer customer = customerRepository.findById(id).orElseThrow();

        if (customer.getOtp() == otp) {
            customer.setVerified(true);
            customerRepository.save(customer);
            session.setAttribute("success", "Customer Account Created Successfully");
            return "redirect:/";
        }

        session.setAttribute("failure", "OTP Mismatch");
        return "redirect:/customer/otp/" + customer.getId();
    }

    // ---------------- LOGIN ----------------
    public String login(String email, String password, HttpSession session) {

        Customer customer = customerRepository.findByEmail(email);

        if (customer == null) {
            session.setAttribute("failure", "Invalid Email");
            return "redirect:/customer/login";
        }

        if (!AES.decrypt(customer.getPassword()).equals(password)) {
            session.setAttribute("failure", "Invalid Password");
            return "redirect:/customer/login";
        }

        if (!customer.isVerified()) {
            session.setAttribute("failure", "Verify Email First");
            return "redirect:/customer/login";
        }

        // Ensure cart exists
        if (customer.getCart() == null) {
            Cart cart = new Cart();
            cart.setItems(new ArrayList<>());
            customer.setCart(cart);
            customerRepository.save(customer);
        }

        // Clear guest session if present
        session.removeAttribute("guest");
        session.setAttribute("customer", customer);
        session.setAttribute("success", "Login Successful");
        return "redirect:/customer/home";
    }

    public String loadForgotPasswordPage() {
        return "customer-forgot-password.html";
    }

    public String sendResetOtp(String email, HttpSession session) {
        Customer customer = customerRepository.findByEmail(email);
        if (customer == null) {
            session.setAttribute("failure", "No account found with this email");
            return "redirect:/customer/forgot-password";
        }

        int otp = new Random().nextInt(100000, 1000000);
        customer.setOtp(otp);
        customerRepository.save(customer);
        emailSender.send(customer);

        session.setAttribute("success", "OTP sent to your registered email");
        return "redirect:/customer/reset-password/" + customer.getId();
    }

    public String loadResetPasswordPage(int id, ModelMap map) {
        map.put("id", id);
        return "customer-reset-password.html";
    }

    public String resetPassword(int id, int otp, String password, String confirmPassword, HttpSession session) {
        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) {
            session.setAttribute("failure", "Invalid reset request");
            return "redirect:/customer/forgot-password";
        }

        if (customer.getOtp() != otp) {
            session.setAttribute("failure", "Invalid OTP");
            return "redirect:/customer/reset-password/" + id;
        }

        if (password == null || confirmPassword == null || !password.equals(confirmPassword)) {
            session.setAttribute("failure", "Password and Confirm Password should match");
            return "redirect:/customer/reset-password/" + id;
        }

        String passwordRegex = "^.*(?=.{8,})(?=..*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$";
        if (!password.matches(passwordRegex)) {
            session.setAttribute("failure",
                    "Password must have 8+ characters with uppercase, lowercase, number and special character");
            return "redirect:/customer/reset-password/" + id;
        }

        customer.setPassword(AES.encrypt(password));
        customerRepository.save(customer);

        session.setAttribute("success", "Password reset successful. Please login");
        return "redirect:/customer/login";
    }

    public String loadCustomerHome(HttpSession session, org.springframework.ui.ModelMap map) {
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        if (sessionCustomer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }

        // 🔥 PENDING CART POPUP: fetch fresh customer and count cart items
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElse(sessionCustomer);
        int cartCount = 0;
        if (customer.getCart() != null && customer.getCart().getItems() != null) {
            cartCount = customer.getCart().getItems().size();
        }
        map.put("cartCount", cartCount);

        return "customer-home.html";
    }

    // ---------------- VIEW PRODUCTS ----------------
    public String viewProducts(HttpSession session, ModelMap map) {

        if (session.getAttribute("customer") == null)
            return "redirect:/customer/login";

        List<Product> products = productRepository.findByApprovedTrue();

        if (products.isEmpty()) {
            session.setAttribute("failure", "No Products Available");
            return "redirect:/customer/home";
        }

        map.put("products", products);
        return "customer-view-products.html";
    }

    // ---------------- SEARCH ----------------
    public String searchProducts(HttpSession session) {
        return "search.html";
    }

    public String search(String query, HttpSession session, ModelMap map) {
        HashSet<Product> products = new HashSet<>();
        products.addAll(productRepository.findByNameContainingIgnoreCase(query));
        products.addAll(productRepository.findByDescriptionContainingIgnoreCase(query));
        products.addAll(productRepository.findByCategoryContainingIgnoreCase(query));

        map.put("products", products);
        map.put("query", query);
        return "search.html";
    }

    // ---------------- ADD TO CART ----------------
    public String addToCart(int id, HttpSession session) {

        Customer sessionCustomer = (Customer) session.getAttribute("customer");

        if (sessionCustomer == null) {
            session.setAttribute("failure", "Session Expired, Login Again");
            return "redirect:/customer/login";
        }

        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        Product product = productRepository.findById(id).orElseThrow();

        Cart cart = customer.getCart();
        if (cart.getItems() == null)
            cart.setItems(new ArrayList<>());

        boolean exists = cart.getItems()
                .stream()
                .anyMatch(i -> i.getName().equals(product.getName()));

        if (exists) {
            session.setAttribute("failure", "Product already in cart");
            return "redirect:/customer/home";
        }

        Item item = new Item();
        item.setName(product.getName());
        item.setCategory(product.getCategory());
        item.setDescription(product.getDescription());
        item.setImageLink(product.getImageLink());
        item.setPrice(product.getPrice());
        item.setQuantity(1);
        item.setProductId(product.getId()); // 🔥 Track product ID

        item.setCart(cart);
        cart.getItems().add(item);

        product.setStock(product.getStock() - 1);

        itemRepository.save(item);
        productRepository.save(product);
        customerRepository.save(customer);

        session.setAttribute("success", "Added to cart");
        return "redirect:/customer/home";
    }

    // ---------------- VIEW CART ----------------
    public String viewCart(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }
        
        customer = customerRepository.findById(customer.getId()).orElseThrow();
        List<Item> items = customer.getCart().getItems();
        
        double totalPrice = 0;
        if (items != null) {
             for (Item item : items) {
                totalPrice += item.getPrice();
            }
        }

        map.put("items", items);
        map.put("totalPrice", totalPrice);
        
        return "view-cart.html";
    }

    // ---------------- INCREASE QUANTITY ----------------
    public String increase(int id, HttpSession session) {
        Item item = itemRepository.findById(id).orElseThrow();
        List<Product> products = productRepository.findByNameContainingIgnoreCase(item.getName());

        if (products.isEmpty()) {              // ← ADD THIS CHECK
        session.setAttribute("failure", "This product is no longer available.");
        return "redirect:/view-cart";
        }
        Product product = products.get(0);
        item.setQuantity(item.getQuantity() + 1);
        item.setPrice(item.getPrice() + product.getPrice());

        product.setStock(product.getStock() - 1);

        itemRepository.save(item);
        productRepository.save(product);

        return "redirect:/view-cart";
    }

    // ---------------- DECREASE QUANTITY ----------------
    public String decrease(int id, HttpSession session) {
        Item item = itemRepository.findById(id).orElseThrow();
        List<Product> products = productRepository.findByNameContainingIgnoreCase(item.getName());

        if (products.isEmpty()) {
            item.getCart().getItems().removeIf(i -> i.getId() == item.getId());
            itemRepository.delete(item);
            session.setAttribute("failure", "This product is no longer available.");
            return "redirect:/view-cart";
        }

        Product product = products.get(0);

        if (item.getQuantity() > 1) {
            item.setQuantity(item.getQuantity() - 1);
            item.setPrice(item.getPrice() - product.getPrice());
            itemRepository.save(item);
        } else {
            item.getCart().getItems().removeIf(i -> i.getId() == item.getId());
            itemRepository.delete(item);
        }

        product.setStock(product.getStock() + 1);
        productRepository.save(product);

        return "redirect:/view-cart";
    }

    // ---------------- REMOVE FROM CART ----------------
    @Transactional
    public String removeFromCart(int id, HttpSession session) {
        Item item = itemRepository.findById(id).orElseThrow();

        // Restore stock
        List<Product> products = productRepository.findByNameContainingIgnoreCase(item.getName());
        if (!products.isEmpty()) {
            Product product = products.get(0);
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }

        // Detach from cart list first, then delete
        Customer sessionCustomer = (Customer) session.getAttribute("customer");
        Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
        customer.getCart().getItems().removeIf(i -> i.getId() == id);
        customerRepository.save(customer);
        itemRepository.deleteById(id);

        session.setAttribute("success", "Item Removed from Cart");
        return "redirect:/view-cart";
    }

    // ---------------- PAYMENT PAGE ----------------
// ---------------- PAYMENT PAGE ----------------
public String payment(HttpSession session, ModelMap map) {
    Customer sessionCustomer = (Customer) session.getAttribute("customer");
    if (sessionCustomer == null) {
        session.setAttribute("failure", "Login First");
        return "redirect:/customer/login";
    }

    
    Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
    List<Item> items = customer.getCart().getItems();
    
    if (items == null || items.isEmpty()) {
        session.setAttribute("failure", "Your cart is empty! Add products before paying.");
        return "redirect:/view-cart";
    }
    
    double cartTotal = 0;

    // 🔥 Collect ALL unique categories from cart items
    java.util.LinkedHashSet<String> categorySet = new java.util.LinkedHashSet<>();
    java.util.Set<String> cartItemNames = new java.util.HashSet<>();

    for (Item item : items) {
        cartTotal += item.getPrice();
        if (item.getCategory() != null && !item.getCategory().isBlank()) {
            categorySet.add(item.getCategory());
        }
        cartItemNames.add(item.getName());
    }

    // 🔥 Fetch up to 4 recommendations across all categories, excluding cart items
    java.util.List<Product> recommendations = new java.util.ArrayList<>();
    for (String cat : categorySet) {
        List<Product> catProducts = productRepository.findByCategoryAndApprovedTrue(cat);
        for (Product p : catProducts) {
            if (!cartItemNames.contains(p.getName()) && recommendations.stream().noneMatch(r -> r.getId() == p.getId())) {
                recommendations.add(p);
                if (recommendations.size() >= 4) break;
            }
        }
        if (recommendations.size() >= 4) break;
    }

    // Label: "Electronics & Clothing" or just "Electronics"
    String categoryLabel = String.join(" & ", categorySet);

    // 🔥 NEW DELIVERY LOGIC
    // Free delivery for orders above 500, otherwise 40
    double deliveryCharge = (cartTotal >= 500) ? 0 : 40; 
    double finalAmount = cartTotal + deliveryCharge;
    
    // Send separate values so HTML can show the breakdown
    map.put("cartTotal", cartTotal);
    map.put("deliveryCharge", deliveryCharge);
    map.put("amount", finalAmount); 
    map.put("customer", customer);
    map.put("recommendedProducts", recommendations);
    map.put("cartItemCategory", categoryLabel);
    
    return "payment.html";
}

    // ---------------- PAYMENT SUCCESS (CLONING LOGIC) ----------------
public String paymentSuccess(Order order, HttpSession session) {
    Customer sessionCustomer = (Customer) session.getAttribute("customer");
    if (sessionCustomer == null) {
        session.setAttribute("failure", "Login First");
        return "redirect:/customer/login";
    }

    // Always fetch fresh from DB — never trust stale session object
    Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();

    order.setCustomer(customer);
    order.setOrderDate(java.time.LocalDateTime.now());

    // 1. Calculate subtotal from cart
    double subtotal = 0;
    for (Item cartItem : customer.getCart().getItems()) {
        subtotal += cartItem.getPrice();
    }

    // 2. Delivery charge logic
    double deliveryFee = (subtotal < 500) ? 40.0 : 0.0;
    double grandTotal  = subtotal + deliveryFee;

    order.setTotalPrice(subtotal);
    order.setDeliveryCharge(deliveryFee);
    order.setAmount(grandTotal);

    // 3. Clone cart items into order (preserves history even after cart clear)
    List<Item> orderItems = new ArrayList<>();
    for (Item cartItem : customer.getCart().getItems()) {
        Item newItem = new Item();
        newItem.setName(cartItem.getName());
        newItem.setPrice(cartItem.getPrice());
        newItem.setQuantity(cartItem.getQuantity());
        newItem.setCategory(cartItem.getCategory());
        newItem.setDescription(cartItem.getDescription());
        newItem.setImageLink(cartItem.getImageLink());
        newItem.setProductId(cartItem.getProductId());
        orderItems.add(newItem);
    }
    order.setItems(orderItems);

    // 4. Save order first
    orderRepository.save(order);
    orderRepository.flush(); // 🔥 ENSURE items are persisted to DB immediately

    // 5. 🔥 FIX: Properly delete cart items from DB, then clear the list
    List<Item> cartItems = new ArrayList<>(customer.getCart().getItems());
    customer.getCart().getItems().clear();
    customerRepository.save(customer);               // save with empty cart
    itemRepository.deleteAll(cartItems);             // delete from DB
    itemRepository.flush();                          // force immediate DB delete

    // 6. 🔥 FIX: Update session with fresh customer so cart count shows 0
    Customer updatedCustomer = customerRepository.findById(customer.getId()).orElseThrow();
    session.setAttribute("customer", updatedCustomer);

    session.setAttribute("success", "Order Placed Successfully!");
    return "redirect:/customer/home";
}

    // ---------------- VIEW ORDERS ----------------
    public String viewOrders(HttpSession session, ModelMap map) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/customer/login";
        }

        List<Order> orders = orderRepository.findByCustomer(customer);

        // 🔥 Build eligibility maps keyed by order ID — no new fields needed on Order.java
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(7);
        java.util.Map<Integer, Boolean> returnEligibleMap = new java.util.HashMap<>();
        java.util.Map<Integer, Boolean> replacementRequestedMap = new java.util.HashMap<>();

        for (Order order : orders) {
            boolean eligible = order.getOrderDate() != null && order.getOrderDate().isAfter(cutoff);
            returnEligibleMap.put(order.getId(), eligible);

            // Check if replacement was requested
            boolean replaced = false;
            try {
                replaced = order.isReplacementRequested();
            } catch (Exception e) {
                replaced = false;
            }
            replacementRequestedMap.put(order.getId(), replaced);
        }

        map.put("orders", orders);
        map.put("returnEligibleMap", returnEligibleMap);
        map.put("replacementRequestedMap", replacementRequestedMap);
        return "view-orders.html";
    }

    @Transactional
public String cancelOrder(int id, HttpSession session) {
    Customer sessionCustomer = (Customer) session.getAttribute("customer");
    if (sessionCustomer == null) {
        session.setAttribute("failure", "Login First");
        return "redirect:/customer/login";
    }

    // 1. Find the order first
    Order order = orderRepository.findById(id).orElseThrow();
    
    // 2. Save the data we need for the email BEFORE we delete the order
    double amount = order.getAmount();
    int orderId = order.getId();
    List<Item> orderItems = new java.util.ArrayList<>(order.getItems());

    // 3. Restore stock for each item
    for (Item item : order.getItems()) {
        List<Product> products = productRepository.findByNameContainingIgnoreCase(item.getName());
        if (!products.isEmpty()) {
            Product product = products.get(0);
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }
    }

    // 4. Send the cancellation email
    try {
        emailSender.sendOrderCancellation(sessionCustomer, amount, orderId, orderItems);
    } catch (Exception e) {
        System.err.println("Cancellation email failed to send.");
    }

    // 5. Delete the order from the database
    orderRepository.delete(order);

    session.setAttribute("success", "Order #" + orderId + " Cancelled Successfully");
    return "redirect:/view-orders";
}

@Transactional
public String requestReplacement(int orderId, HttpSession session) {
    Customer sessionCustomer = (Customer) session.getAttribute("customer");
    if (sessionCustomer == null) {
        session.setAttribute("failure", "Login First");
        return "redirect:/customer/login";
    }

    Order order = orderRepository.findById(orderId).orElse(null);
    if (order == null) {
        session.setAttribute("failure", "Order not found");
        return "redirect:/view-orders";
    }

    // Only allow within 7 days
    java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(7);
    if (order.getOrderDate() == null || order.getOrderDate().isBefore(cutoff)) {
        session.setAttribute("failure", "Replacement window has expired (7 days only)");
        return "redirect:/view-orders";
    }

    if (order.isReplacementRequested()) {
        session.setAttribute("failure", "Replacement already requested for this order");
        return "redirect:/view-orders";
    }

    order.setReplacementRequested(true);
    orderRepository.save(order);

    // Send replacement request email
    try {
        emailSender.sendReplacementRequest(sessionCustomer, order.getAmount(),
                order.getId(), order.getItems());
    } catch (Exception e) {
        System.err.println("Replacement email failed: " + e.getMessage());
    }

    session.setAttribute("success", "Replacement requested for Order #" + orderId + ". Our team will contact you shortly.");
    return "redirect:/view-orders";
}

public void addReview(int productId, int rating, String comment, HttpSession session) {
    Customer customer = (Customer) session.getAttribute("customer");
    Product product = productRepository.findById(productId).orElseThrow();

    Review review = new Review();
    review.setRating(rating);
    review.setComment(comment);
    review.setCustomerName(customer.getName());
    review.setProduct(product);

    reviewRepository.save(review);
}
public List<Product> getProductsByCategory(String category, String currentName) {
    List<Product> list = productRepository.findByCategoryAndApprovedTrue(category);
    
    // 🔥 This removes the "Biscuit" from the recommendation list
    list.removeIf(p -> p.getName().equalsIgnoreCase(currentName));
    
    // Limit to 2 items so it fits nicely in your col-6 layout
    return list.size() > 2 ? list.subList(0, 2) : list;
}

// ---------------- ORDER HISTORY ----------------
public String viewOrderHistory(HttpSession session, ModelMap map) {
    Customer customer = (Customer) session.getAttribute("customer");
    if (customer == null) {
        session.setAttribute("failure", "Login First");
        return "redirect:/customer/login";
    }
    List<Order> orders = orderRepository.findByCustomer(customer);
    map.put("orders", orders);
    return "order-history.html";
}

// ---------------- TRACK ORDERS ----------------
public String trackOrders(HttpSession session, ModelMap map) {
    Customer customer = (Customer) session.getAttribute("customer");
    if (customer == null) {
        session.setAttribute("failure", "Login First");
        return "redirect:/customer/login";
    }
    List<Order> orders = orderRepository.findByCustomer(customer);

    // For each order, compute which tracking steps are done/active/pending
    // Steps: 0=Placed(always done), 1=Confirmed(1h), 2=Packed(3h), 3=Shipped(6h), 4=OutForDelivery(12h), 5=Delivered(48h)
    // We pass a map of orderId -> stepIndex (0-5) representing current step
    java.util.Map<Integer, Integer> trackingStepMap = new java.util.HashMap<>();
    java.util.Map<Integer, Integer> progressWidthMap = new java.util.HashMap<>();

    for (Order order : orders) {
        long hrs = 0;
        if (order.getOrderDate() != null) {
            hrs = java.time.Duration.between(order.getOrderDate(), java.time.LocalDateTime.now()).toHours();
        }
        int step;
        int width;
        if (hrs >= 48) { step = 5; width = 80; }
        else if (hrs >= 12) { step = 4; width = 64; }
        else if (hrs >= 6)  { step = 3; width = 48; }
        else if (hrs >= 3)  { step = 2; width = 32; }
        else if (hrs >= 1)  { step = 1; width = 16; }
        else               { step = 0; width = 0; }

        trackingStepMap.put(order.getId(), step);
        progressWidthMap.put(order.getId(), width);
    }

    map.put("orders", orders);
    map.put("trackingStepMap", trackingStepMap);
    map.put("progressWidthMap", progressWidthMap);
    return "track-orders.html";
}

// Method to load the address page with fresh data
public String loadAddressPage(HttpSession session, ModelMap map) {
    Customer sessionCustomer = (Customer) session.getAttribute("customer");
    if (sessionCustomer == null) return "redirect:/customer/login";

    Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();
    map.put("customer", customer); // This now includes the 'addresses' list
    return "address-page.html";
}

// Method to save a NEW address to the list
public String saveAddress(String addressDetails, HttpSession session) {
    Customer sessionCustomer = (Customer) session.getAttribute("customer");
    Customer customer = customerRepository.findById(sessionCustomer.getId()).orElseThrow();

    Address newAddress = new Address();
    newAddress.setDetails(addressDetails);
    newAddress.setCustomer(customer);
    
    customer.getAddresses().add(newAddress);
    customerRepository.save(customer);

    return "redirect:/customer/address"; 
}

// Method to delete a specific address
public String deleteAddress(int id, HttpSession session) {
    addressRepository.deleteById(id);
    return "redirect:/customer/address";
}

}