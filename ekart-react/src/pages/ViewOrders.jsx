import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getStoredCustomer, clearToken } from '../utils/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isReturnEligible(order) {
  if (order.trackingStatus !== 'DELIVERED') return false;
  if (!order.orderDate) return false;
  const deliveredAt = new Date(order.orderDate);
  const diffDays    = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

function StatusBadge({ status, display }) {
  const cfg = {
    PROCESSING:       { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.3)',   icon: 'fa-check-circle' },
    SHIPPED:          { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.3)',   icon: 'fa-check-circle' },
    OUT_FOR_DELIVERY: { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.3)',   icon: 'fa-check-circle' },
    DELIVERED:        { bg: 'rgba(34,197,94,0.18)',   color: '#22c55e', border: 'rgba(34,197,94,0.4)',   icon: 'fa-box-open'     },
    CANCELLED:        { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)',   icon: 'fa-times-circle' },
    REFUNDED:         { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8', border: 'rgba(99,102,241,0.3)',  icon: 'fa-undo'         },
  };
  const s = cfg[status] || cfg.PROCESSING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      padding: '0.2rem 0.7rem', borderRadius: '20px',
      fontSize: '0.72rem', fontWeight: 700,
    }}>
      <i className={`fas ${s.icon}`}></i>
      {display || status}
    </span>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ modal, onClose, onConfirm }) {
  if (!modal) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'rgba(10,13,32,0.97)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: '22px', padding: '2.5rem 2.75rem',
        maxWidth: 400, width: '92%', textAlign: 'center',
        boxShadow: '0 50px 120px rgba(0,0,0,0.75)',
      }}>
        <div style={{ fontSize: '2.75rem', marginBottom: '0.875rem' }}>{modal.icon}</div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
          {modal.title}
        </h3>
        <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '2rem' }}>
          {modal.message}
        </p>
        <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center' }}>
          <button onClick={onClose} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)',
            color: 'rgba(255,255,255,0.65)', padding: '0.7rem 1.5rem', borderRadius: '11px',
            fontFamily: 'Poppins, sans-serif', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}>
            <i className="fas fa-arrow-left"></i> Go Back
          </button>
          <button onClick={onConfirm} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: modal.type === 'cancel' ? 'rgba(239,68,68,0.15)' : 'rgba(168,85,247,0.15)',
            border: modal.type === 'cancel' ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(168,85,247,0.35)',
            color: modal.type === 'cancel' ? '#ef4444' : '#c084fc',
            padding: '0.7rem 1.5rem', borderRadius: '11px',
            fontFamily: 'Poppins, sans-serif', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}>
            <i className={`fas ${modal.type === 'cancel' ? 'fa-times' : 'fa-exchange-alt'}`}></i>
            {modal.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ViewOrders() {
  const navigate  = useNavigate();
  const customer  = getStoredCustomer();

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState({ type: 'success', message: '' });
  const [modal, setModal]     = useState(null);   // { type, orderId, icon, title, message, confirmLabel }
  const [scrolled, setScrolled] = useState(false);

  // Nav scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast(p => ({ ...p, message: '' })), 3000);
    return () => clearTimeout(t);
  }, [toast.message]);

  // Fetch orders — GET /api/flutter/orders  (header: X-Customer-Id)
  const fetchOrders = useCallback(async () => {
    if (!customer) { navigate('/login'); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/api/flutter/orders', {
        headers: { 'X-Customer-Id': customer.id },
      });
      if (data.success) setOrders(data.orders || []);
    } catch {
      setToast({ type: 'danger', message: 'Failed to load orders.' });
    } finally {
      setLoading(false);
    }
  }, [customer, navigate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleLogout = () => { clearToken(); navigate('/login'); };

  // Open confirm modal
  const openModal = (type, orderId) => {
    if (type === 'cancel') {
      setModal({
        type, orderId,
        icon: '🚫', title: `Cancel Order #${orderId}?`,
        message: 'This will permanently cancel your order and restore stock. This action cannot be undone.',
        confirmLabel: 'Yes, Cancel Order',
      });
    } else {
      setModal({
        type, orderId,
        icon: '🔄', title: 'Request Replacement?',
        message: `A replacement request will be sent for Order #${orderId}. Our team will contact you shortly.`,
        confirmLabel: 'Yes, Request Replacement',
      });
    }
  };

  // Confirm action
  const handleConfirm = async () => {
    if (!modal) return;
    const { type, orderId } = modal;
    setModal(null);
    try {
      if (type === 'cancel') {
        // POST /api/flutter/orders/{id}/cancel
        const { data } = await api.post(`/api/flutter/orders/${orderId}/cancel`, {}, {
          headers: { 'X-Customer-Id': customer.id },
        });
        if (data.success) {
          setToast({ type: 'success', message: `Order #${orderId} cancelled.` });
          fetchOrders();
        } else {
          setToast({ type: 'danger', message: data.message || 'Cancel failed.' });
        }
      } else {
        // POST /cancel-order/{id}  — replacement endpoint (Spring MVC)
        await api.post(`/request-replacement/${orderId}`);
        setToast({ type: 'success', message: 'Replacement requested!' });
        fetchOrders();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Action failed.' });
    }
  };

  const isActive = (status) =>
    !status || !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(status);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Poppins, sans-serif', color: '#fff' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: -20, background: "url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat", filter: 'blur(6px)', transform: 'scale(1.08)' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(5,8,20,.82) 0%,rgba(8,12,28,.78) 40%,rgba(5,8,20,.88) 100%)' }}></div>
      </div>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '1rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.22)',
        transition: 'background 0.3s',
      }}>
        <Link to="/home" style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
          Ek<span style={{ color: '#f5a800' }}>art</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500, padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.22)' }}>
            <i className="fas fa-th-large"></i> Shop
          </Link>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.8)', background: 'none', fontSize: '0.82rem', fontWeight: 500, padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1px solid rgba(255,100,80,0.3)', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>

      {/* Toast */}
      {toast.message && (
        <div style={{ position: 'fixed', top: '5rem', right: '1.5rem', zIndex: 200 }}>
          <div style={{
            padding: '0.875rem 1.25rem', background: 'rgba(10,12,30,0.88)', backdropFilter: 'blur(16px)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.45)' : 'rgba(255,100,80,0.45)'}`,
            borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.625rem',
            fontSize: '0.825rem', minWidth: '260px', color: toast.type === 'success' ? '#22c55e' : '#ff8060',
          }}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            <span>{toast.message}</span>
            <button onClick={() => setToast(p => ({ ...p, message: '' }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.6, fontSize: '1rem' }}>×</button>
          </div>
        </div>
      )}

      {/* Page */}
      <main style={{ flex: 1, padding: '7rem 1.5rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Page Header */}
          <div style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '20px', padding: '2rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.75rem)', fontWeight: 700, marginBottom: '0.25rem' }}>
                Order <span style={{ color: '#f5a800' }}>History</span> 📦
              </h1>
              <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.5)' }}>Track, manage and review all your past orders.</p>
            </div>
            <div style={{ width: 60, height: 60, background: 'rgba(245,168,0,0.15)', border: '2px solid rgba(245,168,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              🚚
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#f5a800' }}></i>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading your orders…</p>
            </div>
          )}

          {/* Orders */}
          {!loading && orders.length > 0 && orders.map((o, idx) => {
            const eligible     = isReturnEligible(o);
            const active       = isActive(o.trackingStatus);
            const isCod        = o.paymentMode === 'COD';
            const within24h    = o.orderDate && (Date.now() - new Date(o.orderDate).getTime()) < 86400000;

            return (
              <div key={o.id} style={{
                background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.22)', borderRadius: '20px', overflow: 'hidden',
                animation: `fadeUp 0.4s ease ${0.05 + idx * 0.05}s both`,
                transition: 'transform 0.25s, box-shadow 0.25s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Card Header */}
                <div style={{ padding: '1.1rem 1.75rem', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    Order <span style={{ color: '#f5a800' }}>#{o.id}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <i className="fas fa-calendar-alt"></i> {fmtDate(o.orderDate)}
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.4rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {/* Amount */}
                  <InfoRow label="Amount">
                    <span style={{ color: '#f5a800', fontWeight: 800, fontSize: '1rem' }}>₹{o.amount}</span>
                  </InfoRow>

                  {/* Status */}
                  <InfoRow label="Status">
                    <StatusBadge status={o.trackingStatus} display={o.trackingStatusDisplay} />
                  </InfoRow>

                  {/* Delivery time */}
                  {o.deliveryTime && (
                    <InfoRow label="Delivery">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>
                        <i className="fas fa-clock"></i> {o.deliveryTime}
                      </span>
                    </InfoRow>
                  )}

                  {/* Items */}
                  {o.items?.length > 0 && (
                    <InfoRow label="Items">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {o.items.map((it, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.8)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>
                            <i className="fas fa-box" style={{ fontSize: '0.6rem', opacity: 0.6 }}></i>
                            {it.name} × {it.quantity}
                          </span>
                        ))}
                      </div>
                    </InfoRow>
                  )}

                  {/* Return eligibility */}
                  <InfoRow label="Returns">
                    {eligible ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
                        <i className="fas fa-undo"></i> Return Eligible (within 7 days)
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>
                        <i className="fas fa-times-circle"></i> Not Eligible for Return
                      </span>
                    )}
                  </InfoRow>
                </div>

                {/* Card Footer — Actions */}
                <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.22)', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>

                  {/* Track */}
                  {active && (
                    <Link to={`/track/${o.id}`} style={actionStyle('track')}>
                      <i className="fas fa-truck"></i> Track Order
                    </Link>
                  )}

                  {/* Cancel */}
                  {active && (
                    <button onClick={() => openModal('cancel', o.id)} style={{ ...actionStyle('cancel'), fontFamily: 'Poppins, sans-serif', cursor: 'pointer' }}>
                      <i className="fas fa-times"></i> Cancel Order
                    </button>
                  )}

                  {/* Switch to online payment (COD within 24h) */}
                  {isCod && within24h && active && (
                    <Link to="/payment" style={actionStyle('retry')}>
                      <i className="fas fa-redo"></i> Switch to Online Payment
                    </Link>
                  )}

                  {/* Request Replacement */}
                  {eligible && !o.replacementRequested && (
                    <button onClick={() => openModal('replace', o.id)} style={{ ...actionStyle('replace'), fontFamily: 'Poppins, sans-serif', cursor: 'pointer' }}>
                      <i className="fas fa-exchange-alt"></i> Request Replacement
                    </button>
                  )}

                  {/* Replacement badge */}
                  {o.replacementRequested && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
                      <i className="fas fa-check-circle"></i> Replacement Requested
                    </span>
                  )}

                  {/* Report Issue */}
                  <Link to={`/customer/refund/report/${o.id}`} style={actionStyle('cancel')}>
                    <i className="fas fa-shield-alt"></i> Report Issue
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {!loading && orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '20px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: 0.4 }}>📭</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>No Orders Yet</h3>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>Your placed orders will appear here once you start shopping.</p>
              <Link to="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f5a800', color: '#1a1000', border: 'none', borderRadius: '10px', padding: '0.7rem 1.75rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <i className="fas fa-store"></i> Start Shopping
              </Link>
            </div>
          )}

          {/* Back link */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link to="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.78rem' }}>
              <i className="fas fa-arrow-left"></i> Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.22)', padding: '1.25rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Ek<span style={{ color: '#f5a800' }}>art</span></div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>© 2026 Ekart. All rights reserved.</div>
      </footer>

      {/* Confirm Modal */}
      <ConfirmModal modal={modal} onClose={() => setModal(null)} onConfirm={handleConfirm} />

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function InfoRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.84rem' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', paddingTop: '0.1rem', minWidth: '90px' }}>
        {label}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{children}</span>
    </div>
  );
}

function actionStyle(type) {
  const styles = {
    track:   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.3)'   },
    cancel:  { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', border: 'rgba(239,68,68,0.25)'  },
    retry:   { bg: 'rgba(245,168,0,0.12)',   color: '#f5a800', border: 'rgba(245,168,0,0.3)'   },
    replace: { bg: 'rgba(168,85,247,0.1)',   color: '#c084fc', border: 'rgba(168,85,247,0.3)'  },
  };
  const s = styles[type];
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    borderRadius: '9px', padding: '0.5rem 1rem',
    fontSize: '0.75rem', fontWeight: 700,
    letterSpacing: '0.04em', textTransform: 'uppercase',
    textDecoration: 'none', border: `1px solid ${s.border}`,
    background: s.bg, color: s.color,
    transition: 'all 0.2s',
  };
}