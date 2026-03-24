import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getStoredCustomer, clearToken } from '../utils/api';

// ─── Tracking step map ────────────────────────────────────────────────────────
// Mirrors trackingStepMap from the backend
const STEP_MAP = {
  PROCESSING:       1,
  SHIPPED:          2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED:        4,
  REFUNDED:         5,
  CANCELLED:        6,
};

const TRACK_STEPS = [
  { label: 'Order Placed',     icon: 'fa-check-circle'  },
  { label: 'Processing',       icon: 'fa-cog'           },
  { label: 'Shipped',          icon: 'fa-box'           },
  { label: 'Out for Delivery', icon: 'fa-truck'         },
  { label: 'Delivered',        icon: 'fa-home'          },
];

function fmtDate(s) {
  if (!s) return 'N/A';
  return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrackOrders() {
  const navigate = useNavigate();
  const customer = getStoredCustomer();

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState({ type: 'success', message: '' });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast(p => ({ ...p, message: '' })), 3000);
    return () => clearTimeout(t);
  }, [toast.message]);

  // GET /api/flutter/orders
  const fetchOrders = useCallback(async () => {
    if (!customer) { navigate('/login'); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/api/flutter/orders', {
        headers: { 'X-Customer-Id': customer.id },
      });
      if (data.success) {
        // Only show active (non-delivered/cancelled/refunded) orders for tracking
        const active = (data.orders || []).filter(o =>
          !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.trackingStatus)
        );
        setOrders(active);
      }
    } catch {
      setToast({ type: 'danger', message: 'Failed to load orders.' });
    } finally {
      setLoading(false);
    }
  }, [customer, navigate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Reorder — POST /api/flutter/orders/{id}/reorder
  const handleReorder = async (orderId) => {
    try {
      const { data } = await api.post(`/api/flutter/orders/${orderId}/reorder`, {}, {
        headers: { 'X-Customer-Id': customer.id },
      });
      if (data.success) {
        setToast({ type: 'success', message: `${data.addedCount} item(s) added to cart!` });
        setTimeout(() => navigate('/cart'), 1000);
      } else {
        setToast({ type: 'danger', message: data.message || 'Reorder failed.' });
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Reorder failed.' });
    }
  };

  const handleLogout = () => { clearToken(); navigate('/login'); };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Poppins, sans-serif', color: '#fff' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: -20, background: "url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat", filter: 'blur(6px)', transform: 'scale(1.08)' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(5,8,20,.82) 0%,rgba(8,12,28,.78) 40%,rgba(5,8,20,.88) 100%)' }}></div>
      </div>

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.22)', transition: 'background 0.3s' }}>
        <Link to="/home" style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
          Ek<span style={{ color: '#f5a800' }}>art</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/home"   style={navLinkStyle}>  <i className="fas fa-th-large"></i> Shop</Link>
          <Link to="/orders" style={{ ...navLinkStyle, color: '#f5a800', borderColor: 'rgba(245,168,0,0.4)' }}><i className="fas fa-box"></i> Orders</Link>
          <Link to="/track"  style={{ ...navLinkStyle, color: '#f5a800', borderColor: 'rgba(245,168,0,0.4)' }}><i className="fas fa-truck"></i> Track</Link>
          <button onClick={handleLogout} style={{ ...navLinkStyle, background: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', borderColor: 'rgba(255,100,80,0.3)', color: 'rgba(255,100,80,0.8)' }}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>

      {/* Toast */}
      {toast.message && (
        <div style={{ position: 'fixed', top: '5rem', right: '1.5rem', zIndex: 200 }}>
          <div style={{ padding: '0.875rem 1.25rem', background: 'rgba(10,12,30,0.88)', backdropFilter: 'blur(16px)', border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.45)' : 'rgba(255,100,80,0.45)'}`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.825rem', minWidth: '260px', color: toast.type === 'success' ? '#22c55e' : '#ff8060' }}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            <span>{toast.message}</span>
            <button onClick={() => setToast(p => ({ ...p, message: '' }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.6, fontSize: '1rem' }}>×</button>
          </div>
        </div>
      )}

      {/* Page */}
      <main style={{ flex: 1, padding: '7rem 1.5rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Header */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.75rem)', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Track <span style={{ color: '#f5a800' }}>Orders</span> 🚚
                </h1>
                <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.5)' }}>Real-time tracking for your active orders.</p>
              </div>
              <div style={{ width: 60, height: 60, background: 'rgba(245,168,0,0.15)', border: '2px solid rgba(245,168,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🛒</div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#f5a800' }}></i>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading orders…</p>
            </div>
          )}

          {/* Order Cards */}
          {!loading && orders.map((o, idx) => {
            const step = STEP_MAP[o.trackingStatus] || 1;
            const isCancelled = o.trackingStatus === 'CANCELLED';
            const isRefunded  = o.trackingStatus === 'REFUNDED';
            const isDelivered = o.trackingStatus === 'DELIVERED';

            return (
              <div key={o.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden', animation: `fadeUp 0.4s ease ${0.05 + idx * 0.05}s both` }}>

                {/* Header */}
                <div style={{ padding: '1.1rem 1.75rem', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Order <span style={{ color: '#f5a800' }}>#{o.id}</span></span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginLeft: '1rem' }}>
                      <i className="fas fa-calendar-alt"></i> {fmtDate(o.orderDate)}
                    </span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f5a800' }}>₹{o.amount}</div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Items */}
                  {o.items?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {o.items.map((it, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>
                          {it.name} × {it.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Status banners */}
                  {isDelivered && (
                    <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-check-circle" style={{ color: '#22c55e', fontSize: '1.25rem' }}></i>
                      <div>
                        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>Delivered!</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Your order has been delivered successfully.</div>
                      </div>
                    </div>
                  )}
                  {isCancelled && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-times-circle" style={{ color: '#ef4444', fontSize: '1.25rem' }}></i>
                      <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>Order Cancelled</div>
                    </div>
                  )}
                  {isRefunded && (
                    <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-undo" style={{ color: '#818cf8', fontSize: '1.25rem' }}></i>
                      <div style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.9rem' }}>Refunded</div>
                    </div>
                  )}

                  {/* Progress stepper */}
                  {!isCancelled && !isRefunded && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: '0.5rem' }}>
                      {TRACK_STEPS.map((s, i) => {
                        const done    = i + 1 < step;
                        const current = i + 1 === step;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: done || current ? 'rgba(245,168,0,0.2)' : 'rgba(255,255,255,0.05)',
                                border: `2px solid ${done || current ? '#f5a800' : 'rgba(255,255,255,0.15)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: done || current ? '#f5a800' : 'rgba(255,255,255,0.3)',
                                fontSize: '0.85rem', transition: 'all 0.3s',
                              }}>
                                <i className={`fas ${done ? 'fa-check' : s.icon}`}></i>
                              </div>
                              <span style={{ fontSize: '0.6rem', color: done || current ? '#f5a800' : 'rgba(255,255,255,0.3)', fontWeight: current ? 700 : 500, whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {s.label}
                              </span>
                            </div>
                            {i < 4 && (
                              <div style={{ flex: 1, height: 2, background: done ? '#f5a800' : 'rgba(255,255,255,0.1)', margin: '0 0.25rem', marginBottom: '1.1rem', transition: 'background 0.3s' }}></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Current city & delivery info */}
                  {o.currentCity && step > 0 && step < 4 && (
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fas fa-map-marker-alt" style={{ color: '#f5a800' }}></i>
                      Currently in: <strong>{o.currentCity}</strong>
                    </div>
                  )}
                  {o.deliveryTime && (
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fas fa-clock" style={{ color: '#f5a800' }}></i>
                      Expected: <strong>{o.deliveryTime}</strong>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.22)', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                  {step < 4 && !isCancelled && (
                    <Link to={`/track/${o.id}`} style={btnStyle('green')}>
                      <i className="fas fa-search-location"></i> Live Track
                    </Link>
                  )}
                  {!isCancelled && !isRefunded && (
                    <Link to={`/customer/refund/report/${o.id}`} style={btnStyle('red')}>
                      <i className="fas fa-shield-alt"></i> Report Issue
                    </Link>
                  )}
                  {isDelivered && (
                    <button onClick={() => handleReorder(o.id)} style={{ ...btnStyle('yellow'), fontFamily: 'Poppins, sans-serif', cursor: 'pointer' }}>
                      <i className="fas fa-redo"></i> Reorder
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {!loading && orders.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: 0.4 }}>📭</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>No Active Orders</h3>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>All your orders have been delivered or you haven't placed any yet.</p>
              <Link to="/orders" style={btnStyle('yellow')}>
                <i className="fas fa-history"></i> View Order History
              </Link>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link to="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.78rem' }}>
              <i className="fas fa-arrow-left"></i> Back to Home
            </Link>
          </div>
        </div>
      </main>

      <footer style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.22)', padding: '1.25rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Ek<span style={{ color: '#f5a800' }}>art</span></div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>© 2026 Ekart. All rights reserved.</div>
      </footer>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
const cardStyle = {
  background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.22)', borderRadius: '20px', padding: '2rem 2.5rem',
};

const navLinkStyle = {
  display: 'flex', alignItems: 'center', gap: '0.4rem',
  color: 'rgba(255,255,255,0.8)', textDecoration: 'none',
  fontSize: '0.82rem', fontWeight: 500, padding: '0.45rem 0.9rem',
  borderRadius: '6px', border: '1px solid rgba(255,255,255,0.22)',
};

function btnStyle(color) {
  const map = {
    green:  { bg: 'rgba(34,197,94,0.12)',  c: '#22c55e', b: 'rgba(34,197,94,0.3)'  },
    red:    { bg: 'rgba(239,68,68,0.1)',   c: '#ef4444', b: 'rgba(239,68,68,0.25)' },
    yellow: { bg: 'rgba(245,168,0,0.12)',  c: '#f5a800', b: 'rgba(245,168,0,0.3)'  },
  };
  const s = map[color];
  return { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '9px', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', textDecoration: 'none', border: `1px solid ${s.b}`, background: s.bg, color: s.c };
}