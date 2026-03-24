import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getStoredCustomer, clearToken } from '../utils/api';

// ─── GST rate lookup (mirrors GstUtil.java) ───────────────────────────────────
const GST_RATES = [
  { keys: ['book','newspaper','grain','rice','pulse','salt','fresh','vegetable','fruit'], rate: 0 },
  { keys: ['food','beverage','drink','juice','tea','coffee','grocery','dairy','milk','butter','cheese','paneer','egg','bread','bakery','snack','chip','biscuit','wafer','chocolate','sweet','ice cream','icecream','medicine','pharma','supplement','vitamin','ayurved','first aid','sanitizer','baby','infant','oil','spice','masala','staple','daily product'], rate: 5 },
  { keys: ['sport','fitness','gym','outdoor','toy','game','board game','puzzle','footwear','shoe','sandal','slipper','boot','stationery','stationary','office','pen','notebook','kitchen','cookware','utensil','cloth','fashion','apparel','shirt','dress','wear','jeans','kurta','saree','bag','luggage','wallet','handbag','backpack','accessory','accessories','jewel','watch','ring','necklace','bracelet','decor','home good','household','cleaning','bedding','furniture'], rate: 12 },
  { keys: ['electronic','mobile','phone','laptop','computer','tablet','camera','audio','headphone','speaker','tv','appliance','beauty','cosmetic','makeup','skincare','haircare','shampoo','cream','lotion','perfume','fragrance','soap','detergent','hygiene','personal care','pet','plant','garden','car','auto','tyre'], rate: 18 },
];

function getGstRate(category = '') {
  const lower = category.toLowerCase().trim();
  for (const { keys, rate } of GST_RATES) {
    if (keys.some(k => lower.includes(k))) return rate;
  }
  return 18;
}

function calcGstFromInclusive(inclPrice, ratePercent) {
  if (!ratePercent) return 0;
  const r = ratePercent / 100;
  return Math.round(inclPrice * r / (1 + r) * 100) / 100;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'rgba(10,12,30,0.95)', backdropFilter: 'blur(16px)',
          border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
          borderRadius: 12, padding: '0.875rem 1.4rem',
          display: 'flex', alignItems: 'center', gap: '0.7rem',
          fontSize: '0.82rem', minWidth: 240, animation: 'slideIn 0.3s ease both',
        }}>
          <i className={`fas fa-${t.type === 'success' ? 'check-circle' : 'times-circle'}`}
            style={{ color: t.type === 'success' ? '#22c55e' : '#ef4444' }} />
          <span style={{ color: 'white' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ViewCart
// ═══════════════════════════════════════════════════════════════════════════════
export default function ViewCart() {
  const navigate  = useNavigate();
  const customer  = getStoredCustomer();

  // ── Data ─────────────────────────────────────────────────────────────────
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [navScrolled,  setNavScrolled]  = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [toasts,       setToasts]       = useState([]);

  // ── Coupon ───────────────────────────────────────────────────────────────
  const [couponInput,    setCouponInput]    = useState('');
  const [couponLoading,  setCouponLoading]  = useState(false);
  const [activeCoupon,   setActiveCoupon]   = useState(null);   // { code, discount }
  const [couponMsg,      setCouponMsg]      = useState(null);   // { type, text }

  // ── Delivery type ────────────────────────────────────────────────────────
  const [deliveryType,  setDeliveryType]  = useState(
    () => sessionStorage.getItem('ekart_delivery_type') || 'standard'
  );

  // ── Confirm remove modal ─────────────────────────────────────────────────
  const [confirmModal,  setConfirmModal]  = useState(null);   // { id, name }
  const [removing,      setRemoving]      = useState(null);   // itemId being removed

  // ─────────────────────────────────────────────────────────────────────────
  //  Derived totals
  // ─────────────────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, p) => {
    const unitPrice = p.unitPrice > 0 ? p.unitPrice : p.price / (p.quantity || 1);
    return s + unitPrice * (p.quantity || 1);
  }, 0);

  const baseDelivery   = subtotal >= 500 ? 0 : 40;
  const expressCharge  = deliveryType === 'express' ? 129 : 0;
  const deliveryCharge = baseDelivery + expressCharge;
  const couponDiscount = activeCoupon?.discount || 0;
  const grandTotal     = Math.max(subtotal + deliveryCharge - couponDiscount, 0);

  const totalGst = items.reduce((sum, p) => {
    const rate      = getGstRate(p.category || '');
    const unitPrice = p.unitPrice > 0 ? p.unitPrice : p.price / (p.quantity || 1);
    const lineTotal = unitPrice * (p.quantity || 1);
    return sum + calcGstFromInclusive(lineTotal, rate);
  }, 0);

  const gstRates = [...new Set(items.map(p => getGstRate(p.category || '')).filter(r => r > 0))].sort((a,b)=>a-b);
  const gstLabel = gstRates.length === 0 ? 'GST (0%)' : gstRates.length === 1 ? `GST (${gstRates[0]}%, incl.)` : `GST (${gstRates[0]}–${gstRates[gstRates.length-1]}%, incl.)`;

  const freeDelivery = subtotal >= 500;
  const progressPct  = Math.min((subtotal / 500) * 100, 100);

  // Delivery dates
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(d) { return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
  function addBizDays(from, n) {
    const d = new Date(from); let added = 0;
    while (added < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
    return d;
  }
  const today      = new Date();
  const stdDate    = fmtDate(addBizDays(today, 5));
  const cutoff     = new Date(today); cutoff.setHours(14, 0, 0, 0);
  const expDate    = fmtDate(addBizDays(today, today < cutoff ? 1 : 2));

  // ─────────────────────────────────────────────────────────────────────────
  //  Toast helper
  // ─────────────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  Fetch cart
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!customer) { navigate('/login'); return; }
    api.get('/api/flutter/cart', { headers: { 'X-Customer-Id': customer.id } })
      .then(r => setItems(r.data.items || r.data.cart?.items || []))
      .catch(() => addToast('Could not load cart', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // ── Nav scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ── Close profile on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = () => setProfileOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Delivery type persistence ─────────────────────────────────────────────
  const selectDelivery = (type) => {
    setDeliveryType(type);
    sessionStorage.setItem('ekart_delivery_type', type);
    sessionStorage.setItem('ekart_express_charge', type === 'express' ? '129' : '0');
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Quantity change
  // ─────────────────────────────────────────────────────────────────────────
  const changeQty = useCallback(async (itemId, direction) => {
    const endpoint = direction === 'increase'
      ? `/ajax/cart/increase/${itemId}`
      : `/ajax/cart/decrease/${itemId}`;

    // Optimistic update
    setItems(prev => prev.map(p => {
      if (p.id !== itemId) return p;
      const unitPrice = p.unitPrice > 0 ? p.unitPrice : p.price / (p.quantity || 1);
      const newQty    = direction === 'increase' ? p.quantity + 1 : Math.max(p.quantity - 1, 1);
      return { ...p, quantity: newQty, price: unitPrice * newQty, unitPrice };
    }));

    try {
      const r = await api.post(endpoint);
      if (!r.data.success) {
        addToast(r.data.message || 'Could not update quantity', 'error');
        // Reload actual state
        const cartRes = await api.get('/api/flutter/cart', { headers: { 'X-Customer-Id': customer.id } });
        setItems(cartRes.data.items || cartRes.data.cart?.items || []);
        return;
      }
      if (r.data.removed) {
        setItems(prev => prev.filter(p => p.id !== itemId));
      } else {
        setItems(prev => prev.map(p => p.id !== itemId ? p : {
          ...p,
          quantity:  r.data.quantity,
          price:     r.data.lineTotal,
          unitPrice: r.data.unitPrice,
        }));
      }
    } catch {
      addToast('Network error', 'error');
      const cartRes = await api.get('/api/flutter/cart', { headers: { 'X-Customer-Id': customer.id } });
      setItems(cartRes.data.items || cartRes.data.cart?.items || []);
    }
  }, [customer, addToast]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Remove item
  // ─────────────────────────────────────────────────────────────────────────
  const doRemove = useCallback(async () => {
    if (!confirmModal) return;
    const { id } = confirmModal;
    setConfirmModal(null);
    setRemoving(id);
    try {
      const r = await api.delete(`/ajax/cart/remove/${id}`);
      if (r.data.success) {
        setItems(prev => prev.filter(p => p.id !== id));
        addToast('Item removed from cart', 'success');
      } else {
        addToast(r.data.message || 'Remove failed', 'error');
      }
    } catch {
      addToast('Network error', 'error');
    } finally {
      setRemoving(null);
    }
  }, [confirmModal, addToast]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Coupon
  // ─────────────────────────────────────────────────────────────────────────
  const applyCoupon = useCallback(async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponMsg({ type: 'error', text: 'Please enter a promo code' }); return; }
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const r = await api.get(`/api/coupon/validate?code=${encodeURIComponent(code)}&amount=${subtotal}`);
      if (!r.data.success) {
        setCouponMsg({ type: 'error', text: `✗ ${r.data.message}` });
      } else {
        setActiveCoupon({ code: r.data.code, discount: Math.round(r.data.discount) });
        setCouponMsg({ type: 'success', text: `✓ ${r.data.message}` });
        sessionStorage.setItem('ekart_coupon_code', r.data.code);
        sessionStorage.setItem('ekart_coupon_discount', Math.round(r.data.discount));
      }
    } catch {
      setCouponMsg({ type: 'error', text: '✗ Could not validate coupon. Try again.' });
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput, subtotal]);

  const removeCoupon = () => {
    setActiveCoupon(null);
    setCouponInput('');
    setCouponMsg(null);
    sessionStorage.removeItem('ekart_coupon_code');
    sessionStorage.removeItem('ekart_coupon_discount');
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Logout
  // ─────────────────────────────────────────────────────────────────────────
  const handleLogout = () => { clearToken(); navigate('/login'); };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Poppins', sans-serif", color: 'white' }}>
      <style>{CART_CSS}</style>

      {/* BG */}
      <div className="bg-layer" />

      {/* Toasts */}
      <Toast toasts={toasts} />

      {/* ── NAVBAR ── */}
      <nav className={`ekart-nav${navScrolled ? ' scrolled' : ''}`} id="nav">
        <Link to="/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }} />
          Ek<span>art</span>
        </Link>

        <div className="nav-right">
          <Link to="/home"         className="nav-link-btn" title="Shop"><i className="fas fa-th-large" /> <span>Shop</span></Link>
          <Link to="/track-orders" className="nav-link-btn" title="Track Orders"><i className="fas fa-truck" /> <span>Track</span></Link>
          <Link to="/view-orders"  className="nav-link-btn" title="My Orders"><i className="fas fa-box-open" /> <span>Orders</span></Link>
          <Link to="/wishlist"     className="nav-link-btn" title="Wishlist"><i className="fas fa-heart" /> <span>Wishlist</span></Link>
          <Link to="/spending"     className="nav-link-btn" title="Spending"><i className="fas fa-chart-pie" /> <span>Spending</span></Link>

          {/* Cart — active */}
          <Link to="/cart" className="nav-link-btn nav-link-active" title="Cart" style={{ position: 'relative' }}>
            <i className="fas fa-shopping-cart" /> <span>Cart</span>
            {items.length > 0 && <span className="nav-cart-badge">{items.length}</span>}
          </Link>

          {/* Profile dropdown */}
          <div className="nav-profile-menu" onClick={e => e.stopPropagation()}>
            <button className="nav-profile-btn" onClick={() => setProfileOpen(v => !v)}>
              <i className="fas fa-user-circle" />
            </button>
            {profileOpen && (
              <div className="nav-profile-dropdown open">
                <div className="nav-profile-name">
                  <i className="fas fa-user" />
                  <span>{customer?.name || 'Account'}</span>
                </div>
                <Link to="/customer/profile" className="nav-profile-item"><i className="fas fa-id-card" /> My Profile</Link>
                <Link to="/customer/address" className="nav-profile-item"><i className="fas fa-map-marker-alt" /> Addresses</Link>
                <Link to="/security-settings" className="nav-profile-item"><i className="fas fa-shield-alt" /> Security</Link>
                <div className="nav-profile-divider" />
                <button className="nav-profile-item nav-profile-logout"
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem' }}
                  onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── PAGE ── */}
      <main className="page">
        <div className="inner">

          {/* Page Header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1>Your <span>Cart</span> 🛒</h1>
              <p>Review your items, adjust quantities and proceed to checkout.</p>
            </div>
            <div className="page-header-icon">🛍️</div>
          </div>

          {loading ? (
            /* ── SKELETON ── */
            <div className="cart-grid">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="cart-card skeleton-card" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="skeleton-img" />
                  <div className="cart-body" style={{ gap: '0.75rem' }}>
                    <div className="skeleton-line" style={{ width: '70%' }} />
                    <div className="skeleton-line" style={{ width: '90%', height: 10 }} />
                    <div className="skeleton-line" style={{ width: '40%', height: 22 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            /* ── EMPTY STATE ── */
            <div className="empty-cart">
              <div className="empty-cart-icon">🛒</div>
              <h3>Your Cart is Empty</h3>
              <p>Looks like you haven't added anything yet. Start shopping!</p>
              <Link to="/home" className="btn-shop"><i className="fas fa-store" /> Browse Products</Link>
            </div>
          ) : (
            <>
              {/* ── FREE DELIVERY BANNER ── */}
              <div className="delivery-banner">
                {freeDelivery ? (
                  <>
                    <div className="unlocked-text">🎉 You've unlocked <strong>FREE Delivery!</strong></div>
                    <div className="progress-track"><div className="progress-fill full" style={{ width: '100%' }} /></div>
                    <div className="progress-meta" style={{ color: '#22c55e' }}>FREE DELIVERY UNLOCKED ✓</div>
                  </>
                ) : (
                  <>
                    <div className="milestone-text">
                      🚚 Spend <strong>₹{fmtInt(500 - subtotal)}</strong> more to unlock <strong>FREE Delivery!</strong>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="progress-meta">₹{fmt(subtotal)} / ₹500</div>
                  </>
                )}
              </div>

              {/* ── CART ITEMS GRID ── */}
              <div className="cart-grid">
                {items.map((p, idx) => {
                  const unitPrice = p.unitPrice > 0 ? p.unitPrice : (p.price / (p.quantity || 1));
                  const lineTotal = unitPrice * (p.quantity || 1);
                  const isRemoving = removing === p.id;
                  return (
                    <div
                      key={p.id}
                      className="cart-card"
                      style={{
                        animationDelay: `${Math.min(idx, 4) * 0.05}s`,
                        opacity: isRemoving ? 0.4 : 1,
                        pointerEvents: isRemoving ? 'none' : 'auto',
                        transition: 'opacity 0.3s, transform 0.3s',
                      }}
                    >
                      {/* Image */}
                      <div className="cart-img-wrap">
                        <img src={p.imageLink} alt={p.name}
                          onError={e => { e.target.src = 'https://via.placeholder.com/320x180?text=No+Image'; }} />
                        <div className="cart-img-overlay" />
                        <span className="cart-category-badge">{p.category}</span>
                      </div>

                      {/* Body */}
                      <div className="cart-body">
                        <div className="cart-name">{p.name}</div>
                        <div className="cart-desc">{p.description}</div>
                        <div className="cart-price">₹{fmt(unitPrice)}</div>
                        {p.quantity > 1 && (
                          <div className="cart-line-total">
                            {p.quantity} × ₹{fmt(unitPrice)} = <strong>₹{fmt(lineTotal)}</strong>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="cart-actions">
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => changeQty(p.id, 'decrease')} title="Decrease">−</button>
                          <span className="qty-val">{p.quantity}</span>
                          <button className="qty-btn" onClick={() => changeQty(p.id, 'increase')} title="Increase">+</button>
                        </div>
                        <button
                          className="btn-remove"
                          onClick={() => setConfirmModal({ id: p.id, name: p.name })}
                        >
                          <i className="fas fa-trash-alt" /> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── CHECKOUT PANEL ── */}
              <div className="checkout-panel">
                <div className="section-label"><i className="fas fa-receipt" /> Order Summary</div>

                {/* Price rows */}
                <div className="total-row">
                  <div className="total-label">Cart Subtotal</div>
                  <div className="total-value">₹{fmt(subtotal)}</div>
                </div>
                <div className="total-row" style={{ fontSize: '0.82rem' }}>
                  <div className="total-label">Delivery</div>
                  <div className="total-value" style={{ color: deliveryCharge === 0 ? '#22c55e' : 'var(--yellow)' }}>
                    {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}${deliveryType === 'express' ? ' (Express)' : ''}`}
                  </div>
                </div>
                <div className="total-row" style={{ fontSize: '0.78rem' }}>
                  <div className="total-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <i className="fas fa-file-invoice" style={{ color: 'var(--yellow)', fontSize: '0.65rem' }} />
                    {gstLabel}
                  </div>
                  <div className="total-value" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
                    ₹{totalGst.toFixed(2)}
                  </div>
                </div>
                {activeCoupon && (
                  <div className="total-row" style={{ fontSize: '0.82rem' }}>
                    <div className="total-label" style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <i className="fas fa-tag" /> Promo ({activeCoupon.code})
                    </div>
                    <div className="total-value" style={{ color: '#22c55e' }}>−₹{activeCoupon.discount}</div>
                  </div>
                )}
                <div className="total-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                  <div className="total-label" style={{ fontWeight: 700, color: 'white' }}>Grand Total</div>
                  <div className="total-value" style={{ color: 'var(--yellow)', fontSize: '1.1rem' }}>₹{fmt(grandTotal)}</div>
                </div>

                {/* ── Coupon / Promo Code ── */}
                <div className="coupon-box">
                  <div className="coupon-label">
                    <i className="fas fa-tag" /> Promo Code
                    <Link to="/coupons" target="_blank" style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--yellow)', textDecoration: 'none', fontWeight: 600, opacity: 0.8 }}>
                      View all coupons <i className="fas fa-external-link-alt" style={{ fontSize: '0.55rem' }} />
                    </Link>
                  </div>
                  {!activeCoupon ? (
                    <>
                      <div className="coupon-row">
                        <input
                          type="text" className="coupon-input"
                          placeholder="Enter promo code" maxLength={20}
                          value={couponInput}
                          onChange={e => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                          disabled={couponLoading}
                        />
                        <button className="btn-apply-coupon" onClick={applyCoupon} disabled={couponLoading}>
                          {couponLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                      {couponMsg && (
                        <div className={`coupon-msg ${couponMsg.type}`}>{couponMsg.text}</div>
                      )}
                    </>
                  ) : (
                    <div className="coupon-discount-row show">
                      <span className="coupon-discount-label">
                        <i className="fas fa-check-circle" /> Promo <strong>{activeCoupon.code}</strong> applied
                      </span>
                      <span>
                        <span className="coupon-discount-val">−₹{activeCoupon.discount}</span>
                        <button className="btn-remove-coupon" onClick={removeCoupon} title="Remove coupon">✕</button>
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Delivery Type Selector ── */}
                <div style={{ marginBottom: '0.875rem' }}>
                  <div className="delivery-type-label">Delivery Type</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div
                      className={`delivery-option${deliveryType === 'standard' ? ' selected' : ''}`}
                      onClick={() => selectDelivery('standard')}
                    >
                      <div className="del-option-title">📦 Standard</div>
                      <div className="del-option-date">By {stdDate}</div>
                      <div className="del-option-price free">FREE</div>
                    </div>
                    <div
                      className={`delivery-option${deliveryType === 'express' ? ' selected-express' : ''}`}
                      onClick={() => selectDelivery('express')}
                    >
                      <div className="del-option-title" style={{ color: '#22c55e' }}>⚡ Express</div>
                      <div className="del-option-date">By {expDate}</div>
                      <div className="del-option-price">+₹129</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>
                    ⚠️ One delivery type applies to all items in your cart
                  </div>
                </div>

                {/* ── Express Checkout ── */}
                <div className="express-box">
                  <div className="express-left">
                    <div className="express-icon">⚡</div>
                    <div>
                      <div className="express-title">Express Checkout</div>
                      <div className="express-sub">Skip the steps — pay instantly with your saved address</div>
                    </div>
                  </div>
                  <Link to="/payment" className="btn-express">
                    <i className="fas fa-bolt" /> Buy Now
                  </Link>
                </div>

                {/* ── Normal Checkout ── */}
                <Link to="/customer/address" className="btn-checkout">
                  Proceed to Checkout <i className="fas fa-arrow-right" />
                </Link>
              </div>
            </>
          )}

          {/* Back */}
          <div className="back-wrap">
            <Link to="/home" className="back-link">
              <i className="fas fa-arrow-left" /> Back to Shop
            </Link>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="cart-footer">
        <div className="footer-brand">Ek<span>art</span></div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>

      {/* ── CONFIRM REMOVE MODAL ── */}
      {confirmModal && (
        <div className="confirm-overlay active" onClick={e => { if (e.target === e.currentTarget) setConfirmModal(null); }}>
          <div className="confirm-box">
            <div className="confirm-icon">🗑️</div>
            <h3 className="confirm-title">Remove Item?</h3>
            <p className="confirm-msg">Remove "{confirmModal.name}" from your cart?</p>
            <div className="confirm-actions">
              <button className="confirm-btn-cancel" onClick={() => setConfirmModal(null)}>
                <i className="fas fa-times" /> Keep It
              </button>
              <button className="confirm-btn-ok" onClick={doRemove}>
                <i className="fas fa-trash-alt" /> Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────
const CART_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  :root {
    --yellow: #f5a800; --yellow-d: #d48f00;
    --glass-border: rgba(255,255,255,0.22); --glass-card: rgba(255,255,255,0.13);
    --text-white: #fff; --text-light: rgba(255,255,255,0.80); --text-dim: rgba(255,255,255,0.50);
  }
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; }

  /* BG */
  .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
  .bg-layer::before { content:''; position:absolute; inset:-20px; background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat; filter:blur(6px); transform:scale(1.08); }
  .bg-layer::after  { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%); }

  /* NAV */
  .ekart-nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:1rem 2.5rem; display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.25); backdrop-filter:blur(14px); border-bottom:1px solid var(--glass-border); transition:background 0.3s; }
  .ekart-nav.scrolled { background:rgba(0,0,0,0.5); }
  .nav-brand { font-size:1.6rem; font-weight:700; color:white; text-decoration:none; letter-spacing:0.04em; display:flex; align-items:center; gap:0.45rem; }
  .nav-brand span { color:var(--yellow); }
  .nav-right { display:flex; align-items:center; gap:0.5rem; }
  .nav-link-btn { display:flex; align-items:center; gap:0.35rem; color:var(--text-light); text-decoration:none; font-size:0.78rem; font-weight:500; padding:0.4rem 0.75rem; border-radius:7px; border:1px solid var(--glass-border); transition:all 0.2s; white-space:nowrap; }
  .nav-link-btn:hover { color:white; background:rgba(255,255,255,0.1); text-decoration:none; }
  .nav-link-active { background:rgba(245,168,0,0.15) !important; border-color:rgba(245,168,0,0.4) !important; color:var(--yellow) !important; }
  .nav-cart-badge { position:absolute; top:-4px; right:-4px; background:var(--yellow); color:#1a1000; font-size:0.6rem; font-weight:800; min-width:16px; height:16px; border-radius:99px; display:inline-flex; align-items:center; justify-content:center; padding:0 4px; margin-left:1px; }
  .nav-profile-menu { position:relative; }
  .nav-profile-btn { background:none; border:1px solid var(--glass-border); color:var(--text-light); border-radius:7px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1rem; transition:all 0.2s; }
  .nav-profile-btn:hover { color:white; background:rgba(255,255,255,0.1); }
  .nav-profile-dropdown { position:absolute; top:calc(100% + 8px); right:0; background:rgba(10,13,32,0.97); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:14px; padding:0.5rem; min-width:180px; box-shadow:0 20px 60px rgba(0,0,0,0.5); z-index:200; animation:fadeUp 0.2s ease both; }
  .nav-profile-name { display:flex; align-items:center; gap:0.5rem; font-size:0.78rem; font-weight:700; color:white; padding:0.5rem 0.75rem 0.75rem; border-bottom:1px solid var(--glass-border); margin-bottom:0.3rem; }
  .nav-profile-item { display:flex; align-items:center; gap:0.5rem; color:var(--text-light); text-decoration:none; font-size:0.78rem; padding:0.55rem 0.75rem; border-radius:8px; transition:all 0.15s; }
  .nav-profile-item:hover { background:rgba(255,255,255,0.08); color:white; text-decoration:none; }
  .nav-profile-item i { width:14px; opacity:0.7; }
  .nav-profile-divider { border-top:1px solid var(--glass-border); margin:0.3rem 0; }
  .nav-profile-logout { color:#ff8060 !important; }
  .nav-profile-logout:hover { background:rgba(255,100,80,0.1) !important; }

  /* PAGE */
  .page { flex:1; padding:7rem 1.5rem 3rem; display:flex; flex-direction:column; align-items:center; gap:2rem; }
  .inner { width:100%; max-width:1100px; display:flex; flex-direction:column; gap:1.75rem; }

  /* PAGE HEADER */
  .page-header { background:var(--glass-card); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; padding:2rem 2.5rem; display:flex; align-items:center; justify-content:space-between; gap:1.5rem; animation:fadeUp 0.45s ease both; }
  .page-header-left h1 { font-size:clamp(1.2rem,2.5vw,1.75rem); font-weight:700; margin-bottom:0.25rem; }
  .page-header-left h1 span { color:var(--yellow); }
  .page-header-left p { font-size:0.825rem; color:var(--text-dim); }
  .page-header-icon { width:60px; height:60px; background:rgba(245,168,0,0.15); border:2px solid rgba(245,168,0,0.3); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; flex-shrink:0; }

  /* SECTION LABEL */
  .section-label { display:flex; align-items:center; gap:0.6rem; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--yellow); margin-bottom:1.25rem; }
  .section-label::after { content:''; flex:1; height:1px; background:var(--glass-border); }

  /* DELIVERY BANNER */
  .delivery-banner { background:var(--glass-card); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:16px; padding:1.4rem 1.75rem; animation:fadeUp 0.45s ease 0.05s both; }
  .milestone-text { font-size:0.875rem; font-weight:600; color:var(--text-light); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem; }
  .milestone-text strong { color:var(--yellow); }
  .unlocked-text { font-size:0.875rem; font-weight:700; color:#22c55e; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem; }
  .progress-track { height:10px; border-radius:99px; background:rgba(255,255,255,0.1); overflow:hidden; }
  .progress-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,var(--yellow),#ff8c00); transition:width 0.6s ease; }
  .progress-fill.full { background:linear-gradient(90deg,#22c55e,#16a34a); }
  .progress-meta { font-size:0.72rem; color:var(--text-dim); margin-top:0.4rem; }

  /* CART GRID */
  .cart-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1.5rem; animation:fadeUp 0.5s ease 0.08s both; }

  /* CART CARD */
  .cart-card { background:var(--glass-card); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.25s,box-shadow 0.25s; animation:fadeUp 0.4s ease both; }
  .cart-card:hover { transform:translateY(-5px); box-shadow:0 24px 60px rgba(0,0,0,0.4); border-color:rgba(245,168,0,0.3); }
  .cart-img-wrap { position:relative; width:100%; height:180px; overflow:hidden; }
  .cart-img-wrap img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
  .cart-card:hover .cart-img-wrap img { transform:scale(1.05); }
  .cart-img-overlay { position:absolute; inset:0; background:linear-gradient(180deg,transparent 50%,rgba(5,8,20,0.65) 100%); }
  .cart-category-badge { position:absolute; top:0.75rem; right:0.75rem; background:rgba(245,168,0,0.15); border:1px solid rgba(245,168,0,0.35); backdrop-filter:blur(8px); color:var(--yellow); font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; padding:0.25rem 0.65rem; border-radius:20px; }
  .cart-body { padding:1.2rem 1.4rem; display:flex; flex-direction:column; gap:0.5rem; flex:1; }
  .cart-name { font-size:0.975rem; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cart-desc { font-size:0.74rem; color:var(--text-dim); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.5; }
  .cart-price { font-size:1.1rem; font-weight:800; color:var(--yellow); margin-top:0.25rem; }
  .cart-line-total { font-size:0.75rem; color:var(--text-dim); margin-top:0.2rem; }
  .cart-line-total strong { color:var(--text-light); font-weight:700; }
  .cart-actions { padding:0 1.4rem 1.4rem; display:flex; align-items:center; justify-content:space-between; gap:0.75rem; }
  .qty-control { display:flex; align-items:center; background:rgba(255,255,255,0.07); border:1px solid var(--glass-border); border-radius:10px; overflow:hidden; }
  .qty-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:var(--yellow); font-size:1rem; font-weight:800; background:none; border:none; cursor:pointer; transition:background 0.15s; }
  .qty-btn:hover { background:rgba(245,168,0,0.2); }
  .qty-val { min-width:34px; text-align:center; font-size:0.95rem; font-weight:700; color:white; border-left:1px solid var(--glass-border); border-right:1px solid var(--glass-border); padding:0 0.5rem; line-height:34px; }
  .btn-remove { display:inline-flex; align-items:center; gap:0.35rem; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:0.45rem 0.85rem; font-family:'Poppins',sans-serif; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; cursor:pointer; transition:all 0.2s; }
  .btn-remove:hover { background:#ef4444; color:white; transform:translateY(-1px); }

  /* SKELETON */
  .skeleton-card { min-height:300px; }
  .skeleton-img { height:180px; background:rgba(255,255,255,0.07); animation:shimmer 1.4s infinite; }
  .skeleton-line { height:14px; border-radius:6px; background:rgba(255,255,255,0.07); animation:shimmer 1.4s infinite; margin-bottom:8px; }
  @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.75} }

  /* CHECKOUT PANEL */
  .checkout-panel { background:var(--glass-card); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; padding:2rem 2.5rem; animation:fadeUp 0.5s ease 0.12s both; }
  .total-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid var(--glass-border); }
  .total-label { font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-dim); }
  .total-value { font-size:1.75rem; font-weight:800; color:var(--yellow); }

  /* COUPON */
  .coupon-box { margin-bottom:0.875rem; padding:0.75rem 0.9rem; background:rgba(255,255,255,0.03); border:1px dashed rgba(245,168,0,0.3); border-radius:10px; }
  .coupon-label { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--yellow); display:flex; align-items:center; gap:0.35rem; margin-bottom:0.5rem; }
  .coupon-row { display:flex; gap:0.4rem; }
  .coupon-input { flex:1; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:8px; color:white; font-family:'Poppins',sans-serif; font-size:0.82rem; padding:0.45rem 0.75rem; outline:none; text-transform:uppercase; letter-spacing:0.05em; transition:border-color 0.2s; }
  .coupon-input::placeholder { text-transform:none; letter-spacing:0; color:var(--text-dim); }
  .coupon-input:focus { border-color:rgba(245,168,0,0.5); }
  .coupon-input:disabled { opacity:0.5; cursor:not-allowed; }
  .btn-apply-coupon { background:var(--yellow); color:#1a1000; border:none; border-radius:8px; font-family:'Poppins',sans-serif; font-size:0.78rem; font-weight:700; padding:0.45rem 0.85rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
  .btn-apply-coupon:hover { background:var(--yellow-d); }
  .btn-apply-coupon:disabled { opacity:0.5; cursor:not-allowed; }
  .coupon-msg { font-size:0.72rem; margin-top:0.4rem; display:flex; align-items:center; gap:0.3rem; }
  .coupon-msg.success { color:#22c55e; }
  .coupon-msg.error   { color:#f87171; }
  .coupon-discount-row { display:none; justify-content:space-between; align-items:center; padding:0.4rem 0; font-size:0.82rem; border-top:1px solid rgba(255,255,255,0.06); margin-top:0.3rem; }
  .coupon-discount-row.show { display:flex; }
  .coupon-discount-label { color:#22c55e; display:flex; align-items:center; gap:0.3rem; }
  .coupon-discount-val { color:#22c55e; font-weight:700; }
  .btn-remove-coupon { background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:0.7rem; padding:0; transition:color 0.2s; margin-left:0.4rem; }
  .btn-remove-coupon:hover { color:#f87171; }

  /* DELIVERY TYPE */
  .delivery-type-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:rgba(255,255,255,0.4); margin-bottom:0.5rem; }
  .delivery-option { flex:1; border:2px solid var(--glass-border); border-radius:10px; padding:0.6rem 0.8rem; cursor:pointer; transition:all 0.2s; }
  .delivery-option.selected { border-color:var(--yellow); background:rgba(245,168,0,0.08); }
  .delivery-option.selected-express { border-color:#22c55e; background:rgba(34,197,94,0.08); }
  .del-option-title { font-size:0.65rem; font-weight:700; text-transform:uppercase; color:var(--yellow); }
  .del-option-date { font-size:0.72rem; color:rgba(255,255,255,0.7); margin-top:0.15rem; }
  .del-option-price { font-size:0.65rem; font-weight:600; color:var(--yellow); }
  .del-option-price.free { color:#22c55e; }

  /* EXPRESS BOX */
  .express-box { background:rgba(245,168,0,0.08); border:1px solid rgba(245,168,0,0.25); border-radius:14px; padding:1.1rem 1.4rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1rem; }
  .express-left { display:flex; align-items:center; gap:0.75rem; }
  .express-icon { font-size:2rem; line-height:1; }
  .express-title { font-size:0.875rem; font-weight:700; color:white; margin-bottom:0.1rem; }
  .express-sub { font-size:0.72rem; color:var(--text-dim); }
  .btn-express { display:inline-flex; align-items:center; gap:0.4rem; background:var(--yellow); color:#1a1000; border:none; border-radius:10px; padding:0.65rem 1.5rem; font-family:'Poppins',sans-serif; font-size:0.82rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; text-decoration:none; cursor:pointer; transition:all 0.3s cubic-bezier(0.23,1,0.32,1); box-shadow:0 4px 16px rgba(245,168,0,0.25); white-space:nowrap; }
  .btn-express:hover { background:var(--yellow-d); color:#1a1000; text-decoration:none; transform:translateY(-2px); box-shadow:0 8px 24px rgba(245,168,0,0.4); }
  .btn-checkout { width:100%; background:rgba(255,255,255,0.08); border:1px solid var(--glass-border); border-radius:12px; padding:0.9rem; color:var(--text-light); font-family:'Poppins',sans-serif; font-size:0.875rem; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; text-decoration:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; transition:all 0.25s; }
  .btn-checkout:hover { background:rgba(255,255,255,0.14); color:white; text-decoration:none; }

  /* EMPTY CART */
  .empty-cart { text-align:center; padding:4rem 2rem; background:var(--glass-card); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; animation:fadeUp 0.5s ease both; }
  .empty-cart-icon { font-size:3.5rem; margin-bottom:1rem; opacity:0.4; }
  .empty-cart h3 { font-size:1.1rem; font-weight:700; color:var(--text-light); margin-bottom:0.5rem; }
  .empty-cart p { font-size:0.82rem; color:var(--text-dim); margin-bottom:1.5rem; }
  .btn-shop { display:inline-flex; align-items:center; gap:0.5rem; background:var(--yellow); color:#1a1000; border:none; border-radius:10px; padding:0.7rem 1.75rem; font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; text-decoration:none; cursor:pointer; box-shadow:0 4px 16px rgba(245,168,0,0.3); transition:all 0.3s; }
  .btn-shop:hover { background:var(--yellow-d); color:#1a1000; text-decoration:none; transform:translateY(-2px); }

  /* BACK */
  .back-wrap { display:flex; justify-content:center; }
  .back-link { display:inline-flex; align-items:center; gap:0.4rem; color:var(--text-dim); text-decoration:none; font-size:0.78rem; transition:color 0.2s; }
  .back-link:hover { color:white; text-decoration:none; }

  /* FOOTER */
  .cart-footer { background:rgba(0,0,0,0.5); backdrop-filter:blur(16px); border-top:1px solid var(--glass-border); padding:1.25rem 3rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
  .footer-brand { font-size:1.1rem; font-weight:700; color:white; }
  .footer-brand span { color:var(--yellow); }
  .footer-copy { font-size:0.72rem; color:var(--text-dim); }

  /* CONFIRM MODAL */
  .confirm-overlay { position:fixed; inset:0; z-index:999; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; animation:fadeIn 0.2s ease both; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .confirm-box { background:rgba(12,15,35,0.95); border:1px solid rgba(255,255,255,0.18); border-radius:20px; padding:2.25rem 2.5rem; max-width:380px; width:90%; text-align:center; box-shadow:0 40px 100px rgba(0,0,0,0.7); animation:popIn 0.28s cubic-bezier(0.23,1,0.32,1) both; }
  @keyframes popIn { from{opacity:0;transform:scale(0.88) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
  .confirm-icon { font-size:2.5rem; margin-bottom:0.75rem; }
  .confirm-title { font-size:1.1rem; font-weight:700; color:white; margin-bottom:0.5rem; }
  .confirm-msg { font-size:0.82rem; color:rgba(255,255,255,0.55); line-height:1.55; margin-bottom:1.75rem; }
  .confirm-actions { display:flex; gap:0.75rem; justify-content:center; }
  .confirm-btn-cancel { display:inline-flex; align-items:center; gap:0.4rem; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:rgba(255,255,255,0.7); padding:0.65rem 1.4rem; border-radius:10px; font-family:'Poppins',sans-serif; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.2s; }
  .confirm-btn-cancel:hover { background:rgba(255,255,255,0.14); color:white; }
  .confirm-btn-ok { display:inline-flex; align-items:center; gap:0.4rem; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.35); color:#ef4444; padding:0.65rem 1.4rem; border-radius:10px; font-family:'Poppins',sans-serif; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.2s; }
  .confirm-btn-ok:hover { background:#ef4444; color:white; }

  /* ANIMATIONS */
  @keyframes fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn  { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

  /* RESPONSIVE */
  @media(max-width:700px) {
    .ekart-nav { padding:0.875rem 1.25rem; }
    .page { padding:5.5rem 1rem 2rem; }
    .page-header { flex-direction:column; text-align:center; }
    .checkout-panel { padding:1.5rem 1.25rem; }
    .express-box { flex-direction:column; text-align:center; }
    .express-left { justify-content:center; }
    .btn-express { width:100%; justify-content:center; }
    .cart-footer { padding:1.25rem; flex-direction:column; text-align:center; }
  }
  @media(max-width:800px) {
    .nav-link-btn span { display:none; }
    .nav-link-btn { padding:0.4rem 0.6rem; }
  }
  @media(max-width:500px) {
    .nav-right { gap:0.4rem; }
  }
`;