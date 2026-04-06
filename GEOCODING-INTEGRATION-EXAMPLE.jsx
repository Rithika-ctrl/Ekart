/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GEOCODING INTEGRATION EXAMPLE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file demonstrates how to integrate the AddressForm component with
 * city-based PIN lookup into the CustomerApp profile addresses section.
 * 
 * Copy and adapt these patterns into your CustomerApp.jsx
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import AddressForm from "../components/AddressForm";
// Note: AddressForm uses geoAPI endpoints directly at /api/geocode/*
// The api() helper from useAuth is used for address management endpoints

/**
 * ── STEP 1: State Management ──────────────────────────────────────────────
 * 
 * Add these state variables to your CustomerApp component:
 */

// Inside your CustomerApp component, in the useState section:
// const [showAddressForm, setShowAddressForm] = useState(false);
// const [editingAddress, setEditingAddress] = useState(null);
// const [addresses, setAddresses] = useState([]);
// const [loadingAddresses, setLoadingAddresses] = useState(false);


/**
 * ── STEP 2: Event Handlers ───────────────────────────────────────────────
 * 
 * Add these functions to your CustomerApp component:
 */

// Load addresses from backend
const loadAddresses = async (customerId) => {
  setLoadingAddresses(true);
  try {
    const response = await api(`/admin/customers/${customerId}/addresses`);
    setAddresses(Array.isArray(response.addresses) ? response.addresses : []);
  } catch (error) {
    console.error("Failed to load addresses:", error);
    showToast("Failed to load addresses");
  } finally {
    setLoadingAddresses(false);
  }
};

// Save new or update existing address
const handleAddressSave = async (address) => {
  try {
    // Call backend API to save address
    const response = await api(`/admin/customers/${profile.id}/address`, {
      method: "POST",
      body: JSON.stringify({
        recipientName: address.label,
        houseStreet: address.addressLine,
        city: address.city,
        state: address.state,
        postalCode: address.pinCode,
        country: address.country
      })
    });

    if (response.success) {
      // Reset form state
      setShowAddressForm(false);
      setEditingAddress(null);

      // Reload addresses from backend
      await loadAddresses(profile.id);

      showToast("✓ Address saved successfully");
    } else {
      showToast("✗ " + (response.message || "Failed to save address"));
    }
  } catch (error) {
    console.error("Error saving address:", error);
    showToast("✗ Error saving address: " + error.message);
  }
};

// Delete an address
const handleDeleteAddress = async (addressId) => {
  if (!confirm("Are you sure you want to delete this address?")) return;

  try {
    const response = await api(`/admin/customers/${profile.id}/address/${addressId}`, {
      method: "DELETE"
    });

    if (response.success) {
      await loadAddresses(profile.id);
      showToast("✓ Address deleted successfully");
    } else {
      showToast("✗ " + (response.message || "Failed to delete address"));
    }
  } catch (error) {
    console.error("Error deleting address:", error);
    showToast("✗ Error deleting address");
  }
};

// Open form for adding new address
const handleAddNewAddress = () => {
  setEditingAddress(null);
  setShowAddressForm(true);
};

// Open form for editing existing address
const handleEditAddress = (address) => {
  // Convert address format to AddressForm format
  setEditingAddress({
    addressLine: address.houseStreet,
    city: address.city,
    state: address.state,
    pinCode: address.postalCode,
    country: "India",
    label: address.recipientName || "Home"
  });
  setShowAddressForm(true);
};

// Cancel editing
const handleCancelAddressForm = () => {
  setShowAddressForm(false);
  setEditingAddress(null);
};


/**
 * ── STEP 3: JSX / Render ──────────────────────────────────────────────────
 * 
 * Replace your addresses tab content with this JSX:
 */

// In your render section, replace the existing addresses tab with:

const AddressesTabContent = () => (
  <div style={{ maxWidth: 600 }}>
    {/* SAVED ADDRESSES LIST */}
    {!showAddressForm && (
      <>
        <div style={cs.profileCard}>
          <h3 style={cs.secTitle}>📍 Saved Addresses</h3>

          {loadingAddresses ? (
            <p style={{ color: "#6b7280", fontSize: 14 }}>Loading addresses...</p>
          ) : addresses.length > 0 ? (
            <div>
              {addresses.map((address) => (
                <div
                  key={address.id}
                  style={{
                    background: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "12px 14px",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}
                >
                  <div>
                    <div style={{ color: "#e5e7eb", fontWeight: 700 }}>
                      {address.recipientName}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
                      {address.houseStreet}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 13 }}>
                      {[address.city, address.state].filter(Boolean).join(", ")}
                    </div>
                    {address.postalCode && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f5a800", marginTop: 4 }}>
                        📍 {address.postalCode}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => handleEditAddress(address)}
                      style={{
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontSize: 14 }}>No addresses saved yet.</p>
          )}
        </div>

        {/* ADD NEW ADDRESS BUTTON */}
        <div style={cs.profileCard}>
          <button
            onClick={handleAddNewAddress}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            ➕ Add New Address
          </button>
        </div>
      </>
    )}

    {/* ADDRESS FORM WITH GEOCODING */}
    {showAddressForm && (
      <div style={cs.profileCard}>
        <h3 style={{ ...cs.secTitle, marginBottom: 20 }}>
          {editingAddress ? "✏️ Edit Address" : "➕ Add New Address"}
        </h3>

        <div style={{ marginBottom: 16 }}>
          <AddressForm
            onSave={handleAddressSave}
            showToast={showToast}
            initialAddress={editingAddress}
          />
        </div>

        <button
          onClick={handleCancelAddressForm}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            marginTop: "12px"
          }}
        >
          Cancel
        </button>
      </div>
    )}
  </div>
);


/**
 * ── STEP 4: Integrate into Addresses Tab ──────────────────────────────────
 * 
 * In your component's render/return section, replace:
 * 
 *   {activeTab === "addresses" && (
 *     <div>... existing address code ...</div>
 *   )}
 * 
 * With:
 * 
 *   {activeTab === "addresses" && <AddressesTabContent />}
 */


/**
 * ── STEP 5: Load Addresses on Mount ──────────────────────────────────────
 * 
 * Add this to your useEffect that loads profile data:
 * 
 *   useEffect(() => {
 *     if (profile?.id) {
 *       loadAddresses(profile.id);
 *     }
 *   }, [profile?.id]);
 */


/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. Copy AddressForm.jsx to components folder ✓
 * 
 * 2. Update ekartApiService.js with geoAPI and addressAPI ✓
 * 
 * 3. Add imports to CustomerApp.jsx:
 *    import AddressForm from "../components/AddressForm";
 * 
 * 4. Adapt the event handlers above to your CustomerApp
 * 
 * 5. Replace addresses tab JSX with AddressesTabContent
 * 
 * 6. Add useEffect to load addresses
 * 
 * 7. Test with sample cities:
 *    - "Bengaluru" → Should return multiple PIN codes
 *    - "Mumbai" → Should return multiple PIN codes
 *    - "New Delhi" → Should return multiple PIN codes
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * STYLING VARIABLES (adapt to your theme):
 * 
 *   cs.profileCard    - Card container style
 *   cs.secTitle       - Section title style
 *   cs.label          - Label text style
 *   cs.inputField     - Input field style
 *   cs.saveBtn        - Save button style
 *   cs.removeBtn      - Remove button style
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * TESTING CHECKLIST
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * [ ] AddressForm component renders without errors
 * [ ] City input triggers API call after 300ms debounce
 * [ ] PIN suggestions appear in dropdown after city lookup
 * [ ] Clicking suggestion auto-fills PIN and state
 * [ ] Form validation prevents submission with missing fields
 * [ ] Form validation prevents submission with invalid PIN
 * [ ] Successfully saves address to backend
 * [ ] Saved addresses list updates after save
 * [ ] Edit button loads address into form
 * [ ] Delete button removes address from list
 * [ ] Cancel button closes form without saving
 * [ ] Toast notifications display for success/error
 * [ ] Loading state shows while fetching addresses
 * [ ] Responsive design works on mobile
 * [ ] Keyboard navigation works in dropdown
 * 
 * ═════════════════════════════════════════════════════════════════════════
 */

export { AddressesTabContent, handleAddressSave, handleDeleteAddress, handleEditAddress, handleAddNewAddress, handleCancelAddressForm };
