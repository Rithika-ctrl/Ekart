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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function addBusinessDays(date, n) {
  const d = new Date(date); let added = 0;
  while (added < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
  return d;
}
function formatDate(d) {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position:'fixed', bottom:'2rem', right:'2rem', zIndex:9999, display:'flex', flexDirection:'column', gap:'0.65rem' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:'rgba(10,12,30,0.95)', backdropFilter:'blur(16px)',
          border:`1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
          borderRadius:12, padding:'0.875rem 1.4rem',
          display:'flex', alignItems:'center', gap:'0.7rem',
          fontSize:'0.82rem', minWidth:240, animation:'slideIn 0.3s ease both',
        }}>
          <i className={`fas fa-${t.type === 'success' ? 'check-circle' : 'times-circle'}`}
            style={{ color: t.type === 'success' ? '#22c55e' : '#ef4444' }} />
          <span style={{ color:'white' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Payment
// ═══════════════════════════════════════════════════════════════════════════════
export default function Payment() {
  const navigate  = useNavigate();
  const customer  = getStoredCustomer();

  // ── Data ─────────────────────────────────────────────────────────────────
  const [cartItems,   setCartItems]   = useState([]);
  const [address,     setAddress]     = useState(null);   // last saved address obj
  const [razorpayKey, setRazorpayKey] = useState('');
  const [loading,     setLoading]     = useState(true);
  const [paying,      setPaying]      = useState(false);  // online pay spinner
  const [codLoading,  setCodLoading]  = useState(false);

  // ── Nav ───────────────────────────────────────────────────────────────────
  const [navScrolled, setNavScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toasts,      setToasts]      = useState([]);

  // ── Pin code checker ──────────────────────────────────────────────────────
  const [pinInput,       setPinInput]       = useState(() => localStorage.getItem('ekart_delivery_pin') || '');
  const [pinResult,      setPinResult]      = useState(null);   // { ok, html }
  const [pinChecking,    setPinChecking]    = useState(false);
  const [verifiedPin,    setVerifiedPin]    = useState(() => localStorage.getItem('ekart_delivery_pin') || '');

  // ── Session values ────────────────────────────────────────────────────────
  const deliveryType    = sessionStorage.getItem('ekart_delivery_type')    || 'standard';
  const couponCode      = sessionStorage.getItem('ekart_coupon_code')      || '';
  const couponDiscount  = parseFloat(sessionStorage.getItem('ekart_coupon_discount')) || 0;
  const isExpress       = deliveryType === 'express';

  // ── Dates ─────────────────────────────────────────────────────────────────
  const today    = new Date();
  const stdDate  = formatDate(addBusinessDays(today, 5));
  const cutoff   = new Date(today); cutoff.setHours(14, 0, 0, 0);
  const expDate  = formatDate(addBusinessDays(today, today < cutoff ? 1 : 2));
  const deliveryDateStr = isExpress ? expDate : stdDate;

  // ── Derived totals ────────────────────────────────────────────────────────
  const cartSubtotal = cartItems.reduce((s, p) => {
    const unit = p.unitPrice > 0 ? p.unitPrice : p.price / (p.quantity || 1);
    return s + unit * (p.quantity || 1);
  }, 0);

  const baseDelivery   = cartSubtotal >= 500 ? 0 : 40;
  const expressCharge  = isExpress ? 129 : 0;
  const deliveryCharge = baseDelivery + expressCharge;
  const grandTotal     = Math.max(cartSubtotal + deliveryCharge - couponDiscount, 0);

  const totalGst = cartItems.reduce((sum, p) => {
    const rate      = getGstRate(p.category || '');
    const unit      = p.unitPrice > 0 ? p.unitPrice : p.price / (p.quantity || 1);
    const lineTotal = unit * (p.quantity || 1);
    return sum + calcGstFromInclusive(lineTotal, rate);
  }, 0);

  const taxableBase = cartSubtotal - totalGst;
  const gstRates    = [...new Set(cartItems.map(p => getGstRate(p.category || '')).filter(r => r > 0))].sort((a,b)=>a-b);
  const gstLabel    = gstRates.length === 0 ? 'GST (0%)' :
                      gstRates.length === 1 ? `GST (${gstRates[0]}%, incl.)` :
                      `GST (${gstRates[0]}–${gstRates[gstRates.length-1]}%, incl.)`;

  const deliveryLabel = isExpress
    ? `Express | Expected by ${deliveryDateStr}`
    : `Standard | Expected by ${deliveryDateStr}`;

  // ─────────────────────────────────────────────────────────────────────────
  //  Toast helper
  // ─────────────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  Fetch cart + address + razorpay key
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!customer) { navigate('/login'); return; }

    Promise.all([
      api.get('/api/flutter/cart',    { headers: { 'X-Customer-Id': customer.id } }),
      api.get('/api/flutter/auth/me', { headers: { 'Authorization': `Bearer ${localStorage.getItem('ekart_token')}` } }),
      api.get('/api/flutter/payment/key').catch(() => ({ data: { key: '' } })),
    ]).then(([cartRes, meRes, keyRes]) => {
      const items   = cartRes.data.items || cartRes.data.cart?.items || [];
      setCartItems(items);

      const cust    = meRes.data.customer || meRes.data;
      const addrs   = cust?.addresses || [];
      if (addrs.length > 0) setAddress(addrs[addrs.length - 1]);

      setRazorpayKey(keyRes.data?.key || keyRes.data?.razorpayKeyId || '');
    }).catch(() => {
      addToast('Could not load payment details', 'error');
    }).finally(() => setLoading(false));
  }, []);

  // ── Nav scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ── Close profile on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = () => setProfileOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Load Razorpay script ───────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return;
    const s = document.createElement('script');
    s.id  = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(s);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  Pin code check
  // ─────────────────────────────────────────────────────────────────────────
  const checkPin = useCallback(async () => {
    const pin = pinInput.trim();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPinResult({ ok: false, html: '<span style="color:#ff8060;"><i class="fas fa-exclamation-circle"></i> Please enter a valid 6-digit pin code.</span>' });
      return;
    }
    setPinChecking(true);
    setPinResult(null);
    try {
      const r = await api.get(`/api/check-pincode?pinCode=${encodeURIComponent(pin)}`);
      const blocked = r.data.blockedItems || [];
      if (!r.data.hasRestrictions || blocked.length === 0) {
        setVerifiedPin(pin);
        localStorage.setItem('ekart_delivery_pin', pin);
        setPinResult({ ok: true, html: `<div style="color:#22c55e;"><i class="fas fa-check-circle"></i> All items deliver to <strong>${pin}</strong>. You're good to go!</div>` });
      } else {
        setVerifiedPin('');
        let html = `<div style="color:#ff8060;margin-bottom:0.4rem;"><i class="fas fa-times-circle"></i> <strong>${blocked.length} item(s)</strong> cannot be delivered to <strong>${pin}</strong>:</div>`;
        html += '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.3rem;">';
        blocked.forEach(name => { html += `<li style="font-size:0.78rem;color:rgba(255,100,80,0.85);padding-left:1rem;"><i class="fas fa-ban" style="font-size:0.65rem;margin-right:0.3rem;"></i>${name}</li>`; });
        html += '</ul><div style="margin-top:0.5rem;font-size:0.75rem;color:rgba(255,255,255,0.45);">Please remove those items or try a different pin code.</div>';
        setPinResult({ ok: false, html });
      }
    } catch {
      // fail open — server re-validates
      setVerifiedPin(pin);
      setPinResult({ ok: true, html: '<span style="color:rgba(255,255,255,0.5);font-size:0.78rem;"><i class="fas fa-info-circle"></i> Could not verify — proceeding with checkout.</span>' });
    } finally {
      setPinChecking(false);
    }
  }, [pinInput]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Online Pay (Razorpay)
  // ─────────────────────────────────────────────────────────────────────────
  const handleOnlinePay = useCallback(async () => {
    if (!address) { addToast('Please add a shipping address first', 'error'); return; }
    setPaying(true);
    try {
      const options = {
        key:      razorpayKey,
        amount:   Math.round(grandTotal * 100),
        currency: 'INR',
        name:     'Ekart Shop',
        description: 'Order Payment',
        handler: async (response) => {
          try {
            await api.post('/success', {
              amount:              grandTotal,
              paymentMode:         'Online',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              deliveryTime:        deliveryLabel,
              deliveryPinCode:     verifiedPin,
            });
            // Clear session coupons/delivery
            sessionStorage.removeItem('ekart_coupon_code');
            sessionStorage.removeItem('ekart_coupon_discount');
            navigate('/order-success');
          } catch {
            addToast('Payment recorded but order confirmation failed. Contact support.', 'error');
          }
        },
        prefill: { name: customer?.name || '', email: customer?.email || '' },
        theme:   { color: '#f5a800' },
        modal:   { ondismiss: () => setPaying(false) },
      };
      new window.Razorpay(options).open();
    } catch {
      addToast('Could not initiate payment. Try again.', 'error');
      setPaying(false);
    }
  }, [razorpayKey, grandTotal, deliveryLabel, verifiedPin, address, customer, navigate, addToast]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Cash on Delivery
  // ─────────────────────────────────────────────────────────────────────────
  const handleCOD = useCallback(async () => {
    if (!address) { addToast('Please add a shipping address first', 'error'); return; }
    setCodLoading(true);
    try {
      await api.post('/success', {
        amount:              grandTotal,
        paymentMode:         'Cash on Delivery',
        razorpay_payment_id: 'COD_NA',
        razorpay_order_id:   'COD_ORDER',
        deliveryTime:        deliveryLabel,
        deliveryPinCode:     verifiedPin,
      });
      sessionStorage.removeItem('ekart_coupon_code');
      sessionStorage.removeItem('ekart_coupon_discount');
      navigate('/order-success');
    } catch {
      addToast('Could not place COD order. Try again.', 'error');
    } finally {
      setCodLoading(false);
    }
  }, [grandTotal, deliveryLabel, verifiedPin, address, navigate, addToast]);

  const handleLogout = () => { clearToken(); navigate('/login'); };

  // ── Address display helpers ────────────────────────────────────────────────
  const hasStructuredAddress = address?.recipientName && address.recipientName.trim() !== '';

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', fontFamily:"'Poppins', sans-serif", color:'white' }}>
      <style>{PAYMENT_CSS}</style>

      <div className="bg-layer" />
      <Toast toasts={toasts} />

      {/* ── NAVBAR ── */}
      <nav className={`ekart-nav${navScrolled ? ' scrolled' : ''}`} id="nav">
        <Link to="/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize:'1rem' }} />
          Ek<span>art</span>
        </Link>
        <div className="nav-right">
          <Link to="/cart" className="nav-link-btn">
            <i className="fas fa-arrow-left" /> Back to Cart
          </Link>

          {/* Profile dropdown */}
          <div className="nav-profile-menu" onClick={e => e.stopPropagation()}>
            <button className="nav-profile-btn" onClick={() => setProfileOpen(v => !v)}>
              <i className="fas fa-user-circle" />
            </button>
            {profileOpen && (
              <div className="nav-profile-dropdown open">
                <div className="nav-profile-name">
                  <i className="fas fa-user" /><span>{customer?.name || 'Account'}</span>
                </div>
                <Link to="/customer/profile"  className="nav-profile-item"><i className="fas fa-id-card" /> My Profile</Link>
                <Link to="/customer/address"  className="nav-profile-item"><i className="fas fa-map-marker-alt" /> Addresses</Link>
                <Link to="/security-settings" className="nav-profile-item"><i className="fas fa-shield-alt" /> Security</Link>
                <div className="nav-profile-divider" />
                <button className="nav-profile-item nav-profile-logout"
                  style={{ background:'none', border:'none', width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem' }}
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

        {/* Express badge */}
        {isExpress && (
          <div className="express-badge">
            ⚡ Express Checkout — Almost done!
          </div>
        )}

        {/* Delivery type banner */}
        <div className={`delivery-type-banner${isExpress ? ' express' : ''}`}>
          <i className={`fas ${isExpress ? 'fa-bolt' : 'fa-box'}`} />
          <span>
            {isExpress
              ? `Express Delivery — ${deliveryDateStr} (+₹129)`
              : `Standard Delivery — ${deliveryDateStr}`}
          </span>
          <span className="del-banner-change">
            · <Link to="/cart" style={{ color:'var(--yellow)', textDecoration:'none' }}>Change</Link>
          </span>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Complete Your <span>Payment</span> 💳</h1>
            <p>Choose your delivery speed and preferred payment method below.</p>
          </div>
          <div className="page-header-icon">🛒</div>
        </div>

        {/* Payment Grid */}
        <div className="payment-grid">

          {/* ── LEFT COLUMN ── */}
          <div className="payment-left">

            {/* Shipping Address */}
            <div className="glass-card">
              <div className="section-label"><i className="fas fa-truck" /> Shipping Address</div>
              {loading ? (
                <div className="skeleton-block" />
              ) : address ? (
                <div className="address-box">
                  <div>
                    {hasStructuredAddress ? (
                      <>
                        <div style={{ fontSize:'0.875rem', fontWeight:700, color:'white', marginBottom:'0.2rem' }}>
                          {address.recipientName}
                        </div>
                        {address.houseStreet && <div className="address-text">{address.houseStreet}</div>}
                        <div className="address-text">
                          {[address.city, address.state].filter(Boolean).join(', ')}
                        </div>
                        {address.postalCode && (
                          <div style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', marginTop:'0.3rem', fontSize:'0.75rem', fontWeight:700, color:'var(--yellow)' }}>
                            <i className="fas fa-location-dot" style={{ fontSize:'0.6rem' }} />
                            {address.postalCode}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="address-text">{address.details}</div>
                    )}
                  </div>
                  <Link to="/customer/address" className="change-link">
                    <i className="fas fa-pen" style={{ fontSize:'.65rem' }} /> Change
                  </Link>
                </div>
              ) : (
                <div className="address-warn">
                  <i className="fas fa-exclamation-triangle" /> No shipping address.{' '}
                  <Link to="/customer/address" style={{ color:'var(--yellow)', textDecoration:'none' }}>Add one →</Link>
                </div>
              )}
            </div>

            {/* Cart Items */}
            {!loading && cartItems.length > 0 && (
              <div className="glass-card">
                <div className="section-label"><i className="fas fa-shopping-bag" /> Your Items</div>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign:'center' }}>Qty</th>
                      <th style={{ textAlign:'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map(item => {
                      const unit  = item.unitPrice > 0 ? item.unitPrice : item.price / (item.quantity || 1);
                      const total = unit * (item.quantity || 1);
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="item-name">{item.name}</div>
                            <div className="item-cat">{item.category}</div>
                          </td>
                          <td style={{ textAlign:'center' }}>
                            <span className="item-qty">{item.quantity}</span>
                          </td>
                          <td>₹{fmt(total)}</td>
                        </tr>
                      );
                    })}
                    <tr className="items-total-row">
                      <td colSpan={2} style={{ color:'var(--text-dim)' }}>{cartItems.length} item(s)</td>
                      <td style={{ color:'var(--yellow)', fontSize:'1rem', fontWeight:800 }}>₹{fmt(cartSubtotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="glass-card">
              <div className="section-label"><i className="fas fa-receipt" /> Price Breakdown</div>

              <div className="price-row">
                <span className="label">Cart Subtotal</span>
                <span className="value">₹{fmt(cartSubtotal)}</span>
              </div>

              {totalGst > 0 && (
                <div className="price-row" style={{ fontSize:'0.82rem' }}>
                  <span className="label" style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
                    <i className="fas fa-file-invoice" style={{ fontSize:'0.7rem', color:'var(--yellow)' }} />
                    {gstLabel}
                    <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.25)' }}>(incl.)</span>
                  </span>
                  <span className="value" style={{ color:'rgba(255,255,255,0.55)' }}>₹{totalGst.toFixed(2)}</span>
                </div>
              )}

              {totalGst > 0 && (
                <div className="price-row" style={{ fontSize:'0.78rem' }}>
                  <span className="label" style={{ color:'rgba(255,255,255,0.3)' }}>Taxable value</span>
                  <span className="value" style={{ color:'rgba(255,255,255,0.4)', fontWeight:400 }}>₹{fmt(taxableBase)}</span>
                </div>
              )}

              <div className="price-row">
                <span className="label">
                  {isExpress ? 'Delivery (Express +₹129)' : 'Delivery Charge'}
                </span>
                {deliveryCharge === 0
                  ? <span className="value tag-free">FREE</span>
                  : <span className="value tag-charge">₹{deliveryCharge}</span>
                }
              </div>

              {couponDiscount > 0 && couponCode && (
                <div className="price-row">
                  <span className="label" style={{ color:'#22c55e' }}>
                    <i className="fas fa-tag" style={{ fontSize:'0.7rem', marginRight:3 }} /> Coupon Discount
                  </span>
                  <span className="value" style={{ color:'#22c55e' }}>−₹{fmt(couponDiscount)}</span>
                </div>
              )}

              <div className="price-row total">
                <span className="label">Grand Total</span>
                <span className="value">₹{fmt(grandTotal)}</span>
              </div>
            </div>

            {/* Pin Code Checker */}
            <div className="glass-card">
              <div className="section-label"><i className="fas fa-map-marker-alt" /> Delivery Pin Code</div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-dim)', marginBottom:'0.875rem', lineHeight:1.6 }}>
                Verify your pin code to confirm all items can be delivered to your location.
              </div>
              <div className="pin-row">
                <input
                  className="pin-input"
                  type="text"
                  placeholder="Enter 6-digit pin"
                  maxLength={6}
                  inputMode="numeric"
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinResult(null); setVerifiedPin(''); }}
                  onKeyDown={e => e.key === 'Enter' && checkPin()}
                />
                <button className="btn-check-pin" onClick={checkPin} disabled={pinChecking}>
                  {pinChecking
                    ? <><i className="fas fa-spinner fa-spin" /> Checking…</>
                    : <><i className="fas fa-search" /> Check</>
                  }
                </button>
              </div>
              {pinResult && (
                <div className="pin-result" dangerouslySetInnerHTML={{ __html: pinResult.html }} />
              )}
              {verifiedPin && !pinResult?.html?.includes('fa-times') && (
                <div style={{ fontSize:'0.68rem', color:'rgba(34,197,94,0.7)', marginTop:'0.4rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <i className="fas fa-shield-alt" /> Delivering to pin: <strong>{verifiedPin}</strong>
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="payment-right">

            {/* Final Total */}
            <div className="glass-card">
              <div className="section-label"><i className="fas fa-wallet" /> Order Total</div>
              <div className="final-box">
                <div className="final-label">Amount to Pay</div>
                <div className="final-amount">₹{fmt(grandTotal)}</div>
                {couponDiscount > 0 && couponCode && (
                  <div style={{ color:'#22c55e', fontSize:'0.72rem', marginTop:'0.3rem' }}>
                    <i className="fas fa-tag" style={{ marginRight:4 }} />
                    Coupon <strong>{couponCode}</strong> applied — saving ₹{fmt(couponDiscount)}
                  </div>
                )}
                <div className="final-sub">All taxes included · Secure checkout</div>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              <div className="section-label"><i className="fas fa-credit-card" /> Payment Method</div>

              {/* Online Pay */}
              <button
                className="btn-pay btn-online"
                onClick={handleOnlinePay}
                disabled={paying || codLoading}
              >
                {paying
                  ? <><i className="fas fa-spinner fa-spin" /> Processing…</>
                  : <><i className="fas fa-globe" /> Pay Online</>
                }
              </button>

              {/* COD */}
              <button
                className="btn-pay btn-cod"
                onClick={handleCOD}
                disabled={paying || codLoading}
              >
                {codLoading
                  ? <><i className="fas fa-spinner fa-spin" /> Placing Order…</>
                  : <><i className="fas fa-hand-holding-usd" /> Cash on Delivery</>
                }
              </button>

              <Link to="/cart" className="cancel-link">
                <i className="fas fa-arrow-left" style={{ fontSize:'.7rem' }} /> Cancel & Go Back
              </Link>
            </div>

            {/* Security note */}
            <div style={{ textAlign:'center', fontSize:'0.72rem', color:'var(--text-dim)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
              <i className="fas fa-lock" style={{ color:'var(--yellow)', fontSize:'.65rem' }} />
              Secured by 256-bit SSL encryption
            </div>

            {/* Delivery summary card */}
            <div className="glass-card" style={{ fontSize:'0.82rem', color:'var(--text-dim)' }}>
              <div className="section-label"><i className="fas fa-shipping-fast" /> Delivery Summary</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Type</span>
                  <span style={{ color:'white', fontWeight:600 }}>{isExpress ? '⚡ Express' : '📦 Standard'}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--glass-border)', paddingTop:'0.6rem' }}>
                  <span>Expected By</span>
                  <span style={{ color:'var(--yellow)', fontWeight:600 }}>{deliveryDateStr}</span>
                </div>
                {isExpress && (
                  <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--glass-border)', paddingTop:'0.6rem' }}>
                    <span>Express Surcharge</span>
                    <span style={{ color:'#22c55e', fontWeight:600 }}>+₹129</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="pay-footer">
        <div className="footer-brand">Ek<span>art</span></div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>
    </div>
  );
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────
const PAYMENT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  :root {
    --yellow: #f5a800; --yellow-d: #d48f00;
    --glass-border: rgba(255,255,255,0.22); --glass-card: rgba(255,255,255,0.13);
    --text-white: #fff; --text-light: rgba(255,255,255,0.80); --text-dim: rgba(255,255,255,0.50);
    --input-bg: rgba(255,255,255,0.07); --input-border: rgba(255,255,255,0.18);
    --success: #22c55e; --danger: #ff6060;
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
  .nav-link-btn { display:flex; align-items:center; gap:0.4rem; color:var(--text-light); text-decoration:none; font-size:0.82rem; font-weight:500; padding:0.45rem 0.9rem; border-radius:6px; border:1px solid var(--glass-border); transition:all 0.2s; }
  .nav-link-btn:hover { color:white; background:rgba(255,255,255,0.1); text-decoration:none; }
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
  .page { flex:1; padding:6.5rem 1.5rem 3rem; display:flex; flex-direction:column; align-items:center; gap:1.25rem; }

  /* EXPRESS BADGE */
  .express-badge { display:inline-flex; align-items:center; gap:0.4rem; background:rgba(245,168,0,0.18); border:1px solid rgba(245,168,0,0.4); color:var(--yellow); padding:0.3rem 1rem; border-radius:50px; font-size:0.75rem; font-weight:700; letter-spacing:0.06em; animation:fadeUp 0.4s ease both; }

  /* DELIVERY TYPE BANNER */
  .delivery-type-banner { display:inline-flex; align-items:center; gap:0.5rem; background:rgba(245,168,0,0.12); border:1px solid rgba(245,168,0,0.35); border-radius:50px; padding:0.4rem 1.1rem; font-size:0.78rem; font-weight:600; color:var(--yellow); animation:fadeUp 0.4s ease both; }
  .delivery-type-banner.express { background:rgba(34,197,94,0.1); border-color:rgba(34,197,94,0.35); color:#22c55e; }
  .del-banner-change { font-size:0.72rem; color:var(--text-dim); }

  /* PAGE HEADER */
  .page-header { background:var(--glass-card); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; padding:2rem 2.5rem; display:flex; align-items:center; justify-content:space-between; gap:1.5rem; width:100%; max-width:900px; animation:fadeUp 0.5s ease both; }
  .page-header-left h1 { font-size:clamp(1.2rem,2.5vw,1.75rem); font-weight:700; margin-bottom:0.25rem; }
  .page-header-left h1 span { color:var(--yellow); }
  .page-header-left p { font-size:0.825rem; color:var(--text-dim); }
  .page-header-icon { width:60px; height:60px; background:rgba(245,168,0,0.15); border:2px solid rgba(245,168,0,0.3); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; flex-shrink:0; }

  /* PAYMENT GRID */
  .payment-grid { display:grid; grid-template-columns:1fr 340px; gap:1.5rem; width:100%; max-width:900px; animation:fadeUp 0.5s 0.05s ease both; align-items:start; }
  .payment-left  { display:flex; flex-direction:column; gap:1.25rem; }
  .payment-right { display:flex; flex-direction:column; gap:1.25rem; position:sticky; top:5.5rem; }

  /* GLASS CARD */
  .glass-card { background:var(--glass-card); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; padding:2rem; }

  /* SECTION LABEL */
  .section-label { display:flex; align-items:center; gap:0.6rem; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--yellow); margin-bottom:1.25rem; }
  .section-label::after { content:''; flex:1; height:1px; background:var(--glass-border); }

  /* ADDRESS */
  .address-box { background:rgba(255,255,255,0.05); border:1px solid var(--input-border); border-radius:12px; padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; }
  .address-text { font-size:0.875rem; color:var(--text-light); line-height:1.6; }
  .address-warn { font-size:0.825rem; color:#ff8060; display:flex; align-items:center; gap:0.4rem; }
  .change-link  { font-size:0.75rem; color:var(--yellow); text-decoration:none; white-space:nowrap; transition:opacity 0.2s; flex-shrink:0; display:flex; align-items:center; gap:0.3rem; }
  .change-link:hover { opacity:0.75; text-decoration:underline; }

  /* ITEMS TABLE */
  .items-table { width:100%; border-collapse:collapse; }
  .items-table th { font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-dim); padding:0 0 0.6rem; border-bottom:1px solid var(--glass-border); text-align:left; }
  .items-table th:last-child { text-align:right; }
  .items-table td { padding:0.65rem 0; font-size:0.825rem; color:var(--text-light); border-bottom:1px solid rgba(255,255,255,0.05); vertical-align:middle; }
  .items-table td:last-child { text-align:right; font-weight:700; color:white; }
  .item-name { font-weight:600; color:white; max-width:200px; }
  .item-cat  { font-size:0.7rem; color:var(--text-dim); margin-top:0.1rem; }
  .item-qty  { display:inline-flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.08); border-radius:6px; padding:0.15rem 0.55rem; font-size:0.78rem; font-weight:600; }
  .items-total-row td { border-bottom:none; padding-top:0.75rem; border-top:1px solid var(--glass-border); font-size:0.875rem; }

  /* PRICE BREAKDOWN */
  .price-row { display:flex; justify-content:space-between; align-items:center; padding:0.55rem 0; font-size:0.875rem; }
  .price-row + .price-row { border-top:1px solid rgba(255,255,255,0.07); }
  .price-row .label { color:var(--text-dim); }
  .price-row .value { font-weight:600; }
  .price-row.total { border-top:1px solid var(--glass-border); margin-top:0.5rem; padding-top:0.75rem; }
  .price-row.total .label { color:var(--text-light); font-weight:600; }
  .price-row.total .value { font-size:1.4rem; font-weight:800; color:var(--yellow); }
  .tag-free   { color:var(--success); font-weight:700; }
  .tag-charge { color:#ff8060; font-weight:700; }

  /* PIN CODE */
  .pin-row { display:flex; gap:0.5rem; margin-bottom:0.6rem; }
  .pin-input { flex:1; background:var(--input-bg); border:1px solid var(--input-border); border-radius:10px; color:white; font-family:'Poppins',sans-serif; font-size:0.875rem; padding:0.7rem 1rem; outline:none; transition:border-color 0.25s; letter-spacing:0.08em; }
  .pin-input:focus { border-color:rgba(245,168,0,0.55); box-shadow:0 0 0 3px rgba(245,168,0,0.12); }
  .pin-input::placeholder { color:rgba(255,255,255,0.28); letter-spacing:0; }
  .btn-check-pin { background:var(--yellow); color:#1a1000; border:none; border-radius:10px; padding:0.7rem 1.1rem; font-family:'Poppins',sans-serif; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.2s; white-space:nowrap; display:flex; align-items:center; gap:0.4rem; }
  .btn-check-pin:hover:not(:disabled) { background:var(--yellow-d); }
  .btn-check-pin:disabled { opacity:0.6; cursor:not-allowed; }
  .pin-result { margin-top:0.5rem; font-size:0.82rem; line-height:1.6; }

  /* FINAL BOX */
  .final-box { background:rgba(245,168,0,0.08); border:1.5px solid rgba(245,168,0,0.3); border-radius:14px; padding:1.25rem 1.5rem; }
  .final-label  { font-size:0.72rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.4rem; }
  .final-amount { font-size:2rem; font-weight:800; color:var(--yellow); line-height:1; }
  .final-sub    { font-size:0.72rem; color:var(--text-dim); margin-top:0.35rem; }

  /* PAY BUTTONS */
  .btn-pay { width:100%; border:none; border-radius:12px; padding:0.95rem 1rem; font-family:'Poppins',sans-serif; font-size:0.875rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; transition:all 0.3s cubic-bezier(0.23,1,0.32,1); }
  .btn-online { background:var(--yellow); color:#1a1000; box-shadow:0 8px 24px rgba(245,168,0,0.3); }
  .btn-online:hover:not(:disabled) { background:var(--yellow-d); transform:translateY(-2px); box-shadow:0 12px 32px rgba(245,168,0,0.45); }
  .btn-cod { background:rgba(34,197,94,0.12); color:var(--success); border:1.5px solid rgba(34,197,94,0.35) !important; }
  .btn-cod:hover:not(:disabled) { background:rgba(34,197,94,0.2); transform:translateY(-2px); box-shadow:0 8px 24px rgba(34,197,94,0.2); }
  .btn-pay:disabled { opacity:0.6; cursor:not-allowed; transform:none !important; }
  .cancel-link { display:flex; align-items:center; justify-content:center; gap:0.4rem; color:var(--text-dim); text-decoration:none; font-size:0.78rem; transition:color 0.2s; margin-top:0.25rem; }
  .cancel-link:hover { color:white; text-decoration:none; }

  /* SKELETON */
  .skeleton-block { height:80px; border-radius:12px; background:rgba(255,255,255,0.07); animation:shimmer 1.4s infinite; }
  @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.75} }

  /* FOOTER */
  .pay-footer { background:rgba(0,0,0,0.5); backdrop-filter:blur(16px); border-top:1px solid var(--glass-border); padding:1.25rem 3rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
  .footer-brand { font-size:1.1rem; font-weight:700; color:white; }
  .footer-brand span { color:var(--yellow); }
  .footer-copy { font-size:0.72rem; color:var(--text-dim); }

  /* ANIMATIONS */
  @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

  /* RESPONSIVE */
  @media(max-width:780px) {
    .ekart-nav { padding:0.875rem 1.25rem; }
    .page { padding:5.5rem 1rem 2rem; }
    .page-header { flex-direction:column; text-align:center; }
    .payment-grid { grid-template-columns:1fr; }
    .payment-right { position:static; }
    .pay-footer { padding:1.25rem; flex-direction:column; text-align:center; }
  }
`;