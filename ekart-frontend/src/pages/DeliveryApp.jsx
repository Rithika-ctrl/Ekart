import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { apiFetch } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const S = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  .dk-root {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    color: #0d0d0d;
    display: flex;
    flex-direction: column;
    position: relative;
    background: #fafaf8;
  }

  .dk-bg {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    display: none;
  }

  /* NAV */
  .dk-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    border-bottom: 1px solid #e8e4dc;
    gap: 8px;
    height: 64px;
  }
  .dk-brand {
    font-size: 18px;
    font-weight: 800;
    color: #0d0d0d;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    letter-spacing: -0.5px;
  }
  .dk-brand span { color: #d4a017; }
  .dk-nav-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 8px;
    background: rgba(212, 160, 23, 0.12);
    border: 1px solid rgba(212, 160, 23, 0.25);
    color: #d4a017;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .dk-nav-right {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }
  .dk-nav-info { font-size: 13px; color: rgba(13,13,13,0.5); }
  .dk-btn-logout {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #e84c3c;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: 8px;
    border: 1px solid #e8e4dc;
    background: transparent;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .dk-btn-logout:hover { background: rgba(232,76,60,0.08); border-color: #e84c3c; }

  /* AVAILABILITY TOGGLE */
  .dk-btn-availability {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #0d0d0d;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: 8px;
    border: 1px solid;
    background: transparent;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .dk-btn-availability.online {
    border-color: rgba(29, 184, 130, 0.3);
    color: #1db882;
  }
  .dk-btn-availability.online:hover {
    background: rgba(29, 184, 130, 0.1);
    border-color: rgba(29, 184, 130, 0.6);
  }
  .dk-btn-availability.offline {
    border-color: rgba(232, 76, 60, 0.3);
    color: #e84c3c;
  }
  .dk-btn-availability.offline:hover {
    background: rgba(232, 76, 60, 0.1);
    border-color: rgba(232, 76, 60, 0.6);
  }

  /* ALERTS */
  .dk-alert-stack {
    position: fixed;
    top: 80px;
    right: 24px;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .dk-alert {
    padding: 12px 16px;
    background: #fff;
    border: 1px solid;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    min-width: 260px;
    animation: dkSlideIn 0.3s ease both;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .dk-alert-success { border-color: rgba(29, 184, 130, 0.3); color: #1db882; }
  .dk-alert-danger  { border-color: rgba(232, 76, 60, 0.3); color: #e84c3c; }
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
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1300px;
    margin: 64px auto 0;
    width: 100%;
  }

  /* WELCOME BANNER */
  .dk-welcome {
    background: #fff;
    border: 1px solid #e8e4dc;
    border-radius: 16px;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .dk-welcome-text h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
  .dk-welcome-text h1 span { color: #d4a017; }
  .dk-welcome-text p { font-size: 13px; color: rgba(13,13,13,0.5); }
  .dk-welcome-icon {
    width: 56px; height: 56px;
    background: rgba(212, 160, 23, 0.12);
    border: 1px solid rgba(212, 160, 23, 0.25);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  /* WAREHOUSE CARD */
  .dk-wh-card {
    background: #fff;
    border: 1px solid #e8e4dc;
    border-radius: 16px;
    padding: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .dk-wh-info { display: flex; align-items: center; gap: 12px; }
  .dk-wh-icon {
    width: 48px; height: 48px;
    background: rgba(37, 99, 235, 0.12);
    border: 1px solid rgba(37, 99, 235, 0.25);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; color: #2563eb;
    flex-shrink: 0;
  }
  .dk-wh-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; color: #0d0d0d; }
  .dk-wh-location { font-size: 13px; color: rgba(13,13,13,0.5); }
  .dk-wh-code { font-size: 11px; color: #d4a017; font-weight: 600; margin-top: 2px; }
  .dk-wh-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .dk-badge-pending {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 50px;
    background: rgba(212, 160, 23, 0.12);
    border: 1px solid rgba(212, 160, 23, 0.25);
    color: #d4a017;
  }
  .dk-btn-transfer {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(37, 99, 235, 0.1);
    border: 1px solid rgba(37, 99, 235, 0.25);
    color: #2563eb;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
  }
  .dk-btn-transfer:hover { background: rgba(37, 99, 235, 0.2); border-color: rgba(37, 99, 235, 0.4); }

  /* STATS */
  .dk-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
  .dk-stat {
    background: #fff;
    border: 1px solid #e8e4dc;
    border-radius: 14px;
    padding: 18px;
    text-align: center;
  }
  .dk-stat-val { font-size: 22px; font-weight: 900; color: #0d0d0d; margin-bottom: 2px; }
  .dk-stat-lbl { font-size: 12px; color: rgba(13,13,13,0.5); }

  /* 3-COLUMN GRID */
  .dk-col-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    align-items: start;
  }

  /* SECTION PANEL */
  .dk-panel {
    background: #fff;
    border: 1px solid #e8e4dc;
    border-radius: 16px;
    overflow: hidden;
  }
  .dk-panel-head {
    padding: 16px;
    border-bottom: 1px solid #f2f0eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #fafaf8;
  }
  .dk-panel-title {
    font-size: 15px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #0d0d0d;
  }
  .dk-count-badge {
    background: #d4a017;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 50px;
  }
  .dk-panel-body { padding: 14px; }

  /* ORDER CARD */
  .dk-order {
    background: #fafaf8;
    border: 1px solid #f2f0eb;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 10px;
    transition: border-color 0.2s;
  }
  .dk-order:last-child { margin-bottom: 0; }
  .dk-order:hover { border-color: #e8e4dc; background: #fff; }
  .dk-order.delivered { opacity: 0.6; }
  .dk-order-id { font-weight: 700; color: #d4a017; font-size: 14px; }
  .dk-order-customer { font-size: 12px; color: #0d0d0d; margin-top: 3px; }
  .dk-order-pin { font-size: 11px; color: rgba(13,13,13,0.5); }
  .dk-order-pin.highlight { color: #d4a017; }
  .dk-order-items {
    font-size: 11px;
    color: rgba(13,13,13,0.5);
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #f2f0eb;
  }
  .dk-order-amount { font-weight: 700; color: #1db882; font-size: 13px; margin-top: 6px; }
  .dk-order-actions { margin-top: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

  /* BUTTONS */
  .dk-btn-pickup {
    background: #d4a017;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }
  .dk-btn-pickup:hover { background: #b8860b; }
  .dk-btn-deliver {
    background: rgba(29, 184, 130, 0.1);
    color: #1db882;
    border: 1px solid rgba(29, 184, 130, 0.3);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }
  .dk-btn-deliver:hover { background: rgba(29, 184, 130, 0.2); border-color: rgba(29, 184, 130, 0.5); }

  /* OTP SECTION */
  .dk-otp-section {
    background: rgba(29, 184, 130, 0.08);
    border: 1px solid rgba(29, 184, 130, 0.2);
    border-radius: 10px;
    padding: 12px;
    margin-top: 10px;
  }
  .dk-otp-label {
    font-size: 11px;
    color: #1db882;
    font-weight: 700;
    margin-bottom: 8px;
    display: flex; align-items: center; gap: 6px;
  }
  .dk-otp-row { display: flex; gap: 8px; }
  .dk-otp-input {
    flex: 1;
    background: #fff;
    border: 1px solid #e8e4dc;
    border-radius: 8px;
    padding: 8px 10px;
    color: #0d0d0d;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    letter-spacing: 0.2em;
    text-align: center;
    outline: none;
    transition: border-color 0.2s;
    -moz-appearance: textfield;
  }
  .dk-otp-input:focus { border-color: #1db882; background: #fafaf8; }
  .dk-otp-input::-webkit-outer-spin-button,
  .dk-otp-input::-webkit-inner-spin-button { -webkit-appearance: none; }

  /* EMPTY STATE */
  .dk-empty { text-align: center; padding: 40px; color: rgba(13,13,13,0.4); font-size: 15px; }
  .dk-empty i { font-size: 32px; margin-bottom: 12px; display: block; opacity: 0.4; }
  .dk-empty p { font-size: 13px; }

  /* TOAST */
  .dk-toast-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 9999; }
  .dk-toast {
    background: #0d0d0d;
    border: 1px solid rgba(13,13,13,0.2);
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 12px;
    min-width: 240px;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: dkSlideIn 0.3s ease;
    color: #fff;
  }
  .dk-toast.success { border-color: rgba(29, 184, 130, 0.3); color: #1db882; background: rgba(29, 184, 130, 0.08); }
  .dk-toast.error   { border-color: rgba(232, 76, 60, 0.3); color: #e84c3c; background: rgba(232, 76, 60, 0.08); }

  /* MODAL */
  .dk-modal-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .dk-modal-box {
    background: #fff;
    border: 1px solid #e8e4dc;
    border-radius: 16px;
    padding: 24px;
    width: 100%; max-width: 480px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
  .dk-modal-title { font-size: 18px; font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; color: #0d0d0d; }
  .dk-modal-title i { color: #2563eb; }
  .dk-modal-subtitle { font-size: 13px; color: rgba(13,13,13,0.5); margin-bottom: 16px; }
  .dk-form-group { margin-bottom: 14px; }
  .dk-form-label { font-size: 11px; font-weight: 700; color: #0d0d0d; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
  .dk-form-select, .dk-form-textarea {
    width: 100%;
    background: #fafaf8;
    border: 1px solid #e8e4dc;
    border-radius: 10px;
    padding: 10px 12px;
    color: #0d0d0d;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }
  .dk-form-select option { background: #fff; color: #0d0d0d; }
  .dk-form-select:focus, .dk-form-textarea:focus { border-color: #2563eb; background: #fff; }
  .dk-form-textarea { resize: vertical; min-height: 80px; }
  .dk-modal-actions { display: flex; gap: 12px; margin-top: 20px; }
  .dk-btn-submit {
    flex: 1; background: #0d0d0d; color: #fff;
    border: none; border-radius: 10px; padding: 10px 14px;
    font-size: 13px; font-weight: 700;
    font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.2s;
  }
  .dk-btn-submit:hover { background: #1a1a1a; }
  .dk-btn-cancel {
    flex: 1; background: #fafaf8; color: rgba(13,13,13,0.5);
    border: 1px solid #e8e4dc; border-radius: 10px;
    padding: 10px 14px; font-size: 13px; font-weight: 600;
    font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.2s;
  }
  .dk-btn-cancel:hover { background: #f2f0eb; color: #0d0d0d; }

  /* FOOTER */
  .dk-footer {
    background: #fff;
    border-top: 1px solid #e8e4dc;
    padding: 16px 24px;
    display: flex; align-items: center; justify-content: space-between;
    margin-top: auto;
  }
  .dk-footer-brand { font-size: 14px; font-weight: 700; color: #0d0d0d; }
  .dk-footer-brand span { color: #d4a017; }
  .dk-footer-copy { font-size: 11px; color: rgba(13,13,13,0.5); }

  /* PENDING PAGE */
  .dk-pending-wrap { text-align: center; padding: 60px 20px; margin-top: 64px; }
  .dk-pending-icon { font-size: 56px; margin-bottom: 16px; }
  .dk-pending-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #0d0d0d; }
  .dk-pending-sub { font-size: 13px; color: rgba(13,13,13,0.6); max-width: 400px; margin: 0 auto 16px; line-height: 1.7; }
  .dk-pending-steps {
    background: rgba(212, 160, 23, 0.08);
    border: 1px solid rgba(212, 160, 23, 0.25);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 12px;
    color: #0d0d0d;
    max-width: 360px;
    margin: 0 auto 16px;
    text-align: left;
    line-height: 1.9;
  }

  @keyframes dkSlideIn { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:translateX(0); } }

  @media (max-width: 900px) { .dk-col-grid { grid-template-columns: 1fr; } }
  @media (max-width: 500px) { .dk-stats { grid-template-columns: 1fr; } .dk-page { padding: 16px; } }
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
  const [isAvailable, setIsAvailable] = useState(false);
  const [togglingAvailable, setTogglingAvailable] = useState(false);

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
      if (p?.success) {
        setProfile(p.deliveryBoy);
        setIsAvailable(p.deliveryBoy?.isAvailable || false);
      }
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

  const toggleAvailability = async () => {
    setTogglingAvailable(true);
    try {
      const newStatus = !isAvailable;
      const d = await api("/delivery/availability/toggle", { method: "POST", body: JSON.stringify({ isAvailable: newStatus }) });
      if (d?.success) {
        setIsAvailable(newStatus);
        showToast(newStatus ? "You are now ONLINE ✓ - Available for deliveries" : "You are now OFFLINE ✗ - Not available for deliveries", true);
      } else {
        showToast(d?.message || "Failed to update status", false);
      }
    } catch {
      showToast("Request failed. Try again.", false);
    }
    setTogglingAvailable(false);
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
            <button 
              className={`dk-btn-availability ${isAvailable ? "online" : "offline"}`}
              onClick={toggleAvailability}
              disabled={togglingAvailable}
              title={isAvailable ? "Click to go offline" : "Click to go online"}
            >
              <i className={`fas ${isAvailable ? "fa-circle" : "fa-circle"}`} style={{ fontSize: "0.6rem" }} />
              {isAvailable ? "Online" : "Offline"}
            </button>
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