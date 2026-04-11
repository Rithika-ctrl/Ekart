package com.example.ekart.service;

import java.io.FileOutputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;

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

    public static void main(String[] args) throws Exception {
        generateSampleInvoice();
    }

    /**
     * Generates a sample DELIVERED order invoice and saves as PDF.
     */
    private static void generateSampleInvoice() throws Exception {
        System.out.println("\n" + "=".repeat(70));
        System.out.println("🔄 Generating sample invoice PDF...");
        System.out.println("=".repeat(70));

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
            System.out.println("\n✅ SUCCESS! Sample invoice PDF generated!");
            System.out.println("-".repeat(70));
            System.out.println("📄 File Location: " + new java.io.File(filePath).getAbsolutePath());
            System.out.println("📊 Invoice Number: " + order.getId());
            System.out.println("👤 Customer Name: " + customer.getName());
            System.out.println("📧 Email: " + customer.getEmail());
            System.out.println("📦 Items Count: " + items.size());
            System.out.println("💰 Subtotal: ₹" + String.format("%.2f", order.getAmount()));
            System.out.println("🏷️  GST Amount: ₹" + String.format("%.2f", order.getGstAmount()));
            System.out.println("🚚 Delivery Charge: ₹" + String.format("%.2f", order.getDeliveryCharge()));
            System.out.println("💳 Total Amount: ₹" + String.format("%.2f", order.getTotalPrice()));
            System.out.println("📅 Order Date: " + order.getOrderDate());
            System.out.println("🔄 Status: " + order.getTrackingStatus());
            System.out.println("-".repeat(70));
            System.out.println("\n✓ You can now open the PDF file at:");
            System.out.println("  " + new java.io.File(filePath).getAbsolutePath());
            System.out.println("\n✓ The invoice includes:");
            System.out.println("  • Professional EKART branding");
            System.out.println("  • Invoice number and date");
            System.out.println("  • Customer and delivery address");
            System.out.println("  • Item-wise breakdown with quantities and prices");
            System.out.println("  • GST calculations per category");
            System.out.println("  • Payment method and order status");
            System.out.println("  • Order totals with delivery charges");
            System.out.println("=".repeat(70) + "\n");

        } catch (Exception e) {
            System.err.println("\n❌ ERROR! Failed to generate invoice:");
            System.err.println("Message: " + e.getMessage());
            System.err.println("\nStack Trace:");
            e.printStackTrace();
            System.err.println("=".repeat(70) + "\n");
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
