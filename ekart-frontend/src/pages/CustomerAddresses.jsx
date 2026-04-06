/**
 * CustomerAddresses.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * "View Customer Addresses" feature for the Ekart Admin panel.
 *
 * HOW TO INTEGRATE INTO AdminApp.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Import this file at the top of AdminApp.jsx:
 *      import CustomerAddresses from "./CustomerAddresses";   // adjust path
 *
 * 2. Add state (already exists as `users` in AdminApp — no new state needed).
 *
 * 3. Add a new tab in the `tabs` array (in AdminApp):
 *      { key: "addresses", label: "📍 Addresses" }
 *
 * 4. Add a new page renderer inside the <main> block:
 *      {page === "addresses" && (
 *        <CustomerAddresses
 *          customers={users.customers}
 *          api={api}
 *          showToast={show}
 *        />
 *      )}
 *
 * PROPS
 * ─────────────────────────────────────────────────────────────────────────────
 *  customers  {Array}    — array of customer objects from /admin/users
 *                          (each has: id, name, email, mobile, active, verified)
 *  api        {Function} — the api() helper from AdminApp (adds auth headers)
 *  showToast  {Function} — show(msg) toast helper from AdminApp
 *
 * BACKEND ENDPOINT ASSUMED
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET /api/react/admin/customers/{id}/addresses
 *    → { success: true, addresses: [ { id, addressLine, city, state, pinCode,
 *                                      country, isDefault, label } ] }
 *
 *  If no such endpoint exists yet, this component shows realistic mock data
 *  so the UI can be previewed immediately (see MOCK_FALLBACK constant below).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

/* ─── Toggle this to `false` once your backend endpoint is live ─────────── */
const MOCK_FALLBACK = false;

/* ─── Deterministic mock per customer id ───────────────────────────────── */
function mockAddresses(customerId) {
  const seed = Number(customerId) || 1;
  const cities = ["Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Pune", "Chennai"];
  const states = ["Maharashtra", "Karnataka", "Delhi", "Telangana", "Maharashtra", "Tamil Nadu"];
  const labels = ["Home", "Work", "Other"];
  const count  = (seed % 3) + 1;
  return Array.from({ length: count }, (_, i) => ({
    id: seed * 100 + i,
    label: labels[i % labels.length],
    addressLine: `${seed * 7 + i * 13}, ${["MG Road", "Brigade Road", "Linking Road", "Park Street"][i % 4]}`,
    city: cities[(seed + i) % cities.length],
    state: states[(seed + i) % states.length],
    pinCode: String(400000 + (seed * 17 + i * 7) % 99999).padStart(6, "0"),
    country: "India",
    isDefault: i === 0,
  }));
}

/* ─── Colour palette (matches Ekart admin's light theme) ─────────────────── */
const C = {
  bg:         "#fafaf8",
  card:       "#ffffff",
  border:     "#e8e4dc",
  primary:    "#0d0d0d",
  accent:     "#d4a017",
  accentSoft: "rgba(212,160,23,0.12)",
  muted:      "rgba(13,13,13,0.45)",
  green:      "#1db882",
  greenBg:    "#e8f9f2",
  red:        "#e84c3c",
  redBg:      "#fef2f2",
  blue:       "#2563eb",
  blueBg:     "#eff6ff",
};

/* ─── Shared style atoms ─────────────────────────────────────────────────── */
const s = {
  // Page
  root:     { },
  title:    { fontSize: 22, fontWeight: 800, color: C.primary, marginBottom: 6, letterSpacing: "-0.5px" },
  sub:      { fontSize: 13, color: C.muted, marginBottom: 24 },

  // Search + filter bar
  bar:      { display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" },
  search:   {
    flex: 1, minWidth: 220, padding: "10px 14px",
    border: `2px solid ${C.border}`, borderRadius: 10,
    fontSize: 14, background: C.bg, outline: "none",
    fontFamily: "inherit", color: C.primary,
  },
  filterBtn:(active) => ({
    padding: "9px 16px", borderRadius: 10, border: `2px solid ${active ? C.accent : C.border}`,
    background: active ? C.accentSoft : C.card, color: active ? C.accent : C.muted,
    fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.15s",
  }),

  // Customer list
  listGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 14, marginBottom: 32,
  },
  customerCard: (selected) => ({
    background: selected ? C.accentSoft : C.card,
    border: `2px solid ${selected ? C.accent : C.border}`,
    borderRadius: 14, padding: "14px 18px",
    cursor: "pointer", transition: "all 0.18s",
    display: "flex", alignItems: "center", gap: 12,
  }),
  avatar: (color) => ({
    width: 42, height: 42, borderRadius: 12,
    background: color, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 17, fontWeight: 800, flexShrink: 0, letterSpacing: -1,
  }),
  cName: { fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 2 },
  cMeta: { fontSize: 12, color: C.muted },
  badge: (color, bg) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 6,
    fontSize: 11, fontWeight: 700, background: bg, color: color, marginLeft: 6,
  }),

  // Address panel
  panel:    {
    background: C.card, border: `2px solid ${C.border}`,
    borderRadius: 16, padding: "24px 28px",
  },
  panelHead:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  panelName:{ fontSize: 17, fontWeight: 800, color: C.primary, letterSpacing: -0.4 },
  panelSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 8,
    border: `2px solid ${C.border}`, background: C.card,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, color: C.muted, fontFamily: "inherit",
  },

  // Address cards inside panel
  addrGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 14,
  },
  addrCard: {
    background: C.bg, border: `1.5px solid ${C.border}`,
    borderRadius: 12, padding: "16px 18px", position: "relative",
    transition: "border-color 0.15s",
  },
  addrCardDefault: {
    background: C.accentSoft, border: `1.5px solid ${C.accent}`,
    borderRadius: 12, padding: "16px 18px", position: "relative",
  },
  addrLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: C.accent, marginBottom: 8, textTransform: "uppercase" },
  addrLine:  { fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 4 },
  addrCity:  { fontSize: 13, color: C.muted, marginBottom: 2 },
  addrPin:   { fontSize: 13, color: C.muted },
  defaultChip: {
    position: "absolute", top: 12, right: 12,
    background: C.accentSoft, border: `1px solid ${C.accent}`,
    color: C.accent, fontSize: 10, fontWeight: 700,
    padding: "2px 8px", borderRadius: 100, letterSpacing: 0.4,
  },

  // Empty / loading states
  empty: {
    textAlign: "center", padding: "48px 24px",
    color: C.muted, fontSize: 14,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  spinner: {
    width: 28, height: 28, border: `3px solid ${C.border}`,
    borderTopColor: C.accent, borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    margin: "40px auto",
  },
};

/* ─── Avatar colour per id ───────────────────────────────────────────────── */
const AVATAR_COLORS = ["#2563eb","#7c3aed","#d4a017","#1db882","#e84c3c","#0891b2","#9333ea","#ca8a04"];
const avatarColor = (id) => AVATAR_COLORS[(Number(id) || 0) % AVATAR_COLORS.length];
const initials = (name = "") => name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

/* ─── Inject keyframe for spinner ───────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("__ca_spin")) {
  const st = document.createElement("style");
  st.id = "__ca_spin";
  st.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
  document.head.appendChild(st);
}

/* ═══════════════════════════════════════════════════════════════════════════
   AddressPanel — fetches + renders addresses for one customer
   ═══════════════════════════════════════════════════════════════════════════ */
function AddressPanel({ customer, api, showToast, onClose }) {
  const [addresses, setAddresses] = useState(null); // null = loading
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!customer) return;
    setAddresses(null);
    setError("");

    (async () => {
      try {
        const d = await api(`/admin/customers/${customer.id}/addresses`);
        if (d && d.success) {
          setAddresses(d.addresses || []);
        } else if (MOCK_FALLBACK) {
          /* API not implemented yet — show mock data with a notice */
          setAddresses(mockAddresses(customer.id));
          showToast("ℹ️ Showing mock addresses (endpoint not yet live)");
        } else {
          setError(d?.message || "Failed to load addresses");
        }
      } catch {
        if (MOCK_FALLBACK) {
          setAddresses(mockAddresses(customer.id));
          showToast("ℹ️ Showing mock addresses (endpoint not yet live)");
        } else {
          setError("Network error — could not load addresses");
        }
      }
    })();
  }, [customer?.id]);

  if (!customer) return null;

  return (
    <div style={s.panel}>
      {/* ── Header ── */}
      <div style={s.panelHead}>
        <div>
          <div style={s.panelName}>
            📍 {customer.name || "Customer"}
            {customer.active === false && (
              <span style={s.badge(C.red, C.redBg)}>Inactive</span>
            )}
          </div>
          <div style={s.panelSub}>{customer.email}{customer.mobile ? ` · ${customer.mobile}` : ""}</div>
        </div>
        <button style={s.closeBtn} onClick={onClose} title="Close">✕</button>
      </div>

      {/* ── Body ── */}
      {error && (
        <div style={{ ...s.empty, color: C.red }}>{error}</div>
      )}
      {!error && addresses === null && (
        <div style={s.spinner} />
      )}
      {!error && addresses !== null && addresses.length === 0 && (
        <div style={s.empty}>
          <div style={s.emptyIcon}>📭</div>
          <div>No saved addresses for this customer</div>
        </div>
      )}
      {!error && addresses !== null && addresses.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
            {addresses.length} address{addresses.length !== 1 ? "es" : ""} saved
          </div>
          <div style={s.addrGrid}>
            {addresses.map(addr => (
              <div
                key={addr.id}
                style={addr.isDefault ? s.addrCardDefault : s.addrCard}
              >
                {addr.isDefault && <span style={s.defaultChip}>DEFAULT</span>}
                <div style={s.addrLabel}>{addr.label || "Address"}</div>
                <div style={s.addrLine}>{addr.addressLine}</div>
                <div style={s.addrCity}>{addr.city}, {addr.state}</div>
                <div style={s.addrPin}>PIN {addr.pinCode} · {addr.country || "India"}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CustomerAddresses — main exported component
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CustomerAddresses({ customers = [], api, showToast }) {
  const [q,        setQ]        = useState("");
  const [filter,   setFilter]   = useState("all");  // all | active | inactive
  const [selected, setSelected] = useState(null);   // customer object

  /* ── Filter + search ── */
  const visible = customers.filter(c => {
    const matchQ =
      !q ||
      c.name?.toLowerCase().includes(q.toLowerCase()) ||
      c.email?.toLowerCase().includes(q.toLowerCase()) ||
      String(c.id).includes(q);
    const matchF =
      filter === "all"      ||
      (filter === "active"   && c.active !== false) ||
      (filter === "inactive" && c.active === false);
    return matchQ && matchF;
  });

  /* Auto-select first if only one result */
  useEffect(() => {
    if (visible.length === 1) setSelected(visible[0]);
  }, [visible.length]);

  /* Deselect if customer no longer visible */
  useEffect(() => {
    if (selected && !visible.find(c => c.id === selected.id)) setSelected(null);
  }, [visible]);

  return (
    <div style={s.root}>
      {/* ── Page title ── */}
      <h2 style={s.title}>Customer Addresses</h2>
      <p style={s.sub}>Select a customer to view their saved delivery addresses.</p>

      {/* ── Search + filter bar ── */}
      <div style={s.bar}>
        <input
          style={s.search}
          placeholder="Search by name, email or ID…"
          value={q}
          onChange={e => { setQ(e.target.value); setSelected(null); }}
        />
        {["all", "active", "inactive"].map(f => (
          <button
            key={f}
            style={s.filterBtn(filter === f)}
            onClick={() => { setFilter(f); setSelected(null); }}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "all"      && ` (${customers.length})`}
            {f === "active"   && ` (${customers.filter(c => c.active !== false).length})`}
            {f === "inactive" && ` (${customers.filter(c => c.active === false).length})`}
          </button>
        ))}
      </div>

      {/* ── Customer grid ── */}
      {visible.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>🔍</div>
          <div>No customers match your search</div>
        </div>
      ) : (
        <div style={s.listGrid}>
          {visible.map(c => (
            <div
              key={c.id}
              style={s.customerCard(selected?.id === c.id)}
              onClick={() => setSelected(selected?.id === c.id ? null : c)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && setSelected(selected?.id === c.id ? null : c)}
            >
              <div style={s.avatar(avatarColor(c.id))}>{initials(c.name)}</div>
              <div style={{ overflow: "hidden" }}>
                <div style={s.cName}>
                  {c.name || "—"}
                  {c.active === false && (
                    <span style={s.badge(C.red, C.redBg)}>Inactive</span>
                  )}
                </div>
                <div style={s.cMeta} title={c.email}>{c.email}</div>
                <div style={s.cMeta}>
                  #{c.id}
                  {c.mobile ? ` · ${c.mobile}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Address panel (shown below grid when a customer is selected) ── */}
      {selected && (
        <AddressPanel
          key={selected.id}
          customer={selected}
          api={api}
          showToast={showToast}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}