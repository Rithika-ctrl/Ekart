package com.example.ekart.service;

// ================================================================
// NEW FILE: src/main/java/com/example/ekart/service/PaymentMethodService.java
//
// Purpose:
//   Manages payment method selection and validation.
//   - Validates customer selection of COD vs Razorpay
//   - Enforces business rules (e.g., COD only for certain areas)
//   - Returns payment method options for checkout UI
//   - Tracks payment method preferences for analytics
//
// Supported Methods:
//   - RAZORPAY: Prepaid online payment (default)
//   - COD: Cash On Delivery (new in Phase 4)
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class PaymentMethodService {

    @Autowired private CustomerRepository customerRepository;
    @Autowired private WarehouseRepository warehouseRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT METHOD VALIDATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validates if a payment method is supported and available for customer.
     *
     * @param paymentMethod Method to validate (RAZORPAY or COD)
     * @param customer Customer making payment
     * @param deliveryPinCode Delivery PIN code for this order
     * @return true if payment method is available for this customer
     */
    public boolean isPaymentMethodAvailable(String paymentMethod, Customer customer, String deliveryPinCode) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return false;
        }

        switch (paymentMethod.toUpperCase()) {
            case "RAZORPAY":
                // Razorpay always available
                return true;

            case "COD":
                // COD availability rules:
                // 1. Only for orders within specific PIN codes (optional blacklist check)
                // 2. Only for customers with good delivery history (or waive for new customers)
                // 3. Can disable for specific PIN codes if too many failed COD collections
                return isCodAvailableForPinCode(deliveryPinCode) && isCodAvailableForCustomer(customer);

            default:
                return false;
        }
    }

    /**
     * Gets all available payment methods for a customer.
     * Always includes RAZORPAY. Conditionally includes COD.
     *
     * @param customer Customer
     * @param deliveryPinCode Delivery PIN code
     * @return List of available payment methods (e.g., ["RAZORPAY", "COD"])
     */
    public List<String> getAvailablePaymentMethods(Customer customer, String deliveryPinCode) {
        List<String> methods = new ArrayList<>();

        // Always offer Razorpay
        methods.add("RAZORPAY");

        // Conditionally offer COD
        if (isCodAvailableForPinCode(deliveryPinCode) && isCodAvailableForCustomer(customer)) {
            methods.add("COD");
        }

        return methods;
    }

    /**
     * Gets the default payment method for a customer (used if none selected).
     *
     * @param customer Customer
     * @return Default payment method (RAZORPAY)
     */
    public String getDefaultPaymentMethod(Customer customer) {
        return "RAZORPAY";  // Default to prepaid
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COD AVAILABILITY RULES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Checks if COD is available for a specific PIN code.
     * Can be extended to check a PIN blacklist or COD failure rate.
     *
     * @param pinCode Delivery PIN code
     * @return true if COD is supported in this PIN code
     */
    private boolean isCodAvailableForPinCode(String pinCode) {
        if (pinCode == null || pinCode.isBlank()) {
            return false;
        }

        // For now, allow COD everywhere
        // In future, can check against a blacklist of difficult PIN codes
        // where COD has high failure rate or no warehouse coverage

        // Example check (if database had PIN blacklist):
        // CodBlacklistedPin blacklisted = codBlacklistedPinRepository.findByPinCode(pinCode);
        // return blacklisted == null;

        return true;
    }

    /**
     * Checks if COD is available for a specific customer.
     * Can check delivery history, fraud risk, or account status.
     *
     * @param customer Customer
     * @return true if customer is eligible for COD
     */
    private boolean isCodAvailableForCustomer(Customer customer) {
        if (customer == null) {
            return false;
        }

        // Rule 1: Account must be active and verified
        if (!customer.isAccountStatus() || !customer.isVerified()) {
            return false;
        }

        // Rule 2: No fraud/blacklist flags (future: add fraud check)

        // Rule 3: If we track COD refusal rate, fail if > 50%
        // int totalCodOrders = getCodOrderCountForCustomer(customer.getId());
        // int refusedCodOrders = getRefusedCodOrderCountForCustomer(customer.getId());
        // if (totalCodOrders > 0 && (refusedCodOrders / totalCodOrders) > 0.5) {
        //     return false;  // Too many refusals
        // }

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT METHOD HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Formats payment method for display UI.
     *
     * @param paymentMethod Method code (RAZORPAY, COD)
     * @return Human-readable display name
     */
    public String getPaymentMethodDisplayName(String paymentMethod) {
        if (paymentMethod == null) {
            return "Unknown";
        }

        switch (paymentMethod.toUpperCase()) {
            case "RAZORPAY":
                return "Online Payment (Razorpay)";
            case "COD":
                return "Cash On Delivery";
            default:
                return paymentMethod;
        }
    }

    /**
     * Gets payment method description for checkout UI help text.
     *
     * @param paymentMethod Method code
     * @return Description text
     */
    public String getPaymentMethodDescription(String paymentMethod) {
        if (paymentMethod == null) {
            return "";
        }

        switch (paymentMethod.toUpperCase()) {
            case "RAZORPAY":
                return "Pay securely online using credit card, debit card, or digital wallet. Payment is processed immediately.";
            case "COD":
                return "Pay in cash when your order is delivered. Our delivery partner will collect payment at your doorstep.";
            default:
                return "";
        }
    }

    /**
     * Gets payment method icon name for UI (for icon library).
     *
     * @param paymentMethod Method code
     * @return Icon name
     */
    public String getPaymentMethodIcon(String paymentMethod) {
        if (paymentMethod == null) {
            return "question";
        }

        switch (paymentMethod.toUpperCase()) {
            case "RAZORPAY":
                return "credit-card";
            case "COD":
                return "cash";
            default:
                return "question";
        }
    }

    /**
     * Validates payment method value.
     *
     * @param paymentMethod Method to validate
     * @return Error message if invalid, empty string if valid
     */
    public String validatePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "Payment method is required";
        }

        if (!paymentMethod.toUpperCase().matches("RAZORPAY|COD")) {
            return "Invalid payment method: " + paymentMethod;
        }

        return "";  // Valid
    }
}
