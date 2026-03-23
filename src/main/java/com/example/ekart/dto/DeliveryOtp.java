/**
 * File: DeliveryOtp.java
 * Description: DTO for delivery OTPs used during handover confirmation.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.dto;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/DeliveryOtp.java
 *
 * NEW FILE — copy as-is into that location.
 *
 * Stores the one-time password sent to the customer when their order
 * goes OUT_FOR_DELIVERY. The delivery boy enters this OTP at the
 * customer's door to confirm successful handover.
 * Once used it cannot be reused.
 */
@Entity
@Table(name = "delivery_otp")
public class DeliveryOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** One OTP per order — unique constraint enforced */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    /** 6-digit OTP */
    @Column(nullable = false)
    private int otp;

    /** Becomes true once delivery boy submits the correct OTP */
    private boolean used = false;

    @Column(nullable = false)
    private LocalDateTime generatedAt;

    /** When the OTP was successfully used (for audit) */
    private LocalDateTime usedAt;

    // ── Constructors ──────────────────────────────────────────────

    public DeliveryOtp() {}

    public DeliveryOtp(Order order, int otp) {
        this.order       = order;
        this.otp         = otp;
        this.used        = false;
        this.generatedAt = LocalDateTime.now();
    }

    // ── Getters & Setters ─────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public int getOtp() { return otp; }
    public void setOtp(int otp) { this.otp = otp; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }

    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }

    public LocalDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(LocalDateTime usedAt) { this.usedAt = usedAt; }
}
