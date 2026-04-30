package com.example.ekart.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ekart.dto.*;
import com.example.ekart.repository.*;

/**
 * 🔥 TEMPORARY Test Data Loader Controller
 * Populates database with multi-vendor test data for demonstration
 */
@RestController
@RequestMapping("/admin/test-data")
public class TestDataController {

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final VendorRepository vendorRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;

    public TestDataController(
            VendorRepository vendorRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            OrderRepository orderRepository,
            ItemRepository itemRepository) {
        this.vendorRepository = vendorRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
    }



    @GetMapping("/load")
    public ResponseEntity<Map<String, String>> loadTestData() {
        try {
            Map<String, String> response = new HashMap<>();

            // 🔥 VENDOR 1: Sanjay E
            Vendor vendor1 = new Vendor();
            vendor1.setName("Sanjay E");
            vendor1.setEmail("sanjaye@gmail.com");
            vendor1.setMobile(9876543210L);
            vendor1.setPassword("Password@123");
            vendor1.setVendorCode("VND-00001");
            vendor1.setVerified(true);
            vendorRepository.save(vendor1);
            response.put("vendor1", "✅ Created: Sanjay E (VND-00001)");

            // 🔥 VENDOR 2: Raj Kumar
            Vendor vendor2 = new Vendor();
            vendor2.setName("Raj Kumar");
            vendor2.setEmail("rajkumar@gmail.com");
            vendor2.setMobile(9876543220L);
            vendor2.setPassword("Password@123");
            vendor2.setVendorCode("VND-00002");
            vendor2.setVerified(true);
            vendorRepository.save(vendor2);
            response.put("vendor2", "✅ Created: Raj Kumar (VND-00002)");

            // 🔥 PRODUCTS FOR VENDOR 1
            Product p1 = new Product();
            p1.setName("Wireless Headphones");
            p1.setDescription("Noise cancelling headphones");
            p1.setPrice(5000);
            p1.setCategory("Electronics");
            p1.setVendor(vendor1);
            productRepository.save(p1);

            Product p2 = new Product();
            p2.setName("USB-C Cable");
            p2.setDescription("High quality charging cable");
            p2.setPrice(500);
            p2.setCategory("Accessories");
            p2.setVendor(vendor1);
            productRepository.save(p2);

            // 🔥 PRODUCTS FOR VENDOR 2
            Product p3 = new Product();
            p3.setName("Gaming Laptop");
            p3.setDescription("High performance gaming laptop");
            p3.setPrice(89999);
            p3.setCategory("Electronics");
            p3.setVendor(vendor2);
            productRepository.save(p3);

            Product p4 = new Product();
            p4.setName("Mechanical Keyboard");
            p4.setDescription("RGB Mechanical Gaming Keyboard");
            p4.setPrice(5500);
            p4.setCategory("Accessories");
            p4.setVendor(vendor2);
            productRepository.save(p4);

            response.put("products", "✅ Created: 4 products (2 per vendor)");

            // 🔥 CUSTOMERS
            Customer c1 = new Customer();
            c1.setName("Raj Kumar");
            c1.setEmail("customer1@gmail.com");
            c1.setMobile(9876543211L);
            c1.setPassword("Password@123");
            c1.setVerified(true);
            customerRepository.save(c1);

            Customer c2 = new Customer();
            c2.setName("Priya Singh");
            c2.setEmail("customer2@gmail.com");
            c2.setMobile(9876543212L);
            c2.setPassword("Password@123");
            c2.setVerified(true);
            customerRepository.save(c2);

            response.put("customers", "✅ Created: 2 customers");

            // 🔥 ORDER 1: Customer 1 buys from VENDOR 1
            Order order1 = new Order();
            order1.setCustomer(c1);
            order1.setOrderDate(LocalDate.now().atStartOfDay());
            order1.setTotalPrice(5500);
            order1.setAmount(5500);
            order1.setDeliveryCharge(100);
            order1.setTrackingStatus(com.example.ekart.dto.TrackingStatus.DELIVERED);
            order1.setRazorpayOrderId("order_001");
            order1.setRazorpayPaymentId("pay_001");
            order1.setDateTime(LocalDate.now().atStartOfDay());
            order1.setReplacementRequested(false);
            
            Item item1 = new Item();
            item1.setProductId(p1.getId());
            item1.setName("Wireless Headphones");
            item1.setPrice(5000);
            item1.setCategory("Electronics");
            item1.setQuantity(1);

            Item item2 = new Item();
            item2.setProductId(p2.getId());
            item2.setName("USB-C Cable");
            item2.setPrice(500);
            item2.setCategory("Accessories");
            item2.setQuantity(1);

            order1.getItems().add(item1);
            order1.getItems().add(item2);
            
            itemRepository.save(item1);
            itemRepository.save(item2);
            orderRepository.save(order1);

            // 🔥 ORDER 2: Customer 2 buys from VENDOR 2
            Order order2 = new Order();
            order2.setCustomer(c2);
            order2.setOrderDate(LocalDate.now().atStartOfDay());
            order2.setTotalPrice(95499);
            order2.setAmount(95499);
            order2.setDeliveryCharge(100);
            order2.setTrackingStatus(com.example.ekart.dto.TrackingStatus.SHIPPED);
            order2.setRazorpayOrderId("order_002");
            order2.setRazorpayPaymentId("pay_002");
            order2.setDateTime(LocalDate.now().atStartOfDay());
            order2.setReplacementRequested(false);

            Item item3 = new Item();
            item3.setProductId(p3.getId());
            item3.setName("Gaming Laptop");
            item3.setPrice(89999);
            item3.setCategory("Electronics");
            item3.setQuantity(1);

            Item item4 = new Item();
            item4.setProductId(p4.getId());
            item4.setName("Mechanical Keyboard");
            item4.setPrice(5500);
            item4.setCategory("Accessories");
            item4.setQuantity(1);

            order2.getItems().add(item3);
            order2.getItems().add(item4);
            
            itemRepository.save(item3);
            itemRepository.save(item4);
            orderRepository.save(order2);

            // 🔥 ORDER 3: Mixed order - Customer 1 buys from BOTH vendors
            Order order3 = new Order();
            order3.setCustomer(c1);
            order3.setOrderDate(LocalDate.now().atStartOfDay());
            order3.setTotalPrice(10500);
            order3.setAmount(10500);
            order3.setDeliveryCharge(100);
            order3.setTrackingStatus(com.example.ekart.dto.TrackingStatus.DELIVERED);
            order3.setRazorpayOrderId("order_003");
            order3.setRazorpayPaymentId("pay_003");
            order3.setDateTime(LocalDate.now().atStartOfDay());
            order3.setReplacementRequested(false);

            Item item5 = new Item();
            item5.setProductId(p4.getId());
            item5.setName("Mechanical Keyboard");
            item5.setPrice(5500);
            item5.setCategory("Accessories");
            item5.setQuantity(1);

            Item item6 = new Item();
            item6.setProductId(p1.getId());
            item6.setName("Wireless Headphones");
            item6.setPrice(5000);
            item6.setCategory("Electronics");
            item6.setQuantity(1);

            order3.getItems().add(item5);
            order3.getItems().add(item6);
            
            itemRepository.save(item5);
            itemRepository.save(item6);
            orderRepository.save(order3);

            response.put("orders", "✅ Created: 3 orders (mixed vendors)");
            response.put("vendor1_result", "✅ Vendor 1 sees: ₹5,500 (Order 1) + ₹5,000 (Order 3) = ₹10,500");
            response.put("vendor2_result", "✅ Vendor 2 sees: ₹95,499 (Order 2) + ₹5,500 (Order 3) = ₹100,999");
            response.put("success", "✅ ALL TEST DATA LOADED!");
            response.put("next", "Login: sanjaye@gmail.com / rajkumar@gmail.com → /vendor/sales-report");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(error);
        }
    }
}