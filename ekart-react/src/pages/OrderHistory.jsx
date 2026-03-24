import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getStoredCustomer, clearToken } from '../utils/api';

function fmtDate(s) {
  if (!s) return 'N/A';
  return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status, display }) {
  const cfg = {
    PROCESSING:       { bg:'rgba(34,197,94,0.12)',  c:'#22c55e', b:'rgba(34,197,94,0.3)',  icon:'fa-sync-alt'    },
    SHIPPED:          { bg:'rgba(59,130,246,0.12)', c:'#60a5fa', b:'rgba(59,130,246,0.3)', icon:'fa-shipping-fast'},
    OUT_FOR_DELIVERY: { bg:'rgba(245,168,0,0.12)',  c:'#f5a800', b:'rgba(245,168,0,0.3)',  icon:'fa-truck'       },
    DELIVERED:        { bg:'rgba(34,197,94,0.18)',  c:'#22c55e', b:'rgba(34,197,94,0.4)',  icon:'fa-box-open'    },
    CANCELLED:        { bg:'rgba(239,68,68,0.12)',  c:'#ef4444', b:'rgba(239,68,68,0.3)',  icon:'fa-times-circle'},
    REFUNDED:         { bg:'rgba(99,102,241,0.12)', c:'#818cf8', b:'rgba(99,102,241,0.3)', icon:'fa-undo'        },
  };
  const s = cfg[status] || cfg.PROCESSING;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', background:s.bg, color:s.c, border:`1px solid ${s.b}`, padding:'0.22rem 0.75rem', borderRadius:'20px', fontSize:'0.72rem', fontWeight:700 }}>
      <i className={`fas ${s.icon}`}></i> {display || status}
    </span>
  );
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const customer = getStoredCustomer();

  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState({});
  const [toast, setToast]       = useState({ type:'success', message:'' });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast(p=>({...p,message:''})), 3000);
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
      if (data.success) setOrders(data.orders || []);
    } catch {
      setToast({ type:'danger', message:'Failed to load orders.' });
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
        setToast({ type:'success', message:`${data.addedCount} item(s) added to cart!` });
        setTimeout(() => navigate('/cart'), 1000);
      } else {
        setToast({ type:'danger', message: data.message || 'Reorder failed.' });
      }
    } catch (err) {
      setToast({ type:'danger', message: err.response?.data?.message || 'Reorder failed.' });
    }
  };

  const handleLogout = () => { clearToken(); navigate('/login'); };
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  // Summary stats
  const totalSpent = orders.reduce((s, o) => s + (o.amount || 0), 0);
  const totalItems = orders.reduce((s, o) => s + (o.items?.length || 0), 0);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', fontFamily:'Poppins, sans-serif', color:'#fff' }}>

      {/* Background */}
      <div style={{ position:'fixed', inset:0, zIndex:-1, overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:-20, background:"url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat", filter:'blur(6px)', transform:'scale(1.08)' }}></div>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(5,8,20,.82) 0%,rgba(8,12,28,.78) 40%,rgba(5,8,20,.88) 100%)' }}></div>
      </div>

      {/* Navbar */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'1rem 3rem', display:'flex', alignItems:'center', justifyContent:'space-between', background: scrolled ? 'rgba(0,0,0,0.45)':'rgba(0,0,0,0.25)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(255,255,255,0.22)', transition:'background 0.3s' }}>
        <Link to="/home" style={{ fontSize:'1.6rem', fontWeight:700, color:'#fff', textDecoration:'none', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <i className="fas fa-shopping-cart" style={{ fontSize:'1.1rem' }}></i>Ek<span style={{ color:'#f5a800' }}>art</span>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <Link to="/home"  style={navBtn}>  <i className="fas fa-th-large"></i> Shop</Link>
          <Link to="/track" style={navBtn}><i className="fas fa-truck"></i> Track</Link>
          <button onClick={handleLogout} style={{ ...navBtn, background:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', borderColor:'rgba(255,100,80,0.3)', color:'rgba(255,100,80,0.8)' }}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>

      {/* Toast */}
      {toast.message && (
        <div style={{ position:'fixed', top:'5rem', right:'1.5rem', zIndex:200 }}>
          <div style={{ padding:'0.875rem 1.25rem', background:'rgba(10,12,30,0.88)', backdropFilter:'blur(16px)', border:`1px solid ${toast.type==='success'?'rgba(34,197,94,0.45)':'rgba(255,100,80,0.45)'}`, borderRadius:'10px', display:'flex', alignItems:'center', gap:'0.625rem', fontSize:'0.825rem', minWidth:'260px', color:toast.type==='success'?'#22c55e':'#ff8060' }}>
            <i className={`fas ${toast.type==='success'?'fa-check-circle':'fa-exclamation-circle'}`}></i>
            <span>{toast.message}</span>
            <button onClick={()=>setToast(p=>({...p,message:''}))} style={{ marginLeft:'auto', background:'none', border:'none', color:'inherit', cursor:'pointer', opacity:.6, fontSize:'1rem' }}>×</button>
          </div>
        </div>
      )}

      <main style={{ flex:1, padding:'7rem 1.5rem 3rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'2rem' }}>
        <div style={{ width:'100%', maxWidth:'900px', display:'flex', flexDirection:'column', gap:'1.5rem' }}>

          {/* Page header */}
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1.5rem' }}>
              <div>
                <h1 style={{ fontSize:'clamp(1.2rem,2.5vw,1.75rem)', fontWeight:700, marginBottom:'0.25rem' }}>
                  Order <span style={{ color:'#f5a800' }}>History</span> 📋
                </h1>
                <p style={{ fontSize:'0.825rem', color:'rgba(255,255,255,0.5)' }}>A complete record of all your past orders.</p>
              </div>
              <div style={{ width:60, height:60, background:'rgba(245,168,0,0.15)', border:'2px solid rgba(245,168,0,0.3)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', flexShrink:0 }}>📦</div>
            </div>
          </div>

          {/* Summary bar */}
          {!loading && orders.length > 0 && (
            <div style={{ ...card, padding:'1.25rem 2rem', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', textAlign:'center' }}>
              {[
                { label:'Total Orders', value: orders.length, icon:'fa-box' },
                { label:'Total Spent',  value:`₹${fmt(totalSpent)}`, icon:'fa-rupee-sign' },
                { label:'Total Items',  value: totalItems, icon:'fa-shopping-bag' },
              ].map(({ label, value, icon }) => (
                <div key={label}>
                  <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#f5a800' }}>{value}</div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:'0.2rem' }}>
                    <i className={`fas ${icon}`} style={{ marginRight:'0.35rem' }}></i>{label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div style={{ textAlign:'center', padding:'4rem', color:'rgba(255,255,255,0.5)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize:'2rem', color:'#f5a800' }}></i>
              <p style={{ marginTop:'1rem', fontSize:'0.9rem' }}>Loading history…</p>
            </div>
          )}

          {/* Order cards */}
          {!loading && orders.map((o, idx) => {
            const isDelivered = o.trackingStatus === 'DELIVERED';
            const isCOD       = o.paymentMode === 'COD';
            const open        = expanded[o.id];

            return (
              <div key={o.id} style={{ ...card, padding:0, overflow:'hidden', animation:`fadeUp 0.4s ease ${0.05+idx*0.05}s both` }}>

                {/* Card header — clickable to expand */}
                <div
                  onClick={() => toggle(o.id)}
                  style={{ padding:'1.1rem 1.75rem', background:'rgba(255,255,255,0.06)', borderBottom: open ? '1px solid rgba(255,255,255,0.22)':'none', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.6rem', cursor:'pointer' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.95rem', fontWeight:700 }}>Order <span style={{ color:'#f5a800', background:'rgba(245,168,0,0.12)', padding:'0.1rem 0.5rem', borderRadius:'6px' }}>#{o.id}</span></span>
                    <StatusBadge status={o.trackingStatus} display={o.trackingStatusDisplay} />
                    <span style={{ fontSize:'1rem', fontWeight:800, color:'#f5a800' }}>₹{fmt(o.amount)}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>
                      <i className="fas fa-calendar-alt"></i> {fmtDate(o.orderDate)}
                    </span>
                    <i className={`fas fa-chevron-${open ? 'up':'down'}`} style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.75rem' }}></i>
                  </div>
                </div>

                {/* Expandable body */}
                {open && (
                  <div style={{ padding:'1.4rem 1.75rem', display:'flex', flexDirection:'column', gap:'0.9rem' }}>

                    {/* Delivery time */}
                    {o.deliveryTime && (
                      <Row label="Delivery">
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', background:'rgba(59,130,246,0.1)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.25)', padding:'0.2rem 0.7rem', borderRadius:'20px', fontSize:'0.72rem', fontWeight:600 }}>
                          <i className="fas fa-clock"></i> {o.deliveryTime}
                        </span>
                        {o.deliveryCharge === 0 && (
                          <span style={{ marginLeft:'0.5rem', background:'rgba(34,197,94,0.1)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.25)', padding:'0.2rem 0.6rem', borderRadius:'20px', fontSize:'0.68rem', fontWeight:700 }}>FREE DELIVERY</span>
                        )}
                      </Row>
                    )}

                    {/* Price breakdown */}
                    {o.totalPrice > 0 && (
                      <Row label="Breakdown">
                        <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)' }}>
                          ₹{fmt(o.totalPrice)}
                          {o.deliveryCharge > 0 && ` + ₹${fmt(o.deliveryCharge)} delivery`}
                          {o.gstAmount > 0 && ` + ₹${fmt(o.gstAmount)} GST`}
                        </span>
                      </Row>
                    )}

                    {/* Payment */}
                    <Row label="Payment">
                      {isCOD ? (
                        <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)' }}>Cash on Delivery</span>
                      ) : o.paymentMode ? (
                        <span style={{ background:'rgba(245,168,0,0.08)', color:'#f5a800', border:'1px solid rgba(245,168,0,0.2)', padding:'0.2rem 0.7rem', borderRadius:'20px', fontSize:'0.72rem', fontWeight:600 }}>
                          {o.paymentMode}
                        </span>
                      ) : null}
                    </Row>

                    {/* Items */}
                    {o.items?.length > 0 && (
                      <Row label="Items">
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                          {o.items.map((it, i) => (
                            <span key={i} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.8)', padding:'0.25rem 0.75rem', borderRadius:'20px', fontSize:'0.72rem', fontWeight:600 }}>
                              {it.name} × {it.quantity}
                            </span>
                          ))}
                        </div>
                      </Row>
                    )}

                    {/* Actions */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.6rem', paddingTop:'0.5rem', borderTop:'1px solid rgba(255,255,255,0.1)', marginTop:'0.25rem' }}>
                      {!isDelivered && (
                        <Link to={`/track/${o.id}`} style={ab('green')}>
                          <i className="fas fa-truck"></i> Track Order
                        </Link>
                      )}
                      {isDelivered && (
                        <>
                          <button onClick={() => handleReorder(o.id)} style={{ ...ab('yellow'), fontFamily:'Poppins,sans-serif', cursor:'pointer' }}>
                            <i className="fas fa-redo"></i> Reorder
                          </button>
                          <Link to={`/customer/refund/report/${o.id}`} style={ab('red')}>
                            <i className="fas fa-shield-alt"></i> Report Issue
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty */}
          {!loading && orders.length === 0 && (
            <div style={{ ...card, textAlign:'center', padding:'4rem 2rem' }}>
              <div style={{ fontSize:'3.5rem', marginBottom:'1rem', opacity:0.4 }}>📭</div>
              <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:'0.5rem' }}>No Orders Yet</h3>
              <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)', marginBottom:'1.5rem' }}>Your order history will appear here after your first purchase.</p>
              <Link to="/home" style={ab('yellow')}>
                <i className="fas fa-store"></i> Start Shopping
              </Link>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'center' }}>
            <Link to="/home" style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', color:'rgba(255,255,255,0.5)', textDecoration:'none', fontSize:'0.78rem' }}>
              <i className="fas fa-arrow-left"></i> Back to Home
            </Link>
          </div>
        </div>
      </main>

      <footer style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(16px)', borderTop:'1px solid rgba(255,255,255,0.22)', padding:'1.25rem 3rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:'1.1rem', fontWeight:700 }}>Ek<span style={{ color:'#f5a800' }}>art</span></div>
        <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)' }}>© 2026 Ekart. All rights reserved.</div>
      </footer>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'0.6rem', fontSize:'0.84rem' }}>
      <span style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'rgba(255,255,255,0.5)', whiteSpace:'nowrap', paddingTop:'0.1rem', minWidth:'90px' }}>{label}</span>
      <span style={{ color:'rgba(255,255,255,0.8)' }}>{children}</span>
    </div>
  );
}

const card = { background:'rgba(255,255,255,0.13)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.22)', borderRadius:'20px', padding:'2rem 2.5rem' };
const navBtn = { display:'flex', alignItems:'center', gap:'0.4rem', color:'rgba(255,255,255,0.8)', textDecoration:'none', fontSize:'0.82rem', fontWeight:500, padding:'0.45rem 0.9rem', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.22)' };
function ab(color) {
  const m = { green:{bg:'rgba(34,197,94,0.12)',c:'#22c55e',b:'rgba(34,197,94,0.3)'}, red:{bg:'rgba(239,68,68,0.1)',c:'#ef4444',b:'rgba(239,68,68,0.25)'}, yellow:{bg:'rgba(245,168,0,0.12)',c:'#f5a800',b:'rgba(245,168,0,0.3)'} };
  const s = m[color];
  return { display:'inline-flex', alignItems:'center', gap:'0.4rem', borderRadius:'9px', padding:'0.5rem 1rem', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase', textDecoration:'none', border:`1px solid ${s.b}`, background:s.bg, color:s.c };
}