package com.example.ekart.helper;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Product;
import com.example.ekart.dto.Item;
import com.example.ekart.dto.Vendor;

import jakarta.mail.internet.MimeMessage;

@Component
public class EmailSender {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // ===================== SEND OTP TO VENDOR =====================
    @Async
    public void send(Vendor vendor) {
        // OTP sent to email - log only in debug mode
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(vendor.getEmail());
            helper.setSubject("OTP for Email Verification - Ekart");

            Context context = new Context();
            context.setVariable("name", vendor.getName());
            context.setVariable("otp", vendor.getOtp());

            String html = templateEngine.process("otp-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("❌ Vendor OTP email failed: " + e.getMessage());
        }
    }

    // ===================== SEND OTP TO CUSTOMER =====================
    @Async
    public void send(Customer customer) {
        // OTP sent to email - log only in debug mode
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("OTP for Email Verification - Ekart");

            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("otp", customer.getOtp());

            String html = templateEngine.process("otp-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("❌ Customer OTP email failed: " + e.getMessage());
        }
    }

    // ===================== SEND ORDER CONFIRMATION =====================
    @Async
    public void sendOrderConfirmation(Customer customer, double amount, int orderId,
                                      String paymentMode, String deliveryTime, List<Item> items) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("Order Confirmed 🛍️ - Order #" + orderId);

            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("orderId", orderId);
            context.setVariable("amount", amount);
            context.setVariable("paymentMode", paymentMode);
            context.setVariable("deliveryTime", deliveryTime);
            context.setVariable("items", items);

            String html = templateEngine.process("order-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("❌ Order confirmation email failed: " + e.getMessage());
        }
    }

    // ===================== SEND STOCK ALERT TO VENDOR =====================
    @Async
    public void sendStockAlert(Vendor vendor, Product product, int currentStock) {
        String email = vendor.getEmail();
        String name = vendor.getName();

        System.out.println("⚠️ STOCK ALERT: Product '" + product.getName() + "' is low on stock (" + currentStock + " units)");

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart Stock Alert");
            helper.setTo(email);
            helper.setSubject("⚠️ Low Stock Alert - " + product.getName());

            Context context = new Context();
            context.setVariable("vendorName", name);
            context.setVariable("productName", product.getName());
            context.setVariable("currentStock", currentStock);
            context.setVariable("threshold", product.getStockAlertThreshold());
            context.setVariable("productId", product.getId());

            String html = templateEngine.process("stock-alert-email.html", context);
            helper.setText(html, true);

            mailSender.send(message);
            System.out.println("✅ Stock alert email sent to " + email);
        } catch (Exception e) {
            System.err.println("❌ Stock alert email failed, alert logged in console");
            e.printStackTrace();
        }
    }

    // ===================== SEND REPLACEMENT REQUEST =====================
    @Async
    public void sendReplacementRequest(Customer customer, double amount, int orderId, List<Item> items) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("Replacement Requested 🔄 - Order #" + orderId);

            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("orderId", orderId);
            context.setVariable("amount", amount);
            context.setVariable("items", items);

            String html = templateEngine.process("replacement-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("❌ Replacement email failed: " + e.getMessage());
        }
    }

    // ===================== SEND ORDER CANCELLATION =====================
    @Async
    public void sendOrderCancellation(Customer customer, double amount, int orderId, List<Item> items) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("Order Cancelled ❌ - Order #" + orderId);

            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("orderId", orderId);
            context.setVariable("amount", amount);
            context.setVariable("items", items);

            String html = templateEngine.process("cancel-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("❌ Cancellation email failed: " + e.getMessage());
        }
    }

    // ===================== SEND BACK-IN-STOCK NOTIFICATION =====================
    @Async
    public void sendBackInStockNotification(Customer customer, Product product) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("🎉 Back in Stock: " + product.getName() + " — Ekart");

            Context context = new Context();
            context.setVariable("customerName",  customer.getName());
            context.setVariable("productName",   product.getName());
            context.setVariable("productId",     product.getId());
            context.setVariable("productImage",  product.getImageLink());
            context.setVariable("productPrice",  product.getPrice());
            context.setVariable("productStock",  product.getStock());

            String html = templateEngine.process("back-in-stock-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
            System.out.println("✅ Back-in-stock email sent to " + customer.getEmail()
                    + " for product: " + product.getName());
        } catch (Exception e) {
            System.err.println("❌ Back-in-stock email failed for " + customer.getEmail()
                    + ": " + e.getMessage());
        }
    }

    // ===================== SEND PASSWORD RESET BY ADMIN =====================
    public void sendPasswordResetByAdmin(Customer customer) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("Password Reset - Ekart");

            // Use the same OTP email template — customer enters this OTP on the reset-password page
            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("otp", customer.getOtp());

            String html = templateEngine.process("otp-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
            System.out.println("\u2705 Password reset email sent to " + customer.getEmail());
        } catch (Exception e) {
            System.err.println("\u274C Password reset email failed: " + e.getMessage());
            throw new RuntimeException("Email sending failed: " + e.getMessage());
        }
    }
}