package com.example.ekart.dto;
import com.example.ekart.dto.Address;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/Order.java
 *
 * Each Order now represents ONE vendor's items within a customer purchase.
 * When a customer has items from N vendors, N sub-orders are created,
 * all sharing the same parentOrderId so they can be grouped on the UI.
 *
 * parentOrderId = null  → single-vendor order (legacy / single vendor cart)
 * parentOrderId = X     → sub-order belonging to group X
 */
@Entity(name = "shopping_order")
@Table(name = "shopping_order", indexes = {
    @Index(name = "idx_order_date",     columnList = "order_date"),
    @Index(name = "idx_order_customer", columnList = "customer_id"),
    @Index(name = "idx_order_parent",   columnList = "parent_order_id")
})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "razorpay_payment_id", nullable = true, length = 100)
    private String razorpayPaymentId;

    @Column(name = "razorpay_order_id", nullable = true, length = 100)
    private String razorpayOrderId;

    @Column(columnDefinition = "FLOAT8 DEFAULT 0")
    private double amount = 0;

    @Column(name = "date_time", nullable = true)
    private LocalDateTime dateTime;

    @Column(name = "delivery_charge", columnDefinition = "FLOAT8 DEFAULT 0")
    private double deliveryCharge = 0;

    @Column(name = "total_price", columnDefinition = "FLOAT8 DEFAULT 0")
    private double totalPrice = 0;

    /**
     * GST component back-calculated from the order's item prices (inclusive pricing).
     * Stored at order placement time so invoices and history always show the correct
     * GST even if rates change later.
     * 0.0 for legacy orders placed before GST tracking was added.
     */
    @Column(name = "gst_amount", columnDefinition = "FLOAT8 DEFAULT 0")
    private double gstAmount = 0;

    @Column(name = "payment_mode", nullable = true, length = 50)
    private String paymentMode;

    @CreationTimestamp
    @Column(name = "order_date")
    private LocalDateTime orderDate;

    @Column(name = "delivery_time", nullable = true, length = 300)
    private String deliveryTime;

    @Column(name = "replacement_requested", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean replacementRequested = false;

    @Column(name = "tracking_status", length = 50)
    @Enumerated(EnumType.STRING)
    private TrackingStatus trackingStatus = TrackingStatus.PROCESSING;

    @Column(name = "current_city", nullable = true, length = 100)
    private String currentCity;

    @Transient
    private boolean returnEligible;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Item> items = new ArrayList<Item>();

    @ManyToOne
    private Customer customer;

    // ─── DELIVERY SYSTEM FIELDS ───────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_boy_id")
    private DeliveryBoy deliveryBoy;

    @Column(name = "delivery_pin_code", length = 10)
    private String deliveryPinCode;

    /**
     * Snapshot of the customer's delivery address at checkout.
     * Format: "RecipientName | HouseStreet, City, State - PostalCode"
     */
    @Column(name = "delivery_address", length = 500)
    private String deliveryAddress;

    // ─── SUB-ORDER SUPPORT ────────────────────────────────────────

    /**
     * When a cart has items from multiple vendors, one sub-order is
     * created per vendor. All sub-orders in the same purchase share
     * the same parentOrderId (= the id of the first sub-order saved).
     *
     * null  → single-vendor order or legacy order
     * non-null → this order is part of a multi-vendor split purchase
     */
    @Column(name = "parent_order_id", nullable = true)
    private Integer parentOrderId;

    /**
     * The vendor who owns the items in this sub-order.
     * null for legacy orders. Use this relationship instead of vendorId.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    // ─── MULTI-WAREHOUSE ROUTING & COD FIELDS ─────────────────────

    /**
     * Payment method: RAZORPAY (prepaid) or COD (cash on delivery).
     * Determines checkout flow and payment collection strategy.
     */
    @Column(name = "payment_method", length = 50, nullable = true)
    private String paymentMethod = "RAZORPAY";

    /**
     * Source warehouse ID for multi-city routing.
     * Warehouse where vendor's items are stored initially.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_warehouse_id")
    private Warehouse sourceWarehouse;

    /**
     * Destination warehouse ID for multi-city routing.
     * Final warehouse closest to customer's delivery location.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_warehouse_id")
    private Warehouse destinationWarehouse;

    /**
     * Comma-separated list of intermediate warehouse IDs.
     * Example: "5,8,12" means transfer through warehouses 5 → 8 → 12
     */
    @Column(name = "intermediate_warehouse_ids", length = 500, nullable = true)
    private String intermediateWarehouseIds;

    /**
     * Complete routing path for display: "Delhi → Hyderabad → Bangalore"
     * Generated from warehouse chain during routing calculation.
     */
    @Column(name = "warehouse_routing_path", length = 1000, nullable = true)
    private String warehouseRoutingPath;

    /**
     * COD (Cash On Delivery) amount collected from customer.
     * Only populated for COD orders; null for Razorpay orders.
     */
    @Column(name = "cod_amount", columnDefinition = "FLOAT8", nullable = true)
    private Double codAmount;

    /**
     * Delivery boy ID who collected the COD cash.
     * Set when delivery boy confirms delivery for COD order.
     */
    @Column(name = "cod_collected_by", nullable = true)
    private Integer codCollectedBy;

    /**
     * Timestamp when COD cash was collected by delivery boy.
     */
    @Column(name = "cod_collection_timestamp", nullable = true)
    private LocalDateTime codCollectionTimestamp;

    /**
     * Final delivery boy assigned for last-mile delivery.
     * Set during warehouse staff assignment phase.
     */
    @Column(name = "final_delivery_boy_id", nullable = true)
    private Integer finalDeliveryBoyId;

    /**
     * Cash settlement ID this order belongs to (for COD only).
     * Links to the settlement batch that processed this order's COD cash.
     */
    @Column(name = "cash_settlement_id", nullable = true)
    private Integer cashSettlementId;

    /**
     * Payment status for COD orders:
     * PENDING → COLLECTED → VERIFIED → SETTLED
     */
    @Column(name = "payment_status", length = 50, nullable = true)
    private String paymentStatus = "PENDING";

    /**
     * Timestamp when payment was verified by admin (COD orders only).
     */
    @Column(name = "payment_verified_at", nullable = true)
    private LocalDateTime paymentVerifiedAt;

    /**
     * Timestamp when order was prepared for warehouse transfer.
     */
    @Column(name = "prepared_for_transfer_at", nullable = true)
    private LocalDateTime preparedForTransferAt;

    /**
     * Flag indicating if order is currently at an intermediate hub.
     * Used for tracking multi-city orders in transit.
     */
    @Column(name = "in_intermediate_hub", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean inIntermediateHub = false;

    // ─── DELIVERY OTP FOR ORDER CONFIRMATION ──────────────────────

    /**
     * 6-digit OTP sent to customer when delivery boy is assigned.
     * Customer must provide this OTP to delivery boy for confirmation.
     */
    @Column(name = "delivery_otp", length = 10, nullable = true)
    private String deliveryOtp;

    /**
     * Flag indicating if delivery OTP has been verified by customer.
     */
    @Column(name = "delivery_otp_verified", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean deliveryOtpVerified = false;

    // ─── Getters & Setters ────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }

    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public LocalDateTime getDateTime() { return dateTime; }
    public void setDateTime(LocalDateTime dateTime) { this.dateTime = dateTime; }

    public double getDeliveryCharge() { return deliveryCharge; }
    public void setDeliveryCharge(double deliveryCharge) { this.deliveryCharge = deliveryCharge; }

    public double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(double totalPrice) { this.totalPrice = totalPrice; }

    public double getGstAmount() { return gstAmount; }
    public void setGstAmount(double gstAmount) { this.gstAmount = gstAmount; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }

    public LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDateTime orderDate) { this.orderDate = orderDate; }

    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }

    public boolean isReplacementRequested() { return replacementRequested; }
    public void setReplacementRequested(boolean replacementRequested) { this.replacementRequested = replacementRequested; }

    public TrackingStatus getTrackingStatus() {
        return trackingStatus != null ? trackingStatus : TrackingStatus.PROCESSING;
    }
    public void setTrackingStatus(TrackingStatus trackingStatus) { this.trackingStatus = trackingStatus; }

    public String getCurrentCity() { return currentCity; }
    public void setCurrentCity(String currentCity) { this.currentCity = currentCity; }

    public boolean isReturnEligible() { return returnEligible; }
    public void setReturnEligible(boolean returnEligible) { this.returnEligible = returnEligible; }

    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }

    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }

    public DeliveryBoy getDeliveryBoy() { return deliveryBoy; }
    public void setDeliveryBoy(DeliveryBoy deliveryBoy) { this.deliveryBoy = deliveryBoy; }

    public String getDeliveryPinCode() { return deliveryPinCode; }
    public void setDeliveryPinCode(String deliveryPinCode) { this.deliveryPinCode = deliveryPinCode; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public Integer getParentOrderId() { return parentOrderId; }
    public void setParentOrderId(Integer parentOrderId) { this.parentOrderId = parentOrderId; }

    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public Warehouse getSourceWarehouse() { return sourceWarehouse; }
    public void setSourceWarehouse(Warehouse sourceWarehouse) { this.sourceWarehouse = sourceWarehouse; }

    public Warehouse getDestinationWarehouse() { return destinationWarehouse; }
    public void setDestinationWarehouse(Warehouse destinationWarehouse) { this.destinationWarehouse = destinationWarehouse; }

    public String getIntermediateWarehouseIds() { return intermediateWarehouseIds; }
    public void setIntermediateWarehouseIds(String intermediateWarehouseIds) { this.intermediateWarehouseIds = intermediateWarehouseIds; }

    public String getWarehouseRoutingPath() { return warehouseRoutingPath; }
    public void setWarehouseRoutingPath(String warehouseRoutingPath) { this.warehouseRoutingPath = warehouseRoutingPath; }

    public Double getCodAmount() { return codAmount; }
    public void setCodAmount(Double codAmount) { this.codAmount = codAmount; }

    public Integer getCodCollectedBy() { return codCollectedBy; }
    public void setCodCollectedBy(Integer codCollectedBy) { this.codCollectedBy = codCollectedBy; }

    public LocalDateTime getCodCollectionTimestamp() { return codCollectionTimestamp; }
    public void setCodCollectionTimestamp(LocalDateTime codCollectionTimestamp) { this.codCollectionTimestamp = codCollectionTimestamp; }

    public Integer getFinalDeliveryBoyId() { return finalDeliveryBoyId; }
    public void setFinalDeliveryBoyId(Integer finalDeliveryBoyId) { this.finalDeliveryBoyId = finalDeliveryBoyId; }

    public Integer getCashSettlementId() { return cashSettlementId; }
    public void setCashSettlementId(Integer cashSettlementId) { this.cashSettlementId = cashSettlementId; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public LocalDateTime getPaymentVerifiedAt() { return paymentVerifiedAt; }
    public void setPaymentVerifiedAt(LocalDateTime paymentVerifiedAt) { this.paymentVerifiedAt = paymentVerifiedAt; }

    public LocalDateTime getPreparedForTransferAt() { return preparedForTransferAt; }
    public void setPreparedForTransferAt(LocalDateTime preparedForTransferAt) { this.preparedForTransferAt = preparedForTransferAt; }

    public boolean isInIntermediateHub() { return inIntermediateHub; }
    public void setInIntermediateHub(boolean inIntermediateHub) { this.inIntermediateHub = inIntermediateHub; }

    public String getDeliveryOtp() { return deliveryOtp; }
    public void setDeliveryOtp(String deliveryOtp) { this.deliveryOtp = deliveryOtp; }

    public boolean isDeliveryOtpVerified() { return deliveryOtpVerified; }
    public void setDeliveryOtpVerified(boolean deliveryOtpVerified) { this.deliveryOtpVerified = deliveryOtpVerified; }
}
