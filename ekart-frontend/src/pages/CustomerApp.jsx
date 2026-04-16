import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { apiFetch } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const stars = r => "★".repeat(r) + "☆".repeat(5 - r);
const statusColor = { PLACED: "#d97706", CONFIRMED: "#6366f1", SHIPPED: "#3b82f6", OUT_FOR_DELIVERY: "#8b5cf6", DELIVERED: "#16a34a", CANCELLED: "#dc2626" };

// ─── GST helpers ──────────────────────────────────────────────────────────────
// Indian GST slabs by product category.  Vendors can override per-product.
// Prices in Ekart are GST-inclusive (MRP style), so we back-calculate GST
// from the selling price:  gstAmount = price × rate / (100 + rate)
const GST_CATEGORY_RATES = {
  // 0 %
  "Groceries": 0, "Fresh Produce": 0, "Dairy & Eggs": 0, "Meat & Seafood": 0,
  "Baby Products": 0, "Books": 0, "Educational": 0,
  // 5 %
  "Snacks": 5, "Beverages": 5, "Health & Wellness": 5, "Medicines": 5,
  "Apparel": 5, "Footwear": 5, "Textiles": 5,
  // 12 %
  "Home & Kitchen": 12, "Furniture": 12, "Sports": 12, "Stationery": 12,
  "Toys & Games": 12,
  // 18 %
  "Electronics": 18, "Computers": 18, "Mobile & Tablets": 18,
  "Appliances": 18, "Beauty": 18, "Personal Care": 18,
  "Software": 18, "Services": 18,
  // 28 %
  "Gaming": 28, "Luxury": 28, "Automobile Accessories": 28,
};
const DEFAULT_GST_RATE = 18;

/** Look up the default GST rate for a category string (case-insensitive partial match). */
function gstRateForCategory(category) {
  if (!category) return DEFAULT_GST_RATE;
  const key = Object.keys(GST_CATEGORY_RATES).find(
    k => category.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(category.toLowerCase())
  );
  return key !== undefined ? GST_CATEGORY_RATES[key] : DEFAULT_GST_RATE;
}

/**
 * Given cart items (each with unitPrice/price, quantity, category, gstRate?),
 * compute per-slab GST breakdown and total GST amount.
 * Prices are GST-inclusive: gstOnItem = lineTotal × rate / (100 + rate)
 */
function computeCartGst(items = []) {
  const slabs = {};   // { "18": { rate, taxable, gst, label } }
  let totalGst = 0;

  items.forEach(item => {
    const rate = item.gstRate != null ? Number(item.gstRate) : gstRateForCategory(item.category);
    const lineTotal = (item.unitPrice || item.price || 0) * (item.quantity || 1);
    const gst = rate > 0 ? Math.round((lineTotal * rate / (100 + rate)) * 100) / 100 : 0;
    const taxable = lineTotal - gst;
    totalGst += gst;
    if (!slabs[rate]) slabs[rate] = { rate, taxable: 0, gst: 0 };
    slabs[rate].taxable += taxable;
    slabs[rate].gst += gst;
  });

  // Round slab gst to 2dp
  Object.values(slabs).forEach(s => { s.gst = Math.round(s.gst * 100) / 100; });

  return { slabs: Object.values(slabs).sort((a, b) => a.rate - b.rate), totalGst: Math.round(totalGst * 100) / 100 };
}

/** Returns a label like "GST 18%" or "GST (5% + 18%)" for mixed carts. */
function getMixedGstLabel(slabs) {
  if (!slabs || slabs.length === 0) return "GST (included)";
  const nonZero = slabs.filter(s => s.rate > 0);
  if (nonZero.length === 0) return "GST (0%)";
  if (nonZero.length === 1) return `GST ${nonZero[0].rate}% (incl.)`;
  return `GST ${nonZero.map(s => s.rate + "%").join(" + ")} (incl.)`;
}

/** Returns true if deliveryPin is allowed for this cart item. */
function isPinAllowed(item, deliveryPin) {
  if (!item?.allowedPinCodes) return true; // no restriction
  const allowed = String(item.allowedPinCodes).split(",").map(p => p.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.includes((deliveryPin || "").replace(/\D/g, "").slice(0, 6));
}

/** Returns array of cart items that can NOT be delivered to deliveryPin. */
function getPinRestrictedItems(items = [], deliveryPin) {
  if (!deliveryPin || deliveryPin.length !== 6) return [];
  return items.filter(item => !isPinAllowed(item, deliveryPin));
}

// ─── Activity tracker ──────────────────────────────────────────────────────
//
// Buffers user events and flushes them to POST /api/user-activity/batch.
// Matches the actionType vocabulary used by the Thymeleaf templates so the
// admin-user-search activity panel displays React-generated events too.
//
// Flush triggers:
//   1. Every 30 s (interval)
//   2. When buffer hits 20 events (eager flush)
//   3. On tab hide / page unload (visibilitychange + navigator.sendBeacon)
//
// Events are only recorded for authenticated CUSTOMER users — guests produce
// nothing. Failures are silently swallowed; tracking must never break UX.
//
function useActivityTracker(auth) {
  const bufferRef = useRef([]);

  const flush = useCallback((sync = false) => {
    const buf = bufferRef.current;
    if (!buf.length) return;
    bufferRef.current = [];
    const payload = JSON.stringify(buf);
    if (sync && typeof navigator.sendBeacon === "function") {
      // sendBeacon is fire-and-forget on page hide — guaranteed delivery
      navigator.sendBeacon("/api/user-activity/batch", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/user-activity/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {
        // On failure re-buffer so events aren't lost entirely
        bufferRef.current = buf.concat(bufferRef.current);
      });
    }
  }, []);

  // Periodic flush (30 s) + visibilitychange beacon
  useEffect(() => {
    const interval = setInterval(() => flush(false), 30_000);
    const onHide = () => { if (document.visibilityState === "hidden") flush(true); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      flush(false); // drain on unmount
    };
  }, [flush]);

  // Public: record one event. Silently ignored for guests / non-customers.
  const track = useCallback((actionType, metadata = {}) => {
    if (!auth?.id || auth?.role !== "CUSTOMER") return;
    bufferRef.current.push({
      userId:     auth.id,
      actionType,
      metadata:   JSON.stringify(metadata),
      timestamp:  new Date().toISOString().slice(0, 19), // LocalDateTime format
    });
    // Eager flush at 20 events
    if (bufferRef.current.length >= 20) flush(false);
  }, [auth?.id, auth?.role, flush]);

  return track;
}

/* ── Layout ── */
import AuthPage from "./AuthPage";
import AddressMap from "../components/AddressMap";
import AddressForm from "../components/AddressForm";
import { RazorpayCheckoutModal } from "../components/RazorpayCheckoutModal";

// ─── Address Management View Colors ────────────────────────────────────────
const AC = {
  bg:         "#fafaf8",
  card:       "#ffffff",
  border:     "#e8e4dc",
  primary:    "#0d0d0d",
  accent:     "#d4a017",
  accentSoft: "rgba(212,160,23,0.12)",
  muted:      "rgba(13,13,13,0.45)",
  green:      "#1db882",
  red:        "#e84c3c",
  redBg:      "#fef2f2",
};

// At the top of CustomerApp.jsx, with the other page imports:

/* ── GuestGate ────────────────────────────────────────────────────
   Wraps any page that requires login. When auth is null or GUEST,
   renders a friendly login prompt instead of the real content.
   onShowAuth is passed from the Layout/CustomerApp root so clicking
   "Sign In" opens the auth modal inline without a page reload.
─────────────────────────────────────────────────────────────────── */
function GuestGate({ auth, onShowAuth, children, pageName = "this page" }) {
  if (!auth || auth.role === "GUEST") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: 320, textAlign: "center",
        padding: "40px 24px",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>
          Sign in to access {pageName}
        </h2>
        <p style={{ color: "#6b7280", fontSize: 15, maxWidth: 360, marginBottom: 28 }}>
          Create a free account or sign in to unlock your cart, orders, wishlist and more.
        </p>
        <button
          style={{
            background: "#6366f1", color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 32px", fontSize: 15,
            fontWeight: 600, cursor: "pointer",
          }}
          onClick={onShowAuth}
        >
          Sign In / Register
        </button>
      </div>
    );
  }
  return children;
}

/* ─── My Refunds Component (from CustomerRefundReport) ────────────────────── */
function MyRefunds({ auth, api }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const statusColor = {
    PENDING:  { text: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
    APPROVED: { text: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.3)"   },
    REJECTED: { text: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)"   },
  };

  useEffect(() => {
    if (!auth || auth.role === "GUEST") return;

    const loadRefunds = async () => {
      setLoading(true);
      try {
        const d = await apiFetch("/orders", {}, auth);
        if (!d.success) { setEntries([]); setLoading(false); return; }
        const orders = d.orders || [];
        const results = await Promise.all(orders.map(async (o) => {
          try {
            const r = await apiFetch(`/refund/status/${o.id}`, {}, auth);
            if (r && r.success && r.hasRefund) {
              return {
                orderId:   o.id,
                orderDate: o.orderDate,
                amount:    o.totalPrice || o.amount || 0,
                status:    r.status,
                type:      r.type,
                reason:    r.reason || "",
                refundId:  r.refundId || null,
              };
            }
          } catch (err) {
            console.error("Error fetching refund for order", o.id, err);
          }
          return null;
        }));
        setEntries(
          results.filter(Boolean).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        );
      } catch (err) {
        console.error("Error loading refunds:", err);
        setEntries([]);
      }
      setLoading(false);
    };
    loadRefunds();
  }, [auth]);

  const filtered = entries.filter(e => filter === "ALL" || e.status === filter);
  const counts = {
    ALL: entries.length,
    PENDING:  entries.filter(e => e.status === "PENDING").length,
    APPROVED: entries.filter(e => e.status === "APPROVED").length,
    REJECTED: entries.filter(e => e.status === "REJECTED").length,
  };

  return (
    <div style={{ padding: "20px 24px", background: "#f9fafb", borderRadius: 12, marginTop: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>💰 Refund History</h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${filter === f ? "#3b82f6" : "#d1d5db"}`,
              background: filter === f ? "rgba(59, 130, 246, 0.1)" : "#ffffff",
              color: filter === f ? "#3b82f6" : "#6b7280",
            }}
          >
            {f}{counts[f] > 0 && <span style={{ opacity: 0.7 }}> ({counts[f]})</span>}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>Loading refund history...</div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>
          {filter === "ALL" ? "No refund requests found." : `No ${filter.toLowerCase()} refunds.`}
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map(e => {
          const sc = statusColor[e.status] || statusColor.PENDING;
          return (
            <div key={e.orderId} style={{ borderRadius: 12, border: `1px solid ${sc.border}`, background: sc.bg, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Order #{e.orderId}</span>
                    {e.orderDate && (
                      <span style={{ marginLeft: 10, fontSize: 12, color: "#6b7280" }}>
                        {new Date(e.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: sc.text, background: "transparent", border: `1px solid ${sc.text}` }}>
                    {e.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{e.type}</span>
                  {e.reason && <span> — {e.reason}</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{fmt(e.amount)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function MyAddresses({ auth, api }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth || auth.role === "GUEST") return;

    const fetchAddresses = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await apiFetch(`/customer/addresses`, {}, auth);
        if (response?.success) {
          setAddresses(response.addresses || []);
        } else {
          setError(response?.message || "Failed to load addresses");
        }
      } catch (err) {
        console.error("Error fetching addresses:", err);
        setError("Network error loading addresses");
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [auth]);

  return (
    <div style={{ padding: "20px 24px", background: "#f9fafb", borderRadius: 12, marginTop: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>📍 My Addresses</h3>
      
      {loading && <div style={{ color: "#6b7280", fontSize: 14 }}>Loading addresses...</div>}
      
      {error && <div style={{ color: "#d97706", fontSize: 14, padding: 10, background: "#fef3c7", borderRadius: 8 }}>{error}</div>}
      
      {!loading && !error && addresses.length === 0 && (
        <div style={{ color: "#6b7280", fontSize: 14, textAlign: "center", padding: 20 }}>
          📭 No saved addresses yet
        </div>
      )}
      
      {!loading && addresses.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {addresses.map(addr => (
            <div key={addr.id} style={{
              background: "#ffffff", border: `1.5px solid ${addr.isDefault ? "#d4a017" : "#e8e4dc"}`,
              borderRadius: 10, padding: "14px 16px", position: "relative"
            }}>
              {addr.isDefault && (
                <span style={{
                  position: "absolute", top: 10, right: 10,
                  background: "rgba(212,160,23,0.12)", border: "1px solid #d4a017",
                  color: "#d4a017", fontSize: 10, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 100
                }}>DEFAULT</span>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#d4a017", marginBottom: 8, textTransform: "uppercase" }}>
                {addr.label || "Address"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{addr.addressLine}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>{addr.city}, {addr.state}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>PIN {addr.pinCode} · {addr.country || "India"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Layout({ nav, children, onShowAuth, drawerState, pinState, cartCount, onGoCart, categories, auth }) {
  const { drawerOpen, setDrawerOpen } = drawerState;
  return (
    <div style={cs.root}>
      <Nav nav={nav} onShowAuth={onShowAuth} onOpenDrawer={() => setDrawerOpen(true)} cartCount={cartCount} />
      <LocationBar pinState={pinState} />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} nav={nav} auth={auth} categories={categories} />
      <CartPopupReminder cartCount={cartCount} onGoCart={onGoCart} />
      <main style={cs.main}>{children}</main>
    </div>
  );
}

function Nav({ nav, onShowAuth, onOpenDrawer, cartCount }) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 60, right: 16 });
  const profileBtnRef = useRef(null);
  const [acQuery, setAcQuery] = useState("");
  const [acResults, setAcResults] = useState([]);
  const [acOpen, setAcOpen] = useState(false);
  const [acLoading, setAcLoading] = useState(false);
  const acDebounce = useRef(null);
  const acRef = useRef(null);
  const HIST_KEY = "ekart_nav_history";

  const getHist = () => { try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch { return []; } };
  const saveHist = (q) => {
    if (!q || q.trim().length < 2) return;
    const h = getHist().filter(x => x.toLowerCase() !== q.toLowerCase());
    h.unshift(q.trim());
    localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 8)));
  };
  const removeHist = (q) => localStorage.setItem(HIST_KEY, JSON.stringify(getHist().filter(x => x !== q)));
  const clearHist = () => { localStorage.removeItem(HIST_KEY); setAcOpen(false); };

  const fetchAc = (q) => {
    if (!q.trim()) { setAcResults([]); setAcOpen(getHist().length > 0); setAcLoading(false); return; }
    setAcLoading(true);
    fetch("/api/search/suggestions?q=" + encodeURIComponent(q))
      .then(r => r.json())
      .then(data => { setAcResults(Array.isArray(data) ? data : []); setAcOpen(true); })
      .catch(() => setAcResults([]))
      .finally(() => setAcLoading(false));
  };

  const onAcInput = (e) => {
    const v = e.target.value;
    setAcQuery(v);
    clearTimeout(acDebounce.current);
    acDebounce.current = setTimeout(() => fetchAc(v), 200);
  };

  const onAcFocus = () => {
    if (!acQuery.trim() && getHist().length > 0) setAcOpen(true);
    else if (acQuery.trim()) setAcOpen(true);
  };

  const doNavSearch = (q) => {
    if (!q.trim()) return;
    saveHist(q);
    setAcOpen(false);
    setAcQuery(q);
    navigate("/shop/products");
    window.dispatchEvent(new CustomEvent("ekart-nav-search", { detail: { query: q } }));
  };

  useEffect(() => {
    const h = (e) => { if (acRef.current && !acRef.current.contains(e.target)) setAcOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => { logout(); navigate("/auth", { replace: true }); };

  const tabs = [
    { key: "home", label: "🏠 Home" }, { key: "search", label: "🔍 Search" },
    { key: "products", label: "🛍️ Shop" }, { key: "cart", label: "🛒 Cart" },
    { key: "orders", label: "📦 Orders" }, { key: "track", label: "🚚 Track" },
    { key: "wishlist", label: "❤️ Wishlist" }, { key: "coupons", label: "🎟️ Coupons" },
    { key: "refunds", label: "🧾 Refunds" }, { key: "spending", label: "💰 Spending" }, { key: "profile", label: "👤 Profile" },
  ];
  if (auth && auth.role === "VENDOR") tabs.push({ key: "vendor", label: "🏬 Vendor" });

  const hist = getHist();
  const showHistory = acOpen && !acQuery.trim() && hist.length > 0;

  return (
    <nav style={cs.nav}>
      {/* Hamburger */}
      <button style={cs.hamburgerBtn} onClick={onOpenDrawer} aria-label="Open menu">
        <span style={cs.hamburgerLine} /><span style={cs.hamburgerLine} /><span style={cs.hamburgerLine} />
      </button>

      <span style={cs.brand} onClick={() => nav.go("home")} role="button" tabIndex={0}>🛒 EKART</span>

      {/* Nav Autocomplete Search */}
      <div style={{ position: "relative", flex: 1, maxWidth: 380 }} ref={acRef}>
        <input
          style={cs.navSearchInput}
          placeholder="Search products…"
          value={acQuery}
          onChange={onAcInput}
          onFocus={onAcFocus}
          onKeyDown={e => {
            if (e.key === "Enter" && acQuery.trim()) { saveHist(acQuery); doNavSearch(acQuery); }
            if (e.key === "Escape") setAcOpen(false);
          }}
        />
        <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#9ca3af", fontSize:13, pointerEvents:"none" }}>🔍</span>
        {acOpen && (
          <div style={cs.acDropdown}>
            {/* History view */}
            {showHistory && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 12px 2px", fontSize:12, color:"#6b7280", fontWeight:700, textTransform:"uppercase" }}>
                  <span>Recent</span>
                  <button style={{ background:"none", border:"none", color:"#4f46e5", fontSize:12, cursor:"pointer", fontWeight:600 }} onClick={clearHist}>Clear all</button>
                </div>
                {hist.map((h, i) => (
                  <div key={i} style={cs.acItem} onClick={() => doNavSearch(h)}>
                    <span style={{ color:"#9ca3af", fontSize:14 }}>🕐</span>
                    <span style={{ flex:1, fontSize:14, color:"#111827" }}>{h}</span>
                    <button style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:13 }}
                      onClick={e => { e.stopPropagation(); removeHist(h); setAcOpen(getHist().length > 0); }}>✕</button>
                  </div>
                ))}
              </>
            )}
            {/* Live results */}
            {acLoading && <div style={{ padding:"10px 14px", fontSize:14, color:"#6b7280" }}>🔄 Searching…</div>}
            {!acLoading && acQuery.trim() && acResults.length === 0 && (
              <div style={{ padding:"10px 14px", fontSize:14, color:"#6b7280" }}>No results for "{acQuery}"</div>
            )}
            {!acLoading && acResults.map((s, i) => (
              <div key={i} style={cs.acItem} onClick={() => doNavSearch(s.productName)}>
                {s.imageLink
                  ? <img src={s.imageLink} alt="" style={{ width:36, height:36, borderRadius:6, objectFit:"cover", flexShrink:0 }} />
                  : <span style={{ fontSize:20 }}>🛍️</span>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, color:"#111827", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.productName}</div>
                  {s.category && <div style={{ fontSize:12, color:"#4f46e5", marginTop:1 }}>in {s.category}</div>}
                </div>
                {i < 3 && s.purchaseCount > 0 && <span style={{ fontSize:10, background:"rgba(239,68,68,0.2)", color:"#fca5a5", border:"1px solid rgba(239,68,68,0.3)", padding:"2px 6px", borderRadius:20, flexShrink:0 }}>🔥 Popular</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable tab links */}
      <div style={cs.navLinks}>
        {tabs.map(t => (
          <button key={t.key} style={{ ...cs.navBtn, ...(nav.active === t.key ? cs.navBtnActive : {}) }}
            onClick={() => nav.go(t.key)}>{t.label}</button>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        {/* India flag badge */}
        <div style={cs.indiaBadge} title="Made in India">
          <svg width="22" height="16" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg" style={{ display:"block", borderRadius:2, flexShrink:0 }}>
            <rect width="22" height="16" fill="#fff"/>
            <rect width="22" height="5.33" fill="#FF9933"/>
            <rect y="10.67" width="22" height="5.33" fill="#138808"/>
            <circle cx="11" cy="8" r="2.5" fill="none" stroke="#000080" strokeWidth="0.5"/>
            <circle cx="11" cy="8" r="0.5" fill="#000080"/>
            <g stroke="#000080" strokeWidth="0.35" fill="none">
              <line x1="11" y1="5.5" x2="11" y2="10.5"/><line x1="8.5" y1="8" x2="13.5" y2="8"/>
              <line x1="9.23" y1="5.73" x2="12.77" y2="10.27"/><line x1="12.77" y1="5.73" x2="9.23" y2="10.27"/>
              <line x1="8.5" y1="6.27" x2="13.5" y2="9.73"/><line x1="13.5" y1="6.27" x2="8.5" y2="9.73"/>
            </g>
          </svg>
          <span style={{ fontSize:11, fontWeight:600 }}>India</span>
        </div>

        {/* Cart with badge */}
        <button style={{ ...cs.navBtn, position:"relative", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8 }} onClick={() => nav.go("cart")}>
          🛒
          {cartCount > 0 && <span style={cs.cartBadge}>{cartCount}</span>}
        </button>

        {/* Profile dropdown / Sign In */}
        {auth && auth.role !== "GUEST" ? (
          <div style={{ position:"relative" }}>
            <button ref={profileBtnRef} style={cs.profileIconBtn} onClick={() => {
              if (!profileOpen) {
                const rect = profileBtnRef.current?.getBoundingClientRect();
                if (rect) setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
              }
              setProfileOpen(o => !o);
            }} title="Account">👤</button>
            {profileOpen && createPortal(
              <div style={{ ...cs.profileDropdown, top: dropdownPos.top, right: dropdownPos.right }} onClick={() => setProfileOpen(false)}>
                <div style={{ padding:"11px 16px", fontSize:13, color:"#6b7280", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", gap:6 }}>
                  <span>👤</span><span>{auth?.name || "Account"}</span>
                </div>
                <div style={cs.profileItem} onClick={() => nav.go("profile")}>👤 My Profile</div>
                <div style={cs.profileItem} onClick={() => window.location.href="/customer/security-settings"}>🛡️ Security Settings</div>
                <div style={{ ...cs.profileItem, color:"#f87171" }} onClick={handleLogout}>🚪 Logout</div>
              </div>,
              document.body
            )}
          </div>
        ) : (
          <button style={{ ...cs.navBtn, border:"1.5px solid #4f46e5", background:"#ede9fe", color:"#4f46e5", fontWeight:700 }} onClick={onShowAuth}>Sign In</button>
        )}
      </div>
    </nav>
  );
}

/* ── Side Drawer ── */
function SideDrawer({ open, onClose, nav, auth, categories }) {
  const [expandedCat, setExpandedCat] = useState(null);
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:998, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition:"opacity 0.3s", backdropFilter:"blur(3px)" }}
        onClick={onClose} />
      <div style={{ position:"fixed", top:0, left:0, bottom:0, width:300, maxWidth:"85vw", background:"#ffffff", zIndex:999, transform: open ? "translateX(0)" : "translateX(-100%)", transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)", display:"flex", flexDirection:"column", overflowX:"hidden", boxShadow:"4px 0 24px rgba(0,0,0,0.12)" }}>
        <div style={{ background:"#4f46e5", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, fontWeight:700, color:"#fff", fontSize:15 }}>
            <span style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.35)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>👤</span>
            Hello, {auth?.name?.split(" ")[0] || "Guest"}
          </div>
          <button style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%", width:32, height:32, color:"#fff", cursor:"pointer", fontSize:15 }} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          <div style={cs.drawerSectionTitle}>Trending</div>
          {[{icon:"🔥",label:"Bestsellers",key:"products"},{icon:"⭐",label:"New Arrivals",key:"products"},{icon:"📊",label:"My Spending",key:"spending"}].map(item => (
            <button key={item.label} style={cs.drawerItem} onClick={() => { nav.go(item.key); onClose(); }}>
              <span>{item.icon} {item.label}</span><span style={{ color:"#9ca3af", fontSize:14 }}>›</span>
            </button>
          ))}
          <div style={cs.drawerSectionTitle}>Shop by Category</div>
          {categories.map((cat, i) => {
            const isStr   = typeof cat === "string";
            const name    = isStr ? cat : cat.name;
            const emoji   = getCatEmoji(cat);
            const subs    = isStr ? [] : (cat.subCategories || []);
            const isExpanded = expandedCat === i;
            return (
              <div key={i}>
                <button style={cs.drawerItem} onClick={() => {
                  if (subs.length > 0) {
                    setExpandedCat(isExpanded ? null : i);
                  } else {
                    // Leaf parent (no subs) — filter directly
                    window.dispatchEvent(new CustomEvent("ekart-nav-cat", { detail: { cat: name } }));
                    nav.go("products");
                    onClose();
                  }
                }}>
                  <span>{emoji} {name}</span>
                  {subs.length > 0 && (
                    <span style={{ color:"#9ca3af", fontSize:14, transition:"transform 0.2s", transform: isExpanded ? "rotate(90deg)":"rotate(0)", display:"inline-block" }}>›</span>
                  )}
                </button>
                {isExpanded && subs.length > 0 && (
                  <div style={{ background:"#f9fafb", borderLeft:"3px solid #4f46e5", marginLeft:16 }}>
                    {subs.map(sub => {
                      const subName  = typeof sub === "string" ? sub : sub.name;
                      const subEmoji = typeof sub === "string" ? "" : (sub.emoji || "");
                      return (
                        <button key={subName} style={{ ...cs.drawerItem, paddingLeft:20, fontSize:14, color:"#374151" }}
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("ekart-nav-cat", { detail: { cat: subName } }));
                            nav.go("products");
                            onClose();
                          }}>
                          {subEmoji && <span style={{ marginRight:6 }}>{subEmoji}</span>}
                          {subName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div style={cs.drawerSectionTitle}>My Account</div>
          {[{icon:"📦",label:"My Orders",key:"orders"},{icon:"🚚",label:"Track Orders",key:"track"},{icon:"❤️",label:"Wishlist",key:"wishlist"},{icon:"🛒",label:"Cart",key:"cart"},{icon:"📊",label:"Spending Analytics",key:"spending"},{icon:"👤",label:"Profile",key:"profile"}].map(item => (
            <button key={item.key} style={cs.drawerItem} onClick={() => { nav.go(item.key); onClose(); }}>
              <span>{item.icon} {item.label}</span><span style={{ color:"#9ca3af", fontSize:14 }}>›</span>
            </button>
          ))}
          <div style={cs.drawerSectionTitle}>Help</div>
          <button style={cs.drawerItem} onClick={() => { window.location.href="/policies"; onClose(); }}>📄 Policies & Terms ›</button>
        </div>
        <div style={{ padding:"12px 16px", borderTop:"1px solid #e5e7eb", background:"#f9fafb", flexShrink:0 }}>
          <button style={{ background:"none", border:"none", color:"#dc2626", cursor:"pointer", fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}
            onClick={() => window.location.href="/logout"}>🚪 Sign Out</button>
        </div>
      </div>
    </>
  );
}

/* ── Location Bar + Modal ── */
function LocationBar({ pinState }) {
  const { pin, setPin } = pinState;
  const [modalOpen, setModalOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pin && !sessionStorage.getItem("ekart_loc_seen")) {
      sessionStorage.setItem("ekart_loc_seen", "1");
      setTimeout(() => setModalOpen(true), 1200);
    }
  }, []);

  const isIndianPin = (v) => {
    if (!/^\d{6}$/.test(v)) return false;
    const p = v.slice(0, 2);
    const valid = new Set(["11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","30","31","32","33","34","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","56","57","58","59","60","61","62","63","64","65","66","67","68","69","70","71","72","73","74","75","76","77","78","79","80","81","82","83","84","85","90","91","92","93","94","95","96","97","98","99"]);
    return valid.has(p);
  };

  const confirm = () => {
    const v = input.replace(/\D/g,"").slice(0,6);
    if (!isIndianPin(v)) { setError("Please enter a valid Indian pin code."); return; }
    setPin(v);
    localStorage.setItem("ekart_delivery_pin", v);
    setModalOpen(false);
  };

  const clear = () => {
    setPin("");
    localStorage.removeItem("ekart_delivery_pin");
    setModalOpen(false);
  };

  return (
    <>
      <div style={{ position:"sticky", top:64, zIndex:99, background:"#f9fafb", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", padding:"6px 20px", gap:8, fontSize:14, color:"#374151" }}>
        <span style={{ color:"#f5a800" }}>📍</span>
        <span>Delivering to</span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#ede9fe", border:"1px solid #c4b5fd", borderRadius:50, padding:"3px 12px", cursor:"pointer", color:"#4f46e5", fontWeight:600, fontSize:14 }}
          onClick={() => { setInput(pin || ""); setError(""); setModalOpen(true); }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background: pin ? "#16a34a" : "#d97706", flexShrink:0 }} />
          {pin ? `📍 ${pin}` : "Set your location"}
        </span>
        {pin && <span style={{ fontSize:13, color:"#6b7280" }}>· Products greyed out are not available at your pin</span>}
      </div>
      {modalOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:99999, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{ background:"#ffffff", border:"1.5px solid #e5e7eb", borderRadius:22, padding:"28px 32px", width:"90%", maxWidth:400, boxShadow:"0 30px 80px rgba(0,0,0,0.15)", position:"relative" }}>
            <button style={{ position:"absolute", top:14, right:18, background:"none", border:"none", color:"#6b7280", fontSize:18, cursor:"pointer" }} onClick={() => setModalOpen(false)}>✕</button>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:4, color:"#111827" }}>📍 Set Delivery Location</div>
            <div style={{ fontSize:14, color:"#6b7280", marginBottom:20 }}>We'll show only products available at your pin code.</div>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ flex:1, background:"#f9fafb", border:"1.5px solid #d1d5db", borderRadius:10, color:"#111827", fontSize:16, padding:"11px 14px", letterSpacing:"0.1em", outline:"none" }}
                placeholder="6-digit pin code" maxLength={6} inputMode="numeric" value={input}
                onChange={e => { setInput(e.target.value.replace(/\D/g,"").slice(0,6)); setError(""); }}
                onKeyDown={e => e.key === "Enter" && confirm()} />
              <button style={{ background:"#4f46e5", color:"#fff", border:"none", borderRadius:10, padding:"11px 20px", fontWeight:700, cursor:"pointer", fontSize:15 }} onClick={confirm}>Apply</button>
            </div>
            {error && <div style={{ fontSize:13, color:"#dc2626", marginTop:8 }}>{error}</div>}
            {pin && <div style={{ textAlign:"center", marginTop:14, fontSize:13, color:"#6b7280", cursor:"pointer" }} onClick={clear}>✕ Clear location filter</div>}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Cart Popup Reminder ── */
function CartPopupReminder({ cartCount, onGoCart }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (cartCount > 0 && !dismissed) {
      const t = setTimeout(() => setVisible(true), 1800);
      return () => clearTimeout(t);
    }
  }, [cartCount, dismissed]);
  if (!visible || dismissed || cartCount === 0) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={() => { setVisible(false); setDismissed(true); }}>
      <div style={{ background:"#ffffff", border:"1.5px solid #e5e7eb", borderRadius:24, padding:"36px 32px 28px", maxWidth:360, width:"100%", textAlign:"center", position:"relative", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}
        onClick={e => e.stopPropagation()}>
        <button style={{ position:"absolute", top:14, right:18, background:"none", border:"none", color:"#9ca3af", fontSize:18, cursor:"pointer" }} onClick={() => { setVisible(false); setDismissed(true); }}>✕</button>
        <div style={{ fontSize:48, marginBottom:14 }}>🛒</div>
        <h4 style={{ fontSize:19, fontWeight:700, color:"#111827", marginBottom:8 }}>You left something behind!</h4>
        <p style={{ fontSize:15, color:"#374151", lineHeight:1.65, marginBottom:20 }}>
          You have <strong style={{ color:"#4f46e5" }}>{cartCount}</strong> item{cartCount > 1 ? "s" : ""} waiting in your cart.
        </p>
        <button style={{ background:"#4f46e5", color:"#fff", border:"none", borderRadius:50, padding:"11px 28px", fontWeight:700, cursor:"pointer", fontSize:15, display:"inline-flex", alignItems:"center", gap:8, boxShadow:"0 6px 24px rgba(79,70,229,0.3)" }}
          onClick={() => { onGoCart(); setVisible(false); setDismissed(true); }}>
          🛒 View My Cart
        </button>
        <div style={{ marginTop:12, fontSize:13, color:"#9ca3af", cursor:"pointer" }} onClick={() => { setVisible(false); setDismissed(true); }}>No thanks, I'll shop later</div>
      </div>
    </div>
  );
}

/* ── Budget Bar ── */
function BudgetBar({ products, onBudgetChange }) {
  const maxPrice = products.length ? Math.ceil(Math.max(...products.map(p => parseFloat(p.price || 0))) * 1.1 / 50) * 50 : 10000;
  const [val, setVal] = useState(maxPrice);
  const [reset, setReset] = useState(true);

  useEffect(() => { setVal(maxPrice); setReset(true); }, [maxPrice]);

  const handleChange = (v) => { setVal(v); setReset(false); onBudgetChange(parseFloat(v)); };
  const handleReset = () => { setVal(maxPrice); setReset(true); onBudgetChange(Infinity); };

  return (
    <div style={{ background:"#f9fafb", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"14px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:16 }}>
      <span style={{ fontSize:14, fontWeight:600, color:"#4f46e5", whiteSpace:"nowrap" }}>💰 Budget</span>
      <input type="range" min={0} max={maxPrice} step={50} value={reset ? maxPrice : val}
        onChange={e => handleChange(e.target.value)}
        style={{ flex:1, minWidth:120, accentColor:"#4f46e5", cursor:"pointer" }} />
      <span style={{ fontWeight:700, color:"#111827", whiteSpace:"nowrap", minWidth:80 }}>
        {reset ? "All Products" : "₹" + Number(val).toLocaleString("en-IN")}
      </span>
      <button style={{ background:"none", border:"1.5px solid #d1d5db", borderRadius:7, padding:"5px 14px", color:"#374151", cursor:"pointer", fontSize:13, fontWeight:600 }} onClick={handleReset}>↺ Reset</button>
    </div>
  );
}

/* ── Sort Bar ── */
function SortBar({ count, sortType, onSort }) {
  const sorts = [
    { key:"default", label:"Default" },{ key:"price-asc", label:"Price ↑" },{ key:"price-desc", label:"Price ↓" },
    { key:"rating", label:"⭐ Rating" },{ key:"newest", label:"Newest" },{ key:"name", label:"A–Z" },
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", background:"#f9fafb", border:"1.5px solid #e5e7eb", borderRadius:12, padding:"10px 16px", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.08em" }}>Sort:</span>
        {sorts.map(s => (
          <button key={s.key} onClick={() => onSort(s.key)}
            style={{ padding:"5px 14px", borderRadius:20, border: sortType===s.key ? "1.5px solid #4f46e5" : "1.5px solid #e5e7eb", background: sortType===s.key ? "#ede9fe" : "#ffffff", color: sortType===s.key ? "#4f46e5" : "#374151", fontSize:13, fontWeight: sortType===s.key ? 700 : 500, cursor:"pointer", whiteSpace:"nowrap" }}>
            {s.label}
          </button>
        ))}
      </div>
      <span style={{ fontSize:13, color:"#6b7280", whiteSpace:"nowrap" }}>
        Showing <span style={{ color:"#4f46e5", fontWeight:600 }}>{count}</span> products
      </span>
    </div>
  );
}

/* ── Search Results Banner ── */
function SearchResultsBanner({ query, count, onClear }) {
  if (!query) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", background:"rgba(245,168,0,0.08)", border:"1px solid rgba(245,168,0,0.3)", borderRadius:14, padding:"12px 20px", marginBottom:16 }}>
      <span style={{ fontSize:14, color:"rgba(255,255,255,0.5)" }}>🔍 Showing results for</span>
      <span style={{ fontWeight:700, color:"#f5a800" }}>"{query}"</span>
      <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>— {count} product{count!==1?"s":""} found</span>
      <button style={{ marginLeft:"auto", background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:7, padding:"4px 12px", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:12, whiteSpace:"nowrap" }} onClick={onClear}>
        ✕ Clear search
      </button>
    </div>
  );
}

function Toast({ msg, onHide }) {
  useEffect(() => { if (msg) { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return <div style={cs.toast}>{msg}</div>;
}

/* ── Main ── */
export default function CustomerApp() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);

  // Derive current page from URL: /shop/:page  → page
  // Falls back to "home" so /shop/ and /shop still work.
  const page = location.pathname.replace(/^\/shop\/?/, "").split("/")[0] || "home";
  const setPage = (p) => navigate(`/shop/${p}`, { replace: false });
  const checkoutStep = new URLSearchParams(location.search).get("step");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0, itemCount: 0, subtotal: 0, deliveryCharge: 0 });
  const [orders, setOrders] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [profile, setProfile] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [spendingData, setSpendingData] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cartLoading, setCartLoading] = useState({});
  const [initialCartLoaded, setInitialCartLoaded] = useState(false);
  const [paymentPage, setPaymentPage] = useState(false);
  const [addressPage, setAddressPage] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [reportOrder, setReportOrder] = useState(null);
  const [reorderStockCheck, setReorderStockCheck] = useState(null); // { orderId, items, hasOutOfStock }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState(() => localStorage.getItem("ekart_delivery_pin") || "");
  const pinState = { pin: deliveryPin, setPin: setDeliveryPin };
  const track = useActivityTracker(auth);

  // recently viewed products (client + server sync)
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);

  const readLocalRecentlyViewed = () => {
    try {
      const raw = localStorage.getItem("recentlyViewed");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map(Number).filter(Boolean);
    } catch (e) {}
    return [];
  };

  const saveLocalRecentlyViewed = (ids) => {
    try { localStorage.setItem("recentlyViewed", JSON.stringify(ids)); } catch (e) {}
  };

  const fetchRecentlyViewedProducts = async (ids) => {
    if (!ids || ids.length === 0) { setRecentlyViewedProducts([]); return; }
    try {
      const q = ids.join(",");
      const res = await fetch(`/api/recently-viewed/products?ids=${q}`);
      const data = await res.json();
      if (Array.isArray(data)) setRecentlyViewedProducts(data);
      else setRecentlyViewedProducts([]);
    } catch (e) { setRecentlyViewedProducts([]); }
  };

  const syncRecentlyViewedToServer = async (ids) => {
    if (!auth || auth?.role !== "CUSTOMER") return;
    try {
      const headers = { "Content-Type": "application/json" };
      if (auth) headers["X-Customer-Id"] = auth.id;
      await fetch("/api/recently-viewed/sync", { method: "POST", headers, body: JSON.stringify({ productIds: ids }), credentials: "include" });
    } catch (e) { /* ignore */ }
  };

  const recordRecentlyViewed = async (productId) => {
    if (!productId) return;
    const cur = readLocalRecentlyViewed();
    const ids = [productId, ...cur.filter(id => id !== productId)].slice(0, 10);
    saveLocalRecentlyViewed(ids);
    fetchRecentlyViewedProducts(ids);
    syncRecentlyViewedToServer(ids);
  };

  const loadInitialRecentlyViewed = async () => {
    try {
      if (auth && auth.role === "CUSTOMER") {
        const headers = { "Content-Type": "application/json" };
        if (auth) headers["X-Customer-Id"] = auth.id;
        const res = await fetch("/api/recently-viewed/sync", { headers, credentials: "include" });
        const d = await res.json();
        const ids = (d && d.productIds) ? d.productIds : readLocalRecentlyViewed();
        saveLocalRecentlyViewed(ids);
        fetchRecentlyViewedProducts(ids);
        return;
      }
      const local = readLocalRecentlyViewed();
      fetchRecentlyViewedProducts(local);
    } catch (e) { fetchRecentlyViewedProducts(readLocalRecentlyViewed()); }
  };

  const api = useCallback((path, opts) => apiFetch(path, opts, auth), [auth]);
  const showToast = m => setToast(m);

  const setCheckoutStep = (step) => {
    const base = "/shop/cart";
    if (!step) navigate(base, { replace: false });
    else navigate(`${base}?step=${encodeURIComponent(step)}`, { replace: false });
  };

  const loadProducts = useCallback(async (q = "", cat = "") => {
    let path = "/products";
    const params = [];
    if (q) params.push(`search=${encodeURIComponent(q)}`);
    if (cat) params.push(`category=${encodeURIComponent(cat)}`);
    if (params.length) path += "?" + params.join("&");
    const d = await api(path);
    if (d.success) setProducts(d.products || []);
  }, [api]);

  const loadCategories = useCallback(async () => {
    const d = await api("/products/categories");
    if (d.success) setCategories(d.categories || []);
  }, [api]);

  const loadCart = useCallback(async () => {
    const d = await api("/cart");
    if (d.success) {
      setCart(d);
      setInitialCartLoaded(true);
    }
  }, [api]);

  const loadOrders = useCallback(async () => {
    const d = await api("/orders");
    if (d.success) setOrders(d.orders || []);
  }, [api]);

  const loadWishlist = useCallback(async () => {
    const d = await api("/wishlist/ids");
    if (d.success) setWishlistIds(d.ids || []);
  }, [api]);

  const loadProfile = useCallback(async () => {
    try {
      const d = await api("/profile");
      if (d && d.success) {
        setProfile(d.profile || { addresses: [] });
      } else {
        setProfile({ addresses: [] });
      }
    } catch {
      setProfile({ addresses: [] });
    }
  }, [api]);

  const loadCoupons = useCallback(async () => {
    const d = await api("/coupons");
    if (d.success) setCoupons(d.coupons || []);
  }, [api]);

  const loadSpending = useCallback(async () => {
    const d = await api("/spending-summary");
    if (d.success) setSpendingData(d);
  }, [api]);

  // Auto-detect delivery PIN from user's IP location
  const autoDetectDeliveryPin = useCallback(async () => {
    // Skip if already have a PIN stored
    if (deliveryPin) return;
    
    try {
      const res = await fetch("/api/geocode/auto");
      const data = await res.json();
      
      if (data.success && data.pin) {
        setDeliveryPin(data.pin);
        localStorage.setItem("ekart_delivery_pin", data.pin);
        showToast(`📍 Auto-detected your location: ${data.city}, ${data.state} (PIN: ${data.pin})`);
      } else if (data.pinMissing && data.city) {
        // Got city but no PIN - prompt user
        showToast(`📍 Detected ${data.city}, ${data.state} - please enter your PIN code`);
      } else if (data.outsideIndia) {
        showToast(`🌍 We deliver only in India. You're accessing from ${data.country}.`);
      }
    } catch (err) {
      // Silently fail - auto-detect is optional
      console.log("Auto-detect PIN failed:", err);
    }
  }, [deliveryPin]);

  useEffect(() => { 
    loadProducts(); loadCategories();
    if (auth?.role === "CUSTOMER") {
      loadCart(); loadWishlist(); loadProfile();
      // Auto-detect delivery PIN on first load
      autoDetectDeliveryPin();
    }
    // load recently viewed products (local or server)
    loadInitialRecentlyViewed();
  }, []);
  useEffect(() => { if (page === "orders" || page === "track") loadOrders(); }, [page]);
  useEffect(() => { if (page === "coupons") loadCoupons(); }, [page]);
  useEffect(() => { if (page === "spending") loadSpending(); }, [page]);
  useEffect(() => {
    if (page !== "cart") {
      if (addressPage) setAddressPage(false);
      if (paymentPage) setPaymentPage(false);
      return;
    }

    if (checkoutStep === "address") {
      if (!addressPage) setAddressPage(true);
      if (paymentPage) setPaymentPage(false);
    } else if (checkoutStep === "payment") {
      if (!paymentPage) setPaymentPage(true);
      if (addressPage) setAddressPage(false);
    } else {
      if (addressPage) setAddressPage(false);
      if (paymentPage) setPaymentPage(false);
    }
  }, [page, checkoutStep, addressPage, paymentPage]);

  const addToCart = async (productId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to add items to cart"); return; }
    setCartLoading(l => ({ ...l, [productId]: true }));
    const d = await api("/cart/add", { method: "POST", body: JSON.stringify({ productId }) });
    if (d.success) {
      showToast("Added to cart ✓");
      loadCart();
      track("ADD_TO_CART", { productId });
    }
    else showToast(d.message || "Failed to add");
    setCartLoading(l => ({ ...l, [productId]: false }));
  };

  const removeFromCart = async (productId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to manage your cart"); return; }
    const d = await api(`/cart/remove/${productId}`, { method: "DELETE" });
    if (d?.success) {
      await loadCart();
      showToast("Removed from cart");
    } else {
      showToast(d?.message || "Failed to remove item — please try again");
    }
  };

  const updateCartQty = async (productId, quantity) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to manage your cart"); return; }
    const d = await api("/cart/update", { method: "PUT", body: JSON.stringify({ productId, quantity }) });
    if (d?.success) {
      await loadCart();
    } else {
      showToast(d?.message || "Failed to update quantity");
    }
  };

  const applyCoupon = async (code) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to apply coupons"); return; }
    if (!code || !code.trim()) { showToast("Enter a coupon code"); return; }
    const d = await api("/cart/coupon", { method: "POST", body: JSON.stringify({ code: code.trim().toUpperCase() }) });
    if (d.success) {
      await loadCart(); // refresh so couponApplied / couponDiscount / total update first
      showToast(d.message || `Coupon applied! Saving ₹${Math.round(d.discount || 0)}`);
    } else {
      showToast(d.message || "Invalid coupon");
    }
  };

  const removeCoupon = async () => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to manage coupons"); return; }
    const d = await api("/cart/coupon", { method: "DELETE" });
    if (d?.success) {
      await loadCart();
      showToast("Coupon removed");
    } else {
      showToast(d?.message || "Failed to remove coupon");
    }
  };

  const toggleWishlist = async (productId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to save items to wishlist"); return; }
    const adding = !wishlistIds.includes(productId);
    const d = await api("/wishlist/toggle", { method: "POST", body: JSON.stringify({ productId }) });
    if (d.success) {
      loadWishlist();
      showToast(d.message || "Wishlist updated");
      track(adding ? "WISHLIST_ADD" : "WISHLIST_REMOVE", { productId });
    }
  };

  const placeOrder = async (addressId, paymentMode = "COD", deliveryTime = "STANDARD", paymentDetails = null) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to place an order"); return; }

    // ── Per-product PIN restriction check ────────────────────────────
    // Resolve delivery PIN from selected address
    const allAddrs = profile?.addresses || [];
    const deliveryAddr = allAddrs.find(a => a.id === addressId);
    const deliveryPin = (deliveryAddr?.postalCode || "").replace(/\D/g, "").slice(0, 6);
    if (deliveryPin && cart?.items?.length) {
      const restricted = cart.items.filter(item => {
        if (!item.allowedPinCodes) return false;
        const allowed = String(item.allowedPinCodes).split(",").map(p => p.trim()).filter(Boolean);
        return allowed.length > 0 && !allowed.includes(deliveryPin);
      });
      if (restricted.length > 0) {
        const names = restricted.map(i => `"${i.name}"`).join(", ");
        showToast(`🚫 ${restricted.length} item(s) can't be delivered to PIN ${deliveryPin}: ${names}. Please remove them or choose a different address.`);
        return;
      }
    }

    // Pass coupon code (if applied) so the backend can cross-validate at order time
    const couponCode = cart?.couponCode || "";
    const orderPayload = { paymentMode, addressId, couponCode, deliveryTime };
    
    // Include payment details for online payments
    if (paymentMode === "ONLINE" && paymentDetails) {
      orderPayload.razorpayPaymentId = paymentDetails.razorpayPaymentId;
      orderPayload.razorpayOrderId = paymentDetails.razorpayOrderId;
    }

    const d = await api("/orders/place", { method: "POST", body: JSON.stringify(orderPayload) });
    if (d.success) {
      const savedMsg = d.couponDiscount > 0 ? ` You saved ₹${Math.round(d.couponDiscount)}!` : "";
      showToast("Order placed! 🎉" + savedMsg);
      track("ORDER_PLACED", {
        paymentMode,
        orderCount: d.orders?.length ?? 1,
        couponApplied: !!couponCode,
      });
      setOrderSuccess(d);
      setPaymentPage(false);
      loadCart(); loadOrders(); setPage("success");
    } else showToast(d.message || "Failed to place order");
  };

  const cancelOrder = async (orderId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to manage orders"); return; }
    const d = await api(`/orders/${orderId}/cancel`, { method: "POST" });
    if (d.success) { showToast("Order cancelled"); loadOrders(); }
    else showToast(d.message || "Cannot cancel");
  };

  const reorderItems = async (orderId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to reorder items"); return; }
    // Step 1: pre-check stock before touching the cart
    const stock = await api(`/orders/${orderId}/check-stock`);
    if (!stock.success) { showToast(stock.message || "Could not check stock"); return; }
    if (stock.hasOutOfStock) {
      // Show modal so the customer can decide whether to proceed
      setReorderStockCheck({ orderId, items: stock.items });
      return;
    }
    // All items in stock — proceed directly
    const d = await api(`/orders/${orderId}/reorder`, { method: "POST" });
    if (d.success) { showToast("Items added to cart!"); loadCart(); setPage("cart"); }
    else showToast(d.message || "Reorder failed");
  };

  const requestReplacement = async (orderId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to request a replacement"); return; }
    const d = await api(`/orders/${orderId}/request-replacement`, { method: "POST" });
    if (d.success) { showToast("Replacement requested successfully"); loadOrders(); }
    else showToast(d.message || "Could not request replacement");
  };

  const downloadInvoice = async (orderId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to download invoice"); return; }
    try {
      const token = auth?.token || localStorage.getItem("token");
      const response = await fetch(`/api/react/orders/${orderId}/invoice`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Customer-Id": auth.customerId || auth.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showToast(errorData?.message || "Failed to download invoice");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Order_${orderId}_Invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast("Invoice downloaded successfully");
    } catch (err) {
      console.error("Invoice download error:", err);
      showToast("Error downloading invoice: " + err.message);
    }
  };

  const confirmReorder = async (orderId) => {
    setReorderStockCheck(null);
    const d = await api(`/orders/${orderId}/reorder`, { method: "POST" });
    if (d.success) {
      const partial = d.outOfStockItems?.length > 0;
      showToast(partial ? `Cart updated — ${d.outOfStockItems.length} item(s) unavailable` : "Items added to cart!");
      loadCart();
      setPage("cart");
    } else showToast(d.message || "Reorder failed");
  };

  const reportIssue = async (orderId, data) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to report issues"); return; }

    // 1. Create a Refund DB record — returns refundId so the modal can
    //    immediately show the inline image upload without navigating away.
    let refundId = null;
    try {
      const rf = await api("/refund/request", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          reason: data.reason + (data.details ? " — " + data.details : ""),
          type: data.type || "REFUND",
        }),
      });
      if (rf.success) refundId = rf.refundId ?? null;
    } catch { /* non-fatal */ }

    // 2. Also log the dispute / notify admin (existing behaviour).
    const d = await api(`/orders/${orderId}/report-issue`, { method: "POST", body: JSON.stringify(data) });

    if (!d.success && refundId === null) {
      showToast(d.message || "Failed to report");
      return null;
    }
    // Return refundId so ReportIssueModal can show inline upload
    return refundId;
  };

  const nav = { active: page, go: (p) => { setSelectedProduct(null); setSelectedOrder(null); setPaymentPage(false); setAddressPage(false); window.scrollTo(0, 0); try { track("PAGE_VIEW", { page: p }); } catch(e) {} setTimeout(() => navigate(`/shop/${p}`), 0); } };

  return (
    <>
      <Layout nav={nav} onShowAuth={() => setShowAuth(true)} drawerState={{ drawerOpen, setDrawerOpen }} pinState={pinState} cartCount={cart.itemCount || 0} onGoCart={() => nav.go("cart")} categories={categories} auth={auth}>
      <Toast msg={toast} onHide={() => setToast("")} />
      {reportOrder && <ReportIssueModal order={reportOrder} onClose={() => setReportOrder(null)} onSubmit={reportIssue} api={api} />}
      {reorderStockCheck && <ReorderStockModal stockCheck={reorderStockCheck} onClose={() => setReorderStockCheck(null)} onConfirm={confirmReorder} />}

      {auth?.role === "GUEST" && (
        <div style={{
          background: "linear-gradient(90deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 12,
          padding: "10px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}>
          <span style={{ color: "#a5b4fc", fontSize: 14 }}>
            &#x1F441; <strong>Browsing as Guest</strong> — Explore products freely. Sign in to shop, track orders and more.
          </span>
          <button
            style={{ padding: "6px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            onClick={() => setShowAuth(true)}
          >
            Sign In / Register
          </button>
        </div>
      )}

      {page === "home" && <HomePage products={products} categories={categories} onShop={() => setPage("products")}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); track("VIEW_PRODUCT", { productId: p.id, productName: p.name, category: p.category }); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading}
        recentlyViewedProducts={recentlyViewedProducts} api={api} />}

      {page === "search" && <SearchPage categories={categories} api={api}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); track("VIEW_PRODUCT", { productId: p.id, productName: p.name, category: p.category }); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading} />}

      {page === "products" && <ProductsPage products={products} categories={categories} search={search} selectedCat={selectedCat}
        onSearch={q => { setSearch(q); loadProducts(q, selectedCat); if (q.trim()) track("SEARCH", { query: q.trim() }); }}
        onCat={c => { setSelectedCat(c); loadProducts(search, c); }}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); track("VIEW_PRODUCT", { productId: p.id, productName: p.name, category: p.category }); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading} />}

      {page === "product" && (
        selectedProduct ? (
          <ProductDetailPage product={selectedProduct} onBack={() => setPage("products")}
            onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} api={api} cartLoading={cartLoading}
            onView={recordRecentlyViewed} auth={auth} allProducts={products} />
        ) : (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ color: "#6b7280" }}>Loading product details...</div>
          </div>
        )
      )}

      {page === "cart" && !addressPage && !paymentPage && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your cart">
          {!initialCartLoaded ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ color: "#6b7280" }}>Loading your cart...</div>
            </div>
          ) : (
            <CartPage cart={cart} onRemove={removeFromCart} onUpdateQty={updateCartQty}
              onApplyCoupon={applyCoupon} onRemoveCoupon={removeCoupon}
              onCheckout={() => { setCheckoutStep("address"); window.scrollTo(0, 0); }} profile={profile} />
          )}
        </GuestGate>
      )}

      {page === "cart" && addressPage && !paymentPage && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="checkout">
          {!profile ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ color: "#6b7280" }}>Loading your profile...</div>
            </div>
          ) : (
            <AddressStepPage
              profile={profile}
              api={api}
              onRefreshProfile={() => loadProfile()}
              onBack={() => { setCheckoutStep(""); window.scrollTo(0, 0); }}
              onContinue={(addrId) => { setSelectedAddressId(addrId); setCheckoutStep("payment"); window.scrollTo(0, 0); }}
              showToast={showToast}
              cart={cart}
            />
          )}
        </GuestGate>
      )}

      {page === "cart" && paymentPage && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="checkout">
          {!profile || !selectedAddressId ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ color: "#6b7280" }}>Loading payment details...</div>
            </div>
          ) : (
            <PaymentPage cart={cart} profile={profile} selectedAddressId={selectedAddressId} showToast={showToast}
              onPlaceOrder={placeOrder} onBack={() => { setCheckoutStep("address"); window.scrollTo(0, 0); }} />
          )}
        </GuestGate>
      )}

      {page === "success" && orderSuccess && <OrderSuccessPage order={orderSuccess}
        onTrack={() => { setPage("track"); setOrderSuccess(null); }}
        onHome={() => { setPage("home"); setOrderSuccess(null); }} />}

      {page === "orders" && !selectedOrder && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your orders">
          <OrdersPage orders={orders} onCancel={cancelOrder}
            onReorder={reorderItems} onReport={o => setReportOrder(o)}
            onRequestReplacement={requestReplacement}
            onDownloadInvoice={downloadInvoice}
            onTrack={o => { setSelectedOrder(o); setPage("track-single"); }} />
        </GuestGate>
      )}

      {page === "track" && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="order tracking">
          <TrackOrdersPage orders={orders} onSelectOrder={o => { setSelectedOrder(o); setPage("track-single"); }} />
        </GuestGate>
      )}

      {page === "track-single" && (
        selectedOrder ? (
          <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="order tracking">
            <TrackSingleOrderPage order={selectedOrder} onBack={() => { setPage("track"); setSelectedOrder(null); }} />
          </GuestGate>
        ) : (
          <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="order tracking">
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ color: "#6b7280" }}>Loading order details...</div>
            </div>
          </GuestGate>
        )
      )}

      {page === "wishlist" && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your wishlist">
          <WishlistPage wishlistIds={wishlistIds} products={products} onRemove={toggleWishlist}
            onAddToCart={addToCart} onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }} />
        </GuestGate>
      )}

      {page === "coupons" && <CouponsPage coupons={coupons} showToast={showToast} />}

      {page === "spending" && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="spending analytics">
          <SpendingPage data={spendingData} orders={orders} onLoadOrders={loadOrders} />
        </GuestGate>
      )}

          {page === "profile" && (
            <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your profile">
              <ProfilePage profile={profile} api={api}
                onUpdate={() => { loadProfile(); showToast("Profile updated!"); }} showToast={showToast} />
            </GuestGate>
          )}
          {page === "refunds" && (
            <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your refunds">
              <RefundReportPage api={api} onSelectOrder={o => { setSelectedOrder(o); setPage("track-single"); }} />
            </GuestGate>
          )}
          {page === 'vendor' && auth?.role === 'VENDOR' && (
            <VendorCsvUpload api={api} auth={auth} />
          )}
      </Layout>
      <AIAssistantWidget api={api} onNavigate={p => { setSelectedProduct(null); setSelectedOrder(null); setPaymentPage(false); setAddressPage(false); setTimeout(() => navigate(`/shop/${p}`), 0); }} showToast={showToast} />
      {showAuth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999 }} onClick={() => setShowAuth(false)}>
          <div onClick={e => e.stopPropagation()}>
            <AuthPage />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Home ── */
/* ── Banner Carousel ── */
function BannerCarousel({ banners }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgLoaded, setImgLoaded] = useState({});
  const [dragStart, setDragStart] = useState(null);
  const intervalRef = useRef(null);
  const INTERVAL_MS = 4500;

  // Auto-advance
  useEffect(() => {
    if (banners.length <= 1 || paused) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => setIdx(i => (i + 1) % banners.length), INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [banners.length, paused]);

  if (!banners || banners.length === 0) return null;

  const goTo = (i) => {
    clearInterval(intervalRef.current);
    setIdx(i);
  };
  const prev = () => goTo((idx - 1 + banners.length) % banners.length);
  const next = () => goTo((idx + 1) % banners.length);
  const b = banners[idx];

  // Touch / mouse drag to swipe
  const onDragStart = (e) => setDragStart(e.touches ? e.touches[0].clientX : e.clientX);
  const onDragEnd = (e) => {
    if (dragStart === null) return;
    const end = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const delta = dragStart - end;
    if (Math.abs(delta) > 50) delta > 0 ? next() : prev();
    setDragStart(null);
  };

  // Progress bar width
  const progress = paused ? 0 : 100;

  return (
    <div
      style={{ ...cs.carouselWrap, cursor: "grab", userSelect: "none" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
      onTouchStart={onDragStart}
      onTouchEnd={onDragEnd}
    >
      {/* Progress bar */}
      {banners.length > 1 && !paused && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 10, background: "rgba(255,255,255,0.15)" }}>
          <div
            key={idx}
            style={{
              height: "100%", background: "linear-gradient(90deg, #6366f1, #a5b4fc)",
              animation: `ekart-progress ${INTERVAL_MS}ms linear`,
              width: "100%", transformOrigin: "left",
            }}
          />
        </div>
      )}

      {/* Slide — crossfade transition */}
      <a
        href={b.linkUrl || undefined}
        target={b.linkUrl ? "_blank" : undefined}
        rel="noopener noreferrer"
        style={{ display: "block", textDecoration: "none", position: "relative" }}
        onClick={e => dragStart !== null && Math.abs(dragStart) > 5 && e.preventDefault()}
      >
        {/* Skeleton placeholder while image loads */}
        {!imgLoaded[b.id] && (
          <div style={{
            ...cs.carouselImg,
            background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
            backgroundSize: "200% 100%",
            animation: "ekart-shimmer 1.5s infinite",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 40, opacity: 0.3 }}>🖼️</span>
          </div>
        )}
        <img
          key={b.id}
          src={b.imageUrl}
          alt={b.title || "Banner"}
          style={{
            ...cs.carouselImg,
            opacity: imgLoaded[b.id] ? 1 : 0,
            transition: "opacity 0.4s ease",
            display: imgLoaded[b.id] === false ? "none" : "block",
          }}
          onLoad={() => setImgLoaded(m => ({ ...m, [b.id]: true }))}
          onError={() => setImgLoaded(m => ({ ...m, [b.id]: false }))}
          draggable={false}
        />
        {/* Caption overlay with gradient */}
        {b.title && imgLoaded[b.id] && (
          <div style={cs.carouselCaption}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{b.title}</div>
            {b.linkUrl && (
              <div style={{ fontSize: 12, opacity: 0.8, display: "flex", alignItems: "center", gap: 4 }}>
                Shop now →
              </div>
            )}
          </div>
        )}
      </a>

      {/* Prev / Next arrows */}
      {banners.length > 1 && (
        <>
          <button
            style={{ ...cs.carouselArrow, left: 14, opacity: paused ? 1 : 0.7, transition: "opacity 0.2s" }}
            onClick={e => { e.preventDefault(); prev(); }}
            aria-label="Previous slide"
          >‹</button>
          <button
            style={{ ...cs.carouselArrow, right: 14, opacity: paused ? 1 : 0.7, transition: "opacity 0.2s" }}
            onClick={e => { e.preventDefault(); next(); }}
            aria-label="Next slide"
          >›</button>

          {/* Dot + counter row */}
          <div style={{ ...cs.carouselDots, gap: 8, alignItems: "center" }}>
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  ...cs.carouselDot,
                  ...(i === idx ? { ...cs.carouselDotActive, width: 24, borderRadius: 4 } : {}),
                  transition: "all 0.25s ease",
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
              {idx + 1}/{banners.length}
            </span>
          </div>
        </>
      )}

      {/* Keyframe CSS */}
      <style>{`
        @keyframes ekart-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes ekart-shimmer  { 0%,100% { background-position: 200% 0; } 50% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}

function HomePage({ products, categories, onShop, onSelectProduct, onAddToCart, onToggleWishlist, wishlistIds, cartLoading, recentlyViewedProducts, api }) {
  const { auth } = useAuth();
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  useEffect(() => {
    setBannersLoading(true);
    // Use apiFetch so auth headers are included; path is relative to /api/react/
    const path = auth ? "/banners" : "/home-banners";
    // For guests api may be null — fall back to raw fetch against /api/react/
    const fetcher = api
      ? api(path)
      : fetch(`/api/react${path}`).then(r => r.json());
    fetcher
      .then(d => { if (d && d.success && Array.isArray(d.banners)) setBanners(d.banners); })
      .catch(() => {})
      .finally(() => setBannersLoading(false));
  }, [auth?.id]);   // re-fetch when login state changes (guest → customer)

  return (
    <div>
      {/* ── Banner carousel ── */}
      {bannersLoading && (
        <div style={{
          ...cs.carouselWrap,
          height: 360,
          background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)",
          backgroundSize: "200% 100%",
          animation: "ekart-shimmer 1.5s infinite",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 40, opacity: 0.2 }}>🖼️</span>
        </div>
      )}
      {!bannersLoading && banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* ── Static hero — always shown below carousel (or alone if no banners) ── */}
      {!bannersLoading && banners.length === 0 && (
        <div style={cs.hero}>
          <div>
            <h1 style={cs.heroTitle}>Shop Everything<br /><span style={cs.heroAccent}>You Love</span></h1>
            <p style={cs.heroSub}>Discover thousands of products from trusted vendors across India</p>
            <button style={cs.heroCta} onClick={onShop}>Explore Products →</button>
          </div>
          <div style={cs.heroIllus}>🛍️</div>
        </div>
      )}
      {!bannersLoading && banners.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32, marginTop: -8 }}>
          <button style={cs.heroCta} onClick={onShop}>Explore Products →</button>
        </div>
      )}
      {recentlyViewedProducts && recentlyViewedProducts.length > 0 && (
        <section style={cs.section}>
          <h2 style={cs.secTitle}>Recently Viewed</h2>
          <div style={cs.productGrid}>
            {recentlyViewedProducts.map(p => (
              <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
                onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
                isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
            ))}
          </div>
        </section>
      )}
      {categories.length > 0 && (
        <section style={cs.section}>
          <h2 style={cs.secTitle}>Browse Categories</h2>
          <div style={cs.catGrid}>
            {categories.slice(0, 8).map((c, i) => {
              const name  = typeof c === "string" ? c : c.name;
              const emoji = getCatEmoji(c);
              return (
                <div key={i} style={cs.catCard} onClick={onShop}>
                  <span style={cs.catIcon}>{emoji}</span>
                  <span style={cs.catLabel}>{name}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <section style={cs.section}>
        <h2 style={cs.secTitle}>Featured Products</h2>
        <div style={cs.productGrid}>
          {products.slice(0, 8).map(p => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
              onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
              isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Search Page ── */
/* ── Highlight matching text in suggestion names ── */
function HighlightMatch({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span style={{ color: "#a5b4fc", fontWeight: 800 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
}

function SearchPage({ categories, api, onSelectProduct, onAddToCart, onToggleWishlist, wishlistIds, cartLoading }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggLoading, setSuggLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [fuzzySuggestion, setFuzzySuggestion] = useState("");
  const [fuzzyResults, setFuzzyResults] = useState([]);
  const [fuzzyLoading, setFuzzyLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const doSearch = async (overrideQuery, { isFuzzyRetry = false } = {}) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveIdx(-1);
    setLoading(true);
    setSearched(true);
    if (!isFuzzyRetry) setFuzzySuggestion("");
    setFuzzyLoading(false);

    const params = [];
    if (q) params.push(`search=${encodeURIComponent(q)}`);
    if (cat) params.push(`category=${encodeURIComponent(cat)}`);
    if (minPrice) params.push(`minPrice=${minPrice}`);
    if (maxPrice) params.push(`maxPrice=${maxPrice}`);
    const path = "/products" + (params.length ? "?" + params.join("&") : "");
    const d = await api(path);
    const found = d.success ? (d.products || []) : [];
    setResults(found);
    setLoading(false);

    // Zero results + has a query → call fuzzy endpoint for spelling correction
    if (found.length === 0 && q && q.trim().length >= 2 && !isFuzzyRetry) {
      setFuzzyLoading(true);
      try {
        const res = await fetch(`/api/search/fuzzy?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        const suggestion = data?.suggestion?.trim();
        if (suggestion && suggestion.length > 0) {
          setFuzzySuggestion(suggestion);
          // Auto-run the corrected search silently in the background
          const correctedParams = [`search=${encodeURIComponent(suggestion)}`];
          if (cat) correctedParams.push(`category=${encodeURIComponent(cat)}`);
          if (minPrice) correctedParams.push(`minPrice=${minPrice}`);
          if (maxPrice) correctedParams.push(`maxPrice=${maxPrice}`);
          const correctedPath = "/products?" + correctedParams.join("&");
          const cd = await api(correctedPath);
          const correctedFound = cd.success ? (cd.products || []) : [];
          setFuzzyResults(correctedFound);
        }
      } catch (e) { /* ignore */ } finally {
        setFuzzyLoading(false);
      }
    }
  };

  // User explicitly clicks "Did you mean X?" — swap to corrected query + results
  const applyFuzzySuggestion = () => {
    setQuery(fuzzySuggestion);
    setResults(fuzzyResults);
    setFuzzySuggestion("");
    setFuzzyResults([]);
    setFuzzyLoading(false);
  };

  // Fetch autocomplete suggestions (debounced 220ms)
  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setSuggestions([]); setShowSuggestions(false); setSuggLoading(false); setActiveIdx(-1); return;
    }
    setSuggLoading(true);
    let active = true;
    const t = setTimeout(async () => {
      try {
        const q = encodeURIComponent(query.trim());
        const res = await fetch(`/api/search/suggestions?q=${q}`);
        const data = await res.json();
        if (!active) return;
        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data.slice(0, 8));
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (e) {
        setSuggestions([]); setShowSuggestions(false);
      } finally {
        if (active) setSuggLoading(false);
      }
    }, 220);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const handle = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const chooseSuggestion = (s) => {
    const name = s.productName || "";
    setQuery(name);
    setShowSuggestions(false);
    setActiveIdx(-1);
    setTimeout(() => doSearch(name), 10);
  };

  // Keyboard navigation: up/down arrows + Enter + Escape
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") doSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        chooseSuggestion(suggestions[activeIdx]);
      } else {
        doSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIdx(-1);
    }
  };



  return (
    <div>
      <h2 style={cs.pageTitle}>Search Products 🔍</h2>
      <div style={cs.searchBox}>
        <div ref={wrapperRef} style={{ position: "relative", flex: 2 }}>
          <input
            ref={inputRef}
            style={{ ...cs.searchInput, width: "100%", paddingRight: suggLoading ? 36 : undefined }}
            placeholder="Search products, brands..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            autoComplete="off"
          />
          {/* Loading spinner inside input */}
          {suggLoading && (
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <div style={{
                width: 16, height: 16, border: "2px solid rgba(99,102,241,0.3)",
                borderTopColor: "#6366f1", borderRadius: "50%",
                animation: "ekart-spin 0.7s linear infinite"
              }} />
            </div>
          )}
          {/* Suggestion dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ ...cs.suggestionBox, maxHeight: 360, overflowY: "auto" }}>
              <div style={{ padding: "6px 12px 4px", fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Suggestions
              </div>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  style={{
                    ...cs.suggestionItem,
                    background: i === activeIdx ? "rgba(99,102,241,0.15)" : "transparent",
                    borderLeft: i === activeIdx ? "3px solid #6366f1" : "3px solid transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseDown={(e) => { e.preventDefault(); chooseSuggestion(s); }}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  {s.imageLink ? (
                    <img
                      src={s.imageLink}
                      alt=""
                      style={cs.suggestionImg}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div style={{ ...cs.suggestionImg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: "rgba(99,102,241,0.1)" }}>
                      🛍️
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#e5e7eb", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <HighlightMatch text={s.productName} query={query} />
                    </div>
                    <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginTop: 2, textTransform: "uppercase" }}>
                      {s.category}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#4b5563", flexShrink: 0 }}>🔍</div>
                </div>
              ))}
              <div
                style={{ padding: "8px 14px", fontSize: 12, color: "#6366f1", cursor: "pointer", fontWeight: 600, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}
                onMouseDown={(e) => { e.preventDefault(); setShowSuggestions(false); doSearch(); }}
              >
                <span>🔍</span> Search for &ldquo;{query}&rdquo;
              </div>
            </div>
          )}
        </div>
        <select style={cs.select} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All Categories</option>
          {flattenCatsForSelect(categories).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input style={{ ...cs.searchInput, width: 100 }} placeholder="Min ₹" type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
        <input style={{ ...cs.searchInput, width: 100 }} placeholder="Max ₹" type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        <button style={cs.searchBtn} onClick={() => doSearch()} disabled={loading}>{loading ? "..." : "Search"}</button>
      </div>
      {/* CSS keyframe for spinner */}
      <style>{`@keyframes ekart-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
      {searched && <p style={cs.resultCount}>{results.length} result{results.length !== 1 ? "s" : ""} found</p>}
      {results.length > 0 && (
        <div style={cs.productGrid}>
          {results.map(p => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
              onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
              isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
          ))}
        </div>
      )}
      {/* Zero-results state — with fuzzy "Did you mean" + preview */}
      {searched && results.length === 0 && !loading && (
        <div>
          <div style={{ ...cs.empty, paddingBottom: 8 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#e5e7eb", marginBottom: 6 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>Try different keywords, check spelling, or browse categories</div>
          </div>

          {/* Fuzzy loading state */}
          {fuzzyLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 0", color: "#9ca3af", fontSize: 14 }}>
              <div style={{ width: 16, height: 16, border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "ekart-spin 0.7s linear infinite" }} />
              Looking for spelling corrections…
            </div>
          )}

          {/* "Did you mean" prompt + corrected results preview */}
          {fuzzySuggestion && !fuzzyLoading && (
            <div style={{ marginTop: 8 }}>
              {/* Prompt banner */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                background: "linear-gradient(90deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))",
                border: "1px solid rgba(99,102,241,0.3)", borderRadius: 14,
                padding: "14px 20px", marginBottom: fuzzyResults.length > 0 ? 20 : 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>💡</span>
                  <div>
                    <span style={{ fontSize: 14, color: "#9ca3af" }}>Did you mean: </span>
                    <button
                      onClick={applyFuzzySuggestion}
                      style={{
                        background: "none", border: "none", color: "#a5b4fc",
                        fontWeight: 800, fontSize: 16, cursor: "pointer",
                        textDecoration: "underline", textUnderlineOffset: 3, padding: 0,
                      }}
                    >
                      {fuzzySuggestion}
                    </button>
                    <span style={{ fontSize: 14, color: "#9ca3af" }}>?</span>
                  </div>
                </div>
                <button
                  onClick={applyFuzzySuggestion}
                  style={{
                    padding: "8px 20px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Search &ldquo;{fuzzySuggestion}&rdquo;
                </button>
              </div>

              {/* Corrected-results preview grid */}
              {fuzzyResults.length > 0 && (
                <div>
                  <p style={{ ...cs.resultCount, marginBottom: 14 }}>
                    Showing {fuzzyResults.length} result{fuzzyResults.length !== 1 ? "s" : ""} for &ldquo;{fuzzySuggestion}&rdquo;
                  </p>
                  <div style={cs.productGrid}>
                    {fuzzyResults.map(p => (
                      <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
                        onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
                        isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 0", color: "#6b7280", fontSize: 15 }}>
          <div style={{ width: 20, height: 20, border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "ekart-spin 0.7s linear infinite" }} />
          Searching…
        </div>
      )}
      {!searched && !loading && <div style={cs.empty}>Start typing to search 🔍</div>}
    </div>
  );
}

/* ── Products Page ── */
function ProductsPage({ products, categories, search, selectedCat, onSearch, onCat, onSelectProduct, onAddToCart, onToggleWishlist, wishlistIds, cartLoading }) {
  const [q, setQ] = useState(search);
  const [fuzzySuggestion, setFuzzySuggestion] = useState("");
  const [fuzzyResults, setFuzzyResults] = useState([]);
  const [fuzzyLoading, setFuzzyLoading] = useState(false);
  const [budgetMax, setBudgetMax] = useState(Infinity);
  const [sortType, setSortType] = useState("default");
  const [navQuery, setNavQuery] = useState("");
  const prevSearchRef = useRef("");

  // Listen for nav autocomplete search events
  useEffect(() => {
    const h = e => { const query = e.detail?.query || ""; setNavQuery(query); setQ(query); onSearch(query); };
    window.addEventListener("ekart-nav-search", h);
    return () => window.removeEventListener("ekart-nav-search", h);
  }, []);

  // Listen for sidebar category drill-down clicks
  useEffect(() => {
    const h = e => {
      const cat = e.detail?.cat || "";
      setSelectedCat(cat);
      onCat(cat);
      setQ(""); setNavQuery("");
    };
    window.addEventListener("ekart-nav-cat", h);
    return () => window.removeEventListener("ekart-nav-cat", h);
  }, [onCat]);

  // When products array changes to empty after a search, trigger fuzzy lookup
  useEffect(() => {
    const activeQuery = search || q;
    if (products.length === 0 && activeQuery && activeQuery.trim().length >= 2 && activeQuery !== prevSearchRef.current) {
      prevSearchRef.current = activeQuery;
      setFuzzySuggestion("");
      setFuzzyResults([]);
      setFuzzyLoading(true);
      fetch(`/api/search/fuzzy?q=${encodeURIComponent(activeQuery.trim())}`)
        .then(r => r.json())
        .then(async data => {
          const suggestion = data?.suggestion?.trim();
          if (suggestion && suggestion.length > 0) {
            setFuzzySuggestion(suggestion);
            const res = await fetch(`/api/products?search=${encodeURIComponent(suggestion)}`);
            const d = await res.json();
            setFuzzyResults(d.success ? (d.products || []) : []);
          }
        })
        .catch(() => {})
        .finally(() => setFuzzyLoading(false));
    } else if (products.length > 0) {
      prevSearchRef.current = "";
      setFuzzySuggestion("");
      setFuzzyResults([]);
      setFuzzyLoading(false);
    }
  }, [products, search]);

  const applyFuzzy = () => {
    setQ(fuzzySuggestion);
    onSearch(fuzzySuggestion);
    setFuzzySuggestion("");
    setFuzzyResults([]);
  };

  const effectiveQuery = navQuery || q || search || "";

  // Client-side sort + budget filter
  const displayProducts = (products.length > 0 ? products : fuzzyResults.length > 0 ? fuzzyResults : [])
    .filter(p => budgetMax === Infinity || parseFloat(p.price || 0) <= budgetMax)
    .sort((a, b) => {
      if (sortType === "price-asc")  return parseFloat(a.price||0) - parseFloat(b.price||0);
      if (sortType === "price-desc") return parseFloat(b.price||0) - parseFloat(a.price||0);
      if (sortType === "rating")     return parseFloat(b.averageRating||0) - parseFloat(a.averageRating||0);
      if (sortType === "name")       return (a.name||"").localeCompare(b.name||"");
      if (sortType === "newest")     return (b.id||0) - (a.id||0);
      return 0;
    });

  return (
    <div>
      <h2 style={cs.pageTitle}>All Products</h2>
      <div style={cs.filterRow}>
        <input style={cs.searchInput} placeholder="Search products..." value={q}
          onChange={e => { setQ(e.target.value); setNavQuery(""); setFuzzySuggestion(""); setFuzzyResults([]); }}
          onKeyDown={e => e.key === "Enter" && onSearch(q)} />
        <button style={cs.searchBtn} onClick={() => onSearch(q)}>Search</button>
        <select style={cs.select} value={selectedCat} onChange={e => onCat(e.target.value)}>
          <option value="">All Categories</option>
          {flattenCatsForSelect(categories).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <SearchResultsBanner query={effectiveQuery} count={displayProducts.length}
        onClear={() => { setQ(""); setNavQuery(""); onSearch(""); }} />
      <BudgetBar products={products} onBudgetChange={v => setBudgetMax(v)} />
      <SortBar count={displayProducts.length} sortType={sortType} onSort={setSortType} />

      {displayProducts.length > 0 && (
        <div style={cs.productGrid}>
          {displayProducts.map(p => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
              onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
              isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
          ))}
        </div>
      )}

      {displayProducts.length === 0 && !fuzzyLoading && !fuzzySuggestion && (
        <div style={cs.empty}>No products found 😕</div>
      )}

      {/* Fuzzy loading spinner */}
      {products.length === 0 && fuzzyLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 0", color: "#9ca3af", fontSize: 14 }}>
          <div style={{ width: 16, height: 16, border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "ekart-spin 0.7s linear infinite" }} />
          Looking for spelling corrections…
        </div>
      )}

      {/* "Did you mean" banner */}
      {products.length === 0 && fuzzySuggestion && !fuzzyLoading && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, background:"linear-gradient(90deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))", border:"1px solid rgba(99,102,241,0.3)", borderRadius:14, padding:"14px 20px", marginBottom: fuzzyResults.length > 0 ? 20 : 0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>💡</span>
              <div>
                <span style={{ fontSize:14, color:"#9ca3af" }}>Did you mean: </span>
                <button onClick={applyFuzzy} style={{ background:"none", border:"none", color:"#a5b4fc", fontWeight:800, fontSize:16, cursor:"pointer", textDecoration:"underline", textUnderlineOffset:3, padding:0 }}>{fuzzySuggestion}</button>
                <span style={{ fontSize:14, color:"#9ca3af" }}>?</span>
              </div>
            </div>
            <button onClick={applyFuzzy} style={{ padding:"8px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Search &ldquo;{fuzzySuggestion}&rdquo;
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes ekart-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}



/* ── Product Card ── */
function ProductCard({ product: p, onSelect, onAddToCart, onToggleWishlist, isWishlisted, loading }) {
  const discount = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  return (
    <div style={cs.productCard}>
      <div style={cs.productImgWrap} onClick={() => onSelect(p)}>
        {p.imageLink ? <img src={p.imageLink} alt={p.name} style={cs.productImg} onError={e => e.target.style.display = "none"} />
          : <div style={cs.productImgPlaceholder}>🛍️</div>}
        {discount > 0 && <div style={cs.discountBadge}>{discount}% OFF</div>}
        <button style={{ ...cs.wishBtn, color: isWishlisted ? "#dc2626" : "#9ca3af" }}
          onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}>{isWishlisted ? "❤️" : "🤍"}</button>
      </div>
      <div style={cs.productInfo}>
        <div style={cs.productName} onClick={() => onSelect(p)}>{p.name}</div>
        <div style={cs.productCat}>{p.category}</div>
        <div style={cs.priceRow}>
          <span style={cs.price}>{fmt(p.price)}</span>
          {discount > 0 && <span style={cs.mrp}>{fmt(p.mrp)}</span>}
        </div>
        {p.averageRating > 0 && <div style={cs.ratingRow}><span style={cs.stars}>{stars(Math.round(p.averageRating))}</span><span style={cs.ratingNum}>{p.averageRating?.toFixed(1)}</span></div>}
        <div style={cs.stockBadge(p.stock)}>{p.stock > 0 ? `In Stock (${p.stock})` : "Out of Stock"}</div>
        <button style={{ ...cs.addCartBtn, opacity: p.stock <= 0 || loading ? 0.5 : 1 }}
          disabled={p.stock <= 0 || loading} onClick={() => onAddToCart(p.id)}>
          {loading ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

/* ── Product Detail ── */
/* ── Product Detail ── */
function ProductDetailPage({ product: p, onBack, onAddToCart, onToggleWishlist, wishlistIds, api, cartLoading, onView, auth, allProducts }) {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  // review image upload state
  const [reviewId, setReviewId]         = useState(null);
  const [reviewFiles, setReviewFiles]   = useState([]);
  const [reviewPreviews, setReviewPreviews] = useState([]);
  const [reviewUploading, setReviewUploading] = useState(false);
  const [reviewUploadMsg, setReviewUploadMsg] = useState("");
  const [reviewUploadedCount, setReviewUploadedCount] = useState(0);
  const reviewFileRef = useRef(null);
  const [subscribed, setSubscribed] = useState(false);

  // --- NEW STATE ---
  const [heroImg, setHeroImg]         = useState(p.imageLink);
  const [activeThumb, setActiveThumb] = useState(0);
  const [qty, setQty]                 = useState(1);
  const [pinCode, setPinCode]         = useState(() => localStorage.getItem("ekart_delivery_pin") || "");
  const [pinResult, setPinResult]     = useState(null); // null | {ok, msg}
  const [pinChecking, setPinChecking] = useState(false);
  const [shareOpen, setShareOpen]     = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [reviewPhotos, setReviewPhotos] = useState({}); // reviewId → [{imageUrl}]
  const [expCountdown, setExpCountdown] = useState("");
  const countdownRef = useRef(null);

  const isWishlisted = wishlistIds.includes(p.id);
  const discount = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const maxQty = p.stock > 10 ? 10 : p.stock;

  // Similar products: same category, exclude self, max 6
  const similar = (allProducts || [])
    .filter(x => x.category === p.category && x.id !== p.id)
    .slice(0, 6);

  // Extra images array (handle both formats)
  const extraImages = Array.isArray(p.extraImageList)
    ? p.extraImageList
    : (p.extraImages || []);
  const allThumbs = [p.imageLink, ...extraImages].filter(Boolean);

  // Delivery date helpers
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function fmtDate(d) { return DAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()]; }
  function addBizDays(from, n) {
    let d = new Date(from), added = 0;
    while (added < n) { d.setDate(d.getDate() + 1); const day = d.getDay(); if (day !== 0 && day !== 6) added++; }
    return d;
  }
  const now = new Date();
  const cutoff = new Date(now); cutoff.setHours(14, 0, 0, 0);
  const stdDate = fmtDate(addBizDays(now, 5));
  const expDate = fmtDate(addBizDays(now, now < cutoff ? 1 : 2));

  // Countdown timer for express cutoff
  useEffect(() => {
    function tick() {
      const n = new Date(), c = new Date(n); c.setHours(14,0,0,0);
      if (n >= c) { setExpCountdown("tomorrow"); return; }
      const diff = c - n;
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
      setExpCountdown(`${h}h ${m}m`);
    }
    tick();
    countdownRef.current = setInterval(tick, 30000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // Auto-check saved pincode
  useEffect(() => {
    if (pinCode && /^\d{6}$/.test(pinCode)) checkPin(pinCode);
  }, []);

  useEffect(() => {
    api(`/products/${p.id}/reviews`).then(d => {
      if (d.success) {
        const revs = d.reviews || [];
        setReviews(revs);
        // Lazy-load photos for each review
        revs.forEach(r => {
          if (!r.id) return;
          fetch(`/customer/review/${r.id}/images`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.count > 0)
                setReviewPhotos(prev => ({ ...prev, [r.id]: data.images }));
            })
            .catch(() => {});
        });
      }
    });
  }, [p.id]);

  useEffect(() => { if (onView) onView(p.id); }, [p.id]);

  useEffect(() => {
    if (!p || p.stock > 0) return;
    const check = async () => {
      try {
        const headers = {};
        if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
        else if (auth) headers["X-Customer-Id"] = auth.id;
        const res = await fetch(`/api/notify-me/${p.id}`, { headers });
        const d = await res.json();
        setSubscribed(!!d.subscribed);
      } catch (e) { setSubscribed(false); }
    };
    check();
  }, [p.id, p.stock]);

  // Reset state when product changes
  useEffect(() => {
    setHeroImg(p.imageLink);
    setActiveThumb(0);
    setQty(1);
    setPinResult(null);
    setReviewId(null);
    setReviewFiles([]); setReviewPreviews([]); setReviewUploadMsg(""); setReviewUploadedCount(0);
  }, [p.id]);

  const subscribeNotify = async () => {
    try {
      const headers = { "Content-Type": "application/json" };
      if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
      else if (auth) headers["X-Customer-Id"] = auth.id;
      const res = await fetch(`/api/notify-me/${p.id}`, { method: "POST", headers });
      const d = await res.json();
      if (d.success) setSubscribed(!!d.subscribed);
      setToast(d.message || (d.subscribed ? "Subscribed!" : "Please sign in"));
    } catch (e) { setToast("Failed to subscribe"); }
  };

  const unsubscribeNotify = async () => {
    try {
      const headers = {};
      if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
      else if (auth) headers["X-Customer-Id"] = auth.id;
      const res = await fetch(`/api/notify-me/${p.id}`, { method: "DELETE", headers });
      const d = await res.json();
      setSubscribed(!!d.subscribed);
      setToast(d.message || "Unsubscribed");
    } catch (e) { setToast("Failed to unsubscribe"); }
  };

  const submitReview = async () => {
    setSubmitting(true);
    const d = await api("/reviews/add", { method: "POST", body: JSON.stringify({ productId: p.id, rating: newReview.rating, comment: newReview.comment }) });
    if (d.success) {
      setToast("Review submitted! You can now add photos below.");
      setReviewId(d.reviewId ?? null);
      setReviewUploadedCount(0);
      setReviewFiles([]); setReviewPreviews([]); setReviewUploadMsg("");
      if (reviewFileRef.current) reviewFileRef.current.value = "";
      api(`/products/${p.id}/reviews`).then(r => { if (r.success) setReviews(r.reviews || []); });
      setNewReview({ rating: 5, comment: "" });
    } else setToast(d.message || "Failed");
    setSubmitting(false);
  };

  const onReviewFilesChange = (e) => {
    const slotsLeft = 5 - reviewUploadedCount;
    const picked = Array.from(e.target.files).slice(0, slotsLeft);
    setReviewFiles(picked);
    setReviewPreviews(picked.map(f => URL.createObjectURL(f)));
    setReviewUploadMsg("");
  };

  const doReviewUpload = async () => {
    if (!reviewFiles.length || !reviewId) return;
    setReviewUploading(true); setReviewUploadMsg("");
    try {
      const form = new FormData();
      reviewFiles.forEach(f => form.append("images", f));
      const d = await api(`/reviews/${reviewId}/upload-image`, { method: "POST", body: form, headers: {} });
      if (d.success) {
        setReviewUploadMsg(`✓ ${d.uploaded} photo${d.uploaded !== 1 ? "s" : ""} added`);
        setReviewUploadedCount(c => c + d.uploaded);
        setReviewFiles([]); setReviewPreviews([]);
        if (reviewFileRef.current) reviewFileRef.current.value = "";
        api(`/products/${p.id}/reviews`).then(r => { if (r.success) setReviews(r.reviews || []); });
      } else {
        setReviewUploadMsg(`✗ ${d.message || "Upload failed"}`);
      }
    } catch { setReviewUploadMsg("✗ Upload failed — please try again"); }
    setReviewUploading(false);
  };

  // Pin check
  const checkPin = async (pin) => {
    const v = pin || pinCode;
    if (!/^\d{6}$/.test(v)) { setPinResult({ ok: false, msg: "Enter a valid 6-digit pin code" }); return; }
    setPinChecking(true); setPinResult(null);
    try {
      const r = await fetch(`/api/check-pincode?pinCode=${v}`);
      const d = await r.json();
      setPinResult({ ok: d.success, msg: d.success ? `✓ Delivery available to ${v}` : (d.message || "Not serviceable yet") });
      if (d.success) localStorage.setItem("ekart_delivery_pin", v);
    } catch {
      setPinResult({ ok: true, msg: `✓ Delivery available` });
    }
    setPinChecking(false);
  };

  // Share
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareMsg = encodeURIComponent(`Check out this product on Ekart: ${p.name} ${shareUrl}`);

  const copyLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); });
    else {
      const ta = document.createElement("textarea"); ta.value = shareUrl;
      ta.style.cssText = "position:fixed;top:-9999px;opacity:0;"; document.body.appendChild(ta);
      ta.focus(); ta.select(); try { document.execCommand("copy"); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); } catch(e){}
      document.body.removeChild(ta);
    }
  };

  // Cart add with qty
  const handleAddToCart = () => {
    // The existing onAddToCart only takes productId; we call the web endpoint directly for qty support
    const productId = p.id;
    const quantity = qty;
    const headers = { "Content-Type": "application/json" };
    if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
    else if (auth) headers["X-Customer-Id"] = auth.id;
    fetch("/api/cart/add-web", { method: "POST", headers, body: JSON.stringify({ productId, quantity }) })
      .then(r => r.json())
      .then(d => {
        if (d.success) setToast(d.message || `Added ${quantity} to cart!`);
        else if (d.redirect) window.location.href = d.redirect;
        else onAddToCart(p.id); // fallback to parent handler
      })
      .catch(() => onAddToCart(p.id));
  };

  // ─── Styles (dark glass theme matching HTML) ────────────────────────────────
  const Y = "#f5a800";
  const s = {
    page: { padding: "0 0 3rem" },
    breadcrumb: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, padding: "7px 18px", marginBottom: 28, width: "fit-content", flexWrap: "wrap" },
    bcSep: { opacity: 0.4, fontSize: 9 },
    bcLink: { color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: 0, display: "flex", alignItems: "center", gap: 5 },
    bcCurrent: { color: "rgba(255,255,255,0.85)", fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 },
    gridMobile: { gridTemplateColumns: "1fr" },

    // Media
    mainImgWrap: { position: "relative", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.3)", aspectRatio: "4/3" },
    mainImg: { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s", display: "block" },
    catBadge: { position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: Y, fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.07em" },
    thumbRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
    thumb: (active) => ({ width: 68, height: 68, borderRadius: 10, cursor: "pointer", border: active ? `2px solid ${Y}` : "2px solid transparent", objectFit: "cover", transition: "all 0.2s", transform: active ? "scale(1.06)" : "scale(1)", background: "rgba(0,0,0,0.3)" }),
    videoWrap: { borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.4)", marginTop: 10 },

    // Info col
    infoCol: { display: "flex", flexDirection: "column", gap: 14 },
    title: { fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1.25, margin: 0 },
    titleSpan: { color: Y },
    vendorBadge: { display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, padding: "5px 14px", fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8 },

    infoRow: { display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px" },
    infoRowIcon: { color: Y, fontSize: 14, marginTop: 2, flexShrink: 0 },
    infoRowLabel: { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 },
    infoRowValue: { fontSize: 14, fontWeight: 500, color: "#fff", lineHeight: 1.55 },

    priceBlock: { background: "linear-gradient(135deg,rgba(245,168,0,0.12),rgba(245,168,0,0.04))", border: "1px solid rgba(245,168,0,0.3)", borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
    priceBig: { fontSize: 36, fontWeight: 800, color: Y, lineHeight: 1 },
    mrpLine: { marginTop: 5, fontSize: 13, color: "rgba(255,255,255,0.45)" },
    saveBadge: { background: "rgba(220,38,38,0.18)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.35)", fontSize: 13, fontWeight: 800, padding: "3px 10px", borderRadius: 8, marginRight: 8 },
    stockIn:  { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(22,163,74,0.15)",  border: "1px solid rgba(22,163,74,0.35)",  color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 50 },
    stockLow: { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(245,168,0,0.15)", border: "1px solid rgba(245,168,0,0.35)", color: Y, fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 50 },
    stockOut: { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(220,38,38,0.12)",  border: "1px solid rgba(220,38,38,0.3)",   color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 50 },

    // Qty selector
    qtyWrap: { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "12px 16px" },
    qtyLabel: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.45)", flexShrink: 0 },
    qtyControls: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" },
    qtyBtn: (disabled) => ({ width: 38, height: 38, border: "none", background: "transparent", color: disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.8)", fontSize: 18, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }),
    qtyInput: { width: 44, textAlign: "center", background: "transparent", border: "none", borderLeft: "1px solid rgba(255,255,255,0.12)", borderRight: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 15, fontWeight: 700, height: 38, outline: "none" },
    qtyInfo: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: "auto" },

    // Delivery box
    deliveryBox: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 },
    deliveryHeader: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 6 },
    deliveryOptions: { display: "flex", gap: 8, flexWrap: "wrap" },
    deliveryOpt: (express) => ({ flex: 1, minWidth: 120, background: "rgba(255,255,255,0.04)", border: express ? "2px solid rgba(34,197,94,0.3)" : "2px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", display: "flex", flexDirection: "column", gap: 3 }),
    deliveryOptLabel: (express) => ({ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: express ? "#16a34a" : "rgba(255,255,255,0.45)" }),
    deliveryOptDate: { fontSize: 14, fontWeight: 700, color: "#fff" },
    deliveryOptPrice: (express) => ({ fontSize: 11, color: express ? "#4ade80" : "rgba(255,255,255,0.4)" }),
    pinRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 2 },
    pinInput: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 12, padding: "6px 10px", width: 120, outline: "none", letterSpacing: "0.05em" },
    pinBtn: { background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: Y, fontSize: 11, fontWeight: 600, padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap" },
    pinResult: (ok) => ({ fontSize: 11, color: ok ? "#16a34a" : "#dc2626", marginLeft: 4 }),

    // Action row
    actionRow: { display: "flex", gap: 10 },
    addCartBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: Y, color: "#1a1000", border: "none", borderRadius: 14, padding: "14px 24px", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.3s", boxShadow: "0 8px 28px rgba(245,168,0,0.3)" },
    wishBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626", borderRadius: 14, padding: "14px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.25s", flexShrink: 0 },
    shareBtn: { display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.35)", color: "#60a5fa", borderRadius: 14, width: 52, height: 52, fontSize: 16, cursor: "pointer", transition: "all 0.25s", flexShrink: 0 },
    notifyBtn: (subscribed) => ({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: subscribed ? "rgba(34,197,94,0.12)" : "rgba(99,102,241,0.12)", border: subscribed ? "1.5px solid rgba(34,197,94,0.45)" : "1.5px solid rgba(99,102,241,0.45)", color: subscribed ? "#4ade80" : "#a5b4fc", borderRadius: 14, padding: "14px 24px", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.25s" }),

    // Section title
    secTitle: { fontSize: 18, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 16 },
    secIcon: { color: Y },

    // Reviews
    reviewsGrid: { display: "flex", flexDirection: "column", gap: 10 },
    reviewCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 18px", borderLeft: `3px solid ${Y}` },
    reviewTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
    reviewAuthor: { fontSize: 13, fontWeight: 700, color: "#fff" },
    reviewStars: { color: Y, fontSize: 11 },
    reviewText: { fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 },
    photoStrip: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
    photoThumb: { width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", transition: "all 0.2s" },

    // Review form
    reviewFormWrap: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "18px", marginTop: 12 },
    reviewFormTitle: { fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
    reviewForm: { display: "flex", gap: 8, flexWrap: "wrap" },
    reviewSelect: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, color: "#fff", fontSize: 12, padding: "8px 10px", width: 70, flexShrink: 0 },
    reviewInput: { flex: 1, minWidth: 160, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, color: "#fff", fontSize: 12, padding: "8px 12px", outline: "none" },
    reviewSubmitBtn: { background: Y, color: "#1a1000", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
    starBtn: (active) => ({ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: active ? Y : "#374151", padding: "0 2px" }),

    // Photo upload panel
    uploadPanel: { background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: "14px 16px", marginTop: 12 },
    uploadPanelTitle: { fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 6 },
    uploadBtn: { background: Y, color: "#1a1000", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 },

    // Similar
    similarGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginTop: 16 },
    simCard: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.3s", cursor: "pointer" },
    simImgWrap: { position: "relative", height: 160, overflow: "hidden", flexShrink: 0 },
    simImg: { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s", display: "block" },
    simCat: { position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.65)", color: Y, fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 20, textTransform: "uppercase" },
    simBody: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4, flex: 1 },
    simName: { fontSize: 13, fontWeight: 700, color: "#fff" },
    simDesc: { fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.45 },
    simPrice: { fontSize: 18, fontWeight: 800, color: Y, marginTop: "auto", paddingTop: 4 },
    simCartBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: Y, color: "#1a1000", border: "none", borderTop: "1px solid rgba(0,0,0,0.1)", padding: "9px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 },

    // Share modal
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" },
    modalBox: { background: "rgba(10,13,32,0.97)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 22, padding: "36px 40px", maxWidth: 400, width: "92%", textAlign: "center", boxShadow: "0 50px 120px rgba(0,0,0,0.75)" },
    modalTitle: { fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6, marginTop: 8 },
    shareLinkBox: { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "9px 12px", marginBottom: 18, textAlign: "left" },
    shareLinkText: { flex: 1, fontSize: 11, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" },
    shareCopyBtn: (copied) => ({ display: "inline-flex", alignItems: "center", gap: 5, background: copied ? "rgba(22,163,74,0.15)" : "rgba(213,117,0,0.15)", border: copied ? "1px solid rgba(22,163,74,0.4)" : "1px solid rgba(213,117,0,0.35)", color: copied ? "#16a34a" : Y, borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }),
    shareViaRow: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 },
    shareViaBtn: (bg, color) => ({ width: 46, height: 46, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "pointer", border: "none", background: bg, color, transition: "all 0.2s", textDecoration: "none" }),
    modalGhost: { background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", marginTop: 6, padding: "6px" },

    // Lightbox
    lightbox: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
    lightboxClose: { position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", borderRadius: "50%", width: 36, height: 36, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    lightboxImg: { maxWidth: "90vw", maxHeight: "88vh", borderRadius: 12, boxShadow: "0 0 60px rgba(0,0,0,0.8)" },

    backBtn: { background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0, display: "inline-flex", alignItems: "center", gap: 5 },
    sectionWrap: { marginBottom: 48 },
  };

  // Stock pill
  const stockPill = p.stock > 10
    ? <span style={s.stockIn}>● {p.stock} in stock</span>
    : p.stock > 0
    ? <span style={s.stockLow}>⚠ Only {p.stock} left!</span>
    : <span style={s.stockOut}>✕ Out of Stock</span>;

  return (
    <div style={s.page}>
      {/* Breadcrumb */}
      <nav style={s.breadcrumb}>
        <button style={s.bcLink} onClick={onBack}>🏠 Home</button>
        <span style={s.bcSep}>›</span>
        <button style={{ ...s.bcLink, color: Y }} onClick={onBack}>🏷 {p.category}</button>
        <span style={s.bcSep}>›</span>
        <span style={s.bcCurrent}>{p.name}</span>
      </nav>

      <Toast msg={toast} onHide={() => setToast("")} />

      {/* Main product grid */}
      <div style={{ ...s.grid, ...(window.innerWidth < 900 ? s.gridMobile : {}) }}>

        {/* ── LEFT: Media ── */}
        <div>
          <div style={s.mainImgWrap}>
            <img src={heroImg} alt={p.name} style={s.mainImg} onError={e => e.target.style.display = "none"} />
            <span style={s.catBadge}>{p.category}</span>
          </div>

          {allThumbs.length > 1 && (
            <div style={s.thumbRow}>
              {allThumbs.map((url, i) => (
                <img
                  key={i} src={url} alt="" style={s.thumb(activeThumb === i)}
                  onClick={() => { setHeroImg(url); setActiveThumb(i); }}
                  onError={e => e.target.style.display = "none"}
                />
              ))}
            </div>
          )}

          {p.videoLink && (
            <div style={s.videoWrap}>
              <video controls style={{ width: "100%", maxHeight: 220, display: "block" }}>
                <source src={p.videoLink} type="video/mp4" />
              </video>
            </div>
          )}
        </div>

        {/* ── RIGHT: Info ── */}
        <div style={s.infoCol}>
          <div>
            <h1 style={s.title}>{p.name}</h1>
            {p.vendor && (
              <span style={s.vendorBadge}>🏪 Sold by {p.vendor.name}</span>
            )}
          </div>

          <div style={s.infoRow}>
            <span style={s.infoRowIcon}>≡</span>
            <div>
              <div style={s.infoRowLabel}>Description</div>
              <div style={s.infoRowValue}>{p.description}</div>
            </div>
          </div>

          <div style={s.infoRow}>
            <span style={s.infoRowIcon}>🏷</span>
            <div>
              <div style={s.infoRowLabel}>Category</div>
              <div style={s.infoRowValue}>{p.category}</div>
            </div>
          </div>

          {/* Price block */}
          <div style={s.priceBlock}>
            <div>
              {discount > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <span style={s.saveBadge}>-{discount}%</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>You save ₹{(p.mrp - p.price).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div style={s.priceBig}>₹{p.price?.toLocaleString("en-IN")}</div>
              {discount > 0 && (
                <div style={s.mrpLine}>
                  M.R.P.: <span style={{ textDecoration: "line-through" }}>₹{p.mrp?.toLocaleString("en-IN")}</span>
                  <span style={{ fontSize: 11, marginLeft: 6 }}>Incl. of all taxes</span>
                </div>
              )}
              {!discount && <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Incl. of all taxes</div>}
            </div>
            {stockPill}
          </div>

          {/* Quantity selector */}
          {p.stock > 0 && (
            <div style={s.qtyWrap}>
              <span style={s.qtyLabel}>📦 Qty</span>
              <div style={s.qtyControls}>
                <button style={s.qtyBtn(qty <= 1)} onClick={() => qty > 1 && setQty(q => q - 1)}>−</button>
                <input style={s.qtyInput} type="number" value={qty} readOnly />
                <button style={s.qtyBtn(qty >= maxQty)} onClick={() => qty < maxQty && setQty(q => q + 1)}>+</button>
              </div>
              <span style={s.qtyInfo}>{p.stock > 10 ? "Max 10 per order" : `Only ${p.stock} left`}</span>
            </div>
          )}

          {/* Delivery estimate */}
          {p.stock > 0 && (
            <div style={s.deliveryBox}>
              <div style={s.deliveryHeader}>🚚 Estimated Delivery</div>
              <div style={s.deliveryOptions}>
                <div style={s.deliveryOpt(false)}>
                  <div style={s.deliveryOptLabel(false)}>📦 Standard</div>
                  <div style={s.deliveryOptDate}>{stdDate}</div>
                  <div style={s.deliveryOptPrice(false)}>FREE delivery</div>
                </div>
                <div style={s.deliveryOpt(true)}>
                  <div style={s.deliveryOptLabel(true)}>⚡ Express</div>
                  <div style={s.deliveryOptDate}>{expDate}</div>
                  <div style={s.deliveryOptPrice(true)}>+₹129 · Order within {expCountdown}</div>
                </div>
              </div>
              <div style={s.pinRow}>
                <span style={{ color: Y, fontSize: 11 }}>📍</span>
                <input
                  style={s.pinInput}
                  placeholder="Enter pin code"
                  value={pinCode}
                  maxLength={6}
                  inputMode="numeric"
                  onChange={e => setPinCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                  onKeyDown={e => e.key === "Enter" && checkPin()}
                />
                <button style={s.pinBtn} onClick={() => checkPin()} disabled={pinChecking}>
                  {pinChecking ? "…" : "Check"}
                </button>
                {pinResult && <span style={s.pinResult(pinResult.ok)}>{pinResult.msg}</span>}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Select delivery type at checkout</div>
            </div>
          )}

          {/* Action row */}
          <div style={s.actionRow}>
            {p.stock > 0 ? (
              <button
                style={{ ...s.addCartBtn, opacity: cartLoading[p.id] ? 0.6 : 1 }}
                disabled={cartLoading[p.id]}
                onClick={handleAddToCart}
              >
                🛒 {cartLoading[p.id] ? "Adding…" : "Add to Cart"}
              </button>
            ) : (
              <button
                style={s.notifyBtn(subscribed)}
                onClick={subscribed ? unsubscribeNotify : subscribeNotify}
              >
                {subscribed ? "🔕 Unsubscribe" : "🔔 Notify Me When Back"}
              </button>
            )}
            <button
              style={{ ...s.wishBtn, background: isWishlisted ? "rgba(239,68,68,0.22)" : undefined }}
              onClick={() => onToggleWishlist(p.id)}
            >
              {isWishlisted ? "❤️" : "🤍"}
            </button>
            <button style={s.shareBtn} onClick={() => setShareOpen(true)} title="Share">↗</button>
          </div>

          <button style={s.backBtn} onClick={onBack}>← Back to all products</button>
        </div>
      </div>

      {/* ── REVIEWS ── */}
      <div style={s.sectionWrap}>
        <div style={s.secTitle}>
          <span style={s.secIcon}>★</span>
          Customer Reviews
          <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.45)" }}>({reviews.length} reviews)</span>
        </div>

        {reviews.length > 0 ? (
          <div style={s.reviewsGrid}>
            {reviews.map((r, i) => (
              <div key={i} style={s.reviewCard}>
                <div style={s.reviewTop}>
                  <span style={s.reviewAuthor}>{r.customerName || "Customer"}</span>
                  <span style={s.reviewStars}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <p style={s.reviewText}>{r.comment}</p>
                {reviewPhotos[r.id] && reviewPhotos[r.id].length > 0 && (
                  <div style={s.photoStrip}>
                    {reviewPhotos[r.id].map((img, j) => (
                      <img
                        key={j} src={img.imageUrl} alt="review photo"
                        style={s.photoThumb}
                        onClick={() => setLightboxSrc(img.imageUrl)}
                        title="Click to enlarge"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No reviews yet — be the first to review this product!</p>
        )}

        {/* Write a review */}
        <div style={s.reviewFormWrap}>
          <div style={s.reviewFormTitle}>✏️ Write a Review</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} style={s.starBtn(n <= newReview.rating)} onClick={() => setNewReview(r => ({ ...r, rating: n }))}>★</button>
            ))}
          </div>
          <div style={s.reviewForm}>
            <input
              style={s.reviewInput}
              placeholder="Share your experience with this product…"
              value={newReview.comment}
              onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))}
            />
            <button style={{ ...s.reviewSubmitBtn, opacity: submitting || !!reviewId ? 0.5 : 1 }}
              onClick={submitReview} disabled={submitting || !!reviewId}>
              {submitting ? "Posting…" : reviewId ? "✓ Submitted" : "✈ Post"}
            </button>
          </div>

          {/* Photo upload after review submission */}
          {reviewId && (
            <div style={s.uploadPanel}>
              <p style={s.uploadPanelTitle}>📸 Add Review Photos <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>(optional · up to 5)</span></p>
              {reviewUploadedCount > 0 && (
                <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginBottom: 6 }}>✓ {reviewUploadedCount} photo{reviewUploadedCount !== 1 ? "s" : ""} added</div>
              )}
              {(5 - reviewUploadedCount) > 0 && (
                <>
                  <input ref={reviewFileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                    onChange={onReviewFilesChange}
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8, cursor: "pointer", width: "100%" }} />
                  {reviewPreviews.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      {reviewPreviews.map((src, i) => (
                        <img key={i} src={src} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "2px solid rgba(99,102,241,0.5)" }} />
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button style={{ ...s.uploadBtn, opacity: !reviewFiles.length || reviewUploading ? 0.4 : 1 }}
                      onClick={doReviewUpload} disabled={!reviewFiles.length || reviewUploading}>
                      {reviewUploading ? "Uploading…" : reviewFiles.length > 0 ? `Upload ${reviewFiles.length} Photo${reviewFiles.length !== 1 ? "s" : ""}` : "Select Photos First"}
                    </button>
                    {reviewFiles.length > 0 && !reviewUploading && (
                      <button style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                        onClick={() => { setReviewFiles([]); setReviewPreviews([]); if (reviewFileRef.current) reviewFileRef.current.value = ""; }}>
                        Clear
                      </button>
                    )}
                  </div>
                  {reviewUploadMsg && (
                    <p style={{ marginTop: 6, fontSize: 12, color: reviewUploadMsg.startsWith("✓") ? "#16a34a" : "#dc2626" }}>{reviewUploadMsg}</p>
                  )}
                </>
              )}
              <button style={{ marginTop: 10, fontSize: 11, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                onClick={() => { setReviewId(null); setReviewUploadMsg(""); setReviewFiles([]); setReviewPreviews([]); setReviewUploadedCount(0); }}>
                Done with photos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SIMILAR PRODUCTS ── */}
      {similar.length > 0 && (
        <div style={s.sectionWrap}>
          <div style={s.secTitle}>
            <span style={s.secIcon}>◈</span>
            Similar Products
            <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.45)" }}>in {p.category}</span>
          </div>
          <div style={s.similarGrid}>
            {similar.map((sim, i) => (
              <div key={i} style={s.simCard}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.borderColor = "rgba(245,168,0,0.4)"; e.currentTarget.style.boxShadow = "0 20px 45px rgba(0,0,0,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = ""; }}>
                <div style={s.simImgWrap} onClick={() => { /* bubble to parent */ onBack && null; }}>
                  <img src={sim.imageLink} alt={sim.name} style={s.simImg}
                    onError={e => e.target.style.display = "none"} />
                  <span style={s.simCat}>{sim.category}</span>
                </div>
                <div style={s.simBody}>
                  <div style={s.simName}>{sim.name}</div>
                  <div style={s.simDesc}>{sim.description}</div>
                  <div style={s.simPrice}>₹{sim.price?.toLocaleString("en-IN")}</div>
                </div>
                <button style={s.simCartBtn} onClick={() => onAddToCart(sim.id)}>🛒 Add to Cart</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SHARE MODAL ── */}
      {shareOpen && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShareOpen(false)}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 36 }}>🔗</div>
            <h3 style={s.modalTitle}>Share this Product</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginBottom: 16 }}>{p.name}</p>
            <div style={s.shareLinkBox}>
              <span style={s.shareLinkText}>{shareUrl}</span>
              <button style={s.shareCopyBtn(shareCopied)} onClick={copyLink}>
                {shareCopied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <div style={s.shareViaRow}>
              <a href={`https://wa.me/?text=${shareMsg}`} target="_blank" rel="noreferrer"
                style={s.shareViaBtn("rgba(37,211,102,0.15)", "#25d366")} title="WhatsApp">💬</a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out: " + p.name)}`} target="_blank" rel="noreferrer"
                style={s.shareViaBtn("rgba(0,136,204,0.15)", "#0088cc")} title="Telegram">✈</a>
              <a href={`mailto:?subject=${encodeURIComponent("Check this out on Ekart")}&body=${shareMsg}`}
                style={s.shareViaBtn("rgba(255,255,255,0.07)", "rgba(255,255,255,0.65)")} title="Email">✉</a>
            </div>
            <button style={s.modalGhost} onClick={() => setShareOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxSrc && (
        <div style={s.lightbox} onClick={() => setLightboxSrc(null)}>
          <button style={s.lightboxClose} onClick={() => setLightboxSrc(null)}>✕</button>
          <img src={lightboxSrc} alt="Review photo" style={s.lightboxImg} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}


/* ── Cart Page ── */
function CartPage({ cart, onRemove, onUpdateQty, onApplyCoupon, onRemoveCoupon, onCheckout, profile }) {
  const [couponCode, setCouponCode] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(null);

  // Read home PIN for restriction previews
  const homePin = (localStorage.getItem("ekart_delivery_pin") || "").replace(/\D/g, "").slice(0, 6);
  const pinRestrictedItems = getPinRestrictedItems(cart.items, homePin);

  return (
    <div>
      <h2 style={cs.pageTitle}>Your Cart 🛒</h2>

      {/* ── PIN restriction banner ── */}
      {pinRestrictedItems.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🚫</span>
          <div>
            <div style={{ color: "#f87171", fontWeight: 700, marginBottom: 4 }}>
              {pinRestrictedItems.length} item{pinRestrictedItems.length > 1 ? "s" : ""} can't be delivered to PIN {homePin}
            </div>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>
              {pinRestrictedItems.map(i => i.name).join(", ")} — vendor doesn't deliver to your location.
              Remove these items or update your delivery PIN to proceed.
            </div>
          </div>
        </div>
      )}

      {(!cart.items || cart.items.length === 0) ? (
        <div style={cs.empty}>🛒 Your cart is empty</div>
      ) : (
        <div style={{ ...cs.cartLayout, ...(window.innerWidth < 768 ? cs.cartLayoutMobile : {}) }}>
          <div>
            {cart.items.map((item, i) => {
              const pinBlocked = homePin && !isPinAllowed(item, homePin);
              return (
              <div key={i} style={{ ...cs.cartItem, ...(pinBlocked ? { borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.04)" } : {}) }}>
                <div style={cs.cartItemImg}>
                  {item.imageLink ? <img src={item.imageLink} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} onError={e => e.target.style.display = "none"} /> : "🛍️"}
                </div>
                <div style={cs.cartItemInfo}>
                  <div style={cs.cartItemName}>{item.name}</div>
                  <div style={{ color: "#6366f1", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{item.category}</div>
                  {/* PIN restriction badge */}
                  {pinBlocked && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#f87171", fontWeight: 700, marginBottom: 4 }}>
                      🚫 Not deliverable to PIN {homePin}
                    </div>
                  )}
                  {item.allowedPinCodes && !pinBlocked && homePin && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#4ade80", fontWeight: 700, marginBottom: 4 }}>
                      ✓ Delivers to PIN {homePin}
                    </div>
                  )}
                  <div style={cs.cartItemPrice}>{fmt(item.unitPrice || item.price)} each</div>
                  <div style={cs.qtyRow}>
                    <button style={cs.qtyBtn} onClick={() => item.quantity > 1 ? onUpdateQty(item.productId, item.quantity - 1) : setRemoveConfirm(item.productId)}>−</button>
                    <span style={cs.qtyNum}>{item.quantity}</span>
                    <button style={cs.qtyBtn} onClick={() => onUpdateQty(item.productId, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <div style={cs.cartItemTotal}>
                  <div style={cs.lineTotal}>{fmt((item.unitPrice || item.price) * item.quantity)}</div>
                  <button style={cs.removeBtn} onClick={() => setRemoveConfirm(item.productId)}>🗑️ Remove</button>
                </div>
              </div>
              );
            })}

            {/* Coupon */}
            <div style={cs.couponBox}>
              <span style={{ color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>🎟️ Coupon Code</span>
              {cart.couponApplied ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>{cart.couponCode} applied</span>
                  <button style={{ ...cs.removeBtn, fontSize: 12 }} onClick={onRemoveCoupon}>Remove</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...cs.searchInput, flex: 1 }} placeholder="Enter coupon code" value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                  <button style={cs.searchBtn} onClick={() => { onApplyCoupon(couponCode); setCouponCode(""); }}>Apply</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ ...cs.cartSummary, ...(window.innerWidth < 768 ? cs.cartSummaryMobile : {}) }}>
            <h3 style={{ color: "#e5e7eb", marginBottom: 16 }}>Order Summary</h3>
            <div style={cs.sumRow}><span>Items ({cart.itemCount || cart.items?.length})</span><span>{fmt(cart.subtotal)}</span></div>
            {cart.couponDiscount > 0 && <div style={{ ...cs.sumRow, color: "#16a34a" }}><span>Coupon Discount</span><span>-{fmt(cart.couponDiscount)}</span></div>}
            <div style={cs.sumRow}><span>Delivery</span><span style={{ color: !cart.deliveryCharge ? "#16a34a" : "#e5e7eb" }}>{!cart.deliveryCharge ? "FREE" : fmt(cart.deliveryCharge)}</span></div>
            {cart.subtotal < 500 && <p style={{ color: "#d97706", fontSize: 12, margin: "4px 0" }}>Add {fmt(500 - cart.subtotal)} more for free delivery!</p>}
            <div style={cs.totalRow}><span>Total</span><span>{fmt(cart.total)}</span></div>
            {/* ── GST breakdown (computed client-side from cart items) ── */}
            {(() => {
              const { slabs, totalGst } = computeCartGst(cart.items);
              if (totalGst <= 0) return null;
              return (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    🧾 Tax Breakdown (GST Inclusive)
                  </div>
                  {slabs.filter(s => s.rate > 0).map(s => (
                    <div key={s.rate} style={{ ...cs.sumRow, fontSize: 12 }}>
                      <span style={{ color: "#9ca3af" }}>GST @ {s.rate}%</span>
                      <span style={{ color: "#9ca3af" }}>{fmt(s.gst)}</span>
                    </div>
                  ))}
                  <div style={{ ...cs.sumRow, fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginTop: 2 }}>
                    <span>{getMixedGstLabel(slabs)}</span>
                    <span>{fmt(totalGst)}</span>
                  </div>
                </div>
              );
            })()}
            
            {/* ── COD INFO TIP ── */}
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 12px", marginTop: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💵</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#86efac", fontSize: 12, fontWeight: 700 }}>Cash on Delivery Available</div>
                <div style={{ color: "#86efac", fontSize: 11, marginTop: 3, opacity: 0.8 }}>Pay when your order arrives. Keep exact change ready for faster checkout.</div>
              </div>
            </div>

            <button
              style={{ ...cs.addCartBtn, width: "100%", padding: "14px", marginTop: 16, fontSize: 16,
                ...(pinRestrictedItems.length > 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
              onClick={() => {
                if (pinRestrictedItems.length > 0) {
                  return; // blocked — banner above explains why
                }
                onCheckout();
              }}
            >
              {pinRestrictedItems.length > 0
                ? `🚫 Remove ${pinRestrictedItems.length} restricted item${pinRestrictedItems.length > 1 ? "s" : ""} to checkout`
                : "Proceed to Checkout →"}
            </button>
          </div>
        </div>
      )}

      {/* Remove confirm dialog */}
      {removeConfirm && (
        <div style={cs.overlay}>
          <div style={cs.dialog}>
            <h3 style={{ color: "#e5e7eb", marginBottom: 8 }}>Remove Item?</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>Are you sure you want to remove this item from your cart?</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...cs.addCartBtn, flex: 1 }} onClick={() => { onRemove(removeConfirm); setRemoveConfirm(null); }}>Yes, Remove</button>
              <button style={cs.secondaryBtn} onClick={() => setRemoveConfirm(null)}>Keep It</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Payment Page ── */
const DELIVERY_OPTIONS = [
  {
    id: "STANDARD",
    icon: "📦",
    label: "Standard Delivery",
    sub: "3–5 business days",
    badge: "FREE",
    surcharge: 0,
    badgeColor: "#16a34a",
  },
  {
    id: "EXPRESS",
    icon: "⚡",
    label: "Express Delivery",
    sub: "Next business day by 10 AM",
    badge: "+₹50",
    surcharge: 50,
    badgeColor: "#f59e0b",
  },
];

/* ── Indian PIN validator (shared with VendorApp) ───────────────── */
function isIndianPinAddr(val) {
  if (!/^\d{6}$/.test(val)) return false;
  const p = val.slice(0, 2);
  const ok = new Set(["11","12","13","14","15","16","17","18","19",
    "20","21","22","23","24","25","26","27","28",
    "30","31","32","33","34","36","37","38","39",
    "40","41","42","43","44","45","46","47","48","49",
    "50","51","52","53","56","57","58","59",
    "60","61","62","63","64","65","66","67","68","69",
    "70","71","72","73","74","75","76","77","78","79",
    "80","81","82","83","84","85",
    "90","91","92","93","94","95","96","97","98","99"]);
  return ok.has(p);
}

/* ── Address Step Page ─────────────────────────────────────────────
   Step 2 of checkout: select a saved address OR add a new one inline.
   Features mirrored from the HTML shipping page:
   • Progress stepper (Cart ✓ → Shipping active → Payment)
   • Saved address cards with hover + "Use This Address" button
   • Per-card PIN mismatch warning (vs localStorage ekart_delivery_pin)
   • New-address form with per-field validation & error messages
   • Live address preview as user types
   • Home-PIN hint banner when delivery PIN is set
   • Real-time PIN mismatch warning on the new-address form
   • Delete saved address
──────────────────────────────────────────────────────────────────── */
function AddressStepPage({ profile, api, onRefreshProfile, onBack, onContinue, showToast, cart }) {
  const EMPTY = { recipientName: "", houseStreet: "", city: "", state: "", postalCode: "" };

  const [selectedAddr, setSelectedAddr] = useState(() => {
    const addrs = profile?.addresses || [];
    return addrs.length === 1 ? addrs[0].id : null;
  });
  const [showAddForm, setShowAddForm]   = useState(false);
  const [addForm, setAddForm]           = useState(EMPTY);
  const [errors, setErrors]             = useState({});
  const [saving, setSaving]             = useState(false);
  const [homePin, setHomePin]           = useState("");
  const [cardWarnings, setCardWarnings] = useState({}); // addrId → msg
  const [formPinMismatch, setFormPinMismatch] = useState("");

  const addrs = profile?.addresses || [];

  // Read home delivery PIN from localStorage on mount
  useEffect(() => {
    const p = localStorage.getItem("ekart_delivery_pin") || "";
    setHomePin(p.length === 6 ? p : "");
  }, []);

  // ── Field change helpers ──────────────────────────────────────────
  const setF = (k, v) => {
    setAddForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
    if (k === "postalCode") {
      const pin = v.replace(/\D/g, "").slice(0, 6);
      if (pin.length === 6 && homePin && pin !== homePin) {
        setFormPinMismatch(pin);
      } else {
        setFormPinMismatch("");
      }
    }
  };

  // ── Validation ────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!addForm.recipientName.trim() || addForm.recipientName.trim().length < 2)
      e.recipientName = "Please enter the recipient's name.";
    if (!addForm.houseStreet.trim() || addForm.houseStreet.trim().length < 5)
      e.houseStreet = "Please enter a house/street address.";
    if (!addForm.city.trim() || addForm.city.trim().length < 2)
      e.city = "Please enter a city or locality.";
    if (!addForm.state.trim() || addForm.state.trim().length < 2)
      e.state = "Please enter a state or province.";
    const pin = addForm.postalCode.replace(/\D/g, "");
    if (!isIndianPinAddr(pin))
      e.postalCode = "Please enter a valid 6-digit Indian pin code.";
    else if (homePin && pin !== homePin)
      e.postalCode = `PIN mismatch — your delivery location is set to ${homePin}.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save new address ──────────────────────────────────────────────
  const handleAddAddress = async () => {
    if (!validate()) return;
    setSaving(true);
    const d = await api("/profile/address/add", { method: "POST", body: JSON.stringify({ ...addForm, postalCode: addForm.postalCode.replace(/\D/g,"").slice(0,6) }) });
    if (d.success) {
      showToast("Address saved! ✓");
      await onRefreshProfile();
      setShowAddForm(false);
      setAddForm(EMPTY);
      setErrors({});
      setFormPinMismatch("");
    } else {
      showToast(d.message || "Failed to save address");
    }
    setSaving(false);
  };

  // ── Delete saved address ──────────────────────────────────────────
  const handleDeleteAddr = async (addrId) => {
    if (!window.confirm("Delete this address?")) return;
    const d = await api(`/profile/address/delete/${addrId}`, { method: "DELETE" });
    if (d.success) { showToast("Address deleted"); onRefreshProfile(); if (selectedAddr === addrId) setSelectedAddr(null); }
    else showToast(d.message || "Error");
  };

  // ── Use saved address — with PIN mismatch check ───────────────────
  const handleUseAddress = (a) => {
    const addrPin = (a.postalCode || "").trim();

    // Clear all card warnings first
    setCardWarnings({});

    if (!homePin) {
      // No home PIN set — proceed directly
      setSelectedAddr(a.id);
      onContinue(a.id);
      return;
    }

    if (!addrPin || addrPin.length !== 6) {
      // Legacy address with no PIN — warn but allow after delay
      setCardWarnings({ [a.id]: `This address has no PIN code saved. Your delivery location is set to ${homePin}. Proceeding anyway…` });
      setSelectedAddr(a.id);
      setTimeout(() => onContinue(a.id), 2200);
      return;
    }

    if (addrPin === homePin) {
      setSelectedAddr(a.id);
      onContinue(a.id);
      return;
    }

    // MISMATCH
    setCardWarnings({ [a.id]: `PIN mismatch — your delivery location is set to ${homePin}, but this address has PIN ${addrPin}.` });
  };

  // ── Continue with selected address ───────────────────────────────
  const handleContinue = () => {
    if (!selectedAddr) { showToast("Please select a delivery address"); return; }
    const a = addrs.find(x => x.id === selectedAddr);
    handleUseAddress(a);
  };

  // ── Live address preview text ─────────────────────────────────────
  const preview = [
    addForm.recipientName.trim(),
    addForm.houseStreet.trim(),
    [addForm.city.trim(), addForm.state.trim()].filter(Boolean).join(", "),
    addForm.postalCode.trim() ? `📍 ${addForm.postalCode.trim()}` : "",
  ].filter(Boolean);

  // ── Stepper ───────────────────────────────────────────────────────
  const steps = [
    { label: "Cart",     done: true,  active: false },
    { label: "Shipping", done: false, active: true  },
    { label: "Payment",  done: false, active: false },
  ];

  const inp = (k, placeholder, opts = {}) => (
    <div style={{ marginBottom: 4 }}>
      <input
        style={{ ...cs.inputField, ...(errors[k] ? { borderColor: "rgba(255,100,80,0.6)" } : {}) }}
        placeholder={placeholder}
        value={addForm[k]}
        maxLength={opts.maxLength}
        inputMode={opts.inputMode}
        onChange={e => setF(k, opts.numeric ? e.target.value.replace(/\D/g,"").slice(0, opts.maxLength || 99) : e.target.value)}
      />
      {errors[k] && <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{errors[k]}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px" }}>

      {/* ── Progress stepper ── */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: "0 0 auto" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800,
                background: s.active ? "#f5a800" : s.done ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
                border: `2px solid ${s.active ? "#f5a800" : s.done ? "#22c55e" : "rgba(255,255,255,0.15)"}`,
                color: s.active ? "#1a1000" : s.done ? "#22c55e" : "#6b7280",
                boxShadow: s.active ? "0 0 0 4px rgba(245,168,0,0.2)" : "none",
              }}>
                {s.done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                color: s.active ? "#f5a800" : s.done ? "#22c55e" : "#6b7280" }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i === 0 ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)", margin: "0 8px", marginBottom: 18 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Home PIN hint banner ── */}
      {homePin && (
        <div style={{ background: "rgba(245,168,0,0.08)", border: "1px solid rgba(245,168,0,0.3)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 20,
          fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
          ℹ️ Your delivery location is set to PIN{" "}
          <strong style={{ color: "#f5a800" }}>{homePin}</strong>.
          The postal code you enter below must match this.
        </div>
      )}

      {/* ── Saved address cards ── */}
      {addrs.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
            color: "#f5a800", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            📍 Saved Addresses
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>

          {addrs.map(a => {
            const chosen  = selectedAddr === a.id;
            const warning = cardWarnings[a.id];
            const isMismatch = warning?.includes("mismatch");
            // Per-product PIN restriction check for this address
            const addrPin = (a.postalCode || "").replace(/\D/g, "").slice(0, 6);
            const addrPinRestricted = getPinRestrictedItems(cart?.items || [], addrPin);
            const addrPinBlocked = addrPinRestricted.length > 0;
            return (
              <div key={a.id} style={{
                background: chosen ? "rgba(245,168,0,0.05)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${addrPinBlocked ? "rgba(239,68,68,0.4)" : chosen ? "rgba(245,168,0,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 14, padding: "16px 18px", marginBottom: 12,
                transition: "all 0.25s", cursor: "pointer",
              }} onClick={() => setSelectedAddr(a.id)}>
                <div style={{ fontWeight: 700, color: "#e5e7eb", marginBottom: 3, fontSize: 14 }}>
                  {a.recipientName}
                </div>
                {a.houseStreet && <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.55 }}>{a.houseStreet}</div>}
                <div style={{ color: "#9ca3af", fontSize: 13 }}>
                  {[a.city, a.state].filter(Boolean).join(", ")}
                </div>
                {a.postalCode && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5,
                    fontSize: 12, fontWeight: 700, color: "#f5a800" }}>
                    📍 {a.postalCode}
                  </div>
                )}

                {/* Per-product PIN restriction warning for this address */}
                {addrPinBlocked && (
                  <div style={{ marginTop: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#f87171", lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700, marginBottom: 3 }}>
                      🚫 {addrPinRestricted.length} cart item{addrPinRestricted.length > 1 ? "s" : ""} can't ship to PIN {addrPin}
                    </div>
                    <div style={{ color: "#9ca3af" }}>
                      {addrPinRestricted.map(i => i.name).join(", ")}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <button
                    style={{ display: "inline-flex", alignItems: "center", gap: 5,
                      background: addrPinBlocked ? "rgba(239,68,68,0.25)" : "#f5a800",
                      color: addrPinBlocked ? "#f87171" : "#1a1000", border: "none",
                      padding: "6px 16px", borderRadius: 50, fontSize: 11, fontWeight: 700,
                      letterSpacing: "0.06em", textTransform: "uppercase", cursor: addrPinBlocked ? "not-allowed" : "pointer",
                      boxShadow: addrPinBlocked ? "none" : "0 4px 14px rgba(245,168,0,0.25)", transition: "all 0.2s" }}
                    onClick={e => { e.stopPropagation(); if (!addrPinBlocked) handleUseAddress(a); }}
                  >
                    {addrPinBlocked ? "🚫 PIN Restricted" : "✓ Use This Address"}
                  </button>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer",
                      color: "rgba(255,100,80,0.6)", fontSize: 12, fontWeight: 600 }}
                    onClick={e => { e.stopPropagation(); handleDeleteAddr(a.id); }}
                  >
                    🗑 Delete
                  </button>
                </div>

                {/* Per-card PIN mismatch warning */}
                {warning && (
                  <div style={{ marginTop: 10,
                    background: isMismatch ? "rgba(255,96,60,0.1)" : "rgba(245,168,0,0.08)",
                    border: `1.5px solid ${isMismatch ? "rgba(255,96,60,0.45)" : "rgba(245,168,0,0.3)"}`,
                    borderRadius: 10, padding: "10px 12px",
                    fontSize: 12, color: isMismatch ? "#ff8060" : "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>
                    {isMismatch ? (
                      <>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ PIN Code Mismatch</div>
                        <div>{warning}</div>
                        <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <span style={{ color: "#f5a800", fontWeight: 700, fontSize: 11, cursor: "pointer" }}
                            onClick={() => { localStorage.setItem("ekart_delivery_pin", a.postalCode); setHomePin(a.postalCode); setCardWarnings({}); }}>
                            Use {a.postalCode} as my location
                          </span>
                        </div>
                      </>
                    ) : (
                      <div>ℹ️ {warning}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "20px 0" }} />
        </div>
      )}

      {addrs.length === 0 && !showAddForm && (
        <div style={{ textAlign: "center", padding: "32px 24px", background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📭</div>
          <p style={{ color: "#9ca3af" }}>No saved addresses yet. Add one to continue.</p>
        </div>
      )}

      {/* ── New address form toggle ── */}
      {!showAddForm ? (
        <button style={{ ...cs.outlineBtn, width: "100%", padding: "12px", marginBottom: 20,
          fontSize: 13, borderStyle: "dashed" }}
          onClick={() => setShowAddForm(true)}>
          + Add a New Address
        </button>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: "20px", marginBottom: 20 }}>

          {/* Form header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.12em", color: "#f5a800", display: "flex", alignItems: "center", gap: 6 }}>
              📍 New Address
            </div>
            <button style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}
              onClick={() => { setShowAddForm(false); setErrors({}); setFormPinMismatch(""); }}>✕</button>
          </div>

          {/* Map picker */}
          <AddressMap onSelect={(r) => {
            setAddForm(f => ({
              ...f,
              houseStreet: r.display_name || f.houseStreet,
              city: (r.address && (r.address.city || r.address.town || r.address.village)) || f.city,
              state: (r.address && (r.address.state || r.address.region)) || f.state,
              postalCode: (r.address && (r.address.postcode || r.address.postal_code)) || f.postalCode,
            }));
          }} />

          {/* 2-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            {/* Recipient Name — full width */}
            <div style={{ gridColumn: "1 / -1", marginBottom: 2 }}>
              <label style={{ ...cs.label, marginBottom: 5 }}>👤 Recipient Name <span style={{ color: "#f5a800" }}>*</span></label>
              {inp("recipientName", "Full name of the person receiving the order", { maxLength: 100 })}
            </div>
            {/* House / Street — full width */}
            <div style={{ gridColumn: "1 / -1", marginBottom: 2 }}>
              <label style={{ ...cs.label, marginBottom: 5 }}>🏠 House / Building & Street <span style={{ color: "#f5a800" }}>*</span></label>
              {inp("houseStreet", "e.g. Flat 4B, Sunrise Apts, MG Road", { maxLength: 200 })}
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Include flat/house number, building name, and street.</div>
            </div>
            {/* City */}
            <div style={{ marginBottom: 2 }}>
              <label style={{ ...cs.label, marginBottom: 5 }}>🏙 City / Locality <span style={{ color: "#f5a800" }}>*</span></label>
              {inp("city", "e.g. Bengaluru", { maxLength: 100 })}
            </div>
            {/* State */}
            <div style={{ marginBottom: 2 }}>
              <label style={{ ...cs.label, marginBottom: 5 }}>🗺 State / Province <span style={{ color: "#f5a800" }}>*</span></label>
              {inp("state", "e.g. Karnataka", { maxLength: 100 })}
            </div>
            {/* Postal Code — full width */}
            <div style={{ gridColumn: "1 / -1", marginBottom: 2 }}>
              <label style={{ ...cs.label, marginBottom: 5 }}>✉️ Postal Code <span style={{ color: "#f5a800" }}>*</span></label>
              {inp("postalCode", "6-digit PIN code", { maxLength: 6, inputMode: "numeric", numeric: true })}
            </div>
          </div>

          {/* PIN mismatch banner on new-address form */}
          {formPinMismatch && homePin && (
            <div style={{ background: "rgba(255,96,60,0.1)", border: "1.5px solid rgba(255,96,60,0.45)",
              borderRadius: 10, padding: "12px 14px", marginTop: 4, marginBottom: 8,
              fontSize: 12, color: "#ff8060", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ PIN Code Mismatch</div>
              <div>
                You set your delivery location to{" "}
                <strong style={{ color: "#f5a800" }}>{homePin}</strong> on the home page,
                but entered <strong style={{ color: "#ff8060" }}>{formPinMismatch}</strong> here.
              </div>
              <div style={{ marginTop: 6 }}>
                Please use the same pin code, or{" "}
                <span style={{ color: "#f5a800", textDecoration: "underline", cursor: "pointer" }}
                  onClick={() => { localStorage.setItem("ekart_delivery_pin", formPinMismatch); setHomePin(formPinMismatch); setFormPinMismatch(""); }}>
                  update your delivery location to {formPinMismatch}
                </span>.
              </div>
            </div>
          )}

          {/* Live address preview */}
          {preview.length > 0 && (
            <div style={{ background: "rgba(245,168,0,0.06)", border: "1px dashed rgba(245,168,0,0.3)",
              borderRadius: 10, padding: "12px 14px", marginTop: 8, marginBottom: 12,
              fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                color: "#f5a800", marginBottom: 6 }}>👁 Address Preview</div>
              {preview.map((line, i) => (
                <div key={i} style={{ fontWeight: i === 0 ? 700 : 400,
                  color: line.startsWith("📍") ? "#f5a800" : undefined }}>{line}</div>
              ))}
            </div>
          )}

          <button style={{ ...cs.saveBtn, width: "100%", marginTop: 8 }}
            onClick={handleAddAddress} disabled={saving}>
            {saving ? "Saving…" : "💾 Save & Use This Address"}
          </button>
        </div>
      )}

      {/* ── Continue button ── */}
      {addrs.length > 0 && (
        <button style={{ ...cs.addCartBtn, width: "100%", padding: "15px", fontSize: 15,
          opacity: selectedAddr ? 1 : 0.45 }}
          onClick={handleContinue}>
          Continue to Payment →
        </button>
      )}

      <button style={{ ...cs.backBtn, marginTop: 16 }} onClick={onBack}>← Back to Cart</button>
    </div>
  );
}


function PaymentPage({ cart, profile, selectedAddressId, onPlaceOrder, onBack, showToast }) {
  const [payMode, setPayMode] = useState("COD");
  const [deliveryTime, setDeliveryTime] = useState("STANDARD");
  const [placing, setPlacing] = useState(false);
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false);
  const addrs = profile?.addresses || [];
  // selectedAddr comes pre-chosen from the Address step; fall back to first saved address
  const selectedAddr = selectedAddressId || (addrs.length > 0 ? addrs[0].id : null);

  const expressSurcharge = deliveryTime === "EXPRESS" ? 50 : 0;
  const subtotal = cart.subtotal || cart.total || 0;
  const couponDiscount = cart.couponDiscount || 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount) + expressSurcharge;

  // ── PIN restriction check for chosen delivery address ─────────────
  const chosenAddr = addrs.find(a => a.id === selectedAddr);
  const deliveryPin = (chosenAddr?.postalCode || "").replace(/\D/g, "").slice(0, 6);
  const pinRestrictedItems = getPinRestrictedItems(cart.items, deliveryPin);
  const pinBlocked = pinRestrictedItems.length > 0;

  // ── Handle Online Payment — open Razorpay checkout modal ──
  const handleOnlinePay = () => {
    if (!selectedAddr) { 
      showToast?.("No delivery address selected"); 
      return; 
    }
    // Open the RazorpayCheckoutModal
    setRazorpayModalOpen(true);
  };

  // ── Handle payment success from modal ──
  const handlePaymentSuccess = async (paymentDetails) => {
    // paymentDetails: { razorpayPaymentId, razorpayOrderId, amount }
    setPlacing(true);
    await onPlaceOrder(selectedAddr, "ONLINE", deliveryTime, paymentDetails);
    setPlacing(false);
    setRazorpayModalOpen(false);
  };

  const handlePlace = async () => {
    if (!selectedAddr) { showToast?.("No delivery address selected"); return; }
    if (pinBlocked) { showToast?.(`Cannot place order — some items cannot be delivered to PIN ${deliveryPin}`); return; }
    
    if (payMode === "ONLINE") {
      handleOnlinePay();
      return;
    }
    // For COD
    setPlacing(true);
    await onPlaceOrder(selectedAddr, payMode, deliveryTime);
    setPlacing(false);
  };

  const steps = [
    { label: "Cart", icon: "🛒", done: true },
    { label: "Address", icon: "📍", done: true },
    { label: "Payment", icon: "💳", active: true },
  ];

  return (
    <div style={{ padding: "32px 20px" }}>
      {/* Page Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: "#fff", margin: "0 0 8px" }}>
          Complete Your <span style={{ color: "#a5b4fc" }}>Payment</span> 💳
        </h1>
        <p style={{ fontSize: 15, color: "#9ca3af", maxWidth: 600, margin: "0 auto" }}>
          Choose your delivery speed and preferred payment method below. Your order is secure and backed by our satisfaction guarantee.
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32 }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
                background: s.active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : s.done ? "#22c55e" : "rgba(255,255,255,0.08)",
                border: s.active ? "none" : s.done ? "none" : "2px solid rgba(255,255,255,0.15)",
                boxShadow: s.active ? "0 4px 14px rgba(99,102,241,0.4)" : "none",
              }}>
                {s.done && !s.active ? "✓" : s.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.active ? "#a5b4fc" : s.done ? "#4ade80" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 64, height: 2, background: "#22c55e", margin: "0 8px", marginBottom: 22 }} />
            )}
          </div>
        ))}
      </div>

      <button style={cs.backBtn} onClick={onBack}>← Back to Address</button>
      <div style={{ display: "grid", gridTemplateColumns: window.innerWidth > 1024 ? "1.5fr 1fr" : "1fr", gap: 32, maxWidth: 1600, margin: "0 auto", ...(window.innerWidth < 768 && cs.paymentLayoutMobile) }}>
        <div>
          {/* Chosen address — read-only summary */}
          <div style={cs.paySection}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={cs.paySectionTitle}>📍 Delivering To</h3>
              <button style={{ ...cs.outlineBtn, fontSize: 12, padding: "4px 12px" }} onClick={onBack}>Change</button>
            </div>
            {chosenAddr ? (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0" }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>🏠</div>
                <div>
                  <div style={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 4 }}>{chosenAddr.recipientName}</div>
                  <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.6 }}>
                    {chosenAddr.houseStreet}<br />{chosenAddr.city}, {chosenAddr.state} — {chosenAddr.postalCode}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "#f59e0b", fontSize: 14 }}>⚠️ No address selected. Go back to choose one.</p>
            )}
          </div>

          {/* Delivery speed */}
          <div style={cs.paySection}>
            <h3 style={cs.paySectionTitle}>🚚 Delivery Speed</h3>
            {DELIVERY_OPTIONS.map(opt => (
              <div key={opt.id}
                style={{ ...cs.addrCard, borderColor: deliveryTime === opt.id ? "#6366f1" : "rgba(255,255,255,0.1)", marginBottom: 10, cursor: "pointer" }}
                onClick={() => setDeliveryTime(opt.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: deliveryTime === opt.id ? "#6366f1" : "#6b7280", background: deliveryTime === opt.id ? "#6366f1" : "transparent", flexShrink: 0 }} />
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{opt.label}</div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>{opt.sub}</div>
                  </div>
                  <span style={{ background: deliveryTime === opt.id ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)", color: opt.badgeColor, fontWeight: 800, fontSize: 13, padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>
                    {opt.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Payment mode */}
          <div style={cs.paySection}>
            <h3 style={cs.paySectionTitle}>💳 Payment Method</h3>
            {[{ id: "COD", icon: "💵", label: "Cash on Delivery", sub: "Pay when your order arrives" },
              { id: "ONLINE", icon: "💳", label: "Pay Online", sub: "UPI, Cards, Net Banking via Razorpay" }].map(m => (
              <div key={m.id} style={{ ...cs.addrCard, borderColor: payMode === m.id ? "#6366f1" : "rgba(255,255,255,0.1)", marginBottom: 10 }}
                onClick={() => setPayMode(m.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: payMode === m.id ? "#6366f1" : "#6b7280", background: payMode === m.id ? "#6366f1" : "transparent" }} />
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  <div>
                    <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{m.label}</div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>{m.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order items */}
          <div style={cs.paySection}>
            <h3 style={cs.paySectionTitle}>📦 Order Items</h3>
            {cart.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#e5e7eb", fontSize: 14 }}>
                <span>{item.name} <span style={{ color: "#9ca3af" }}>× {item.quantity}</span></span>
                <span>{fmt((item.unitPrice || item.price) * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Detailed Price Breakdown */}
          <div style={cs.paySection}>
            <h3 style={cs.paySectionTitle}>🧾 Price Breakdown</h3>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, color: "#e5e7eb" }}>
              <span style={{ color: "#9ca3af" }}>Cart Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {couponDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, color: "#22c55e", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span>💚 Coupon Discount</span>
                <span>-{fmt(couponDiscount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, color: "#e5e7eb", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "#9ca3af" }}>Delivery Charge</span>
              <span style={{ color: expressSurcharge === 0 ? "#22c55e" : "#f5a800" }}>
                {expressSurcharge === 0 ? "FREE" : fmt(expressSurcharge)}
              </span>
            </div>
            {/* GST Breakdown */}
            {(() => {
              const { slabs, totalGst } = computeCartGst(cart.items);
              if (totalGst <= 0) return null;
              return (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,0.12)" }}>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    🧾 GST (Included)
                  </div>
                  {slabs.filter(s => s.rate > 0).map(s => (
                    <div key={s.rate} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: "#9ca3af" }}>
                      <span>GST @ {s.rate}%</span>
                      <span>{fmt(s.gst)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        <div style={{ ...cs.cartSummary, ...(window.innerWidth < 768 ? cs.cartSummaryMobile : {}) }}>
          <h3 style={{ color: "#e5e7eb", marginBottom: 16 }}>Bill Summary</h3>
          <div style={cs.sumRow}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          {couponDiscount > 0 && (
            <div style={{ ...cs.sumRow, color: "#22c55e" }}><span>Coupon</span><span>-{fmt(couponDiscount)}</span></div>
          )}
          <div style={cs.sumRow}>
            <span>Delivery</span>
            <span style={{ color: expressSurcharge === 0 ? "#22c55e" : "#f59e0b" }}>
              {expressSurcharge === 0 ? "FREE" : fmt(expressSurcharge)}
            </span>
          </div>
          {/* ── Per-slab GST breakdown ── */}
          {(() => {
            const { slabs, totalGst } = computeCartGst(cart.items);
            if (totalGst <= 0) return null;
            return (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 4, marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  🧾 Tax Breakdown (GST Inclusive)
                </div>
                {slabs.filter(s => s.rate > 0).map(s => (
                  <div key={s.rate} style={{ ...cs.sumRow, fontSize: 12 }}>
                    <span style={{ color: "#9ca3af" }}>GST @ {s.rate}%</span>
                    <span style={{ color: "#9ca3af" }}>{fmt(s.gst)}</span>
                  </div>
                ))}
                <div style={{ ...cs.sumRow, fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginTop: 2 }}>
                  <span>{getMixedGstLabel(slabs)}</span>
                  <span>{fmt(totalGst)}</span>
                </div>
              </div>
            );
          })()}
          <div style={cs.totalRow}><span>Total</span><span>{fmt(grandTotal)}</span></div>

          {/* Selected delivery speed pill */}
          <div style={{ marginTop: 10, padding: "8px 12px", background: deliveryTime === "EXPRESS" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.1)", borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>{deliveryTime === "EXPRESS" ? "⚡" : "📦"}</span>
            <span style={{ color: deliveryTime === "EXPRESS" ? "#fbbf24" : "#4ade80", fontSize: 13, fontWeight: 600 }}>
              {deliveryTime === "EXPRESS" ? "Express — Next Day" : "Standard — 3–5 Days"}
            </span>
          </div>

          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(99,102,241,0.1)", borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>{payMode === "COD" ? "💵" : "💳"}</span>
            <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 600 }}>{payMode === "COD" ? "Cash on Delivery" : "Online Payment"}</span>
          </div>
          {/* ── PIN restriction blocking banner ── */}
          {pinBlocked && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                🚫 {pinRestrictedItems.length} item{pinRestrictedItems.length > 1 ? "s" : ""} can't be delivered to PIN {deliveryPin}
              </div>
              <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
                {pinRestrictedItems.map(i => i.name).join(", ")} — the vendor doesn't ship to this PIN code.
              </div>
              <button style={{ ...cs.outlineBtn, fontSize: 12, padding: "5px 14px" }} onClick={onBack}>
                ← Change Address
              </button>
            </div>
          )}
          <button
            style={{ 
              ...cs.addCartBtn, 
              width: "100%", 
              padding: "14px", 
              marginTop: 16, 
              fontSize: 16,
              opacity: placing || pinBlocked ? 0.5 : 1, 
              cursor: placing || pinBlocked ? "not-allowed" : "pointer",
              background: payMode === "ONLINE" ? "#f5a800" : "#22c55e",
              boxShadow: payMode === "ONLINE" ? "0 8px 24px rgba(245,168,0,0.3)" : "0 8px 24px rgba(34,197,94,0.2)",
              transition: "all 0.3s cubic-bezier(0.23,1,0.32,1)",
            }}
            disabled={placing || pinBlocked}
            onClick={handlePlace}>
            {placing ? "Processing..." : pinBlocked ? "🚫 Cannot place — PIN restricted" : payMode === "COD" ? "✓ Place Order (COD) 🚀" : "💳 Pay & Place Order"}
          </button>

          {/* ── Security Badge ── */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, color: "#9ca3af" }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <span>Secured by 256-bit SSL encryption</span>
          </div>
        </div>
      </div>

      {/* ── Razorpay Checkout Modal ── */}
      <RazorpayCheckoutModal
        isOpen={razorpayModalOpen}
        onClose={() => setRazorpayModalOpen(false)}
        carttotal={grandTotal}
        addressId={selectedAddr}
        deliveryTime={deliveryTime}
        onPaymentSuccess={handlePaymentSuccess}
        showToast={showToast}
      />
    </div>
  );
}

/* ── Order Success ── */
function OrderSuccessPage({ order, onTrack, onHome }) {
  const steps = ["Confirmed", "Processing", "Shipped", "Delivered"];
  const isCod = (order.paymentMode || "").toUpperCase() === "COD";
  const amountDue = order.amount || order.total || 0;

  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
      <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Order Placed Successfully!</h1>
      <p style={{ color: "#9ca3af", marginBottom: 32 }}>Your order is confirmed. A confirmation email has been sent to your registered address.</p>

      {/* ── COD PAYMENT INFO ── */}
      {isCod && (
        <div style={{ background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", borderRadius: 14, padding: "16px 20px", marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 24 }}>💵</span>
            <div style={{ textAlign: "left", flex: 1 }}>
              <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 14 }}>Cash on Delivery</div>
              <div style={{ color: "#86efac", fontSize: 12 }}>Pay when your order arrives</div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(34,197,94,0.2)", paddingTop: 12, marginTop: 12 }}>
            <div style={{ color: "#86efac", fontSize: 13, marginBottom: 6 }}>Amount Due at Delivery:</div>
            <div style={{ color: "#4ade80", fontSize: 28, fontWeight: 800 }}>₹{Math.round(amountDue).toLocaleString("en-IN")}</div>
            <div style={{ color: "#86efac", fontSize: 12, marginTop: 8 }}>⚠️ Keep exact change ready for faster checkout</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, maxWidth: 700, margin: "0 auto 32px", textAlign: "left" }}>
        {[
          { icon: "🔢", label: "Order ID", value: `#${order.orderId || order.id || "—"}` },
          { icon: "💰", label: "Amount", value: fmt(order.amount || order.total) },
          { icon: "🚚", label: "Delivery", value: order.deliveryTime || "Standard (3–5 days)" },
          { icon: "💳", label: "Payment", value: isCod ? "💵 COD" : "💳 Online" },
        ].map(item => (
          <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
            <div style={{ color: "#fff", fontWeight: 700 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "center", gap: 0, maxWidth: 600, margin: "0 auto 32px", position: "relative" }}>
        {steps.map((step, i) => (
          <div key={step} style={{ flex: 1, textAlign: "center", position: "relative" }}>
            {i > 0 && <div style={{ position: "absolute", top: 15, left: "-50%", right: "50%", height: 2, background: i === 0 ? "#22c55e" : "rgba(255,255,255,0.15)" }} />}
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: i === 0 ? "#22c55e" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 14 }}>
              {i === 0 ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 12, color: i === 0 ? "#22c55e" : "#6b7280" }}>{step}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button style={{ ...cs.addCartBtn, padding: "12px 28px" }} onClick={onTrack}>🚚 Track Order</button>
        <button style={cs.secondaryBtn} onClick={onHome}>🏠 Back to Home</button>
      </div>
    </div>
  );
}

/* ── Orders Page ── */
function OrdersPage({ orders, onCancel, onReorder, onReport, onTrack, onRequestReplacement, onDownloadInvoice }) {
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const canRequestReplacement = (order) => {
    if (!order || order.trackingStatus !== "DELIVERED" || order.replacementRequested) return false;
    if (!order.orderDate) return false;
    const orderTime = new Date(order.orderDate).getTime();
    if (Number.isNaN(orderTime)) return false;
    return Date.now() - orderTime <= 7 * 24 * 60 * 60 * 1000;
  };

  // ── COD PENDING REMINDER ──
  const pendingCodOrders = orders.filter(o => (o.paymentMode || "").toUpperCase() === "COD" && o.paymentStatus !== "RECEIVED" && o.trackingStatus !== "DELIVERED");
  const totalPendingAmount = pendingCodOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div>
      <h2 style={cs.pageTitle}>Order History 📦</h2>
      {/* ── COD PENDING REMINDER BANNER ── */}
      {pendingCodOrders.length > 0 && (
        <div style={{ background: "rgba(236,72,153,0.1)", border: "2px solid rgba(236,72,153,0.3)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>💵</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#f472b6", fontWeight: 700, fontSize: 14 }}>
              {pendingCodOrders.length} COD Order{pendingCodOrders.length > 1 ? "s" : ""} — Payment Due: ₹{Math.round(totalPendingAmount).toLocaleString("en-IN")}
            </div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>Have exact change ready for faster checkout when delivery arrives</div>
          </div>
        </div>
      )}
      {orders.length === 0 ? <div style={cs.empty}>No orders yet 📦</div> : orders.map(o => (
        <div key={o.id} style={cs.orderCard}>
          <div style={cs.orderHeader}>
            <div>
              <span style={cs.orderId}>Order #{o.id}</span>
              <span style={{ marginLeft: 12, color: "#9ca3af", fontSize: 13 }}>
                {o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...cs.statusBadge, background: statusColor[o.trackingStatus] || "#6b7280" }}>
                {o.trackingStatus?.replace(/_/g, " ")}
              </span>
              {/* ── COD PAYMENT STATUS ── */}
              {(o.paymentMode || "").toUpperCase() === "COD" && (
                <span style={{ ...cs.statusBadge, background: o.paymentStatus === "RECEIVED" ? "rgba(34,197,94,0.12)" : "rgba(236,72,153,0.12)", color: o.paymentStatus === "RECEIVED" ? "#4ade80" : "#f472b6", fontSize: 11, fontWeight: 700 }}>
                  💵 {o.paymentStatus === "RECEIVED" ? "Paid" : "₹" + Math.round(o.amount || 0).toLocaleString("en-IN")}
                </span>
              )}
              {o.replacementRequested && (
                <span style={{ ...cs.statusBadge, background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>
                  Replacement Requested
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            {(o.items || []).map((item, i) => (
              <div key={i} style={cs.orderItem}>
                <span style={{ color: "#e5e7eb" }}>{item.name}</span>
                <span style={{ color: "#9ca3af", fontSize: 13 }}> × {item.quantity} — {fmt(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, cursor: "pointer", color: "#6366f1", fontSize: 13 }} onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
            {expandedOrder === o.id ? "▲ Hide details" : "▼ Show details"}
          </div>

          {expandedOrder === o.id && (
            <div style={{ marginTop: 12, padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Amount", fmt(o.amount || o.totalPrice)],
                  ["Delivery Charge", o.deliveryCharge > 0 ? fmt(o.deliveryCharge) : "FREE"],
                  ["GST", o.gstAmount > 0 ? fmt(o.gstAmount) : "Included"],
                  ["Payment Mode", (o.paymentMode || "").toUpperCase() === "COD" ? "💵 Cash on Delivery" : "💳 Online Payment"],
                  ...(((o.paymentMode || "").toUpperCase() === "COD") ? [["Payment Status", o.paymentStatus === "RECEIVED" ? "✓ Paid" : "⏳ Pending"]] : []),
                  ["Delivery By", o.deliveryTime || "Standard (3–5 days)"],
                  ...(o.razorpay_payment_id ? [["Payment ID", o.razorpay_payment_id]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>{k}: </span>
                    <span style={{ color: o.paymentStatus === "RECEIVED" ? "#4ade80" : "#e5e7eb", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              {o.deliveryAddress && <div style={{ marginTop: 8, fontSize: 13, color: "#9ca3af" }}>📍 {o.deliveryAddress}</div>}
              {/* ── COD AMOUNT DUE REMINDER ── */}
              {(o.paymentMode || "").toUpperCase() === "COD" && o.paymentStatus !== "RECEIVED" && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(236,72,153,0.1)", borderRadius: 8, border: "1px solid rgba(236,72,153,0.2)" }}>
                  <div style={{ color: "#f472b6", fontSize: 12, fontWeight: 600 }}>⚠️ Amount Due: ₹{Math.round(o.amount || 0).toLocaleString("en-IN")}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>Ready payment at delivery for smooth checkout</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...cs.detailPrice, fontSize: 20 }}>{fmt(o.amount || o.totalPrice)}</span>
            <button style={cs.outlineBtn} onClick={() => onTrack(o)}>🚚 Track</button>
            {["PLACED", "CONFIRMED"].includes(o.trackingStatus) && (
              <button style={cs.cancelBtn} onClick={() => setCancelConfirm(o.id)}>Cancel Order</button>
            )}
            {o.trackingStatus === "DELIVERED" && (
              <>
                <button style={cs.outlineBtn} onClick={() => onReorder(o.id)}>🔄 Reorder</button>
                {onDownloadInvoice && (
                  <button
                    style={{ ...cs.outlineBtn, borderColor: "rgba(34,197,94,0.4)", color: "#22c55e" }}
                    onClick={() => onDownloadInvoice(o.id)}
                    title="Download invoice PDF for this order"
                  >
                    📄 Download Invoice
                  </button>
                )}
                {canRequestReplacement(o) && (
                  <button
                    style={{ ...cs.outlineBtn, borderColor: "rgba(245,158,11,0.4)", color: "#fbbf24" }}
                    onClick={() => onRequestReplacement(o.id)}
                  >
                    🔁 Request Replacement
                  </button>
                )}
                <button style={{ ...cs.cancelBtn, borderColor: "rgba(234,179,8,0.4)", color: "#fbbf24" }}
                  onClick={() => onReport(o)}>⚠️ Report Issue</button>
              </>
            )}
          </div>
        </div>
      ))}

      {cancelConfirm && (
        <div style={cs.overlay}>
          <div style={cs.dialog}>
            <h3 style={{ color: "#e5e7eb", marginBottom: 8 }}>Cancel Order?</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>Are you sure you want to cancel this order? This cannot be undone.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...cs.cancelBtn, flex: 1 }} onClick={() => { onCancel(cancelConfirm); setCancelConfirm(null); }}>Yes, Cancel</button>
              <button style={cs.secondaryBtn} onClick={() => setCancelConfirm(null)}>Go Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Track Orders Page ── */
function TrackOrdersPage({ orders, onSelectOrder }) {
  // Terminal statuses — not shown in active pipeline
  const TERMINAL = new Set(["DELIVERED", "CANCELLED", "REFUNDED"]);
  const active  = orders.filter(o => !TERMINAL.has(o.trackingStatus));
  const history = orders.filter(o =>  TERMINAL.has(o.trackingStatus));

  // Pipeline matching the actual TrackingStatus enum order
  const PIPELINE = [
    { key: "PROCESSING",       label: "Processing" },
    { key: "PACKED",           label: "Packed" },
    { key: "SHIPPED",          label: "Shipped" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
    { key: "DELIVERED",        label: "Delivered" },
  ];

  // progressPercent values mirrored from the TrackingStatus enum
  const PROGRESS = { PROCESSING: 0, PACKED: 15, SHIPPED: 33, OUT_FOR_DELIVERY: 66, DELIVERED: 100, REFUNDED: 100, CANCELLED: 0 };

  const TrackCard = ({ o }) => {
    const pct     = PROGRESS[o.trackingStatus] ?? 0;
    const pipeIdx = PIPELINE.findIndex(s => s.key === o.trackingStatus);
    const terminal = TERMINAL.has(o.trackingStatus);

    return (
      <div style={cs.orderCard}>
        <div style={cs.orderHeader}>
          <div>
            <span style={cs.orderId}>Order #{o.id}</span>
            <span style={{ marginLeft: 12, color: "#9ca3af", fontSize: 13 }}>
              {o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN") : ""}
            </span>
          </div>
          <span style={{ ...cs.statusBadge, background: statusColor[o.trackingStatus] || "#6b7280" }}>
            {o.trackingStatus?.replace(/_/g, " ")}
          </span>
        </div>

        {/* Continuous progress bar + step dots (skipped for terminal orders) */}
        {!terminal && (
          <div style={{ marginTop: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ color: "#9ca3af", fontSize: 11 }}>Order progress</span>
              <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#22c55e)", borderRadius: 3, width: `${pct}%`, transition: "width .4s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
              <div style={{ position: "absolute", top: 10, left: "5%", right: "5%", height: 1, background: "rgba(255,255,255,0.08)", zIndex: 0 }} />
              {PIPELINE.map((step, i) => {
                const done    = i <= pipeIdx;
                const current = i === pipeIdx;
                return (
                  <div key={step.key} style={{ textAlign: "center", flex: 1, position: "relative", zIndex: 1 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", margin: "0 auto 5px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, background: done ? (current ? "#6366f1" : "#22c55e") : "rgba(255,255,255,0.1)", color: done ? "#fff" : "#6b7280", border: current ? "2px solid #6366f1" : "none" }}>
                      {done && !current ? "✓" : i + 1}
                    </div>
                    <div style={{ fontSize: 9, color: done ? (current ? "#a5b4fc" : "#22c55e") : "#6b7280", fontWeight: 600, lineHeight: 1.2 }}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {o.currentCity && <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>📍 Currently in: <strong style={{ color: "#e5e7eb" }}>{o.currentCity}</strong></div>}
        {o.deliveryTime && !terminal && <div style={{ color: "#9ca3af", fontSize: 13 }}>🕐 Est. Delivery: <strong style={{ color: "#e5e7eb" }}>{o.deliveryTime}</strong></div>}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button style={{ ...cs.addCartBtn, padding: "8px 20px", fontSize: 13 }} onClick={() => onSelectOrder(o)}>
            {terminal ? "View Details →" : "Live Track →"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 style={cs.pageTitle}>Track Orders 🚚</h2>
      {active.length === 0 && history.length === 0 && <div style={cs.empty}>No orders to track 📦</div>}
      {active.length > 0 && (
        <section style={cs.section}>
          <h3 style={{ ...cs.secTitle, fontSize: 18 }}>Active Orders ({active.length})</h3>
          {active.map(o => <TrackCard key={o.id} o={o} />)}
        </section>
      )}
      {history.length > 0 && (
        <section style={cs.section}>
          <h3 style={{ ...cs.secTitle, fontSize: 18 }}>Past Orders</h3>
          {history.slice(0, 5).map(o => <TrackCard key={o.id} o={o} />)}
        </section>
      )}
    </div>
  );
}

/* ── Track Single Order ── */
function TrackSingleOrderPage({ order: o, onBack }) {
  const { auth } = useAuth();
  const [tracking, setTracking] = useState(null);   // server response
  const [loadErr, setLoadErr] = useState(false);
  
  // Report issue state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ reason: "", description: "" });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState(null);

  // All statuses in pipeline order — includes PACKED which the old hardcoded list missed
  const PIPELINE = [
    { key: "PROCESSING",       label: "Order Placed",      icon: "📋", sub: "Your order has been confirmed" },
    { key: "PACKED",           label: "Packed",            icon: "📦", sub: "Vendor has packed your order" },
    { key: "SHIPPED",          label: "Shipped",           icon: "🚚", sub: "Your order is on the way" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery",  icon: "🛵", sub: "Delivery partner is nearby" },
    { key: "DELIVERED",        label: "Delivered",         icon: "✅", sub: "Order delivered successfully" },
  ];
  const TERMINAL = { CANCELLED: "❌", REFUNDED: "♻️" };

  useEffect(() => {
    if (!o?.id) return;
    const headers = { "Content-Type": "application/json" };
    if (auth?.token)    headers["Authorization"]  = `Bearer ${auth.token}`;
    if (auth?.id)       headers["X-Customer-Id"]  = auth.id;

    fetch(`/api/react/orders/${o.id}/track`, { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setTracking(d); else setLoadErr(true); })
      .catch(() => setLoadErr(true));
  }, [o?.id]);

  // Prefer server status; fall back to order object while loading
  const currentStatus = tracking?.currentStatus || o.trackingStatus;
  const currentCity   = tracking?.currentCity   || o.currentCity;
  const progress      = tracking?.progressPercent ?? null;
  const estDelivery   = tracking?.estimatedDelivery;
  const history       = tracking?.history || [];   // real timestamped events from DB

  const isTerminal   = !!TERMINAL[currentStatus];
  const pipelineIdx  = PIPELINE.findIndex(s => s.key === currentStatus);
  // For cancelled/refunded use last pipeline step reached (from history) or -1
  const effectiveIdx = isTerminal
    ? PIPELINE.findIndex(s => history.some(e => e.status === s.key))
    : pipelineIdx;

  // Sidebar info rows — always from the order object (ground truth for amounts etc.)
  const infoRows = [
    ["Amount",    fmt(o.amount || o.totalPrice)],
    ["Payment",   o.paymentMode || "COD"],
    ...(estDelivery ? [["Est. Delivery", new Date(estDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })]] : (o.deliveryTime ? [["Delivery By", o.deliveryTime]] : [])),
    ...(currentCity ? [["Current Location", currentCity]] : []),
    ...(o.deliveryAddress ? [["Delivery Address", o.deliveryAddress]] : []),
  ];

  // Handle report issue form submission
  const handleReportIssue = async () => {
    if (!reportForm.reason.trim()) {
      setReportError("Please select or enter a reason for reporting this issue");
      return;
    }

    setReportLoading(true);
    setReportError(null);

    try {
      const headers = { "Content-Type": "application/json" };
      if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
      if (auth?.id) headers["X-Customer-Id"] = auth.id;

      const response = await fetch(`/api/react/orders/${o.id}/report-issue`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          reason: reportForm.reason,
          description: reportForm.description,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportForm({ reason: "", description: "" });
          setReportSuccess(false);
        }, 2000);
      } else {
        setReportError(data.message || "Failed to report issue. Please try again.");
      }
    } catch (err) {
      setReportError("Network error: " + err.message);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div>
      <button style={cs.backBtn} onClick={onBack}>← Back to Track Orders</button>
      <h2 style={cs.pageTitle}>Track Your Order 🗺️</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

        {/* Left: progress + timeline */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>

          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: 13 }}>Order ID</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>#{o.id}</div>
            </div>
            <span style={{ ...cs.statusBadge, background: statusColor[currentStatus] || "#6b7280", height: "fit-content" }}>
              {isTerminal ? TERMINAL[currentStatus] + " " : ""}{currentStatus?.replace(/_/g, " ")}
            </span>
          </div>

          {/* Progress bar (server progressPercent or derived) */}
          {!isTerminal && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>Progress</span>
                <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>
                  {progress != null ? progress : Math.round((Math.max(0, pipelineIdx) / (PIPELINE.length - 1)) * 100)}%
                </span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3, transition: "width .6s ease",
                  background: "linear-gradient(90deg,#6366f1,#22c55e)",
                  width: `${progress != null ? progress : Math.round((Math.max(0, pipelineIdx) / (PIPELINE.length - 1)) * 100)}%`,
                }} />
              </div>
            </div>
          )}

          {/* Pipeline steps */}
          <div style={{ position: "relative", marginBottom: history.length > 0 ? 32 : 0 }}>
            <div style={{ position: "absolute", left: 19, top: 24, bottom: 24, width: 2, background: "rgba(255,255,255,0.1)" }} />
            {PIPELINE.map((step, i) => {
              const done    = !isTerminal && i <= pipelineIdx;
              const current = !isTerminal && i === pipelineIdx;
              // For terminal orders shade steps that actually happened
              const reached = isTerminal && i <= effectiveIdx;
              const active  = done || reached;
              return (
                <div key={step.key} style={{ display: "flex", gap: 16, marginBottom: 20, position: "relative" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0, zIndex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    background: active ? (current ? "#6366f1" : "#22c55e20") : "rgba(255,255,255,0.06)",
                    border: `2px solid ${active ? (current ? "#6366f1" : "#22c55e") : "rgba(255,255,255,0.12)"}`,
                    color: active ? (current ? "#fff" : "#22c55e") : "#4b5563",
                  }}>
                    {active && !current ? "✓" : step.icon}
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ color: active ? "#e5e7eb" : "#6b7280", fontWeight: current ? 700 : 500, fontSize: 15 }}>
                      {step.label}
                    </div>
                    <div style={{ color: active ? "#9ca3af" : "#374151", fontSize: 13 }}>{step.sub}</div>
                  </div>
                </div>
              );
            })}
            {isTerminal && (
              <div style={{ display: "flex", gap: 16, position: "relative" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "rgba(239,68,68,0.15)", border: "2px solid #ef4444" }}>
                  {TERMINAL[currentStatus]}
                </div>
                <div style={{ paddingTop: 8 }}>
                  <div style={{ color: "#f87171", fontWeight: 700, fontSize: 15 }}>{currentStatus}</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>
                    {currentStatus === "CANCELLED" ? "This order was cancelled" : "Refund has been processed"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Real event log from DB — the key addition */}
          {history.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20 }}>
              <h3 style={{ color: "#e5e7eb", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                📍 Tracking History
              </h3>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 1, background: "rgba(255,255,255,0.1)" }} />
                {history.map((ev, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16, position: "relative" }}>
                    <div style={{ width: 15, height: 15, borderRadius: "50%", background: i === history.length - 1 ? "#6366f1" : "#22c55e", flexShrink: 0, marginTop: 3, zIndex: 1 }} />
                    <div>
                      <div style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 600 }}>
                        {ev.description || ev.status?.replace(/_/g, " ")}
                      </div>
                      {ev.location && (
                        <div style={{ color: "#9ca3af", fontSize: 12 }}>📍 {ev.location}</div>
                      )}
                      {ev.timestamp && (
                        <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
                          {new Date(ev.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading / error state */}
          {!tracking && !loadErr && (
            <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", paddingTop: 8 }}>
              Loading live tracking data…
            </div>
          )}
          {loadErr && (
            <div style={{ color: "#f87171", fontSize: 13, textAlign: "center", paddingTop: 8 }}>
              Could not load live tracking. Showing last known status.
            </div>
          )}
        </div>

        {/* Right: shipment info + items */}
        <div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <h3 style={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Shipment Info</h3>
            {infoRows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 }}>
                <span style={{ color: "#9ca3af" }}>{k}</span>
                <span style={{ color: "#e5e7eb", fontWeight: 600, textAlign: "right", maxWidth: 160 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Items Ordered</h3>
            {(o.items || []).map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#e5e7eb" }}>{item.name} × {item.quantity}</span>
                <span style={{ color: "#9ca3af" }}>{fmt(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Report Issue Button */}
          <button
            style={{
              width: "100%",
              padding: 12,
              marginTop: 16,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 12,
              color: "#fca5a5",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => setShowReportModal(true)}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(239, 68, 68, 0.2)";
              e.target.style.borderColor = "rgba(239, 68, 68, 0.5)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(239, 68, 68, 0.1)";
              e.target.style.borderColor = "rgba(239, 68, 68, 0.3)";
            }}
          >
            🚨 Report Issue
          </button>
        </div>
      </div>

      {/* Report Issue Modal */}
      {showReportModal && createPortal(
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#1a1a2e",
            borderRadius: 16,
            padding: 28,
            maxWidth: 500,
            width: "90%",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Report an Issue 🚨</h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportError(null);
                  setReportForm({ reason: "", description: "" });
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            {reportSuccess && (
              <div style={{
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                color: "#86efac",
                fontSize: 13,
              }}>
                ✓ Your issue has been reported. Our support team will review it shortly!
              </div>
            )}

            {reportError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                color: "#fca5a5",
                fontSize: 13,
              }}>
                ⚠️ {reportError}
              </div>
            )}

            {!reportSuccess && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: "#e5e7eb", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Reason for Issue *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Wrong item delivered, Damaged product, Late delivery..."
                    value={reportForm.reason}
                    onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#e5e7eb", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Additional Details (Optional)
                  </label>
                  <textarea
                    placeholder="Please provide more details about the issue..."
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 13,
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      setReportError(null);
                      setReportForm({ reason: "", description: "" });
                    }}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#e5e7eb",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => e.target.style.background = "rgba(255,255,255,0.12)"}
                    onMouseOut={(e) => e.target.style.background = "rgba(255,255,255,0.08)"}
                    disabled={reportLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReportIssue}
                    disabled={reportLoading}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: reportLoading ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.8)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: reportLoading ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      if (!reportLoading) {
                        e.target.style.background = "rgba(99,102,241,1)";
                        e.target.style.borderColor = "rgba(99,102,241,0.6)";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!reportLoading) {
                        e.target.style.background = "rgba(99,102,241,0.8)";
                        e.target.style.borderColor = "rgba(99,102,241,0.3)";
                      }
                    }}
                  >
                    {reportLoading ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Coupons Page ── */
function CouponsPage({ coupons, showToast }) {
  const copyCoupon = (code) => {
    navigator.clipboard.writeText(code).then(() => showToast(`Copied: ${code} ✓`));
  };

  return (
    <div>
      <h2 style={cs.pageTitle}>Available Coupons 🎟️</h2>
      {coupons.length === 0 ? (
        <div style={cs.empty}>No coupons available right now 😔<br /><span style={{ fontSize: 14 }}>Check back later for exclusive deals!</span></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {coupons.map((c, i) => (
            <div key={i} style={cs.couponCard}>
              <div style={cs.couponStripe} />
              <div style={cs.couponBody}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={cs.couponCode}>{c.code}</div>
                  <div style={cs.couponValue}>{c.typeLabel || `${c.value}% OFF`}</div>
                </div>
                <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{c.description || "Apply this coupon at checkout"}</p>
                {c.expiryDate && (
                  <div style={{ color: "#f59e0b", fontSize: 12, marginBottom: 12 }}>
                    ⏳ Expires: {new Date(c.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                )}
                <button style={{ ...cs.addCartBtn, width: "100%", padding: "10px" }} onClick={() => copyCoupon(c.code)}>
                  📋 Copy Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Spending Page ── */
function SpendingPage({ data, orders, onLoadOrders }) {
  useEffect(() => { if (!orders || orders.length === 0) onLoadOrders(); }, []);

  const totalSpent   = data?.totalSpent   || orders?.filter(o => o.trackingStatus === "DELIVERED").reduce((s, o) => s + (o.amount || 0), 0) || 0;
  const totalOrders  = data?.totalOrders  || orders?.length || 0;
  const avgOrder     = data?.averageOrderValue || (totalOrders > 0 ? totalSpent / totalOrders : 0);
  const topCategory  = data?.topCategory  || "—";

  // ── Monthly: prefer server data, fall back to client-computed from orders ──
  const months = (() => {
    if (data?.monthlySpending && Object.keys(data.monthlySpending).length > 0) {
      return Object.entries(data.monthlySpending).slice(-6).map(([k, v]) => {
        // Server returns "2026-03" — convert to "Mar '26" for display
        const [yr, mo] = k.split("-");
        const label = mo && yr
          ? new Date(Number(yr), Number(mo) - 1).toLocaleString("en-IN", { month: "short", year: "2-digit" })
          : k;
        return [label, v];
      });
    }
    const acc = {};
    (orders || []).forEach(o => {
      if (!o.orderDate) return;
      const d = new Date(o.orderDate);
      const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      acc[key] = (acc[key] || 0) + (o.amount || 0);
    });
    return Object.entries(acc).slice(-6);
  })();
  const maxMonthSpend = Math.max(...months.map(([, v]) => v), 1);

  // ── Category breakdown: from server data ──
  const categoryEntries = data?.categorySpending
    ? Object.entries(data.categorySpending).sort(([, a], [, b]) => b - a)
    : [];
  const maxCatSpend = Math.max(...categoryEntries.map(([, v]) => v), 1);

  const catColors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#10b981"];

  return (
    <div>
      <h2 style={cs.pageTitle}>My Spending 💰</h2>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Spent",   value: fmt(totalSpent),  icon: "💰", color: "#22c55e" },
          { label: "Total Orders",  value: totalOrders,      icon: "📦", color: "#6366f1" },
          { label: "Avg Order",     value: fmt(avgOrder),    icon: "📊", color: "#f59e0b" },
          { label: "Top Category",  value: topCategory,      icon: "🏆", color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8, width: 44, height: 44, borderRadius: 12, background: s.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: categoryEntries.length > 0 ? "1fr 1fr" : "1fr", gap: 20, marginBottom: 24 }}>

        {/* ── Monthly bar chart ── */}
        {months.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <h3 style={{ ...cs.secTitle, marginBottom: 24, fontSize: 16 }}>Monthly Spending</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140 }}>
              {months.map(([month, amount]) => (
                <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{fmt(amount)}</div>
                  <div style={{ width: "100%", background: "linear-gradient(180deg, #6366f1, #8b5cf6)", borderRadius: "4px 4px 0 0", height: `${(amount / maxMonthSpend) * 110}px`, minHeight: 4 }} />
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{month}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Category breakdown ── */}
        {categoryEntries.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <h3 style={{ ...cs.secTitle, marginBottom: 20, fontSize: 16 }}>Spending by Category</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {categoryEntries.slice(0, 6).map(([cat, amount], i) => (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 500 }}>{cat}</span>
                    <span style={{ color: "#9ca3af", fontSize: 13 }}>{fmt(amount)}</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${(amount / maxCatSpend) * 100}%`, height: "100%", background: catColors[i % catColors.length], borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Last Order Date Banner ── */}
      {(() => {
        const lastOrder = (orders || []).filter(o => o.orderDate).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))[0];
        if (!lastOrder) return null;
        const formatted = new Date(lastOrder.orderDate).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "10px 16px", marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>🕐</span>
            <span style={{ color: "#9ca3af", fontSize: 13 }}>Last order placed on</span>
            <span style={{ color: "#e5e7eb", fontWeight: 600, fontSize: 13 }}>{formatted}</span>
          </div>
        );
      })()}

      {/* ── Order Breakdown Table ── */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
        {/* Section heading with receipt icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 24px 0" }}>
          <span style={{ fontSize: 16, color: "#f59e0b" }}>🧾</span>
          <h3 style={{ ...cs.secTitle, marginBottom: 0, fontSize: 16 }}>Order Breakdown</h3>
        </div>

        {(orders || []).length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                  {["Order ID", "Date", "Items", "Payment", "Amount"].map(h => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.07)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orders || []).map((o, idx) => {
                  const isCod = !o.paymentMode || o.paymentMode === "Cash on Delivery" || o.paymentMode === "COD";
                  const itemNames = (o.items || []).map(i => i.name || i.productName).filter(Boolean).join(", ") || "—";
                  const dateStr = o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                  return (
                    <tr key={o.id} style={{ borderBottom: idx < (orders.length - 1) ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      {/* Order ID */}
                      <td style={{ padding: "12px 20px", fontWeight: 700, color: "#f59e0b", fontSize: 14, whiteSpace: "nowrap" }}>#{o.id}</td>
                      {/* Date */}
                      <td style={{ padding: "12px 20px", color: "#9ca3af", fontSize: 13, whiteSpace: "nowrap" }}>{dateStr}</td>
                      {/* Item names */}
                      <td style={{ padding: "12px 20px", color: "#e5e7eb", fontSize: 13, maxWidth: 260 }}>
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{itemNames}</span>
                      </td>
                      {/* Payment mode */}
                      <td style={{ padding: "12px 20px", whiteSpace: "nowrap" }}>
                        {isCod
                          ? <span style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>💵 COD</span>
                          : <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>💳 Online</span>
                        }
                      </td>
                      {/* Amount */}
                      <td style={{ padding: "12px 20px", color: "#22c55e", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>{fmt(o.amount || o.totalPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ ...cs.empty, paddingTop: 40 }}>
            🛍️ No orders yet. <span style={{ color: "#6366f1", cursor: "pointer" }}>Start shopping!</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reorder Stock Check Modal ── */
function ReorderStockModal({ stockCheck, onClose, onConfirm }) {
  const { orderId, items } = stockCheck;
  const [confirming, setConfirming] = useState(false);

  const statusMeta = {
    in_stock:    { icon: "✅", color: "#22c55e", label: "In stock" },
    partial:     { icon: "⚠️", color: "#f59e0b", label: "Partial stock" },
    out_of_stock:{ icon: "❌", color: "#ef4444", label: "Out of stock" },
    unavailable: { icon: "🚫", color: "#6b7280", label: "Unavailable" },
  };

  const canProceed = items.some(i => i.status === "in_stock" || i.status === "partial");
  const allUnavailable = items.every(i => i.status === "out_of_stock" || i.status === "unavailable");

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(orderId);
  };

  return (
    <div style={cs.overlay}>
      <div style={{ ...cs.dialog, maxWidth: 520, textAlign: "left" }}>
        <h3 style={{ color: "#fff", marginBottom: 4 }}>🔄 Reorder Stock Check</h3>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>
          Some items from this order have limited or no stock. Review before proceeding.
        </p>

        {/* Item list */}
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 110px", gap: 8, padding: "8px 14px", background: "rgba(255,255,255,0.06)", fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>Item</span><span style={{ textAlign: "center" }}>Ordered</span><span style={{ textAlign: "center" }}>Available</span><span style={{ textAlign: "center" }}>Status</span>
          </div>
          {items.map((item, i) => {
            const meta = statusMeta[item.status] || statusMeta.unavailable;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 110px", gap: 8, padding: "10px 14px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", alignItems: "center", background: item.status === "in_stock" ? "transparent" : "rgba(255,255,255,0.02)" }}>
                <span style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 500 }}>{item.name}</span>
                <span style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>{item.quantity}</span>
                <span style={{ color: item.status === "in_stock" ? "#22c55e" : item.status === "partial" ? "#f59e0b" : "#ef4444", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                  {item.status === "unavailable" ? "—" : item.currentStock}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                  <span>{meta.icon}</span>
                  <span style={{ color: meta.color, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Contextual message */}
        {allUnavailable ? (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 20 }}>
            ❌ All items are currently out of stock. Reorder is not possible right now.
          </div>
        ) : (
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fcd34d", fontSize: 13, marginBottom: 20 }}>
            ⚠️ Available items will be added at current prices. Out-of-stock items will be skipped.
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          {canProceed && (
            <button style={{ ...cs.addCartBtn, flex: 1 }} onClick={handleConfirm} disabled={confirming}>
              {confirming ? "Adding to cart…" : "Proceed with Available Items"}
            </button>
          )}
          <button style={cs.secondaryBtn} onClick={onClose}>
            {allUnavailable ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Report Issue Modal ── */
function ReportIssueModal({ order, onClose, onSubmit, api }) {
  const [reason, setReason]       = useState("");
  const [details, setDetails]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Phase 2 — after submit
  const [refundId, setRefundId]   = useState(null);
  const [files, setFiles]         = useState([]);
  const [previews, setPreviews]   = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef(null);

  const reasons = ["Damaged/Defective Product", "Wrong Item Delivered", "Missing Items", "Quality Not as Expected", "Delivery Issue", "Other"];

  const handleSubmit = async () => {
    if (!reason) { alert("Please select a reason"); return; }
    setSubmitting(true);
    const rid = await onSubmit(order.id, { reason, details, type: "REFUND" });
    setSubmitting(false);
    if (rid) {
      setRefundId(rid);   // move to upload phase
    } else {
      onClose();          // no refundId but dispute logged — just close
    }
  };

  const onFilesChange = (e) => {
    const slotsLeft = 5 - uploadedCount;
    const picked = Array.from(e.target.files).slice(0, slotsLeft);
    setFiles(picked);
    setPreviews(picked.map(f => URL.createObjectURL(f)));
    setUploadMsg("");
  };

  const doUpload = async () => {
    if (!files.length || !refundId) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const form = new FormData();
      files.forEach(f => form.append("images", f));
      const d = await api(`/refund/${refundId}/upload-image`, {
        method: "POST",
        body: form,
        headers: {},  // let browser set multipart boundary
      });
      if (d.success) {
        setUploadMsg(`✓ ${d.uploaded} photo${d.uploaded !== 1 ? "s" : ""} uploaded`);
        setUploadedCount(c => c + d.uploaded);
        setFiles([]);
        setPreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setUploadMsg(`✗ ${d.message || "Upload failed"}`);
      }
    } catch {
      setUploadMsg("✗ Upload failed — please try again");
    }
    setUploading(false);
  };

  const slotsLeft = 5 - uploadedCount;

  /* ── Phase 1: fill in reason + details ── */
  if (!refundId) {
    return (
      <div style={cs.overlay}>
        <div style={{ ...cs.dialog, maxWidth: 500, textAlign: "left" }}>
          <h3 style={{ color: "#fff", marginBottom: 4 }}>⚠️ Report an Issue</h3>
          <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>Order #{order.id}</p>

          <label style={cs.label}>Reason for Return / Refund *</label>
          <select style={{ ...cs.searchInput, width: "100%", marginBottom: 16 }} value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">Select a reason...</option>
            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <label style={cs.label}>Additional Details</label>
          <textarea style={{ ...cs.reviewInput, marginBottom: 20, width: "100%", boxSizing: "border-box" }}
            placeholder="Describe the issue in detail..." value={details} onChange={e => setDetails(e.target.value)} />

          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ ...cs.addCartBtn, flex: 1 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
            <button style={cs.secondaryBtn} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Phase 2: refund created — upload evidence photos ── */
  return (
    <div style={cs.overlay}>
      <div style={{ ...cs.dialog, maxWidth: 500, textAlign: "left" }}>

        {/* success header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <h3 style={{ color: "#22c55e", margin: 0 }}>Issue Reported!</h3>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>
            Order #{order.id} · Refund #{refundId}
          </p>
        </div>

        {/* upload box */}
        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: "16px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 4 }}>
            📎 Upload Evidence Photos <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
          </p>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            Add up to 5 photos to support your refund request. JPG, PNG or WEBP · max 5 MB each.
          </p>

          {uploadedCount > 0 && (
            <div style={{ marginBottom: 10, fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
              ✓ {uploadedCount} photo{uploadedCount !== 1 ? "s" : ""} uploaded so far
            </div>
          )}

          {slotsLeft > 0 ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={onFilesChange}
                style={{ fontSize: 12, color: "#d1d5db", display: "block", marginBottom: 10, width: "100%", cursor: "pointer" }}
              />

              {previews.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt={`preview ${i + 1}`}
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "2px solid rgba(99,102,241,0.5)" }} />
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  style={{ ...cs.addCartBtn, opacity: files.length === 0 || uploading ? 0.5 : 1, cursor: files.length === 0 || uploading ? "not-allowed" : "pointer" }}
                  onClick={doUpload}
                  disabled={files.length === 0 || uploading}
                >
                  {uploading ? "Uploading…" : files.length > 0 ? `Upload ${files.length} Photo${files.length !== 1 ? "s" : ""}` : "Select Photos First"}
                </button>
                {files.length > 0 && !uploading && (
                  <button style={{ ...cs.secondaryBtn, fontSize: 12, padding: "6px 12px" }}
                    onClick={() => { setFiles([]); setPreviews([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                    Clear
                  </button>
                )}
              </div>

              {uploadMsg && (
                <p style={{ marginTop: 8, fontSize: 12, color: uploadMsg.startsWith("✓") ? "#22c55e" : "#ef4444" }}>
                  {uploadMsg}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: "#6b7280" }}>Maximum 5 photos uploaded.</p>
          )}
        </div>

        <button style={{ ...cs.addCartBtn, width: "100%", marginTop: 16 }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

/* ── Wishlist ── */
function WishlistPage({ wishlistIds, products, onRemove, onAddToCart, onSelectProduct }) {
  const wishlisted = products.filter(p => wishlistIds.includes(p.id));
  return (
    <div>
      <h2 style={cs.pageTitle}>My Wishlist ❤️</h2>
      {wishlisted.length === 0 ? <div style={cs.empty}>No items in wishlist</div> : (
        <div style={cs.productGrid}>
          {wishlisted.map(p => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
              onAddToCart={onAddToCart} onToggleWishlist={onRemove} isWishlisted={true} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Profile Page ── */
function ProfilePage({ profile, api, onUpdate, showToast }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({ name: "", mobile: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [addForm, setAddForm] = useState({ recipientName: "", houseStreet: "", city: "", state: "", postalCode: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [saving, setSaving] = useState(false);
  const [addrErrors, setAddrErrors] = useState({});
  const [addrPinMismatch, setAddrPinMismatch] = useState("");
  const { auth } = useAuth();
  const homePin = (localStorage.getItem("ekart_delivery_pin") || "");

  useEffect(() => {
    if (profile) setForm({ name: profile.name || "", mobile: profile.mobile || "" });
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    const d = await api("/profile/update", { method: "PUT", body: JSON.stringify(form) });
    showToast(d.message || (d.success ? "Saved!" : "Error"));
    if (d.success) onUpdate();
    setSaving(false);
  };

  const setAF = (k, v) => {
    setAddForm(f => ({ ...f, [k]: v }));
    setAddrErrors(e => ({ ...e, [k]: "" }));
    if (k === "postalCode") {
      const pin = v.replace(/\D/g, "").slice(0, 6);
      setAddrPinMismatch(pin.length === 6 && homePin && pin !== homePin ? pin : "");
    }
  };

  const validateAddr = () => {
    const e = {};
    if (!addForm.recipientName.trim() || addForm.recipientName.trim().length < 2) e.recipientName = "Please enter the recipient's name.";
    if (!addForm.houseStreet.trim() || addForm.houseStreet.trim().length < 5)     e.houseStreet   = "Please enter a house/street address.";
    if (!addForm.city.trim()  || addForm.city.trim().length  < 2)                 e.city          = "Please enter a city or locality.";
    if (!addForm.state.trim() || addForm.state.trim().length < 2)                 e.state         = "Please enter a state or province.";
    const pin = addForm.postalCode.replace(/\D/g, "");
    if (!isIndianPinAddr(pin)) e.postalCode = "Please enter a valid 6-digit Indian pin code.";
    else if (homePin && pin !== homePin) e.postalCode = `PIN mismatch — your delivery location is set to ${homePin}.`;
    setAddrErrors(e);
    return Object.keys(e).length === 0;
  };

  const addAddress = async () => {
    if (!validateAddr()) return;
    const d = await api("/profile/address/add", { method: "POST", body: JSON.stringify({ ...addForm, postalCode: addForm.postalCode.replace(/\D/g,"").slice(0,6) }) });
    showToast(d.message || (d.success ? "Address added!" : "Error"));
    if (d.success) { onUpdate(); setAddForm({ recipientName: "", houseStreet: "", city: "", state: "", postalCode: "" }); setAddrErrors({}); setAddrPinMismatch(""); }
  };

  const deleteAddress = async (id) => {
    await api(`/profile/address/${id}/delete`, { method: "DELETE" });
    showToast("Address removed"); onUpdate();
  };

  const changePw = async () => {
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strong.test(pwForm.newPassword)) {
      showToast("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNewPassword) { showToast("Passwords don't match"); return; }
    const d = await api("/profile/change-password", { method: "PUT", body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
    showToast(d.message || (d.success ? "Password changed!" : "Failed"));
    if (d.success) setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  };

  if (!profile) return <div style={cs.empty}>Loading profile...</div>;

  const tabs = [
    { key: "profile", label: "👤 Profile" },
    { key: "addresses", label: "📍 Addresses" },
    { key: "security", label: "🔐 Security" },
  ];

  return (
    <div>
      <h2 style={cs.pageTitle}>My Account</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} style={{ ...cs.navBtn, ...(activeTab === t.key ? cs.navBtnActive : {}), padding: "10px 20px" }}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div style={{ maxWidth: 480 }}>
          <div style={cs.profileCard}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {profile.profileImage || photoPreview ? (
                    <img src={photoPreview || profile.profileImage} alt="avatar" style={{ width: 96, height: 96, borderRadius: 48, objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                  ) : (
                    <div style={{ width: 96, height: 96, borderRadius: 48, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#fff" }}>{(profile.name || "?")[0].toUpperCase()}</div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input id="profileImageInput" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                      onChange={e => {
                        const f = e.target.files && e.target.files[0];
                        if (!f) return; setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f));
                      }} />
                    <button style={cs.saveBtn} onClick={() => document.getElementById("profileImageInput").click()}>Change Photo</button>
                    <button style={{ ...cs.secondaryBtn, height: 40 }} onClick={async () => {
                      // remove photo
                      if (!confirm("Remove profile photo?")) return;
                      try {
                        const opts = {};
                        if (auth?.token) opts.headers = { "Authorization": `Bearer ${auth.token}` };
                        else opts.credentials = 'include';
                        const res = await fetch("/api/profile/remove-image", opts);
                        const d = await res.json();
                        showToast(d.message || (d.success ? "Removed" : "Failed"));
                        if (d.success) onUpdate();
                      } catch (e) { showToast("Failed to remove photo"); }
                    }}>Remove</button>
                  </div>
                </div>
              </div>
            <div style={cs.fieldGroup}><label style={cs.label}>Name</label>
              <input style={cs.inputField} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div style={cs.fieldGroup}><label style={cs.label}>Email</label>
              <input style={{ ...cs.inputField, opacity: 0.6 }} value={profile.email} disabled /></div>
            <div style={cs.fieldGroup}><label style={cs.label}>Mobile</label>
              <input style={cs.inputField} value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} /></div>
            <button style={cs.saveBtn} onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
            {photoFile && (
              <div style={{ marginTop: 12 }}>
                <button style={cs.saveBtn} onClick={async () => {
                  const fd = new FormData(); fd.append('profileImage', photoFile);
                  try {
                    const opts = { method: 'POST', body: fd };
                    if (auth?.token) opts.headers = { 'Authorization': `Bearer ${auth.token}` };
                    else opts.credentials = 'include';
                    const res = await fetch('/api/profile/upload-image', opts);
                    const d = await res.json();
                    showToast(d.message || (d.success ? 'Uploaded' : 'Failed'));
                    if (d.success) { setPhotoFile(null); setPhotoPreview(null); onUpdate(); }
                  } catch (e) { showToast('Upload failed'); }
                }}>Upload Photo</button>
                <button style={{ ...cs.secondaryBtn, marginLeft: 8 }} onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "addresses" && (
        <div style={{ maxWidth: 600 }}>
          {/* Saved addresses list */}
          <div style={cs.profileCard}>
            <h3 style={cs.secTitle}>Saved Addresses</h3>
            {(profile.addresses || []).map(a => (
              <div key={a.id} style={cs.addressCard}>
                <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{a.recipientName}</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>{a.houseStreet}</div>
                <div style={{ color: "#9ca3af", fontSize: 13 }}>{[a.city, a.state].filter(Boolean).join(", ")}</div>
                {a.postalCode && <div style={{ fontSize: 12, fontWeight: 700, color: "#f5a800", marginTop: 4 }}>📍 {a.postalCode}</div>}
                <button style={{ ...cs.removeBtn, marginTop: 8 }} onClick={() => deleteAddress(a.id)}>🗑️ Remove</button>
              </div>
            ))}
            {(profile.addresses?.length === 0) && <p style={{ color: "#6b7280", fontSize: 14 }}>No addresses saved yet.</p>}
          </div>

          {/* Add new address */}
          <div style={cs.profileCard}>
            <h3 style={{ ...cs.secTitle, marginBottom: 16 }}>Add New Address</h3>

            {/* Home PIN hint */}
            {homePin && (
              <div style={{ background: "rgba(245,168,0,0.08)", border: "1px solid rgba(245,168,0,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                ℹ️ Your delivery location is set to PIN <strong style={{ color: "#f5a800" }}>{homePin}</strong>. The postal code must match.
              </div>
            )}

            <AddressMap onSelect={(r) => {
              setAddForm(f => ({
                ...f,
                houseStreet: r.display_name || f.houseStreet,
                city: (r.address && (r.address.city || r.address.town || r.address.village)) || f.city,
                state: (r.address && (r.address.state || r.address.region)) || f.state,
                postalCode: (r.address && (r.address.postcode || r.address.postal_code)) || f.postalCode,
              }));
            }} />

            {/* Fields with per-field validation */}
            {[
              ["recipientName", "Recipient Name", "Full name of the person receiving the order", {}],
              ["houseStreet",   "House / Building & Street", "e.g. Flat 4B, Sunrise Apts, MG Road", {}],
              ["city",          "City / Locality",  "e.g. Bengaluru", {}],
              ["state",         "State / Province", "e.g. Karnataka", {}],
              ["postalCode",    "Postal Code (PIN)", "6-digit PIN code", { inputMode: "numeric", maxLength: 6, numeric: true }],
            ].map(([k, label, placeholder, opts]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={cs.label}>{label}</label>
                <input
                  style={{ ...cs.inputField, ...(addrErrors[k] ? { borderColor: "rgba(255,100,80,0.6)" } : {}) }}
                  placeholder={placeholder}
                  value={addForm[k]}
                  inputMode={opts.inputMode}
                  maxLength={opts.maxLength}
                  onChange={e => setAF(k, opts.numeric ? e.target.value.replace(/\D/g,"").slice(0, opts.maxLength || 99) : e.target.value)}
                />
                {addrErrors[k] && <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{addrErrors[k]}</div>}
              </div>
            ))}

            {/* PIN mismatch warning */}
            {addrPinMismatch && homePin && (
              <div style={{ background: "rgba(255,96,60,0.1)", border: "1px solid rgba(255,96,60,0.4)", borderRadius: 8, padding: "10px 12px", marginBottom: 10, fontSize: 12, color: "#ff8060", lineHeight: 1.6 }}>
                <strong>⚠️ PIN mismatch</strong> — your delivery location is <strong style={{ color: "#f5a800" }}>{homePin}</strong> but you entered <strong>{addrPinMismatch}</strong>.
              </div>
            )}

            {/* Live address preview */}
            {(addForm.recipientName || addForm.houseStreet || addForm.city || addForm.postalCode) && (
              <div style={{ background: "rgba(245,168,0,0.06)", border: "1px dashed rgba(245,168,0,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.7 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f5a800", marginBottom: 4 }}>👁 Preview</div>
                {addForm.recipientName && <div style={{ fontWeight: 700 }}>{addForm.recipientName}</div>}
                {addForm.houseStreet && <div>{addForm.houseStreet}</div>}
                {(addForm.city || addForm.state) && <div>{[addForm.city, addForm.state].filter(Boolean).join(", ")}</div>}
                {addForm.postalCode && <div style={{ color: "#f5a800", fontWeight: 700 }}>📍 {addForm.postalCode}</div>}
              </div>
            )}

            <button style={cs.saveBtn} onClick={addAddress}>+ Add Address</button>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div style={{ maxWidth: 520 }}>

          {/* ── Account overview card ── */}
          <div style={cs.profileCard}>
            <h3 style={{ ...cs.secTitle, marginBottom: 18 }}>🛡️ Account Security</h3>

            {/* Email row */}
            {[
              {
                icon: "📧", label: "Email Address",
                value: profile.email,
                note: null,
              },
              {
                icon: "🕐", label: "Last Sign-in",
                value: profile.lastLogin
                  ? new Date(profile.lastLogin).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "—",
                note: null,
              },
              {
                icon: "✅", label: "Account Status",
                value: "Active",
                valueColor: "#22c55e",
              },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{row.icon}</span>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</div>
                    {row.note && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{row.note}</div>}
                  </div>
                </div>
                <span style={{ color: row.valueColor || "#e5e7eb", fontWeight: 600, fontSize: 13, textAlign: "right", maxWidth: 220 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ── Connected Accounts card ── */}
          {(() => {
            const PROVIDERS = [
              { id: "google",    label: "Google",    icon: "G", color: "#EA4335" },
              { id: "github",    label: "GitHub",    icon: "⌥", color: "#24292f" },
              { id: "facebook",  label: "Facebook",  icon: "f", color: "#1877F2" },
              { id: "instagram", label: "Instagram", icon: "📷", color: "#c13584" },
            ];
            const linkedProvider = profile?.provider && profile.provider !== "local" ? profile.provider : null;

            return (
              <div style={cs.profileCard}>
                <h3 style={{ ...cs.secTitle, marginBottom: 18 }}>🔗 Connected Accounts</h3>
                {PROVIDERS.map(p => {
                  const isLinked = linkedProvider === p.id;
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                                              padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 28, height: 28, borderRadius: 14, background: p.color,
                                       display: "flex", alignItems: "center", justifyContent: "center",
                                       color: "#fff", fontWeight: 700, fontSize: 12 }}>{p.icon}</span>
                        <span style={{ color: "#e5e7eb", fontSize: 14 }}>{p.label}</span>
                      </div>
                      {isLinked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>✓ Linked</span>
                          {profile.password && (
                            <button style={{ ...cs.removeBtn }} onClick={async () => {
                              const d = await api("/profile/unlink-oauth", { method: "DELETE" });
                              showToast(d.message || (d.success ? "Unlinked!" : "Failed"));
                              if (d.success) onUpdate();
                            }}>Unlink</button>
                          )}
                        </div>
                      ) : (
                        <button style={{ ...cs.saveBtn, padding: "6px 14px", fontSize: 12 }}
                          disabled={!!linkedProvider}
                          onClick={async () => {
                            const d = await api("/profile/link-oauth", { method: "POST",
                              body: JSON.stringify({ provider: p.id }) });
                            if (d.success && d.redirectUrl) window.location.href = d.redirectUrl;
                            else showToast(d.message || "Failed");
                          }}>Link</button>
                      )}
                    </div>
                  );
                })}
                {linkedProvider && !profile.password && (
                  <div style={{ marginTop: 12, fontSize: 12, color: "#f59e0b" }}>
                    ⚠️ To unlink your social account, first set a password in the Change Password section.
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Change password card — hidden for OAuth users ── */}
          {(!profile.provider || profile.provider === "local") && (
            <div style={cs.profileCard}>
              <h3 style={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 4, fontSize: 15 }}>🔑 Change Password</h3>
              <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 18 }}>
                Choose a strong password you haven't used before.
              </p>
              {[
                ["currentPassword", "Current Password"],
                ["newPassword", "New Password"],
                ["confirmNewPassword", "Confirm New Password"],
              ].map(([k, label]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={cs.label}>{label}</label>
                  <input
                    style={cs.inputField}
                    type="password"
                    placeholder={label}
                    value={pwForm[k]}
                    onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                  />
                </div>
              ))}
              {/* Strength hint */}
              {pwForm.newPassword && (
                <div style={{ marginBottom: 14 }}>
                  {(() => {
                    const p = pwForm.newPassword;
                    const score = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
                    const labels = ["", "Weak", "Fair", "Good", "Strong"];
                    const colors = ["", "#ef4444", "#f59e0b", "#6366f1", "#22c55e"];
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                          <div style={{ width: `${score * 25}%`, height: "100%", background: colors[score], borderRadius: 2, transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: 11, color: colors[score], fontWeight: 700, minWidth: 40 }}>{labels[score]}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
              <button style={cs.saveBtn} onClick={changePw}>Update Password</button>
            </div>
          )}

          {/* ── Security tips card ── */}
          <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: 18 }}>
            <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>💡 Security Tips</div>
            {[
              "Use a unique password you don't use on other sites.",
              "Never share your password or OTP with anyone.",
              "Sign out from shared or public devices after use.",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, color: "#9ca3af" }}>
                <span style={{ color: "#6366f1", fontWeight: 700, flexShrink: 0 }}>→</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

/* ── AI Assistant Widget ── */
function AIAssistantWidget({ api, onNavigate, showToast }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm your Ekart assistant 🛒 How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const msgEnd = useRef(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("ekart_chat_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem("ekart_chat_history", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => { if (open) msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const quickActions = [
    { label: "📦 Track order", action: () => onNavigate("track") },
    { label: "❌ Cancel order", action: () => onNavigate("orders") },
    { label: "🎟️ View coupons", action: () => onNavigate("coupons") },
    { label: "💰 My spending", action: () => onNavigate("spending") },
    { label: "🔄 Replacement", action: () => onNavigate("orders") },
  ];

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim(); setInput("");
    // Snapshot current messages before the state update for the history payload
    const historyPayload = messages
      .filter(m => m.role === "user" || m.role === "bot")
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", text: m.text }));
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const d = await api("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, history: historyPayload }),
      });
      setMessages(m => [...m, { role: "bot", text: d.reply || d.message || "I can help you with tracking orders, coupons, and more!" }]);
    } catch {
      setMessages(m => [...m, { role: "bot", text: "I'm having trouble connecting. Try using the navigation above!" }]);
    }
    setLoading(false);
  };

  const clearHistory = () => {
    if (window.confirm("Clear all chat history?")) {
      setMessages([{ role: "bot", text: "Hi! I'm your Ekart assistant 🛒 How can I help you today?" }]);
      localStorage.removeItem("ekart_chat_history");
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
      {open && (
        <div style={cs.chatWidget}>
          <div style={cs.chatHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Ekart Assistant</div>
                <div style={{ fontSize: 11, color: "#86efac" }}>● Online</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, padding: "4px 8px", borderRadius: 4 }} onClick={clearHistory} title="Clear chat history">🗑️</button>
              <button style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }} onClick={() => setOpen(false)}>×</button>
            </div>
          </div>

          <div style={cs.chatMessages}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.08)",
                  color: "#e5e7eb", fontSize: 13, lineHeight: 1.5 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div style={{ display: "flex", gap: 4, padding: "10px 14px" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: `bounce 1s ${i*0.2}s infinite` }} />)}
            </div>}
            <div ref={msgEnd} />
          </div>

          <div style={cs.quickActions}>
            {quickActions.map(qa => (
              <button key={qa.label} style={cs.quickBtn} onClick={() => { qa.action(); setOpen(false); }}>{qa.label}</button>
            ))}
          </div>

          <div style={cs.chatInput}>
            <input style={cs.chatInputField} placeholder="Type a message..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} />
            <button style={cs.chatSendBtn} onClick={sendMessage} disabled={loading}>→</button>
          </div>
        </div>
      )}
      <button style={cs.chatFab} onClick={() => setOpen(o => !o)}>
        {open ? "✕" : "🤖"}
      </button>
    </div>
  );
}

/* ── Helpers ── */
/** Returns the emoji for a category item — works with both string and Category objects */
function getCatEmoji(cat) {
  if (!cat) return "📦";
  if (typeof cat === "object" && cat.emoji) return cat.emoji;
  // Legacy fallback for plain strings
  const icons = { Electronics:"💻", Mobiles:"📱", Fashion:"👗", "Home & Kitchen":"🏠", Books:"📚", Toys:"🧸", Sports:"⚽", Beauty:"💄", Food:"🍕", Grocery:"🛒" };
  return icons[typeof cat === "string" ? cat : cat.name] || "📦";
}

/** Flatten hierarchical categories into [{value, label}] for filter dropdowns */
function flattenCatsForSelect(categories) {
  const opts = [];
  for (const cat of categories) {
    const isStr = typeof cat === "string";
    const name  = isStr ? cat : cat.name;
    const emoji = isStr ? getCatEmoji(cat) : (cat.emoji || "📦");
    const subs  = isStr ? [] : (cat.subCategories || []);
    if (subs.length > 0) {
      for (const sub of subs) {
        opts.push({ value: sub.name, label: `${emoji} ${name} › ${sub.emoji ? sub.emoji + " " : ""}${sub.name}` });
      }
    } else {
      opts.push({ value: name, label: `${emoji} ${name}` });
    }
  }
  return opts;
}

// Keep old name as alias for any remaining references
const getCatIcon = getCatEmoji;

/* ── Styles ── */
const cs = {
  root: { minHeight: "100vh", background: "var(--ek-bg)", fontFamily: "'Segoe UI', sans-serif", color: "var(--ek-text)" },
  main: { maxWidth: 1200, margin: "0 auto", padding: "16px 20px 24px" },
  nav: { background: "var(--ek-nav-bg)", borderBottom: "1.5px solid var(--ek-border)", padding: "0 24px", display: "flex", alignItems: "center", gap: 8, height: 64, position: "sticky", top: 0, zIndex: 100, boxShadow: "var(--ek-nav-shadow)", flexWrap: "nowrap", overflowX: "auto" },
  brand: { fontSize: 20, fontWeight: 800, color: "var(--ek-text)", letterSpacing: 2, marginRight: 8, whiteSpace: "nowrap" },
  navLinks: { display: "flex", gap: 2, flex: 1 },
  navBtn: { padding: "7px 12px", borderRadius: 8, border: "none", background: "transparent", color: "var(--ek-muted)", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  navBtnActive: { background: "var(--ek-accent-soft)", color: "var(--ek-accent)" },
  greeting: { color: "var(--ek-muted)", fontSize: 14, whiteSpace: "nowrap" },
  logoutBtn: { padding: "7px 16px", borderRadius: 8, border: "1px solid var(--ek-danger)", background: "var(--ek-danger-soft)", color: "var(--ek-danger)", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  toast: { position: "fixed", bottom: 90, right: 24, background: "var(--ek-surface)", border: "1px solid var(--ek-border)", color: "var(--ek-text)", padding: "14px 22px", borderRadius: 12, zIndex: 999, fontSize: 15, boxShadow: "var(--ek-shadow)" },
  hero: { background: "linear-gradient(135deg,var(--ek-primary) 0%,var(--ek-accent) 50%,var(--ek-primary) 100%)", borderRadius: 20, padding: "60px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 },
  heroTitle: { fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1.2, margin: 0 },
  heroAccent: { color: "#c4b5fd" },
  heroSub: { color: "rgba(255,255,255,0.82)", margin: "16px 0 24px", fontSize: 18 },
  heroCta: { padding: "14px 32px", borderRadius: 12, border: "none", background: "var(--ek-surface)", color: "var(--ek-primary)", fontSize: 17, fontWeight: 800, cursor: "pointer" },
  heroIllus: { fontSize: 100 },
  carouselWrap: { position: "relative", borderRadius: 20, overflow: "hidden", marginBottom: 40, background: "var(--ek-surface-muted)", userSelect: "none" },
  carouselImg: { width: "100%", height: 360, objectFit: "cover", display: "block" },
  carouselCaption: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px", background: "linear-gradient(transparent, rgba(0,0,0,0.72))", color: "#fff", fontSize: 19, fontWeight: 700, letterSpacing: 0.2 },
  carouselArrow: { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "var(--ek-surface)", border: "none", color: "var(--ek-text)", fontSize: 28, fontWeight: 700, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, boxShadow: "var(--ek-shadow)", zIndex: 2 },
  carouselDots: { position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 2 },
  carouselDot: { width: 9, height: 9, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 0, transition: "background 0.2s, transform 0.2s" },
  carouselDotActive: { background: "#fff", transform: "scale(1.3)" },
  section: { marginBottom: 40 },
  secTitle: { fontSize: 22, fontWeight: 700, color: "var(--ek-text)", marginBottom: 20 },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 12 },
  catCard: { background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 14, padding: "16px 8px", textAlign: "center", cursor: "pointer" },
  catIcon: { fontSize: 30, display: "block", marginBottom: 6 },
  catLabel: { fontSize: 13, color: "var(--ek-muted)", fontWeight: 600 },
  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 20 },
  productCard: { background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--ek-shadow)" },
  productImgWrap: { position: "relative", height: 180, background: "var(--ek-surface-muted)", cursor: "pointer", overflow: "hidden" },
  productImg: { width: "100%", height: "100%", objectFit: "cover" },
  productImgPlaceholder: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 48 },
  discountBadge: { position: "absolute", top: 8, left: 8, background: "#dc2626", color: "#fff", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 6 },
  wishBtn: { position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.9)", border: "1px solid #e5e7eb", cursor: "pointer", fontSize: 18, borderRadius: 8, padding: 4 },
  wishBtnLarge: { padding: "12px 20px", borderRadius: 12, border: "1.5px solid #6366f1", background: "#ede9fe", color: "#4f46e5", cursor: "pointer", fontSize: 15, fontWeight: 600 },
  productInfo: { padding: "14px 16px" },
  productName: { fontSize: 15, fontWeight: 600, color: "var(--ek-text)", marginBottom: 4, cursor: "pointer", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  productCat: { fontSize: 12, color: "#6366f1", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  priceRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 4 },
  price: { fontSize: 19, fontWeight: 800, color: "var(--ek-text)" },
  mrp: { fontSize: 14, color: "var(--ek-muted)", textDecoration: "line-through" },
  ratingRow: { display: "flex", alignItems: "center", gap: 4, marginBottom: 4 },
  stars: { color: "#d97706", fontSize: 13 },
  ratingNum: { fontSize: 13, color: "var(--ek-muted)" },
  stockBadge: (stock) => ({ fontSize: 12, color: stock > 0 ? "#16a34a" : "#dc2626", marginBottom: 8, fontWeight: 700 }),
  addCartBtn: { width: "100%", padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryBtn: { padding: "10px 20px", borderRadius: 10, border: "1.5px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-text)", fontWeight: 600, cursor: "pointer", fontSize: 15 },
  outlineBtn: { padding: "8px 18px", borderRadius: 8, border: "1.5px solid var(--ek-primary)", background: "var(--ek-primary-soft)", color: "var(--ek-primary)", cursor: "pointer", fontSize: 14 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: "var(--ek-text)", marginBottom: 24 },
  backBtn: { background: "none", border: "none", color: "var(--ek-primary)", cursor: "pointer", fontSize: 15, marginBottom: 20, padding: 0, fontWeight: 600 },
  searchBox: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  filterRow: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  searchInput: { flex: 1, padding: "11px 16px", borderRadius: 10, border: "1.5px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-text)", fontSize: 15, minWidth: 150 },
  suggestionBox: { position: "absolute", top: 44, left: 0, right: 0, background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 10, boxShadow: "var(--ek-shadow)", zIndex: 40, overflow: "hidden" },
  suggestionItem: { display: "flex", gap: 10, alignItems: "center", padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--ek-border)" },
  suggestionImg: { width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "var(--ek-surface-muted)" },
  searchBtn: { padding: "11px 22px", borderRadius: 10, border: "none", background: "var(--ek-primary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15 },
  select: { padding: "11px 14px", borderRadius: 10, border: "1.5px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-text)", fontSize: 15 },
  resultCount: { color: "var(--ek-muted)", fontSize: 14, marginBottom: 16 },
  empty: { textAlign: "center", padding: "60px 0", color: "var(--ek-muted)", fontSize: 19 },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 40 },
  detailImg: { width: "100%", borderRadius: 16, maxHeight: 400, objectFit: "cover" },
  detailCat: { color: "var(--ek-primary)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", marginBottom: 8 },
  detailTitle: { fontSize: 28, fontWeight: 800, color: "var(--ek-text)", margin: "0 0 12px" },
  detailPrice: { fontSize: 28, fontWeight: 900, color: "var(--ek-text)" },
  detailDesc: { color: "var(--ek-muted)", lineHeight: 1.7, marginBottom: 16, fontSize: 15 },
  vendorInfo: { color: "var(--ek-muted)", fontSize: 15, marginBottom: 12 },
  reviewSection: { background: "var(--ek-surface)", borderRadius: 16, padding: 24, border: "1.5px solid var(--ek-border)" },
  reviewForm: { background: "var(--ek-surface)", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid var(--ek-border)" },
  reviewInput: { width: "100%", padding: "11px", borderRadius: 8, border: "1.5px solid var(--ek-border)", background: "var(--ek-input)", color: "var(--ek-text)", fontSize: 15, minHeight: 80, resize: "vertical", boxSizing: "border-box" },
  submitReviewBtn: { marginTop: 8, padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--ek-primary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15 },
  reviewCard: { borderTop: "1px solid var(--ek-border)", paddingTop: 12, marginTop: 12 },
  cartLayout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" },
  cartLayoutMobile: { display: "grid", gridTemplateColumns: "1fr", gap: 16, alignItems: "stretch" },
  cartItem: { display: "flex", gap: 14, background: "var(--ek-surface)", borderRadius: 14, padding: 14, marginBottom: 12, border: "1.5px solid var(--ek-border)" },
  cartItemImg: { width: 72, height: 72, background: "var(--ek-surface-muted)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, overflow: "hidden" },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontWeight: 600, color: "var(--ek-text)", marginBottom: 4, fontSize: 15 },
  cartItemPrice: { color: "var(--ek-muted)", fontSize: 14, marginBottom: 8 },
  qtyRow: { display: "flex", alignItems: "center", gap: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, border: "1.5px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-text)", cursor: "pointer", fontSize: 17, fontWeight: 700 },
  qtyNum: { fontWeight: 700, minWidth: 20, textAlign: "center", color: "var(--ek-text)", fontSize: 15 },
  cartItemTotal: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
  lineTotal: { fontSize: 17, fontWeight: 700, color: "var(--ek-text)" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--ek-danger)", fontWeight: 600 },
  couponBox: { background: "var(--ek-surface)", border: "1.5px dashed var(--ek-border)", borderRadius: 14, padding: 16, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 },
  cartSummary: { background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 16, padding: 24, position: "sticky", top: 80 },
  cartSummaryMobile: { position: "static", top: "auto" },
  sumRow: { display: "flex", justifyContent: "space-between", color: "var(--ek-muted)", marginBottom: 10, fontSize: 15 },
  totalRow: { display: "flex", justifyContent: "space-between", color: "var(--ek-text)", fontWeight: 800, fontSize: 19, borderTop: "2px solid var(--ek-border)", paddingTop: 12, marginTop: 8 },
  paymentLayout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" },
  paymentLayoutMobile: { display: "grid", gridTemplateColumns: "1fr", gap: 16, alignItems: "stretch" },
  paySection: { background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 16, padding: 20, marginBottom: 16 },
  paySectionTitle: { color: "var(--ek-text)", fontWeight: 700, marginBottom: 14, fontSize: 16 },
  addrCard: { border: "2px solid", borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer" },
  orderCard: { background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 16, padding: 20, marginBottom: 16 },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontWeight: 700, color: "var(--ek-text)", fontSize: 15 },
  statusBadge: { padding: "4px 12px", borderRadius: 20, color: "#fff", fontSize: 13, fontWeight: 700 },
  orderItem: { background: "var(--ek-surface-alt)", borderRadius: 8, padding: "8px 14px", fontSize: 14, color: "var(--ek-text)" },
  cancelBtn: { padding: "8px 18px", borderRadius: 8, border: "1.5px solid var(--ek-danger)", background: "var(--ek-danger-soft)", color: "var(--ek-danger)", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "var(--ek-overlay)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 20, padding: 28, maxWidth: 420, width: "100%", boxShadow: "var(--ek-shadow)" },
  couponCard: { background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--ek-shadow)" },
  couponStripe: { height: 6, background: "linear-gradient(90deg,#4f46e5,#7c3aed,#ec4899)" },
  couponBody: { padding: 20 },
  couponCode: { fontFamily: "monospace", fontSize: 23, fontWeight: 900, color: "#4f46e5", letterSpacing: 2 },
  couponValue: { background: "#ede9fe", color: "#4f46e5", padding: "4px 12px", borderRadius: 8, fontWeight: 700, fontSize: 15 },
  profileCard: { background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 16, padding: 24, marginBottom: 16 },
  profileAvatar: { width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, color: "#fff", marginBottom: 20 },
  fieldGroup: { marginBottom: 14 },
  label: { display: "block", color: "#374151", fontSize: 13, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  inputField: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#ffffff", color: "#111827", fontSize: 15, boxSizing: "border-box" },
  saveBtn: { width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 16 },
  addressCard: { background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", marginBottom: 10 },
  chatWidget: { position: "absolute", bottom: 70, right: 0, width: 340, height: 480, background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  chatHeader: { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" },
  chatMessages: { flex: 1, overflowY: "auto", padding: 16, background: "#f9fafb" },
  quickActions: { display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap", borderTop: "1px solid #e5e7eb", background: "#ffffff" },
  quickBtn: { padding: "6px 12px", borderRadius: 20, border: "1.5px solid #d1d5db", background: "#f9fafb", color: "#374151", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  chatInput: { display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid #e5e7eb", background: "#ffffff" },
  chatInputField: { flex: 1, padding: "9px 14px", borderRadius: 20, border: "1.5px solid #d1d5db", background: "#f9fafb", color: "#111827", fontSize: 14 },
  chatSendBtn: { width: 36, height: 36, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 16 },
  chatFab: { width: 56, height: 56, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", cursor: "pointer", fontSize: 24, boxShadow: "0 8px 24px rgba(99,102,241,0.35)", display: "flex", alignItems: "center", justifyContent: "center" },
  /* ── Nav / drawer / location styles ── */
  hamburgerBtn: { display:"flex", flexDirection:"column", justifyContent:"center", gap:5, width:36, height:36, cursor:"pointer", background:"none", border:"none", padding:6, flexShrink:0, borderRadius:8 },
  hamburgerLine: { display:"block", width:20, height:2, background:"#374151", borderRadius:2 },
  navSearchInput: { width:"100%", background:"#f9fafb", border:"1.5px solid #d1d5db", borderRadius:50, color:"#111827", fontSize:14, padding:"8px 14px 8px 34px", outline:"none", fontFamily:"inherit" },
  acDropdown: { position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#ffffff", border:"1.5px solid #e5e7eb", borderRadius:14, zIndex:9999, boxShadow:"0 16px 40px rgba(0,0,0,0.12)", overflow:"hidden" },
  acItem: { display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid #f3f4f6", transition:"background 0.1s", color:"#111827", fontSize:14 },
  indiaBadge: { display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, border:"1px solid #d1d5db", background:"#f9fafb", fontSize:13, fontWeight:600, color:"#374151", flexShrink:0, userSelect:"none" },
  cartBadge: { position:"absolute", top:-4, right:-4, background:"#f5a800", color:"#1a1000", fontSize:9, fontWeight:800, width:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" },
  profileIconBtn: { background:"#f3f4f6", border:"1.5px solid #e5e7eb", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:17, color:"#4f46e5", flexShrink:0 },
  profileDropdown: { position:"fixed", top:64, right:16, background:"#ffffff", border:"1.5px solid #e5e7eb", borderRadius:14, minWidth:190, boxShadow:"0 16px 40px rgba(0,0,0,0.12)", zIndex:9999, overflow:"hidden" },
  profileItem: { display:"flex", alignItems:"center", gap:8, padding:"11px 16px", color:"#111827", fontSize:15, cursor:"pointer", transition:"background 0.15s" },
  drawerSectionTitle: { padding:"12px 14px 6px", fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280", borderTop:"1px solid #e5e7eb", marginTop:4 },
  drawerItem: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 16px", color:"#111827", fontSize:15, cursor:"pointer", border:"none", background:"none", width:"100%", textAlign:"left", transition:"background 0.15s" },
};