package com.example.ekart.service;

// ================================================================
// NEW FILE: src/main/java/com/example/ekart/service/AutoAssignmentService.java
//
// Purpose:
//   Automatically assigns PACKED orders to ONLINE delivery boys when:
//     (a) An order transitions to PACKED status, OR
//     (b) A delivery boy comes ONLINE (toggles availability to true)
//
//   Rules enforced:
//     1. Order must be PACKED and have no delivery boy assigned yet.
//     2. Delivery boy must be: active, verified, adminApproved, available (online).
//     3. Delivery boy's assignedPinCodes must cover the order's deliveryPinCode.
//     4. Delivery boy must have fewer than MAX_CONCURRENT_ORDERS (3) active
//        orders (i.e., orders in SHIPPED or OUT_FOR_DELIVERY status).
//     5. When a delivery boy completes (DELIVERED) one of their 3 orders,
//        the next eligible PACKED order is auto-assigned to fill the slot.
//
//   Admin oversight:
//     - Every auto-assignment is logged via TrackingEventLog with actor="auto_system".
//     - Admin can see auto-assigned orders on the delivery management page.
//     - Admin can manually reassign orders from the same page if needed.
//     - A separate AdminAutoAssignLogRepository tracks each auto-assignment event
//       for the admin dashboard audit trail.
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AutoAssignmentService {

    /** Maximum number of concurrent active orders per delivery boy */
    public static final int MAX_CONCURRENT_ORDERS = 3;

    @Autowired private OrderRepository            orderRepository;
    @Autowired private DeliveryBoyRepository      deliveryBoyRepository;
    @Autowired private TrackingEventLogRepository trackingEventLogRepository;
    @Autowired private AutoAssignLogRepository    autoAssignLogRepository;
    @Autowired private EmailSender                emailSender;

    // ─────────────────────────────────────────────────────────────────────────
    // TRIGGER 1 — Called when an order is marked PACKED
    //   Tries to find an available delivery boy and assign this order.
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void onOrderPacked(Order order) {
        System.out.println("\n✉️  AUTO-ASSIGN TRIGGER: onOrderPacked() called for Order #" + order.getId());
        System.out.println("   PIN Code on Order: " + order.getDeliveryPinCode());
        System.out.println("   Already assigned: " + (order.getDeliveryBoy() != null));
        
        if (order.getDeliveryBoy() != null) {
            System.out.println("   → Order already has delivery boy, skipping\n");
            return; // already assigned
        }
        
        tryAssignOrder(order);
        System.out.println("");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRIGGER 2 — Called when a delivery boy comes ONLINE
    //   Fills up to MAX_CONCURRENT_ORDERS slots with eligible PACKED orders.
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void onDeliveryBoyOnline(DeliveryBoy deliveryBoy) {
        int currentActive = countActiveOrders(deliveryBoy);
        int slots = MAX_CONCURRENT_ORDERS - currentActive;
        if (slots <= 0) return;

        List<Order> packed = orderRepository.findByTrackingStatus(TrackingStatus.PACKED)
                .stream()
                .filter(o -> o.getDeliveryBoy() == null)
                .filter(o -> deliveryBoy.covers(o.getDeliveryPinCode()))
                .sorted(Comparator.comparing(Order::getOrderDate))  // oldest first
                .collect(Collectors.toList());

        int assigned = 0;
        for (Order order : packed) {
            if (assigned >= slots) break;
            doAssign(order, deliveryBoy);
            assigned++;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRIGGER 3 — Called when a delivery boy marks an order DELIVERED
    //   Frees up a slot — auto-assign the next queued PACKED order if available.
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void onOrderDelivered(DeliveryBoy deliveryBoy) {
        // Re-fetch from DB to get latest state
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoy.getId()).orElse(null);
        if (db == null || !db.isAvailable()) return;

        int currentActive = countActiveOrders(db);
        if (currentActive >= MAX_CONCURRENT_ORDERS) return;

        // Find the oldest unassigned PACKED order this delivery boy can cover
        List<Order> candidates = orderRepository.findByTrackingStatus(TrackingStatus.PACKED)
                .stream()
                .filter(o -> o.getDeliveryBoy() == null)
                .filter(o -> db.covers(o.getDeliveryPinCode()))
                .sorted(Comparator.comparing(Order::getOrderDate))
                .collect(Collectors.toList());

        if (!candidates.isEmpty()) {
            doAssign(candidates.get(0), db);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE: Find the best delivery boy for an order and assign
    // ─────────────────────────────────────────────────────────────────────────

    private void tryAssignOrder(Order order) {
        String pin = order.getDeliveryPinCode();
        if (pin == null || pin.isBlank()) return;

        System.out.println("🔍 AUTO-ASSIGN DEBUG: Order #" + order.getId() + " trying to find delivery boy for PIN: " + pin);

        // Find all delivery boys with matching PIN (ignoring availability/load for now)
        List<DeliveryBoy> allByPin = deliveryBoyRepository.findByPinCode(pin.trim());
        System.out.println("  ✓ Found " + allByPin.size() + " boy(s) with PIN " + pin);
        for (DeliveryBoy db : allByPin) {
            System.out.println("    - " + db.getName() + " (ID:" + db.getId() + ") | Online: " + db.isAvailable() + " | Active Orders: " + countActiveOrders(db));
        }

        // Now filter: must be available AND under capacity
        List<DeliveryBoy> eligible = allByPin.stream()
                .filter(db -> {
                    boolean isAvail = db.isAvailable();
                    if (!isAvail) System.out.println("    ✗ " + db.getName() + " OFFLINE (skipped)");
                    return isAvail;
                })
                .filter(db -> {
                    int active = countActiveOrders(db);
                    boolean underCap = active < MAX_CONCURRENT_ORDERS;
                    if (!underCap) System.out.println("    ✗ " + db.getName() + " has " + active + "/" + MAX_CONCURRENT_ORDERS + " (AT CAPACITY - skipped)");
                    return underCap;
                })
                .collect(Collectors.toList());

        System.out.println("  ✓ Eligible boys: " + eligible.size());
        if (eligible.isEmpty()) {
            System.out.println("  ❌ NO ELIGIBLE DELIVERY BOYS FOUND");
            return;
        }

        // Prefer the delivery boy with fewest active orders (load balancing)
        DeliveryBoy best = eligible.stream()
                .min(Comparator.comparingInt(this::countActiveOrders))
                .orElse(null);

        if (best != null) {
            System.out.println("  ✅ ASSIGNING to " + best.getName() + " (ID:" + best.getId() + ")");
            doAssign(order, best);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTUAL ASSIGNMENT — sets status to SHIPPED, logs, sends email
    // ─────────────────────────────────────────────────────────────────────────

    private void doAssign(Order order, DeliveryBoy deliveryBoy) {
        order.setDeliveryBoy(deliveryBoy);
        order.setTrackingStatus(TrackingStatus.SHIPPED);
        String city = deliveryBoy.getWarehouse() != null
                ? deliveryBoy.getWarehouse().getCity() : "In transit";
        order.setCurrentCity(city);
        orderRepository.save(order);

        // Tracking event log (visible to admin in order history)
        trackingEventLogRepository.save(new TrackingEventLog(
            order,
            TrackingStatus.SHIPPED,
            city,
            "[AUTO] Automatically assigned to delivery boy: "
                + deliveryBoy.getName()
                + " (" + deliveryBoy.getDeliveryBoyCode() + ")"
                + " | Active orders: " + (countActiveOrders(deliveryBoy))
                + "/" + MAX_CONCURRENT_ORDERS,
            "auto_system"
        ));

        // Admin audit log (dedicated table, admin can see/filter these)
        AutoAssignLog log = new AutoAssignLog();
        log.setOrderId(order.getId());
        log.setDeliveryBoy(deliveryBoy);
        log.setPinCode(order.getDeliveryPinCode());
        log.setAssignedAt(LocalDateTime.now());
        log.setActiveOrdersAtAssignment(countActiveOrders(deliveryBoy));
        autoAssignLogRepository.save(log);

        // Email notification to delivery boy
        try {
            emailSender.sendAutoAssignNotification(deliveryBoy, order);
        } catch (Exception e) {
            System.err.println("Auto-assign email failed: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER — count SHIPPED + OUT_FOR_DELIVERY orders for a delivery boy
    // ─────────────────────────────────────────────────────────────────────────

    public int countActiveOrders(DeliveryBoy deliveryBoy) {
        List<Order> orders = orderRepository.findByDeliveryBoy(deliveryBoy);
        return (int) orders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.SHIPPED
                          || o.getTrackingStatus() == TrackingStatus.OUT_FOR_DELIVERY)
                .count();
    }
}