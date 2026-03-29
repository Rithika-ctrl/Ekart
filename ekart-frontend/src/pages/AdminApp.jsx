import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();

  // Derive current page from URL: /admin/:page → page, default "overview"
  const page = location.pathname.replace(/^\/admin\/?/, "").split("/")[0] || "overview";
  const setPage = (p) => navigate(`/admin/${p}`);
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
  const [spending, setSpending] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const api = useCallback(async (path, opts = {}) => {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (auth?.token) {
      headers["Authorization"] = `Bearer ${auth.token}`;
      headers["X-Admin-Email"] = auth.email || "";
    }
    const res = await fetch("/api/flutter" + path, { ...opts, headers });
    return res.json();
  }, [auth]);
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
    // Fetch analytics in the background after core data loads — needed by Overview's revenue card.
    // Not awaited so it doesn't block the initial render.
    api("/admin/analytics").then(d => { if (d.success) setAnalytics(d); }).catch(() => {});
  }, [api]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (page === "coupons")   api("/admin/coupons").then(d => d.success && setCoupons(d.coupons || [])); }, [page]);
  useEffect(() => { if (page === "refunds")   api("/admin/refunds").then(d => d.success && setRefunds(d.refunds || [])); }, [page]);
  useEffect(() => { if (page === "reviews")   api("/admin/reviews").then(d => d.success && setReviews(d.reviews || [])); }, [page]);
  useEffect(() => { if (page === "analytics") api("/admin/analytics").then(d => d.success && setAnalytics(d)); }, [page]);
  useEffect(() => { if (page === "analytics") api("/admin/spending").then(d => d.success && setSpending(d.customers || [])); }, [page]);
  useEffect(() => { if (page === "warehouse") api("/admin/warehouses").then(d => d.success && setWarehouses(d.warehouses || [])); }, [page]);
  useEffect(() => { if (page === "delivery")  api("/admin/delivery-boys").then(d => d.success && setDeliveryBoys(d.deliveryBoys || [])); }, [page]);
  
  useEffect(() => { if (page === "policies") fetchPolicies(); }, [page]);

  const [policies, setPolicies] = useState([]);

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/policies");
      if (!res.ok) throw new Error("Failed to fetch policies");
      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : (data.policies || []));
    } catch (err) { show("Failed to load policies"); }
  };

  const createPolicy = async (p) => {
    try {
      const res = await fetch("/api/policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) throw new Error("create failed");
      await fetchPolicies();
      show("Policy created");
    } catch { show("Failed to create policy"); }
  };

  const updatePolicy = async (slug, p) => {
    try {
      const res = await fetch(`/api/policies/${slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) throw new Error("update failed");
      await fetchPolicies();
      show("Policy updated");
    } catch { show("Failed to update policy"); }
  };

  const deletePolicy = async (slug) => {
    if (!window.confirm("Delete policy?")) return;
    try {
      const res = await fetch(`/api/policies/${slug}`, { method: "DELETE" });
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
  // Use totalPrice (matches Order entity) across all orders to align with backend analytics endpoint.
  // The backend sums Order::getTotalPrice for all orders regardless of status.
  const totalRevenue    = orders.reduce((s, o) => s + (o.totalPrice || o.amount || 0), 0);

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
          <button style={as.logoutBtn} onClick={() => { logout(); navigate("/auth", { replace: true }); }}>Logout</button>
        </div>
      </nav>

      <main style={as.main}>
        {loading ? <div style={as.empty}>Loading admin data…</div> : <>
          {page === "overview"   && <Overview users={users} products={products} orders={orders} totalRevenue={totalRevenue} pendingProducts={pendingProducts} analyticsRevenue={analytics?.totalRevenue} />}
          {page === "products"   && <ProductsAdmin products={products} onApprove={approveProduct} onReject={rejectProduct} />}
          {page === "orders"     && <OrdersAdmin orders={orders} onUpdateStatus={updateOrder} />}
          {page === "customers"  && <CustomersAdmin customers={users.customers} onToggle={toggleCustomer} api={api} showToast={show} />}
          {page === "vendors"    && <VendorsAdmin vendors={vendors} onToggle={toggleVendor} />}
          {page === "delivery"   && <DeliveryAdmin deliveryBoys={deliveryBoys} onApprove={approveDelivery} onApproveTransfer={approveTransfer} onRejectTransfer={rejectTransfer} api={api} showToast={show} />}
          {page === "warehouse"  && <WarehouseAdmin warehouses={warehouses} api={api} showToast={show} onRefresh={() => api("/admin/warehouses").then(d => d.success && setWarehouses(d.warehouses || []))} />}
          {page === "coupons"    && <CouponsAdmin coupons={coupons} api={api} showToast={show} onRefresh={() => api("/admin/coupons").then(d => d.success && setCoupons(d.coupons || []))} />}
          {page === "refunds"    && <RefundsAdmin refunds={refunds} onApprove={approveRefund} onReject={rejectRefund} />}
          {page === "reviews"    && <ReviewsAdmin reviews={reviews} onDelete={deleteReview} />}
          {page === "analytics"  && <AnalyticsAdmin data={analytics} spending={spending} orders={orders} products={products} users={users} totalRevenue={totalRevenue} />}
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
function Overview({ users, products, orders, totalRevenue, pendingProducts, analyticsRevenue }) {
  // Prefer the server-side figure from /admin/analytics when available (uses all orders + totalPrice).
  // Falls back to the client-computed value while the analytics tab hasn't been visited yet.
  const displayRevenue = analyticsRevenue != null ? analyticsRevenue : totalRevenue;
  const stats = [
    { label: "Customers",       value: users.customers.length, icon: "👥", color: "#2563eb" },
    { label: "Vendors",         value: users.vendors.length,   icon: "🏪", color: "#d4a017" },
    { label: "Products",        value: products.length,        icon: "🏷️", color: "#7c3aed" },
    { label: "Pending Approval",value: pendingProducts.length, icon: "⏳", color: "#e84c3c" },
    { label: "Total Orders",    value: orders.length,          icon: "📦", color: "#0284c7" },
    { label: "Total Revenue",   value: fmt(displayRevenue),    icon: "💰", color: "#1db882" },
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
function CustomersAdmin({ customers, onToggle, api, showToast }) {
  const [q, setQ] = useState("");
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [roleModal, setRoleModal] = useState(null); // { customer, newRole }
  const [roleChanging, setRoleChanging] = useState(false);

  // Keep local copy in sync if parent reloads
  useEffect(() => { setLocalCustomers(customers); }, [customers]);

  const filtered = q
    ? localCustomers.filter(c =>
        c.name?.toLowerCase().includes(q.toLowerCase()) ||
        c.email?.toLowerCase().includes(q.toLowerCase()))
    : localCustomers;

  const roleColor = { ADMIN: "#7c3aed", ORDER_MANAGER: "#2563eb", CUSTOMER: "#16a34a" };
  const roleBg    = { ADMIN: "#f5f3ff", ORDER_MANAGER: "#eff6ff", CUSTOMER: "#f0fdf4" };
  const ROLES     = ["CUSTOMER", "ORDER_MANAGER", "ADMIN"];

  const confirmRoleChange = async () => {
    if (!roleModal) return;
    setRoleChanging(true);
    try {
      const d = await api(`/admin/users/${roleModal.customer.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleModal.newRole }),
      });
      if (d.success) {
        setLocalCustomers(prev =>
          prev.map(c => c.id === roleModal.customer.id ? { ...c, role: roleModal.newRole } : c)
        );
        showToast(`✓ ${roleModal.customer.name || "User"}'s role set to ${roleModal.newRole}`);
      } else {
        showToast(d.message || d.error || "Role update failed");
      }
    } catch { showToast("Role update failed"); }
    setRoleChanging(false);
    setRoleModal(null);
  };

  return (
    <div>
      <h2 style={as.pageTitle}>Customer Management</h2>
      <input
        style={{ ...as.searchInput, marginBottom: 20 }}
        placeholder="Search customers…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />

      <div style={as.tableWrap}>
        <table style={as.table}>
          <thead style={as.thead}>
            <tr>
              {["ID","Name","Email","Mobile","Role","Verified","Active","Actions"].map(h => (
                <th key={h} style={as.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ ...as.td, textAlign: "center", color: "rgba(13,13,13,0.4)" }}>No customers</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} style={as.tr}>
                <td style={as.td}>#{c.id}</td>
                <td style={{ ...as.td, fontWeight: 600 }}>{c.name}</td>
                <td style={{ ...as.td, color: "rgba(13,13,13,0.55)" }}>{c.email}</td>
                <td style={as.td}>{c.mobile || "—"}</td>
                <td style={as.td}>
                  <select
                    style={{ ...as.statusSelect, minWidth: 130,
                      background: roleBg[c.role || "CUSTOMER"] || "#f2f0eb",
                      color: roleColor[c.role || "CUSTOMER"] || "#0d0d0d",
                      fontWeight: 700, border: "1px solid #e8e4dc" }}
                    value={c.role || "CUSTOMER"}
                    onChange={e => {
                      if (e.target.value !== (c.role || "CUSTOMER"))
                        setRoleModal({ customer: c, newRole: e.target.value });
                    }}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={as.td}>
                  <span style={{ color: c.verified ? "#1db882" : "#e84c3c" }}>
                    {c.verified ? "✓" : "✗"}
                  </span>
                </td>
                <td style={as.td}>
                  <span style={{ ...as.badge, background: c.active ? "#e8f9f2" : "#fef2f2", color: c.active ? "#1db882" : "#e84c3c" }}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={as.td}>
                  <button
                    style={c.active ? as.rejectBtn : as.approveBtn}
                    onClick={() => onToggle(c.id)}
                  >
                    {c.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role change confirmation modal */}
      {roleModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setRoleModal(null); }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: roleBg[roleModal.newRole] || "#f2f0eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 16px" }}>
              {roleModal.newRole === "ADMIN" ? "👑" : roleModal.newRole === "ORDER_MANAGER" ? "📋" : "🛍️"}
            </div>
            <h3 style={{ textAlign: "center", margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>
              {roleModal.newRole === "ADMIN" ? "Grant Admin Access?" :
               (roleModal.customer.role === "ADMIN" ? "Revoke Admin Access?" : "Change Role?")}
            </h3>
            <p style={{ textAlign: "center", color: "rgba(13,13,13,0.55)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Set <strong>{roleModal.customer.name || roleModal.customer.email}</strong>'s role from{" "}
              <strong style={{ color: roleColor[roleModal.customer.role || "CUSTOMER"] }}>{roleModal.customer.role || "CUSTOMER"}</strong>{" "}
              to <strong style={{ color: roleColor[roleModal.newRole] }}>{roleModal.newRole}</strong>?
              {roleModal.newRole === "ADMIN" && " This grants full platform access."}
              {roleModal.customer.role === "ADMIN" && roleModal.newRole !== "ADMIN" && " They will immediately lose admin access."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...as.filterBtn, flex: 1 }} onClick={() => setRoleModal(null)} disabled={roleChanging}>
                Cancel
              </button>
              <button
                style={{ flex: 1, padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: roleModal.newRole === "ADMIN" ? "#7c3aed" : roleModal.customer.role === "ADMIN" ? "#e84c3c" : "#0d0d0d",
                  color: "#fff" }}
                onClick={confirmRoleChange}
                disabled={roleChanging}
              >
                {roleChanging ? "Updating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    api("/admin/warehouse-transfers").then(d => { if (d.success) setTransfers(d.transfers || []); setLoadingTransfers(false); });
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
function AnalyticsAdmin({ data, spending, orders, products, users, totalRevenue }) {
  const [subTab, setSubTab] = useState("platform");

  // Fallback values computed client-side when server data is unavailable
  const fallbackStatusCounts = orders.reduce((a, o) => { a[o.trackingStatus] = (a[o.trackingStatus] || 0) + 1; return a; }, {});
  const fallbackCatCounts    = products.reduce((a, p) => { a[p.category] = (a[p.category] || 0) + 1; return a; }, {});

  // Prefer server-side data; fall back to client-computed values
  const s = data || {
    totalCustomers: users.customers.length,
    totalVendors:   users.vendors.length,
    totalProducts:  products.length,
    totalOrders:    orders.length,
    totalRevenue,
  };

  const statusBreakdown = data?.statusBreakdown || fallbackStatusCounts;
  const categoryStats   = data?.categoryStats   || fallbackCatCounts;
  const monthlyRevenue  = data?.monthlyRevenue  || {};
  const dailyOrders     = data?.dailyOrders     || {};
  const topProducts     = data?.topProducts     || [];
  const totalOrders     = Number(s.totalOrders  || orders.length) || 1;
  const totalCats       = Object.values(categoryStats).reduce((a, b) => a + Number(b), 0) || 1;
  const maxMonthRev     = Math.max(...Object.values(monthlyRevenue), 1);
  const maxDailyOrders  = Math.max(...Object.values(dailyOrders), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={as.pageTitle}>Analytics & Reports 📈</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {[["platform", "📊 Platform"], ["spending", "💸 User Spending"]].map(([k, l]) => (
            <button key={k} style={{ ...as.filterBtn, ...(subTab === k ? as.filterBtnActive : {}) }}
              onClick={() => setSubTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {subTab === "spending" && <UserSpending spending={spending} />}
      {subTab === "platform" && <div>

      {/* KPI cards */}
      <div style={as.statsGrid}>
        {[
          ["👥", "Customers",    s.totalCustomers || users.customers.length, "#2563eb"],
          ["🏪", "Vendors",      s.totalVendors   || users.vendors.length,   "#d4a017"],
          ["🏷️", "Products",     s.totalProducts  || products.length,        "#7c3aed"],
          ["📦", "Orders",       s.totalOrders    || orders.length,           "#0284c7"],
          ["💰", "Revenue",      fmt(s.totalRevenue || totalRevenue),         "#1db882"],
          ["✅", "Delivered",    s.deliveredOrders ?? orders.filter(o => o.trackingStatus === "DELIVERED").length, "#1db882"],
        ].map(([icon, label, value, color]) => (
          <div key={label} style={as.statCard}>
            <div style={as.statIcon(color)}>{icon}</div>
            <div style={as.statVal}>{value}</div>
            <div style={as.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Secondary KPIs (server-only) */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
          {[
            ["📊", "Avg Order Value",  fmt(data.avgOrderValue),                       "#7c3aed"],
            ["⭐", "Avg Rating",       (data.avgRating || 0).toFixed(1) + " / 5",     "#d4a017"],
            ["💬", "Total Reviews",    data.totalReviews,                             "#0284c7"],
            ["⏳", "Pending Products", data.pendingProducts,                           "#e84c3c"],
          ].map(([icon, label, value, color]) => (
            <div key={label} style={as.statCard}>
              <div style={as.statIcon(color)}>{icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0d0d0d", marginBottom: 2 }}>{value}</div>
              <div style={as.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={as.twoCol}>
        {/* Monthly Revenue Trend */}
        <div style={as.card}>
          <h3 style={as.cardTitle}>Monthly Revenue (Last 6 Months)</h3>
          {Object.keys(monthlyRevenue).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(monthlyRevenue).map(([month, rev]) => {
                const [yr, mo] = month.split("-");
                const label = mo && yr
                  ? new Date(Number(yr), Number(mo) - 1).toLocaleString("en-IN", { month: "short", year: "2-digit" })
                  : month;
                return (
                  <div key={month} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, minWidth: 72, color: "rgba(13,13,13,0.55)" }}>{label}</span>
                    <div style={{ flex: 1, height: 10, background: "#f2f0eb", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg,#1db882,#0284c7)", borderRadius: 5, width: `${Math.round((rev / maxMonthRev) * 100)}%`, transition: "width .4s" }} />
                    </div>
                    <span style={{ fontSize: 12, color: "rgba(13,13,13,0.5)", minWidth: 72, textAlign: "right" }}>{fmt(rev)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "rgba(13,13,13,0.4)", fontSize: 13 }}>No order data yet</p>
          )}
        </div>

        {/* Daily Orders – last 7 days */}
        <div style={as.card}>
          <h3 style={as.cardTitle}>Daily Orders (Last 7 Days)</h3>
          {Object.keys(dailyOrders).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(dailyOrders).map(([date, count]) => (
                <div key={date} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, minWidth: 88, color: "rgba(13,13,13,0.55)" }}>{date.slice(5)}</span>
                  <div style={{ flex: 1, height: 10, background: "#f2f0eb", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 5, width: `${Math.round((count / maxDailyOrders) * 100)}%`, transition: "width .4s" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(13,13,13,0.5)", minWidth: 28, textAlign: "right" }}>{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "rgba(13,13,13,0.4)", fontSize: 13 }}>No order data yet</p>
          )}
        </div>
      </div>

      <div style={as.twoCol}>
        {/* Order Status Breakdown */}
        <div style={as.card}>
          <h3 style={as.cardTitle}>Order Status Breakdown</h3>
          {Object.entries(statusBreakdown).map(([status, count]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, minWidth: 170 }}>{status.replace(/_/g, " ")}</span>
              <div style={{ flex: 1, height: 8, background: "#f2f0eb", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 4, width: `${Math.round(Number(count) / totalOrders * 100)}%` }} />
              </div>
              <span style={{ fontSize: 13, color: "rgba(13,13,13,0.5)", minWidth: 28 }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Products by Category */}
        <div style={as.card}>
          <h3 style={as.cardTitle}>Products by Category</h3>
          {Object.entries(categoryStats).slice(0, 8).map(([cat, count]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, minWidth: 140 }}>{cat}</span>
              <div style={{ flex: 1, height: 8, background: "#f2f0eb", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#d4a017,#e84c3c)", borderRadius: 4, width: `${Math.round(Number(count) / totalCats * 100)}%` }} />
              </div>
              <span style={{ fontSize: 13, color: "rgba(13,13,13,0.5)", minWidth: 28 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products by Revenue */}
      {topProducts.length > 0 && (
        <div style={as.card}>
          <h3 style={as.cardTitle}>Top 5 Products by Revenue</h3>
          <div style={as.tableWrap}>
            <table style={as.table}>
              <thead><tr style={as.thead}>
                {["Rank","Product","Category","Units Sold","Revenue"].map(c => <th key={c} style={as.th}>{c}</th>)}
              </tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.id} style={as.tr}>
                    <td style={as.td}><span style={{ fontWeight: 800, color: ["#d4a017","#6b7280","#c97b38","#0d0d0d","#0d0d0d"][i] }}>{["🥇","🥈","🥉","4th","5th"][i]}</span></td>
                    <td style={{ ...as.td, fontWeight: 600 }}>{p.name || `Product #${p.id}`}</td>
                    <td style={as.td}>{p.category || "—"}</td>
                    <td style={as.td}>{p.unitsSold}</td>
                    <td style={{ ...as.td, fontWeight: 700, color: "#1db882" }}>{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>}
    </div>
  );
}

/* ── User Spending ── */
function UserSpending({ spending }) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(null);

  if (!spending) return (
    <div style={{ ...as.card, textAlign: "center", padding: 48 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <div style={{ color: "rgba(13,13,13,0.4)", fontSize: 15 }}>Loading spending data…</div>
    </div>
  );

  const withOrders = spending.filter(c => c.totalOrders > 0);
  const totalPlatformSpend = withOrders.reduce((s, c) => s + c.totalSpent, 0);
  const avgSpendPerCustomer = withOrders.length ? totalPlatformSpend / withOrders.length : 0;
  const topSpender = withOrders[0] || null;

  const filtered = q
    ? spending.filter(c =>
        c.name?.toLowerCase().includes(q.toLowerCase()) ||
        c.email?.toLowerCase().includes(q.toLowerCase()))
    : spending;

  const maxSpend = Math.max(...spending.map(c => c.totalSpent), 1);

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { icon: "👥", label: "Total Customers",      value: spending.length,            color: "#2563eb" },
          { icon: "💰", label: "Platform Spend",        value: fmt(totalPlatformSpend),    color: "#1db882" },
          { icon: "📊", label: "Avg Spend / Customer",  value: fmt(avgSpendPerCustomer),   color: "#7c3aed" },
          { icon: "🏆", label: "Top Spender",           value: topSpender?.name || "—",    color: "#d4a017" },
        ].map(s => (
          <div key={s.label} style={as.statCard}>
            <div style={as.statIcon(s.color)}>{s.icon}</div>
            <div style={{ fontSize: s.label === "Top Spender" ? 14 : 20, fontWeight: 800, color: "#0d0d0d", marginBottom: 2, wordBreak: "break-word" }}>{s.value}</div>
            <div style={as.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        style={{ ...as.searchInput, marginBottom: 16 }}
        placeholder="Search customers by name or email…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />

      {/* Table */}
      <div style={as.tableWrap}>
        <table style={as.table}>
          <thead>
            <tr style={as.thead}>
              {["Rank", "Customer", "Email", "Total Spent", "Orders", "Avg Order", "Top Category", "Spend Share"].map(c => (
                <th key={c} style={as.th}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <>
                <tr
                  key={c.id}
                  style={{ ...as.tr, cursor: "pointer", background: expanded === c.id ? "#f8f7f4" : undefined }}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <td style={as.td}>
                    <span style={{ fontWeight: 800, color: i === 0 ? "#d4a017" : i === 1 ? "#6b7280" : i === 2 ? "#c97b38" : "rgba(13,13,13,0.4)", fontSize: i < 3 ? 16 : 13 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                  </td>
                  <td style={{ ...as.td, fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0d0d0d18", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                        {(c.name || "?")[0].toUpperCase()}
                      </div>
                      {c.name}
                    </div>
                  </td>
                  <td style={{ ...as.td, color: "rgba(13,13,13,0.5)" }}>{c.email}</td>
                  <td style={{ ...as.td, fontWeight: 700, color: c.totalSpent > 0 ? "#1db882" : "rgba(13,13,13,0.3)" }}>{fmt(c.totalSpent)}</td>
                  <td style={as.td}>{c.totalOrders}</td>
                  <td style={as.td}>{c.totalOrders > 0 ? fmt(c.avgOrderValue) : "—"}</td>
                  <td style={as.td}>
                    {c.topCategory !== "—" && c.topCategory
                      ? <span style={{ ...as.badge, background: "#eff6ff", color: "#2563eb" }}>{c.topCategory}</span>
                      : <span style={{ color: "rgba(13,13,13,0.3)" }}>—</span>}
                  </td>
                  <td style={{ ...as.td, minWidth: 120 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#f2f0eb", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "linear-gradient(90deg,#1db882,#0284c7)", borderRadius: 3, width: `${Math.round((c.totalSpent / maxSpend) * 100)}%`, transition: "width .4s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(13,13,13,0.4)", minWidth: 34, textAlign: "right" }}>
                        {totalPlatformSpend > 0 ? `${((c.totalSpent / totalPlatformSpend) * 100).toFixed(1)}%` : "0%"}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expanded === c.id && (
                  <tr key={`${c.id}-detail`} style={{ background: "#f8f7f4" }}>
                    <td colSpan={8} style={{ padding: "16px 20px", borderBottom: "2px solid #e8e4dc" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* Category breakdown */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 10 }}>
                            Spend by Category
                          </div>
                          {Object.keys(c.categorySpending || {}).length === 0
                            ? <div style={{ fontSize: 13, color: "rgba(13,13,13,0.35)" }}>No category data</div>
                            : (() => {
                                const maxCat = Math.max(...Object.values(c.categorySpending), 1);
                                return Object.entries(c.categorySpending)
                                  .sort(([, a], [, b]) => b - a)
                                  .map(([cat, amt]) => (
                                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                                      <span style={{ fontSize: 12, minWidth: 110, color: "#0d0d0d" }}>{cat}</span>
                                      <div style={{ flex: 1, height: 7, background: "#e8e4dc", borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{ height: "100%", background: "linear-gradient(90deg,#d4a017,#e84c3c)", borderRadius: 4, width: `${Math.round((amt / maxCat) * 100)}%` }} />
                                      </div>
                                      <span style={{ fontSize: 12, color: "rgba(13,13,13,0.5)", minWidth: 64, textAlign: "right" }}>{fmt(amt)}</span>
                                    </div>
                                  ));
                              })()
                          }
                        </div>

                        {/* Monthly spend */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 10 }}>
                            Monthly Spend (This Year)
                          </div>
                          {Object.keys(c.monthlySpending || {}).length === 0
                            ? <div style={{ fontSize: 13, color: "rgba(13,13,13,0.35)" }}>No orders this year</div>
                            : (() => {
                                const maxMo = Math.max(...Object.values(c.monthlySpending), 1);
                                return Object.entries(c.monthlySpending)
                                  .filter(([, amt]) => amt > 0)
                                  .map(([ym, amt]) => {
                                    const [yr, mo] = ym.split("-");
                                    const label = new Date(Number(yr), Number(mo) - 1).toLocaleString("en-IN", { month: "short" });
                                    return (
                                      <div key={ym} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                                        <span style={{ fontSize: 12, minWidth: 36, color: "#0d0d0d" }}>{label}</span>
                                        <div style={{ flex: 1, height: 7, background: "#e8e4dc", borderRadius: 4, overflow: "hidden" }}>
                                          <div style={{ height: "100%", background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 4, width: `${Math.round((amt / maxMo) * 100)}%` }} />
                                        </div>
                                        <span style={{ fontSize: 12, color: "rgba(13,13,13,0.5)", minWidth: 64, textAlign: "right" }}>{fmt(amt)}</span>
                                      </div>
                                    );
                                  });
                              })()
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={as.empty}>No customers match "{q}"</div>}
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
  const [roleModal, setRoleModal] = useState(null); // { user, newRole }
  const [roleChanging, setRoleChanging] = useState(false);

  const roleColor = { ADMIN: "#7c3aed", ORDER_MANAGER: "#2563eb", CUSTOMER: "#16a34a" };
  const roleBg    = { ADMIN: "#f5f3ff", ORDER_MANAGER: "#eff6ff", CUSTOMER: "#f0fdf4" };
  const ROLES     = ["CUSTOMER", "ORDER_MANAGER", "ADMIN"];

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    const d = await api(`/admin/users/search?q=${encodeURIComponent(q)}&type=${filter}`);
    if (d.success) setResults(d.users || []);
    else showToast(d.message || "Search failed");
    setLoading(false);
  };

  const confirmRoleChange = async () => {
    if (!roleModal) return;
    setRoleChanging(true);
    try {
      const d = await api(`/admin/users/${roleModal.user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleModal.newRole }),
      });
      if (d.success) {
        setResults(prev =>
          prev.map(u => u.id === roleModal.user.id && u.type === "customer"
            ? { ...u, role: roleModal.newRole }
            : u)
        );
        showToast(`✓ ${roleModal.user.name || "User"}'s role set to ${roleModal.newRole}`);
      } else {
        showToast(d.message || d.error || "Role update failed");
      }
    } catch { showToast("Role update failed"); }
    setRoleChanging(false);
    setRoleModal(null);
  };

  return (
    <div>
      <h2 style={as.pageTitle}>Search Users 👥</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          style={{ ...as.searchInput, flex: 1 }}
          placeholder="Search by name or email…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
        />
        <select style={as.statusSelect} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Users</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendors</option>
          <option value="delivery">Delivery</option>
        </select>
        <button style={{ ...as.approveBtn, padding: "10px 20px" }} onClick={search} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div style={as.tableWrap}>
          <table style={as.table}>
            <thead style={as.thead}>
              <tr>
                {["ID","Name","Email","Type","Role / Details","Verified","Active"].map(h => (
                  <th key={h} style={as.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((u, i) => {
                const isCustomer = u.type === "customer";
                const currentRole = u.role || "CUSTOMER";
                return (
                  <tr key={i} style={as.tr}>
                    <td style={as.td}>#{u.id}</td>
                    <td style={{ ...as.td, fontWeight: 600 }}>{u.name}</td>
                    <td style={{ ...as.td, color: "rgba(13,13,13,0.55)" }}>{u.email}</td>
                    <td style={as.td}>
                      <span style={{ ...as.badge, background: "#f2f0eb", color: "rgba(13,13,13,0.7)", textTransform: "capitalize" }}>
                        {(u.type || "—").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={as.td}>
                      {isCustomer ? (
                        /* Customers carry the Role enum — show editable select */
                        <select
                          style={{ ...as.statusSelect, minWidth: 130,
                            background: roleBg[currentRole] || "#f2f0eb",
                            color: roleColor[currentRole] || "#0d0d0d",
                            fontWeight: 700, border: "1px solid #e8e4dc" }}
                          value={currentRole}
                          onChange={e => {
                            if (e.target.value !== currentRole)
                              setRoleModal({ user: { ...u, role: currentRole }, newRole: e.target.value });
                          }}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        /* Vendors / delivery boys — show descriptive info instead */
                        <span style={{ color: "rgba(13,13,13,0.5)", fontSize: 12 }}>
                          {u.vendorCode ? `Code: ${u.vendorCode}` :
                           u.deliveryBoyCode ? `Code: ${u.deliveryBoyCode}` : "—"}
                        </span>
                      )}
                    </td>
                    <td style={as.td}>
                      <span style={{ color: u.verified ? "#1db882" : "#e84c3c" }}>
                        {u.verified ? "✓" : "✗"}
                      </span>
                    </td>
                    <td style={as.td}>
                      {u.active !== undefined ? (
                        <span style={{ ...as.badge, background: u.active ? "#e8f9f2" : "#fef2f2", color: u.active ? "#1db882" : "#e84c3c" }}>
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && q && !loading && (
        <div style={as.empty}>No results for "{q}"</div>
      )}
      {!q && (
        <div style={as.empty}>Enter a name or email to search</div>
      )}

      {/* Role change confirmation modal */}
      {roleModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setRoleModal(null); }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: roleBg[roleModal.newRole] || "#f2f0eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 16px" }}>
              {roleModal.newRole === "ADMIN" ? "👑" : roleModal.newRole === "ORDER_MANAGER" ? "📋" : "🛍️"}
            </div>
            <h3 style={{ textAlign: "center", margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>
              {roleModal.newRole === "ADMIN" ? "Grant Admin Access?" :
               roleModal.user.role === "ADMIN" ? "Revoke Admin Access?" : "Change Role?"}
            </h3>
            <p style={{ textAlign: "center", color: "rgba(13,13,13,0.55)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Set <strong>{roleModal.user.name || roleModal.user.email}</strong>'s role from{" "}
              <strong style={{ color: roleColor[roleModal.user.role] }}>{roleModal.user.role}</strong>{" "}
              to <strong style={{ color: roleColor[roleModal.newRole] }}>{roleModal.newRole}</strong>?
              {roleModal.newRole === "ADMIN" && " This grants full platform access."}
              {roleModal.user.role === "ADMIN" && roleModal.newRole !== "ADMIN" && " They will immediately lose admin access."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...as.filterBtn, flex: 1 }} onClick={() => setRoleModal(null)} disabled={roleChanging}>
                Cancel
              </button>
              <button
                style={{ flex: 1, padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: roleModal.newRole === "ADMIN" ? "#7c3aed" : roleModal.user.role === "ADMIN" ? "#e84c3c" : "#0d0d0d",
                  color: "#fff" }}
                onClick={confirmRoleChange}
                disabled={roleChanging}
              >
                {roleChanging ? "Updating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${auth?.token || ""}` },
        body: JSON.stringify({ isActive: activate }),
      });
      const d = await res.json();
      if (d.success) { show(activate ? "Account activated" : "Account suspended"); load(q); }
      else show(d.message || "Error");
    } catch { show("Request failed"); }
  };

  const resetPassword = async (id) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}/reset-password`, { method: "POST", headers: { "Authorization": `Bearer ${auth?.token || ""}` } });
      const d = await res.json();
      if (d.success) setModal({ type: "reset", data: d });
      else show(d.message || "Error");
    } catch { show("Request failed"); }
  };

  const deleteAccount = async (id) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${auth?.token || ""}` } });
      const d = await res.json();
      if (d.success) { show("Account deleted"); setModal(null); load(q); }
      else show(d.message || "Error");
    } catch { show("Request failed"); }
  };

  const viewProfile = async (id) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}/profile`, { headers: { "Authorization": `Bearer ${auth?.token || ""}` } });
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
      const res = await fetch("/api/admin/accounts/stats", { headers: { "Authorization": `Bearer ${auth?.token || ""}` } }); // ping to confirm auth
      // Use the admin content page data via a lightweight fetch
      const r2 = await fetch("/admin/content", { headers: { Accept: "application/json, text/html" } });
      // Since no dedicated JSON endpoint exists, we parse the page or use an iframe-free approach.
      // Instead, call the flutter-compatible endpoint if available, else fall back to HTML scraping.
      // Best approach: expose via /api/flutter/admin/banners — check if it exists
      const r3 = await fetch("/api/flutter/admin/banners", { headers: { "Authorization": `Bearer ${auth?.token || ""}`, "Content-Type": "application/json" } });
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
  // ── Password change state ──
  const [current, setCurrent] = useState("");
  const [npass, setNpass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // ── User / role management state ──
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [roleModal, setRoleModal] = useState(null); // { user, newRole }
  const [roleChanging, setRoleChanging] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = m => { setToast(m); setTimeout(() => setToast(""), 3200); };

  // ── Fetch all users on mount — uses /api/flutter/admin/users (JWT, returns role field) ──
  useEffect(() => {
    (async () => {
      setUsersLoading(true);
      try {
        const res = await fetch("/api/flutter/admin/users", {
          headers: { "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "" },
        });
        const d = await res.json();
        // /api/flutter/admin/users returns { success, customers: [...], vendors: [...] }
        if (d.success) setUsers(d.customers || []);
        else if (Array.isArray(d)) setUsers(d);
      } catch { showToast("Could not load user list"); }
      setUsersLoading(false);
    })();
  }, []);

  // ── Derived counts from user list ──
  const roleCount = role => users.filter(u => u.role === role).length;

  // ── Password submit ──
  const submitPassword = async () => {
    if (!current || !npass || !confirm) { setMsg("Please fill all fields"); return; }
    if (npass !== confirm) { setMsg("New passwords do not match"); return; }
    if (npass.length < 6) { setMsg("Password must be at least 6 characters"); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/flutter/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${auth?.token || ""}` },
        body: JSON.stringify({ currentPassword: current, newPassword: npass, confirmPassword: confirm }),
      });
      const d = await res.json();
      if (d.success) {
        setMsg("✓ Password changed successfully");
        setCurrent(""); setNpass(""); setConfirm("");
      } else {
        setMsg(d.message || "Failed to change password");
      }
    } catch { setMsg("Request failed"); }
    setPwLoading(false);
  };

  // ── Role change (confirmed) — uses /api/flutter/admin/users/{id}/role (JWT) ──
  const confirmRoleChange = async () => {
    if (!roleModal) return;
    setRoleChanging(true);
    try {
      const res = await fetch(`/api/flutter/admin/users/${roleModal.user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "" },
        body: JSON.stringify({ role: roleModal.newRole }),
      });
      const d = await res.json();
      if (d.success) {
        setUsers(prev => prev.map(u => u.id === roleModal.user.id ? { ...u, role: roleModal.newRole } : u));
        showToast(`✓ ${roleModal.user.name || "User"}'s role updated to ${roleModal.newRole}`);
      } else {
        showToast(d.message || d.error || "Role update failed");
      }
    } catch { showToast("Role update failed"); }
    setRoleChanging(false);
    setRoleModal(null);
  };

  // ── Filtered user list ──
  const filteredUsers = users.filter(u => {
    const q = searchQ.toLowerCase();
    return !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  const roleColor  = { ADMIN: "#7c3aed", ORDER_MANAGER: "#2563eb", CUSTOMER: "#16a34a" };
  const roleBg     = { ADMIN: "#f5f3ff", ORDER_MANAGER: "#eff6ff", CUSTOMER: "#f0fdf4" };
  const providerIcon = p => p === "google" ? "🔵" : p === "github" ? "⚫" : "✉️";

  const secStat = (icon, label, value, color) => (
    <div key={label} style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: 20, textAlign: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 10px" }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "#0d0d0d" }}>{value}</div>
      <div style={{ color: "rgba(13,13,13,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 3 }}>{label}</div>
    </div>
  );

  const permCard = (icon, title, subtitle, color, perms, routes) => (
    <div key={title} style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0d0d0d" }}>{title}</div>
          <div style={{ fontSize: 12, color: "rgba(13,13,13,0.45)" }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {perms.map(([allowed, text]) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: allowed ? "#0d0d0d" : "rgba(13,13,13,0.35)" }}>
            <span style={{ color: allowed ? "#16a34a" : "#e84c3c", fontWeight: 700 }}>{allowed ? "✓" : "✗"}</span>
            {text}
          </div>
        ))}
      </div>
      <div style={{ background: "#f2f0eb", borderRadius: 8, padding: "8px 10px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(13,13,13,0.4)", marginBottom: 6 }}>Protected Routes</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {routes.map(r => (
            <span key={r} style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 5, padding: "2px 7px", fontSize: 11, fontFamily: "monospace", color: "#0d0d0d" }}>{r}</span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {toast && <div style={as.toast}>{toast}</div>}

      <h2 style={as.pageTitle}>Security Settings 🔐</h2>

      {/* ── User role stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {secStat("👥", "Total Users",      users.length,               "#6366f1")}
        {secStat("👑", "Admins",           roleCount("ADMIN"),         "#7c3aed")}
        {secStat("📋", "Order Managers",   roleCount("ORDER_MANAGER"), "#2563eb")}
        {secStat("🛍️", "Customers",        roleCount("CUSTOMER"),      "#16a34a")}
      </div>

      {/* ── Password + Session row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 28 }}>
        <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: 22 }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>Change Admin Password</h3>
          <label style={as.label}>Current Password</label>
          <input style={{ ...as.inputFull, marginBottom: 12 }} type="password" value={current} onChange={e => setCurrent(e.target.value)} />
          <label style={as.label}>New Password</label>
          <input style={{ ...as.inputFull, marginBottom: 12 }} type="password" value={npass} onChange={e => setNpass(e.target.value)} />
          <label style={as.label}>Confirm New Password</label>
          <input style={{ ...as.inputFull, marginBottom: 14 }} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={as.filterBtn} onClick={() => { setCurrent(""); setNpass(""); setConfirm(""); setMsg(""); }}>Clear</button>
            <button style={as.approveBtn} onClick={submitPassword} disabled={pwLoading}>{pwLoading ? "Submitting…" : "Change Password"}</button>
          </div>
          {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.startsWith("✓") ? "#16a34a" : "#e84c3c" }}>{msg}</div>}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: 22 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>Session</h3>
          <p style={{ color: "rgba(13,13,13,0.55)", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
            Invalidate your current admin session. You will be redirected to the login page immediately.
          </p>
          <button style={{ ...as.rejectBtn, width: "100%", justifyContent: "center", display: "flex" }}
            onClick={() => { window.location.href = "/admin/logout"; }}>
            🚪 Logout Now
          </button>
        </div>
      </div>

      {/* ── Role Permissions Matrix ── */}
      <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: 22, marginBottom: 28 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>Role Permissions Matrix</h3>
        <p style={{ color: "rgba(13,13,13,0.45)", fontSize: 12, marginBottom: 20 }}>
          Access permissions for each role. Use as a reference when assigning roles below.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {permCard("👑", "ADMIN", "Full System Access", "#7c3aed", [
            [true,  "Manage all users & vendors"],
            [true,  "Approve / reject products"],
            [true,  "Content management (banners)"],
            [true,  "Process refunds & returns"],
            [true,  "RBAC / Security settings"],
            [true,  "View platform analytics"],
          ], ["/admin/*", "/approve-products", "/admin/refunds", "/admin/security"])}

          {permCard("📋", "ORDER_MANAGER", "Order Operations", "#2563eb", [
            [true,  "View all orders"],
            [true,  "Update order status"],
            [true,  "Track shipments"],
            [true,  "Handle cancellations"],
            [false, "No admin panel access"],
            [false, "Cannot manage users"],
          ], ["/orders/*", "/track-order/*", "/cancel-order/*"])}

          {permCard("🛍️", "CUSTOMER", "Standard User", "#16a34a", [
            [true,  "Browse & search products"],
            [true,  "Add to cart & checkout"],
            [true,  "View own order history"],
            [true,  "Manage addresses"],
            [false, "No admin access"],
            [false, "No order management"],
          ], ["/customer/*", "/cart", "/checkout"])}
        </div>
      </div>

      {/* ── User Role Management ── */}
      <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>User Role Management</h3>
          <span style={{ fontSize: 12, color: "rgba(13,13,13,0.4)" }}>{users.length} registered users</span>
        </div>

        <input
          style={{ ...as.searchInput, marginBottom: 16 }}
          placeholder="Search by name or email…"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
        />

        {usersLoading ? (
          <div style={as.empty}>Loading users…</div>
        ) : filteredUsers.length === 0 ? (
          <div style={as.empty}>{searchQ ? "No users match that search." : "No users registered yet."}</div>
        ) : (
          <div style={as.tableWrap}>
            <table style={as.table}>
              <thead style={as.thead}>
                <tr>
                  {["User", "Email", "Sign-in", "Verified", "Current Role", "Change Role"].map(h => (
                    <th key={h} style={as.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={as.tr}>
                    <td style={as.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: (roleColor[u.role] || "#6b7280") + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: roleColor[u.role] || "#6b7280" }}>
                          {(u.name || "?")[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name || "Unnamed"}</span>
                      </div>
                    </td>
                    <td style={{ ...as.td, color: "rgba(13,13,13,0.55)" }}>{u.email}</td>
                    <td style={as.td}>
                      <span title={u.provider || "email"}>{providerIcon(u.provider)} {u.provider ? u.provider.charAt(0).toUpperCase() + u.provider.slice(1) : "Email"}</span>
                    </td>
                    <td style={as.td}>
                      {u.verified
                        ? <span style={{ ...as.badge, background: "#f0fdf4", color: "#16a34a" }}>✓ Verified</span>
                        : <span style={{ ...as.badge, background: "#fef9c3", color: "#a16207" }}>Unverified</span>}
                    </td>
                    <td style={as.td}>
                      <span style={{ ...as.badge, background: roleBg[u.role] || "#f2f0eb", color: roleColor[u.role] || "#6b7280" }}>{u.role}</span>
                    </td>
                    <td style={as.td}>
                      <select
                        style={{ ...as.statusSelect, minWidth: 140 }}
                        value={u.role}
                        onChange={e => {
                          if (e.target.value !== u.role) setRoleModal({ user: u, newRole: e.target.value });
                          else e.target.value = u.role; // reset if same
                        }}
                      >
                        {["CUSTOMER", "ORDER_MANAGER", "ADMIN"].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Role change confirmation modal ── */}
      {roleModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setRoleModal(null); }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: roleModal.newRole === "ADMIN" ? "#f5f3ff" : roleModal.newRole === "ORDER_MANAGER" ? "#eff6ff" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>
              {roleModal.newRole === "ADMIN" ? "👑" : roleModal.newRole === "ORDER_MANAGER" ? "📋" : "🛍️"}
            </div>
            <h3 style={{ textAlign: "center", margin: "0 0 10px", fontSize: 17, fontWeight: 800 }}>
              {roleModal.newRole === "ADMIN" ? "Grant Admin Access?" : roleModal.user.role === "ADMIN" ? "Revoke Admin Access?" : "Change Role?"}
            </h3>
            <p style={{ textAlign: "center", color: "rgba(13,13,13,0.55)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Change <strong>{roleModal.user.name || roleModal.user.email}</strong> from{" "}
              <strong style={{ color: roleColor[roleModal.user.role] }}>{roleModal.user.role}</strong> to{" "}
              <strong style={{ color: roleColor[roleModal.newRole] }}>{roleModal.newRole}</strong>?
              {roleModal.newRole === "ADMIN" && " This grants full platform access."}
              {roleModal.user.role === "ADMIN" && roleModal.newRole !== "ADMIN" && " They will immediately lose all /admin/* access."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...as.filterBtn, flex: 1 }} onClick={() => setRoleModal(null)} disabled={roleChanging}>Cancel</button>
              <button
                style={{ flex: 1, padding: "9px 16px", borderRadius: 9, border: "none", background: roleModal.newRole === "ADMIN" ? "#7c3aed" : roleModal.user.role === "ADMIN" ? "#e84c3c" : "#0d0d0d", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                onClick={confirmRoleChange}
                disabled={roleChanging}
              >
                {roleChanging ? "Updating…" : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}