/**
 * AddressForm.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Address management form with:
 * - City-based PIN code auto-lookup via /api/geocode/by-city
 * - Address form with validation
 * - Suggested PIN codes with debouncing
 * 
 * USAGE:
 * ─────────────────────────────────────────────────────────────────────────
 *   <AddressForm
 *     onSave={(address) => console.log(address)}
 *     showToast={(msg) => console.log(msg)}
 *     initialAddress={null}
 *   />
 *
 * PROPS:
 * ─────────────────────────────────────────────────────────────────────────
 *   onSave: Function         - Called with address object when form submitted
 *   showToast: Function      - Toast notification helper
 *   initialAddress: Object   - Pre-fill form with existing address (optional)
 *   readOnly: Boolean        - Disable form editing (optional)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

export default function AddressForm({ onSave, showToast, initialAddress = null, readOnly = false }) {
  // Form state
  const [addressLine, setAddressLine] = useState(initialAddress?.addressLine || "");
  const [city, setCity] = useState(initialAddress?.city || "");
  const [state, setState] = useState(initialAddress?.state || "");
  const [pinCode, setPinCode] = useState(initialAddress?.pinCode || "");
  const [country, setCountry] = useState(initialAddress?.country || "India");
  const [label, setLabel] = useState(initialAddress?.label || "Home");

  // UI state
  const [pinSuggestions, setPinSuggestions] = useState([]);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const debounceTimer = useRef(null);

  // Fetch PIN codes by city name
  const fetchPinByCity = useCallback(async (cityName) => {
    if (!cityName || cityName.trim().length < 2) {
      setPinSuggestions([]);
      setPinError("");
      return;
    }

    setPinLoading(true);
    setPinError("");
    setPinSuggestions([]);

    try {
      const res = await fetch(`/api/geocode/by-city?city=${encodeURIComponent(cityName)}`);
      const data = await res.json();

      if (data.success) {
        // Backend returns single result or multiple
        const result = Array.isArray(data.pins) ? data.pins : [
          {
            pin: data.pin,
            city: data.city,
            state: data.state
          }
        ];

        setPinSuggestions(result.filter(r => r.pin && /^\d{6}$/.test(String(r.pin))));
        
        if (result.length === 1) {
          // Auto-fill if only one result
          setPinCode(String(result[0].pin));
          setState(result[0].state || "");
        }

        if (result.length === 0) {
          setPinError("No PIN codes found for this city");
        }
      } else {
        setPinError(data.message || "Failed to lookup PIN codes");
        setPinSuggestions([]);
      }
    } catch (e) {
      setPinError("Lookup failed: " + e.message);
      setPinSuggestions([]);
    } finally {
      setPinLoading(false);
    }
  }, []);

  // Debounced city lookup
  const handleCityChange = (newCity) => {
    setCity(newCity);
    setPinSuggestions([]);
    setPinError("");
    setShowSuggestions(true);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      fetchPinByCity(newCity);
    }, 300);
  };

  // Select suggested PIN
  const selectPin = (suggestion) => {
    setPinCode(String(suggestion.pin));
    setState(suggestion.state || state);
    setShowSuggestions(false);
    setPinSuggestions([]);
  };

  // Form validation
  const validateForm = () => {
    if (!addressLine.trim()) {
      setFormError("Address is required");
      return false;
    }
    if (!city.trim()) {
      setFormError("City is required");
      return false;
    }
    if (!state.trim()) {
      setFormError("State is required");
      return false;
    }
    if (!pinCode || !/^\d{6}$/.test(pinCode)) {
      setFormError("Valid 6-digit PIN code is required");
      return false;
    }
    if (!country.trim()) {
      setFormError("Country is required");
      return false;
    }
    if (!label.trim()) {
      setFormError("Address label is required");
      return false;
    }
    return true;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!validateForm()) return;

    setSaving(true);
    try {
      const address = {
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        country: country.trim(),
        label: label.trim()
      };

      if (onSave) await onSave(address);
      if (showToast) showToast("✓ Address saved successfully");
        
      // Reset form
      if (!initialAddress) {
        setAddressLine("");
        setCity("");
        setState("");
        setPinCode("");
        setLabel("Home");
      }
    } catch (e) {
      setFormError(e.message || "Failed to save address");
      if (showToast) showToast("✗ " + (e.message || "Error saving address"));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "inherit",
    background: readOnly ? "#f3f4f6" : "#fff",
    color: readOnly ? "#9ca3af" : "#0d0d0d",
    cursor: readOnly ? "not-allowed" : "text",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "6px",
    display: "block"
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "500px", margin: "0 auto" }}>
      {/* Address Label */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Address Label *</label>
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={readOnly}
          style={inputStyle}
        >
          <option value="Home">🏠 Home</option>
          <option value="Work">💼 Work</option>
          <option value="Other">📍 Other</option>
        </select>
      </div>

      {/* Address Line */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Address *</label>
        <textarea
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          placeholder="Street address, house number, building name..."
          disabled={readOnly}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
        />
      </div>

      {/* City with PIN suggestions */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>City *</label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            placeholder="Enter city name (e.g., Bengaluru)"
            disabled={readOnly}
            style={inputStyle}
            onFocus={() => pinSuggestions.length > 0 && setShowSuggestions(true)}
          />
          {pinLoading && (
            <div style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "14px",
              color: "#6b7280"
            }}>
              🔄
            </div>
          )}

          {/* Suggestions Dropdown */}
          {showSuggestions && pinSuggestions.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "4px",
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              zIndex: 10,
              maxHeight: "200px",
              overflowY: "auto"
            }}>
              {pinSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  onClick={() => selectPin(suggestion)}
                  style={{
                    padding: "10px 12px",
                    borderBottom: idx < pinSuggestions.length - 1 ? "1px solid #f3f4f6" : "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#f9fafb"}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#0d0d0d" }}>
                    {suggestion.pin}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                    {suggestion.city} {suggestion.state ? `• ${suggestion.state}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pinError && (
            <div style={{ fontSize: "12px", color: "#dc2626", marginTop: "6px" }}>
              {pinError}
            </div>
          )}
        </div>
      </div>

      {/* PIN Code */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>PIN Code *</label>
        <input
          type="text"
          maxLength="6"
          inputMode="numeric"
          value={pinCode}
          onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit PIN code"
          disabled={readOnly}
          style={inputStyle}
        />
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
          {pinSuggestions.length > 0 && (
            <div>💡 {pinSuggestions.length} PIN(s) available for {city}</div>
          )}
        </div>
      </div>

      {/* State */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>State *</label>
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State or territory"
          disabled={readOnly}
          style={inputStyle}
        />
      </div>

      {/* Country */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Country *</label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={readOnly || country === "India"}
          style={{ ...inputStyle, opacity: country === "India" || readOnly ? 0.6 : 1 }}
        />
      </div>

      {/* Error message */}
      {formError && (
        <div style={{
          padding: "10px 12px",
          background: "#fee2e2",
          border: "1px solid #fecaca",
          borderRadius: "6px",
          color: "#dc2626",
          fontSize: "13px",
          marginBottom: "16px"
        }}>
          {formError}
        </div>
      )}

      {/* Submit button */}
      {!readOnly && (
        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            fontFamily: "inherit"
          }}
        >
          {saving ? "Saving…" : "Save Address"}
        </button>
      )}
    </form>
  );
}
