import { useState, useEffect, useCallback } from "react";
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
  const [page, setPage] = useState("dashboard");
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
    const [s, p, o, a, pr] = await Promise.all([
      api("/vendor/stats"), api("/vendor/products"),
      api("/vendor/orders"), api("/vendor/stock-alerts"), api("/vendor/profile")
    ]);
    if (s.success) setStats(s);
    if (p.success) setProducts(p.products || []);
    if (o.success) setOrders(o.orders || []);
    if (a.success) setStockAlerts(a.alerts || []);
    if (pr.success) setProfile(pr.vendor);
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
          <button style={vs.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </nav>

      <main style={vs.main}>
        {page === "dashboard" && <Dashboard stats={stats} orders={orders} products={products} />}
        {page === "products" && <ProductsManager products={products} api={api} onRefresh={loadAll} showToast={showToast} />}
        {page === "orders" && <OrdersView orders={orders} onMarkPacked={markPacked} />}
        {page === "sales" && <SalesReport salesData={salesData} onPeriodChange={loadSales} />}
        {page === "alerts" && <StockAlertsView alerts={stockAlerts} api={api} onRefresh={loadAll} showToast={showToast} />}
        {page === "storefront" && <StoreFront profile={profile} products={products} api={api} onRefresh={loadAll} showToast={showToast} />}
        {page === "profile" && <VendorProfile profile={profile} api={api} onRefresh={loadAll} showToast={showToast} />}
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
  const statusColor = { PLACED: "#f59e0b", CONFIRMED: "#6366f1", SHIPPED: "#3b82f6", DELIVERED: "#22c55e", CANCELLED: "#ef4444", OUT_FOR_DELIVERY: "#8b5cf6" };
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
  const statusColor = { PLACED: "#f59e0b", CONFIRMED: "#6366f1", SHIPPED: "#3b82f6", DELIVERED: "#22c55e", CANCELLED: "#ef4444", OUT_FOR_DELIVERY: "#8b5cf6" };
  const pending = (orders || []).filter(o => o.trackingStatus === "PLACED");
  const inProgress = (orders || []).filter(o => ["CONFIRMED", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.trackingStatus));
  const done = (orders || []).filter(o => ["DELIVERED", "CANCELLED"].includes(o.trackingStatus));

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
          {o.trackingStatus === "PLACED" && (
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
  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => {
    if (profile) setForm({ name: profile.name || "", description: profile.description || "" });
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

function ProductsManager({ products, api, onRefresh, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", mrp: "", stock: "", category: "", imageLink: "", stockAlertThreshold: 10, allowedPinCodes: "" });
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm({ name: "", description: "", price: "", mrp: "", stock: "", category: "", imageLink: "", stockAlertThreshold: 10, allowedPinCodes: "" }); setEditProduct(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ name: p.name, description: p.description, price: p.price, mrp: p.mrp || "", stock: p.stock, category: p.category, imageLink: p.imageLink || "", stockAlertThreshold: p.stockAlertThreshold || 10, allowedPinCodes: p.allowedPinCodes || "" }); setEditProduct(p); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    const body = { ...form, price: parseFloat(form.price), mrp: parseFloat(form.mrp) || 0, stock: parseInt(form.stock), stockAlertThreshold: parseInt(form.stockAlertThreshold) };
    let d;
    if (editProduct) d = await api(`/vendor/products/${editProduct.id}/update`, { method: "PUT", body: JSON.stringify(body) });
    else d = await api("/vendor/products/add", { method: "POST", body: JSON.stringify(body) });
    if (d.success) { showToast(editProduct ? "Product updated!" : "Product added!"); setShowForm(false); onRefresh(); }
    else showToast(d.message || "Error");
    setSaving(false);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const d = await api(`/vendor/products/${id}/delete`, { method: "DELETE" });
    if (d.success) { showToast("Product deleted"); onRefresh(); } else showToast(d.message || "Error");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={vs.pageTitle}>My Products</h2>
        <button style={vs.primaryBtn} onClick={openAdd}>+ Add Product</button>
      </div>
      {showForm && (
        <div style={vs.modal}>
          <div style={vs.modalContent}>
            <h3 style={vs.cardTitle}>{editProduct ? "Edit Product" : "Add New Product"}</h3>
            <div style={vs.formGrid}>
              {[["name", "Product Name"], ["category", "Category"], ["price", "Selling Price"], ["mrp", "MRP (optional)"], ["stock", "Stock Qty"], ["stockAlertThreshold", "Stock Alert Threshold"], ["imageLink", "Image URL"], ["allowedPinCodes", "Allowed PIN Codes (comma-separated)"]].map(([k, label]) => (
                <div key={k} style={{ gridColumn: ["imageLink", "allowedPinCodes"].includes(k) ? "1 / -1" : "" }}>
                  <label style={vs.label}>{label}</label>
                  <input style={vs.input} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={vs.label}>Description</label>
                <textarea style={{ ...vs.input, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button style={vs.primaryBtn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              <button style={vs.secondaryBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={vs.tableWrap}>
        <table style={vs.table}>
          <thead><tr style={vs.thead}>
            {["Product", "Category", "Price", "MRP", "Stock", "Status", "Actions"].map(h => <th key={h} style={vs.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={vs.tr}>
                <td style={vs.td}><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ color: "#6b7280", fontSize: 12 }}>#{p.id}</div></td>
                <td style={vs.td}><span style={vs.catBadge}>{p.category}</span></td>
                <td style={vs.td}>{fmt(p.price)}</td>
                <td style={vs.td}>{p.mrp ? fmt(p.mrp) : "–"}</td>
                <td style={vs.td}><span style={{ color: p.stock <= 10 ? "#ef4444" : "#22c55e", fontWeight: 700 }}>{p.stock}</span></td>
                <td style={vs.td}><span style={{ ...vs.badge, background: p.approved ? "#22c55e" : "#f59e0b" }}>{p.approved ? "Approved" : "Pending"}</span></td>
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
    </div>
  );
}

function StockAlertsView({ alerts, api, onRefresh, showToast }) {
  const ack = async (id) => {
    const d = await api(`/vendor/stock-alerts/${id}/acknowledge`, { method: "POST" });
    if (d.success) { showToast("Alert acknowledged"); onRefresh(); } else showToast(d.message || "Error");
  };
  return (
    <div>
      <h2 style={vs.pageTitle}>Stock Alerts ⚠️</h2>
      {alerts.length === 0 ? <div style={vs.emptyGreen}>✓ No stock alerts. All products are well-stocked!</div> :
        alerts.map(a => (
          <div key={a.id} style={vs.alertCard}>
            <div>
              <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{a.productName}</div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>Stock: <span style={{ color: "#ef4444", fontWeight: 700 }}>{a.currentStock}</span> (threshold: {a.threshold})</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{a.message}</div>
            </div>
            <button style={vs.secondaryBtn} onClick={() => ack(a.id)}>Acknowledge</button>
          </div>
        ))}
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

const vs = {
  root: { minHeight: "100vh", background: "#0f0f1a", fontFamily: "'Segoe UI', sans-serif", color: "#e5e7eb" },
  main: { maxWidth: 1200, margin: "0 auto", padding: "24px 20px" },
  nav: { background: "rgba(15,15,26,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px", display: "flex", alignItems: "center", gap: 8, height: 60, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)", overflowX: "auto" },
  brand: { fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: 1, whiteSpace: "nowrap" },
  navLinks: { display: "flex", gap: 2, flex: 1 },
  navBtn: { padding: "6px 10px", borderRadius: 8, border: "none", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  navBtnActive: { background: "rgba(34,197,94,0.15)", color: "#86efac" },
  logoutBtn: { padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" },
  toast: { position: "fixed", bottom: 24, right: 24, background: "#1f2937", border: "1px solid rgba(255,255,255,0.15)", color: "#e5e7eb", padding: "12px 20px", borderRadius: 12, zIndex: 999, fontSize: 14 },
  pageTitle: { fontSize: 24, fontWeight: 800, marginBottom: 24, color: "#e5e7eb" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 },
  statIcon: (c) => ({ fontSize: 24, marginBottom: 8, width: 44, height: 44, borderRadius: 12, background: c + "20", display: "flex", alignItems: "center", justifyContent: "center" }),
  statVal: { fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 4 },
  statLabel: { color: "#9ca3af", fontSize: 13 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#e5e7eb", marginBottom: 16 },
  listRow: { display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  badge: { padding: "3px 10px", borderRadius: 20, color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  catBadge: { background: "rgba(99,102,241,0.2)", color: "#a5b4fc", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 },
  empty: { textAlign: "center", padding: "40px", color: "#6b7280", fontSize: 16 },
  emptyGreen: { textAlign: "center", padding: "40px", color: "#22c55e", fontSize: 16 },
  tableWrap: { background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "rgba(255,255,255,0.06)" },
  th: { padding: "12px 16px", textAlign: "left", color: "#9ca3af", fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.06)" },
  td: { padding: "12px 16px", fontSize: 14, color: "#e5e7eb" },
  editBtn: { padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.4)", background: "transparent", color: "#a5b4fc", cursor: "pointer", fontSize: 12, marginRight: 6 },
  deleteBtn: { padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 12 },
  primaryBtn: { padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 },
  secondaryBtn: { padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#e5e7eb", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modalContent: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32, width: "90%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: { display: "block", color: "#9ca3af", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, boxSizing: "border-box" },
  alertCard: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 12 },
  orderCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, marginBottom: 12 },
  vendorAvatar: { width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 20 },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" },
  infoLabel: { color: "#9ca3af", fontSize: 13 },
  infoVal: { color: "#e5e7eb", fontSize: 13, fontWeight: 600 },
};