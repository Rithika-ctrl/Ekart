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
  const [adminCategories, setAdminCategories] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [packedOrders, setPackedOrders] = useState([]);
  const [shippedOrders, setShippedOrders] = useState([]);
  const [outOrders, setOutOrders] = useState([]);
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
    const res = await fetch("/api/react" + path, { ...opts, headers });
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
  useEffect(() => { if (page === "warehouse")  api("/admin/warehouses").then(d => d.success && setWarehouses(d.warehouses || [])); }, [page]);
  useEffect(() => { if (page === "categories") api("/admin/categories").then(d => d.success && setAdminCategories(d.categories || [])); }, [page]);
  useEffect(() => {
    if (page === "delivery") {
      api("/admin/delivery-boys").then(d => d.success && setDeliveryBoys(d.deliveryBoys || []));
      api("/admin/warehouses").then(d => d.success && setWarehouses(d.warehouses || []));
      api("/admin/orders/packed").then(d => d.success && setPackedOrders(d.orders || []));
      api("/admin/orders/shipped").then(d => d.success && setShippedOrders(d.orders || []));
      api("/admin/orders/out-for-delivery").then(d => d.success && setOutOrders(d.orders || []));
    }
  }, [page]);
  
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
  const approveAllProducts = async () => {
    const d = await api("/admin/products/approve-all", { method: "POST" });
    if (d.success) {
      show(d.approvedCount > 0 ? `✓ Approved ${d.approvedCount} product${d.approvedCount === 1 ? "" : "s"}` : "No pending products");
      loadAll();
    } else show(d.message || "Error");
  };
  const toggleCustomer = async (id) => { const d = await api(`/admin/customers/${id}/toggle-active`, { method: "POST" }); if (d.success) { show("Updated"); loadAll(); } else show(d.message || "Error"); };
  const toggleVendor   = async (id) => { const d = await api(`/admin/vendors/${id}/toggle-active`,   { method: "POST" }); if (d.success) { show("Updated"); loadAll(); } else show(d.message || "Error"); };
  const updateOrder    = async (id, status) => { const d = await api(`/admin/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); if (d.success) { show("Updated"); loadAll(); } else show(d.message || "Error"); };
  const approveRefund  = async (id) => { const d = await api(`/admin/refunds/${id}/approve`, { method: "POST" }); if (d.success) { show("Refund approved"); api("/admin/refunds").then(d => d.success && setRefunds(d.refunds || [])); } else show(d.message || "Error"); };
  const rejectRefund   = async (id, reason) => { const d = await api(`/admin/refunds/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }); if (d.success) { show("Refund rejected"); api("/admin/refunds").then(d => d.success && setRefunds(d.refunds || [])); } else show(d.message || "Error"); };
  const deleteReview   = async (id) => { const d = await api(`/admin/reviews/${id}/delete`, { method: "DELETE" }); if (d.success) { show("Deleted"); api("/admin/reviews").then(d => d.success && setReviews(d.reviews || [])); } else show(d.message || "Error"); };
  const approveDelivery = async (id, warehouseId, pins) => {
    const d = await api(`/admin/delivery-boys/${id}/approve`, { method: "POST", body: JSON.stringify({ warehouseId, assignedPinCodes: pins }) });
    if (d.success) { show("Approved ✓"); api("/admin/delivery-boys").then(d => d.success && setDeliveryBoys(d.deliveryBoys || [])); }
    else show(d.message || "Error");
  };
  const rejectDelivery = async (id, reason) => {
    const d = await api(`/admin/delivery-boys/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
    if (d.success) { show("Rejected"); api("/admin/delivery-boys").then(d => d.success && setDeliveryBoys(d.deliveryBoys || [])); }
    else show(d.message || "Error");
  };
  const assignDeliveryBoy = async (orderId, deliveryBoyId) => {
    const d = await api(`/admin/delivery/assign`, { method: "POST", body: JSON.stringify({ orderId, deliveryBoyId }) });
    if (d.success) {
      show("Assigned ✓");
      api("/admin/orders/packed").then(d => d.success && setPackedOrders(d.orders || []));
      api("/admin/orders/shipped").then(d => d.success && setShippedOrders(d.orders || []));
    } else show(d.message || "Error");
  };
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
    { key: "categories", label: "🗂️ Categories" },
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
          {page === "products"   && <ProductsAdmin products={products} onApprove={approveProduct} onReject={rejectProduct} onApproveAll={approveAllProducts} />}
          {page === "orders"     && <OrdersAdmin orders={orders} onUpdateStatus={updateOrder} api={api} />}
          {page === "customers"  && <CustomersAdmin customers={users.customers} onToggle={toggleCustomer} api={api} showToast={show} />}
          {page === "vendors"    && <VendorsAdmin vendors={vendors} onToggle={toggleVendor} />}
          {page === "delivery"   && <DeliveryAdmin deliveryBoys={deliveryBoys} warehouses={warehouses} packedOrders={packedOrders} shippedOrders={shippedOrders} outOrders={outOrders} onApprove={approveDelivery} onReject={rejectDelivery} onApproveTransfer={approveTransfer} onRejectTransfer={rejectTransfer} onAssign={assignDeliveryBoy} api={api} showToast={show} />}
          {page === "warehouse"  && <WarehouseAdmin warehouses={warehouses} api={api} showToast={show} onRefresh={() => api("/admin/warehouses").then(d => d.success && setWarehouses(d.warehouses || []))} />}
          {page === "coupons"    && <CouponsAdmin coupons={coupons} api={api} showToast={show} onRefresh={() => api("/admin/coupons").then(d => d.success && setCoupons(d.coupons || []))} />}
          {page === "refunds"    && <RefundsAdmin refunds={refunds} onApprove={approveRefund} onReject={rejectRefund} />}
          {page === "reviews"    && <ReviewsAdmin reviews={reviews} onDelete={deleteReview} api={api} showToast={show} />}
          {page === "analytics"  && <AnalyticsAdmin data={analytics} spending={spending} orders={orders} products={products} users={users} totalRevenue={totalRevenue} />}
          {page === "usersearch" && <UserSearch api={api} showToast={show} />}
          {page === "policies"   && <PoliciesAdmin policies={policies} onCreate={createPolicy} onUpdate={updatePolicy} onDelete={deletePolicy} />}
          {page === "security"   && <SecurityAdmin />}
          {page === "accounts"   && <AccountsAdmin />}
          {page === "categories" && <CategoryAdmin categories={adminCategories} api={api} showToast={show} onRefresh={() => api("/admin/categories").then(d => d.success && setAdminCategories(d.categories || []))} />}
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
function ProductsAdmin({ products, onApprove, onReject, onApproveAll }) {
  const [filter, setFilter] = useState("pending");
  const [confirmModal, setConfirmModal] = useState(false);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [q, setQ] = useState("");

  const pendingCount = products.filter(p => !p.approved).length;
  const byStatus = filter === "all" ? products : filter === "pending" ? products.filter(p => !p.approved) : products.filter(p => p.approved);
  const filtered = q.trim()
    ? byStatus.filter(p => {
        const s = q.toLowerCase();
        return (p.name || "").toLowerCase().includes(s)
          || (p.vendorName || "").toLowerCase().includes(s)
          || (p.category || "").toLowerCase().includes(s)
          || String(p.id).includes(s);
      })
    : byStatus;

  const getImages = (p) => {
    const imgs = [];
    if (p.imageLink) imgs.push(p.imageLink);
    if (p.extraImageLinks) {
      p.extraImageLinks.split(",").forEach(u => { const t = u.trim(); if (t) imgs.push(t); });
    }
    return imgs;
  };

  const openPreview = (p) => { setPreviewProduct(p); setImgIndex(0); };
  const closePreview = () => setPreviewProduct(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={as.pageTitle}>Product Management</h2>
        {pendingCount > 0 && (
          <button
            style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#1db882", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setConfirmModal(true)}
          >
            ✓ Approve All Pending ({pendingCount})
          </button>
        )}
      </div>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none", opacity: 0.4 }}>🔍</span>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, vendor, category or ID…"
          style={{ ...as.searchInput, paddingLeft: 40, paddingRight: q ? 36 : 16 }}
        />
        {q && (
          <button
            onClick={() => setQ("")}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "rgba(13,13,13,0.4)", lineHeight: 1, padding: 0 }}
          >×</button>
        )}
      </div>

      {/* Status filter pills + result count */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["all","All"],["pending","Pending"],["approved","Approved"]].map(([k,l]) => (
          <button key={k} style={{ ...as.filterBtn, ...(filter === k ? as.filterBtnActive : {}) }} onClick={() => setFilter(k)}>
            {l} ({k === "all" ? products.length : k === "pending" ? products.filter(p => !p.approved).length : products.filter(p => p.approved).length})
          </button>
        ))}
        {q.trim() && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(13,13,13,0.45)", fontWeight: 600 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{q.trim()}"
          </span>
        )}
      </div>
      <AdminTable
        cols={["Image","Product","Vendor","Category","Price","Stock","Status","Actions"]}
        rows={filtered.map(p => {
          const imgs = getImages(p);
          return [
            <div
              onClick={() => openPreview(p)}
              style={{ cursor: "pointer", width: 44, height: 44, borderRadius: 8, overflow: "hidden", border: "1px solid #e8e4dc", background: "#f2f0eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              {imgs[0]
                ? <img src={imgs[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                : <span style={{ fontSize: 18 }}>📦</span>}
            </div>,
            <div style={{ cursor: "pointer" }} onClick={() => openPreview(p)}>
              <div style={{ fontWeight: 700, color: "#0d0d0d" }}>{p.name}</div>
              <div style={{ color: "rgba(13,13,13,0.4)", fontSize: 11 }}>#{p.id} · {imgs.length} photo{imgs.length !== 1 ? "s" : ""}</div>
            </div>,
            p.vendorName || "—", p.category, fmt(p.price), p.stock,
            <span style={{ ...as.badge, background: p.approved ? "#e8f9f2" : "#fef9e7", color: p.approved ? "#1db882" : "#d4a017" }}>{p.approved ? "Approved" : "Pending"}</span>,
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button style={{ ...as.filterBtn, fontSize: 11, padding: "4px 10px" }} onClick={() => openPreview(p)}>👁 View</button>
              {!p.approved && <button style={as.approveBtn} onClick={() => onApprove(p.id)}>✓</button>}
              {p.approved  && <button style={as.rejectBtn}  onClick={() => onReject(p.id)}>✗</button>}
            </div>
          ];
        })}
        empty="No products to show"
      />

      {/* ── Product Detail / Image Preview Modal ── */}
      {previewProduct && (() => {
        const p = previewProduct;
        const imgs = getImages(p);
        const hasDiscount = p.mrp && p.mrp > p.price;
        const discountPct = hasDiscount ? Math.round((1 - p.price / p.mrp) * 100) : 0;
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) closePreview(); }}
          >
            <div style={{ background: "#fff", borderRadius: 20, maxWidth: 800, width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>

              {/* Modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f2f0eb", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0d0d0d" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(13,13,13,0.45)", marginTop: 2 }}>Product #{p.id} · {p.category}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {!p.approved && (
                    <button style={{ ...as.approveBtn, padding: "7px 16px" }} onClick={() => { onApprove(p.id); closePreview(); }}>✓ Approve</button>
                  )}
                  {p.approved && (
                    <button style={{ ...as.rejectBtn, padding: "7px 16px" }} onClick={() => { onReject(p.id); closePreview(); }}>✗ Hide</button>
                  )}
                  <button
                    onClick={closePreview}
                    style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #e8e4dc", background: "#fafaf8", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#0d0d0d", lineHeight: 1 }}
                  >×</button>
                </div>
              </div>

              {/* Modal body — scrollable */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>

                  {/* Left: image gallery */}
                  <div style={{ padding: 24, borderRight: "1px solid #f2f0eb" }}>
                    {/* Main image viewer */}
                    <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 14, overflow: "hidden", background: "#f2f0eb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" }}>
                      {imgs.length > 0 ? (
                        <>
                          <img
                            key={imgIndex}
                            src={imgs[imgIndex]}
                            alt={p.name}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
                          />
                          <div style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", fontSize: 48 }}>📦</div>
                          {imgs.length > 1 && (
                            <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                              {imgIndex + 1}/{imgs.length}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 56, opacity: 0.4 }}>📦</span>
                      )}
                    </div>

                    {/* Thumbnail strip */}
                    {imgs.length > 1 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {imgs.map((url, i) => (
                          <div
                            key={i}
                            onClick={() => setImgIndex(i)}
                            style={{
                              width: 52, height: 52, borderRadius: 8, overflow: "hidden",
                              border: `2px solid ${i === imgIndex ? "#0d0d0d" : "#e8e4dc"}`,
                              cursor: "pointer", background: "#f2f0eb", flexShrink: 0,
                              transition: "border-color 0.15s"
                            }}
                          >
                            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 10, fontSize: 11, color: "rgba(13,13,13,0.4)", textAlign: "center" }}>
                      {imgs.length === 0 ? "No images uploaded" : `${imgs.length} image${imgs.length !== 1 ? "s" : ""} total`}
                    </div>
                  </div>

                  {/* Right: product info */}
                  <div style={{ padding: 24 }}>
                    {/* Approval status */}
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ ...as.badge, background: p.approved ? "#e8f9f2" : "#fef9e7", color: p.approved ? "#1db882" : "#d4a017" }}>
                        {p.approved ? "✓ Approved" : "⏳ Pending Approval"}
                      </span>
                    </div>

                    {/* Price block */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: "#0d0d0d", letterSpacing: "-1px" }}>{fmt(p.price)}</span>
                        {hasDiscount && (
                          <>
                            <span style={{ fontSize: 14, color: "rgba(13,13,13,0.38)", textDecoration: "line-through" }}>{fmt(p.mrp)}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1db882", background: "#e8f9f2", padding: "2px 8px", borderRadius: 6 }}>{discountPct}% off</span>
                          </>
                        )}
                      </div>
                      {p.gstRate > 0 && (
                        <div style={{ fontSize: 11, color: "rgba(13,13,13,0.4)", marginTop: 4 }}>+ {p.gstRate}% GST applicable</div>
                      )}
                    </div>

                    {/* Info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                      {[
                        ["Vendor", p.vendorName || "—"],
                        ["Category", p.category || "—"],
                        ["Stock", p.stock != null ? `${p.stock} units` : "—"],
                        ["Alert Threshold", p.stockAlertThreshold != null ? `${p.stockAlertThreshold} units` : "—"],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: "#fafaf8", borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0d0d0d" }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    {p.description && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 6 }}>Description</div>
                        <div style={{ fontSize: 13, color: "#0d0d0d", lineHeight: 1.65, background: "#fafaf8", borderRadius: 10, padding: "12px 14px", maxHeight: 130, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                          {p.description}
                        </div>
                      </div>
                    )}

                    {/* Delivery pin codes */}
                    {p.allowedPinCodes && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 6 }}>Restricted Pin Codes</div>
                        <div style={{ fontSize: 12, color: "#0d0d0d", background: "#fafaf8", borderRadius: 10, padding: "10px 14px", wordBreak: "break-all" }}>{p.allowedPinCodes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Approve All confirmation modal */}
      {confirmModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#e8f9f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>✓</div>
            <h3 style={{ textAlign: "center", margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>Approve All Pending?</h3>
            <p style={{ textAlign: "center", color: "rgba(13,13,13,0.55)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              This will approve all <strong>{pendingCount} pending product{pendingCount === 1 ? "" : "s"}</strong> and make them immediately visible to customers.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...as.filterBtn, flex: 1 }} onClick={() => setConfirmModal(false)}>Cancel</button>
              <button
                style={{ flex: 1, padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: "#1db882", color: "#fff" }}
                onClick={() => { onApproveAll(); setConfirmModal(false); }}
              >
                ✓ Approve All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Orders ── */
function OrdersAdmin({ orders, onUpdateStatus, api }) {
  const statuses = ["PLACED","CONFIRMED","SHIPPED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"];
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null); // order object for detail modal
  const [detailLoading, setDetailLoading] = useState(false);
  const sColor = { PLACED:"#d4a017",CONFIRMED:"#2563eb",SHIPPED:"#0284c7",OUT_FOR_DELIVERY:"#7c3aed",DELIVERED:"#1db882",CANCELLED:"#e84c3c" };

  const filtered = orders
    .filter(o => !filter || o.trackingStatus === filter)
    .filter(o => !search ||
      String(o.id).includes(search) ||
      (o.customerName || "").toLowerCase().includes(search.toLowerCase())
    );

  const openDetail = async (order) => {
    // Use the already-fetched items from the list response (mapOrder embeds them)
    // If items are missing for some reason, fall back to the dedicated endpoint
    if (order.items && order.items.length >= 0) {
      setSelectedOrder(order);
      return;
    }
    setDetailLoading(true);
    try {
      const d = await api(`/admin/orders/${order.id}`);
      setSelectedOrder(d.success ? d.order : order);
    } catch { setSelectedOrder(order); }
    setDetailLoading(false);
  };

  const subtotal = (items) => (items || []).reduce((s, i) => s + (i.price * i.quantity), 0);

  return (
    <div>
      <h2 style={as.pageTitle}>Order Management</h2>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...as.searchInput, flex: "0 0 220px" }}
          placeholder="Search by ID or customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={{ ...as.filterBtn, ...(filter === "" ? as.filterBtnActive : {}) }} onClick={() => setFilter("")}>All ({orders.length})</button>
          {statuses.map(s => { const c = orders.filter(o => o.trackingStatus === s).length; return c > 0 ? <button key={s} style={{ ...as.filterBtn, ...(filter === s ? as.filterBtnActive : {}) }} onClick={() => setFilter(s)}>{s.replace(/_/g," ")} ({c})</button> : null; })}
        </div>
      </div>

      <div style={as.tableWrap}>
        <table style={as.table}>
          <thead style={as.thead}>
            <tr>
              {["ID","Customer","Items","Amount","Date","Status","Update",""].map(h => (
                <th key={h} style={as.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ ...as.td, textAlign: "center", color: "rgba(13,13,13,0.4)" }}>No orders</td></tr>
            )}
            {filtered.map(o => (
              <tr key={o.id} style={as.tr}>
                <td style={{ ...as.td, fontWeight: 700, color: "#2563eb" }}>#{o.id}</td>
                <td style={{ ...as.td, fontWeight: 600 }}>{o.customerName || "—"}</td>
                <td style={{ ...as.td, textAlign: "center" }}>
                  <span style={{ ...as.badge, background: "#f2f0eb", color: "#0d0d0d", fontWeight: 700 }}>
                    {(o.items || []).length}
                  </span>
                </td>
                <td style={{ ...as.td, fontWeight: 600 }}>{fmt(o.totalPrice || o.amount)}</td>
                <td style={{ ...as.td, color: "rgba(13,13,13,0.55)", fontSize: 12 }}>
                  {o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN") : "—"}
                </td>
                <td style={as.td}>
                  <span style={{ ...as.badge, background: (sColor[o.trackingStatus] || "#6b7280") + "22", color: sColor[o.trackingStatus] || "#6b7280" }}>
                    {o.trackingStatus?.replace(/_/g," ")}
                  </span>
                </td>
                <td style={as.td}>
                  <select style={as.statusSelect} value={o.trackingStatus} onChange={e => onUpdateStatus(o.id, e.target.value)}>
                    {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                  </select>
                </td>
                <td style={as.td}>
                  <button
                    style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid #2563eb", background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    onClick={() => openDetail(o)}
                    disabled={detailLoading}
                  >
                    {detailLoading ? "…" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null); }}
        >
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.22)" }}>
            {/* Modal header */}
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid #f2f0eb", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Order #{selectedOrder.id}</div>
                <div style={{ fontSize: 12, color: "rgba(13,13,13,0.5)", marginTop: 2 }}>
                  {selectedOrder.customerName || "Unknown customer"}
                  {selectedOrder.orderDate && ` · ${new Date(selectedOrder.orderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                </div>
              </div>
              <span style={{ ...as.badge, background: (sColor[selectedOrder.trackingStatus] || "#6b7280") + "22", color: sColor[selectedOrder.trackingStatus] || "#6b7280", fontSize: 12, fontWeight: 700 }}>
                {selectedOrder.trackingStatus?.replace(/_/g," ")}
              </span>
              <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "rgba(13,13,13,0.4)", lineHeight: 1 }}>✕</button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", padding: "22px 28px", flex: 1 }}>

              {/* Order meta pills */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
                {[
                  { label: "Payment", value: selectedOrder.paymentMode || "—" },
                  { label: "Delivery", value: selectedOrder.deliveryTime || "—" },
                  { label: "City", value: selectedOrder.currentCity || "—" },
                  { label: "Replacement", value: selectedOrder.replacementRequested ? "Requested" : "None" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#f8f7f4", borderRadius: 10, padding: "8px 14px", fontSize: 12 }}>
                    <div style={{ color: "rgba(13,13,13,0.45)", fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 700, color: "#0d0d0d" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Line items */}
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, color: "#0d0d0d" }}>
                Line Items ({(selectedOrder.items || []).length})
              </div>

              {(selectedOrder.items || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(13,13,13,0.35)", fontSize: 13 }}>No items found</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: "flex", gap: 14, alignItems: "center", background: "#f8f7f4", borderRadius: 12, padding: "12px 16px" }}>
                      {/* Thumbnail */}
                      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", background: "#e8e4dc", flexShrink: 0 }}>
                        {item.imageLink
                          ? <img src={item.imageLink} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🛍️</div>
                        }
                      </div>
                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0d0d0d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(13,13,13,0.45)", marginTop: 2 }}>
                          {item.category && <span style={{ marginRight: 8 }}>{item.category}</span>}
                          {item.productId && <span>SKU #{item.productId}</span>}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 11, color: "rgba(13,13,13,0.4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                        )}
                      </div>
                      {/* Qty × price */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#0d0d0d" }}>{fmt(item.price * item.quantity)}</div>
                        <div style={{ fontSize: 11, color: "rgba(13,13,13,0.45)", marginTop: 2 }}>
                          {fmt(item.price)} × {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Price breakdown */}
              <div style={{ borderTop: "1px solid #f2f0eb", paddingTop: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>Price Breakdown</div>
                {[
                  { label: "Subtotal", value: fmt(subtotal(selectedOrder.items)) },
                  { label: "Delivery Charge", value: fmt(selectedOrder.deliveryCharge) },
                  { label: "Discount / Coupon", value: selectedOrder.amount != null && selectedOrder.totalPrice != null && selectedOrder.totalPrice < subtotal(selectedOrder.items) + (selectedOrder.deliveryCharge || 0)
                      ? `−${fmt(subtotal(selectedOrder.items) + (selectedOrder.deliveryCharge || 0) - selectedOrder.totalPrice)}`
                      : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7, color: "rgba(13,13,13,0.6)" }}>
                    <span>{label}</span><span style={{ fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, paddingTop: 10, borderTop: "1px solid #f2f0eb", color: "#0d0d0d" }}>
                  <span>Total</span>
                  <span style={{ color: "#1db882" }}>{fmt(selectedOrder.totalPrice || selectedOrder.amount)}</span>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: "14px 28px", borderTop: "1px solid #f2f0eb", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={as.filterBtn} onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
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
function DeliveryAdmin({ deliveryBoys, warehouses, packedOrders, shippedOrders, outOrders, onApprove, onReject, onApproveTransfer, onRejectTransfer, onAssign, api, showToast }) {
  const [transfers, setTransfers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selectMap, setSelectMap] = useState({}); // orderId -> deliveryBoyId
  const [eligibleMap, setEligibleMap] = useState({}); // orderId -> [{id,name,code,warehouse}]

  useEffect(() => {
    api("/admin/warehouse-transfers").then(d => { if (d.success) setTransfers(d.transfers || []); });
  }, []);

  // Load eligible delivery boys for each packed order
  useEffect(() => {
    (packedOrders || []).forEach(order => {
      fetch(`/api/react/admin/delivery/boys/for-order/${order.id}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
      })
        .then(r => r.json())
        .then(d => {
          setEligibleMap(prev => ({ ...prev, [order.id]: d.success ? (d.deliveryBoys || []) : [] }));
        })
        .catch(() => setEligibleMap(prev => ({ ...prev, [order.id]: [] })));
    });
  }, [packedOrders]);

  const pendingApprovals = (deliveryBoys || []).filter(d => !d.approved);
  const pendingTransfers = transfers.filter(t => t.status === "PENDING");
  const filtered = filter === "pending" ? pendingApprovals : (deliveryBoys || []);

  // Local warehouse+pins state for pending approval rows
  const [approvalWh, setApprovalWh] = useState({});
  const [approvalPins, setApprovalPins] = useState({});

  const handleApprove = (id) => {
    const warehouseId = approvalWh[id] || "";
    const pins = approvalPins[id] || "";
    onApprove(id, warehouseId, pins);
  };

  const handleReject = (id, name) => {
    const reason = window.prompt(`Enter rejection reason for ${name} (optional — will be emailed):`);
    if (reason === null) return;
    onReject(id, reason);
  };

  const handleApproveTransfer = (t) => {
    const note = window.prompt(`Approve warehouse transfer for ${t.deliveryBoy?.name}?\nOptional note for delivery boy (leave blank to skip):`);
    if (note === null) return;
    onApproveTransfer(t.id);
    setTransfers(tr => tr.filter(x => x.id !== t.id));
  };

  const handleRejectTransfer = (t) => {
    const note = window.prompt(`Reject transfer for ${t.deliveryBoy?.name}.\nReason (will be emailed to delivery boy):`);
    if (note === null) return;
    onRejectTransfer(t.id);
    setTransfers(tr => tr.filter(x => x.id !== t.id));
  };

  const inputStyle = { background: "rgba(13,13,13,0.06)", border: "1px solid rgba(13,13,13,0.15)", borderRadius: 8, padding: "6px 10px", fontSize: 13, width: "100%", outline: "none" };

  return (
    <div>
      <h2 style={as.pageTitle}>Delivery Management 🛵</h2>

      {/* ── Pending Approvals ── */}
      {pendingApprovals.length > 0 && (
        <div style={{ ...as.card, marginBottom: 24, border: "1px solid rgba(245,168,0,0.4)", background: "rgba(245,168,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <h3 style={{ ...as.cardTitle, color: "#d4a017", margin: 0 }}>Pending Approval Requests</h3>
            <span style={{ marginLeft: "auto", background: "#d4a017", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{pendingApprovals.length}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(13,13,13,0.5)", marginBottom: 14, background: "rgba(245,168,0,0.08)", padding: "8px 12px", borderRadius: 8 }}>
            ℹ️ These delivery boys have verified their email and are waiting for your approval. Select a warehouse and enter their pin codes before approving.
          </div>
          <AdminTable
            cols={["Name", "Email / Mobile", "Code", "Assign Warehouse", "Pin Codes", "Action"]}
            rows={pendingApprovals.map(db => [
              <span style={{ fontWeight: 600 }}>{db.name}</span>,
              <div>
                <div style={{ fontSize: 13 }}>{db.email}</div>
                <div style={{ fontSize: 11, color: "rgba(13,13,13,0.4)" }}>{db.mobile}</div>
              </div>,
              <span style={{ fontWeight: 700, fontSize: 12, fontFamily: "monospace", color: "#d4a017" }}>{db.deliveryBoyCode}</span>,
              <select style={inputStyle} value={approvalWh[db.id] || ""} onChange={e => setApprovalWh(prev => ({ ...prev, [db.id]: e.target.value }))}>
                <option value="">Select warehouse</option>
                {(warehouses || []).map(wh => <option key={wh.id} value={wh.id}>{wh.name} — {wh.city}</option>)}
              </select>,
              <input style={inputStyle} type="text" placeholder="e.g. 600001,600002"
                value={approvalPins[db.id] || ""}
                onChange={e => setApprovalPins(prev => ({ ...prev, [db.id]: e.target.value }))} />,
              <div style={{ display: "flex", gap: 6 }}>
                <button style={as.approveBtn} onClick={() => handleApprove(db.id)}>✓ Approve</button>
                <button style={as.rejectBtn} onClick={() => handleReject(db.id, db.name)}>✕ Reject</button>
              </div>
            ])}
            empty=""
          />
        </div>
      )}

      {/* ── Warehouse Transfer Requests ── */}
      {pendingTransfers.length > 0 && (
        <div style={{ ...as.card, marginBottom: 24, border: "1px solid rgba(99,179,237,0.4)", background: "rgba(99,179,237,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>🔄</span>
            <h3 style={{ ...as.cardTitle, color: "#63b3ed", margin: 0 }}>Warehouse Transfer Requests</h3>
            <span style={{ marginLeft: "auto", background: "#63b3ed", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{pendingTransfers.length}</span>
          </div>
          <AdminTable
            cols={["Delivery Boy", "Current Warehouse", "Requested Warehouse", "Reason", "Requested At", "Action"]}
            rows={pendingTransfers.map(t => [
              <div>
                <div style={{ fontWeight: 600 }}>{t.deliveryBoy?.name || "—"}</div>
                <div style={{ fontSize: 11, color: "rgba(13,13,13,0.4)" }}>{t.deliveryBoy?.deliveryBoyCode}</div>
              </div>,
              t.deliveryBoy?.warehouse ? `${t.deliveryBoy.warehouse.name} · ${t.deliveryBoy.warehouse.city}` : <span style={{ color: "rgba(13,13,13,0.35)" }}>None</span>,
              <div>
                <div style={{ fontWeight: 600, color: "#63b3ed" }}>{t.requestedWarehouse?.name}</div>
                <div style={{ fontSize: 11, color: "rgba(13,13,13,0.4)" }}>{t.requestedWarehouse?.city}, {t.requestedWarehouse?.state}</div>
              </div>,
              <span style={{ fontSize: 12, color: "rgba(13,13,13,0.5)" }}>{t.reason || "—"}</span>,
              <span style={{ fontSize: 11, color: "rgba(13,13,13,0.4)" }}>{t.requestedAt ? new Date(t.requestedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>,
              <div style={{ display: "flex", gap: 6 }}>
                <button style={as.approveBtn} onClick={() => handleApproveTransfer(t)}>✓ Approve</button>
                <button style={as.rejectBtn} onClick={() => handleRejectTransfer(t)}>✕ Reject</button>
              </div>
            ])}
            empty=""
          />
        </div>
      )}

      {/* ── Packed Orders — Assign Delivery Boy ── */}
      <div style={{ ...as.card, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 18 }}>📦</span>
          <h3 style={{ ...as.cardTitle, margin: 0 }}>Packed Orders — Assign Delivery Boy</h3>
          <span style={{ marginLeft: "auto", background: "#d4a017", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{(packedOrders || []).length}</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(13,13,13,0.5)", marginBottom: 14, background: "rgba(34,197,94,0.08)", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)" }}>
          ✓ Only delivery boys with <strong>Online</strong> status (🟢) are shown. They will receive and accept the order.
        </div>
        <AdminTable
          cols={["Order", "Customer", "Pin", "Warehouse", "Amount", "Assign To", ""]}
          rows={(packedOrders || []).map(order => {
            const eligible = (eligibleMap[order.id] || []).filter(b => b.isAvailable === true);
            return [
              <div>
                <span style={{ fontWeight: 700, color: "#d4a017" }}>#{order.id}</span>
                <div><span style={{ ...as.badge, background: "#fef9e7", color: "#d4a017", fontSize: 10 }}>PACKED</span></div>
              </div>,
              <div>
                <div style={{ fontWeight: 500 }}>{order.customer?.name}</div>
                <div style={{ fontSize: 11, color: "rgba(13,13,13,0.4)" }}>{order.customer?.mobile}</div>
              </div>,
              <span style={{ color: "rgba(13,13,13,0.5)", fontSize: 13 }}>{order.deliveryPinCode || "N/A"}</span>,
              order.warehouse ? order.warehouse.name : <span style={{ color: "#e84c3c", fontSize: 12 }}>Not assigned</span>,
              <span style={{ fontWeight: 600, color: "#1db882" }}>₹{Number(order.amount || order.totalPrice || 0).toLocaleString("en-IN")}</span>,
              <select style={{ ...inputStyle, minWidth: 180 }}
                value={selectMap[order.id] || ""}
                onChange={e => setSelectMap(prev => ({ ...prev, [order.id]: e.target.value }))}>
                <option value="">{eligible.length === 0 ? `No available delivery boys for pin ${order.deliveryPinCode || "N/A"}` : "Select delivery boy"}</option>
                {eligible.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code}) — {b.warehouse} {b.isAvailable ? "🟢" : "🔴"}</option>)}
              </select>,
              <button style={as.approveBtn} onClick={() => {
                if (!selectMap[order.id]) { showToast("Select a delivery boy first"); return; }
                onAssign(order.id, selectMap[order.id]);
              }}>✓ Assign</button>
            ];
          })}
          empty="✓ All packed orders have been assigned."
        />
      </div>

      {/* ── In Progress ── */}
      <div style={{ ...as.card, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 18 }}>🚚</span>
          <h3 style={{ ...as.cardTitle, margin: 0 }}>In Progress</h3>
        </div>
        <AdminTable
          cols={["Order", "Customer", "Pin", "Delivery Boy", "Status"]}
          rows={[
            ...(shippedOrders || []).map(o => [
              <span style={{ fontWeight: 700, color: "#d4a017" }}>#{o.id}</span>,
              o.customer?.name || "—",
              o.deliveryPinCode || "—",
              o.deliveryBoy?.name || "—",
              <span style={{ ...as.badge, background: "rgba(99,179,237,0.15)", color: "#63b3ed" }}>SHIPPED</span>
            ]),
            ...(outOrders || []).map(o => [
              <span style={{ fontWeight: 700, color: "#d4a017" }}>#{o.id}</span>,
              o.customer?.name || "—",
              o.deliveryPinCode || "—",
              o.deliveryBoy?.name || "—",
              <span style={{ ...as.badge, background: "rgba(34,197,94,0.15)", color: "#1db882" }}>OUT FOR DELIVERY</span>
            ])
          ]}
          empty="No orders in transit right now."
        />
      </div>

      {/* ── All Delivery Boys ── */}
      <div style={{ ...as.card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={as.cardTitle}>Delivery Boys</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {[["pending","Pending Approval"],["all","All"]].map(([k, l]) => (
              <button key={k} style={{ ...as.filterBtn, ...(filter === k ? as.filterBtnActive : {}) }} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
        <AdminTable
          cols={["ID","Name","Email","Mobile","Code","Warehouse","Status","Availability","Action"]}
          rows={filtered.map(d => [
            `#${d.id}`, d.name, d.email, d.mobile || "—", d.deliveryBoyCode,
            d.warehouse ? d.warehouse.name : "—",
            <span style={{ ...as.badge, background: d.approved ? "#e8f9f2" : "#fef9e7", color: d.approved ? "#1db882" : "#d4a017" }}>{d.approved ? "Active" : "Pending"}</span>,
            <span style={{ ...as.badge, background: d.isAvailable ? "#e8f9f2" : "#ffe8e8", color: d.isAvailable ? "#1db882" : "#ff8060", fontWeight: 600 }}>
              <i className={`fas fa-circle`} style={{ fontSize: "0.6rem", marginRight: "0.4rem" }} />
              {d.isAvailable ? "Online" : "Offline"}
            </span>,
            !d.approved ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button style={as.approveBtn} onClick={() => onApprove(d.id, "", "")}>✓ Approve</button>
                <button style={as.rejectBtn} onClick={() => handleReject(d.id, d.name)}>✕ Reject</button>
              </div>
            ) : null
          ])}
          empty="No delivery boys"
        />
      </div>
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
  const emptyForm = { code: "", description: "", type: "PERCENT", value: "", minOrderAmount: "0", maxDiscount: "0", usageLimit: "0", expiryDate: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.code || !form.value || !form.description) { showToast("Code, value and description are required"); return; }
    setSaving(true);
    const payload = {
      ...form,
      value: parseFloat(form.value),
      minOrderAmount: parseFloat(form.minOrderAmount) || 0,
      maxDiscount: parseFloat(form.maxDiscount) || 0,
      usageLimit: parseInt(form.usageLimit) || 0,
    };
    const d = await api("/admin/coupons/create", { method: "POST", body: JSON.stringify(payload) });
    if (d.success) { showToast("Coupon created!"); setShowForm(false); setForm(emptyForm); onRefresh(); }
    else showToast(d.message || "Error");
    setSaving(false);
  };
  const deleteCoupon = async (id, code) => {
    if (!window.confirm(`Delete coupon ${code}?`)) return;
    const d = await api(`/admin/coupons/${id}/delete`, { method: "DELETE" });
    if (d.success) { showToast("Deleted"); onRefresh(); } else showToast(d.message || "Error");
  };
  const toggleCoupon = async (id) => { const d = await api(`/admin/coupons/${id}/toggle`, { method: "POST" }); if (d.success) { showToast("Updated"); onRefresh(); } else showToast(d.message || "Error"); };

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={as.pageTitle}>Coupon Management 🎟️</h2>
        <button style={{ ...as.approveBtn, padding: "10px 20px" }} onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Create Coupon"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[["Total", coupons.length], ["Active", coupons.filter(c => c.active).length], ["Total Uses", coupons.reduce((s, c) => s + (c.usedCount || 0), 0)]].map(([l, v]) => (
          <div key={l} style={as.statCard}><div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{v}</div><div style={as.statLabel}>{l}</div></div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{ ...as.card, marginBottom: 24 }}>
          <h3 style={as.cardTitle}>Create New Coupon</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>

            {/* Coupon Code */}
            <div>
              <label style={as.label}>Coupon Code *</label>
              <input style={as.inputFull} type="text" placeholder="e.g. SAVE20" maxLength={20}
                value={form.code}
                onChange={e => field("code", e.target.value.toUpperCase().replace(/\s/g, ""))} />
              <div style={{ fontSize: 10, color: "rgba(13,13,13,0.4)", marginTop: 3 }}>Auto uppercased, no spaces</div>
            </div>

            {/* Discount Type */}
            <div>
              <label style={as.label}>Discount Type *</label>
              <select style={{ ...as.inputFull, cursor: "pointer" }} value={form.type} onChange={e => field("type", e.target.value)}>
                <option value="PERCENT">Percentage (%) Off</option>
                <option value="FLAT">Flat (₹) Off</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label style={as.label}>Discount Value *</label>
              <input style={as.inputFull} type="number" min="1" step="0.01"
                placeholder={form.type === "PERCENT" ? "e.g. 10" : "e.g. 50"}
                value={form.value} onChange={e => field("value", e.target.value)} />
              <div style={{ fontSize: 10, color: "rgba(13,13,13,0.4)", marginTop: 3 }}>
                {form.type === "PERCENT" ? "Enter % value (e.g. 10 = 10% off)" : "Enter ₹ amount (e.g. 50 = ₹50 off)"}
              </div>
            </div>

            {/* Min Order Amount */}
            <div>
              <label style={as.label}>Min Order Amount (₹)</label>
              <input style={as.inputFull} type="number" min="0" step="1" placeholder="0 = no minimum"
                value={form.minOrderAmount} onChange={e => field("minOrderAmount", e.target.value)} />
              <div style={{ fontSize: 10, color: "rgba(13,13,13,0.4)", marginTop: 3 }}>Customer needs bill ≥ this amount</div>
            </div>

            {/* Max Discount Cap */}
            <div>
              <label style={as.label}>Max Discount Cap (₹)</label>
              <input style={as.inputFull} type="number" min="0" step="1" placeholder="0 = no cap"
                value={form.maxDiscount} onChange={e => field("maxDiscount", e.target.value)} />
              <div style={{ fontSize: 10, color: "rgba(13,13,13,0.4)", marginTop: 3 }}>0 means unlimited discount</div>
            </div>

            {/* Usage Limit */}
            <div>
              <label style={as.label}>Usage Limit</label>
              <input style={as.inputFull} type="number" min="0" step="1" placeholder="0 = unlimited"
                value={form.usageLimit} onChange={e => field("usageLimit", e.target.value)} />
              <div style={{ fontSize: 10, color: "rgba(13,13,13,0.4)", marginTop: 3 }}>How many times total</div>
            </div>

            {/* Expiry Date */}
            <div>
              <label style={as.label}>Expiry Date</label>
              <input style={as.inputFull} type="date" value={form.expiryDate} onChange={e => field("expiryDate", e.target.value)} />
              <div style={{ fontSize: 10, color: "rgba(13,13,13,0.4)", marginTop: 3 }}>Leave blank = no expiry</div>
            </div>

            {/* Description — full width */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={as.label}>Description (shown to customers) *</label>
              <input style={as.inputFull} type="text" maxLength={200}
                placeholder="e.g. Get 20% off on orders above ₹500"
                value={form.description} onChange={e => field("description", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...as.approveBtn, padding: "10px 20px" }} onClick={save} disabled={saving}>
              {saving ? "Creating…" : "+ Create Coupon"}
            </button>
            <button style={as.filterBtn} onClick={() => { setShowForm(false); setForm(emptyForm); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Coupons Table */}
      <AdminTable
        cols={["Code", "Description", "Discount", "Min Order", "Cap", "Usage", "Expiry", "Status", "Actions"]}
        rows={coupons.map(c => [
          <code style={{ fontWeight: 700, color: "#2563eb", fontFamily: "monospace", letterSpacing: "0.05em" }}>{c.code}</code>,
          <span style={{ color: "rgba(13,13,13,0.6)", fontSize: 12 }}>{c.description || "—"}</span>,
          c.type === "FLAT"
            ? <span style={{ fontWeight: 700, color: "#6366f1" }}>₹{Number(c.value).toFixed(0)} off</span>
            : <span style={{ fontWeight: 700, color: "#1db882" }}>{c.value}% off</span>,
          c.minOrderAmount > 0 ? <span>₹{Number(c.minOrderAmount).toLocaleString("en-IN")}</span> : <span style={{ color: "rgba(13,13,13,0.35)" }}>None</span>,
          c.maxDiscount > 0 ? <span>₹{Number(c.maxDiscount).toLocaleString("en-IN")}</span> : <span style={{ color: "rgba(13,13,13,0.35)" }}>No cap</span>,
          <span>
            <span style={{ fontWeight: 700, color: "#d4a017" }}>{c.usedCount || 0}</span>
            <span style={{ color: "rgba(13,13,13,0.4)", fontSize: 11 }}>{c.usageLimit > 0 ? ` / ${c.usageLimit}` : " / ∞"}</span>
          </span>,
          c.expiryDate ? <span style={{ fontSize: 11 }}>{new Date(c.expiryDate).toLocaleDateString("en-IN")}</span> : <span style={{ color: "rgba(13,13,13,0.35)", fontSize: 11 }}>Never</span>,
          <span style={{ ...as.badge, background: c.active ? "#e8f9f2" : "#f2f0eb", color: c.active ? "#1db882" : "rgba(13,13,13,0.4)" }}>{c.active ? "Active" : "Disabled"}</span>,
          <div style={{ display: "flex", gap: 6 }}>
            <button style={c.active ? as.rejectBtn : as.approveBtn} onClick={() => toggleCoupon(c.id)}>{c.active ? "Disable" : "Enable"}</button>
            <button style={as.rejectBtn} onClick={() => deleteCoupon(c.id, c.code)}>Delete</button>
          </div>
        ])}
        empty="No coupons yet. Create one above."
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
function ReviewsAdmin({ reviews, onDelete, api, showToast }) {
  const [starFilter, setStarFilter] = useState(0);
  const [search, setSearch] = useState("");
  const [bulkModal, setBulkModal] = useState(null); // productName
  const [deleteModal, setDeleteModal] = useState(null); // review id

  // Computed stats
  const count = n => reviews.filter(r => r.rating === n).length;
  const total = reviews.length;
  const avgRating = total ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "0.0";
  const starCounts = { 5: count(5), 4: count(4), 3: count(3), 2: count(2), 1: count(1) };
  const maxCount = Math.max(...Object.values(starCounts), 1);

  // Product-wise stats
  const productMap = {};
  reviews.forEach(r => {
    const name = r.productName || "Unknown";
    if (!productMap[name]) productMap[name] = { count: 0, total: 0 };
    productMap[name].count++;
    productMap[name].total += r.rating;
  });
  const productStats = Object.entries(productMap).map(([name, d]) => ({
    productName: name, count: d.count, avgRating: (d.total / d.count).toFixed(1)
  })).sort((a, b) => b.count - a.count);

  // Filtered list
  const filtered = reviews.filter(r => {
    if (starFilter && r.rating !== starFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.customerName || "").toLowerCase().includes(q)
        || (r.productName || "").toLowerCase().includes(q)
        || (r.comment || "").toLowerCase().includes(q);
    }
    return true;
  });

  const handleBulkDelete = async () => {
    if (!bulkModal) return;
    const d = await api(`/admin/reviews/bulk-delete?productName=${encodeURIComponent(bulkModal)}`, { method: "DELETE" });
    if (d.success) { showToast("Bulk deleted"); setBulkModal(null); api("/admin/reviews").then(d => d.success && window.location.reload()); }
    else { showToast(d.message || "Error"); setBulkModal(null); }
  };

  const barColors = { 5: "#d4a017", 4: "#a3e635", 3: "#38bdf8", 2: "#fb923c", 1: "#ef4444" };
  const starLabel = { 5: "★★★★★", 4: "★★★★☆", 3: "★★★☆☆", 2: "★★☆☆☆", 1: "★☆☆☆☆" };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={as.pageTitle}>Review Management ⭐</h2>
        <div style={{ fontSize: 13, color: "rgba(13,13,13,0.45)", marginTop: 4 }}>Monitor, filter, and moderate all customer reviews across the platform.</div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Total Reviews", total, "#d4a017"],
          ["Avg Rating", avgRating + " ⭐", "#d4a017"],
          ["5-Star", starCounts[5], "#d4a017"],
          ["4-Star", starCounts[4], "#a3e635"],
          ["1–2 Star", starCounts[1] + starCounts[2], "#ef4444"],
        ].map(([l, v, col]) => (
          <div key={l} style={as.statCard}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: col }}>{v}</div>
            <div style={as.statLabel}>{l}</div>
          </div>
        ))}
      </div>

      {/* Rating Distribution Bar */}
      <div style={{ ...as.card, marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#d4a017", marginBottom: 14 }}>📊 Rating Distribution</div>
        {[5,4,3,2,1].map(n => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 55, fontSize: 12, color: "#d4a017", flexShrink: 0 }}>{starLabel[n]}</div>
            <div style={{ flex: 1, background: "rgba(13,13,13,0.08)", borderRadius: 20, height: 8 }}>
              <div style={{ height: 8, borderRadius: 20, background: barColors[n], width: `${Math.round((starCounts[n] / maxCount) * 100)}%`, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ width: 28, fontSize: 12, color: "rgba(13,13,13,0.4)", textAlign: "right", flexShrink: 0 }}>{starCounts[n]}</div>
          </div>
        ))}
      </div>

      {/* Reviews by Product Table */}
      {productStats.length > 0 && (
        <div style={{ ...as.card, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#d4a017", marginBottom: 14 }}>📦 Reviews by Product</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Product","Reviews","Avg Rating","Action"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", borderBottom: "1px solid rgba(13,13,13,0.1)", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productStats.map(ps => (
                <tr key={ps.productName} style={{ borderBottom: "1px solid rgba(13,13,13,0.06)" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{ps.productName}</td>
                  <td style={{ padding: "8px 10px" }}>{ps.count}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ color: "#d4a017", fontWeight: 700 }}>{ps.avgRating}</span>
                    <span style={{ color: "#d4a017", fontSize: 11 }}> ★</span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <button
                      style={{ ...as.rejectBtn, fontSize: 11, padding: "3px 10px" }}
                      onClick={() => setBulkModal(ps.productName)}
                    >
                      🗑 Clear All
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filter + Search Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button style={{ ...as.filterBtn, ...(starFilter === 0 ? as.filterBtnActive : {}) }} onClick={() => setStarFilter(0)}>
          All ({total})
        </button>
        {[5,4,3,2,1].map(n => (
          <button key={n} style={{ ...as.filterBtn, ...(starFilter === n ? as.filterBtnActive : {}) }} onClick={() => setStarFilter(n)}>
            {"★".repeat(n)}{"☆".repeat(5-n)} ({starCounts[n]})
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <input
            style={{ ...as.inputFull, width: 220, padding: "6px 12px", fontSize: 13 }}
            placeholder="Search by customer, product, comment…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Showing count */}
      <div style={{ fontSize: 12, color: "rgba(13,13,13,0.4)", marginBottom: 12 }}>
        Showing <strong style={{ color: "rgba(13,13,13,0.7)" }}>{filtered.length}</strong> review(s)
      </div>

      {/* Review Cards */}
      {filtered.map(r => (
        <div key={r.id} style={{ ...as.card, marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Avatar */}
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(212,160,23,0.15)", border: "2px solid rgba(212,160,23,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#d4a017", fontSize: 16, flexShrink: 0 }}>
            {(r.customerName || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{r.customerName || "Anonymous"}</span>
              {r.productName && (
                <span style={{ fontSize: 11, color: "rgba(13,13,13,0.45)", background: "rgba(13,13,13,0.06)", padding: "2px 8px", borderRadius: 10 }}>{r.productName}</span>
              )}
              <span style={{ color: "#d4a017", fontSize: 14 }}>
                {"★".repeat(r.rating)}<span style={{ color: "rgba(13,13,13,0.15)" }}>{"★".repeat(5 - r.rating)}</span>
              </span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(13,13,13,0.35)" }}>
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
              </span>
            </div>
            {/* Comment */}
            <div style={{ fontSize: 13, color: "rgba(13,13,13,0.6)", lineHeight: 1.6 }}>{r.comment || "No comment provided."}</div>
            {/* Actions */}
            <div style={{ marginTop: 8 }}>
              <button
                style={{ ...as.rejectBtn, fontSize: 12, padding: "4px 12px" }}
                onClick={() => setDeleteModal(r.id)}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {filtered.length === 0 && <div style={as.empty}>No reviews found for the selected filter.</div>}

      {/* Delete Confirm Modal */}
      {deleteModal !== null && (
        <div style={modalOverlay} onClick={() => setDeleteModal(null)}>
          <div style={{ ...modalBox, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🗑️</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Delete Review?</h3>
              <p style={{ color: "rgba(13,13,13,0.5)", fontSize: 13 }}>This action cannot be undone. The review will be permanently removed.</p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={{ ...as.filterBtn, padding: "8px 20px" }} onClick={() => setDeleteModal(null)}>Cancel</button>
              <button style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                onClick={() => { onDelete(deleteModal); setDeleteModal(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {bulkModal && (
        <div style={modalOverlay} onClick={() => setBulkModal(null)}>
          <div style={{ ...modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🗑️</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Delete All Reviews?</h3>
              <p style={{ color: "rgba(13,13,13,0.5)", fontSize: 13 }}>
                This will permanently delete ALL reviews for <strong>"{bulkModal}"</strong>. Cannot be undone.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={{ ...as.filterBtn, padding: "8px 20px" }} onClick={() => setBulkModal(null)}>Cancel</button>
              <button style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                onClick={handleBulkDelete}>Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Analytics ── */
/* ── Chart.js loader (lazy, CDN) ── */
function useChartJs(cb, deps) {
  useEffect(() => {
    if (window.Chart) { cb(window.Chart); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/chart.js";
    s.onload = () => cb(window.Chart);
    document.head.appendChild(s);
  }, deps);
}

function OrdersLineChart({ dailyOrders }) {
  const ref = useEffect(() => {}, []); // placeholder
  const canvasRef = { current: null };
  // We use a real ref via closure
  let chartInstance = null;
  useChartJs((Chart) => {
    const canvas = document.getElementById("analyticsOrdersChart");
    if (!canvas) return;
    if (canvas._chartInstance) { canvas._chartInstance.destroy(); }
    const labels = Object.keys(dailyOrders).map(d => {
      const date = new Date(d);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
    const inst = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Orders",
          data: Object.values(dailyOrders),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.08)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "rgba(13,13,13,0.05)" }, ticks: { color: "rgba(13,13,13,0.45)", font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: "rgba(13,13,13,0.05)" }, ticks: { color: "rgba(13,13,13,0.45)", stepSize: 1, font: { size: 11 } } },
        },
      },
    });
    canvas._chartInstance = inst;
  }, [JSON.stringify(dailyOrders)]);
  return (
    <div style={{ position: "relative", height: 250 }}>
      <canvas id="analyticsOrdersChart" />
    </div>
  );
}

function CategoryDoughnutChart({ categoryStats }) {
  const COLORS = ["#2563eb","#7c3aed","#1db882","#e84c3c","#d4a017","#0284c7","#14b8a6","#f97316"];
  const labels = Object.keys(categoryStats);
  const values = Object.values(categoryStats).map(Number);
  useChartJs((Chart) => {
    const canvas = document.getElementById("analyticsCategoryChart");
    if (!canvas) return;
    if (canvas._chartInstance) { canvas._chartInstance.destroy(); }
    const inst = new Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: COLORS.slice(0, labels.length),
          borderColor: "#fff",
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "rgba(13,13,13,0.6)", padding: 12, font: { size: 11 } },
          },
        },
      },
    });
    canvas._chartInstance = inst;
  }, [JSON.stringify(categoryStats)]);
  return (
    <div style={{ position: "relative", height: 250 }}>
      <canvas id="analyticsCategoryChart" />
    </div>
  );
}

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

  const processingOrders = Number(statusBreakdown["PLACED"] || 0) + Number(statusBreakdown["CONFIRMED"] || 0);
  const shippedOrders    = Number(statusBreakdown["SHIPPED"] || 0) + Number(statusBreakdown["OUT_FOR_DELIVERY"] || 0);
  const deliveredOrders  = Number(statusBreakdown["DELIVERED"] || 0);
  const approvedProducts = products.filter(p => p.approved).length;
  const pendingProductsCount = products.filter(p => !p.approved).length;

  const maxMonthRev = Math.max(...Object.values(monthlyRevenue), 1);

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

      {/* ── Row 1: 4 KPI stat cards (matching HTML) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          ["👥", "Customers", s.totalCustomers || users.customers.length, "#2563eb"],
          ["🏪", "Vendors",   s.totalVendors   || users.vendors.length,   "#d4a017"],
          ["🏷️", "Products",  s.totalProducts  || products.length,        "#7c3aed"],
          ["📦", "Orders",    s.totalOrders    || orders.length,           "#0284c7"],
        ].map(([icon, label, value, color]) => (
          <div key={label} style={as.statCard}>
            <div style={as.statIcon(color)}>{icon}</div>
            <div style={as.statVal}>{value}</div>
            <div style={as.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Orders line chart + Revenue card ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={as.card}>
          <h3 style={as.cardTitle}>📈 Orders (Last 7 Days)</h3>
          {Object.keys(dailyOrders).length > 0
            ? <OrdersLineChart dailyOrders={dailyOrders} />
            : <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(13,13,13,0.35)", fontSize: 13 }}>No order data yet</div>
          }
        </div>
        <div style={{
          background: "linear-gradient(135deg, #e8f4fd, #dbeafe)",
          border: "1px solid #bfdbfe",
          borderRadius: 16,
          padding: 28,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(13,13,13,0.45)", marginBottom: 8 }}>Total Revenue</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#2563eb", marginBottom: 6 }}>
            {fmt(s.totalRevenue || totalRevenue)}
          </div>
          <div style={{ fontSize: 13, color: "rgba(13,13,13,0.55)" }}>
            {s.totalOrders || orders.length} orders completed
          </div>
        </div>
      </div>

      {/* ── Row 3: Order Status Breakdown + Category Doughnut ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={as.card}>
          <h3 style={as.cardTitle}>🚚 Order Status Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "Processing", count: processingOrders, color: "#d4a017", bg: "#fef9e7", border: "#d4a017" },
              { label: "Shipped",    count: shippedOrders,    color: "#2563eb", bg: "#eff6ff", border: "#2563eb" },
              { label: "Delivered",  count: deliveredOrders,  color: "#1db882", bg: "#e8f9f2", border: "#1db882" },
            ].map(({ label, count, color, bg, border }) => (
              <div key={label} style={{
                background: bg, borderRadius: 12, padding: "16px 12px",
                textAlign: "center", borderLeft: `4px solid ${border}`,
              }}>
                <div style={{ fontSize: 26, fontWeight: 900, color }}>{count}</div>
                <div style={{ fontSize: 11, color: "rgba(13,13,13,0.5)", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Full breakdown bars below the cards */}
          {Object.keys(statusBreakdown).length > 0 && (
            <div style={{ marginTop: 18 }}>
              {Object.entries(statusBreakdown).map(([status, count]) => {
                const total = Math.max(Object.values(statusBreakdown).reduce((a, b) => a + Number(b), 0), 1);
                return (
                  <div key={status} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, minWidth: 150, color: "rgba(13,13,13,0.6)" }}>{status.replace(/_/g, " ")}</span>
                    <div style={{ flex: 1, height: 7, background: "#f2f0eb", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 4, width: `${Math.round(Number(count) / total * 100)}%` }} />
                    </div>
                    <span style={{ fontSize: 12, color: "rgba(13,13,13,0.45)", minWidth: 24, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={as.card}>
          <h3 style={as.cardTitle}>🏷️ Products by Category</h3>
          {Object.keys(categoryStats).length > 0
            ? <CategoryDoughnutChart categoryStats={categoryStats} />
            : <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(13,13,13,0.35)", fontSize: 13 }}>No category data</div>
          }
        </div>
      </div>

      {/* ── Row 4: Product Approval Status (matching HTML) ── */}
      <div style={as.card}>
        <h3 style={as.cardTitle}>📋 Product Approval Status</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Approved Products", count: approvedProducts,    color: "#1db882", bg: "#e8f9f2", border: "#1db882" },
            { label: "Pending Approval",  count: pendingProductsCount, color: "#d4a017", bg: "#fef9e7", border: "#d4a017" },
          ].map(({ label, count, color, bg, border }) => (
            <div key={label} style={{
              background: bg, borderRadius: 12, padding: "20px 16px",
              textAlign: "center", borderLeft: `4px solid ${border}`,
            }}>
              <div style={{ fontSize: 30, fontWeight: 900, color }}>{count}</div>
              <div style={{ fontSize: 11, color: "rgba(13,13,13,0.5)", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Monthly Revenue Trend (bonus, kept from original) ── */}
      {Object.keys(monthlyRevenue).length > 0 && (
        <div style={as.card}>
          <h3 style={as.cardTitle}>📅 Monthly Revenue (Last 6 Months)</h3>
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
        </div>
      )}

      {/* ── Top Products by Revenue ── */}
      {topProducts.length > 0 && (
        <div style={as.card}>
          <h3 style={as.cardTitle}>🏆 Top 5 Products by Revenue</h3>
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

      {/* ── Secondary KPIs (server-only) ── */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 8 }}>
          {[
            ["📊", "Avg Order Value",  fmt(data.avgOrderValue),                   "#7c3aed"],
            ["⭐", "Avg Rating",       (data.avgRating || 0).toFixed(1) + " / 5", "#d4a017"],
            ["💬", "Total Reviews",    data.totalReviews,                         "#0284c7"],
            ["✅", "Delivered Orders", deliveredOrders,                           "#1db882"],
          ].map(([icon, label, value, color]) => (
            <div key={label} style={as.statCard}>
              <div style={as.statIcon(color)}>{icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0d0d0d", marginBottom: 2 }}>{value}</div>
              <div style={as.statLabel}>{label}</div>
            </div>
          ))}
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
  const [allUsers, setAllUsers] = useState({ customers: [], vendors: [] });
  const [loadingAll, setLoadingAll] = useState(true);
  const [openActivity, setOpenActivity] = useState(null); // userId
  const [activityCache, setActivityCache] = useState({}); // userId -> []
  const [activityLoading, setActivityLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { user }
  const [roleModal, setRoleModal] = useState(null);
  const [roleChanging, setRoleChanging] = useState(false);

  const roleColor = { ADMIN: "#7c3aed", ORDER_MANAGER: "#2563eb", CUSTOMER: "#16a34a" };
  const roleBg    = { ADMIN: "#f5f3ff", ORDER_MANAGER: "#eff6ff", CUSTOMER: "#f0fdf4" };
  const ROLES     = ["CUSTOMER", "ORDER_MANAGER", "ADMIN"];

  // Load all users upfront
  useEffect(() => {
    api("/admin/users").then(d => {
      if (d.success) setAllUsers({ customers: d.customers || [], vendors: d.vendors || [] });
      setLoadingAll(false);
    }).catch(() => setLoadingAll(false));
  }, []);

  // Derived stats
  const totalUsers = allUsers.customers.length + allUsers.vendors.length;
  const verifiedCount = allUsers.customers.filter(c => c.verified).length + allUsers.vendors.filter(v => v.verified).length;

  // Client-side filter
  const filtered = (() => {
    const lq = q.toLowerCase().trim();
    const match = u => !lq || (u.name + u.email + (u.mobile || "")).toLowerCase().includes(lq);
    let results = [];
    if (filter !== "vendors") results.push(...allUsers.customers.filter(match).map(u => ({ ...u, type: "customer" })));
    if (filter !== "customers") results.push(...allUsers.vendors.filter(match).map(u => ({ ...u, type: "vendor" })));
    return results;
  })();

  const toggleActivity = async (userId) => {
    if (openActivity === userId) { setOpenActivity(null); return; }
    setOpenActivity(userId);
    if (activityCache[userId]) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/user-activity/user/${userId}`);
      const actions = await res.json();
      setActivityCache(prev => ({ ...prev, [userId]: Array.isArray(actions) ? actions : [] }));
    } catch {
      setActivityCache(prev => ({ ...prev, [userId]: [] }));
    }
    setActivityLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const { user } = deleteModal;
    const isVendor = user.type === "vendor";
    const path = isVendor ? `/admin/delete-vendor/${user.id}` : `/admin/delete-customer/${user.id}`;
    const d = await api(path, { method: "DELETE" });
    if (d.success) {
      showToast("Account deleted");
      setAllUsers(prev => ({
        customers: isVendor ? prev.customers : prev.customers.filter(c => c.id !== user.id),
        vendors: isVendor ? prev.vendors.filter(v => v.id !== user.id) : prev.vendors,
      }));
    } else showToast(d.message || "Error");
    setDeleteModal(null);
  };

  const confirmRoleChange = async () => {
    if (!roleModal) return;
    setRoleChanging(true);
    try {
      const d = await api(`/admin/users/${roleModal.user.id}/role`, { method: "PATCH", body: JSON.stringify({ role: roleModal.newRole }) });
      if (d.success) {
        setAllUsers(prev => ({ ...prev, customers: prev.customers.map(u => u.id === roleModal.user.id ? { ...u, role: roleModal.newRole } : u) }));
        showToast(`✓ ${roleModal.user.name}'s role set to ${roleModal.newRole}`);
      } else showToast(d.message || "Role update failed");
    } catch { showToast("Role update failed"); }
    setRoleChanging(false);
    setRoleModal(null);
  };

  const inputStyle = { background: "rgba(13,13,13,0.06)", border: "1px solid rgba(13,13,13,0.15)", borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none" };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={as.pageTitle}>Search Users 👥</h2>
        <div style={{ fontSize: 13, color: "rgba(13,13,13,0.45)", marginTop: -16, marginBottom: 4 }}>Find and inspect customer and vendor accounts across the platform.</div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          ["👥", "Total Users", totalUsers, "#d4a017"],
          ["👤", "Customers", allUsers.customers.length, "#2563eb"],
          ["🏪", "Vendors", allUsers.vendors.length, "#10b981"],
          ["✅", "Verified", verifiedCount, "#22c55e"],
        ].map(([icon, label, val, color]) => (
          <div key={label} style={as.statCard}>
            <div style={{ ...as.statIcon(color), marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0d0d0d", marginBottom: 2 }}>{loadingAll ? "…" : val}</div>
            <div style={as.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter Bar */}
      <div style={{ ...as.card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "rgba(13,13,13,0.35)" }}>🔍</span>
          <input
            style={{ ...as.searchInput, paddingLeft: 36 }}
            placeholder="Search by name, email or mobile…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["all","All"],["customers","Customers"],["vendors","Vendors"]].map(([k, l]) => (
            <button key={k} style={{ ...as.filterBtn, ...(filter === k ? as.filterBtnActive : {}) }} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Results Meta */}
      <div style={{ fontSize: 12, color: "rgba(13,13,13,0.4)", marginBottom: 12, fontWeight: 600 }}>
        {q
          ? <>Showing <strong style={{ color: "#d4a017" }}>{filtered.length}</strong> result(s) for "<strong>{q}</strong>"</>
          : <>Showing all <strong style={{ color: "#d4a017" }}>{filtered.length}</strong> users</>
        }
      </div>

      {/* User Cards */}
      {loadingAll ? (
        <div style={as.empty}>Loading users…</div>
      ) : filtered.length === 0 ? (
        <div style={as.empty}>{q ? `No users found matching "${q}"` : "No users registered yet."}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(u => {
            const isVendor = u.type === "vendor";
            const isCustomer = u.type === "customer";
            const currentRole = u.role || "CUSTOMER";
            const activityOpen = openActivity === u.id && isCustomer;
            const acts = activityCache[u.id] || [];

            return (
              <div key={`${u.type}-${u.id}`}>
                {/* Card */}
                <div style={{ ...as.card, display: "flex", alignItems: "center", gap: 14, marginBottom: 0, cursor: "default", transition: "box-shadow 0.2s" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                    background: isVendor ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#3b82f6,#6366f1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 18, color: "#fff"
                  }}>
                    {(u.name || "?")[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{u.name || "Unknown"}</span>
                      <span style={{ ...as.badge, background: isVendor ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)", color: isVendor ? "#10b981" : "#3b82f6", fontSize: 10 }}>
                        {isVendor ? "🏪 Vendor" : "👤 Customer"}
                      </span>
                      <span style={{ ...as.badge, background: u.verified ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: u.verified ? "#1db882" : "#e84c3c", fontSize: 10 }}>
                        {u.verified ? "✓ Verified" : "✗ Unverified"}
                      </span>
                      {isCustomer && (
                        <select
                          style={{ ...as.statusSelect, background: roleBg[currentRole] || "#f2f0eb", color: roleColor[currentRole] || "#0d0d0d", fontWeight: 700, fontSize: 11, padding: "2px 8px" }}
                          value={currentRole}
                          onChange={e => { if (e.target.value !== currentRole) setRoleModal({ user: { ...u, role: currentRole }, newRole: e.target.value }); }}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(13,13,13,0.45)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>✉️ {u.email}</span>
                      {u.mobile && <span>📞 {u.mobile}</span>}
                      {(u.vendorCode || u.deliveryBoyCode) && <span>🔖 {u.vendorCode || u.deliveryBoyCode}</span>}
                    </div>
                  </div>

                  {/* ID */}
                  <span style={{ fontSize: 11, color: "rgba(13,13,13,0.35)", fontWeight: 600, flexShrink: 0 }}>ID #{u.id}</span>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {isCustomer && (
                      <button
                        style={{ ...as.filterBtn, fontSize: 11, padding: "4px 10px", ...(activityOpen ? as.filterBtnActive : {}) }}
                        onClick={() => toggleActivity(u.id)}
                        title="View recent activity"
                      >
                        📈 Activity
                      </button>
                    )}
                    <button
                      style={{ ...as.rejectBtn, fontSize: 11, padding: "4px 10px" }}
                      onClick={() => setDeleteModal({ user: u })}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* Activity Panel */}
                {activityOpen && (
                  <div style={{ background: "rgba(13,13,13,0.04)", borderLeft: "3px solid #d4a017", borderRadius: "0 0 12px 12px", padding: "14px 20px", marginTop: -4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#d4a017", marginBottom: 10 }}>📋 Recent Activity</div>
                    {activityLoading && !activityCache[u.id] ? (
                      <div style={{ fontSize: 12, color: "rgba(13,13,13,0.4)" }}>Loading…</div>
                    ) : acts.length === 0 ? (
                      <div style={{ fontSize: 12, color: "rgba(13,13,13,0.4)" }}>No activity recorded for this user.</div>
                    ) : (
                      acts.slice(0, 20).map((a, i) => {
                        const label = a.actionType ? a.actionType.replace(/_/g, " ") : "Action";
                        let meta = "";
                        try {
                          const m = typeof a.metadata === "string" ? JSON.parse(a.metadata) : a.metadata;
                          if (m?.productName) meta = "— " + m.productName;
                          else if (m?.category) meta = "— " + m.category;
                        } catch { if (a.metadata) meta = "— " + a.metadata; }
                        const time = a.timestamp ? new Date(a.timestamp).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "";
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(13,13,13,0.06)", fontSize: 12 }}>
                            <strong style={{ color: "#0d0d0d", textTransform: "capitalize", flexShrink: 0 }}>{label}</strong>
                            <span style={{ color: "rgba(13,13,13,0.45)", flex: 1 }}>{meta}</span>
                            <time style={{ color: "rgba(13,13,13,0.35)", fontSize: 11, flexShrink: 0 }}>{time}</time>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModal && (
        <div style={modalOverlay} onClick={() => setDeleteModal(null)}>
          <div style={{ ...modalBox, maxWidth: 380, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ef4444", marginBottom: 8 }}>Delete Account?</h3>
            <p style={{ color: "rgba(13,13,13,0.55)", fontSize: 13, marginBottom: 24 }}>
              Permanently delete <strong>{deleteModal.user.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...as.filterBtn, flex: 1, padding: "10px" }} onClick={() => setDeleteModal(null)}>Cancel</button>
              <button style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }} onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleModal && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setRoleModal(null); }}>
          <div style={{ ...modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: roleBg[roleModal.newRole] || "#f2f0eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 16px" }}>
              {roleModal.newRole === "ADMIN" ? "👑" : roleModal.newRole === "ORDER_MANAGER" ? "📋" : "🛍️"}
            </div>
            <h3 style={{ textAlign: "center", margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>
              {roleModal.newRole === "ADMIN" ? "Grant Admin Access?" : roleModal.user.role === "ADMIN" ? "Revoke Admin Access?" : "Change Role?"}
            </h3>
            <p style={{ textAlign: "center", color: "rgba(13,13,13,0.55)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Set <strong>{roleModal.user.name || roleModal.user.email}</strong>'s role from{" "}
              <strong style={{ color: roleColor[roleModal.user.role] }}>{roleModal.user.role}</strong>{" "}
              to <strong style={{ color: roleColor[roleModal.newRole] }}>{roleModal.newRole}</strong>?
              {roleModal.newRole === "ADMIN" && " This grants full platform access."}
              {roleModal.user.role === "ADMIN" && roleModal.newRole !== "ADMIN" && " They will immediately lose admin access."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...as.filterBtn, flex: 1 }} onClick={() => setRoleModal(null)} disabled={roleChanging}>Cancel</button>
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
  const { auth } = useAuth();
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
      const res = await fetch(`/api/react/admin/accounts/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "" } });
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
                {["ID","Name","Email","Mobile","Role","Verified","Status","Total Orders","Last Login","Actions"].map(c => (
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
                  <td style={as.td}>{a.totalOrders ?? 0}</td>
                  <td style={{ ...as.td, fontSize: 12, color: "rgba(13,13,13,0.55)" }}>
                    {a.lastLogin ? new Date(a.lastLogin).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
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
          <div style={{ ...modalBox, maxWidth: 680, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>👤 User Profile</h3>
              <button style={closeBtnStyle} onClick={() => setModal(null)}>✕</button>
            </div>

            {/* Avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#2563eb18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#2563eb", flexShrink: 0 }}>
                {(modal.data.name || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{modal.data.name || "Unknown"}</div>
                <div style={{ color: "rgba(13,13,13,0.5)", fontSize: 13 }}>{modal.data.email}</div>
              </div>
            </div>

            {/* Account Information */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#2563eb", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                ℹ️ Account Information
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Mobile",         modal.data.mobile || "N/A"],
                  ["Role",           modal.data.role || "—"],
                  ["Status",         modal.data.isActive ? "Active" : "Suspended"],
                  ["Last Login",     modal.data.lastLogin ? new Date(modal.data.lastLogin).toLocaleString("en-IN") : "Never"],
                  ["Login Provider", modal.data.provider || "Email/Password"],
                  ["Verified",       modal.data.verified ? "Yes" : "No"],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: "#f2f0eb", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600,
                      color: label === "Status" ? (modal.data.isActive ? "#1db882" : "#e84c3c")
                           : label === "Verified" ? (modal.data.verified ? "#1db882" : "#d4a017")
                           : "inherit"
                    }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Summary */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#2563eb", marginBottom: 10 }}>
                📈 Spending Summary
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Total Orders",       modal.data.totalOrders ?? modal.data.orderCount ?? 0],
                  ["Total Spent",        modal.data.totalSpent != null ? "₹" + Number(modal.data.totalSpent).toLocaleString("en-IN") : "₹0.00"],
                  ["Avg Order Value",    modal.data.averageOrderValue != null ? "₹" + Number(modal.data.averageOrderValue).toFixed(2) : "₹0.00"],
                  ["Wishlist Items",     modal.data.wishlistCount ?? 0],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: "#f2f0eb", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600,
                      color: label === "Total Spent" || label === "Avg Order Value" ? "#d4a017" : "inherit"
                    }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#2563eb", marginBottom: 10 }}>
                🛍 Recent Orders ({modal.data.recentOrders?.length || 0})
              </div>
              {modal.data.recentOrders && modal.data.recentOrders.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                  {modal.data.recentOrders.map(order => (
                    <div key={order.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f2f0eb", borderRadius: 8, padding: "8px 14px", gap: 10 }}>
                      <span style={{ fontSize: 13 }}>Order #{order.id} — {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#d4a017" }}>₹{Number(order.amount || 0).toFixed(2)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: order.status === "Delivered" ? "#e8f9f2" : "#f2f0eb", color: order.status === "Delivered" ? "#1db882" : "#888" }}>
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "rgba(13,13,13,0.4)", padding: "8px 0" }}>No orders found</div>
              )}
            </div>

            {/* Wishlist Items */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#2563eb", marginBottom: 10 }}>
                ❤️ Wishlist Items ({modal.data.wishlistCount || 0})
              </div>
              {modal.data.wishlistItems && modal.data.wishlistItems.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {modal.data.wishlistItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f2f0eb", borderRadius: 8, padding: "8px 14px" }}>
                      <span style={{ fontSize: 13 }}>{item.productName}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#d4a017" }}>₹{Number(item.productPrice || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "rgba(13,13,13,0.4)", padding: "8px 0" }}>No wishlist items</div>
              )}
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: "flex", gap: 10, borderTop: "1px solid rgba(13,13,13,0.1)", paddingTop: 16 }}>
              <button
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(13,13,13,0.15)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                onClick={() => setModal(null)}
              >
                ✕ Close
              </button>
              <button
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: modal.data.isActive ? "#fef2f2" : "#e8f9f2",
                  color: modal.data.isActive ? "#e84c3c" : "#1db882"
                }}
                onClick={() => { toggleStatus(modal.data.id, !modal.data.isActive); setModal(null); }}
              >
                {modal.data.isActive ? "🚫 Deactivate Account" : "✅ Activate Account"}
              </button>
              <button
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                onClick={() => { setModal(null); resetPassword(modal.data.id); }}
              >
                🔑 Reset Password
              </button>
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
  const { auth } = useAuth();
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
      const res = await fetch("/api/react/admin/banners", {
        headers: { "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "" },
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) { setBanners(d.banners || []); setLoading(false); return; }
      }
      show("Failed to load banners");
    } catch { show("Failed to load banners"); }
    setLoading(false);
  };

  useEffect(() => { loadBanners(); }, []);

  const flutterPost = async (path, body) => {
    try {
      const opts = {
        method: "POST",
        headers: { "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "", "Content-Type": "application/json" },
      };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res = await fetch(`/api/react${path}`, opts);
      if (!res.ok) return false;
      const d = await res.json();
      return d.success !== false;
    } catch { return false; }
  };

  const toggleBanner = async (id) => {
    const ok = await flutterPost(`/admin/banners/${id}/toggle`);
    if (ok) { show("Banner updated"); loadBanners(); } else show("Error toggling banner");
  };

  const deleteBanner = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    const ok = await flutterPost(`/admin/banners/${id}/delete`);
    if (ok) { show("Banner deleted"); loadBanners(); } else show("Error deleting banner");
  };

  const toggleHome = async (id) => {
    const ok = await flutterPost(`/admin/banners/${id}/toggle-home`);
    if (ok) loadBanners(); else show("Error updating banner");
  };

  const toggleCustomerHome = async (id) => {
    const ok = await flutterPost(`/admin/banners/${id}/toggle-customer-home`);
    if (ok) loadBanners(); else show("Error updating banner");
  };

  // ── Upload tab state ──────────────────────────────────────────────
  const [addTab, setAddTab] = useState("upload"); // "upload" | "url"
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);

  // ── Bulk CSV state ─────────────────────────────────────────────────
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null); // null | { pct, msg, error, created, updated, errors }
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkVendorId, setBulkVendorId] = useState("");
  const [bulkAutoApprove, setBulkAutoApprove] = useState(true);
  const [bulkPreviewHeaders, setBulkPreviewHeaders] = useState([]);
  const [bulkPreviewRows, setBulkPreviewRows] = useState([]);
  const [bulkVendors, setBulkVendors] = useState([]);
  const [bulkRowErrors, setBulkRowErrors] = useState([]);

  const handleImageFile = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const addBanner = async () => {
    if (!form.title.trim()) { show("Banner title is required"); return; }

    setSaving(true);

    if (addTab === "upload") {
      // ── File upload path ──────────────────────────────────────────
      if (!imageFile) { show("Please select an image file"); setSaving(false); return; }
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("imageFile", imageFile);
      if (form.linkUrl.trim()) fd.append("linkUrl", form.linkUrl.trim());
      setUploading(true);
      try {
        const res = await fetch("/api/react/admin/banners/add-upload", {
          method: "POST",
          headers: { "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "" },
          body: fd,
        });
        const d = await res.json();
        if (d.success) {
          show("Banner added ✓");
          setForm({ title: "", imageUrl: "", linkUrl: "" });
          setImageFile(null); setImagePreview("");
          setShowAddForm(false); loadBanners();
        } else show(d.message || "Failed to add banner");
      } catch { show("Upload failed"); }
      setUploading(false);
    } else {
      // ── Paste URL path ────────────────────────────────────────────
      if (!form.imageUrl.trim()) { show("Image URL is required"); setSaving(false); return; }
      const ok = await flutterPost("/admin/banners/add", { title: form.title.trim(), imageUrl: form.imageUrl.trim(), linkUrl: form.linkUrl.trim() });
      if (ok) { show("Banner added ✓"); setForm({ title: "", imageUrl: "", linkUrl: "" }); setShowAddForm(false); loadBanners(); }
      else show("Failed to add banner");
    }
    setSaving(false);
  };

  // ── Bulk CSV upload ────────────────────────────────────────────────
  // Load vendors on mount for the vendor selector
  useEffect(() => {
    fetch("/api/react/admin/vendors", { headers: { "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "" } })
      .then(r => r.json()).then(d => { if (d.success) setBulkVendors(d.vendors || []); }).catch(() => {});
  }, []);

  const parseCsvFrontend = (text) => {
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
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(l => {
      const vals = parseLine(l); const o = {};
      headers.forEach((h, i) => o[h] = vals[i] ?? "");
      return o;
    });
    return { headers, rows };
  };

  const handleBulkFileChange = (file) => {
    setBulkFile(file || null);
    setBulkProgress(null);
    setBulkRowErrors([]);
    setBulkPreviewHeaders([]);
    setBulkPreviewRows([]);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCsvFrontend(e.target.result);
      setBulkPreviewHeaders(headers);
      setBulkPreviewRows(rows.slice(0, 10));
      // Client-side validation
      const REQUIRED = ["name", "price"];
      const rowErrs = [];
      rows.forEach((row, i) => {
        const missing = REQUIRED.filter(col => !row[col] && !row[col.charAt(0).toUpperCase() + col.slice(1)]);
        if (missing.length) rowErrs.push(`Row ${i+2}: missing ${missing.join(", ")}`);
      });
      setBulkRowErrors(rowErrs);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (!bulkFile) { show("Please select a CSV file"); return; }
    if (bulkRowErrors.length > 0) { show("Fix validation errors before uploading"); return; }
    setBulkUploading(true);
    setBulkProgress({ pct: 30, msg: "Uploading to server…", error: false });
    const fd = new FormData();
    fd.append("file", bulkFile);
    if (bulkVendorId) fd.append("vendorId", bulkVendorId);
    fd.append("autoApprove", String(bulkAutoApprove));
    try {
      const res = await fetch("/api/react/admin/products/upload-csv", {
        method: "POST",
        headers: { "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "" },
        body: fd,
      });
      const d = await res.json();
      if (d.success) {
        setBulkProgress({ pct: 100, msg: d.message || "Import complete!", error: false, created: d.created, updated: d.updated, errors: d.errors || [] });
        show(`✓ ${d.created || 0} created, ${d.updated || 0} updated`);
        setBulkFile(null); setBulkPreviewHeaders([]); setBulkPreviewRows([]); setBulkRowErrors([]);
      } else {
        setBulkProgress({ pct: 0, msg: d.message || "Upload failed.", error: true });
      }
    } catch { setBulkProgress({ pct: 0, msg: "Network error. Please try again.", error: true }); }
    setBulkUploading(false);
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    const ok = await flutterPost(`/admin/banners/${editModal.id}/update`, { title: editModal.title, imageUrl: editModal.imageUrl, linkUrl: editModal.linkUrl || "" });
    if (ok) { show("Banner updated ✓"); setEditModal(null); loadBanners(); }
    else show("Failed to update banner");
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

          {/* Tab switcher: Upload Image vs Paste URL */}
          <div style={{ display: "flex", gap: 0, marginBottom: 18, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
            {[["upload","⬆ Upload Image"],["url","🔗 Paste URL"]].map(([key, label]) => (
              <button key={key} type="button"
                style={{ padding: "7px 18px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit",
                  background: addTab === key ? "#f5a800" : "transparent",
                  color: addTab === key ? "#1a1000" : "rgba(255,255,255,0.45)",
                  transition: "all 0.2s" }}
                onClick={() => setAddTab(key)}>
                {label}
              </button>
            ))}
          </div>

          {/* Upload Image tab */}
          {addTab === "upload" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={as.label}>Banner Title *</label>
                <input style={as.inputFull} placeholder="e.g. Summer Sale 50% Off"
                  value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} />
              </div>
              <div>
                <label style={as.label}>Banner Image *</label>
                <input type="file" accept="image/*"
                  style={{ width: "100%", padding: "7px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontSize: 12 }}
                  onChange={e => handleImageFile(e.target.files[0])} />
                {imagePreview && (
                  <img src={imagePreview} alt="preview"
                    style={{ marginTop: 8, height: 64, borderRadius: 7, objectFit: "cover", border: "1px solid rgba(255,255,255,0.15)" }} />
                )}
              </div>
              <div>
                <label style={as.label}>Link URL (Optional)</label>
                <input style={as.inputFull} placeholder="https://ekart.com/sale"
                  value={form.linkUrl} onChange={e => setForm(v => ({ ...v, linkUrl: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Paste URL tab */}
          {addTab === "url" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
              {[
                { key: "title",    label: "Banner Title *",   placeholder: "e.g. Summer Sale" },
                { key: "imageUrl", label: "Image URL *",      placeholder: "https://res.cloudinary.com/..." },
                { key: "linkUrl",  label: "Link URL",         placeholder: "https://ekart.com/sale" },
              ].map(f => (
                <div key={f.key}>
                  <label style={as.label}>{f.label}</label>
                  <input style={as.inputFull} placeholder={f.placeholder}
                    value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                </div>
              ))}
              {form.imageUrl && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <img src={form.imageUrl} alt="preview"
                    style={{ height: 72, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.15)" }}
                    onError={e => e.target.style.display = "none"} />
                </div>
              )}
            </div>
          )}

          <button
            style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: "#f5a800", color: "#1a1000", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: (saving || uploading) ? 0.6 : 1 }}
            onClick={addBanner} disabled={saving || uploading}>
            {uploading ? "☁ Uploading to Cloudinary…" : saving ? "Adding…" : addTab === "upload" ? "☁ Upload & Add Banner" : "＋ Add Banner"}
          </button>
        </div>
      )}

      {/* Bulk Product Induction */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e4dc", padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ ...as.cardTitle, marginBottom: 0 }}>📄 Bulk Product Import (CSV)</h3>
          <a
            href={"data:text/csv;charset=utf-8," + encodeURIComponent("id,name,description,price,mrp,category,stock,imageLink,stockAlertThreshold,gstRate,approved\nAKAL001,Sample Product,A great product description,499,999,Electronics,50,https://example.com/img.jpg,10,18,true")}
            download="product-import-template.csv"
            style={{ fontSize: 12, color: "#0d0d0d", textDecoration: "none", background: "#f2f0eb", padding: "5px 12px", borderRadius: 7, fontWeight: 600 }}
          >⬇ Download Template</a>
        </div>
        <p style={{ fontSize: 13, color: "rgba(13,13,13,0.5)", marginBottom: 18, lineHeight: 1.5 }}>
          Required columns: <strong style={{ color: "#0d0d0d" }}>name, price</strong>. Optional: id (update existing), description, mrp, category, stock, imageLink, stockAlertThreshold, gstRate, approved.
        </p>

        {/* Controls row */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          {/* File picker */}
          <div>
            <label style={as.label}>CSV File *</label>
            <input type="file" accept=".csv,text/csv"
              style={{ width: "100%", padding: "8px", borderRadius: 9, border: "1px solid #e8e4dc", background: "#fafaf8", color: "#0d0d0d", cursor: "pointer", fontSize: 12, boxSizing: "border-box" }}
              onChange={e => handleBulkFileChange(e.target.files[0])} />
          </div>

          {/* Vendor selector */}
          <div>
            <label style={as.label}>Assign to Vendor (optional)</label>
            <select
              style={{ ...as.statusSelect, width: "100%", padding: "9px 10px" }}
              value={bulkVendorId}
              onChange={e => setBulkVendorId(e.target.value)}
            >
              <option value="">— No vendor (platform) —</option>
              {bulkVendors.map(v => (
                <option key={v.id} value={v.id}>{v.name || v.email || `Vendor #${v.id}`}</option>
              ))}
            </select>
          </div>

          {/* Auto-approve toggle */}
          <div>
            <label style={as.label}>Auto-Approve</label>
            <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
              {[["true","Yes — go live"],["false","No — pending"]].map(([val, label]) => (
                <button key={val} type="button"
                  style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: `1px solid ${String(bulkAutoApprove) === val ? "#0d0d0d" : "#e8e4dc"}`, background: String(bulkAutoApprove) === val ? "#0d0d0d" : "transparent", color: String(bulkAutoApprove) === val ? "#fff" : "rgba(13,13,13,0.5)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                  onClick={() => setBulkAutoApprove(val === "true")}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Upload button */}
          <button
            style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "#1db882", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", opacity: (!bulkFile || bulkUploading || bulkRowErrors.length > 0) ? 0.45 : 1, alignSelf: "flex-end" }}
            onClick={handleBulkSubmit} disabled={!bulkFile || bulkUploading || bulkRowErrors.length > 0}
          >
            {bulkUploading ? "⏳ Importing…" : "⬆ Import CSV"}
          </button>
        </div>

        {/* Client-side validation errors */}
        {bulkRowErrors.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e84c3c", marginBottom: 6 }}>⚠ {bulkRowErrors.length} validation error{bulkRowErrors.length !== 1 ? "s" : ""} — fix before uploading</div>
            {bulkRowErrors.slice(0, 5).map((e, i) => <div key={i} style={{ fontSize: 12, color: "#dc2626" }}>• {e}</div>)}
            {bulkRowErrors.length > 5 && <div style={{ fontSize: 12, color: "#dc2626" }}>…and {bulkRowErrors.length - 5} more</div>}
          </div>
        )}

        {/* CSV Preview table */}
        {bulkPreviewHeaders.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(13,13,13,0.4)", marginBottom: 8 }}>
              Preview — first {bulkPreviewRows.length} rows
            </div>
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e8e4dc" }}>
              <table style={{ ...as.table, minWidth: "auto" }}>
                <thead style={as.thead}>
                  <tr>{bulkPreviewHeaders.map((h, i) => <th key={i} style={as.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {bulkPreviewRows.map((row, ri) => (
                    <tr key={ri} style={as.tr}>
                      {bulkPreviewHeaders.map((h, ci) => (
                        <td key={ci} style={{ ...as.td, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[h] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Progress / result */}
        {bulkProgress && (
          <div style={{ marginTop: 4 }}>
            <div style={{ background: "#f2f0eb", borderRadius: 6, overflow: "hidden", height: 6, marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${bulkProgress.pct}%`, background: bulkProgress.error ? "#e84c3c" : "#1db882", transition: "width 0.4s" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: bulkProgress.error ? "#e84c3c" : "#1db882", marginBottom: bulkProgress.errors?.length ? 8 : 0 }}>
              {bulkProgress.msg}
              {!bulkProgress.error && bulkProgress.created != null && (
                <span style={{ marginLeft: 10, fontWeight: 400, color: "rgba(13,13,13,0.5)", fontSize: 12 }}>
                  {bulkProgress.created} created · {bulkProgress.updated} updated
                </span>
              )}
            </div>
            {bulkProgress.errors?.length > 0 && (
              <div style={{ background: "#fef9e7", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#d4a017", marginBottom: 6 }}>Row errors ({bulkProgress.errors.length})</div>
                {bulkProgress.errors.slice(0, 8).map((e, i) => <div key={i} style={{ fontSize: 12, color: "#92400e" }}>• {e}</div>)}
                {bulkProgress.errors.length > 8 && <div style={{ fontSize: 12, color: "#92400e" }}>…and {bulkProgress.errors.length - 8} more</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Banners Table */}
      {loading ? (
        <div style={as.empty}>Loading banners…</div>
      ) : banners.length === 0 ? (
        <div style={as.empty}>No banners found. Click <strong>+ Add Banner</strong> above to create your first one.</div>
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

/* ── Category Admin ── */
function CategoryAdmin({ categories, api, showToast, onRefresh }) {
  const EMOJI_SUGGESTIONS = ["📦","🍕","👗","💻","📱","🏠","📚","🧸","⚽","💄","🛒","🎮","🌿","💊","🐾","🚗","✈️","🎵","🖼️","🔧","🍔","🥦","👟","💍","🎁"];

  const [addParentForm, setAddParentForm] = useState({ name: "", emoji: "📦", displayOrder: "0" });
  const [addSubForm,    setAddSubForm]    = useState({ parentId: "", name: "", emoji: "", displayOrder: "0" });
  const [editItem,      setEditItem]      = useState(null); // { id, name, emoji, displayOrder }
  const [expandedId,    setExpandedId]    = useState(null);
  const [loading,       setLoading]       = useState(false);

  const call = async (path, body) => {
    setLoading(true);
    const d = await api(path, { method: "POST", body: JSON.stringify(body) });
    setLoading(false);
    if (d.success) { showToast(d.message || "Saved ✓"); onRefresh(); }
    else showToast("❌ " + (d.message || "Error"));
    return d;
  };

  const handleAddParent = async () => {
    if (!addParentForm.name.trim()) { showToast("Name is required"); return; }
    const d = await call("/admin/categories/parent", { name: addParentForm.name.trim(), emoji: addParentForm.emoji, displayOrder: parseInt(addParentForm.displayOrder) || 0 });
    if (d.success) setAddParentForm({ name: "", emoji: "📦", displayOrder: "0" });
  };

  const handleAddSub = async () => {
    if (!addSubForm.parentId) { showToast("Select a parent category"); return; }
    if (!addSubForm.name.trim()) { showToast("Name is required"); return; }
    const d = await call("/admin/categories/sub", { parentId: parseInt(addSubForm.parentId), name: addSubForm.name.trim(), emoji: addSubForm.emoji, displayOrder: parseInt(addSubForm.displayOrder) || 0 });
    if (d.success) setAddSubForm({ parentId: addSubForm.parentId, name: "", emoji: "", displayOrder: "0" });
  };

  const handleUpdate = async () => {
    if (!editItem || !editItem.name.trim()) { showToast("Name is required"); return; }
    await call(`/admin/categories/${editItem.id}/update`, { name: editItem.name.trim(), emoji: editItem.emoji, displayOrder: parseInt(editItem.displayOrder) || 0 });
    setEditItem(null);
  };

  const handleDelete = async (id, name, hasChildren) => {
    const msg = hasChildren ? `Delete "${name}" and ALL its sub-categories? This cannot be undone.` : `Delete "${name}"?`;
    if (!window.confirm(msg)) return;
    await call(`/admin/categories/${id}/delete`, {});
  };

  const inp  = { background: "rgba(13,13,13,0.05)", border: "1px solid rgba(13,13,13,0.15)", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" };
  const btn  = { padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" };
  const card = { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: 20, marginBottom: 16 };

  return (
    <div>
      <h2 style={as.pageTitle}>Category Management 🗂️</h2>

      {/* ── Add Parent Category ── */}
      <div style={{ ...card, background: "#fffbeb", border: "1px solid rgba(245,168,0,0.3)", marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>➕ New Parent Category</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, color: "rgba(13,13,13,0.5)" }}>Emoji</div>
            <input style={{ ...inp, width: 54, textAlign: "center", fontSize: 22 }} value={addParentForm.emoji}
              onChange={e => setAddParentForm(f => ({ ...f, emoji: e.target.value }))} maxLength={4} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, color: "rgba(13,13,13,0.5)" }}>Category Name</div>
            <input style={{ ...inp, width: "100%", boxSizing: "border-box" }} placeholder="e.g. Food & Beverages"
              value={addParentForm.name} onChange={e => setAddParentForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAddParent()} />
          </div>
          <div style={{ width: 70 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, color: "rgba(13,13,13,0.5)" }}>Order</div>
            <input style={{ ...inp, width: "100%", boxSizing: "border-box" }} type="number" value={addParentForm.displayOrder}
              onChange={e => setAddParentForm(f => ({ ...f, displayOrder: e.target.value }))} />
          </div>
          <button style={{ ...btn, background: "#0d0d0d", color: "#fff" }} onClick={handleAddParent} disabled={loading}>
            {loading ? "…" : "Add Category"}
          </button>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMOJI_SUGGESTIONS.map(e => (
            <button key={e} style={{ background: addParentForm.emoji === e ? "#0d0d0d" : "rgba(13,13,13,0.06)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 18 }}
              onClick={() => setAddParentForm(f => ({ ...f, emoji: e }))}>{e}</button>
          ))}
        </div>
      </div>

      {/* ── Add Sub-Category ── */}
      {categories.length > 0 && (
        <div style={{ ...card, background: "#f0fdf4", border: "1px solid rgba(29,184,130,0.3)", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>➕ New Sub-Category</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "0 0 200px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, color: "rgba(13,13,13,0.5)" }}>Parent Category</div>
              <select style={{ ...inp, width: "100%", boxSizing: "border-box" }} value={addSubForm.parentId}
                onChange={e => setAddSubForm(f => ({ ...f, parentId: e.target.value }))}>
                <option value="">Select parent…</option>
                {categories.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, color: "rgba(13,13,13,0.5)" }}>Emoji</div>
              <input style={{ ...inp, width: 54, textAlign: "center", fontSize: 22 }} value={addSubForm.emoji}
                onChange={e => setAddSubForm(f => ({ ...f, emoji: e.target.value }))} maxLength={4} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, color: "rgba(13,13,13,0.5)" }}>Sub-Category Name</div>
              <input style={{ ...inp, width: "100%", boxSizing: "border-box" }} placeholder="e.g. Chips"
                value={addSubForm.name} onChange={e => setAddSubForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleAddSub()} />
            </div>
            <div style={{ width: 70 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, color: "rgba(13,13,13,0.5)" }}>Order</div>
              <input style={{ ...inp, width: "100%", boxSizing: "border-box" }} type="number" value={addSubForm.displayOrder}
                onChange={e => setAddSubForm(f => ({ ...f, displayOrder: e.target.value }))} />
            </div>
            <button style={{ ...btn, background: "#1db882", color: "#fff" }} onClick={handleAddSub} disabled={loading}>
              {loading ? "…" : "Add Sub"}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 420, width: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 18 }}>✏️ Edit Category</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "rgba(13,13,13,0.5)" }}>Emoji</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input style={{ ...inp, width: 64, textAlign: "center", fontSize: 24 }} value={editItem.emoji}
                  onChange={e => setEditItem(i => ({ ...i, emoji: e.target.value }))} maxLength={4} />
                <span style={{ fontSize: 13, color: "rgba(13,13,13,0.45)" }}>← type or pick below</span>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {EMOJI_SUGGESTIONS.map(e => (
                  <button key={e} style={{ background: editItem.emoji === e ? "#0d0d0d" : "rgba(13,13,13,0.06)", border: "none", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 16 }}
                    onClick={() => setEditItem(i => ({ ...i, emoji: e }))}>{e}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "rgba(13,13,13,0.5)" }}>Name</div>
              <input style={{ ...inp, width: "100%", boxSizing: "border-box" }} value={editItem.name}
                onChange={e => setEditItem(i => ({ ...i, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "rgba(13,13,13,0.5)" }}>Display Order</div>
              <input style={{ ...inp, width: 100 }} type="number" value={editItem.displayOrder}
                onChange={e => setEditItem(i => ({ ...i, displayOrder: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btn, background: "#e84c3c", color: "#fff", flex: 1 }} onClick={handleUpdate}>Save Changes</button>
              <button style={{ ...btn, background: "rgba(13,13,13,0.08)", color: "#0d0d0d" }} onClick={() => setEditItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Tree ── */}
      {categories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(13,13,13,0.4)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>No categories yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Add a parent category above to get started.</div>
        </div>
      ) : (
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 14, color: "rgba(13,13,13,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {categories.length} Parent {categories.length === 1 ? "Category" : "Categories"} · {categories.reduce((n, c) => n + (c.subCategories?.length || 0), 0)} Sub-Categories
          </div>
          {categories.map(parent => (
            <div key={parent.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
              {/* Parent row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: expandedId === parent.id ? "#fafaf8" : "#fff" }}
                onClick={() => setExpandedId(expandedId === parent.id ? null : parent.id)}>
                <span style={{ fontSize: 26 }}>{parent.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{parent.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(13,13,13,0.45)", marginTop: 2 }}>
                    {parent.subCategories?.length || 0} sub-categories · order {parent.displayOrder}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button style={{ ...btn, background: "rgba(13,13,13,0.08)", color: "#0d0d0d", padding: "5px 12px" }}
                    onClick={e => { e.stopPropagation(); setEditItem({ id: parent.id, name: parent.name, emoji: parent.emoji || "📦", displayOrder: parent.displayOrder }); }}>
                    ✏️ Edit
                  </button>
                  <button style={{ ...btn, background: "rgba(232,76,60,0.1)", color: "#e84c3c", padding: "5px 12px" }}
                    onClick={e => { e.stopPropagation(); handleDelete(parent.id, parent.name, (parent.subCategories?.length || 0) > 0); }}>
                    🗑️
                  </button>
                  <span style={{ color: "rgba(13,13,13,0.3)", fontSize: 14, transition: "transform 0.2s", display: "inline-block", transform: expandedId === parent.id ? "rotate(90deg)" : "rotate(0)" }}>›</span>
                </div>
              </div>

              {/* Sub-categories */}
              {expandedId === parent.id && (
                <div style={{ borderTop: "1px solid #f0ede8", background: "#fafaf8" }}>
                  {(parent.subCategories || []).length === 0 ? (
                    <div style={{ padding: "12px 20px 12px 60px", fontSize: 13, color: "rgba(13,13,13,0.4)", fontStyle: "italic" }}>No sub-categories yet.</div>
                  ) : (
                    (parent.subCategories || []).map(sub => (
                      <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px 10px 56px", borderBottom: "1px solid rgba(13,13,13,0.05)" }}>
                        <span style={{ fontSize: 18, minWidth: 24 }}>{sub.emoji || "—"}</span>
                        <div style={{ flex: 1, fontSize: 14 }}>{sub.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(13,13,13,0.4)" }}>order {sub.displayOrder}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...btn, background: "rgba(13,13,13,0.06)", color: "#0d0d0d", padding: "4px 10px", fontSize: 12 }}
                            onClick={() => setEditItem({ id: sub.id, name: sub.name, emoji: sub.emoji || "", displayOrder: sub.displayOrder })}>
                            ✏️
                          </button>
                          <button style={{ ...btn, background: "rgba(232,76,60,0.08)", color: "#e84c3c", padding: "4px 10px", fontSize: 12 }}
                            onClick={() => handleDelete(sub.id, sub.name, false)}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Security Admin ── */
function SecurityAdmin() {
  const { auth } = useAuth();
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

  // ── Fetch all users on mount — uses /api/react/admin/users (JWT, returns role field) ──
  useEffect(() => {
    (async () => {
      setUsersLoading(true);
      try {
        const res = await fetch("/api/react/admin/users", {
          headers: { "Authorization": `Bearer ${auth?.token || ""}`, "X-Admin-Email": auth?.email || "" },
        });
        const d = await res.json();
        // /api/react/admin/users returns { success, customers: [...], vendors: [...] }
        // Merge both arrays so vendors appear in the role-management table too.
        if (d.success) setUsers([...(d.customers || []), ...(d.vendors || [])]);
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
      const res = await fetch("/api/react/admin/change-password", {
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

  // ── Role change (confirmed) — uses /api/react/admin/users/{id}/role (JWT) ──
  const confirmRoleChange = async () => {
    if (!roleModal) return;
    setRoleChanging(true);
    try {
      const res = await fetch(`/api/react/admin/users/${roleModal.user.id}/role`, {
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