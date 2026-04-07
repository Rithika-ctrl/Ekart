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
import com.example.ekart.dto.DeliveryBoy;
import com.example.ekart.dto.Order;

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
            System.err.println("Vendor OTP email failed: " + e.getMessage());
        }
    }

    /** Backward-compatible secure OTP sender used by services. */
    @Async
    public void sendVendorOtpSecure(Vendor vendor, String plainOtp) {
        try {
            vendor.setOtp(Integer.parseInt(plainOtp));
        } catch (Exception ignored) {
            // Fall back to existing otp value if parsing fails
        }
        send(vendor);
    }

    // ===================== SEND OTP TO CUSTOMER =====================
    @Async
    public void send(Customer customer) {
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
            System.err.println("Customer OTP email failed: " + e.getMessage());
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
            helper.setSubject("Order Confirmed - Order #" + orderId);
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
            System.err.println("Order confirmation email failed: " + e.getMessage());
        }
    }

    // ===================== SEND STOCK ALERT TO VENDOR =====================
    @Async
    public void sendStockAlert(Vendor vendor, Product product, int currentStock) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart Stock Alert");
            helper.setTo(vendor.getEmail());
            helper.setSubject("Low Stock Alert - " + product.getName());
            Context context = new Context();
            context.setVariable("vendorName", vendor.getName());
            context.setVariable("productName", product.getName());
            context.setVariable("currentStock", currentStock);
            context.setVariable("threshold", product.getStockAlertThreshold());
            context.setVariable("productId", product.getId());
            String html = templateEngine.process("stock-alert-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Stock alert email failed: " + e.getMessage());
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
            helper.setSubject("Replacement Requested - Order #" + orderId);
            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("orderId", orderId);
            context.setVariable("amount", amount);
            context.setVariable("items", items);
            String html = templateEngine.process("replacement-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Replacement email failed: " + e.getMessage());
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
            helper.setSubject("Order Cancelled - Order #" + orderId);
            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("orderId", orderId);
            context.setVariable("amount", amount);
            context.setVariable("items", items);
            String html = templateEngine.process("cancel-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Cancellation email failed: " + e.getMessage());
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
            helper.setSubject("Back in Stock: " + product.getName() + " - Ekart");
            Context context = new Context();
            context.setVariable("customerName", customer.getName());
            context.setVariable("productName", product.getName());
            context.setVariable("productId", product.getId());
            context.setVariable("productImage", product.getImageLink());
            context.setVariable("productPrice", product.getPrice());
            context.setVariable("productStock", product.getStock());
            String html = templateEngine.process("back-in-stock-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Back-in-stock email failed for " + customer.getEmail() + ": " + e.getMessage());
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
            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("otp", customer.getOtp());
            String html = templateEngine.process("otp-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Password reset email failed: " + e.getMessage());
            throw new RuntimeException("Email sending failed: " + e.getMessage());
        }
    }

    // ===================== SEND OTP TO DELIVERY BOY =====================
    @Async
    public void sendDeliveryBoyOtp(DeliveryBoy db) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(db.getEmail());
            helper.setSubject("OTP for Email Verification - Ekart Delivery");
            Context context = new Context();
            context.setVariable("name", db.getName());
            context.setVariable("otp", db.getOtp());
            String html = templateEngine.process("otp-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Delivery boy OTP email failed: " + e.getMessage());
        }
    }

    /** Backward-compatible secure OTP sender used by services. */
    @Async
    public void sendDeliveryBoyOtpSecure(DeliveryBoy db, String plainOtp) {
        try {
            db.setOtp(Integer.parseInt(plainOtp));
        } catch (Exception ignored) {
            // Fall back to existing otp value if parsing fails
        }
        sendDeliveryBoyOtp(db);
    }

    // ===================== SEND DOORSTEP OTP TO CUSTOMER =====================
    @Async
    public void sendDeliveryOtp(Customer customer, int otp, int orderId) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("Your Delivery OTP - Order #" + orderId + " - Ekart");
            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("otp", otp);
            context.setVariable("orderId", orderId);
            String html = templateEngine.process("delivery-otp-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Delivery OTP email failed: " + e.getMessage());
        }
    }

    // ===================== SEND SHIPPED NOTIFICATION TO CUSTOMER =====================
    @Async
    public void sendShippedEmail(Customer customer, Order order, String deliveryBoyName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("Your Order #" + order.getId() + " is On Its Way! - Ekart");
            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("orderId", order.getId());
            context.setVariable("deliveryBoyName", deliveryBoyName);
            context.setVariable("currentCity", order.getCurrentCity());
            context.setVariable("items", order.getItems());
            String html = templateEngine.process("shipped-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Shipped email failed: " + e.getMessage());
        }
    }

    // ===================== SEND DELIVERY CONFIRMATION TO CUSTOMER =====================
    @Async
    public void sendDeliveryConfirmation(Customer customer, Order order) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(customer.getEmail());
            helper.setSubject("Order #" + order.getId() + " Delivered! - Ekart");
            Context context = new Context();
            context.setVariable("name", customer.getName());
            context.setVariable("orderId", order.getId());
            context.setVariable("amount", order.getAmount());
            context.setVariable("items", order.getItems());
            String html = templateEngine.process("delivered-email.html", context);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Delivery confirmation email failed: " + e.getMessage());
        }
    }

    // ===================== NOTIFY ADMIN — NEW DELIVERY BOY PENDING =====================
    @Async
    public void sendDeliveryBoyPendingAlert(DeliveryBoy db) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(fromEmail); 
            helper.setSubject("New Delivery Boy Pending Approval — " + db.getName());

            String html = "<div style='font-family:Arial,sans-serif;padding:24px;max-width:500px;'>"
                + "<h2 style='color:#f5a800;margin-bottom:4px;'>New Delivery Boy Registration</h2>"
                + "<p style='color:#555;margin-top:0;'>A new delivery boy has registered and verified their email. Please review and approve or reject their application.</p>"
                + "<table style='border-collapse:collapse;width:100%;margin:16px 0;'>"
                + "<tr style='border-bottom:1px solid #eee;'><td style='padding:10px 8px;color:#888;font-size:0.85rem;'>Name</td><td style='padding:10px 8px;font-weight:600;'>" + db.getName() + "</td></tr>"
                + "<tr style='border-bottom:1px solid #eee;'><td style='padding:10px 8px;color:#888;font-size:0.85rem;'>Email</td><td style='padding:10px 8px;'>" + db.getEmail() + "</td></tr>"
                + "<tr style='border-bottom:1px solid #eee;'><td style='padding:10px 8px;color:#888;font-size:0.85rem;'>Mobile</td><td style='padding:10px 8px;'>" + db.getMobile() + "</td></tr>"
                + "<tr><td style='padding:10px 8px;color:#888;font-size:0.85rem;'>Code</td><td style='padding:10px 8px;color:#f5a623;font-weight:700;'>" + db.getDeliveryBoyCode() + "</td></tr>"
                + "</table>"
                + "<a href='/admin/delivery' style='display:inline-block;background:#f5a800;color:#1a1000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.9rem;'>Review in Admin Panel →</a>"
                + "<p style='color:#aaa;font-size:0.75rem;margin-top:20px;'>This is an automated notification from Ekart.</p>"
                + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Admin pending alert email failed: " + e.getMessage());
        }
    }

    // ===================== DELIVERY BOY APPROVED =====================
    @Async
    public void sendDeliveryBoyApproved(DeliveryBoy db) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(db.getEmail());
            helper.setSubject("Your Ekart Delivery Account is Approved! 🎉");

            String warehouseName = db.getWarehouse() != null
                ? db.getWarehouse().getName() + " — " + db.getWarehouse().getCity()
                : "Assigned warehouse";

            String html = "<div style='font-family:Arial,sans-serif;padding:24px;max-width:500px;'>"
                + "<h2 style='color:#f5a800;margin-bottom:4px;'>Congratulations, " + db.getName() + "!</h2>"
                + "<p style='color:#22c55e;font-weight:700;font-size:1rem;margin:8px 0;'>✅ Your delivery account has been approved.</p>"
                + "<p style='color:#555;'>You can now login to your delivery portal and start accepting deliveries.</p>"
                + "<table style='border-collapse:collapse;width:100%;margin:16px 0;'>"
                + "<tr style='border-bottom:1px solid #eee;'><td style='padding:10px 8px;color:#888;font-size:0.85rem;'>Your Code</td><td style='padding:10px 8px;font-weight:700;color:#f5a800;'>" + db.getDeliveryBoyCode() + "</td></tr>"
                + "<tr><td style='padding:10px 8px;color:#888;font-size:0.85rem;'>Warehouse</td><td style='padding:10px 8px;font-weight:600;'>" + warehouseName + "</td></tr>"
                + "</table>"
                + "<a href='/delivery/login' style='display:inline-block;background:#f5a800;color:#1a1000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.9rem;'>Login to Delivery Portal →</a>"
                + "<p style='color:#aaa;font-size:0.75rem;margin-top:20px;'>Welcome to the Ekart delivery team!</p>"
                + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Approval email failed: " + e.getMessage());
        }
    }

    // ===================== DELIVERY BOY REJECTED =====================
    @Async
    public void sendDeliveryBoyRejected(DeliveryBoy db, String reason) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(db.getEmail());
            helper.setSubject("Update on Your Ekart Delivery Application");

            String reasonText = (reason != null && !reason.isBlank())
                ? reason
                : "Your application did not meet our current requirements.";

            String html = "<div style='font-family:Arial,sans-serif;padding:24px;max-width:500px;'>"
                + "<h2 style='color:#f5a800;margin-bottom:4px;'>Hi " + db.getName() + ",</h2>"
                + "<p style='color:#555;'>Thank you for applying to become an Ekart delivery partner.</p>"
                + "<p style='color:#555;'>Unfortunately, we are unable to approve your application at this time.</p>"
                + "<div style='background:#fff5f5;border-left:3px solid #ff8060;padding:12px 16px;border-radius:4px;margin:16px 0;'>"
                + "<p style='color:#cc4444;margin:0;font-size:0.88rem;'><strong>Reason:</strong> " + reasonText + "</p>"
                + "</div>"
                + "<p style='color:#555;'>If you believe this is an error or would like to reapply, please contact our support team.</p>"
                + "<p style='color:#aaa;font-size:0.75rem;margin-top:20px;'>— The Ekart Team</p>"
                + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Rejection email failed: " + e.getMessage());
        }
    }

    // ===================== WAREHOUSE CHANGE APPROVED =====================
    @Async
    public void sendWarehouseChangeApproved(DeliveryBoy db, com.example.ekart.dto.Warehouse newWarehouse, String adminNote) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(db.getEmail());
            helper.setSubject("Warehouse Transfer Approved — Ekart");

            String noteHtml = (adminNote != null && !adminNote.isBlank())
                ? "<div style='background:#f0fff4;border-left:3px solid #22c55e;padding:10px 14px;border-radius:4px;margin:12px 0;'>"
                  + "<p style='color:#16a34a;margin:0;font-size:0.85rem;'><strong>Admin note:</strong> " + adminNote + "</p></div>"
                : "";

            String html = "<div style='font-family:Arial,sans-serif;padding:24px;max-width:500px;'>"
                + "<h2 style='color:#f5a800;margin-bottom:4px;'>Warehouse Transfer Approved ✅</h2>"
                + "<p style='color:#555;'>Hi " + db.getName() + ", your warehouse transfer request has been approved.</p>"
                + "<table style='border-collapse:collapse;width:100%;margin:16px 0;'>"
                + "<tr style='border-bottom:1px solid #eee;'><td style='padding:10px 8px;color:#888;font-size:0.85rem;'>New Warehouse</td>"
                + "<td style='padding:10px 8px;font-weight:600;'>" + newWarehouse.getName() + "</td></tr>"
                + "<tr><td style='padding:10px 8px;color:#888;font-size:0.85rem;'>Location</td>"
                + "<td style='padding:10px 8px;'>" + newWarehouse.getCity() + ", " + newWarehouse.getState() + "</td></tr>"
                + "</table>"
                + noteHtml
                + "<a href='/delivery/home' style='display:inline-block;background:#f5a800;color:#1a1000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.9rem;'>View Dashboard →</a>"
                + "<p style='color:#aaa;font-size:0.75rem;margin-top:20px;'>— Ekart Delivery Team</p>"
                + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Warehouse change approved email failed: " + e.getMessage());
        }
    }

    // ===================== WAREHOUSE CHANGE REJECTED =====================
    @Async
    public void sendWarehouseChangeRejected(DeliveryBoy db, com.example.ekart.dto.Warehouse requestedWarehouse, String adminNote) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(db.getEmail());
            helper.setSubject("Warehouse Transfer Request Update — Ekart");

            String noteHtml = (adminNote != null && !adminNote.isBlank())
                ? "<div style='background:#fff5f5;border-left:3px solid #ff8060;padding:10px 14px;border-radius:4px;margin:12px 0;'>"
                  + "<p style='color:#cc4444;margin:0;font-size:0.85rem;'><strong>Reason:</strong> " + adminNote + "</p></div>"
                : "";

            String html = "<div style='font-family:Arial,sans-serif;padding:24px;max-width:500px;'>"
                + "<h2 style='color:#f5a800;margin-bottom:4px;'>Warehouse Transfer Update</h2>"
                + "<p style='color:#555;'>Hi " + db.getName() + ", your request to transfer to <strong>"
                + requestedWarehouse.getName() + "</strong> could not be approved at this time.</p>"
                + noteHtml
                + "<p style='color:#555;'>You remain assigned to your current warehouse. Contact admin if you have questions.</p>"
                + "<p style='color:#aaa;font-size:0.75rem;margin-top:20px;'>— Ekart Delivery Team</p>"
                + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Warehouse change rejected email failed: " + e.getMessage());
        }
    }

    // ===================== ORDER DISPUTE / REPORT ISSUE =====================
    @Async
    public void sendDisputeNotification(String adminEmail, String fromEmail,
                                         int orderId, int customerId,
                                         String customerEmail, String reason,
                                         String description) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(fromEmail, "Ekart");
            helper.setTo(adminEmail);
            helper.setSubject("⚠️ Order Dispute Raised — Order #" + orderId);

            String descHtml = (description != null && !description.isBlank())
                ? "<div style='background:#fff8e1;border-left:3px solid #f5a800;padding:10px 14px;"
                  + "border-radius:4px;margin:12px 0;'>"
                  + "<p style='color:#555;margin:0;font-size:0.9rem;'><strong>Details:</strong> "
                  + description + "</p></div>"
                : "";

            String html = "<div style='font-family:Arial,sans-serif;padding:24px;max-width:560px;'>"
                + "<h2 style='color:#e53935;margin-bottom:4px;'>Order Dispute Raised</h2>"
                + "<p style='color:#555;'>A customer has reported an issue with an order.</p>"
                + "<table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:0.9rem;'>"
                + "<tr><td style='padding:6px 0;color:#888;width:140px;'>Order ID</td>"
                +     "<td style='padding:6px 0;font-weight:bold;'>#" + orderId + "</td></tr>"
                + "<tr><td style='padding:6px 0;color:#888;'>Customer ID</td>"
                +     "<td style='padding:6px 0;'>" + customerId + "</td></tr>"
                + "<tr><td style='padding:6px 0;color:#888;'>Customer Email</td>"
                +     "<td style='padding:6px 0;'>" + customerEmail + "</td></tr>"
                + "<tr><td style='padding:6px 0;color:#888;'>Reason</td>"
                +     "<td style='padding:6px 0;color:#e53935;font-weight:bold;'>" + reason + "</td></tr>"
                + "<tr><td style='padding:6px 0;color:#888;'>Raised At</td>"
                +     "<td style='padding:6px 0;'>"
                +     java.time.LocalDateTime.now()
                          .format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
                +     "</td></tr>"
                + "</table>"
                + descHtml
                + "<p style='color:#aaa;font-size:0.75rem;margin-top:20px;'>— Ekart Admin Alerts</p>"
                + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Dispute notification email failed: " + e.getMessage());
        }
    }

    // ===================== AUTO ASSIGN NOTIFICATION =====================
    /**
     * Notifies a delivery boy that an order has been automatically assigned to them.
     * Called by AutoAssignmentService after every successful auto-assignment.
     */
    public void sendAutoAssignNotification(DeliveryBoy deliveryBoy, Order order) {
        String subject = "New Order Auto-Assigned — Ekart Delivery";

        String customerName = order.getCustomer() != null ? order.getCustomer().getName() : "Customer";
        String address      = order.getDeliveryAddress() != null ? order.getDeliveryAddress() : "See app";
        String pin          = order.getDeliveryPinCode() != null ? order.getDeliveryPinCode() : "—";
        double amount       = order.getTotalPrice();

        String body = """
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
              <h2 style="color:#16a34a;">📦 New Order Assigned to You</h2>
              <p>Hello <strong>%s</strong>,</p>
              <p>A new order has been <strong>automatically assigned</strong> to you. Please pick it up from the warehouse as soon as possible.</p>
              <table style="width:100%%;border-collapse:collapse;margin:16px 0;">
                <tr style="background:#f3f4f6;">
                  <td style="padding:8px 12px;font-weight:bold;">Order ID</td>
                  <td style="padding:8px 12px;">#%d</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-weight:bold;">Customer</td>
                  <td style="padding:8px 12px;">%s</td>
                </tr>
                <tr style="background:#f3f4f6;">
                  <td style="padding:8px 12px;font-weight:bold;">Delivery Address</td>
                  <td style="padding:8px 12px;">%s</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-weight:bold;">PIN Code</td>
                  <td style="padding:8px 12px;">%s</td>
                </tr>
                <tr style="background:#f3f4f6;">
                  <td style="padding:8px 12px;font-weight:bold;">Amount</td>
                  <td style="padding:8px 12px;">₹%.2f</td>
                </tr>
              </table>
              <p>Log in to your delivery dashboard to view full order details and pick up the parcel.</p>
              <p style="color:#6b7280;font-size:13px;">— Ekart Delivery System</p>
            </div>
            """.formatted(deliveryBoy.getName(), order.getId(), customerName, address, pin, amount);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(deliveryBoy.getEmail());
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("sendAutoAssignNotification failed: " + e.getMessage());
        }
    }
}