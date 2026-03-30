/**
 * ScheduledOrdersPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Scheduled / Subscription Orders feature for Ekart Customer App.
 *
 * HOW TO INTEGRATE INTO CustomerApp.jsx  (4 small edits — see INTEGRATION GUIDE
 * at the bottom of this file):
 *
 *   1. Import this file at the top of CustomerApp.jsx
 *   2. Add "scheduled" tab to the Nav `tabs` array
 *   3. Add the page render block inside the Layout
 *   4. Add "Scheduled Orders" to SideDrawer menu
 *
 * API ENDPOINTS EXPECTED  (backend team to implement):
 *   GET    /api/flutter/scheduled-orders          → ScheduledOrder[]
 *   POST   /api/flutter/scheduled-orders          → { success, id }
 *   PUT    /api/flutter/scheduled-orders/:id      → { success }
 *   DELETE /api/flutter/scheduled-orders/:id/cancel → { success }
 *   GET    /api/flutter/products                  → Product[] (already exists)
 *
 * ScheduledOrder shape:
 * {
 *   id, productId, productName, productImage, productPrice,
 *   quantity, addressId, addressLabel,
 *   paymentMode,          // "COD" | "ONLINE_AUTOPAY"
 *   frequencyType,        // "DAILY" | "CUSTOM_DAYS" | "EVERY_N_DAYS"
 *   frequencyValue,       // number — ignored when DAILY; days for CUSTOM/EVERY_N
 *   durationDays,         // null = forever; number = stop after N days
 *   startDate,            // ISO date string
 *   nextDeliveryDate,     // ISO date string
 *   status,               // "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"
 *   totalDeliveries,      // how many times it has run
 *   remainingDeliveries,  // null = infinite
 * }
 */

import { useState, useEffect, useCallback } from "react";

// ─── helpers (duplicated from CustomerApp to keep this file self-contained) ──
const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const FREQ_LABELS = {
  DAILY: "Every Day",
  EVERY_N_DAYS: "Every N Days",
  CUSTOM_DAYS: "Every N Days (Custom)",
};

const STATUS_COLOR = {
  ACTIVE: "#22c55e",
  PAUSED: "#f59e0b",
  COMPLETED: "#6366f1",
  CANCELLED: "#ef4444",
};

const STATUS_ICON = {
  ACTIVE: "🔁",
  PAUSED: "⏸️",
  COMPLETED: "✅",
  CANCELLED: "🚫",
};

// ─── tiny reusable atoms ─────────────────────────────────────────────────────
function Badge({ status }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        background: STATUS_COLOR[status] + "22",
        color: STATUS_COLOR[status],
        border: `1px solid ${STATUS_COLOR[status]}44`,
      }}
    >
      {STATUS_ICON[status]} {status}
    </span>
  );
}

function FreqChip({ freq, value }) {
  const label =
    freq === "DAILY"
      ? "Daily"
      : freq === "EVERY_N_DAYS"
      ? `Every ${value} days`
      : `Every ${value} days`;
  return (
    <span
      style={{
        background: "rgba(99,102,241,0.15)",
        color: "#a5b4fc",
        border: "1px solid rgba(99,102,241,0.3)",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      🔄 {label}
    </span>
  );
}

// ─── Setup Modal ─────────────────────────────────────────────────────────────
function SetupScheduleModal({ products, profile, api, onClose, onCreated, showToast }) {
  const addresses = profile?.addresses || [];

  const [step, setStep] = useState(1); // 1 = product, 2 = schedule, 3 = confirm
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [qty, setQty] = useState(1);
  const [freq, setFreq] = useState("DAILY");
  const [freqValue, setFreqValue] = useState(7);
  const [durationEnabled, setDurationEnabled] = useState(false);
  const [durationDays, setDurationDays] = useState(30);
  const [addressId, setAddressId] = useState(addresses[0]?.id || null);
  const [payMode, setPayMode] = useState("COD");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = products.filter(
    (p) =>
      p.stock > 0 &&
      p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const chosenAddr = addresses.find((a) => a.id === addressId);

  const handleCreate = async () => {
    if (!selectedProduct || !addressId) {
      showToast("Please fill all fields");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        productId: selectedProduct.id,
        quantity: qty,
        frequencyType: freq,
        frequencyValue: freq === "DAILY" ? 1 : freqValue,
        durationDays: durationEnabled ? durationDays : null,
        addressId,
        paymentMode: payMode,
        startDate,
      };
      const res = await api("/scheduled-orders", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.success) {
        showToast("Scheduled order created! 🎉");
        onCreated();
        onClose();
      } else {
        showToast(res.message || "Failed to create schedule");
      }
    } catch {
      showToast("Network error");
    }
    setSubmitting(false);
  };

  // ── overlay backdrop
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#1a1a2e",
            zIndex: 1,
            borderRadius: "20px 20px 0 0",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
              📅 Schedule a Delivery
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
              Step {step} of 3
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            padding: "16px 24px 0",
            gap: 8,
          }}
        >
          {["Product", "Schedule", "Confirm"].map((label, i) => (
            <div
              key={label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 4,
                  borderRadius: 2,
                  background:
                    step > i + 1
                      ? "#22c55e"
                      : step === i + 1
                      ? "#6366f1"
                      : "rgba(255,255,255,0.1)",
                  transition: "background 0.3s",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color:
                    step > i + 1
                      ? "#4ade80"
                      : step === i + 1
                      ? "#a5b4fc"
                      : "#4b5563",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── STEP 1: Choose Product ── */}
        {step === 1 && (
          <div style={{ padding: "20px 24px 24px" }}>
            <input
              placeholder="🔍 Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "#e5e7eb",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {filteredProducts.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#6b7280",
                    padding: "32px 0",
                  }}
                >
                  No products found
                </div>
              )}
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    cursor: "pointer",
                    background:
                      selectedProduct?.id === p.id
                        ? "rgba(99,102,241,0.2)"
                        : "rgba(255,255,255,0.04)",
                    border:
                      selectedProduct?.id === p.id
                        ? "1px solid rgba(99,102,241,0.5)"
                        : "1px solid rgba(255,255,255,0.07)",
                    transition: "all 0.15s",
                  }}
                >
                  {p.imageLink ? (
                    <img
                      src={p.imageLink}
                      alt={p.name}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: "rgba(99,102,241,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      🛍️
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#e5e7eb",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      {p.category}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#a5b4fc",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {fmt(p.price)}
                  </div>
                  {selectedProduct?.id === p.id && (
                    <div style={{ color: "#22c55e", fontSize: 18 }}>✓</div>
                  )}
                </div>
              ))}
            </div>

            {selectedProduct && (
              <div style={{ marginTop: 20 }}>
                <label
                  style={{
                    fontSize: 13,
                    color: "#9ca3af",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Quantity per delivery
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#e5e7eb",
                      fontSize: 18,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    −
                  </button>
                  <span
                    style={{ fontSize: 18, fontWeight: 700, color: "#fff", minWidth: 24, textAlign: "center" }}
                  >
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(20, q + 1))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#e5e7eb",
                      fontSize: 18,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </button>
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>
                    × {fmt(selectedProduct.price)} ={" "}
                    <strong style={{ color: "#a5b4fc" }}>
                      {fmt(selectedProduct.price * qty)}
                    </strong>{" "}
                    per delivery
                  </span>
                </div>
              </div>
            )}

            <button
              disabled={!selectedProduct}
              onClick={() => setStep(2)}
              style={{
                marginTop: 24,
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                border: "none",
                background: selectedProduct
                  ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                  : "rgba(255,255,255,0.08)",
                color: selectedProduct ? "#fff" : "#4b5563",
                fontWeight: 700,
                fontSize: 15,
                cursor: selectedProduct ? "pointer" : "not-allowed",
              }}
            >
              Next: Set Schedule →
            </button>
          </div>
        )}

        {/* ── STEP 2: Configure Schedule ── */}
        {step === 2 && (
          <div style={{ padding: "20px 24px 24px" }}>
            {/* Frequency */}
            <div style={{ marginBottom: 20 }}>
              <label style={sty.label}>📅 Delivery Frequency</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    key: "DAILY",
                    title: "Daily",
                    desc: "Delivered every single day",
                    icon: "☀️",
                  },
                  {
                    key: "EVERY_N_DAYS",
                    title: "Every N Days",
                    desc: "Set a custom interval (e.g. every 7 days)",
                    icon: "📆",
                  },
                ].map((opt) => (
                  <div
                    key={opt.key}
                    onClick={() => setFreq(opt.key)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      cursor: "pointer",
                      background:
                        freq === opt.key
                          ? "rgba(99,102,241,0.18)"
                          : "rgba(255,255,255,0.04)",
                      border:
                        freq === opt.key
                          ? "1px solid rgba(99,102,241,0.5)"
                          : "1px solid rgba(255,255,255,0.07)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{opt.icon}</span>
                    <div>
                      <div
                        style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb" }}
                      >
                        {opt.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        {opt.desc}
                      </div>
                    </div>
                    {freq === opt.key && (
                      <div style={{ marginLeft: "auto", color: "#22c55e", fontSize: 18 }}>
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {freq === "EVERY_N_DAYS" && (
                <div style={{ marginTop: 12 }}>
                  <label style={sty.label}>Every how many days?</label>
                  <input
                    type="number"
                    min={2}
                    max={365}
                    value={freqValue}
                    onChange={(e) =>
                      setFreqValue(Math.max(2, parseInt(e.target.value) || 2))
                    }
                    style={sty.input}
                  />
                  {/* Quick presets */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {[7, 14, 21, 25, 28, 30].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFreqValue(d)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 20,
                          border:
                            freqValue === d
                              ? "1px solid #6366f1"
                              : "1px solid rgba(255,255,255,0.12)",
                          background:
                            freqValue === d
                              ? "rgba(99,102,241,0.2)"
                              : "rgba(255,255,255,0.04)",
                          color: freqValue === d ? "#a5b4fc" : "#9ca3af",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Duration */}
            <div style={{ marginBottom: 20 }}>
              <label style={sty.label}>⏳ Duration</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: durationEnabled ? 12 : 0,
                }}
              >
                <div
                  onClick={() => setDurationEnabled((v) => !v)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: durationEnabled ? "#6366f1" : "rgba(255,255,255,0.12)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      left: durationEnabled ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
                <span style={{ fontSize: 14, color: "#e5e7eb" }}>
                  {durationEnabled ? "Stop after a set number of days" : "Run forever (until cancelled)"}
                </span>
              </div>
              {durationEnabled && (
                <>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={durationDays}
                    onChange={(e) =>
                      setDurationDays(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    style={sty.input}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {[7, 14, 25, 30, 60, 90].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDurationDays(d)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 20,
                          border:
                            durationDays === d
                              ? "1px solid #22c55e"
                              : "1px solid rgba(255,255,255,0.12)",
                          background:
                            durationDays === d
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(255,255,255,0.04)",
                          color: durationDays === d ? "#4ade80" : "#9ca3af",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    Schedule will automatically stop after {durationDays} day
                    {durationDays !== 1 ? "s" : ""}
                  </div>
                </>
              )}
            </div>

            {/* Start Date */}
            <div style={{ marginBottom: 20 }}>
              <label style={sty.label}>🗓️ Start Date</label>
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ ...sty.input, colorScheme: "dark" }}
              />
            </div>

            {/* Address */}
            <div style={{ marginBottom: 20 }}>
              <label style={sty.label}>📍 Delivery Address</label>
              {addresses.length === 0 ? (
                <div
                  style={{
                    padding: 14,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 10,
                    color: "#f87171",
                    fontSize: 13,
                  }}
                >
                  No saved addresses. Add an address in your Profile first.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setAddressId(addr.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background:
                          addressId === addr.id
                            ? "rgba(99,102,241,0.15)"
                            : "rgba(255,255,255,0.04)",
                        border:
                          addressId === addr.id
                            ? "1px solid rgba(99,102,241,0.4)"
                            : "1px solid rgba(255,255,255,0.07)",
                        fontSize: 13,
                        color: "#e5e7eb",
                        lineHeight: 1.5,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {addr.recipientName}
                        </div>
                        <div style={{ color: "#9ca3af", fontSize: 12 }}>
                          {addr.houseStreet}, {addr.city} – {addr.postalCode}
                        </div>
                      </div>
                      {addressId === addr.id && (
                        <div style={{ color: "#22c55e" }}>✓</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Mode */}
            <div style={{ marginBottom: 20 }}>
              <label style={sty.label}>💳 Payment Mode</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { key: "COD", label: "💵 Cash on Delivery", desc: "Pay when delivered" },
                  {
                    key: "ONLINE_AUTOPAY",
                    label: "⚡ Online Autopay",
                    desc: "Auto-charged each delivery",
                  },
                ].map((pm) => (
                  <div
                    key={pm.key}
                    onClick={() => setPayMode(pm.key)}
                    style={{
                      flex: 1,
                      padding: "12px 10px",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "center",
                      background:
                        payMode === pm.key
                          ? "rgba(99,102,241,0.18)"
                          : "rgba(255,255,255,0.04)",
                      border:
                        payMode === pm.key
                          ? "1px solid rgba(99,102,241,0.5)"
                          : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>
                      {pm.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      {pm.desc}
                    </div>
                    {payMode === pm.key && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          color: "#22c55e",
                          fontWeight: 600,
                        }}
                      >
                        ✓ Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#9ca3af",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                disabled={!addressId}
                onClick={() => setStep(3)}
                style={{
                  flex: 2,
                  padding: "13px 0",
                  borderRadius: 12,
                  border: "none",
                  background: addressId
                    ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                    : "rgba(255,255,255,0.08)",
                  color: addressId ? "#fff" : "#4b5563",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: addressId ? "pointer" : "not-allowed",
                }}
              >
                Review & Confirm →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step === 3 && selectedProduct && (
          <div style={{ padding: "20px 24px 24px" }}>
            <div
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                {selectedProduct.imageLink ? (
                  <img
                    src={selectedProduct.imageLink}
                    alt={selectedProduct.name}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 10,
                      objectFit: "cover",
                    }}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 10,
                      background: "rgba(99,102,241,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                    }}
                  >
                    🛍️
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                    {selectedProduct.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#9ca3af" }}>
                    Qty: {qty} × {fmt(selectedProduct.price)} ={" "}
                    <strong style={{ color: "#a5b4fc" }}>
                      {fmt(selectedProduct.price * qty)}
                    </strong>{" "}
                    per delivery
                  </div>
                </div>
              </div>

              {[
                {
                  icon: "🔄",
                  label: "Frequency",
                  value:
                    freq === "DAILY"
                      ? "Every day"
                      : `Every ${freqValue} days`,
                },
                {
                  icon: "⏳",
                  label: "Duration",
                  value: durationEnabled
                    ? `${durationDays} days then stops`
                    : "Until cancelled",
                },
                {
                  icon: "🗓️",
                  label: "Starts",
                  value: new Date(startDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }),
                },
                {
                  icon: "📍",
                  label: "Address",
                  value: chosenAddr
                    ? `${chosenAddr.houseStreet}, ${chosenAddr.city}`
                    : "—",
                },
                {
                  icon: "💳",
                  label: "Payment",
                  value: payMode === "COD" ? "Cash on Delivery" : "Online Autopay",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>
                    {row.icon} {row.label}
                  </span>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {payMode === "ONLINE_AUTOPAY" && (
              <div
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#fbbf24",
                  marginBottom: 16,
                }}
              >
                ⚠️ With Autopay, {fmt(selectedProduct.price * qty)} will be
                charged automatically for each delivery. You can pause or cancel
                anytime.
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#9ca3af",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ← Edit
              </button>
              <button
                disabled={submitting}
                onClick={handleCreate}
                style={{
                  flex: 2,
                  padding: "13px 0",
                  borderRadius: 12,
                  border: "none",
                  background: submitting
                    ? "rgba(255,255,255,0.08)"
                    : "linear-gradient(135deg,#22c55e,#16a34a)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Creating..." : "✅ Confirm Schedule"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit/Pause Modal ─────────────────────────────────────────────────────────
function EditScheduleModal({ schedule, api, onClose, onUpdated, showToast }) {
  const [qty, setQty] = useState(schedule.quantity);
  const [status, setStatus] = useState(schedule.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api(`/scheduled-orders/${schedule.id}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: qty, status }),
      });
      if (res.success) {
        showToast("Schedule updated ✓");
        onUpdated();
        onClose();
      } else {
        showToast(res.message || "Update failed");
      }
    } catch {
      showToast("Network error");
    }
    setSaving(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 440,
          padding: 28,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#fff",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          ✏️ Edit Schedule
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>
            {schedule.productName}
          </div>
        </div>

        <label style={sty.label}>Quantity per delivery</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            style={sty.qtyBtn}
          >
            −
          </button>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", minWidth: 32, textAlign: "center" }}>
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(20, q + 1))}
            style={sty.qtyBtn}
          >
            +
          </button>
        </div>

        <label style={sty.label}>Status</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["ACTIVE", "PAUSED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border:
                  status === s
                    ? `1px solid ${STATUS_COLOR[s]}`
                    : "1px solid rgba(255,255,255,0.1)",
                background:
                  status === s ? STATUS_COLOR[s] + "20" : "rgba(255,255,255,0.04)",
                color: status === s ? STATUS_COLOR[s] : "#9ca3af",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {STATUS_ICON[s]} {s}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "#9ca3af",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            style={{
              flex: 2,
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: saving
                ? "rgba(255,255,255,0.08)"
                : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ScheduledOrdersPage ─────────────────────────────────────────────────
export default function ScheduledOrdersPage({ api, products, profile, showToast }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL | ACTIVE | PAUSED | COMPLETED | CANCELLED

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/scheduled-orders");
      if (Array.isArray(res)) setSchedules(res);
      else if (Array.isArray(res?.data)) setSchedules(res.data);
      else setSchedules([]);
    } catch {
      setSchedules([]);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCancel = async (id) => {
    try {
      const res = await api(`/scheduled-orders/${id}/cancel`, { method: "DELETE" });
      if (res.success) {
        showToast("Schedule cancelled");
        loadSchedules();
      } else {
        showToast(res.message || "Failed to cancel");
      }
    } catch {
      showToast("Network error");
    }
    setCancelConfirm(null);
  };

  const filtered =
    filter === "ALL"
      ? schedules
      : schedules.filter((s) => s.status === filter);

  const activeCount = schedules.filter((s) => s.status === "ACTIVE").length;

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            📅 Scheduled Orders
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 14, margin: "6px 0 0" }}>
            Set up recurring deliveries — daily milk, monthly essentials & more.
          </p>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
            whiteSpace: "nowrap",
          }}
        >
          + New Schedule
        </button>
      </div>

      {/* Summary cards */}
      {schedules.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Total", value: schedules.length, icon: "📋", color: "#6366f1" },
            { label: "Active", value: activeCount, icon: "🔁", color: "#22c55e" },
            {
              label: "Paused",
              value: schedules.filter((s) => s.status === "PAUSED").length,
              icon: "⏸️",
              color: "#f59e0b",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${card.color}33`,
                borderRadius: 14,
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>{card.icon}</span>
              <div>
                <div
                  style={{ fontSize: 22, fontWeight: 800, color: card.color }}
                >
                  {card.value}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                  {card.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {schedules.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {["ALL", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border:
                  filter === f
                    ? "1px solid rgba(99,102,241,0.6)"
                    : "1px solid rgba(255,255,255,0.1)",
                background:
                  filter === f
                    ? "rgba(99,102,241,0.2)"
                    : "rgba(255,255,255,0.04)",
                color: filter === f ? "#a5b4fc" : "#6b7280",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                textTransform: f === "ALL" ? "none" : "capitalize",
              }}
            >
              {f === "ALL" ? `All (${schedules.length})` : f.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "64px 0",
            color: "#6b7280",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid rgba(255,255,255,0.1)",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Loading schedules...
        </div>
      )}

      {/* Empty state */}
      {!loading && schedules.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 64 }}>📅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e5e7eb" }}>
            No scheduled orders yet
          </div>
          <div style={{ color: "#6b7280", fontSize: 14, maxWidth: 380 }}>
            Set up your first recurring delivery — get daily milk, monthly
            sanitary products, or anything you need on a regular cadence,
            delivered automatically.
          </div>
          <button
            onClick={() => setShowSetup(true)}
            style={{
              marginTop: 8,
              padding: "13px 28px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
            }}
          >
            + Create Your First Schedule
          </button>
        </div>
      )}

      {/* No filter matches */}
      {!loading && schedules.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280" }}>
          No {filter.toLowerCase()} schedules
        </div>
      )}

      {/* Schedule cards */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((s) => (
            <div
              key={s.id}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  s.status === "ACTIVE"
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(255,255,255,0.08)"
                }`,
                borderRadius: 16,
                padding: "20px 20px",
                transition: "border-color 0.2s",
              }}
            >
              {/* Top row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                {s.productImage ? (
                  <img
                    src={s.productImage}
                    alt={s.productName}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 10,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 10,
                      background: "rgba(99,102,241,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    🛍️
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#e5e7eb",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                    >
                      {s.productName}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge status={s.status} />
                    <FreqChip freq={s.frequencyType} value={s.frequencyValue} />
                    <span
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "#9ca3af",
                        borderRadius: 20,
                        padding: "2px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      Qty: {s.quantity}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#a5b4fc",
                    flexShrink: 0,
                  }}
                >
                  {fmt(s.productPrice * s.quantity)}
                </div>
              </div>

              {/* Info rows */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px 16px",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 14,
                }}
              >
                {[
                  {
                    icon: "🗓️",
                    label: "Next delivery",
                    value: s.nextDeliveryDate
                      ? new Date(s.nextDeliveryDate).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )
                      : "—",
                  },
                  {
                    icon: "💳",
                    label: "Payment",
                    value: s.paymentMode === "COD" ? "Cash on Delivery" : "Autopay",
                  },
                  {
                    icon: "📦",
                    label: "Delivered",
                    value: `${s.totalDeliveries || 0} time${
                      (s.totalDeliveries || 0) !== 1 ? "s" : ""
                    }`,
                  },
                  {
                    icon: "⏳",
                    label: "Remaining",
                    value:
                      s.remainingDeliveries == null
                        ? "Unlimited"
                        : `${s.remainingDeliveries} left`,
                  },
                  {
                    icon: "📍",
                    label: "Address",
                    value: s.addressLabel || "Saved address",
                  },
                  {
                    icon: "📅",
                    label: "Started",
                    value: s.startDate
                      ? new Date(s.startDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—",
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {row.icon} {row.label}
                    </div>
                    <div style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 500, marginTop: 2 }}>
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {(s.status === "ACTIVE" || s.status === "PAUSED") && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setEditTarget(s)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid rgba(99,102,241,0.35)",
                      background: "rgba(99,102,241,0.1)",
                      color: "#a5b4fc",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setCancelConfirm(s)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid rgba(239,68,68,0.3)",
                      background: "rgba(239,68,68,0.08)",
                      color: "#f87171",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🚫 Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showSetup && (
        <SetupScheduleModal
          products={products}
          profile={profile}
          api={api}
          showToast={showToast}
          onClose={() => setShowSetup(false)}
          onCreated={loadSchedules}
        />
      )}

      {editTarget && (
        <EditScheduleModal
          schedule={editTarget}
          api={api}
          showToast={showToast}
          onClose={() => setEditTarget(null)}
          onUpdated={loadSchedules}
        />
      )}

      {/* Cancel confirmation */}
      {cancelConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 20,
              padding: 28,
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>
              🚫
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Cancel Schedule?
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#9ca3af",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              This will stop all future deliveries of{" "}
              <strong style={{ color: "#e5e7eb" }}>
                {cancelConfirm.productName}
              </strong>
              . This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setCancelConfirm(null)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#9ca3af",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Keep It
              </button>
              <button
                onClick={() => handleCancel(cancelConfirm.id)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── tiny shared style tokens ─────────────────────────────────────────────────
const sty = {
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#e5e7eb",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  INTEGRATION GUIDE — CustomerApp.jsx  (4 edits)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. IMPORT  — add near the top imports in CustomerApp.jsx:

    import ScheduledOrdersPage from "./pages/ScheduledOrdersPage";

──────────────────────────────────────────────────────────────────
2. NAV TAB  — inside the `tabs` array in function Nav():
   Add after the "orders" tab entry:

    { key: "scheduled", label: "📅 Scheduled" },

──────────────────────────────────────────────────────────────────
3. PAGE RENDER  — inside the CustomerApp Layout block,
   after the `{page === "orders" ...}` block, add:

    {page === "scheduled" && (
      <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="scheduled orders">
        <ScheduledOrdersPage
          api={api}
          products={products}
          profile={profile}
          showToast={showToast}
        />
      </GuestGate>
    )}

──────────────────────────────────────────────────────────────────
4. SIDE DRAWER  — inside SideDrawer, add to the "Account" menu
   section (find the block that has "orders", "wishlist" etc.)
   and add:

    { icon: "📅", label: "Scheduled Orders", key: "scheduled" }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/