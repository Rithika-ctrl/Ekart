package com.example.ekart.service;

import java.io.FileOutputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * InvoiceServiceTestSample.java - Sample Invoice PDF Generator
 * 
 * Generates a SAMPLE invoice PDF for testing/demonstration purposes.
 * Run this test to generate "sample-invoice.pdf" in the EKART root directory.
 * 
 * Usage:
 *   mvn test -Dtest=InvoiceServiceTestSample
 *   Or: java -cp target/classes:target/dependency/* com.example.ekart.service.InvoiceServiceTestSample
 * 
 * Output:
 *   ./sample-invoice.pdf (can be opened with any PDF viewer)
 */
public class InvoiceServiceTestSample {

    private static final Logger LOGGER = LoggerFactory.getLogger(InvoiceServiceTestSample.class);

    public static void main(String[] args) throws Exception {
        generateSampleInvoice();
    }

    /**
     * Generates a sample DELIVERED order invoice and saves as PDF.
     */
    private static void generateSampleInvoice() throws Exception {
        LOGGER.info("\n{}", "=".repeat(70));
        LOGGER.info("🔄 Generating sample invoice PDF...");
        LOGGER.info("{}", "=".repeat(70));

        try {
            // ─── Create Sample Customer ────────────────────────
            Customer customer = new Customer();
            customer.setId(1);
            customer.setName("Rajesh Kumar");
            customer.setEmail("rajesh.kumar@gmail.com");
            customer.setMobile(9876543210L);

            // ─── Create Sample Order Items ─────────────────────
            List<Item> items = new ArrayList<>();

            items.add(createOrderItem("HILFY MIST CBE-100g", "SNACKS", 57.00, 1));
            items.add(createOrderItem("SUNFEAST BOUNCE-80g", "SNACKS", 26.50, 2));
            items.add(createOrderItem("SUNFEAST CHEESE-230g", "DAIRY", 46.50, 1));
            items.add(createOrderItem("NESTLE KITKAT-150g", "CHOCOLATE", 150.00, 1));

            // ─── Create Sample Order ───────────────────────────
            Order order = new Order();
            order.setId(12345);
            order.setCustomer(customer);
            order.setItems(items);
            order.setTrackingStatus(TrackingStatus.DELIVERED);
            order.setPaymentMode("UPI");
            order.setOrderDate(LocalDateTime.of(2026, 4, 10, 14, 30));
            order.setDeliveryAddress("123, MG Road, Bangalore, Karnataka - 560001, India");

            // Calculate totals
            double subtotal = 0;
            for (Item item : items) {
                subtotal += item.getQuantity() * item.getUnitPrice();
            }
            double gstAmount = subtotal * 0.10; // Approximate 10% average GST
            order.setAmount(subtotal);
            order.setDeliveryCharge(50.0);
            order.setGstAmount(gstAmount);
            order.setTotalPrice(subtotal + gstAmount + 50.0);

            // ─── Generate PDF ──────────────────────────────────
            InvoiceService invoiceService = new InvoiceService();
            byte[] pdfBytes = invoiceService.generateInvoicePdf(order);

            // ─── Save to File ──────────────────────────────────
            String filePath = "sample-invoice.pdf";
            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                fos.write(pdfBytes);
            }

            // ─── Success Output ────────────────────────────────
            LOGGER.info("\n✅ SUCCESS! Sample invoice PDF generated!");
            LOGGER.info("{}", "-".repeat(70));
            LOGGER.info("📄 File Location: {}", new java.io.File(filePath).getAbsolutePath());
            LOGGER.info("📊 Invoice Number: {}", order.getId());
            LOGGER.info("👤 Customer Name: {}", customer.getName());
            LOGGER.info("📧 Email: {}", customer.getEmail());
            LOGGER.info("📦 Items Count: {}", items.size());
            LOGGER.info("💰 Subtotal: ₹{}", String.format("%.2f", order.getAmount()));
            LOGGER.info("🏷️  GST Amount: ₹{}", String.format("%.2f", order.getGstAmount()));
            LOGGER.info("🚚 Delivery Charge: ₹{}", String.format("%.2f", order.getDeliveryCharge()));
            LOGGER.info("💳 Total Amount: ₹{}", String.format("%.2f", order.getTotalPrice()));
            LOGGER.info("📅 Order Date: {}", order.getOrderDate());
            LOGGER.info("🔄 Status: {}", order.getTrackingStatus());
            LOGGER.info("{}", "-".repeat(70));
            LOGGER.info("\n✓ You can now open the PDF file at:");
            LOGGER.info("  {}", new java.io.File(filePath).getAbsolutePath());
            LOGGER.info("\n✓ The invoice includes:");
            LOGGER.info("  • Professional EKART branding");
            LOGGER.info("  • Invoice number and date");
            LOGGER.info("  • Customer and delivery address");
            LOGGER.info("  • Item-wise breakdown with quantities and prices");
            LOGGER.info("  • GST calculations per category");
            LOGGER.info("  • Payment method and order status");
            LOGGER.info("  • Order totals with delivery charges");
            LOGGER.info("{}\n", "=".repeat(70));

        } catch (Exception e) {
            LOGGER.error("\n❌ ERROR! Failed to generate invoice:");
            LOGGER.error("Message: {}", e.getMessage());
            LOGGER.error("\nStack Trace:", e);
            LOGGER.error("{}\n", "=".repeat(70));
            throw e;
        }
    }

    /**
     * Helper method to create an order item with name, category, price, and quantity.
     */
    private static Item createOrderItem(String name, String category, double unitPrice, int quantity) {
        Item item = new Item();
        item.setName(name);
        item.setCategory(category);
        item.setUnitPrice(unitPrice);
        item.setPrice(unitPrice * quantity);
        item.setQuantity(quantity);
        return item;
    }
}
