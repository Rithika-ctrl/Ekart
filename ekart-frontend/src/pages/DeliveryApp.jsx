import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { apiFetch, API_BASE } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN");

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  .d-root{min-height:100vh;background:#fafaf8;font-family:'DM Sans',sans-serif;color:#0d0d0d}
  .d-nav{background:#fff;border-bottom:1px solid #e8e4dc;padding:0 24px;display:flex;align-items:center;gap:16px;height:64px;position:sticky;top:0;z-index:100}
  .d-logo{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#0d0d0d;letter-spacing:-0.5px}
  .d-logo span{color:#e84c3c}
  .d-navlinks{display:flex;gap:2px;flex:1}
  .d-navbtn{padding:7px 14px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:rgba(13,13,13,0.5);transition:all 200ms;white-space:nowrap}
  .d-navbtn.active{background:#0d0d0d;color:#fff}
  .d-logout{padding:7px 16px;border-radius:8px;border:1px solid #e8e4dc;background:transparent;color:#e84c3c;cursor:pointer;font-size:13px;font-weight:600}
  .d-main{max-width:900px;margin:0 auto;padding:32px 24px}
  .d-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.5px;margin-bottom:24px}
  .d-card{background:#fff;border:1px solid #e8e4dc;border-radius:14px;padding:20px;margin-bottom:14px}
  .d-badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:50px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
  .badge-yellow{background:#fef9e7;color:#d4a017}
  .badge-blue{background:#eff6ff;color:#2563eb}
  .badge-green{background:#e8f9f2;color:#1db882}
  .badge-red{background:#fef2f2;color:#e84c3c}
  .btn-primary{padding:10px 20px;border-radius:10px;border:none;background:#e84c3c;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all 200ms}
  .btn-primary:hover{background:#c73e2e}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed}
  .btn-success{padding:10px 20px;border-radius:10px;border:none;background:#1db882;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer}
  .btn-ghost{padding:8px 16px;border-radius:8px;border:1px solid #e8e4dc;background:transparent;color:#0d0d0d;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer}
  .d-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
  .d-stat{background:#fff;border:1px solid #e8e4dc;border-radius:14px;padding:20px}
  .d-stat-val{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;margin-bottom:4px}
  .d-stat-label{font-size:13px;color:rgba(13,13,13,0.55)}
  .d-otp-row{display:flex;gap:10px;justify-content:center;margin:16px 0}
  .d-otp-inp{width:46px;height:54px;text-align:center;font-size:22px;font-weight:700;border-radius:10px;border:2px solid #e8e4dc;background:#fafaf8;font-family:'Syne',sans-serif;outline:none}
  .d-otp-inp:focus{border-color:#0d0d0d}
  .d-form-input{width:100%;padding:11px 14px;border:2px solid #e8e4dc;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:15px;outline:none;background:#fafaf8;box-sizing:border-box}
  .d-form-input:focus{border-color:#0d0d0d}
  .d-empty{text-align:center;padding:60px 20px;color:rgba(13,13,13,0.4)}
  .d-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0d0d0d;color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;z-index:999;animation:toastIn .3s ease}
  @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
`;

function Toast({ msg, onHide }) {
  useEffect(() => { if (msg) { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return <div className="d-toast">{msg}</div>;
}

export default function DeliveryApp() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive current page from URL: /delivery/:page → page, default "dashboard"
  const page = location.pathname.replace(/^\/delivery\/?/, "").split("/")[0] || "dashboard";
  const setPage = (p) => navigate(`/delivery/${p}`);
  const [profile, setProfile] = useState(null);
  const [toPickUp, setToPickUp] = useState([]);
  const [outNow, setOutNow] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [otpModal, setOtpModal] = useState(null);
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const [transferModal, setTransferModal] = useState(false);
  const [warehouseList, setWarehouseList] = useState([]);
  const [selectedWh, setSelectedWh] = useState("");

  const api = useCallback((path, opts) => apiFetch(path, opts, auth), [auth]);
  const show = m => setToast(m);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([
        api("/delivery/profile"),
        api("/delivery/orders"),
      ]);
      if (p?.success) setProfile(p.deliveryBoy);
      if (o?.success) {
        setToPickUp(o.toPickUp || []);
        setOutNow(o.outForDelivery || []);
        setDelivered(o.delivered || []);
      }
    } catch { show("Failed to load data"); }
    setLoading(false);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const markPickedUp = async (orderId) => {
    const d = await api(`/delivery/orders/${orderId}/pickup`, { method: "POST" });
    if (d?.success) { show("Marked as picked up ✓"); load(); } else show(d?.message || "Error");
  };

  const openDeliverModal = async (order) => {
    setOtpModal(order);
    setOtpDigits(["","","","","",""]);
  };

  const submitDeliveryOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 4) { show("Enter the OTP"); return; }
    const d = await api(`/delivery/orders/${otpModal.id}/deliver`, { method: "POST", body: JSON.stringify({ otp: code }) });
    if (d?.success) { show("Delivery confirmed! 🎉"); setOtpModal(null); load(); } else show(d?.message || "Invalid OTP");
  };

  const loadWarehouses = async () => {
    const d = await api("/delivery/warehouses");
    if (d?.success) setWarehouseList(d.warehouses || []);
  };

  const requestTransfer = async () => {
    if (!selectedWh) { show("Select a warehouse"); return; }
    const d = await api("/delivery/transfer-request", { method: "POST", body: JSON.stringify({ warehouseId: selectedWh }) });
    if (d?.success) { show("Transfer request submitted!"); setTransferModal(false); load(); } else show(d?.message || "Error");
  };

  const tabs = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "pickup",    label: `📦 Pick Up${toPickUp.length > 0 ? ` (${toPickUp.length})` : ""}` },
    { key: "delivery",  label: `🛵 Out for Delivery${outNow.length > 0 ? ` (${outNow.length})` : ""}` },
    { key: "history",   label: "✅ History" },
    { key: "profile",   label: "👤 Profile" },
  ];

  const OrderCard = ({ order, mode }) => (
    <div className="d-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>Order #{order.id}</div>
          <div style={{ fontSize: 13, color: "rgba(13,13,13,0.5)", marginTop: 2 }}>
            {order.customer?.name || order.customerName} · {order.customer?.mobile || order.mobile}
          </div>
        </div>
        <span className={`d-badge ${mode === "pickup" ? "badge-yellow" : mode === "delivery" ? "badge-blue" : "badge-green"}`}>
          {mode === "pickup" ? "To Pick Up" : mode === "delivery" ? "Out for Delivery" : "Delivered"}
        </span>
      </div>
      {order.deliveryAddress && (
        <div style={{ fontSize: 13, color: "rgba(13,13,13,0.6)", marginBottom: 12, display: "flex", gap: 6 }}>
          <span>📍</span><span>{order.deliveryAddress}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {(order.items || []).map((item, i) => (
          <span key={i} style={{ background: "#f2f0eb", padding: "4px 10px", borderRadius: 6, fontSize: 12 }}>
            {item.name} × {item.quantity}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18 }}>{fmt(order.amount || order.totalPrice)}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {mode === "pickup" && (
            <button className="btn-primary" onClick={() => markPickedUp(order.id)}>✓ Picked Up</button>
          )}
          {mode === "delivery" && (
            <button className="btn-success" onClick={() => openDeliverModal(order)}>🎯 Deliver (OTP)</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{S}</style>
      <div className="d-root">
        <Toast msg={toast} onHide={() => setToast("")} />
        <nav className="d-nav">
          <div className="d-logo">e<span>kart</span> Delivery</div>
          <div className="d-navlinks">
            {tabs.map(t => (
              <button key={t.key} className={`d-navbtn${page === t.key ? " active" : ""}`} onClick={() => setPage(t.key)}>{t.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "rgba(13,13,13,0.5)" }}>{auth.email}</span>
            <button className="d-logout" onClick={() => { logout(); navigate("/auth", { replace: true }); }}>Logout</button>
          </div>
        </nav>

        <main className="d-main">
          {loading && page === "dashboard" && <div className="d-empty">Loading...</div>}

          {/* Pending Approval Guard */}
          {profile && !profile.approved && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                Pending Admin Approval
              </div>
              <div style={{ fontSize: 14, color: "rgba(13,13,13,0.55)", maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>
                Your account has been verified but is awaiting admin review.
                You'll receive an email at <strong>{profile.email}</strong> once approved.
              </div>
              <div style={{ background: "#fffbeb", border: "1.5px solid #f6d860", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#92610a", maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.6, textAlign: "left" }}>
                <strong>What happens next?</strong><br />
                1. Admin reviews your application 🔍<br />
                2. Admin assigns your warehouse &amp; pin codes 📦<br />
                3. You receive an approval email ✉️<br />
                4. You can then start accepting deliveries 🛵
              </div>
              <button className="d-logout" style={{ margin: "0 auto" }} onClick={() => { logout(); navigate("/auth", { replace: true }); }}>
                Logout
              </button>
            </div>
          )}

          {/* Dashboard */}
          {page === "dashboard" && !loading && profile?.approved && (
            <div>
              <div className="d-title">Hello, {profile?.name || "Delivery Partner"} 👋</div>

              {profile?.warehouse && (
                <div className="d-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(13,13,13,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Your Warehouse</div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18 }}>{profile.warehouse.name}</div>
                    <div style={{ fontSize: 14, color: "rgba(13,13,13,0.55)" }}>{profile.warehouse.city}, {profile.warehouse.state}</div>
                    <div style={{ fontSize: 12, color: "rgba(13,13,13,0.4)", marginTop: 4 }}>Code: {profile.warehouse.warehouseCode} · Pins: {profile.assignedPinCodes || "All"}</div>
                  </div>
                  <button className="btn-ghost" onClick={async () => { setTransferModal(true); await loadWarehouses(); }}>Request Transfer</button>
                </div>
              )}

              <div className="d-stat-grid">
                {[
                  { label: "To Pick Up",        value: toPickUp.length,  color: "#d4a017" },
                  { label: "Out for Delivery",   value: outNow.length,    color: "#2563eb" },
                  { label: "Delivered Today",    value: delivered.length, color: "#1db882" },
                ].map(s => (
                  <div key={s.label} className="d-stat">
                    <div className="d-stat-val" style={{ color: s.color }}>{s.value}</div>
                    <div className="d-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {toPickUp.length > 0 && (
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 14, color: "#d4a017" }}>
                    📦 Ready to Pick Up ({toPickUp.length})
                  </div>
                  {toPickUp.slice(0, 3).map(o => <OrderCard key={o.id} order={o} mode="pickup" />)}
                </div>
              )}
              {outNow.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 14, color: "#2563eb" }}>
                    🛵 Out for Delivery ({outNow.length})
                  </div>
                  {outNow.slice(0, 3).map(o => <OrderCard key={o.id} order={o} mode="delivery" />)}
                </div>
              )}
              {toPickUp.length === 0 && outNow.length === 0 && (
                <div className="d-empty">
                  <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>All clear!</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>No pending orders right now.</div>
                </div>
              )}
            </div>
          )}

          {/* Pick Up */}
          {page === "pickup" && profile?.approved && (
            <div>
              <div className="d-title">Pick Up from Warehouse 📦</div>
              {toPickUp.length === 0 ? <div className="d-empty"><div style={{ fontSize: 48 }}>📦</div><div>No orders to pick up</div></div>
                : toPickUp.map(o => <OrderCard key={o.id} order={o} mode="pickup" />)}
            </div>
          )}

          {/* Delivery */}
          {page === "delivery" && profile?.approved && (
            <div>
              <div className="d-title">Out for Delivery 🛵</div>
              {outNow.length === 0 ? <div className="d-empty"><div style={{ fontSize: 48 }}>🛵</div><div>No active deliveries</div></div>
                : outNow.map(o => <OrderCard key={o.id} order={o} mode="delivery" />)}
            </div>
          )}

          {/* History */}
          {page === "history" && profile?.approved && (
            <div>
              <div className="d-title">Delivery History ✅</div>
              {delivered.length === 0 ? <div className="d-empty"><div style={{ fontSize: 48 }}>✅</div><div>No deliveries yet</div></div>
                : delivered.map(o => <OrderCard key={o.id} order={o} mode="done" />)}
            </div>
          )}

          {/* Profile */}
          {page === "profile" && profile && (
            <div>
              <div className="d-title">My Profile 👤</div>
              <div className="d-card">
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#0d0d0d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 20 }}>
                  {(profile.name || "D")[0].toUpperCase()}
                </div>
                {[
                  ["Name", profile.name],
                  ["Email", profile.email],
                  ["Code", profile.deliveryBoyCode],
                  ["Mobile", profile.mobile],
                  ["Warehouse", profile.warehouse ? `${profile.warehouse.name} · ${profile.warehouse.city}` : "—"],
                  ["Assigned PINs", profile.assignedPinCodes || "All"],
                  ["Status", profile.approved ? "✅ Approved" : "⏳ Pending Approval"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f2f0eb", fontSize: 14 }}>
                    <span style={{ color: "rgba(13,13,13,0.55)", fontWeight: 600 }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* OTP delivery confirmation modal */}
        {otpModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 380, width: "100%" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Confirm Delivery 🎯</div>
              <div style={{ fontSize: 14, color: "rgba(13,13,13,0.55)", marginBottom: 20 }}>
                Ask the customer for their OTP to confirm delivery of Order #{otpModal.id}
              </div>
              <div className="d-otp-row">
                {otpDigits.map((d, i) => (
                  <input key={i} className="d-otp-inp" maxLength={1} value={d}
                    onChange={e => {
                      if (!/^\d*$/.test(e.target.value)) return;
                      const n = [...otpDigits]; n[i] = e.target.value.slice(-1); setOtpDigits(n);
                    }} inputMode="numeric" />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="btn-success" style={{ flex: 1 }} onClick={submitDeliveryOtp}>Confirm Delivery</button>
                <button className="btn-ghost" onClick={() => setOtpModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer warehouse modal */}
        {transferModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Request Warehouse Transfer</div>
              <div style={{ fontSize: 14, color: "rgba(13,13,13,0.55)", marginBottom: 20 }}>Select your preferred new warehouse. Admin approval is required.</div>
              <select className="d-form-input" style={{ marginBottom: 20 }} value={selectedWh} onChange={e => setSelectedWh(e.target.value)}>
                <option value="">Select warehouse…</option>
                {warehouseList.map(w => (
                  <option key={w.id} value={w.id}>{w.name} · {w.city}, {w.state}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={requestTransfer}>Submit Request</button>
                <button className="btn-ghost" onClick={() => setTransferModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}