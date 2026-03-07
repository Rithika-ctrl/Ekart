package com.example.ekart.helper;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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

    // ===================== SEND PASSWORD RESET BY ADMIN =====================
    public void sendPasswordResetByAdmin(Customer customer) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("Password Reset Request - Ekart");

            String resetUrl = "http://localhost:8080/customer/reset-password/" + customer.getId() + "/" + customer.getOtp();
            
            String htmlContent = String.format(
                "<html><body style='font-family: Arial, sans-serif;'>" +
                "<div style='max-width: 600px; margin: 0 auto; padding: 20px;'>" +
                "<h2 style='color: #f5a800;'>Password Reset Request</h2>" +
                "<p>Hello %s,</p>" +
                "<p>A password reset has been requested for your account by the administrator.</p>" +
                "<p>Your OTP code is: <strong style='font-size: 24px; color: #f5a800;'>%d</strong></p>" +
                "<p>Or click the link below to reset your password:</p>" +
                "<p><a href='%s' style='background: #f5a800; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;'>Reset Password</a></p>" +
                "<p style='color: #666; font-size: 12px;'>If you did not request this reset, please contact support.</p>" +
                "</div></body></html>",
                customer.getName(), customer.getOtp(), resetUrl
            );

            helper.setText(htmlContent, true);
            mailSender.send(message);
            System.out.println("✅ Password reset email sent to " + customer.getEmail());
        } catch (Exception e) {
            System.err.println("❌ Password reset email failed: " + e.getMessage());
            throw new RuntimeException("Email sending failed: " + e.getMessage());
        }
    }
}