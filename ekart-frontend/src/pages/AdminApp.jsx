import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../App";
import { apiFetch } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN");

function Toast({ msg, onHide }) {
  useEffect(() => { if (msg) { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return <div style={as.toast}>{msg}</div>;
}

export default function AdminApp() {
  const { auth, logout } = useAuth();
  const [page, setPage] = useState("overview");
  const [users, setUsers] = useState({ customers: [], vendors: [] });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const api = useCallback(async (path, opts = {}) => {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    const res = await fetch("http://localhost:8080/api/flutter" + path, { ...opts, headers });
    return res.json();
  }, []);
  const show = m => setToast(m);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p, o, v] = await Promise.all([
        api("/admin/users"), api("/admin/products"), api("/admin/orders"), api("/admin/vendors")
      ]);
      if (u.success) setUsers({ customers: u.customers || [], vendors: u.vendors || [] });
      if (p.success) setProducts(p.products || []);
      if (o.success) setOrders(o.orders || []);
      if (v.success) setVendors(v.vendors || []);
    } catch { show("Failed to load"); }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (page === "coupons")   api("/admin/coupons").then(d => d.success && setCoupons(d.coupons || [])); }, [page]);
  useEffect(() => { if (page === "refunds")   api("/admin/refunds").then(d => d.success && setRefunds(d.refunds || [])); }, [page]);
  useEffect(() => { if (page === "reviews")   api("/admin/reviews").then(d => d.success && setReviews(d.reviews || [])); }, [page]);
  useEffect(() => { if (page === "analytics") api("/admin/analytics").then(d => d.success && setAnalytics(d)); }, [page]);
  useEffect(() => { if (page === "warehouse") api("/admin/warehouses").then(d => d.success && setWarehouses(d.warehouses || [])); }, [page]);
  useEffect(() => { if (page === "delivery")  api("/admin/delivery-boys").then(d => d.success && setDeliveryBoys(d.deliveryBoys || [])); }, [page]);
  
  useEffect(() => { if (page === "policies") fetchPolicies(); }, [page]);

  const [policies, setPolicies] = useState([]);

  const fetchPolicies = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/policies");
      if (!res.ok) throw new Error("Failed to fetch policies");
      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : (data.policies || []));
    } catch (err) { show("Failed to load policies"); }
  };

  const createPolicy = async (p) => {
    try {
      const res = await fetch("http://localhost:8080/api/policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) throw new Error("create failed");
      await fetchPolicies();
      show("Policy created");
    } catch { show("Failed to create policy"); }
  };

  const updatePolicy = async (slug, p) => {
    try {
      const res = await fetch(`http://localhost:8080/api/policies/${slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) throw new Error("update failed");
      await fetchPolicies();
      show("Policy updated");
    } catch { show("Failed to update policy"); }
  };

  const deletePolicy = async (slug) => {
    if (!window.confirm("Delete policy?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/policies/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      await fetchPolicies();
      show("Policy deleted");
    } catch { show("Failed to delete policy"); }
  };

  const approveProduct = async (id) => { const d = await api(`/admin/products/${id}/approve`, { method: "POST" }); if (d.success) { show("Approved ✓"); loadAll(); } else show(d.message || "Error"); };
  const rejectProduct  = async (id) => { const d = await api(`/admin/products/${id}/reject`,  { method: "POST" }); if (d.success) { show("Rejected");   loadAll(); } else show(d.message || "Error"); };
  const toggleCustomer = async (id) => { const d = await api(`/admin/customers/${id}/toggle-active`, { method: "POST" }); if (d.success) { show("Updated"); loadAll(); } else show(d.message || "Error"); };
  const toggleVendor   = async (id) => { const d = await api(`/admin/vendors/${id}/toggle-active`,   { method: "POST" }); if (d.success) { show("Updated"); loadAll(); } else show(d.message || "Error"); };
  const updateOrder    = async (id, status) => { const d = await api(`/admin/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); if (d.success) { show("Updated"); loadAll(); } else show(d.message || "Error"); };
  const approveRefund  = async (id) => { const d = await api(`/admin/refunds/${id}/approve`, { method: "POST" }); if (d.success) { show("Refund approved"); api("/admin/refunds").then(d => d.success && setRefunds(d.refunds || [])); } else show(d.message || "Error"); };
  const rejectRefund   = async (id, reason) => { const d = await api(`/admin/refunds/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }); if (d.success) { show("Refund rejected"); api("/admin/refunds").then(d => d.success && setRefunds(d.refunds || [])); } else show(d.message || "Error"); };
  const deleteReview   = async (id) => { const d = await api(`/admin/reviews/${id}/delete`, { method: "DELETE" }); if (d.success) { show("Deleted"); api("/admin/reviews").then(d => d.success && setReviews(d.reviews || [])); } else show(d.message || "Error"); };
  const approveDelivery = async (id) => { const d = await api(`/admin/delivery-boys/${id}/approve`, { method: "POST" }); if (d.success) { show("Approved ✓"); api("/admin/delivery-boys").then(d => d.success && setDeliveryBoys(d.deliveryBoys || [])); } else show(d.message || "Error"); };
  const approveTransfer = async (id) => { const d = await api(`/admin/warehouse-transfers/${id}/approve`, { method: "POST" }); if (d.success) { show("Transfer approved!"); } else show(d.message || "Error"); };
  const rejectTransfer  = async (id) => { const d = await api(`/admin/warehouse-transfers/${id}/reject`,  { method: "POST" }); if (d.success) { show("Transfer rejected"); } else show(d.message || "Error"); };

  const pendingProducts = products.filter(p => !p.approved);
  const pendingRefunds  = refunds.filter(r => r.status === "PENDING");
  const totalRevenue    = orders.filter(o => o.trackingStatus === "DELIVERED").reduce((s, o) => s + (o.amount || 0), 0);

  const tabs = [
    { key: "overview",   label: "📊 Overview" },
    { key: "products",   label: `🏷️ Products${pendingProducts.length > 0 ? ` (${pendingProducts.length})` : ""}` },
    { key: "orders",     label: "📦 Orders" },
    { key: "customers",  label: "👥 Customers" },
    { key: "vendors",    label: "🏪 Vendors" },
    { key: "delivery",   label: "🛵 Delivery" },
    { key: "warehouse",  label: "🏭 Warehouses" },
    { key: "coupons",    label: "🎟️ Coupons" },
    { key: "refunds",    label: `💸 Refunds${pendingRefunds.length > 0 ? ` (${pendingRefunds.length})` : ""}` },
    { key: "reviews",    label: "⭐ Reviews" },
    { key: "analytics",  label: "📈 Analytics" },
    { key: "usersearch", label: "🔍 User Search" },
    { key: "policies",   label: "📜 Policies" },
    { key: "security",   label: "🔐 Security" },
    { key: "accounts",   label: "🔐 Accounts" },
    { key: "content",    label: "🖼️ Content" },
  ];

  return (
    <div style={as.root}>
      <Toast msg={toast} onHide={() => setToast("")} />
      <nav style={as.nav}>
        <span style={as.brand}>⚙️ EKART Admin</span>
        <div style={as.navLinks}>
          {tabs.map(t => (
            <button key={t.key} style={{ ...as.navBtn, ...(page === t.key ? as.navBtnActive : {}) }}
              onClick={() => setPage(t.key)}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "rgba(13,13,13,0.5)", fontSize: 13 }}>Admin</span>
          <button style={as.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </nav>

      <main style={as.main}>
        {loading ? <div style={as.empty}>Loading admin data…</div> : <>
          {page === "overview"   && <Overview users={users} products={products} orders={orders} totalRevenue={totalRevenue} pendingProducts={pendingProducts} />}
          {page === "products"   && <ProductsAdmin products={products} onApprove={approveProduct} onReject={rejectProduct} />}
          {page === "orders"     && <OrdersAdmin orders={orders} onUpdateStatus={updateOrder} />}
          {page === "customers"  && <CustomersAdmin customers={users.customers} onToggle={toggleCustomer} />}
          {page === "vendors"    && <VendorsAdmin vendors={vendors} onToggle={toggleVendor} />}
          {page === "delivery"   && <DeliveryAdmin deliveryBoys={deliveryBoys} onApprove={approveDelivery} onApproveTransfer={approveTransfer} onRejectTransfer={rejectTransfer} api={api} showToast={show} />}
          {page === "warehouse"  && <WarehouseAdmin warehouses={warehouses} api={api} showToast={show} onRefresh={() => api("/admin/warehouses").then(d => d.success && setWarehouses(d.warehouses || []))} />}
          {page === "coupons"    && <CouponsAdmin coupons={coupons} api={api} showToast={show} onRefresh={() => api("/admin/coupons").then(d => d.success && setCoupons(d.coupons || []))} />}
          {page === "refunds"    && <RefundsAdmin refunds={refunds} onApprove={approveRefund} onReject={rejectRefund} />}
          {page === "reviews"    && <ReviewsAdmin reviews={reviews} onDelete={deleteReview} />}
          {page === "analytics"  && <AnalyticsAdmin data={analytics} orders={orders} products={products} users={users} totalRevenue={totalRevenue} />}
          {page === "usersearch" && <UserSearch api={api} showToast={show} />}
          {page === "policies"   && <PoliciesAdmin policies={policies} onCreate={createPolicy} onUpdate={updatePolicy} onDelete={deletePolicy} />}
          {page === "security"   && <SecurityAdmin />}
          {page === "accounts"   && <AccountsAdmin />}
          {page === "content"    && <ContentAdmin />}
        </>}
      </main>
    </div>
  );
}

/* ── Overview ── */
function Overview({ users, products, orders, totalRevenue, pendingProducts }) {
  const stats = [
    { label: "Customers",       value: users.customers.length, icon: "👥", color: "#2563eb" },
    { label: "Vendors",         value: users.vendors.length,   icon: "🏪", color: "#d4a017" },
    { label: "Products",        value: products.length,        icon: "🏷️", color: "#7c3aed" },
    { label: "Pending Approval",value: pendingProducts.length, icon: "⏳", color: "#e84c3c" },
    { label: "Total Orders",    value: orders.length,          icon: "📦", color: "#0284c7" },
    { label: "Total Revenue",   value: fmt(totalRevenue),      icon: "💰", color: "#1db882" },
  ];
  const statusCounts = orders.reduce((a, o) => { a[o.trackingStatus] = (a[o.trackingStatus] || 0) + 1; return a; }, {});
  return (
    <div>
      <h2 style={as.pageTitle}>Platform Overview</h2>
      <div style={as.statsGrid}>
        {stats.map(s => (
          <div key={s.label} style={as.statCard}>
            <div style={as.statIcon(s.color)}>{s.icon}</div>
            <div style={as.statVal}>{s.value}</div>
            <div style={as.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={as.twoCol}>
        <div style={as.card}>
          <h3 style={as.cardTitle}>Order Status Breakdown</h3>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, minWidth: 170, color: "#0d0d0d" }}>{status.replace(/_/g, " ")}</span>
              <div style={{ flex: 1, height: 8, background: "#f2f0eb", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 4, width: `${Math.round(count / Math.max(orders.length, 1) * 100)}%` }} />
              </div>
              <span style={{ fontSize: 13, color: "rgba(13,13,13,0.5)", minWidth: 28 }}>{count}</span>
            </div>
          ))}
        </div>
        <div style={as.card}>
          <h3 style={as.cardTitle}>Pending Approvals</h3>
          {pendingProducts.length === 0 ? <p style={{ color: "#1db882", fontSize: 14 }}>✓ All products reviewed</p> :
            pendingProducts.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f2f0eb" }}>
                <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "rgba(13,13,13,0.5)" }}>{p.category}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(p.price)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ── Products ── */
function ProductsAdmin({ products, onApprove, onReject }) {
  const [filter, setFilter] = useState("pending");
  const filtered = filter === "all" ? products : filter === "pending" ? products.filter(p => !p.approved) : products.filter(p => p.approved);
  return (
    <div>
      <h2 style={as.pageTitle}>Product Management</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["all","All"],["pending","Pending"],["approved","Approved"]].map(([k,l]) => (
          <button key={k} style={{ ...as.filterBtn, ...(filter === k ? as.filterBtnActive : {}) }} onClick={() => setFilter(k)}>
            {l} ({k === "all" ? products.length : k === "pending" ? products.filter(p => !p.approved).length : products.filter(p => p.approved).length})
          </button>
        ))}
      </div>
      <AdminTable
        cols={["Product","Vendor","Category","Price","Stock","Status","Actions"]}
        rows={filtered.map(p => [
          <div><div style={{ fontWeight: 700 }}>{p.name}</div><div style={{ color: "rgba(13,13,13,0.4)", fontSize: 11 }}>#{p.id}</div></div>,
          p.vendorName || "—", p.category, fmt(p.price), p.stock,
          <span style={{ ...as.badge, background: p.approved ? "#e8f9f2" : "#fef9e7", color: p.approved ? "#1db882" : "#d4a017" }}>{p.approved ? "Approved" : "Pending"}</span>,
          <div style={{ display: "flex", gap: 6 }}>
            {!p.approved && <button style={as.approveBtn} onClick={() => onApprove(p.id)}>✓</button>}
            {p.approved  && <button style={as.rejectBtn}  onClick={() => onReject(p.id)}>✗</button>}
          </div>
        ])}
        empty="No products to show"
      />
    </div>
  );
}

/* ── Orders ── */
function OrdersAdmin({ orders, onUpdateStatus }) {
  const statuses = ["PLACED","CONFIRMED","SHIPPED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"];
  const [filter, setFilter] = useState("");
  const filtered = filter ? orders.filter(o => o.trackingStatus === filter) : orders;
  const sColor = { PLACED:"#d4a017",CONFIRMED:"#2563eb",SHIPPED:"#0284c7",OUT_FOR_DELIVERY:"#7c3aed",DELIVERED:"#1db882",CANCELLED:"#e84c3c" };
  return (
    <div>
      <h2 style={as.pageTitle}>Order Management</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={{ ...as.filterBtn, ...(filter === "" ? as.filterBtnActive : {}) }} onClick={() => setFilter("")}>All ({orders.length})</button>
        {statuses.map(s => { const c = orders.filter(o => o.trackingStatus === s).length; return c > 0 ? <button key={s} style={{ ...as.filterBtn, ...(filter === s ? as.filterBtnActive : {}) }} onClick={() => setFilter(s)}>{s.replace(/_/g," ")} ({c})</button> : null; })}
      </div>
      <AdminTable
        cols={["ID","Customer","Amount","Date","Status","Update"]}
        rows={filtered.map(o => [
          `#${o.id}`, o.customerName || "—", fmt(o.amount || o.totalPrice),
          o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN") : "—",
          <span style={{ ...as.badge, background: (sColor[o.trackingStatus] || "#6b7280") + "22", color: sColor[o.trackingStatus] || "#6b7280" }}>{o.trackingStatus?.replace(/_/g," ")}</span>,
          <select style={as.statusSelect} value={o.trackingStatus} onChange={e => onUpdateStatus(o.id, e.target.value)}>
            {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
          </select>
        ])}
        empty="No orders"
      />
    </div>
  );
}

/* ── Customers ── */
function CustomersAdmin({ customers, onToggle }) {
  const [q, setQ] = useState("");
  const filtered = q ? customers.filter(c => c.name?.toLowerCase().includes(q.toLowerCase()) || c.email?.toLowerCase().includes(q.toLowerCase())) : customers;
  return (
    <div>
      <h2 style={as.pageTitle}>Customer Management</h2>
      <input style={{ ...as.searchInput, marginBottom: 20 }} placeholder="Search customers…" value={q} onChange={e => setQ(e.target.value)} />
      <AdminTable
        cols={["ID","Name","Email","Mobile","Verified","Active","Action"]}
        rows={filtered.map(c => [
          `#${c.id}`, c.name, c.email, c.mobile,
          <span style={{ color: c.verified ? "#1db882" : "#e84c3c" }}>{c.verified ? "✓" : "✗"}</span>,
          <span style={{ ...as.badge, background: c.active ? "#e8f9f2" : "#fef2f2", color: c.active ? "#1db882" : "#e84c3c" }}>{c.active ? "Active" : "Inactive"}</span>,
          <button style={c.active ? as.rejectBtn : as.approveBtn} onClick={() => onToggle(c.id)}>{c.active ? "Deactivate" : "Activate"}</button>
        ])}
        empty="No customers"
      />
    </div>
  );
}

/* ── Vendors ── */
function VendorsAdmin({ vendors, onToggle }) {
  return (
    <div>
      <h2 style={as.pageTitle}>Vendor Management</h2>
      <AdminTable
        cols={["ID","Name","Email","Mobile","Verified","Active","Action"]}
        rows={vendors.map(v => [
          `#${v.id}`, v.name, v.email, v.mobile,
          <span style={{ color: v.verified ? "#1db882" : "#e84c3c" }}>{v.verified ? "✓" : "✗"}</span>,
          <span style={{ ...as.badge, background: v.active !== false ? "#e8f9f2" : "#fef2f2", color: v.active !== false ? "#1db882" : "#e84c3c" }}>{v.active !== false ? "Active" : "Inactive"}</span>,
          <button style={v.active !== false ? as.rejectBtn : as.approveBtn} onClick={() => onToggle(v.id)}>{v.active !== false ? "Deactivate" : "Activate"}</button>
        ])}
        empty="No vendors"
      />
    </div>
  );
}

/* ── Delivery Management ── */
function DeliveryAdmin({ deliveryBoys, onApprove, onApproveTransfer, onRejectTransfer, api, showToast }) {
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    api("/admin/warehouse-transfers").then(d => { if (d.success) setTransfers(d.requests || []); setLoadingTransfers(false); });
  }, []);

  const filtered = filter === "pending" ? deliveryBoys.filter(d => !d.approved) : deliveryBoys;
  const pendingTransfers = transfers.filter(t => t.status === "PENDING");

  return (
    <div>
      <h2 style={as.pageTitle}>Delivery Management 🛵</h2>

      {/* Pending Transfers */}
      {pendingTransfers.length > 0 && (
        <div style={{ ...as.card, marginBottom: 24, borderColor: "#d4a017" }}>
          <h3 style={{ ...as.cardTitle, color: "#d4a017" }}>⚠️ Warehouse Transfer Requests ({pendingTransfers.length})</h3>
          {pendingTransfers.map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f2f0eb" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.deliveryBoy?.name || "—"} ({t.deliveryBoy?.deliveryBoyCode})</div>
                <div style={{ fontSize: 13, color: "rgba(13,13,13,0.5)" }}>
                  {t.deliveryBoy?.warehouse?.name} → {t.requestedWarehouse?.name}, {t.requestedWarehouse?.city}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={as.approveBtn} onClick={() => { onApproveTransfer(t.id); setTransfers(tr => tr.filter(x => x.id !== t.id)); }}>Approve</button>
                <button style={as.rejectBtn}  onClick={() => { onRejectTransfer(t.id);  setTransfers(tr => tr.filter(x => x.id !== t.id)); }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["pending","Pending Approval"],["all","All Delivery Boys"]].map(([k, l]) => (
          <button key={k} style={{ ...as.filterBtn, ...(filter === k ? as.filterBtnActive : {}) }} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      <AdminTable
        cols={["ID","Name","Email","Mobile","Code","Warehouse","Status","Action"]}
        rows={filtered.map(d => [
          `#${d.id}`, d.name, d.email, d.mobile, d.deliveryBoyCode,
          d.warehouse ? `${d.warehouse.name}` : "—",
          <span style={{ ...as.badge, background: d.approved ? "#e8f9f2" : "#fef9e7", color: d.approved ? "#1db882" : "#d4a017" }}>{d.approved ? "Active" : "Pending"}</span>,
          !d.approved ? <button style={as.approveBtn} onClick={() => onApprove(d.id)}>Approve</button> : null
        ])}
        empty="No delivery boys"
      />
    </div>
  );
}

/* ── Warehouse Management ── */
function WarehouseAdmin({ warehouses, api, showToast, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", state: "", warehouseCode: "", servedPinCodes: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const d = await api("/admin/warehouses/add", { method: "POST", body: JSON.stringify(form) });
    if (d.success) { showToast("Warehouse added!"); setShowForm(false); setForm({ name: "", city: "", state: "", warehouseCode: "", servedPinCodes: "" }); onRefresh(); }
    else showToast(d.message || "Error");
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={as.pageTitle}>Warehouse Management 🏭</h2>
        <button style={{ ...as.approveBtn, padding: "10px 20px" }} onClick={() => setShowForm(!showForm)}>+ Add Warehouse</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Warehouses", value: warehouses.length },
          { label: "Cities Covered", value: new Set(warehouses.map(w => w.city)).size },
          { label: "States Covered", value: new Set(warehouses.map(w => w.state)).size },
        ].map(s => (
          <div key={s.label} style={as.statCard}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0d0d0d", marginBottom: 4 }}>{s.value}</div>
            <div style={as.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ ...as.card, marginBottom: 24 }}>
          <h3 style={as.cardTitle}>Add New Warehouse</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["name","Warehouse Name"],["city","City"],["state","State"],["warehouseCode","Warehouse Code"]].map(([k,l]) => (
              <div key={k}>
                <label style={as.label}>{l}</label>
                <input style={as.inputFull} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={as.label}>Served PIN Codes (comma-separated)</label>
              <input style={as.inputFull} value={form.servedPinCodes} onChange={e => setForm(f => ({ ...f, servedPinCodes: e.target.value }))} placeholder="560001, 560002, 560003" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...as.approveBtn, padding: "10px 20px" }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Add Warehouse"}</button>
            <button style={{ ...as.filterBtn }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {warehouses.map(w => (
          <div key={w.id} style={{ ...as.card, borderLeft: "4px solid #2563eb" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{w.name}</div>
            <div style={{ fontSize: 13, color: "rgba(13,13,13,0.55)", marginBottom: 8 }}>{w.city}, {w.state}</div>
            <div style={{ fontSize: 12, fontFamily: "monospace", background: "#f2f0eb", padding: "4px 8px", borderRadius: 6, display: "inline-block", marginBottom: 8 }}>{w.warehouseCode}</div>
            {w.servedPinCodes && <div style={{ fontSize: 12, color: "rgba(13,13,13,0.5)" }}>📍 {w.servedPinCodes}</div>}
          </div>
        ))}
        {warehouses.length === 0 && <div style={as.empty}>No warehouses yet</div>}
      </div>
    </div>
  );
}

/* ── Coupons ── */
function CouponsAdmin({ coupons, api, showToast, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", value: "", expiryDate: "", minOrderAmount: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const d = await api("/admin/coupons/create", { method: "POST", body: JSON.stringify({ ...form, value: parseFloat(form.value), minOrderAmount: parseFloat(form.minOrderAmount) || 0 }) });
    if (d.success) { showToast("Coupon created!"); setShowForm(false); setForm({ code: "", description: "", value: "", expiryDate: "", minOrderAmount: "" }); onRefresh(); }
    else showToast(d.message || "Error");
    setSaving(false);
  };
  const deleteCoupon = async (id) => { const d = await api(`/admin/coupons/${id}/delete`, { method: "DELETE" }); if (d.success) { showToast("Deleted"); onRefresh(); } else showToast(d.message || "Error"); };
  const toggleCoupon = async (id) => { const d = await api(`/admin/coupons/${id}/toggle`, { method: "POST" }); if (d.success) { showToast("Updated"); onRefresh(); } else showToast(d.message || "Error"); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={as.pageTitle}>Coupon Management 🎟️</h2>
        <button style={{ ...as.approveBtn, padding: "10px 20px" }} onClick={() => setShowForm(!showForm)}>+ Create Coupon</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[["Total",coupons.length],["Active",coupons.filter(c=>c.active).length],["Total Uses",coupons.reduce((s,c)=>s+(c.usedCount||0),0)]].map(([l,v]) => (
          <div key={l} style={as.statCard}><div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{v}</div><div style={as.statLabel}>{l}</div></div>
        ))}
      </div>
      {showForm && (
        <div style={{ ...as.card, marginBottom: 24 }}>
          <h3 style={as.cardTitle}>Create Coupon</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["code","Coupon Code"],["value","Discount %"],["minOrderAmount","Min Order ₹"],["expiryDate","Expiry Date"]].map(([k,l]) => (
              <div key={k}>
                <label style={as.label}>{l}</label>
                <input style={as.inputFull} type={k === "expiryDate" ? "date" : k === "value" || k === "minOrderAmount" ? "number" : "text"} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={as.label}>Description</label>
              <input style={as.inputFull} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...as.approveBtn, padding: "10px 20px" }} onClick={save} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
            <button style={{ ...as.filterBtn }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
      <AdminTable
        cols={["Code","Description","Discount","Min Order","Used","Expiry","Status","Actions"]}
        rows={coupons.map(c => [
          <code style={{ fontWeight: 700, color: "#2563eb" }}>{c.code}</code>,
          c.description || "—",
          <span style={{ color: "#1db882", fontWeight: 700 }}>{c.value}% OFF</span>,
          c.minOrderAmount > 0 ? fmt(c.minOrderAmount) : "—",
          c.usedCount || 0,
          c.expiryDate ? new Date(c.expiryDate).toLocaleDateString("en-IN") : "—",
          <span style={{ ...as.badge, background: c.active ? "#e8f9f2" : "#f2f0eb", color: c.active ? "#1db882" : "rgba(13,13,13,0.4)" }}>{c.active ? "Active" : "Disabled"}</span>,
          <div style={{ display: "flex", gap: 6 }}>
            <button style={c.active ? as.rejectBtn : as.approveBtn} onClick={() => toggleCoupon(c.id)}>{c.active ? "Disable" : "Enable"}</button>
            <button style={as.rejectBtn} onClick={() => { if(window.confirm("Delete?")) deleteCoupon(c.id); }}>Delete</button>
          </div>
        ])}
        empty="No coupons"
      />
    </div>
  );
}

/* ── Refunds ── */
function RefundsAdmin({ refunds, onApprove, onReject }) {
  const [filter, setFilter] = useState("PENDING");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const filtered = filter === "ALL" ? refunds : refunds.filter(r => r.status === filter);
  const sColor = { PENDING: "#d4a017", APPROVED: "#1db882", REJECTED: "#e84c3c" };
  return (
    <div>
      <h2 style={as.pageTitle}>Refund Management 💸</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[["Pending",refunds.filter(r=>r.status==="PENDING").length],["Pending Amount",fmt(refunds.filter(r=>r.status==="PENDING").reduce((s,r)=>s+(r.amount||0),0))],["Total",refunds.length]].map(([l,v]) => (
          <div key={l} style={as.statCard}><div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{v}</div><div style={as.statLabel}>{l}</div></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["PENDING","APPROVED","REJECTED","ALL"].map(f => (
          <button key={f} style={{ ...as.filterBtn, ...(filter === f ? as.filterBtnActive : {}) }} onClick={() => setFilter(f)}>
            {f} ({f === "ALL" ? refunds.length : refunds.filter(r => r.status === f).length})
          </button>
        ))}
      </div>
      {filtered.map(r => (
        <div key={r.id} style={{ ...as.card, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Refund #{r.id} — Order #{r.orderId || r.order?.id}</div>
              <div style={{ fontSize: 13, color: "rgba(13,13,13,0.5)" }}>{r.customerName || r.customer?.name} · {r.customerEmail || r.customer?.email}</div>
            </div>
            <span style={{ ...as.badge, background: (sColor[r.status] || "#888") + "22", color: sColor[r.status] || "#888" }}>{r.status}</span>
          </div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Reason: <strong>{r.reason}</strong></div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{fmt(r.amount)}</div>
          <div style={{ fontSize: 12, color: "rgba(13,13,13,0.4)", marginBottom: 10 }}>
            {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            {r.rejectionReason && <span style={{ marginLeft: 12, color: "#e84c3c" }}>Reason: {r.rejectionReason}</span>}
          </div>
          {r.status === "PENDING" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...as.approveBtn, padding: "8px 18px" }} onClick={() => onApprove(r.id)}>✓ Approve</button>
              <button style={{ ...as.rejectBtn, padding: "8px 18px" }} onClick={() => { setRejectModal(r.id); setRejectReason(""); }}>✗ Reject</button>
            </div>
          )}
        </div>
      ))}
      {filtered.length === 0 && <div style={as.empty}>No {filter.toLowerCase()} refunds</div>}
      {rejectModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, maxWidth: 400, width: "100%" }}>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, marginBottom: 12 }}>Reject Refund</h3>
            <textarea style={{ ...as.inputFull, minHeight: 80, resize: "vertical", marginBottom: 16 }} placeholder="Rejection reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...as.rejectBtn, flex: 1, padding: "10px" }} onClick={() => { onReject(rejectModal, rejectReason); setRejectModal(null); }}>Reject</button>
              <button style={as.filterBtn} onClick={() => setRejectModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reviews ── */
function ReviewsAdmin({ reviews, onDelete }) {
  const [starFilter, setStarFilter] = useState(0);
  const filtered = starFilter ? reviews.filter(r => r.rating === starFilter) : reviews;
  return (
    <div>
      <h2 style={as.pageTitle}>Review Management ⭐</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[["Total",reviews.length],["Avg Rating",(reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : 0) + " ⭐"],["5-Star",reviews.filter(r=>r.rating===5).length],["1-Star",reviews.filter(r=>r.rating===1).length]].map(([l,v]) => (
          <div key={l} style={as.statCard}><div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{v}</div><div style={as.statLabel}>{l}</div></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={{ ...as.filterBtn, ...(starFilter === 0 ? as.filterBtnActive : {}) }} onClick={() => setStarFilter(0)}>All</button>
        {[5,4,3,2,1].map(n => <button key={n} style={{ ...as.filterBtn, ...(starFilter === n ? as.filterBtnActive : {}) }} onClick={() => setStarFilter(n)}>{"★".repeat(n)}{"☆".repeat(5-n)}</button>)}
      </div>
      {filtered.map(r => (
        <div key={r.id} style={{ ...as.card, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0d0d0d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{(r.customerName || "?")[0].toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.customerName || "Customer"}</div>
                <div style={{ color: "#d4a017" }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</div>
              </div>
            </div>
            <button style={{ ...as.rejectBtn, padding: "4px 10px" }} onClick={() => { if(window.confirm("Delete?")) onDelete(r.id); }}>🗑️</button>
          </div>
          <div style={{ fontSize: 13, color: "rgba(13,13,13,0.5)", marginTop: 4 }}>Product: {r.productName || "—"}</div>
          <p style={{ fontSize: 14, color: "rgba(13,13,13,0.6)", marginTop: 6 }}>{r.comment}</p>
        </div>
      ))}
      {filtered.length === 0 && <div style={as.empty}>No reviews found</div>}
    </div>
  );
}

/* ── Analytics ── */
function AnalyticsAdmin({ data, orders, products, users, totalRevenue }) {
  const statusCounts = orders.reduce((a, o) => { a[o.trackingStatus] = (a[o.trackingStatus] || 0) + 1; return a; }, {});
  const catCounts = products.reduce((a, p) => { a[p.category] = (a[p.category] || 0) + 1; return a; }, {});
  const s = data || { totalCustomers: users.customers.length, totalVendors: users.vendors.length, totalProducts: products.length, totalOrders: orders.length, totalRevenue };

  return (
    <div>
      <h2 style={as.pageTitle}>Analytics & Reports 📈</h2>
      <div style={as.statsGrid}>
        {[
          ["👥","Customers", s.totalCustomers || users.customers.length,"#2563eb"],
          ["🏪","Vendors",   s.totalVendors   || users.vendors.length,  "#d4a017"],
          ["🏷️","Products",  s.totalProducts  || products.length,       "#7c3aed"],
          ["📦","Orders",    s.totalOrders    || orders.length,          "#0284c7"],
          ["💰","Revenue",   fmt(s.totalRevenue || totalRevenue),        "#1db882"],
          ["✅","Delivered", orders.filter(o => o.trackingStatus === "DELIVERED").length, "#1db882"],
        ].map(([icon,label,value,color]) => (
          <div key={label} style={as.statCard}>
            <div style={as.statIcon(color)}>{icon}</div>
            <div style={as.statVal}>{value}</div>
            <div style={as.statLabel}>{label}</div>
          </div>
        ))}
      </div>
      <div style={as.twoCol}>
        <div style={as.card}>
          <h3 style={as.cardTitle}>Order Status Breakdown</h3>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, minWidth: 170 }}>{status.replace(/_/g, " ")}</span>
              <div style={{ flex: 1, height: 8, background: "#f2f0eb", borderRadius: 4 }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 4, width: `${Math.round(count / Math.max(orders.length,1) * 100)}%` }} />
              </div>
              <span style={{ fontSize: 13, color: "rgba(13,13,13,0.5)", minWidth: 28 }}>{count}</span>
            </div>
          ))}
        </div>
        <div style={as.card}>
          <h3 style={as.cardTitle}>Products by Category</h3>
          {Object.entries(catCounts).slice(0, 8).map(([cat, count]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, minWidth: 140 }}>{cat}</span>
              <div style={{ flex: 1, height: 8, background: "#f2f0eb", borderRadius: 4 }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#d4a017,#e84c3c)", borderRadius: 4, width: `${Math.round(count / Math.max(products.length,1) * 100)}%` }} />
              </div>
              <span style={{ fontSize: 13, color: "rgba(13,13,13,0.5)", minWidth: 28 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── User Search ── */
function UserSearch({ api, showToast }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    const d = await api(`/admin/users/search?q=${encodeURIComponent(q)}&type=${filter}`);
    if (d.success) setResults(d.users || []);
    else showToast(d.message || "Search failed");
    setLoading(false);
  };

  return (
    <div>
      <h2 style={as.pageTitle}>Search Users 👥</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input style={{ ...as.searchInput, flex: 1 }} placeholder="Search by name, email, or mobile…" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
        <select style={as.statusSelect} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Users</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendors</option>
          <option value="delivery">Delivery</option>
        </select>
        <button style={{ ...as.approveBtn, padding: "10px 20px" }} onClick={search} disabled={loading}>{loading ? "Searching…" : "Search"}</button>
      </div>
      {results.length > 0 && (
        <AdminTable
          cols={["ID","Name","Email","Mobile","Type","Verified","Active"]}
          rows={results.map(u => [
            `#${u.id}`, u.name, u.email, u.mobile,
            <span style={{ ...as.badge, background: "#f2f0eb", color: "rgba(13,13,13,0.7)" }}>{u.type || u.role || "—"}</span>,
            <span style={{ color: u.verified ? "#1db882" : "#e84c3c" }}>{u.verified ? "✓" : "✗"}</span>,
            <span style={{ ...as.badge, background: u.active !== false ? "#e8f9f2" : "#fef2f2", color: u.active !== false ? "#1db882" : "#e84c3c" }}>{u.active !== false ? "Active" : "Inactive"}</span>
          ])}
          empty="No users found"
        />
      )}
      {results.length === 0 && q && !loading && <div style={as.empty}>No results for "{q}"</div>}
      {!q && <div style={as.empty}>Enter a name, email, or mobile to search</div>}
    </div>
  );
}

/* ── Shared table component ── */
function AdminTable({ cols, rows, empty }) {
  if (rows.length === 0) return <div style={as.empty}>{empty}</div>;
  return (
    <div style={as.tableWrap}>
      <table style={as.table}>
        <thead><tr style={as.thead}>{cols.map(c => <th key={c} style={as.th}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} style={as.tr}>{row.map((cell, j) => <td key={j} style={as.td}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ── Styles ── */
const as = {
  root: { minHeight: "100vh", background: "#fafaf8", fontFamily: "'DM Sans', sans-serif", color: "#0d0d0d" },
  main: { maxWidth: 1300, margin: "0 auto", padding: "32px 24px" },
  nav: { background: "#fff", borderBottom: "1px solid #e8e4dc", padding: "0 24px", display: "flex", alignItems: "center", gap: 8, height: 64, position: "sticky", top: 0, zIndex: 100, overflowX: "auto" },
  brand: { fontSize: 18, fontWeight: 800, color: "#0d0d0d", whiteSpace: "nowrap", letterSpacing: "-0.5px" },
  navLinks: { display: "flex", gap: 2, flex: 1 },
  navBtn: { padding: "7px 12px", borderRadius: 8, border: "none", background: "transparent", color: "rgba(13,13,13,0.5)", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  navBtnActive: { background: "#0d0d0d", color: "#fff" },
  logoutBtn: { padding: "7px 16px", borderRadius: 8, border: "1px solid #e8e4dc", background: "transparent", color: "#e84c3c", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0d0d0d", color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 999 },
  pageTitle: { fontSize: 24, fontWeight: 800, marginBottom: 24, color: "#0d0d0d", letterSpacing: "-0.5px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14, marginBottom: 32 },
  statCard: { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: 18 },
  statIcon: c => ({ fontSize: 22, marginBottom: 8, width: 40, height: 40, borderRadius: 10, background: c + "18", display: "flex", alignItems: "center", justifyContent: "center" }),
  statVal: { fontSize: 22, fontWeight: 900, color: "#0d0d0d", marginBottom: 2 },
  statLabel: { color: "rgba(13,13,13,0.5)", fontSize: 12 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card: { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#0d0d0d", marginBottom: 16 },
  badge: { padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700 },
  tableWrap: { background: "#fff", borderRadius: 16, border: "1px solid #e8e4dc", overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 600 },
  thead: { background: "#f2f0eb" },
  th: { padding: "12px 14px", textAlign: "left", color: "rgba(13,13,13,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f2f0eb" },
  td: { padding: "12px 14px", fontSize: 13, color: "#0d0d0d" },
  approveBtn: { padding: "5px 12px", borderRadius: 7, border: "1px solid #86efac", background: "#e8f9f2", color: "#1db882", cursor: "pointer", fontSize: 12, fontWeight: 700, marginRight: 6 },
  rejectBtn: { padding: "5px 12px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fef2f2", color: "#e84c3c", cursor: "pointer", fontSize: 12, fontWeight: 700 },
  filterBtn: { padding: "7px 14px", borderRadius: 8, border: "1px solid #e8e4dc", background: "transparent", color: "rgba(13,13,13,0.5)", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  filterBtnActive: { background: "#0d0d0d", color: "#fff", border: "1px solid #0d0d0d" },
  statusSelect: { padding: "5px 10px", borderRadius: 7, border: "1px solid #e8e4dc", background: "#fafaf8", color: "#0d0d0d", fontSize: 12 },
  searchInput: { padding: "10px 16px", borderRadius: 10, border: "1px solid #e8e4dc", background: "#fff", color: "#0d0d0d", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  inputFull: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #e8e4dc", background: "#fafaf8", color: "#0d0d0d", fontSize: 14, boxSizing: "border-box", outline: "none" },
  label: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "#0d0d0d" },
  empty: { textAlign: "center", padding: "40px", color: "rgba(13,13,13,0.4)", fontSize: 15 },
};

/* ── Accounts Admin ── */
function AccountsAdmin() {
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0 });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null); // { type: "profile"|"delete"|"reset", account, data }

  const show = m => setToast(m);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 3000); return () => clearTimeout(t); } }, [toast]);

  const load = async (search = "") => {
    setLoading(true);
    try {
      const url = search ? `/api/admin/accounts?search=${encodeURIComponent(search)}` : "/api/admin/accounts";
      const res = await fetch(url);
      const d = await res.json();
      if (d.success) {
        setAccounts(d.accounts || []);
        const total = (d.accounts || []).length;
        const active = (d.accounts || []).filter(a => a.isActive).length;
        setStats({ total, active, suspended: total - active });
      }
    } catch { show("Failed to load accounts"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = e => {
    setQ(e.target.value);
    clearTimeout(window._acctSearch);
    window._acctSearch = setTimeout(() => load(e.target.value), 400);
  };

  const toggleStatus = async (id, activate) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: activate }),
      });
      const d = await res.json();
      if (d.success) { show(activate ? "Account activated" : "Account suspended"); load(q); }
      else show(d.message || "Error");
    } catch { show("Request failed"); }
  };

  const resetPassword = async (id) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}/reset-password`, { method: "POST" });
      const d = await res.json();
      if (d.success) setModal({ type: "reset", data: d });
      else show(d.message || "Error");
    } catch { show("Request failed"); }
  };

  const deleteAccount = async (id) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) { show("Account deleted"); setModal(null); load(q); }
      else show(d.message || "Error");
    } catch { show("Request failed"); }
  };

  const viewProfile = async (id) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}/profile`);
      const d = await res.json();
      if (d.error) { show(d.error); return; }
      setModal({ type: "profile", data: d });
    } catch { show("Failed to load profile"); }
  };

  const roleColor = { CUSTOMER: "#2563eb", VENDOR: "#d4a017", ADMIN: "#7c3aed" };

  return (
    <div>
      {toast && <div style={as.toast}>{toast}</div>}
      <h2 style={as.pageTitle}>Account Management 🔐</h2>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Accounts", value: stats.total,     icon: "👤", color: "#2563eb" },
          { label: "Active",         value: stats.active,    icon: "✅", color: "#1db882" },
          { label: "Suspended",      value: stats.suspended, icon: "🚫", color: "#e84c3c" },
        ].map(s => (
          <div key={s.label} style={as.statCard}>
            <div style={as.statIcon(s.color)}>{s.icon}</div>
            <div style={as.statVal}>{s.value}</div>
            <div style={as.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        style={{ ...as.searchInput, marginBottom: 20 }}
        placeholder="Search by name, email, or mobile…"
        value={q}
        onChange={handleSearch}
      />

      {/* Table */}
      {loading ? (
        <div style={as.empty}>Loading accounts…</div>
      ) : accounts.length === 0 ? (
        <div style={as.empty}>No accounts found</div>
      ) : (
        <div style={as.tableWrap}>
          <table style={as.table}>
            <thead>
              <tr style={as.thead}>
                {["ID","Name","Email","Mobile","Role","Verified","Status","Actions"].map(c => (
                  <th key={c} style={as.th}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} style={as.tr}>
                  <td style={as.td}>#{a.id}</td>
                  <td style={{ ...as.td, fontWeight: 600, cursor: "pointer", color: "#2563eb" }}
                      onClick={() => viewProfile(a.id)}>{a.name}</td>
                  <td style={as.td}>{a.email}</td>
                  <td style={as.td}>{a.mobile || "—"}</td>
                  <td style={as.td}>
                    <span style={{ ...as.badge, background: (roleColor[a.role] || "#6b7280") + "18", color: roleColor[a.role] || "#6b7280" }}>
                      {a.role || "—"}
                    </span>
                  </td>
                  <td style={as.td}>
                    <span style={{ color: a.verified ? "#1db882" : "#e84c3c", fontWeight: 700 }}>
                      {a.verified ? "✓" : "✗"}
                    </span>
                  </td>
                  <td style={as.td}>
                    <span style={{ ...as.badge, background: a.isActive ? "#e8f9f2" : "#fef2f2", color: a.isActive ? "#1db882" : "#e84c3c" }}>
                      {a.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td style={{ ...as.td, whiteSpace: "nowrap" }}>
                    <button
                      style={a.isActive ? as.rejectBtn : as.approveBtn}
                      onClick={() => toggleStatus(a.id, !a.isActive)}
                      title={a.isActive ? "Suspend" : "Activate"}
                    >
                      {a.isActive ? "Suspend" : "Activate"}
                    </button>
                    <button
                      style={{ ...as.filterBtn, fontSize: 11, padding: "4px 10px", marginRight: 6 }}
                      onClick={() => resetPassword(a.id)}
                      title="Reset Password"
                    >
                      🔑 Reset
                    </button>
                    <button
                      style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fef2f2", color: "#e84c3c", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                      onClick={() => setModal({ type: "delete", account: a })}
                      title="Delete Account"
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Profile Modal */}
      {modal?.type === "profile" && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>User Profile</h3>
              <button style={closeBtnStyle} onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#2563eb18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#2563eb" }}>
                {(modal.data.name || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{modal.data.name || "Unknown"}</div>
                <div style={{ color: "rgba(13,13,13,0.5)", fontSize: 13 }}>{modal.data.email}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Mobile",      modal.data.mobile || "N/A"],
                ["Role",        modal.data.role || "—"],
                ["Status",      modal.data.isActive ? "Active" : "Suspended"],
                ["Verified",    modal.data.verified ? "Yes" : "No"],
                ["Joined",      modal.data.createdAt ? new Date(modal.data.createdAt).toLocaleDateString("en-IN") : "—"],
                ["Last Login",  modal.data.lastLogin ? new Date(modal.data.lastLogin).toLocaleString("en-IN") : "Never"],
                ["Orders",      modal.data.orderCount ?? "—"],
                ["Total Spent", modal.data.totalSpent != null ? "₹" + Number(modal.data.totalSpent).toLocaleString("en-IN") : "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#f2f0eb", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {modal?.type === "delete" && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={{ ...modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Delete Account?</h3>
            <p style={{ color: "rgba(13,13,13,0.6)", marginBottom: 24, fontSize: 14 }}>
              This will permanently delete <strong>{modal.account.name}</strong>'s account. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={{ ...as.filterBtn, padding: "8px 20px" }} onClick={() => setModal(null)}>Cancel</button>
              <button
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#e84c3c", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                onClick={() => deleteAccount(modal.account.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Result Modal */}
      {modal?.type === "reset" && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={{ ...modalBox, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Password Reset Link</h3>
            <p style={{ color: "rgba(13,13,13,0.6)", fontSize: 13, marginBottom: 14 }}>{modal.data.message || "Reset link generated successfully."}</p>
            {modal.data.resetLink && (
              <input
                readOnly
                value={modal.data.resetLink}
                style={{ ...as.searchInput, marginBottom: 16, fontSize: 12, background: "#f2f0eb" }}
                onClick={e => e.target.select()}
              />
            )}
            <button style={{ ...as.approveBtn, padding: "8px 20px" }} onClick={() => setModal(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Content / Banner Admin ── */
function ContentAdmin() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editModal, setEditModal] = useState(null); // banner object
  const [form, setForm] = useState({ title: "", imageUrl: "", linkUrl: "" });
  const [saving, setSaving] = useState(false);

  const show = m => setToast(m);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 3000); return () => clearTimeout(t); } }, [toast]);

  const loadBanners = async () => {
    setLoading(true);
    try {
      // Backend exposes banners via the Thymeleaf page; fetch via the JSON-friendly generic endpoint
      const res = await fetch("/api/admin/accounts/stats"); // ping to confirm auth
      // Use the admin content page data via a lightweight fetch
      const r2 = await fetch("/admin/content", { headers: { Accept: "application/json, text/html" } });
      // Since no dedicated JSON endpoint exists, we parse the page or use an iframe-free approach.
      // Instead, call the flutter-compatible endpoint if available, else fall back to HTML scraping.
      // Best approach: expose via /api/flutter/admin/banners — check if it exists
      const r3 = await fetch("/api/flutter/admin/banners");
      if (r3.ok) {
        const d = await r3.json();
        if (d.success) { setBanners(d.banners || []); setLoading(false); return; }
      }
      // Fallback: use a generic read-only endpoint
      const r4 = await fetch("/api/read/Banner");
      if (r4.ok) {
        const d = await r4.json();
        setBanners(Array.isArray(d) ? d : (d.data || []));
      }
    } catch { show("Failed to load banners"); }
    setLoading(false);
  };

  useEffect(() => { loadBanners(); }, []);

  const postAction = async (url) => {
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.redirected || res.ok) { loadBanners(); return true; }
      return false;
    } catch { return false; }
  };

  const toggleBanner = async (id) => {
    const ok = await postAction(`/admin/content/toggle/${id}`);
    if (ok) show("Banner updated");
    else show("Error toggling banner");
  };

  const deleteBanner = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    const ok = await postAction(`/admin/content/delete/${id}`);
    if (ok) show("Banner deleted");
    else show("Error deleting banner");
  };

  const toggleHome = async (id) => {
    await postAction(`/admin/content/toggle-home/${id}`);
    loadBanners();
  };

  const toggleCustomerHome = async (id) => {
    await postAction(`/admin/content/toggle-customer-home/${id}`);
    loadBanners();
  };

  const addBanner = async () => {
    if (!form.title.trim() || !form.imageUrl.trim()) { show("Title and Image URL are required"); return; }
    setSaving(true);
    try {
      const params = new URLSearchParams({ title: form.title, imageUrl: form.imageUrl, linkUrl: form.linkUrl });
      const res = await fetch("/admin/content/add", { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (res.ok || res.redirected) {
        show("Banner added ✓");
        setForm({ title: "", imageUrl: "", linkUrl: "" });
        setShowAddForm(false);
        loadBanners();
      } else show("Failed to add banner");
    } catch { show("Error adding banner"); }
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({ title: editModal.title, imageUrl: editModal.imageUrl, linkUrl: editModal.linkUrl || "" });
      const res = await fetch(`/admin/content/update/${editModal.id}`, { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (res.ok || res.redirected) {
        show("Banner updated ✓");
        setEditModal(null);
        loadBanners();
      } else show("Failed to update banner");
    } catch { show("Error updating banner"); }
    setSaving(false);
  };

  const stats = {
    total:    banners.length,
    active:   banners.filter(b => b.active).length,
    onHome:   banners.filter(b => b.showOnHome).length,
    onCust:   banners.filter(b => b.showOnCustomerHome).length,
  };

  return (
    <div>
      {toast && <div style={as.toast}>{toast}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ ...as.pageTitle, marginBottom: 0 }}>Content Management 🖼️</h2>
        <button
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#0d0d0d", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
          onClick={() => setShowAddForm(v => !v)}
        >
          {showAddForm ? "✕ Cancel" : "+ Add Banner"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Banners",      value: stats.total,  icon: "🖼️", color: "#7c3aed" },
          { label: "Active",             value: stats.active, icon: "✅", color: "#1db882" },
          { label: "On Landing Page",    value: stats.onHome, icon: "🏠", color: "#2563eb" },
          { label: "On Customer Home",   value: stats.onCust, icon: "👤", color: "#d4a017" },
        ].map(s => (
          <div key={s.label} style={as.statCard}>
            <div style={as.statIcon(s.color)}>{s.icon}</div>
            <div style={as.statVal}>{s.value}</div>
            <div style={as.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add Banner Form */}
      {showAddForm && (
        <div style={{ ...as.card, marginBottom: 24, border: "2px dashed #e8e4dc" }}>
          <h3 style={as.cardTitle}>Add New Banner</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[
              { key: "title",    label: "Banner Title *",   placeholder: "e.g. Summer Sale" },
              { key: "imageUrl", label: "Image URL *",      placeholder: "https://example.com/banner.jpg" },
              { key: "linkUrl",  label: "Link URL",         placeholder: "https://ekart.com/sale" },
            ].map(f => (
              <div key={f.key}>
                <label style={as.label}>{f.label}</label>
                <input
                  style={as.inputFull}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {form.imageUrl && (
            <div style={{ marginBottom: 14 }}>
              <label style={as.label}>Preview</label>
              <img src={form.imageUrl} alt="preview" style={{ height: 80, borderRadius: 8, objectFit: "cover", border: "1px solid #e8e4dc" }} onError={e => e.target.style.display = "none"} />
            </div>
          )}
          <button
            style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: "#0d0d0d", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1 }}
            onClick={addBanner}
            disabled={saving}
          >
            {saving ? "Adding…" : "Add Banner"}
          </button>
        </div>
      )}

      {/* Banners Table */}
      {loading ? (
        <div style={as.empty}>Loading banners…</div>
      ) : banners.length === 0 ? (
        <div style={as.empty}>No banners found. Use the backend at <strong>/admin/content</strong> to manage banners, or add one above.</div>
      ) : (
        <div style={as.tableWrap}>
          <table style={as.table}>
            <thead>
              <tr style={as.thead}>
                {["Preview","Title","Active","Landing Page","Customer Home","Order","Actions"].map(c => (
                  <th key={c} style={as.th}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {banners.map(b => (
                <tr key={b.id} style={as.tr}>
                  <td style={as.td}>
                    {b.imageUrl
                      ? <img src={b.imageUrl} alt={b.title} style={{ height: 44, width: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #e8e4dc" }} />
                      : <div style={{ width: 80, height: 44, background: "#f2f0eb", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(13,13,13,0.3)", fontSize: 11 }}>No img</div>
                    }
                  </td>
                  <td style={{ ...as.td, fontWeight: 600 }}>
                    {b.title}
                    {b.linkUrl && <div style={{ fontSize: 11, color: "rgba(13,13,13,0.4)", marginTop: 2 }}>{b.linkUrl}</div>}
                  </td>
                  <td style={as.td}>
                    <button
                      style={{ ...as.badge, cursor: "pointer", border: "none", background: b.active ? "#e8f9f2" : "#fef2f2", color: b.active ? "#1db882" : "#e84c3c" }}
                      onClick={() => toggleBanner(b.id)}
                      title="Toggle active"
                    >
                      {b.active ? "✓ Active" : "✗ Off"}
                    </button>
                  </td>
                  <td style={as.td}>
                    <button
                      style={{ ...as.badge, cursor: "pointer", border: "none", background: b.showOnHome ? "#e8f9f2" : "#f2f0eb", color: b.showOnHome ? "#1db882" : "rgba(13,13,13,0.4)" }}
                      onClick={() => toggleHome(b.id)}
                      title="Toggle landing page"
                    >
                      {b.showOnHome ? "✓ Yes" : "✗ No"}
                    </button>
                  </td>
                  <td style={as.td}>
                    <button
                      style={{ ...as.badge, cursor: "pointer", border: "none", background: b.showOnCustomerHome ? "#e8f9f2" : "#f2f0eb", color: b.showOnCustomerHome ? "#1db882" : "rgba(13,13,13,0.4)" }}
                      onClick={() => toggleCustomerHome(b.id)}
                      title="Toggle customer home"
                    >
                      {b.showOnCustomerHome ? "✓ Yes" : "✗ No"}
                    </button>
                  </td>
                  <td style={as.td}>{b.displayOrder ?? 0}</td>
                  <td style={{ ...as.td, whiteSpace: "nowrap" }}>
                    <button style={{ ...as.filterBtn, fontSize: 11, padding: "4px 10px", marginRight: 6 }} onClick={() => setEditModal({ ...b })}>✏️ Edit</button>
                    <button
                      style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fef2f2", color: "#e84c3c", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                      onClick={() => deleteBanner(b.id)}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div style={modalOverlay} onClick={() => setEditModal(null)}>
          <div style={{ ...modalBox, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Edit Banner</h3>
              <button style={closeBtnStyle} onClick={() => setEditModal(null)}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "title",    label: "Title *" },
                { key: "imageUrl", label: "Image URL *" },
                { key: "linkUrl",  label: "Link URL" },
              ].map(f => (
                <div key={f.key}>
                  <label style={as.label}>{f.label}</label>
                  <input
                    style={as.inputFull}
                    value={editModal[f.key] || ""}
                    onChange={e => setEditModal(v => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              {editModal.imageUrl && (
                <img src={editModal.imageUrl} alt="preview" style={{ height: 80, borderRadius: 8, objectFit: "cover", border: "1px solid #e8e4dc" }} onError={e => e.target.style.display = "none"} />
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button style={{ ...as.filterBtn, padding: "8px 20px" }} onClick={() => setEditModal(null)}>Cancel</button>
              <button
                style={{ padding: "8px 22px", borderRadius: 9, border: "none", background: "#0d0d0d", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1 }}
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared modal styles ── */
const modalOverlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 500,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const modalBox = {
  background: "#fff", borderRadius: 18, padding: 28, maxWidth: 600, width: "100%",
  maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
};
const closeBtnStyle = {
  background: "none", border: "none", fontSize: 18, cursor: "pointer",
  color: "rgba(13,13,13,0.4)", lineHeight: 1,
};

/* ── Policies Admin ── */
function PoliciesAdmin({ policies = [], onCreate, onUpdate, onDelete }) {
  const [list, setList] = useState(policies || []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", slug: "", category: "terms", content: "" });
  useEffect(() => { setList(policies || []); }, [policies]);

  const startCreate = () => { setEditing(null); setForm({ title: "", slug: "", category: "terms", content: "" }); };
  const startEdit = (p) => { setEditing(p.slug); setForm({ title: p.title || "", slug: p.slug || "", category: p.category || "terms", content: p.content || "" }); };

  const save = async () => {
    const payload = { title: form.title, slug: form.slug, category: form.category, content: form.content };
    if (!form.title || !form.slug) { alert("Title and slug required"); return; }
    if (editing) await onUpdate(editing, payload);
    else await onCreate(payload);
    setEditing(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={as.pageTitle}>Policy Management 📜</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...as.filterBtn }} onClick={startCreate}>+ New Policy</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            {list.length === 0 ? <div style={as.empty}>No policies found</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.map(p => (
                  <div key={p.slug} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #f2f0eb" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(13,13,13,0.5)" }}>{p.slug} · {p.category}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={as.filterBtn} onClick={() => startEdit(p)}>Edit</button>
                      <button style={as.rejectBtn} onClick={() => onDelete(p.slug)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>{editing ? "Edit Policy" : "Create Policy"}</h3>
          <label style={as.label}>Title</label>
          <input style={as.inputFull} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <label style={as.label}>Slug</label>
          <input style={as.inputFull} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
          <label style={as.label}>Category</label>
          <select style={as.inputFull} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="terms">terms</option>
            <option value="privacy">privacy</option>
            <option value="refund">refund</option>
          </select>
          <label style={as.label}>Content</label>
          <textarea style={{ ...as.inputFull, minHeight: 180, resize: "vertical" }} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button style={as.filterBtn} onClick={() => { setEditing(null); setForm({ title: "", slug: "", category: "terms", content: "" }); }}>Clear</button>
            <button style={as.approveBtn} onClick={save}>{editing ? "Save" : "Create"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Security Admin ── */
function SecurityAdmin() {
  const [current, setCurrent] = useState("");
  const [npass, setNpass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!current || !npass || !confirm) { setMsg("Please fill all fields"); return; }
    setLoading(true);
    try {
      const body = new URLSearchParams({ currentPassword: current, newPassword: npass, confirmPassword: confirm });
      const res = await fetch("/update-admin-password", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (res.ok || res.redirected) setMsg("Request submitted — check server messages");
      else setMsg("Failed to change password");
    } catch (e) { setMsg("Request failed"); }
    setLoading(false);
  };

  const logoutNow = () => {
    // navigate to backend logout which invalidates the session
    window.location.href = "/admin/logout";
  };

  return (
    <div>
      <h2 style={as.pageTitle}>Security Settings 🔐</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Change Admin Password</h3>
          <label style={as.label}>Current Password</label>
          <input style={as.inputFull} type="password" value={current} onChange={e => setCurrent(e.target.value)} />
          <label style={as.label}>New Password</label>
          <input style={as.inputFull} type="password" value={npass} onChange={e => setNpass(e.target.value)} />
          <label style={as.label}>Confirm New Password</label>
          <input style={as.inputFull} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button style={as.filterBtn} onClick={() => { setCurrent(""); setNpass(""); setConfirm(""); setMsg(""); }}>Clear</button>
            <button style={as.approveBtn} onClick={submit} disabled={loading}>{loading ? "Submitting…" : "Change Password"}</button>
          </div>
          {msg && <div style={{ marginTop: 12, color: "#0d0d0d" }}>{msg}</div>}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Session</h3>
          <p style={{ color: "rgba(13,13,13,0.6)" }}>Invalidate your current admin session (logs you out).</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={{ ...as.rejectBtn }} onClick={logoutNow}>Logout Now</button>
          </div>
        </div>
      </div>
    </div>
  );
}