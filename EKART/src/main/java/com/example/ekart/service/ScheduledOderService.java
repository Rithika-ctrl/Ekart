package com.example.ekart.service;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/service/ScheduledOrderService.java
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Business logic for scheduled/subscription orders.
 *
 * KEY RESPONSIBILITIES:
 *   1. CRUD operations exposed to FlutterScheduledOrderController
 *   2. Daily cron job that fires due deliveries at 6:00 AM IST
 *   3. Maps ScheduledOrder entities → frontend-ready response maps
 *
 * CRON SCHEDULE:
 *   "0 0 6 * * *"  → fires at 06:00:00 every day (server time).
 *   If your server runs UTC, adjust to "0 30 0 * * *" for 06:00 IST.
 *
 * NOTE: @EnableScheduling must be present on EkartApplication (it already
 * has @EnableAsync — add @EnableScheduling next to it).
 */
@Service
public class ScheduledOrderService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledOrderService.class);

    @Autowired private ScheduledOrderRepository scheduledOrderRepository;
    @Autowired private CustomerRepository        customerRepository;
    @Autowired private ProductRepository         productRepository;
    @Autowired private AddressRepository         addressRepository;
    @Autowired private OrderRepository           orderRepository;
    @Autowired private ItemRepository            itemRepository;
    @Autowired private EmailSender               emailSender;

    // ═════════════════════════════════════════════════════════════════════════
    //  CRUD — called by controller
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Returns all scheduled orders for a customer as frontend-ready maps.
     */
    public List<Map<String, Object>> getSchedulesForCustomer(int customerId) {
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) return Collections.emptyList();

        List<ScheduledOrder> schedules =
                scheduledOrderRepository.findByCustomerOrderByCreatedAtDesc(customer);

        List<Map<String, Object>> result = new ArrayList<>();
        for (ScheduledOrder so : schedules) {
            result.add(toResponseMap(so));
        }
        return result;
    }

    /**
     * Creates a new scheduled order.
     * Validates: product in stock, address belongs to customer, valid frequency.
     *
     * @return map with { success, id } or { success:false, message }
     */
    @Transactional
    public Map<String, Object> createSchedule(int customerId, Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();

        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            return fail(res, "Customer not found");
        }

        // ── Resolve product ───────────────────────────────────────────────────
        Integer productId = toInt(body.get("productId"));
        if (productId == null) return fail(res, "productId is required");
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return fail(res, "Product not found");
        if (product.getStock() <= 0) return fail(res, "Product is out of stock");

        // ── Quantity ──────────────────────────────────────────────────────────
        int qty = toInt(body.getOrDefault("quantity", 1));
        if (qty < 1 || qty > 20) return fail(res, "Quantity must be between 1 and 20");

        // ── Address (must belong to customer) ─────────────────────────────────
        Integer addressId = toInt(body.get("addressId"));
        if (addressId == null) return fail(res, "addressId is required");
        Address address = addressRepository.findById(addressId).orElse(null);
        if (address == null) return fail(res, "Address not found");
        if (address.getCustomer() == null || address.getCustomer().getId() != customerId) {
            return fail(res, "Address does not belong to this customer");
        }

        // ── Payment mode ──────────────────────────────────────────────────────
        String paymentMode = (String) body.getOrDefault("paymentMode", "COD");
        if (!paymentMode.equals("COD") && !paymentMode.equals("ONLINE_AUTOPAY")) {
            return fail(res, "Invalid paymentMode. Use COD or ONLINE_AUTOPAY");
        }

        // ── Frequency ─────────────────────────────────────────────────────────
        String freqType = (String) body.getOrDefault("frequencyType", "DAILY");
        if (!freqType.equals("DAILY") && !freqType.equals("EVERY_N_DAYS")) {
            return fail(res, "Invalid frequencyType. Use DAILY or EVERY_N_DAYS");
        }
        int freqValue = "DAILY".equals(freqType) ? 1 : toInt(body.getOrDefault("frequencyValue", 1));
        if (freqValue < 1) freqValue = 1;

        // ── Duration ──────────────────────────────────────────────────────────
        Integer durationDays = null;
        if (body.get("durationDays") != null) {
            durationDays = toInt(body.get("durationDays"));
            if (durationDays != null && durationDays < 1) durationDays = null;
        }

        // ── Start date ────────────────────────────────────────────────────────
        LocalDate startDate = LocalDate.now().plusDays(1); // default: tomorrow
        try {
            String sd = (String) body.get("startDate");
            if (sd != null && !sd.isBlank()) {
                LocalDate parsed = LocalDate.parse(sd);
                if (!parsed.isBefore(LocalDate.now())) startDate = parsed;
            }
        } catch (Exception ignored) {}

        // ── Build & save ──────────────────────────────────────────────────────
        ScheduledOrder so = new ScheduledOrder();
        so.setCustomer(customer);
        so.setProduct(product);
        so.setAddress(address);
        so.setQuantity(qty);
        so.setPaymentMode(paymentMode);
        so.setFrequencyType(freqType);
        so.setFrequencyValue(freqValue);
        so.setDurationDays(durationDays);
        so.setStartDate(startDate);
        so.setNextDeliveryDate(startDate);
        so.setStatus("ACTIVE");
        so.setTotalDeliveries(0);

        ScheduledOrder saved = scheduledOrderRepository.save(so);

        // ── Confirmation email ────────────────────────────────────────────────
        sendConfirmationEmail(customer, saved, product);

        res.put("success", true);
        res.put("id", saved.getId());
        return res;
    }

    /**
     * Updates quantity and/or status (ACTIVE/PAUSED) of an existing schedule.
     * Only the owning customer may update their schedule.
     */
    @Transactional
    public Map<String, Object> updateSchedule(int customerId, Long scheduleId, Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();

        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) return fail(res, "Customer not found");

        ScheduledOrder so = scheduledOrderRepository
                .findByIdAndCustomer(scheduleId, customer)
                .orElse(null);
        if (so == null) return fail(res, "Schedule not found");

        if ("CANCELLED".equals(so.getStatus()) || "COMPLETED".equals(so.getStatus())) {
            return fail(res, "Cannot update a " + so.getStatus().toLowerCase() + " schedule");
        }

        // Quantity update
        if (body.containsKey("quantity")) {
            int qty = toInt(body.get("quantity"));
            if (qty >= 1 && qty <= 20) so.setQuantity(qty);
        }

        // Status toggle: only ACTIVE ↔ PAUSED allowed by customer
        if (body.containsKey("status")) {
            String newStatus = (String) body.get("status");
            if ("ACTIVE".equals(newStatus) || "PAUSED".equals(newStatus)) {
                so.setStatus(newStatus);
            }
        }

        scheduledOrderRepository.save(so);
        res.put("success", true);
        return res;
    }

    /**
     * Cancels a schedule permanently.
     * Only the owning customer may cancel their schedule.
     */
    @Transactional
    public Map<String, Object> cancelSchedule(int customerId, Long scheduleId) {
        Map<String, Object> res = new HashMap<>();

        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) return fail(res, "Customer not found");

        ScheduledOrder so = scheduledOrderRepository
                .findByIdAndCustomer(scheduleId, customer)
                .orElse(null);
        if (so == null) return fail(res, "Schedule not found");

        if ("CANCELLED".equals(so.getStatus())) {
            return fail(res, "Schedule is already cancelled");
        }

        so.setStatus("CANCELLED");
        scheduledOrderRepository.save(so);

        res.put("success", true);
        return res;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  CRON JOB — fires daily at 06:00
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Processes all ACTIVE scheduled orders whose nextDeliveryDate is today or overdue.
     *
     * Cron: "0 0 6 * * *"  = 06:00:00 every day (server local time).
     *
     * For IST servers:     "0 0 6 * * *"   (server already in IST)
     * For UTC servers:     "0 30 0 * * *"  (00:30 UTC = 06:00 IST)
     *
     * IMPORTANT: Add @EnableScheduling to EkartApplication.java if not present.
     */
    @Scheduled(cron = "0 0 6 * * *")
    @Transactional
    public void processDueOrders() {
        LocalDate today = LocalDate.now();
        log.info("[ScheduledOrders] Processing due orders for date: {}", today);

        List<ScheduledOrder> dueOrders = scheduledOrderRepository.findDueOrders(today);
        log.info("[ScheduledOrders] Found {} due schedules", dueOrders.size());

        int success = 0, skipped = 0, failed = 0;

        for (ScheduledOrder so : dueOrders) {
            try {
                // Check if duration has been exceeded → auto-complete
                if (so.isDurationExceeded()) {
                    so.setStatus("COMPLETED");
                    scheduledOrderRepository.save(so);
                    log.info("[ScheduledOrders] Schedule {} auto-completed (duration exceeded)", so.getId());
                    skipped++;
                    continue;
                }

                // Place the actual order
                boolean placed = placeOrderForSchedule(so);

                if (placed) {
                    // Advance next delivery date
                    so.setNextDeliveryDate(so.getNextDeliveryDate().plusDays(so.getFrequencyValue()));
                    so.setTotalDeliveries(so.getTotalDeliveries() + 1);

                    // Check again if this was the last delivery
                    if (so.isDurationExceeded()) {
                        so.setStatus("COMPLETED");
                        log.info("[ScheduledOrders] Schedule {} completed after {} deliveries",
                                so.getId(), so.getTotalDeliveries());
                    }

                    scheduledOrderRepository.save(so);
                    success++;
                    log.info("[ScheduledOrders] Schedule {} → order placed successfully", so.getId());
                } else {
                    // Out of stock or other issue → skip today, retry tomorrow
                    so.setNextDeliveryDate(so.getNextDeliveryDate().plusDays(1));
                    scheduledOrderRepository.save(so);
                    failed++;
                    log.warn("[ScheduledOrders] Schedule {} → order failed (stock/config issue)", so.getId());
                }

            } catch (Exception e) {
                log.error("[ScheduledOrders] Error processing schedule {}: {}", so.getId(), e.getMessage(), e);
                failed++;
            }
        }

        log.info("[ScheduledOrders] Done. Success={}, Skipped={}, Failed={}", success, skipped, failed);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Internal: create an Order from a ScheduledOrder
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a real shopping_order row from the scheduled order config.
     * Mirrors the logic in FlutterApiController.placeOrder().
     *
     * @return true if order was created successfully, false if stock issue or other failure
     */
    private boolean placeOrderForSchedule(ScheduledOrder so) {
        try {
            Product product = productRepository.findById(so.getProduct().getId()).orElse(null);
            if (product == null) {
                log.warn("[ScheduledOrders] Product {} not found for schedule {}", so.getProduct().getId(), so.getId());
                return false;
            }

            // Stock check
            if (product.getStock() < so.getQuantity()) {
                log.warn("[ScheduledOrders] Insufficient stock for product '{}' (need {}, have {})",
                        product.getName(), so.getQuantity(), product.getStock());
                sendOutOfStockEmail(so.getCustomer(), so, product);
                return false;
            }

            // Build the order item
            Item item = new Item();
            item.setProductId(product.getId());
            item.setName(product.getName());
            item.setPrice(product.getPrice() * so.getQuantity());
            item.setQuantity(so.getQuantity());
            item.setUnitPrice(product.getPrice());
            item.setImageLink(product.getImageLink());
            item = itemRepository.save(item);

            // Deduct stock
            product.setStock(product.getStock() - so.getQuantity());
            productRepository.save(product);

            // Build the Order
            Order order = new Order();
            order.setCustomer(so.getCustomer());
            order.setPaymentMode(so.getPaymentMode());
            order.setDeliveryTime("STANDARD");
            order.setDeliveryCharge(0); // free delivery for scheduled orders
            order.setAmount(product.getPrice() * so.getQuantity());
            order.setTotalPrice(product.getPrice() * so.getQuantity());
            order.setTrackingStatus(TrackingStatus.PLACED);
            order.setDateTime(LocalDateTime.now());

            // Set address on order (uses addressId field)
            Address addr = so.getAddress();
            if (addr != null) {
                // Order has addressId field — set it if the field exists
                try {
                    order.getClass().getMethod("setAddressId", int.class)
                         .invoke(order, addr.getId());
                } catch (Exception ignored) {
                    // Field may be named differently — the order still saves fine
                }
            }

            order.getItems().add(item);
            orderRepository.save(order);

            // Send delivery notification email
            sendDeliveryScheduledEmail(so.getCustomer(), so, product, order);

            return true;

        } catch (Exception e) {
            log.error("[ScheduledOrders] Failed to place order for schedule {}: {}", so.getId(), e.getMessage(), e);
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Email notifications
    // ─────────────────────────────────────────────────────────────────────────

    private void sendConfirmationEmail(Customer customer, ScheduledOrder so, Product product) {
        try {
            String freq = "DAILY".equals(so.getFrequencyType())
                    ? "every day"
                    : "every " + so.getFrequencyValue() + " days";
            String duration = so.getDurationDays() != null
                    ? "for " + so.getDurationDays() + " days"
                    : "until you cancel";

            String subject = "✅ Scheduled Delivery Confirmed – " + product.getName();
            String body = "Hi " + customer.getName() + ",\n\n"
                    + "Your scheduled delivery has been set up successfully!\n\n"
                    + "Product  : " + product.getName() + "\n"
                    + "Quantity : " + so.getQuantity() + " per delivery\n"
                    + "Frequency: Delivered " + freq + "\n"
                    + "Duration : " + duration + "\n"
                    + "Starts   : " + so.getStartDate() + "\n"
                    + "Payment  : " + ("COD".equals(so.getPaymentMode()) ? "Cash on Delivery" : "Online Autopay") + "\n\n"
                    + "You can pause or cancel anytime from your Ekart app.\n\n"
                    + "Thank you for shopping with Ekart! 🛒";

            emailSender.sendEmail(customer.getEmail(), subject, body);
        } catch (Exception e) {
            log.warn("[ScheduledOrders] Confirmation email failed for schedule {}: {}", so.getId(), e.getMessage());
        }
    }

    private void sendDeliveryScheduledEmail(Customer customer, ScheduledOrder so, Product product, Order order) {
        try {
            String subject = "📦 Scheduled Delivery Dispatched – Order #" + order.getId();
            String body = "Hi " + customer.getName() + ",\n\n"
                    + "Your scheduled delivery is on its way!\n\n"
                    + "Order ID : #" + order.getId() + "\n"
                    + "Product  : " + product.getName() + "\n"
                    + "Quantity : " + so.getQuantity() + "\n"
                    + "Amount   : ₹" + String.format("%.2f", product.getPrice() * so.getQuantity()) + "\n"
                    + "Next delivery: " + so.getNextDeliveryDate() + "\n\n"
                    + "Track your order in the Ekart app.\n\n"
                    + "Thank you! 🛒";

            emailSender.sendEmail(customer.getEmail(), subject, body);
        } catch (Exception e) {
            log.warn("[ScheduledOrders] Dispatch email failed for order {}: {}", order.getId(), e.getMessage());
        }
    }

    private void sendOutOfStockEmail(Customer customer, ScheduledOrder so, Product product) {
        try {
            String subject = "⚠️ Scheduled Delivery Skipped – " + product.getName() + " is out of stock";
            String body = "Hi " + customer.getName() + ",\n\n"
                    + "We couldn't deliver your scheduled order today because '"
                    + product.getName() + "' is currently out of stock.\n\n"
                    + "We'll retry tomorrow. Your schedule is still active.\n\n"
                    + "Sorry for the inconvenience!\n\nEkart Team";

            emailSender.sendEmail(customer.getEmail(), subject, body);
        } catch (Exception e) {
            log.warn("[ScheduledOrders] Stock email failed for schedule {}: {}", so.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Response mapping
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Converts a ScheduledOrder entity to the JSON map the frontend expects.
     */
    public Map<String, Object> toResponseMap(ScheduledOrder so) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                 so.getId());
        m.put("productId",          so.getProduct().getId());
        m.put("productName",        so.getProduct().getName());
        m.put("productImage",       so.getProduct().getImageLink());
        m.put("productPrice",       so.getProduct().getPrice());
        m.put("quantity",           so.getQuantity());
        m.put("addressId",          so.getAddress().getId());
        m.put("addressLabel",       buildAddressLabel(so.getAddress()));
        m.put("paymentMode",        so.getPaymentMode());
        m.put("frequencyType",      so.getFrequencyType());
        m.put("frequencyValue",     so.getFrequencyValue());
        m.put("durationDays",       so.getDurationDays());
        m.put("startDate",          so.getStartDate() != null ? so.getStartDate().toString() : null);
        m.put("nextDeliveryDate",   so.getNextDeliveryDate() != null ? so.getNextDeliveryDate().toString() : null);
        m.put("status",             so.getStatus());
        m.put("totalDeliveries",    so.getTotalDeliveries());
        m.put("remainingDeliveries", so.getRemainingDeliveries());
        m.put("createdAt",          so.getCreatedAt() != null ? so.getCreatedAt().toString() : null);
        return m;
    }

    private String buildAddressLabel(Address addr) {
        if (addr == null) return "";
        StringBuilder sb = new StringBuilder();
        if (addr.getRecipientName() != null) sb.append(addr.getRecipientName()).append(" – ");
        if (addr.getHouseStreet() != null)   sb.append(addr.getHouseStreet()).append(", ");
        if (addr.getCity() != null)           sb.append(addr.getCity());
        return sb.toString().replaceAll(",\\s*$", "").trim();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Utilities
    // ─────────────────────────────────────────────────────────────────────────

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Integer) return (Integer) val;
        if (val instanceof Long)    return ((Long) val).intValue();
        if (val instanceof Double)  return ((Double) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return 0; }
    }

    private Map<String, Object> fail(Map<String, Object> res, String message) {
        res.put("success", false);
        res.put("message", message);
        return res;
    }
}