import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "../App";
import { apiFetch } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN");

function Toast({ msg, onHide }) {
  useEffect(() => { if (msg) { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return <div style={vs.toast}>{msg}</div>;
}

export default function VendorApp() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive current page from URL: /vendor/:page → page, default "dashboard"
  const page = location.pathname.replace(/^\/vendor\/?/, "").split("/")[0] || "dashboard";
  const setPage = (p) => navigate(`/vendor/${p}`);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [toast, setToast] = useState("");

  const api = useCallback((path, opts) => apiFetch(path, opts, auth), [auth]);
  const showToast = m => setToast(m);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [s, p, o, a, pr] = await Promise.all([
      api("/vendor/stats"), api("/vendor/products"),
      api("/vendor/orders"), api("/vendor/stock-alerts"), api("/vendor/profile")
    ]);
    if (s.success) setStats(s);
    if (p.success) setProducts(p.products || []);
    if (o.success) setOrders(o.orders || []);
    if (a.success) setStockAlerts(a.alerts || []);
    if (pr.success) setProfile(pr.vendor);
    setLoading(false);
  }, [api]);

  const loadSales = useCallback(async (period = "weekly") => {
    const d = await api(`/vendor/sales-report?period=${period}`);
    if (d.success) setSalesData(d);
  }, [api]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (page === "sales") loadSales(); }, [page]);

  const tabs = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "products", label: "📦 Products" },
    { key: "orders", label: "🛒 Orders" },
    { key: "sales", label: "📈 Sales Report" },
    { key: "alerts", label: `⚠️ Alerts${stockAlerts.length > 0 ? ` (${stockAlerts.length})` : ""}` },
    { key: "storefront", label: "🏪 Store Front" },
    { key: "profile", label: "👤 Profile" },
    { key: "security", label: "🔐 Security" },
  ];

  const markPacked = async (orderId) => {
    const d = await api(`/vendor/orders/${orderId}/mark-packed`, { method: "POST" });
    if (d.success) { showToast("Marked as packed ✓"); loadAll(); } else showToast(d.message || "Error");
  };

  return (
    <div style={vs.root}>
      <Toast msg={toast} onHide={() => setToast("")} />
      <nav style={vs.nav}>
        <span style={vs.brand}>🏪 EKART Vendor</span>
        <div style={vs.navLinks}>
          {tabs.map(t => (
            <button key={t.key} style={{ ...vs.navBtn, ...(page === t.key ? vs.navBtnActive : {}) }}
              onClick={() => setPage(t.key)}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#9ca3af", fontSize: 13 }}>{auth.email}</span>
          <button style={vs.logoutBtn} onClick={() => { logout(); navigate("/auth", { replace: true }); }}>Logout</button>
        </div>
      </nav>

      <main style={vs.main}>
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ color: "#6b7280" }}>Loading vendor data...</div>
          </div>
        ) : (
          <>
            {page === "dashboard" && <Dashboard stats={stats} orders={orders} products={products} />}
            {page === "products" && <ProductsManager products={products} api={api} onRefresh={loadAll} showToast={showToast} />}
            {page === "orders" && <OrdersView orders={orders} onMarkPacked={markPacked} />}
            {page === "sales" && <SalesReport salesData={salesData} onPeriodChange={loadSales} />}
            {page === "alerts" && <StockAlertsView alerts={stockAlerts} api={api} onRefresh={loadAll} showToast={showToast} />}
            {page === "storefront" && <StoreFront profile={profile} products={products} api={api} onRefresh={loadAll} showToast={showToast} />}
            {page === "profile" && <VendorProfile profile={profile} api={api} onRefresh={loadAll} showToast={showToast} />}
            {page === "security" && <VendorSecurity profile={profile} api={api} onRefresh={loadAll} showToast={showToast} />}
          </>
        )}
      </main>
    </div>
  );
}

function Dashboard({ stats, orders, products }) {
  const statCards = [
    { label: "Total Revenue", value: fmt(stats?.totalRevenue), icon: "💰", color: "#22c55e" },
    { label: "Total Orders", value: stats?.totalOrders ?? "–", icon: "📦", color: "#6366f1" },
    { label: "Total Products", value: stats?.totalProducts ?? "–", icon: "🏷️", color: "#f59e0b" },
    { label: "Low Stock Items", value: stats?.lowStockProducts ?? "–", icon: "⚠️", color: "#ef4444" },
  ];
  const statusColor = { PROCESSING: "#f59e0b", PACKED: "#6366f1", SHIPPED: "#3b82f6", OUT_FOR_DELIVERY: "#8b5cf6", DELIVERED: "#22c55e", REFUNDED: "#10b981", CANCELLED: "#ef4444" };
  return (
    <div>
      <h2 style={vs.pageTitle}>Dashboard</h2>
      <div style={vs.statsGrid}>
        {statCards.map(s => (
          <div key={s.label} style={vs.statCard}>
            <div style={vs.statIcon(s.color)}>{s.icon}</div>
            <div style={vs.statVal}>{s.value}</div>
            <div style={vs.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={vs.twoCol}>
        <div style={vs.card}>
          <h3 style={vs.cardTitle}>Recent Orders</h3>
          {(orders || []).slice(0, 5).map(o => (
            <div key={o.id} style={vs.listRow}>
              <span style={{ color: "#e5e7eb", fontWeight: 600 }}>#{o.id}</span>
              <span style={{ color: "#9ca3af", fontSize: 13 }}>{o.customerName || "–"}</span>
              <span style={{ ...vs.badge, background: statusColor[o.trackingStatus] || "#6b7280" }}>{o.trackingStatus?.replace(/_/g, " ")}</span>
              <span style={{ color: "#fff", fontWeight: 700 }}>{fmt(o.amount || o.totalPrice)}</span>
            </div>
          ))}
          {(!orders || orders.length === 0) && <p style={vs.empty}>No orders yet</p>}
        </div>
        <div style={vs.card}>
          <h3 style={vs.cardTitle}>Product Summary</h3>
          {(products || []).slice(0, 6).map(p => (
            <div key={p.id} style={vs.listRow}>
              <span style={{ color: "#e5e7eb", fontSize: 13, flex: 1 }}>{p.name}</span>
              <span style={{ color: p.stock <= 10 ? "#ef4444" : "#22c55e", fontSize: 13, fontWeight: 600 }}>Stock: {p.stock}</span>
              <span style={{ color: "#fff", fontSize: 13 }}>{fmt(p.price)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrdersView({ orders, onMarkPacked }) {
  const statusColor = { PROCESSING: "#f59e0b", PACKED: "#6366f1", SHIPPED: "#3b82f6", OUT_FOR_DELIVERY: "#8b5cf6", DELIVERED: "#22c55e", REFUNDED: "#10b981", CANCELLED: "#ef4444" };
  const pending = (orders || []).filter(o => o.trackingStatus === "PROCESSING");
  const inProgress = (orders || []).filter(o => ["PACKED", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.trackingStatus));
  const done = (orders || []).filter(o => ["DELIVERED", "REFUNDED", "CANCELLED"].includes(o.trackingStatus));

  const OrderRow = ({ o }) => (
    <div style={vs.orderCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <span style={{ fontWeight: 700, color: "#e5e7eb" }}>#{o.id}</span>
          <span style={{ marginLeft: 12, color: "#9ca3af", fontSize: 13 }}>{o.customerName || "–"}</span>
          {o.customer?.mobile && <span style={{ marginLeft: 8, color: "#9ca3af", fontSize: 12 }}>📞 {o.customer.mobile}</span>}
        </div>
        <span style={{ ...vs.badge, background: statusColor[o.trackingStatus] || "#6b7280" }}>{o.trackingStatus?.replace(/_/g, " ")}</span>
      </div>
      <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 8 }}>
        {(o.items || []).map(i => `${i.name} × ${i.quantity}`).join(", ")}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          {o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "–"}
          {o.paymentMode && <span style={{ marginLeft: 10, color: "#f59e0b" }}>{o.paymentMode}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "#fff" }}>{fmt(o.amount || o.totalPrice)}</span>
          {o.trackingStatus === "PROCESSING" && (
            <button style={vs.primaryBtn} onClick={() => onMarkPacked(o.id)}>✓ Mark Packed</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={vs.pageTitle}>Orders</h2>
      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ color: "#f59e0b", marginBottom: 12, fontSize: 16 }}>🆕 New Orders — Pack & Mark Ready ({pending.length})</h3>
          {pending.map(o => <OrderRow key={o.id} o={o} />)}
        </div>
      )}
      {inProgress.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ color: "#6366f1", marginBottom: 12, fontSize: 16 }}>⚙️ In Progress ({inProgress.length})</h3>
          {inProgress.map(o => <OrderRow key={o.id} o={o} />)}
        </div>
      )}
      {done.length > 0 && (
        <div>
          <h3 style={{ color: "#6b7280", marginBottom: 12, fontSize: 16 }}>📋 Recent History</h3>
          {done.slice(0, 10).map(o => <OrderRow key={o.id} o={o} />)}
        </div>
      )}
      {(!orders || orders.length === 0) && <div style={vs.empty}>No orders yet</div>}
    </div>
  );
}

function SalesReport({ salesData, onPeriodChange }) {
  const [period, setPeriod] = useState("weekly");
  const changePeriod = (p) => { setPeriod(p); onPeriodChange(p); };

  const data = salesData?.data || [];
  const maxRevenue = Math.max(...data.map(d => d.revenue || 0), 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={vs.pageTitle}>Sales Report 📊</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["daily", "weekly", "monthly"].map(p => (
            <button key={p} style={{ ...vs.secondaryBtn, ...(period === p ? { background: "rgba(34,197,94,0.2)", color: "#86efac", borderColor: "rgba(34,197,94,0.4)" } : {}) }}
              onClick={() => changePeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={vs.statsGrid}>
        {[
          { label: "Total Revenue", value: fmt(salesData?.totalRevenue || 0), icon: "💰", color: "#22c55e" },
          { label: "Orders", value: salesData?.totalOrders || 0, icon: "📦", color: "#6366f1" },
          { label: "Avg Order Value", value: fmt(salesData?.avgOrderValue || 0), icon: "📊", color: "#f59e0b" },
          { label: "Top Product", value: salesData?.topProduct || "—", icon: "🏆", color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} style={vs.statCard}>
            <div style={vs.statIcon(s.color)}>{s.icon}</div>
            <div style={{ ...vs.statVal, fontSize: 20 }}>{s.value}</div>
            <div style={vs.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {data.length > 0 && (
        <div style={{ ...vs.card, marginBottom: 20 }}>
          <h3 style={vs.cardTitle}>Revenue Trend</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140 }}>
            {data.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{fmt(d.revenue || 0)}</div>
                <div style={{ width: "100%", background: "linear-gradient(180deg,#22c55e,#16a34a)", borderRadius: "4px 4px 0 0", height: `${((d.revenue || 0) / maxRevenue) * 100}px`, minHeight: 4 }} />
                <div style={{ fontSize: 10, color: "#6b7280" }}>{d.label || d.date || i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(salesData?.topProducts || []).length > 0 && (
        <div style={vs.card}>
          <h3 style={vs.cardTitle}>Top Selling Products</h3>
          <table style={vs.table}>
            <thead><tr style={vs.thead}>
              {["Product", "Units Sold", "Revenue"].map(h => <th key={h} style={vs.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {salesData.topProducts.map((p, i) => (
                <tr key={i} style={vs.tr}>
                  <td style={vs.td}>{p.name}</td>
                  <td style={vs.td}>{p.unitsSold}</td>
                  <td style={vs.td}>{fmt(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(!salesData || data.length === 0) && <div style={vs.empty}>No sales data available yet. Start selling!</div>}
    </div>
  );
}

function StoreFront({ profile, products, api, onRefresh, showToast }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", description: "" });

  useEffect(() => {
    if (profile) setForm({ name: profile.name || "", mobile: profile.mobile ? String(profile.mobile) : "", description: profile.description || "" });
  }, [profile]);

  const save = async () => {
    const d = await api("/vendor/storefront/update", { method: "PUT", body: JSON.stringify(form) });
    showToast(d.success ? "Store front updated!" : d.message || "Error");
    if (d.success) { onRefresh(); setEditing(false); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(String(profile?.id || "")).then(() => showToast("Vendor ID copied!"));
  };

  return (
    <div>
      <h2 style={vs.pageTitle}>Store Front 🏪</h2>
      <div style={vs.twoCol}>
        <div style={vs.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#fff", fontWeight: 700 }}>
              {(profile?.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>{profile?.name || "—"}</div>
              <div style={{ color: "#9ca3af", fontSize: 13 }}>Vendor Code: {profile?.vendorCode || "—"}</div>
            </div>
          </div>

          {[
            ["Email", profile?.email],
            ["Mobile", profile?.mobile],
            ["Verified", profile?.verified ? "✓ Verified" : "✗ Not Verified"],
            ["Products Listed", products?.length],
          ].map(([k, v]) => (
            <div key={k} style={vs.infoRow}>
              <span style={vs.infoLabel}>{k}</span>
              <span style={{ ...vs.infoVal, color: k === "Verified" ? (profile?.verified ? "#22c55e" : "#ef4444") : "#e5e7eb" }}>{v || "—"}</span>
            </div>
          ))}

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button style={vs.secondaryBtn} onClick={copyId}>📋 Copy Vendor ID</button>
            <button style={vs.primaryBtn} onClick={() => setEditing(!editing)}>✏️ Edit Store</button>
          </div>

          {editing && (
            <div style={{ marginTop: 16 }}>
              <label style={vs.label}>Store Name</label>
              <input style={vs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <label style={{ ...vs.label, marginTop: 10 }}>Mobile Number</label>
              <input style={vs.input} type="tel" placeholder="e.g. 9876543210" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
              <label style={{ ...vs.label, marginTop: 10 }}>Store Description</label>
              <textarea style={{ ...vs.input, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <button style={{ ...vs.primaryBtn, marginTop: 12, width: "100%" }} onClick={save}>Save Changes</button>
            </div>
          )}
        </div>

        <div style={vs.card}>
          <h3 style={vs.cardTitle}>Store Stats</h3>
          {[
            { icon: "📦", label: "Total Products", value: products?.length || 0 },
            { icon: "✅", label: "Approved", value: products?.filter(p => p.approved).length || 0 },
            { icon: "⏳", label: "Pending Approval", value: products?.filter(p => !p.approved).length || 0 },
            { icon: "⚠️", label: "Low Stock", value: products?.filter(p => p.stock <= 10).length || 0 },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ color: "#9ca3af", fontSize: 14 }}>{s.icon} {s.label}</span>
              <span style={{ color: "#fff", fontWeight: 700 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Indian PIN code validator (mirrors HTML page logic) ──────────────────────
function isIndianPin(val) {
  if (!/^\d{6}$/.test(val)) return false;
  const prefix = val.slice(0, 2);
  const valid = new Set(["11","12","13","14","15","16","17","18","19",
    "20","21","22","23","24","25","26","27","28",
    "30","31","32","33","34","36","37","38","39",
    "40","41","42","43","44","45","46","47","48","49",
    "50","51","52","53","56","57","58","59",
    "60","61","62","63","64","65","66","67","68","69",
    "70","71","72","73","74","75","76","77","78","79",
    "80","81","82","83","84","85",
    "90","91","92","93","94","95","96","97","98","99"]);
  return valid.has(prefix);
}

// ── PIN Code Tag Input component ─────────────────────────────────────────────
function PinTagInput({ value, onChange }) {
  const [input, setInput] = useState("");
  const [pinError, setPinError] = useState("");
  const pins = value ? value.split(",").filter(Boolean) : [];

  const addPin = (raw) => {
    const val = raw.trim().replace(/\D/g, "");
    if (!isIndianPin(val)) { setPinError("Please enter a valid Indian pin code."); return; }
    if (pins.includes(val)) { setPinError(val + " already added"); return; }
    onChange([...pins, val].join(","));
    setInput("");
    setPinError("");
  };

  const removePin = (pin) => onChange(pins.filter(p => p !== pin).join(","));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addPin(input);
    } else if (e.key === "Backspace" && !input && pins.length) {
      removePin(pins[pins.length - 1]);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10, padding: "8px 12px", minHeight: 44, cursor: "text" }}>
        {pins.map(p => (
          <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 4,
            background: "rgba(245,168,0,0.18)", border: "1px solid rgba(245,168,0,0.4)",
            borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, color: "#f5a800" }}>
            {p}
            <button type="button" onClick={() => removePin(p)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,168,0,0.7)", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => { setInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addPin(input); }}
          placeholder={pins.length === 0 ? "Type a 6-digit pin code & press Enter" : ""}
          inputMode="numeric"
          style={{ background: "none", border: "none", outline: "none", color: "#fff",
            fontSize: 13, minWidth: 180, flex: 1, fontFamily: "inherit" }}
        />
      </div>
      {pinError && <div style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{pinError}</div>}
    </div>
  );
}

// ── File Upload Area component ────────────────────────────────────────────────
function FileUploadArea({ label, accept, multiple, onChange, fileNames, icon }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = React.useRef();

  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    onChange(multiple ? files : files[0] || null);
  };

  return (
    <div>
      {label && <label style={vs.label}>{label}</label>}
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const files = Array.from(e.dataTransfer.files); onChange(multiple ? files : files[0] || null); }}
        style={{ background: dragging ? "rgba(245,168,0,0.08)" : "rgba(255,255,255,0.04)",
          border: `2px dashed ${dragging ? "#f5a800" : "rgba(255,255,255,0.18)"}`,
          borderRadius: 10, padding: "16px 12px", textAlign: "center", cursor: "pointer",
          transition: "all 0.2s" }}>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple}
          onChange={handleChange} style={{ display: "none" }} />
        <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
          <strong style={{ color: "rgba(255,255,255,0.8)", display: "block", marginBottom: 2 }}>
            Click or drag to upload
          </strong>
          {accept}
        </div>
        {fileNames && <div style={{ marginTop: 6, fontSize: 11, color: "#f5a800", fontWeight: 600, wordBreak: "break-all" }}>{fileNames}</div>}
      </div>
    </div>
  );
}

// ── Bulk CSV Upload section ───────────────────────────────────────────────────
function BulkCsvUpload({ api, showToast }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null); // null | { pct, msg, error }
  const [uploading, setUploading] = useState(false);

  const REQUIRED_ALIASES = {
    name: ["name", "product name"],
    price: ["price", "selling price", "sale price"],
    stock: ["stock", "quantity"],
  };
  const SAMPLE_CSV = [
    "id,name,description,price,mrp,category,stock,imageLink,stockAlertThreshold,gstRate,allowedPinCodes",
    "Protein Bar 6-Pack,High-protein snack bar combo,449,599,Snacks,120,https://example.com/protein-bar.jpg,20,12,\"400001,400002,400003\"",
    "Steel Water Bottle 1L,Insulated reusable bottle,699,899,Home & Kitchen,60,https://example.com/bottle.jpg,15,18,\"560001,560002\"",
  ].join("\n");

  const downloadExcelTemplate = () => {
    const rows = [
      ["id", "name", "description", "price", "mrp", "category", "stock", "imageLink", "stockAlertThreshold", "gstRate", "allowedPinCodes"],
      ["", "Protein Bar 6-Pack", "High-protein snack bar combo", 449, 599, "Snacks", 120, "https://example.com/protein-bar.jpg", 20, 12, "400001,400002,400003"],
      ["", "Steel Water Bottle 1L", "Insulated reusable bottle", 699, 899, "Home & Kitchen", 60, "https://example.com/bottle.jpg", 15, 18, "560001,560002"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "vendor-product-import-template.xlsx");
  };

  const normalizeHeader = (h) => String(h || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const hasAnyHeader = (row, aliases) => {
    const keys = Object.keys(row || {}).map(normalizeHeader);
    return aliases.some(a => keys.includes(normalizeHeader(a)));
  };

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const parseLine = (line) => {
      const out = []; let cur = ""; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (c === ',' && !inQ) { out.push(cur); cur = ""; }
        else cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim().replace(/^"|"$/g, ""));
    };
    const headers = parseLine(lines[0]);
    return lines.slice(1).map(l => {
      const vals = parseLine(l);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    });
  };

  const handleSubmit = () => {
    if (!file) { showToast("Please select a CSV file"); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rows = parseCsv(e.target.result);
      const errors = [];
      const headerProbe = rows[0] || {};
      Object.entries(REQUIRED_ALIASES).forEach(([field, aliases]) => {
        if (!hasAnyHeader(headerProbe, aliases)) {
          errors.push(`Missing required header for ${field}. Use one of: ${aliases.join(" / ")}`);
        }
      });

      rows.forEach((row, idx) => {
        const getVal = (aliases) => {
          const normalizedMap = {};
          Object.entries(row || {}).forEach(([k, v]) => { normalizedMap[normalizeHeader(k)] = v; });
          for (const alias of aliases) {
            const hit = normalizedMap[normalizeHeader(alias)];
            if (hit != null && String(hit).trim()) return String(hit).trim();
          }
          return "";
        };
        if (!getVal(REQUIRED_ALIASES.name)) errors.push(`Row ${idx + 2}: Product Name (name) is required`);
        if (!getVal(REQUIRED_ALIASES.price)) errors.push(`Row ${idx + 2}: Selling Price (price) is required`);
        if (!getVal(REQUIRED_ALIASES.stock)) errors.push(`Row ${idx + 2}: Stock is required`);
      });
      if (errors.length) {
        setProgress({ pct: 0, msg: "Validation failed.", error: errors.slice(0, 5).join(" · ") + (errors.length > 5 ? ` … +${errors.length - 5} more` : "") });
        return;
      }
      setProgress({ pct: 60, msg: `Validated ${rows.length} products. Uploading…` });
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      try {
        const d = await api("/vendor/products/upload-csv", { method: "POST", body: fd });
        if (d.success) {
          setProgress({ pct: 100, msg: d.message || "Upload successful!" });
          showToast("Bulk upload successful! ✓");
          setFile(null);
        } else {
          setProgress({ pct: 0, msg: "Upload failed.", error: d.message || "Server error" });
        }
      } catch {
        setProgress({ pct: 0, msg: "Upload failed.", error: "Network error" });
      }
      setUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f5a800", textTransform: "uppercase", letterSpacing: 1 }}>📄 Bulk CSV Import</span>
      </div>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        Upload a CSV/PIM export to add multiple products at once.
        Required: <strong style={{ color: "#9ca3af" }}>name (Product Name), price (Selling Price), stock</strong>.
        {" "}<a href={"data:text/csv;charset=utf-8," + encodeURIComponent(SAMPLE_CSV)} download="vendor-product-import-template.csv" style={{ color: "#f5a800" }}>Download sample template</a>
        {" "}· <button type="button" onClick={downloadExcelTemplate}
          style={{ background: "none", border: "none", padding: 0, color: "#f5a800", cursor: "pointer", font: "inherit", textDecoration: "underline" }}>
          Download Excel (.xlsx) template
        </button>
        {" "}or <a href="/sample-product-upload.csv" target="_blank" rel="noopener noreferrer" download="sample-product-upload.csv" style={{ color: "#f5a800" }}>view legacy sample</a>
      </p>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
        <div style={{ color: "#e5e7eb", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Accepted Columns (aligned to Add Product)</div>
        <div style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.6 }}>
          id (optional for update), name, description, price, mrp, category, stock, imageLink, stockAlertThreshold, gstRate, allowedPinCodes
        </div>
        <div style={{ color: "#6b7280", fontSize: 11, marginTop: 6 }}>
          PIM-friendly header aliases also work: Product Name, Selling Price, Image URL, Stock Alert Threshold, GST Rate, Allowed Pin Codes.
          For allowedPinCodes, use a quoted comma-separated value like "400001,400002,400003".
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <FileUploadArea
            accept=".csv"
            icon="📊"
            onChange={f => { setFile(f); setProgress(null); }}
            fileNames={file ? file.name : null}
          />
        </div>
        <button style={{ ...vs.primaryBtn, whiteSpace: "nowrap" }} onClick={handleSubmit} disabled={uploading || !file}>
          {uploading ? "Uploading…" : "⬆ Upload & Import"}
        </button>
      </div>
      {progress && (
        <div style={{ marginTop: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden", height: 8 }}>
            <div style={{ height: "100%", width: `${progress.pct}%`, background: progress.error ? "#ef4444" : "#f5a800", transition: "width 0.4s" }} />
          </div>
          <div style={{ fontSize: 12, marginTop: 6, color: progress.error ? "#f87171" : "#9ca3af" }}>
            {progress.msg}{progress.error ? ` — ${progress.error}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Upload overlay (shown while Cloudinary processes images/video) ─────────────
function UploadOverlay() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,8,20,0.88)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%",
        border: "4px solid rgba(245,168,0,0.2)", borderTopColor: "#f5a800",
        animation: "pm-spin 0.9s linear infinite" }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Uploading your product…</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Uploading images &amp; video to Cloudinary — please wait, this can take up to 60 seconds</div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Please don't close this tab</div>
      <style>{`@keyframes pm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProductsManager({ products, api, onRefresh, showToast }) {
  const EMPTY_FORM = { name: "", description: "", price: "", mrp: "", discountPct: "",
    stock: "", category: "", stockAlertThreshold: 10, allowedPinCodes: "", gstRate: "" };

  const [showForm, setShowForm]     = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [mainImage, setMainImage]   = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [video, setVideo]           = useState(null);
  const [saving, setSaving]         = useState(false);
  const [categories, setCategories] = useState([]);

  // Load sub-categories for the dropdown
  useEffect(() => {
    api("/vendor/categories").then(d => { if (d.success && d.categories) setCategories(d.categories); });
  }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Live pricing calculator — mirrors HTML page exactly
  const onMrpChange = (val) => {
    setF("mrp", val);
    const mrp = parseFloat(val) || 0;
    const price = parseFloat(form.price) || 0;
    if (mrp > 0 && price > 0 && mrp > price)
      setF("discountPct", String(Math.round((mrp - price) / mrp * 100)));
    else setF("discountPct", "");
  };

  const onPriceChange = (val) => {
    setF("price", val);
    const mrp = parseFloat(form.mrp) || 0;
    const price = parseFloat(val) || 0;
    if (mrp > 0 && price > 0 && mrp > price)
      setF("discountPct", String(Math.round((mrp - price) / mrp * 100)));
    else setF("discountPct", "");
  };

  const onDiscountChange = (val) => {
    setF("discountPct", val);
    const mrp = parseFloat(form.mrp) || 0;
    const pct = parseFloat(val) || 0;
    if (mrp > 0 && pct > 0 && pct < 100)
      setF("price", String(Math.round(mrp * (1 - pct / 100))));
  };

  // Pricing preview values
  const previewMrp   = parseFloat(form.mrp) || 0;
  const previewPrice = parseFloat(form.price) || 0;
  const previewPct   = previewMrp > previewPrice && previewMrp > 0
    ? Math.round((previewMrp - previewPrice) / previewMrp * 100) : 0;
  const showPreview  = previewPrice > 0;

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setMainImage(null); setExtraImages([]); setVideo(null);
    setEditProduct(null); setShowForm(true);
  };

  const openEdit = (p) => {
    const mrp = p.mrp || "";
    const price = p.price || "";
    const discountPct = (mrp && price && mrp > price)
      ? String(Math.round((mrp - price) / mrp * 100)) : "";
    setForm({ name: p.name, description: p.description || "", price: String(price),
      mrp: String(mrp), discountPct, stock: String(p.stock),
      category: p.category || "", stockAlertThreshold: p.stockAlertThreshold || 10,
      allowedPinCodes: p.allowedPinCodes || "", gstRate: p.gstRate != null ? String(p.gstRate) : "" });
    setMainImage(null); setExtraImages([]); setVideo(null);
    setEditProduct(p); setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    // Build multipart FormData (supports files + JSON fields)
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("price", parseFloat(form.price) || 0);
    fd.append("mrp", parseFloat(form.mrp) || 0);
    fd.append("stock", parseInt(form.stock) || 0);
    fd.append("category", form.category);
    fd.append("stockAlertThreshold", parseInt(form.stockAlertThreshold) || 10);
    fd.append("allowedPinCodes", form.allowedPinCodes || "");
    if (form.gstRate !== "") fd.append("gstRate", parseFloat(form.gstRate));
    if (mainImage) fd.append("image", mainImage);
    extraImages.forEach(f => fd.append("extraImages", f));
    if (video) fd.append("video", video);

    let d;
    if (editProduct)
      d = await api(`/vendor/products/${editProduct.id}/update`, { method: "PUT", body: fd });
    else
      d = await api("/vendor/products/add", { method: "POST", body: fd });

    if (d.success) {
      showToast(editProduct ? "Product updated! ✓" : "Product added! ✓");
      setShowForm(false); onRefresh();
    } else {
      showToast(d.message || "Error saving product");
    }
    setSaving(false);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const d = await api(`/vendor/products/${id}/delete`, { method: "DELETE" });
    if (d.success) { showToast("Product deleted"); onRefresh(); }
    else showToast(d.message || "Error");
  };

  return (
    <div>
      {saving && <UploadOverlay />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={vs.pageTitle}>My Products</h2>
        <button style={vs.primaryBtn} onClick={openAdd}>+ Add Product</button>
      </div>

      {/* ── Add / Edit modal ── */}
      {showForm && (
        <div style={vs.modal}>
          <div style={{ ...vs.modalContent, maxWidth: 780 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={vs.cardTitle}>{editProduct ? "✏️ Edit Product" : "📦 Add New Product"}</h3>
              <button onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>

            {/* ── Basic Details ── */}
            <SectionLabel icon="🏷️" text="Basic Details" />
            <div style={vs.formGrid}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={vs.label}>Product Name *</label>
                <input style={vs.input} placeholder="e.g. Premium Wireless Headphones"
                  value={form.name} onChange={e => setF("name", e.target.value)} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={vs.label}>Description *</label>
                <textarea style={{ ...vs.input, minHeight: 80, resize: "vertical" }}
                  placeholder="Describe your product — features, materials, use cases…"
                  value={form.description} onChange={e => setF("description", e.target.value)} />
              </div>
              <div>
                <label style={vs.label}>Category *</label>
                <select style={{ ...vs.input, cursor: "pointer", appearance: "none" }}
                  value={form.category} onChange={e => setF("category", e.target.value)}>
                  <option value="" disabled>— Select a category —</option>
                  {categories.length > 0
                    ? categories.map(c => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.parentCategory
                            ? `${c.parentCategory.emoji || "📦"} ${c.parentCategory.name} › ${c.emoji ? c.emoji + " " : ""}${c.name}`
                            : `${c.emoji ? c.emoji + " " : ""}${c.name}`}
                        </option>
                      ))
                    : <option value={form.category}>{form.category || "No categories loaded"}</option>
                  }
                </select>
              </div>
              <div>
                <label style={vs.label}>M.R.P. / Original Price (₹) <span style={{ color: "#6b7280", fontWeight: 400, textTransform: "none" }}>(leave blank if no discount)</span></label>
                <input style={vs.input} type="number" placeholder="e.g. 699" min="0" step="0.01"
                  value={form.mrp} onChange={e => onMrpChange(e.target.value)} />
              </div>

              {/* Selling price + OR + discount % — exactly matching the HTML page */}
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "flex-end", gap: 12 }}>
                {/* Selling Price */}
                <div style={{ flex: 1 }}>
                  <label style={vs.label}>Selling Price (₹) <span style={{ color: "#ef4444" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: "#6b7280", fontSize: 14, pointerEvents: "none", userSelect: "none" }}>₹</span>
                    <input style={{ ...vs.input, paddingLeft: 28 }} type="number" placeholder="e.g. 179"
                      min="0" step="0.01" value={form.price} onChange={e => onPriceChange(e.target.value)} />
                  </div>
                </div>

                {/* OR divider */}
                <div style={{ paddingBottom: 10, color: "#6b7280", fontSize: 11, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>OR</div>

                {/* Discount % */}
                <div style={{ flex: 1 }}>
                  <label style={vs.label}>Discount %</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: "#6b7280", fontSize: 14, pointerEvents: "none", userSelect: "none" }}>%</span>
                    <input style={{ ...vs.input, paddingLeft: 28 }} type="number" placeholder="e.g. 74"
                      min="1" max="99" step="1" value={form.discountPct} onChange={e => onDiscountChange(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Live pricing preview */}
              {showPreview && (
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                  background: "rgba(245,168,0,0.07)", border: "1px solid rgba(245,168,0,0.25)",
                  borderRadius: 10, padding: "10px 14px" }}>
                  {previewPct > 0 && (
                    <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, fontWeight: 800,
                      padding: "2px 8px", borderRadius: 6 }}>-{previewPct}%</span>
                  )}
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#f5a800" }}>
                    ₹{previewPrice.toLocaleString("en-IN")}
                  </span>
                  {previewMrp > previewPrice && (
                    <span style={{ fontSize: 13, color: "#6b7280", textDecoration: "line-through" }}>
                      M.R.P.: ₹{previewMrp.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              )}

              <div>
                <label style={vs.label}>Stock (Units) *</label>
                <input style={vs.input} type="number" placeholder="e.g. 100" min="0"
                  value={form.stock} onChange={e => setF("stock", e.target.value)} />
              </div>
              <div>
                <label style={vs.label}>Stock Alert Threshold</label>
                <input style={vs.input} type="number" placeholder="Default: 10" min="1"
                  value={form.stockAlertThreshold} onChange={e => setF("stockAlertThreshold", e.target.value)} />
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  ⚡ Get an email when stock drops below this level
                </div>
              </div>

              {/* ── GST Rate ── */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={vs.label}>
                  GST Rate (%)
                  <span style={{ color: "#6b7280", fontWeight: 400, textTransform: "none", marginLeft: 6 }}>
                    — leave on "Auto" unless the govt has changed the slab for this product
                  </span>
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    style={{ ...vs.input, cursor: "pointer", appearance: "none", flex: "0 0 260px" }}
                    value={form.gstRate}
                    onChange={e => setF("gstRate", e.target.value)}
                  >
                    <option value="">🔄 Auto-detect from category</option>
                    <option value="0">0% — Essentials (food, books, medicines)</option>
                    <option value="5">5% — Apparel, FMCG, footwear</option>
                    <option value="12">12% — Furniture, toys, sports</option>
                    <option value="18">18% — Electronics, beauty, services</option>
                    <option value="28">28% — Luxury goods, gaming, auto parts</option>
                  </select>
                  {/* Live preview badge */}
                  <div style={{
                    background: form.gstRate !== ""
                      ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${form.gstRate !== "" ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700,
                    color: form.gstRate !== "" ? "#a5b4fc" : "#6b7280",
                    whiteSpace: "nowrap",
                  }}>
                    {form.gstRate !== ""
                      ? `GST: ${form.gstRate}% (manual override)`
                      : `GST: auto from "${form.category || "category"}"`}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 5, lineHeight: 1.5 }}>
                  ℹ️ Prices are <strong style={{ color: "#9ca3af" }}>GST-inclusive</strong> (MRP style).
                  The correct tax is back-calculated and shown to customers at checkout.
                  Update this field whenever the government revises the GST slab for your product.
                </div>
              </div>
            </div>

            {/* ── Media ── */}
            <SectionLabel icon="🖼️" text="Media" />
            <div style={vs.formGrid}>
              <div style={{ gridColumn: "1 / -1" }}>
                <FileUploadArea
                  label={editProduct ? "Replace Main Image (optional)" : "Main Image *"}
                  accept="image/*"
                  icon="🖼️"
                  onChange={f => setMainImage(f)}
                  fileNames={mainImage ? mainImage.name : (editProduct?.imageLink ? "Current image kept" : null)}
                />
              </div>
              <div>
                <FileUploadArea
                  label="Extra Images (optional · up to 4)"
                  accept="image/*"
                  multiple
                  icon="📷"
                  onChange={files => setExtraImages(files.slice(0, 4))}
                  fileNames={extraImages.length > 0 ? `${extraImages.length} file(s) selected` : null}
                />
              </div>
              <div>
                <FileUploadArea
                  label="Product Video (optional)"
                  accept="video/*"
                  icon="🎬"
                  onChange={f => setVideo(f)}
                  fileNames={video ? video.name : null}
                />
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>MP4, MOV or AVI · Max 100 MB</div>
              </div>
            </div>

            {/* ── Delivery Restrictions ── */}
            <SectionLabel icon="📍" text="Delivery Restrictions" optional />
            <label style={vs.label}>Allowed Delivery Pin Codes</label>
            <PinTagInput value={form.allowedPinCodes} onChange={v => setF("allowedPinCodes", v)} />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, marginBottom: 20 }}>
              ℹ️ Leave blank to allow delivery to all pin codes. Add each pin code one at a time.
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...vs.primaryBtn, flex: 1 }} onClick={save} disabled={saving}>
                {saving ? "Saving…" : (editProduct ? "💾 Save Changes" : "✚ Add Product")}
              </button>
              <button style={vs.secondaryBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Products table ── */}
      <div style={vs.tableWrap}>
        <table style={vs.table}>
          <thead><tr style={vs.thead}>
            {["Product", "Category", "Price", "MRP", "GST", "Stock", "Status", "Actions"].map(h =>
              <th key={h} style={vs.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={vs.tr}>
                <td style={vs.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {p.imageLink && (
                      <img src={p.imageLink} alt={p.name}
                        style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>#{p.id}</div>
                    </div>
                  </div>
                </td>
                <td style={vs.td}><span style={vs.catBadge}>{p.category}</span></td>
                <td style={vs.td}>{fmt(p.price)}</td>
                <td style={vs.td}>
                  {p.mrp ? (
                    <div>
                      <div style={{ textDecoration: "line-through", color: "#6b7280", fontSize: 12 }}>{fmt(p.mrp)}</div>
                      {p.mrp > p.price && (
                        <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>
                          -{Math.round((p.mrp - p.price) / p.mrp * 100)}%
                        </div>
                      )}
                    </div>
                  ) : "–"}
                </td>
                <td style={vs.td}>
                  {(() => {
                    const rate = p.gstRate != null ? p.gstRate : null;
                    return (
                      <div style={{ textAlign: "center" }}>
                        <span style={{
                          background: rate != null ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.06)",
                          color: rate != null ? "#a5b4fc" : "#6b7280",
                          border: `1px solid ${rate != null ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.1)"}`,
                          borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                        }}>
                          {rate != null ? `${rate}%` : "auto"}
                        </span>
                      </div>
                    );
                  })()}
                </td>
                <td style={vs.td}>
                  <span style={{ color: p.stock <= 10 ? "#ef4444" : "#22c55e", fontWeight: 700 }}>{p.stock}</span>
                  {p.stock <= p.stockAlertThreshold && <div style={{ fontSize: 10, color: "#f59e0b" }}>⚠ Low</div>}
                </td>
                <td style={vs.td}>
                  <span style={{ ...vs.badge, background: p.approved ? "#22c55e" : "#f59e0b" }}>
                    {p.approved ? "Approved" : "Pending"}
                  </span>
                </td>
                <td style={vs.td}>
                  <button style={vs.editBtn} onClick={() => openEdit(p)}>Edit</button>
                  <button style={vs.deleteBtn} onClick={() => deleteProduct(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div style={vs.empty}>No products yet. Add your first product!</div>}
      </div>

      {/* ── Bulk CSV Import ── */}
      <BulkCsvUpload api={api} showToast={showToast} />
    </div>
  );
}

function SectionLabel({ icon, text, optional }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "20px 0 12px",
      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f5a800" }}>
      {icon} {text}
      {optional && <span style={{ color: "#6b7280", fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11 }}>(Optional)</span>}
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

function StockAlertsView({ alerts, api, onRefresh, showToast }) {
  const ack = async (id) => {
    const d = await api(`/vendor/stock-alerts/${id}/acknowledge`, { method: "POST" });
    if (d.success) { showToast("Alert acknowledged"); onRefresh(); } else showToast(d.message || "Error");
  };

  const pendingAlerts = (alerts || []).filter(a => !a.acknowledged);
  const acknowledgedAlerts = (alerts || []).filter(a => a.acknowledged);

  return (
    <div>
      <h2 style={vs.pageTitle}>Stock Alerts ⚠️</h2>
      {pendingAlerts.length === 0 ? <div style={vs.emptyGreen}>✓ No pending stock alerts.</div> :
        pendingAlerts.map(a => (
          <div key={a.id} style={vs.alertCard}>
            <div>
              <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{a.productName}</div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>Stock: <span style={{ color: "#ef4444", fontWeight: 700 }}>{a.currentStock}</span> (threshold: {a.threshold})</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{a.message}</div>
            </div>
            <button style={vs.secondaryBtn} onClick={() => ack(a.id)}>Acknowledge</button>
          </div>
        ))}

      {acknowledgedAlerts.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ color: "#6b7280", marginBottom: 10, fontSize: 15 }}>Acknowledged ({acknowledgedAlerts.length})</h3>
          {acknowledgedAlerts.slice(0, 10).map(a => (
            <div key={a.id} style={{ ...vs.alertCard, opacity: 0.75 }}>
              <div>
                <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{a.productName}</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>Stock: <span style={{ color: "#ef4444", fontWeight: 700 }}>{a.currentStock}</span> (threshold: {a.threshold})</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{a.message}</div>
              </div>
              <span style={{ ...vs.badge, background: "#374151", color: "#d1d5db" }}>Acknowledged</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VendorProfile({ profile, api, onRefresh, showToast }) {
  const [form, setForm] = useState({ name: "", mobile: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => { if (profile) setForm({ name: profile.name || "", mobile: profile.mobile || "" }); }, [profile]);

  const save = async () => {
    const d = await api("/vendor/profile/update", { method: "PUT", body: JSON.stringify(form) });
    showToast(d.message || (d.success ? "Saved!" : "Error"));
    if (d.success) onRefresh();
  };

  const changePw = async () => {
    const d = await api("/vendor/profile/change-password", { method: "PUT", body: JSON.stringify(pwForm) });
    showToast(d.message || (d.success ? "Password changed!" : "Failed"));
    if (d.success) setPwForm({ currentPassword: "", newPassword: "" });
  };

  if (!profile) return <div style={vs.empty}>Loading...</div>;
  return (
    <div>
      <h2 style={vs.pageTitle}>Vendor Profile</h2>
      <div style={vs.twoCol}>
        <div style={vs.card}>
          <div style={vs.vendorAvatar}>{(profile.name || "?")[0].toUpperCase()}</div>
          {[["Vendor Code", profile.vendorCode || "N/A"], ["Email", profile.email], ["Verified", profile.verified ? "✓ Yes" : "✗ No"]].map(([k, v]) => (
            <div key={k} style={vs.infoRow}><span style={vs.infoLabel}>{k}</span><span style={{ color: k === "Verified" ? (profile.verified ? "#22c55e" : "#ef4444") : "#e5e7eb", fontSize: 13, fontWeight: 600 }}>{v}</span></div>
          ))}
          <div style={{ marginTop: 20 }}>
            <label style={vs.label}>Name</label>
            <input style={vs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <label style={{ ...vs.label, marginTop: 12 }}>Mobile</label>
            <input style={vs.input} value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
            <button style={{ ...vs.primaryBtn, marginTop: 16 }} onClick={save}>Save Changes</button>
          </div>
        </div>
        <div style={vs.card}>
          <h3 style={vs.cardTitle}>Change Password 🔐</h3>
          <label style={vs.label}>Current Password</label>
          <input style={{ ...vs.input, marginBottom: 12 }} type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          <label style={vs.label}>New Password</label>
          <input style={{ ...vs.input, marginBottom: 16 }} type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
          <button style={vs.primaryBtn} onClick={changePw}>Change Password</button>
        </div>
      </div>
    </div>
  );
}

function VendorSecurity({ profile, api, onRefresh, showToast }) {
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });

  const changePw = async () => {
    const d = await api("/vendor/profile/change-password", { method: "PUT", body: JSON.stringify(pwForm) });
    showToast(d.message || (d.success ? "Password changed!" : "Failed"));
    if (d.success) setPwForm({ currentPassword: "", newPassword: "" });
  };

  if (!profile) return <div style={vs.empty}>Loading...</div>;

  return (
    <div>
      <h2 style={vs.pageTitle}>Security Settings</h2>
      <div style={vs.twoCol}>
        {/* Change Password Card */}
        <div style={vs.card}>
          <h3 style={vs.cardTitle}>🔑 Change Password</h3>
          <label style={vs.label}>Current Password</label>
          <input style={{ ...vs.input, marginBottom: 12 }} type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          <label style={vs.label}>New Password</label>
          <input style={{ ...vs.input, marginBottom: 16 }} type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
          <button style={vs.primaryBtn} onClick={changePw}>Change Password</button>
        </div>

        {/* Connected Accounts Card */}
        <div style={vs.card}>
          <h3 style={vs.cardTitle}>🔗 Connected Accounts</h3>
          {(() => {
            const PROVIDERS = [
              { id: "google",    label: "Google",    icon: "G", color: "#EA4335" },
              { id: "github",    label: "GitHub",    icon: "⌥", color: "#24292f" },
              { id: "facebook",  label: "Facebook",  icon: "f", color: "#1877F2" },
              { id: "instagram", label: "Instagram", icon: "📷", color: "#c13584" },
            ];
            const linkedProvider = profile?.provider && profile.provider !== "local" ? profile.provider : null;

            return (
              <>
                {PROVIDERS.map(p => {
                  const isLinked = linkedProvider === p.id;
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 28, height: 28, borderRadius: 14, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>{p.icon}</span>
                        <span style={{ color: "#e5e7eb", fontSize: 13 }}>{p.label}</span>
                      </div>
                      {isLinked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 700 }}>✓ Linked</span>
                          {profile.password && (
                            <button style={{ ...vs.deleteBtn }} onClick={async () => {
                              const d = await api("/vendor/profile/unlink-oauth", { method: "DELETE" });
                              showToast(d.message || (d.success ? "Unlinked!" : "Failed"));
                              if (d.success) onRefresh();
                            }}>Unlink</button>
                          )}
                        </div>
                      ) : (
                        <button style={{ ...vs.editBtn, color: "#22c55e", borderColor: "rgba(34,197,94,0.4)" }} disabled={!!linkedProvider} onClick={async () => {
                          const d = await api("/vendor/profile/link-oauth", { method: "POST", body: JSON.stringify({ provider: p.id }) });
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
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

const vs = {
  root: { minHeight: "100vh", background: "#ffffff", fontFamily: "'Segoe UI', sans-serif", color: "#111827" },
  main: { maxWidth: 1200, margin: "0 auto", padding: "24px 20px" },
  nav: { background: "#ffffff", borderBottom: "2px solid #e5e7eb", padding: "0 24px", display: "flex", alignItems: "center", gap: 8, height: 64, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflowX: "auto" },
  brand: { fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: 1, whiteSpace: "nowrap" },
  navLinks: { display: "flex", gap: 2, flex: 1 },
  navBtn: { padding: "7px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#374151", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  navBtnActive: { background: "#dcfce7", color: "#15803d" },
  logoutBtn: { padding: "7px 16px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff1f1", color: "#dc2626", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  toast: { position: "fixed", bottom: 24, right: 24, background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", padding: "14px 22px", borderRadius: 12, zIndex: 999, fontSize: 15 },
  pageTitle: { fontSize: 26, fontWeight: 800, marginBottom: 24, color: "#111827" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  statIcon: (c) => ({ fontSize: 24, marginBottom: 8, width: 48, height: 48, borderRadius: 12, background: c + "20", display: "flex", alignItems: "center", justifyContent: "center" }),
  statVal: { fontSize: 28, fontWeight: 900, color: "#111827", marginBottom: 4 },
  statLabel: { color: "#6b7280", fontSize: 14 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card: { background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  cardTitle: { fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 },
  listRow: { display: "flex", gap: 12, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f3f4f6" },
  badge: { padding: "4px 12px", borderRadius: 20, color: "#fff", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  catBadge: { background: "#ede9fe", color: "#5b21b6", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700 },
  empty: { textAlign: "center", padding: "40px", color: "#6b7280", fontSize: 17 },
  emptyGreen: { textAlign: "center", padding: "40px", color: "#16a34a", fontSize: 17 },
  tableWrap: { background: "#ffffff", borderRadius: 16, border: "1.5px solid #e5e7eb", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#f9fafb" },
  th: { padding: "13px 16px", textAlign: "left", color: "#374151", fontSize: 13, fontWeight: 700, textTransform: "uppercase" },
  tr: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "13px 16px", fontSize: 15, color: "#111827" },
  editBtn: { padding: "6px 14px", borderRadius: 7, border: "1.5px solid #6366f1", background: "#ede9fe", color: "#4f46e5", cursor: "pointer", fontSize: 13, marginRight: 6, fontWeight: 600 },
  deleteBtn: { padding: "6px 14px", borderRadius: 7, border: "1.5px solid #fca5a5", background: "#fff1f1", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  primaryBtn: { padding: "11px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 },
  secondaryBtn: { padding: "9px 18px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#f9fafb", color: "#111827", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modalContent: { background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 20, padding: 32, width: "90%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: { display: "block", color: "#374151", fontSize: 13, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  input: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#ffffff", color: "#111827", fontSize: 15, boxSizing: "border-box" },
  alertCard: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff1f1", border: "1.5px solid #fca5a5", borderRadius: 12, padding: "16px 20px", marginBottom: 12 },
  orderCard: { background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 14, padding: 18, marginBottom: 12 },
  vendorAvatar: { width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, color: "#fff", marginBottom: 20 },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f3f4f6" },
  infoLabel: { color: "#6b7280", fontSize: 14 },
  infoVal: { color: "#111827", fontSize: 14, fontWeight: 600 },
};