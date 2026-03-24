import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getStoredCustomer, clearToken } from '../utils/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function addBusinessDays(from, n) {
  let d = new Date(from), added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

function StarRow({ avg = 0, size = '0.72rem' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const cls = i <= avg ? 'fas fa-star' : i - 0.5 <= avg ? 'fas fa-star-half-alt' : 'far fa-star';
        const col = i <= avg || i - 0.5 <= avg ? 'var(--yellow)' : 'rgba(255,255,255,0.22)';
        return <i key={i} className={cls} style={{ color: col, fontSize: size }} />;
      })}
    </span>
  );
}

// ─── Toast stack ──────────────────────────────────────────────────────────────
function ToastStack({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'rgba(10,12,30,0.95)', backdropFilter: 'blur(16px)',
          border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
          borderRadius: 12, padding: '0.875rem 1.4rem',
          display: 'flex', alignItems: 'center', gap: '0.7rem',
          fontSize: '0.82rem', minWidth: 220, animation: 'slideIn 0.3s ease both',
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
export default function ProductDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const customer    = getStoredCustomer();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [product,   setProduct]   = useState(null);
  const [similar,   setSimilar]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [cartCount, setCartCount] = useState(0);

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [heroImg,       setHeroImg]       = useState('');
  const [activeThumb,   setActiveThumb]   = useState(0);
  const [quantity,      setQuantity]      = useState(1);
  const [wishlistActive,setWishlistActive]= useState(false);
  const [navScrolled,   setNavScrolled]   = useState(false);
  const [toasts,        setToasts]        = useState([]);

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [lightboxSrc,   setLightboxSrc]   = useState('');
  const [shareOpen,     setShareOpen]     = useState(false);
  const [guestOpen,     setGuestOpen]     = useState(false);
  const [copied,        setCopied]        = useState(false);

  // ── Review form ─────────────────────────────────────────────────────────────
  const [reviewRating,  setReviewRating]  = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // ── Cart / add loading ───────────────────────────────────────────────────────
  const [addingCart,    setAddingCart]    = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // ── Notify me ───────────────────────────────────────────────────────────────
  const [notifySubscribed, setNotifySubscribed] = useState(false);
  const [notifyLoading,    setNotifyLoading]    = useState(false);

  // ── PIN code check ───────────────────────────────────────────────────────────
  const [pinInput,     setPinInput]     = useState(() => localStorage.getItem('ekart_delivery_pin') || '');
  const [pinResult,    setPinResult]    = useState(null); // { ok, msg }
  const [checkingPin,  setCheckingPin]  = useState(false);

  // ── Delivery dates ───────────────────────────────────────────────────────────
  const now       = new Date();
  const cutoff    = new Date(now); cutoff.setHours(14, 0, 0, 0);
  const stdDate   = fmtDate(addBusinessDays(now, 5));
  const expDays   = now < cutoff ? 1 : 2;
  const expDate   = fmtDate(addBusinessDays(now, expDays));
  const hoursLeft = Math.max(0, Math.floor((cutoff - now) / 3600000));
  const minsLeft  = Math.max(0, Math.floor(((cutoff - now) % 3600000) / 60000));
  const expCountdown = now < cutoff ? `${hoursLeft}h ${minsLeft}m` : 'tomorrow';

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  // ── Nav scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setNavScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  // ── Fetch product ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const headers = customer ? { 'X-Customer-Id': customer.id } : {};

    Promise.all([
      api.get(`/api/flutter/products/${id}`),
      customer
        ? api.get('/api/flutter/wishlist/ids', { headers: { 'X-Customer-Id': customer.id } })
        : Promise.resolve({ data: { ids: [] } }),
      customer
        ? api.get('/api/flutter/cart', { headers: { 'X-Customer-Id': customer.id } })
        : Promise.resolve({ data: { count: 0 } }),
    ]).then(([prodRes, wishRes, cartRes]) => {
      const p = prodRes.data.product;
      if (!p) { navigate('/home'); return; }
      setProduct(p);
      setHeroImg(p.imageLink);

      // Similar products — fetch from category filter
      api.get(`/api/flutter/products?category=${encodeURIComponent(p.category)}`)
        .then(r => {
          const list = (r.data.products || []).filter(x => x.id !== p.id).slice(0, 8);
          setSimilar(list);
        })
        .catch(() => {});

      // Wishlist state
      const ids = wishRes.data.ids || [];
      setWishlistActive(ids.includes(p.id));

      // Cart count
      setCartCount(cartRes.data.count || 0);

      // Notify me status
      if (p.stock === 0 && customer) {
        api.get(`/api/notify-me/${p.id}`)
          .then(r => { if (r.data.subscribed) setNotifySubscribed(true); })
          .catch(() => {});
      }

      // Auto-check saved pin
      if (localStorage.getItem('ekart_delivery_pin')) {
        checkPin(localStorage.getItem('ekart_delivery_pin'));
      }
    }).catch(() => navigate('/home'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Pin check ────────────────────────────────────────────────────────────────
  const checkPin = (pin) => {
    if (!/^\d{6}$/.test(pin)) { setPinResult({ ok: false, msg: 'Enter a valid 6-digit pin code' }); return; }
    setCheckingPin(true);
    api.get(`/api/check-pincode?pinCode=${pin}`)
      .then(r => {
        if (r.data.success) setPinResult({ ok: true, msg: `✓ Delivery available to ${pin}` });
        else setPinResult({ ok: false, msg: `✗ ${r.data.message || 'Not serviceable yet'}` });
      })
      .catch(() => setPinResult({ ok: true, msg: `✓ Delivery available` }))
      .finally(() => setCheckingPin(false));
  };

  // ── Add to cart ───────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!customer) { setGuestOpen(true); return; }
    setAddingCart(true);
    try {
      const res = await api.post(
        '/api/flutter/cart/add',
        { productId: product.id, quantity },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      if (res.data.success) {
        setCartCount(c => c + quantity);
        addToast(`${quantity} item${quantity > 1 ? 's' : ''} added to cart 🛒`, 'success');
        setAddedFeedback(true);
        setTimeout(() => setAddedFeedback(false), 1800);
      } else {
        addToast(res.data.message || 'Could not add to cart', 'error');
      }
    } catch { addToast('Network error — please try again', 'error'); }
    finally   { setAddingCart(false); }
  };

  // ── Wishlist ─────────────────────────────────────────────────────────────────
  const handleWishlist = async () => {
    if (!customer) { addToast('Please log in to use Wishlist', 'error'); return; }
    try {
      const res = await api.post(
        '/api/flutter/wishlist/toggle',
        { productId: product.id },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      if (res.data.success) {
        const added = res.data.wishlisted;
        setWishlistActive(added);
        addToast(added ? 'Added to Wishlist ❤️' : 'Removed from Wishlist', added ? 'success' : 'error');
      } else {
        addToast(res.data.message || 'Please log in', 'error');
      }
    } catch { addToast('Something went wrong', 'error'); }
  };

  // ── Review submit ─────────────────────────────────────────────────────────────
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!customer) { addToast('Please log in to post a review', 'error'); return; }
    if (!reviewComment.trim()) { addToast('Please write a comment', 'error'); return; }
    setReviewLoading(true);
    try {
      const res = await api.post(
        '/api/flutter/reviews/add',
        { productId: product.id, rating: reviewRating, comment: reviewComment.trim() },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      if (res.data.success) {
        addToast('Review posted! ✓', 'success');
        setReviewComment('');
        setReviewRating(5);
        // Refresh reviews
        api.get(`/api/flutter/products/${id}`).then(r => setProduct(r.data.product)).catch(() => {});
      } else {
        addToast(res.data.message || 'Could not post review', 'error');
      }
    } catch { addToast('Network error', 'error'); }
    finally   { setReviewLoading(false); }
  };

  // ── Notify me ────────────────────────────────────────────────────────────────
  const handleNotifyMe = async () => {
    if (!customer) { navigate('/login'); return; }
    setNotifyLoading(true);
    const method = notifySubscribed ? 'delete' : 'post';
    try {
      const res = await api[method](`/api/notify-me/${product.id}`);
      if (res.data.success) {
        setNotifySubscribed(res.data.subscribed);
        addToast(res.data.message || (res.data.subscribed ? 'Subscribed!' : 'Unsubscribed'), 'success');
      } else {
        addToast(res.data.message || 'Something went wrong', 'error');
      }
    } catch { addToast('Network error', 'error'); }
    finally   { setNotifyLoading(false); }
  };

  // ── Share copy ────────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // ── Add similar to cart ───────────────────────────────────────────────────────
  const addSimilarToCart = async (productId, e) => {
    e.preventDefault();
    if (!customer) { setGuestOpen(true); return; }
    try {
      const res = await api.post(
        '/api/flutter/cart/add',
        { productId, quantity: 1 },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      if (res.data.success) { setCartCount(c => c + 1); addToast('Added to cart 🛒', 'success'); }
      else addToast(res.data.message || 'Could not add', 'error');
    } catch { addToast('Network error', 'error'); }
  };

  const maxQty = product ? Math.min(product.stock, 10) : 10;

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{CSS}</style>
      <div className="bg-layer" />
      <i className="fas fa-circle-notch" style={{ fontSize: '2rem', color: 'var(--yellow)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!product) return null;

  const thumbs     = product.extraImageLinks ? product.extraImageLinks.split(',').filter(Boolean) : [];
  const allImages  = [product.imageLink, ...thumbs];
  const avgRating  = product.avgRating || 0;
  const reviews    = product.reviews || [];
  const shareUrl   = window.location.href;
  const shareMsg   = encodeURIComponent(`Check out this product on Ekart: ${product.name} ${shareUrl}`);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Poppins', sans-serif", color: 'white' }}>
      <style>{CSS}</style>

      <div className="bg-layer" />
      <ToastStack toasts={toasts} />

      {/* ── NAV ── */}
      <nav id="nav" className={navScrolled ? 'scrolled' : ''}>
        <Link to="/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }} />
          Ek<span>art</span>
        </Link>
        <div className="nav-right">
          <Link to="/track-orders"  className="nav-link"><i className="fas fa-truck" /><span>Track</span></Link>
          <Link to="/order-history" className="nav-link"><i className="fas fa-history" /><span>Orders</span></Link>
          <Link to="/view-orders"   className="nav-link"><i className="fas fa-box-open" /><span>My Orders</span></Link>
          <Link to="/wishlist"      className="nav-link wishlist-link"><i className="fas fa-heart" /><span>Wishlist</span></Link>
          <Link to="/cart"          className="nav-link cart-link" style={{ position: 'relative' }}>
            <i className="fas fa-shopping-cart" /><span>Cart</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <button className="nav-link logout-link"
            onClick={() => { clearToken(); navigate('/login'); }}
            style={{ background: 'none', border: '1px solid rgba(255,100,80,0.3)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="fas fa-sign-out-alt" /><span>Logout</span>
          </button>
        </div>
      </nav>

      {/* ── PAGE ── */}
      <main className="page">

        {/* BREADCRUMB */}
        <nav className="breadcrumb">
          <Link to="/home"><i className="fas fa-home bc-icon" /><span>Home</span></Link>
          <i className="fas fa-chevron-right bc-sep" />
          <Link to={`/home?category=${encodeURIComponent(product.category)}`} className="bc-category">
            <i className="fas fa-tag bc-icon" />
            <span>{product.category}</span>
          </Link>
          <i className="fas fa-chevron-right bc-sep" />
          <span className="bc-current">{product.name}</span>
        </nav>

        {/* PRODUCT MAIN */}
        <div className="product-main">

          {/* LEFT: Media */}
          <div className="media-col">
            <div className="main-image-wrap" onClick={() => setLightboxSrc(heroImg)}>
              <img src={heroImg} alt={product.name}
                onError={e => e.target.src = 'https://via.placeholder.com/600x450?text=No+Image'} />
              <span className="category-badge">{product.category}</span>
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="thumbnail-row">
                {allImages.map((url, i) => (
                  <img key={i} className={`thumb${activeThumb === i ? ' active' : ''}`}
                    src={url} alt=""
                    onClick={() => { setHeroImg(url); setActiveThumb(i); }}
                    onError={e => e.target.style.display = 'none'} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Info */}
          <div className="info-col">
            <div>
              <h1 className="product-title">{product.name}</h1>
              {product.vendorCode && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="vendor-badge">
                    <i className="fas fa-store" />
                    <span>Sold by {product.vendorCode}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Rating summary */}
            {reviews.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span className="avg-badge">
                  <i className="fas fa-star" style={{ fontSize: '0.7rem' }} /> {Number(avgRating).toFixed(1)}
                </span>
                <StarRow avg={avgRating} size="0.78rem" />
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            )}

            {/* Description */}
            <div className="info-row">
              <i className="fas fa-align-left info-row-icon" />
              <div>
                <div className="info-row-label">Description</div>
                <div className="info-row-value">{product.description}</div>
              </div>
            </div>

            {/* Category */}
            <div className="info-row">
              <i className="fas fa-tag info-row-icon" />
              <div>
                <div className="info-row-label">Category</div>
                <div className="info-row-value">{product.category}</div>
              </div>
            </div>

            {/* Price block */}
            <div className="price-block">
              <div>
                {product.mrp && product.mrp > product.price ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span className="discount-badge">
                        -{Math.round((1 - product.price / product.mrp) * 100)}%
                      </span>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                        You save ₹{(product.mrp - product.price).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="price-big"><sup>₹</sup>{product.price.toLocaleString('en-IN')}</div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                      M.R.P.: <span style={{ textDecoration: 'line-through' }}>₹{product.mrp.toLocaleString('en-IN')}</span>
                      <span style={{ fontSize: '0.72rem', marginLeft: '0.35rem' }}>Incl. of all taxes</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="price-big"><sup>₹</sup>{product.price.toLocaleString('en-IN')}</div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Incl. of all taxes</div>
                  </>
                )}
              </div>
              <div>
                {product.stock > 10 && (
                  <span className="stock-pill in-stock">
                    <i className="fas fa-circle" style={{ fontSize: '0.5rem' }} /> {product.stock} in stock
                  </span>
                )}
                {product.stock > 0 && product.stock <= 10 && (
                  <span className="stock-pill low-stock">
                    <i className="fas fa-exclamation-circle" style={{ fontSize: '0.65rem' }} /> Only {product.stock} left!
                  </span>
                )}
                {product.stock === 0 && (
                  <span className="stock-pill out-stock">
                    <i className="fas fa-times-circle" style={{ fontSize: '0.65rem' }} /> Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Quantity selector */}
            {product.stock > 0 && (
              <div className="qty-wrap">
                <span className="qty-label">
                  <i className="fas fa-layer-group" style={{ color: 'var(--yellow)', marginRight: '0.3rem' }} />Qty
                </span>
                <div className="qty-controls">
                  <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}>−</button>
                  <div className="qty-input">{quantity}</div>
                  <button className="qty-btn" onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}>+</button>
                </div>
                <span className="qty-stock-info">
                  {product.stock > 10 ? 'Max 10 per order' : `Only ${product.stock} left`}
                </span>
              </div>
            )}

            {/* Delivery estimate */}
            {product.stock > 0 && (
              <div className="delivery-box">
                <div className="delivery-box-header">
                  <i className="fas fa-truck" /> Estimated Delivery
                </div>
                <div className="delivery-options">
                  <div className="delivery-option">
                    <div className="delivery-option-label"><i className="fas fa-box" /> Standard</div>
                    <div className="delivery-option-date">{stdDate}</div>
                    <div className="delivery-option-price">FREE delivery</div>
                  </div>
                  <div className="delivery-option express">
                    <div className="delivery-option-label"><i className="fas fa-bolt" /> Express</div>
                    <div className="delivery-option-date">{expDate}</div>
                    <div className="delivery-option-price">+₹129 · Order within {expCountdown}</div>
                  </div>
                </div>
                <div className="delivery-pincode-row">
                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--yellow)', fontSize: '0.72rem' }} />
                  <input className="delivery-pin-input" type="text" placeholder="Enter pin code"
                    maxLength={6} inputMode="numeric" value={pinInput}
                    onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinResult(null); }}
                    onKeyDown={e => e.key === 'Enter' && checkPin(pinInput)} />
                  <button className="btn-check-pin" onClick={() => checkPin(pinInput)} disabled={checkingPin}>
                    {checkingPin ? '…' : 'Check'}
                  </button>
                  {pinResult && (
                    <span className={`delivery-pin-result ${pinResult.ok ? 'ok' : 'fail'}`}>{pinResult.msg}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>
                  Select delivery type at checkout
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="action-row">
              {product.stock > 0 ? (
                <button className="btn-add-cart" style={{ flex: 1 }}
                  onClick={handleAddToCart} disabled={addingCart}>
                  {addingCart
                    ? <><i className="fas fa-spinner fa-spin" /> Adding…</>
                    : addedFeedback
                      ? <><i className="fas fa-check" /> Added!</>
                      : <><i className="fas fa-cart-plus" /> Add to Cart</>
                  }
                </button>
              ) : (
                <button
                  className={`btn-notify-me${notifySubscribed ? ' subscribed' : ''}`}
                  style={{ flex: 1 }}
                  onClick={handleNotifyMe}
                  disabled={notifyLoading}>
                  {notifyLoading
                    ? <><i className="fas fa-spinner fa-spin" /> {notifySubscribed ? 'Removing…' : 'Subscribing…'}</>
                    : notifySubscribed
                      ? <><i className="fas fa-bell-slash" /> Unsubscribe</>
                      : <><i className="fas fa-bell" /> Notify Me When Back</>
                  }
                </button>
              )}

              <button className={`btn-wishlist-lg${wishlistActive ? ' active' : ''}`} onClick={handleWishlist}>
                <i className={wishlistActive ? 'fas fa-heart' : 'far fa-heart'} />
              </button>

              <button className="btn-share-lg" onClick={() => setShareOpen(true)} title="Share this product">
                <i className="fas fa-share-nodes" />
              </button>
            </div>

            <Link to="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginTop: '0.25rem' }}>
              <i className="fas fa-arrow-left" /> Back to all products
            </Link>
          </div>
        </div>

        {/* REVIEWS */}
        <div>
          <div className="section-title">
            <i className="fas fa-star" /> Customer Reviews
            <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>
              ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </span>
          </div>

          {reviews.length > 0 ? (
            <div className="reviews-grid">
              {reviews.map((r, i) => (
                <div key={r.id || i} className="review-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="review-top">
                    <span className="review-author">{r.customerName}</span>
                    <span className="review-stars">
                      {[...Array(r.rating)].map((_, j) => <i key={j} className="fas fa-star" />)}
                      {[...Array(5 - r.rating)].map((_, j) => <i key={j} className="far fa-star" />)}
                    </span>
                  </div>
                  <p className="review-text">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', padding: '1rem 0' }}>
              No reviews yet — be the first to review this product!
            </p>
          )}

          {/* Write a review */}
          <div className="review-form-wrap">
            <h4><i className="fas fa-pen" style={{ color: 'var(--yellow)', marginRight: 6 }} />Write a Review</h4>
            <form onSubmit={handleReviewSubmit} noValidate>
              <div className="review-form">
                <select className="review-select" value={reviewRating}
                  onChange={e => setReviewRating(Number(e.target.value))}>
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
                </select>
                <input className="review-input" type="text"
                  placeholder="Share your experience with this product…"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  required />
                <button type="submit" className="btn-post" disabled={reviewLoading}>
                  {reviewLoading
                    ? <i className="fas fa-spinner fa-spin" />
                    : <><i className="fas fa-paper-plane" /> Post</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SIMILAR PRODUCTS */}
        <div className="similar-section">
          <div className="section-title">
            <i className="fas fa-layer-group" /> Similar Products
            <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>
              in {product.category}
            </span>
          </div>

          {similar.length > 0 ? (
            <div className="similar-grid">
              {similar.map((s, i) => (
                <div key={s.id} className="sim-card" style={{ animationDelay: `${i * 0.06}s` }}>
                  <Link to={`/product/${s.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div className="sim-img-wrap">
                      <img className="sim-img" src={s.imageLink} alt={s.name}
                        onError={e => e.target.src = 'https://via.placeholder.com/300?text=No+Image'} />
                      <span className="sim-cat">{s.category}</span>
                    </div>
                    <div className="sim-body">
                      <div className="sim-name">{s.name}</div>
                      <div className="sim-desc">{s.description}</div>
                      <div className="sim-price"><sup>₹</sup>{s.price.toLocaleString('en-IN')}</div>
                    </div>
                  </Link>
                  <button className="btn-sim-cart" onClick={e => addSimilarToCart(s.id, e)}>
                    <i className="fas fa-cart-plus" /> Add to Cart
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-similar">
              <i className="fas fa-box-open" />
              No similar products found in this category yet.
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="footer-brand">Ek<span>art</span></div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/policies" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textDecoration: 'none' }}>Policies</Link>
          <a href="#" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textDecoration: 'none' }}>Privacy</a>
        </div>
      </footer>

      {/* ── LIGHTBOX ── */}
      {lightboxSrc && (
        <div className="lightbox open" onClick={() => setLightboxSrc('')}>
          <button className="lightbox-close" onClick={() => setLightboxSrc('')}>
            <i className="fas fa-times" />
          </button>
          <img src={lightboxSrc} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ── SHARE MODAL ── */}
      {shareOpen && (
        <div className="ekart-modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setShareOpen(false); }}>
          <div className="ekart-modal-box">
            <div className="ekart-modal-icon">🔗</div>
            <h3 className="ekart-modal-title">Share this Product</h3>
            <p style={{ fontWeight: 600, color: 'white', fontSize: '0.85rem', marginBottom: '1rem' }}>{product.name}</p>
            <div className="share-link-box">
              <span className="share-link-text">{shareUrl}</span>
              <button className={`share-copy-btn${copied ? ' copied' : ''}`} onClick={copyLink}>
                <i className={`fas fa-${copied ? 'check' : 'copy'}`} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="share-via-row">
              <a href={`https://wa.me/?text=${shareMsg}`} target="_blank" rel="noreferrer"
                className="share-via-btn share-whatsapp"><i className="fab fa-whatsapp" /></a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out this on Ekart: ' + product.name)}`}
                target="_blank" rel="noreferrer" className="share-via-btn share-telegram"><i className="fab fa-telegram-plane" /></a>
              <a href={`mailto:?subject=${encodeURIComponent('Check this out on Ekart')}&body=${shareMsg}`}
                className="share-via-btn share-email"><i className="fas fa-envelope" /></a>
              {navigator.share && (
                <button className="share-via-btn share-native" onClick={() =>
                  navigator.share({ title: product.name, text: 'Check this out on Ekart!', url: shareUrl }).catch(() => {})}>
                  <i className="fas fa-ellipsis-h" />
                </button>
              )}
            </div>
            <button className="ekart-modal-btn-ghost" onClick={() => setShareOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ── GUEST PROMPT MODAL ── */}
      {guestOpen && (
        <div className="ekart-modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setGuestOpen(false); }}>
          <div className="ekart-modal-box">
            <div className="ekart-modal-icon">🛒</div>
            <h3 className="ekart-modal-title">Sign In to Add to Cart</h3>
            <p className="ekart-modal-msg">You need an account to add products to your cart and place orders.</p>
            <div className="ekart-modal-actions" style={{ flexDirection: 'column', gap: '0.6rem' }}>
              <Link to="/login" className="ekart-modal-btn-primary">
                <i className="fas fa-sign-in-alt" /> Sign In
              </Link>
              <Link to="/register" className="ekart-modal-btn-secondary">
                <i className="fas fa-user-plus" /> Create Account
              </Link>
              <button className="ekart-modal-btn-ghost" onClick={() => setGuestOpen(false)}>
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
  :root {
    --yellow: #f5a800; --yellow-d: #d48f00;
    --glass-border: rgba(255,255,255,0.18); --glass-card: rgba(255,255,255,0.08);
    --glass-nav: rgba(0,0,0,0.28);
    --text-white: #fff; --text-light: rgba(255,255,255,0.80); --text-dim: rgba(255,255,255,0.50);
  }
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  body { font-family:'Poppins',sans-serif; }

  /* BG */
  .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
  .bg-layer::before { content:''; position:absolute; inset:-20px; background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=75') center/cover no-repeat; filter:blur(6px); transform:scale(1.08); }
  .bg-layer::after  { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(5,8,20,0.85) 0%,rgba(8,12,28,0.80) 40%,rgba(5,8,20,0.92) 100%); }

  /* NAV */
  nav#nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:0.75rem 2rem; display:flex; align-items:center; justify-content:space-between; background:var(--glass-nav); backdrop-filter:blur(14px); border-bottom:1px solid var(--glass-border); gap:1rem; transition:background 0.3s; }
  nav#nav.scrolled { background:rgba(0,0,0,0.5); }
  .nav-brand { font-size:1.6rem; font-weight:700; color:white; text-decoration:none; letter-spacing:0.04em; display:flex; align-items:center; gap:0.45rem; flex-shrink:0; }
  .nav-brand span { color:var(--yellow); }
  .nav-right { display:flex; align-items:center; gap:0.5rem; flex-shrink:0; }
  .nav-link { display:flex; align-items:center; gap:0.35rem; color:var(--text-light); text-decoration:none; font-size:0.78rem; font-weight:500; padding:0.42rem 0.75rem; border-radius:6px; border:1px solid transparent; transition:all 0.2s; white-space:nowrap; }
  .nav-link:hover { color:white; background:rgba(255,255,255,0.1); border-color:var(--glass-border); }
  .nav-link.cart-link { border-color:var(--glass-border); }
  .cart-badge { position:absolute; top:-4px; right:-4px; background:var(--yellow); color:#1a1000; font-size:0.58rem; font-weight:800; width:15px; height:15px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .nav-link.wishlist-link { border-color:rgba(239,68,68,0.3); }
  .nav-link.wishlist-link i { color:#ef4444; }
  .nav-link.logout-link { border-color:rgba(255,100,80,0.3); }
  .nav-link.logout-link:hover { color:#ff8060; border-color:rgba(255,100,80,0.6); background:rgba(255,100,80,0.08); }

  /* PAGE */
  .page { flex:1; padding:5.5rem 2rem 4rem; max-width:1300px; margin:0 auto; width:100%; display:flex; flex-direction:column; gap:3rem; }

  /* BREADCRUMB */
  .breadcrumb { display:flex; align-items:center; gap:0.4rem; font-size:0.78rem; color:var(--text-dim); animation:fadeUp 0.4s ease both; background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); border-radius:50px; padding:0.45rem 1.1rem; width:fit-content; flex-wrap:wrap; }
  .breadcrumb a { color:var(--text-dim); text-decoration:none; transition:color 0.2s; display:inline-flex; align-items:center; gap:0.35rem; }
  .breadcrumb a:hover { color:var(--yellow); }
  .breadcrumb .bc-sep { font-size:0.55rem; opacity:0.4; }
  .breadcrumb .bc-icon { font-size:0.72rem; }
  .breadcrumb .bc-current { color:var(--text-light); font-weight:600; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .breadcrumb .bc-category { color:var(--yellow); opacity:0.8; font-weight:500; }
  .breadcrumb .bc-category:hover { opacity:1; }

  /* PRODUCT MAIN */
  .product-main { display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; animation:fadeUp 0.5s ease both; }

  /* MEDIA */
  .media-col { display:flex; flex-direction:column; gap:1rem; }
  .main-image-wrap { position:relative; border-radius:24px; overflow:hidden; border:1px solid var(--glass-border); background:rgba(0,0,0,0.3); aspect-ratio:4/3; cursor:zoom-in; }
  .main-image-wrap img { width:100%; height:100%; object-fit:cover; transition:transform 0.5s; }
  .main-image-wrap:hover img { transform:scale(1.04); }
  .category-badge { position:absolute; top:14px; left:14px; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); border:1px solid var(--glass-border); color:var(--yellow); font-size:0.65rem; font-weight:700; padding:5px 12px; border-radius:20px; text-transform:uppercase; letter-spacing:0.07em; }
  .thumbnail-row { display:flex; gap:0.6rem; flex-wrap:wrap; }
  .thumb { width:72px; height:72px; border-radius:12px; cursor:pointer; border:2px solid transparent; object-fit:cover; transition:all 0.25s; flex-shrink:0; background:rgba(0,0,0,0.3); }
  .thumb:hover, .thumb.active { border-color:var(--yellow); transform:scale(1.08); }

  /* INFO */
  .info-col { display:flex; flex-direction:column; gap:1.4rem; }
  .product-title { font-size:clamp(1.5rem,3vw,2.2rem); font-weight:800; line-height:1.2; }
  .avg-badge { display:inline-flex; align-items:center; gap:3px; background:rgba(245,168,0,0.15); border:1px solid rgba(245,168,0,0.35); color:var(--yellow); font-size:0.78rem; font-weight:700; padding:2px 8px; border-radius:20px; }
  .info-row { display:flex; align-items:flex-start; gap:0.75rem; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); border-radius:12px; padding:0.9rem 1.1rem; }
  .info-row-icon { color:var(--yellow); font-size:1rem; margin-top:2px; flex-shrink:0; }
  .info-row-label { font-size:0.68rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.2rem; }
  .info-row-value { font-size:0.92rem; font-weight:500; color:white; line-height:1.5; }
  .price-block { background:linear-gradient(135deg,rgba(245,168,0,0.12),rgba(245,168,0,0.04)); border:1px solid rgba(245,168,0,0.3); border-radius:16px; padding:1.25rem 1.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; }
  .price-big { font-size:2.4rem; font-weight:800; color:var(--yellow); line-height:1; }
  .price-big sup { font-size:1rem; font-weight:700; vertical-align:super; }
  .discount-badge { background:rgba(239,68,68,0.18); color:#ef4444; border:1px solid rgba(239,68,68,0.35); font-size:0.9rem; font-weight:800; padding:0.25rem 0.7rem; border-radius:8px; }
  .stock-pill { display:inline-flex; align-items:center; gap:0.4rem; font-size:0.75rem; font-weight:700; padding:0.35rem 0.9rem; border-radius:50px; }
  .stock-pill.in-stock  { background:rgba(34,197,94,0.15);  border:1px solid rgba(34,197,94,0.35);  color:#22c55e; }
  .stock-pill.low-stock { background:rgba(245,168,0,0.15);  border:1px solid rgba(245,168,0,0.35);  color:var(--yellow); }
  .stock-pill.out-stock { background:rgba(239,68,68,0.12);  border:1px solid rgba(239,68,68,0.3);   color:#ef4444; }
  .vendor-badge { display:inline-flex; align-items:center; gap:0.5rem; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); border-radius:50px; padding:0.4rem 0.9rem; font-size:0.72rem; color:var(--text-dim); }
  .vendor-badge i { color:var(--yellow); }

  /* QTY */
  .qty-wrap { display:flex; align-items:center; gap:0.75rem; background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); border-radius:14px; padding:0.9rem 1.1rem; }
  .qty-label { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-dim); flex-shrink:0; }
  .qty-controls { display:flex; align-items:center; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:10px; overflow:hidden; }
  .qty-btn { width:38px; height:38px; border:none; background:transparent; color:var(--text-light); font-size:1.1rem; font-weight:700; cursor:pointer; transition:all 0.18s; display:flex; align-items:center; justify-content:center; font-family:'Poppins',sans-serif; flex-shrink:0; }
  .qty-btn:hover:not(:disabled) { background:rgba(245,168,0,0.15); color:var(--yellow); }
  .qty-btn:disabled { opacity:0.3; cursor:not-allowed; }
  .qty-input { width:48px; text-align:center; background:transparent; border-left:1px solid var(--glass-border); border-right:1px solid var(--glass-border); color:white; font-family:'Poppins',sans-serif; font-size:0.95rem; font-weight:700; height:38px; display:flex; align-items:center; justify-content:center; }
  .qty-stock-info { font-size:0.72rem; color:var(--text-dim); margin-left:auto; }

  /* DELIVERY */
  .delivery-box { background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); border-radius:14px; padding:1rem 1.2rem; display:flex; flex-direction:column; gap:0.55rem; }
  .delivery-box-header { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-dim); display:flex; align-items:center; gap:0.4rem; }
  .delivery-box-header i { color:var(--yellow); font-size:0.72rem; }
  .delivery-options { display:flex; gap:0.6rem; flex-wrap:wrap; }
  .delivery-option { flex:1; min-width:120px; background:rgba(255,255,255,0.04); border:2px solid var(--glass-border); border-radius:10px; padding:0.65rem 0.85rem; display:flex; flex-direction:column; gap:0.2rem; }
  .delivery-option.express { border-color:rgba(34,197,94,0.3); }
  .delivery-option-label { font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-dim); display:flex; align-items:center; gap:0.3rem; }
  .delivery-option.express .delivery-option-label { color:#22c55e; }
  .delivery-option-date { font-size:0.9rem; font-weight:700; color:white; }
  .delivery-option-price { font-size:0.68rem; color:var(--text-dim); }
  .delivery-option.express .delivery-option-price { color:#4ade80; }
  .delivery-pincode-row { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
  .delivery-pin-input { background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:8px; color:white; font-family:'Poppins',sans-serif; font-size:0.78rem; padding:0.38rem 0.7rem; width:130px; outline:none; transition:border-color 0.2s; letter-spacing:0.06em; }
  .delivery-pin-input:focus { border-color:rgba(245,168,0,0.5); }
  .delivery-pin-input::placeholder { color:var(--text-dim); letter-spacing:0; }
  .btn-check-pin { background:none; border:1px solid var(--glass-border); border-radius:8px; color:var(--yellow); font-family:'Poppins',sans-serif; font-size:0.72rem; font-weight:600; padding:0.38rem 0.8rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
  .btn-check-pin:hover { border-color:rgba(245,168,0,0.5); background:rgba(245,168,0,0.06); }
  .delivery-pin-result { font-size:0.72rem; }
  .delivery-pin-result.ok { color:#22c55e; }
  .delivery-pin-result.fail { color:#f87171; }

  /* ACTION ROW */
  .action-row { display:flex; gap:0.75rem; }
  .btn-add-cart { display:flex; align-items:center; justify-content:center; gap:0.6rem; background:var(--yellow); color:#1a1000; border:none; border-radius:16px; padding:1rem 2rem; font-family:'Poppins',sans-serif; font-size:1rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; cursor:pointer; transition:all 0.3s cubic-bezier(0.23,1,0.32,1); box-shadow:0 8px 28px rgba(245,168,0,0.3); }
  .btn-add-cart:hover:not(:disabled) { background:var(--yellow-d); transform:translateY(-3px); box-shadow:0 14px 36px rgba(245,168,0,0.45); }
  .btn-add-cart:disabled { opacity:0.75; cursor:not-allowed; }
  .btn-notify-me { display:flex; align-items:center; justify-content:center; gap:0.6rem; background:rgba(99,102,241,0.12); border:1.5px solid rgba(99,102,241,0.45); color:#a5b4fc; border-radius:16px; padding:1rem 2rem; font-family:'Poppins',sans-serif; font-size:1rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; cursor:pointer; transition:all 0.3s; }
  .btn-notify-me:hover:not(:disabled) { background:rgba(99,102,241,0.22); border-color:rgba(99,102,241,0.7); transform:translateY(-2px); }
  .btn-notify-me.subscribed { background:rgba(34,197,94,0.12); border-color:rgba(34,197,94,0.45); color:#4ade80; }
  .btn-notify-me:disabled { opacity:0.6; cursor:not-allowed; }
  .btn-wishlist-lg { display:flex; align-items:center; justify-content:center; gap:0.5rem; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.35); color:#ef4444; border-radius:16px; padding:1rem; font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.3s; flex-shrink:0; }
  .btn-wishlist-lg:hover { background:rgba(239,68,68,0.2); transform:translateY(-2px); }
  .btn-wishlist-lg.active { background:rgba(239,68,68,0.9); color:white; border-color:#ef4444; }
  .btn-share-lg { display:flex; align-items:center; justify-content:center; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.35); color:#60a5fa; border-radius:16px; width:52px; height:52px; font-size:1rem; cursor:pointer; transition:all 0.25s; flex-shrink:0; }
  .btn-share-lg:hover { background:#3b82f6; color:white; transform:translateY(-2px); box-shadow:0 8px 20px rgba(59,130,246,0.35); }

  /* SECTION TITLE */
  .section-title { font-size:1.2rem; font-weight:700; color:white; display:flex; align-items:center; gap:0.6rem; padding-bottom:0.75rem; border-bottom:1px solid var(--glass-border); margin-bottom:1rem; }
  .section-title i { color:var(--yellow); }

  /* REVIEWS */
  .reviews-grid { display:flex; flex-direction:column; gap:0.75rem; }
  .review-card { background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); border-radius:14px; padding:1rem 1.25rem; border-left:3px solid var(--yellow); animation:fadeUp 0.4s ease both; }
  .review-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; }
  .review-author { font-size:0.8rem; font-weight:700; color:white; }
  .review-stars { color:var(--yellow); font-size:0.7rem; }
  .review-text { font-size:0.78rem; color:var(--text-dim); line-height:1.55; }
  .review-form-wrap { background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); border-radius:14px; padding:1.25rem; margin-top:1rem; }
  .review-form-wrap h4 { font-size:0.85rem; font-weight:700; color:white; margin-bottom:0.75rem; }
  .review-form { display:flex; gap:0.5rem; flex-wrap:wrap; }
  .review-select { background:rgba(255,255,255,0.07); border:1px solid var(--glass-border); border-radius:9px; color:white; font-family:'Poppins',sans-serif; font-size:0.78rem; padding:0.55rem 0.75rem; flex-shrink:0; width:75px; outline:none; transition:all 0.25s; }
  .review-select option { background:#0f1228; }
  .review-select:focus { border-color:var(--yellow); background:rgba(255,255,255,0.1); }
  .review-input { flex:1; min-width:160px; background:rgba(255,255,255,0.07); border:1px solid var(--glass-border); border-radius:9px; color:white; font-family:'Poppins',sans-serif; font-size:0.78rem; padding:0.55rem 0.75rem; outline:none; transition:all 0.25s; }
  .review-input::placeholder { color:rgba(255,255,255,0.28); }
  .review-input:focus { border-color:var(--yellow); background:rgba(255,255,255,0.1); }
  .btn-post { background:var(--yellow); color:#1a1000; border:none; border-radius:9px; padding:0.55rem 1.1rem; font-family:'Poppins',sans-serif; font-size:0.78rem; font-weight:700; cursor:pointer; transition:all 0.25s; white-space:nowrap; flex-shrink:0; }
  .btn-post:hover:not(:disabled) { background:var(--yellow-d); }
  .btn-post:disabled { opacity:0.65; cursor:not-allowed; }

  /* SIMILAR */
  .similar-section { animation:fadeUp 0.6s ease both; }
  .similar-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1.25rem; margin-top:1.25rem; }
  .sim-card { background:var(--glass-card); backdrop-filter:blur(18px); border:1px solid var(--glass-border); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; transition:all 0.3s cubic-bezier(0.23,1,0.32,1); animation:fadeUp 0.5s ease both; }
  .sim-card:hover { transform:translateY(-6px); border-color:rgba(245,168,0,0.4); box-shadow:0 20px 45px rgba(0,0,0,0.35); }
  .sim-img-wrap { position:relative; height:170px; overflow:hidden; flex-shrink:0; }
  .sim-img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s; }
  .sim-card:hover .sim-img { transform:scale(1.07); }
  .sim-cat { position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.6); backdrop-filter:blur(6px); border:1px solid var(--glass-border); color:var(--yellow); font-size:0.6rem; font-weight:700; padding:3px 9px; border-radius:20px; text-transform:uppercase; }
  .sim-body { padding:1rem; display:flex; flex-direction:column; gap:0.4rem; flex:1; }
  .sim-name { font-size:0.9rem; font-weight:700; color:white; }
  .sim-desc { font-size:0.72rem; color:var(--text-dim); line-height:1.45; }
  .sim-price { font-size:1.3rem; font-weight:800; color:var(--yellow); margin-top:auto; padding-top:0.4rem; }
  .sim-price sup { font-size:0.7rem; vertical-align:super; font-weight:700; }
  .btn-sim-cart { display:flex; align-items:center; justify-content:center; gap:0.4rem; background:var(--yellow); color:#1a1000; border:none; padding:0.6rem 1rem; font-family:'Poppins',sans-serif; font-size:0.75rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; cursor:pointer; transition:all 0.25s; flex-shrink:0; }
  .btn-sim-cart:hover { background:var(--yellow-d); }
  .no-similar { text-align:center; padding:3rem; color:var(--text-dim); font-size:0.85rem; }
  .no-similar i { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.3; display:block; }

  /* FOOTER */
  .home-footer { background:rgba(0,0,0,0.5); backdrop-filter:blur(16px); border-top:1px solid var(--glass-border); padding:1.1rem 2rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
  .footer-brand { font-size:1rem; font-weight:700; color:white; }
  .footer-brand span { color:var(--yellow); }
  .footer-copy { font-size:0.7rem; color:var(--text-dim); }

  /* LIGHTBOX */
  .lightbox { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:999; align-items:center; justify-content:center; }
  .lightbox.open { display:flex; }
  .lightbox img { max-width:90vw; max-height:88vh; border-radius:12px; box-shadow:0 0 60px rgba(0,0,0,0.8); }
  .lightbox-close { position:absolute; top:1.5rem; right:1.5rem; background:rgba(255,255,255,0.1); border:1px solid var(--glass-border); color:white; border-radius:50%; width:36px; height:36px; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .lightbox-close:hover { background:rgba(255,255,255,0.2); }

  /* MODALS */
  .ekart-modal-overlay { position:fixed; inset:0; z-index:999; background:rgba(0,0,0,0.70); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity 0.25s ease; }
  .ekart-modal-overlay.active { opacity:1; pointer-events:all; }
  .ekart-modal-box { background:rgba(10,13,32,0.97); border:1px solid rgba(255,255,255,0.18); border-radius:22px; padding:2.25rem 2.5rem; max-width:400px; width:92%; text-align:center; box-shadow:0 50px 120px rgba(0,0,0,0.75); transform:scale(0.90) translateY(20px); transition:transform 0.3s cubic-bezier(0.23,1,0.32,1); }
  .ekart-modal-overlay.active .ekart-modal-box { transform:scale(1) translateY(0); }
  .ekart-modal-icon { font-size:2.5rem; margin-bottom:0.75rem; }
  .ekart-modal-title { font-size:1.1rem; font-weight:700; color:white; margin-bottom:0.5rem; }
  .ekart-modal-msg { font-size:0.82rem; color:rgba(255,255,255,0.5); line-height:1.6; margin-bottom:1.5rem; }
  .ekart-modal-actions { display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap; }
  .ekart-modal-btn-primary { display:inline-flex; align-items:center; justify-content:center; gap:0.4rem; background:#f5a800; color:#1a1000; padding:0.75rem 1.75rem; border-radius:11px; font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:700; text-decoration:none; transition:all 0.2s; width:100%; }
  .ekart-modal-btn-primary:hover { background:#d48f00; color:#1a1000; text-decoration:none; }
  .ekart-modal-btn-secondary { display:inline-flex; align-items:center; justify-content:center; gap:0.4rem; background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.18); padding:0.75rem 1.75rem; border-radius:11px; font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:600; text-decoration:none; transition:all 0.2s; width:100%; }
  .ekart-modal-btn-secondary:hover { background:rgba(255,255,255,0.13); color:white; text-decoration:none; }
  .ekart-modal-btn-ghost { background:none; border:none; color:rgba(255,255,255,0.35); font-family:'Poppins',sans-serif; font-size:0.78rem; cursor:pointer; transition:color 0.2s; width:100%; text-align:center; padding:0.5rem; }
  .ekart-modal-btn-ghost:hover { color:rgba(255,255,255,0.65); }

  /* SHARE MODAL */
  .share-link-box { display:flex; align-items:center; gap:0.5rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); border-radius:10px; padding:0.6rem 0.75rem; margin-bottom:1.25rem; text-align:left; }
  .share-link-text { flex:1; font-size:0.72rem; color:rgba(255,255,255,0.55); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:monospace; }
  .share-copy-btn { display:inline-flex; align-items:center; gap:0.35rem; background:rgba(245,168,0,0.15); border:1px solid rgba(245,168,0,0.35); color:#f5a800; border-radius:7px; padding:0.4rem 0.75rem; font-family:'Poppins',sans-serif; font-size:0.72rem; font-weight:700; cursor:pointer; transition:all 0.2s; white-space:nowrap; flex-shrink:0; }
  .share-copy-btn:hover { background:#f5a800; color:#1a1000; }
  .share-copy-btn.copied { background:rgba(34,197,94,0.15); border-color:rgba(34,197,94,0.4); color:#22c55e; }
  .share-via-row { display:flex; gap:0.75rem; justify-content:center; margin-bottom:1rem; }
  .share-via-btn { width:46px; height:46px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:1.1rem; text-decoration:none; cursor:pointer; border:none; transition:all 0.2s; }
  .share-via-btn:hover { transform:translateY(-3px) scale(1.1); text-decoration:none; }
  .share-whatsapp  { background:rgba(37,211,102,0.15); color:#25d366; border:1px solid rgba(37,211,102,0.3); }
  .share-whatsapp:hover  { background:#25d366; color:white; }
  .share-telegram  { background:rgba(0,136,204,0.15); color:#0088cc; border:1px solid rgba(0,136,204,0.3); }
  .share-telegram:hover  { background:#0088cc; color:white; }
  .share-email     { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.65); border:1px solid rgba(255,255,255,0.15); }
  .share-email:hover     { background:rgba(255,255,255,0.15); color:white; }
  .share-native    { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.65); border:1px solid rgba(255,255,255,0.15); }
  .share-native:hover    { background:rgba(255,255,255,0.15); color:white; }

  /* ANIMATIONS */
  @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
  @keyframes spin    { to{transform:rotate(360deg)} }

  /* RESPONSIVE */
  @media(max-width:900px) { .product-main { grid-template-columns:1fr; } nav#nav { padding:0.7rem 1rem; } .page { padding:4.5rem 1rem 3rem; } }
  @media(max-width:560px) { .similar-grid { grid-template-columns:1fr 1fr; } .nav-link span { display:none; } .nav-link { padding:0.42rem 0.55rem; } .action-row { flex-wrap:wrap; } .btn-add-cart, .btn-notify-me { width:100%; } }
  @media(max-width:380px) { .similar-grid { grid-template-columns:1fr; } }
`;