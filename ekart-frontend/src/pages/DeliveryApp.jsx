import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { apiFetch } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --yellow: #f5a800;
    --yellow-d: #d48f00;
    --glass-border: rgba(255,255,255,0.22);
    --glass-card: rgba(255,255,255,0.13);
    --glass-nav: rgba(0,0,0,0.25);
    --text-white: #ffffff;
    --text-light: rgba(255,255,255,0.80);
    --text-dim: rgba(255,255,255,0.50);
  }

  .dk-root {
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
    color: var(--text-white);
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .dk-bg {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
  }
  .dk-bg::before {
    content: '';
    position: absolute;
    inset: -20px;
    background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
    filter: blur(6px);
    transform: scale(1.08);
  }
  .dk-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
  }

  /* NAV */
  .dk-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--glass-nav);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--glass-border);
    gap: 1rem;
  }
  .dk-brand {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-white);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .dk-brand span { color: var(--yellow); }
  .dk-nav-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.3rem 0.8rem;
    border-radius: 50px;
    background: rgba(245,168,0,0.15);
    border: 1px solid rgba(245,168,0,0.3);
    color: var(--yellow);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .dk-nav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .dk-nav-info { font-size: 0.78rem; color: var(--text-dim); }
  .dk-btn-logout {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--text-light);
    text-decoration: none;
    font-size: 0.82rem;
    font-weight: 500;
    padding: 0.45rem 0.9rem;
    border-radius: 6px;
    border: 1px solid rgba(255,100,80,0.3);
    background: none;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    transition: all 0.2s;
  }
  .dk-btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

  /* ALERTS */
  .dk-alert-stack {
    position: fixed;
    top: 5rem;
    right: 1.5rem;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .dk-alert {
    padding: 0.875rem 1.25rem;
    background: rgba(10,12,30,0.88);
    backdrop-filter: blur(16px);
    border: 1px solid;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 0.825rem;
    min-width: 260px;
    animation: dkSlideIn 0.3s ease both;
  }
  .dk-alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
  .dk-alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
  .dk-alert-close {
    margin-left: auto;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.6;
    font-size: 1rem;
  }

  /* PAGE */
  .dk-page {
    flex: 1;
    padding: 7rem 2rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* WELCOME BANNER */
  .dk-welcome {
    background: var(--glass-card);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 1.75rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }
  .dk-welcome-text h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.2rem; }
  .dk-welcome-text h1 span { color: var(--yellow); }
  .dk-welcome-text p { font-size: 0.8rem; color: var(--text-dim); }
  .dk-welcome-icon {
    width: 56px; height: 56px;
    background: rgba(245,168,0,0.15);
    border: 2px solid rgba(245,168,0,0.3);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  /* WAREHOUSE CARD */
  .dk-wh-card {
    background: var(--glass-card);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 18px;
    padding: 1.4rem 1.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .dk-wh-info { display: flex; align-items: center; gap: 1rem; }
  .dk-wh-icon {
    width: 48px; height: 48px;
    background: rgba(99,179,237,0.15);
    border: 2px solid rgba(99,179,237,0.3);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem; color: #63b3ed;
    flex-shrink: 0;
  }
  .dk-wh-name { font-size: 1rem; font-weight: 600; margin-bottom: 0.15rem; }
  .dk-wh-location { font-size: 0.78rem; color: var(--text-dim); }
  .dk-wh-code { font-size: 0.7rem; color: var(--yellow); font-weight: 600; margin-top: 0.1rem; }
  .dk-wh-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .dk-badge-pending {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.3rem 0.8rem;
    border-radius: 50px;
    background: rgba(245,168,0,0.15);
    border: 1px solid rgba(245,168,0,0.4);
    color: var(--yellow);
  }
  .dk-btn-transfer {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(99,179,237,0.12);
    border: 1px solid rgba(99,179,237,0.35);
    color: #63b3ed;
    border-radius: 8px;
    padding: 0.45rem 1rem;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Poppins', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
  }
  .dk-btn-transfer:hover { background: rgba(99,179,237,0.22); border-color: rgba(99,179,237,0.6); }

  /* STATS */
  .dk-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
  .dk-stat {
    background: var(--glass-card);
    backdrop-filter: blur(18px);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    text-align: center;
  }
  .dk-stat-val { font-size: 2rem; font-weight: 700; color: var(--yellow); }
  .dk-stat-lbl { font-size: 0.78rem; color: var(--text-dim); margin-top: 0.2rem; }

  /* 3-COLUMN GRID */
  .dk-col-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    align-items: start;
  }

  /* SECTION PANEL */
  .dk-panel {
    background: var(--glass-card);
    backdrop-filter: blur(18px);
    border: 1px solid var(--glass-border);
    border-radius: 18px;
    overflow: hidden;
  }
  .dk-panel-head {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .dk-panel-title {
    font-size: 0.9rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .dk-count-badge {
    background: var(--yellow);
    color: #1a1000;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
  }
  .dk-panel-body { padding: 1rem; }

  /* ORDER CARD */
  .dk-order {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 1rem 1.1rem;
    margin-bottom: 0.75rem;
    transition: border-color 0.2s;
  }
  .dk-order:last-child { margin-bottom: 0; }
  .dk-order:hover { border-color: rgba(245,168,0,0.3); }
  .dk-order.delivered { opacity: 0.6; }
  .dk-order-id { font-weight: 700; color: var(--yellow); font-size: 0.9rem; }
  .dk-order-customer { font-size: 0.8rem; color: var(--text-light); margin-top: 0.15rem; }
  .dk-order-pin { font-size: 0.75rem; color: var(--text-dim); }
  .dk-order-pin.highlight { color: var(--yellow); }
  .dk-order-items {
    font-size: 0.75rem;
    color: var(--text-dim);
    margin-top: 0.4rem;
    padding-top: 0.4rem;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .dk-order-amount { font-weight: 700; color: #22c55e; font-size: 0.88rem; margin-top: 0.5rem; }
  .dk-order-actions { margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center; }

  /* BUTTONS */
  .dk-btn-pickup {
    background: var(--yellow);
    color: #1a1000;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    font-size: 0.78rem;
    font-weight: 700;
    font-family: 'Poppins', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 0.4rem;
  }
  .dk-btn-pickup:hover { background: var(--yellow-d); }
  .dk-btn-deliver {
    background: rgba(34,197,94,0.2);
    color: #22c55e;
    border: 1px solid rgba(34,197,94,0.4);
    border-radius: 8px;
    padding: 0.5rem 1rem;
    font-size: 0.78rem;
    font-weight: 700;
    font-family: 'Poppins', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 0.4rem;
  }
  .dk-btn-deliver:hover { background: rgba(34,197,94,0.3); border-color: rgba(34,197,94,0.6); }

  /* OTP SECTION */
  .dk-otp-section {
    background: rgba(34,197,94,0.06);
    border: 1px solid rgba(34,197,94,0.2);
    border-radius: 10px;
    padding: 0.75rem;
    margin-top: 0.75rem;
  }
  .dk-otp-label {
    font-size: 0.72rem;
    color: #22c55e;
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: flex; align-items: center; gap: 0.35rem;
  }
  .dk-otp-row { display: flex; gap: 0.5rem; }
  .dk-otp-input {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    color: white;
    font-family: 'Poppins', sans-serif;
    font-size: 1rem;
    letter-spacing: 0.2em;
    text-align: center;
    outline: none;
    transition: border-color 0.2s;
    -moz-appearance: textfield;
  }
  .dk-otp-input:focus { border-color: #22c55e; background: rgba(255,255,255,0.09); }
  .dk-otp-input::-webkit-outer-spin-button,
  .dk-otp-input::-webkit-inner-spin-button { -webkit-appearance: none; }

  /* EMPTY STATE */
  .dk-empty { text-align: center; padding: 2.5rem 1rem; color: var(--text-dim); }
  .dk-empty i { font-size: 2rem; margin-bottom: 0.75rem; display: block; opacity: 0.4; }
  .dk-empty p { font-size: 0.82rem; }

  /* TOAST */
  .dk-toast-wrap { position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; }
  .dk-toast {
    background: rgba(10,12,30,0.95);
    backdrop-filter: blur(16px);
    border: 1px solid;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    font-size: 0.85rem;
    min-width: 240px;
    display: flex; align-items: center; gap: 0.6rem;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    animation: dkSlideIn 0.3s ease;
  }
  .dk-toast.success { border-color: rgba(34,197,94,0.5); color: #22c55e; }
  .dk-toast.error   { border-color: rgba(255,100,80,0.5); color: #ff8060; }

  /* MODAL */
  .dk-modal-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .dk-modal-box {
    background: rgba(12,16,36,0.97);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 2rem;
    width: 100%; max-width: 480px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  }
  .dk-modal-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.5rem; }
  .dk-modal-title i { color: #63b3ed; }
  .dk-modal-subtitle { font-size: 0.78rem; color: var(--text-dim); margin-bottom: 1.5rem; }
  .dk-form-group { margin-bottom: 1rem; }
  .dk-form-label { font-size: 0.78rem; font-weight: 600; color: var(--text-light); margin-bottom: 0.4rem; display: block; }
  .dk-form-select, .dk-form-textarea {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 10px;
    padding: 0.65rem 0.9rem;
    color: white;
    font-family: 'Poppins', sans-serif;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.2s;
  }
  .dk-form-select option { background: #0e1230; color: white; }
  .dk-form-select:focus, .dk-form-textarea:focus { border-color: #63b3ed; background: rgba(255,255,255,0.09); }
  .dk-form-textarea { resize: vertical; min-height: 80px; }
  .dk-modal-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .dk-btn-submit {
    flex: 1; background: #63b3ed; color: #0a0e20;
    border: none; border-radius: 10px; padding: 0.7rem 1rem;
    font-size: 0.85rem; font-weight: 700;
    font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s;
  }
  .dk-btn-submit:hover { background: #4299d9; }
  .dk-btn-cancel {
    flex: 1; background: rgba(255,255,255,0.06); color: var(--text-light);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 10px;
    padding: 0.7rem 1rem; font-size: 0.85rem; font-weight: 600;
    font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s;
  }
  .dk-btn-cancel:hover { background: rgba(255,255,255,0.1); }

  /* FOOTER */
  .dk-footer {
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(16px);
    border-top: 1px solid var(--glass-border);
    padding: 1.25rem 2rem;
    display: flex; align-items: center; justify-content: space-between;
  }
  .dk-footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
  .dk-footer-brand span { color: var(--yellow); }
  .dk-footer-copy { font-size: 0.72rem; color: var(--text-dim); }

  /* PENDING PAGE */
  .dk-pending-wrap { text-align: center; padding: 60px 20px; }
  .dk-pending-icon { font-size: 3.5rem; margin-bottom: 1rem; }
  .dk-pending-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
  .dk-pending-sub { font-size: 0.85rem; color: var(--text-dim); max-width: 400px; margin: 0 auto 1.5rem; line-height: 1.7; }
  .dk-pending-steps {
    background: rgba(245,168,0,0.08);
    border: 1px solid rgba(245,168,0,0.25);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    font-size: 0.82rem;
    color: var(--text-light);
    max-width: 360px;
    margin: 0 auto 1.5rem;
    text-align: left;
    line-height: 1.9;
  }

  @keyframes dkSlideIn { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:translateX(0); } }

  @media (max-width: 900px) { .dk-col-grid { grid-template-columns: 1fr; } }
  @media (max-width: 500px) { .dk-stats { grid-template-columns: 1fr; } .dk-page { padding: 6rem 1rem 2rem; } }
`;

export default function DeliveryApp() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [toPickUp, setToPickUp] = useState([]);
  const [outNow, setOutNow] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingTransfer, setPendingTransfer] = useState(null);

  // Toast
  const [toast, setToast] = useState(null); // { msg, success }
  const toastTimer = useRef(null);
  const showToast = (msg, success = true) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, success });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // Alerts (flash messages)
  const [alerts, setAlerts] = useState([]);

  // Transfer modal
  const [transferModal, setTransferModal] = useState(false);
  const [warehouseList, setWarehouseList] = useState([]);
  const [selectedWh, setSelectedWh] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Per-order OTP state map: { [orderId]: string }
  const [otpMap, setOtpMap] = useState({});
  const setOtp = (id, val) => setOtpMap(prev => ({ ...prev, [id]: val }));

  const api = useCallback((path, opts) => apiFetch(path, opts, auth), [auth]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o, t] = await Promise.all([
        api("/delivery/profile"),
        api("/delivery/orders"),
        api("/delivery/warehouse-change/pending").catch(() => null),
      ]);
      if (p?.success) setProfile(p.deliveryBoy);
      if (o?.success) {
        setToPickUp(o.toPickUp || []);
        setOutNow(o.outForDelivery || []);
        setDelivered(o.delivered || []);
      }
      if (t?.success) setPendingTransfer(t.request || null);
      else setPendingTransfer(null);
    } catch {
      showToast("Failed to load data", false);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const markPickedUp = async (orderId) => {
    try {
      const d = await api(`/delivery/order/${orderId}/pickup`, { method: "POST" });
      showToast(d?.message || "Marked as picked up", d?.success);
      if (d?.success) setTimeout(load, 1800);
    } catch { showToast("Request failed. Try again.", false); }
  };

  const confirmDelivery = async (orderId) => {
    const otp = (otpMap[orderId] || "").trim();
    if (!otp || otp.length !== 6) { showToast("Enter the 6-digit OTP from customer.", false); return; }
    if (!window.confirm(`Confirm delivery of Order #${orderId} with OTP ${otp}?`)) return;
    try {
      const fd = new FormData();
      fd.append("otp", otp);
      const d = await fetch(`/delivery/order/${orderId}/deliver`, {
        method: "POST", body: fd,
        headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
      }).then(r => r.json());
      showToast(d?.message || "Delivery confirmed", d?.success);
      if (d?.success) setTimeout(load, 1800);
    } catch { showToast("Request failed. Try again.", false); }
  };

  const loadWarehouses = async () => {
    const d = await api("/delivery/warehouses").catch(() => null);
    if (d?.success) setWarehouseList(d.warehouses || []);
  };

  const openTransferModal = async () => {
    setTransferModal(true);
    setSelectedWh("");
    setTransferReason("");
    await loadWarehouses();
  };

  const submitTransfer = async () => {
    if (!selectedWh) { showToast("Please select a warehouse.", false); return; }
    try {
      const fd = new FormData();
      fd.append("warehouseId", selectedWh);
      fd.append("reason", transferReason);
      const d = await fetch("/delivery/warehouse-change/request", {
        method: "POST", body: fd,
        headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
      }).then(r => r.json());
      showToast(d?.message || "Request submitted", d?.success);
      if (d?.success) { setTransferModal(false); setTimeout(load, 1800); }
    } catch { showToast("Request failed. Try again.", false); }
  };

  const dismissAlert = (i) => setAlerts(prev => prev.filter((_, idx) => idx !== i));

  // ── Pending approval guard
  if (!loading && profile && !profile.approved) {
    return (
      <>
        <style>{S}</style>
        <div className="dk-root">
          <div className="dk-bg" />
          <nav className="dk-nav">
            <div className="dk-brand"><i className="fas fa-shopping-cart" style={{ fontSize: "1.1rem" }} /><span>Ekart</span></div>
            <div className="dk-nav-right">
              <span className="dk-nav-badge"><i className="fas fa-motorcycle" />&nbsp; Delivery</span>
              <button className="dk-btn-logout" onClick={() => { logout(); navigate("/auth", { replace: true }); }}>
                <i className="fas fa-sign-out-alt" /> Logout
              </button>
            </div>
          </nav>
          <main className="dk-page">
            <div className="dk-pending-wrap">
              <div className="dk-pending-icon">⏳</div>
              <div className="dk-pending-title">Pending Admin Approval</div>
              <p className="dk-pending-sub">
                Your account has been verified but is awaiting admin review.
                You'll receive an email at <strong>{profile.email}</strong> once approved.
              </p>
              <div className="dk-pending-steps">
                <strong>What happens next?</strong><br />
                1. Admin reviews your application 🔍<br />
                2. Admin assigns your warehouse & pin codes 📦<br />
                3. You receive an approval email ✉️<br />
                4. You can then start accepting deliveries 🛵
              </div>
              <button className="dk-btn-logout" onClick={() => { logout(); navigate("/auth", { replace: true }); }}>
                <i className="fas fa-sign-out-alt" /> Logout
              </button>
            </div>
          </main>
          <footer className="dk-footer">
            <div className="dk-footer-brand"><span>Ekart</span></div>
            <div className="dk-footer-copy">© 2026 Ekart. All rights reserved.</div>
          </footer>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{S}</style>
      <div className="dk-root">
        <div className="dk-bg" />

        {/* Alerts */}
        <div className="dk-alert-stack">
          {alerts.map((a, i) => (
            <div key={i} className={`dk-alert dk-alert-${a.type}`}>
              <i className={`fas ${a.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`} />
              <span>{a.msg}</span>
              <button className="dk-alert-close" onClick={() => dismissAlert(i)}>×</button>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="dk-nav">
          <div className="dk-brand">
            <i className="fas fa-shopping-cart" style={{ fontSize: "1.1rem" }} />
            <span>Ekart</span>
          </div>
          <div className="dk-nav-right">
            <span className="dk-nav-badge"><i className="fas fa-motorcycle" />&nbsp; Delivery</span>
            <span className="dk-nav-info">{profile?.name || auth?.email}</span>
            <button className="dk-btn-logout" onClick={() => { logout(); navigate("/auth", { replace: true }); }}>
              <i className="fas fa-sign-out-alt" /> Logout
            </button>
          </div>
        </nav>

        <main className="dk-page">
          {loading ? (
            <div className="dk-empty"><i className="fas fa-spinner fa-spin" /><p>Loading…</p></div>
          ) : (
            <>
              {/* Welcome Banner */}
              <div className="dk-welcome">
                <div className="dk-welcome-text">
                  <h1>Hello, <span>{profile?.name || "Delivery Boy"}</span>!</h1>
                  <p>
                    {profile?.deliveryBoyCode}
                    {profile?.assignedPinCodes ? `  ·  Pins: ${profile.assignedPinCodes}` : "  ·  Pins: All"}
                  </p>
                </div>
                <div className="dk-welcome-icon">
                  <i className="fas fa-motorcycle" style={{ color: "var(--yellow)" }} />
                </div>
              </div>

              {/* Warehouse Card */}
              <div className="dk-wh-card">
                <div className="dk-wh-info">
                  <div className="dk-wh-icon"><i className="fas fa-warehouse" /></div>
                  {profile?.warehouse ? (
                    <div>
                      <div className="dk-wh-name">{profile.warehouse.name}</div>
                      <div className="dk-wh-location">
                        <i className="fas fa-map-marker-alt" style={{ color: "var(--yellow)", marginRight: "0.3rem", fontSize: "0.7rem" }} />
                        {profile.warehouse.city}, {profile.warehouse.state}
                      </div>
                      <div className="dk-wh-code">{profile.warehouse.warehouseCode}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="dk-wh-name" style={{ color: "var(--text-dim)" }}>No Warehouse Assigned</div>
                      <div className="dk-wh-location">Contact admin to get a warehouse assigned.</div>
                    </div>
                  )}
                </div>
                <div className="dk-wh-right">
                  {pendingTransfer ? (
                    <span className="dk-badge-pending">
                      <i className="fas fa-clock" />
                      Transfer to <strong style={{ marginLeft: "0.25rem" }}>{pendingTransfer.requestedWarehouse?.name}</strong> — Pending
                    </span>
                  ) : (
                    <button className="dk-btn-transfer" onClick={openTransferModal}>
                      <i className="fas fa-exchange-alt" /> Request Transfer
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="dk-stats">
                <div className="dk-stat">
                  <div className="dk-stat-val">{toPickUp.length}</div>
                  <div className="dk-stat-lbl">To Pick Up</div>
                </div>
                <div className="dk-stat">
                  <div className="dk-stat-val">{outNow.length}</div>
                  <div className="dk-stat-lbl">Out for Delivery</div>
                </div>
                <div className="dk-stat">
                  <div className="dk-stat-val">{delivered.length}</div>
                  <div className="dk-stat-lbl">Delivered</div>
                </div>
              </div>

              {/* 3-Column Grid */}
              <div className="dk-col-grid">

                {/* TO PICK UP */}
                <div className="dk-panel">
                  <div className="dk-panel-head">
                    <div className="dk-panel-title">
                      <i className="fas fa-box" style={{ color: "var(--yellow)" }} /> Pick Up from Warehouse
                    </div>
                    <span className="dk-count-badge">{toPickUp.length}</span>
                  </div>
                  <div className="dk-panel-body">
                    {toPickUp.length === 0 ? (
                      <div className="dk-empty">
                        <i className="fas fa-box-open" />
                        <p>No orders waiting for pickup</p>
                      </div>
                    ) : toPickUp.map(order => (
                      <div key={order.id} className="dk-order">
                        <div className="dk-order-id">Order #{order.id}</div>
                        <div className="dk-order-customer">{order.customer?.name || order.customerName}</div>
                        <div className="dk-order-pin">{order.customer?.mobile || order.mobile}</div>
                        {order.deliveryPinCode && (
                          <div className="dk-order-pin">PIN: {order.deliveryPinCode}</div>
                        )}
                        <div className="dk-order-items">
                          {(order.items || []).map((item, i) => (
                            <span key={i}>{item.name} ×{item.quantity}{i < order.items.length - 1 ? ", " : ""}</span>
                          ))}
                        </div>
                        <div className="dk-order-amount">{fmt(order.amount || order.totalPrice)}</div>
                        <div className="dk-order-actions">
                          <button className="dk-btn-pickup" onClick={() => markPickedUp(order.id)}>
                            <i className="fas fa-truck-loading" /> Picked Up
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OUT FOR DELIVERY */}
                <div className="dk-panel">
                  <div className="dk-panel-head">
                    <div className="dk-panel-title">
                      <i className="fas fa-motorcycle" style={{ color: "#22c55e" }} /> Out for Delivery
                    </div>
                    <span className="dk-count-badge">{outNow.length}</span>
                  </div>
                  <div className="dk-panel-body">
                    {outNow.length === 0 ? (
                      <div className="dk-empty">
                        <i className="fas fa-road" />
                        <p>No active deliveries</p>
                      </div>
                    ) : outNow.map(order => (
                      <div key={order.id} className="dk-order">
                        <div className="dk-order-id">Order #{order.id}</div>
                        <div className="dk-order-customer">{order.customer?.name || order.customerName}</div>
                        <div className="dk-order-pin">{order.customer?.mobile || order.mobile}</div>
                        {order.deliveryPinCode && (
                          <div className="dk-order-pin highlight">PIN: {order.deliveryPinCode}</div>
                        )}
                        <div className="dk-order-items">
                          {(order.items || []).map((item, i) => (
                            <span key={i}>{item.name} ×{item.quantity}{i < order.items.length - 1 ? ", " : ""}</span>
                          ))}
                        </div>
                        <div className="dk-order-amount">{fmt(order.amount || order.totalPrice)}</div>
                        <div className="dk-otp-section">
                          <div className="dk-otp-label">
                            <i className="fas fa-key" /> Enter OTP from customer
                          </div>
                          <div className="dk-otp-row">
                            <input
                              type="number"
                              className="dk-otp-input"
                              placeholder="000000"
                              maxLength={6}
                              min={100000}
                              max={999999}
                              value={otpMap[order.id] || ""}
                              onChange={e => setOtp(order.id, e.target.value)}
                            />
                            <button className="dk-btn-deliver" onClick={() => confirmDelivery(order.id)}>
                              <i className="fas fa-check" /> Deliver
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DELIVERED */}
                <div className="dk-panel">
                  <div className="dk-panel-head">
                    <div className="dk-panel-title">
                      <i className="fas fa-check-circle" style={{ color: "#22c55e" }} /> Delivered
                    </div>
                    <span className="dk-count-badge">{delivered.length}</span>
                  </div>
                  <div className="dk-panel-body">
                    {delivered.length === 0 ? (
                      <div className="dk-empty">
                        <i className="fas fa-clipboard-check" />
                        <p>No completed deliveries yet</p>
                      </div>
                    ) : delivered.map(order => (
                      <div key={order.id} className="dk-order delivered">
                        <div className="dk-order-id">Order #{order.id}</div>
                        <div className="dk-order-customer">{order.customer?.name || order.customerName}</div>
                        <div className="dk-order-items">
                          {(order.items || []).map((item, i) => (
                            <span key={i}>{item.name} ×{item.quantity}{i < order.items.length - 1 ? ", " : ""}</span>
                          ))}
                        </div>
                        <div className="dk-order-amount">{fmt(order.amount || order.totalPrice)}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}
        </main>

        <footer className="dk-footer">
          <div className="dk-footer-brand"><span>Ekart</span></div>
          <div className="dk-footer-copy">© 2026 Ekart. All rights reserved.</div>
        </footer>

        {/* Warehouse Transfer Modal */}
        {transferModal && (
          <div className="dk-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setTransferModal(false); }}>
            <div className="dk-modal-box">
              <div className="dk-modal-title">
                <i className="fas fa-exchange-alt" /> Request Warehouse Transfer
              </div>
              <div className="dk-modal-subtitle">
                Your request will be reviewed by admin. You will be notified by email once approved or rejected.
              </div>
              <div className="dk-form-group">
                <label className="dk-form-label">Transfer to Warehouse</label>
                <select className="dk-form-select" value={selectedWh} onChange={e => setSelectedWh(e.target.value)}>
                  <option value="">— Select warehouse —</option>
                  {warehouseList
                    .filter(w => !profile?.warehouse || w.id !== profile.warehouse.id)
                    .map(w => (
                      <option key={w.id} value={w.id}>{w.name} — {w.city}, {w.state}</option>
                    ))}
                </select>
              </div>
              <div className="dk-form-group">
                <label className="dk-form-label">
                  Reason <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  className="dk-form-textarea"
                  placeholder="e.g. Relocating to another city, closer to new address..."
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                />
              </div>
              <div className="dk-modal-actions">
                <button className="dk-btn-cancel" onClick={() => setTransferModal(false)}>Cancel</button>
                <button className="dk-btn-submit" onClick={submitTransfer}>
                  <i className="fas fa-paper-plane" /> Submit Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="dk-toast-wrap">
            <div className={`dk-toast ${toast.success ? "success" : "error"}`}>
              <i className={`fas ${toast.success ? "fa-check-circle" : "fa-exclamation-circle"}`} />
              {toast.msg}
            </div>
          </div>
        )}
      </div>
    </>
  );
}