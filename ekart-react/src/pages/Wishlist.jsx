import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getStoredCustomer, clearToken } from '../utils/api';

export default function Wishlist() {
  const navigate = useNavigate();
  const customer = getStoredCustomer();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState({ type: 'success', message: '' });
  const [cartModal, setCartModal] = useState(null); // { productId }
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

  // GET /api/flutter/wishlist
  const fetchWishlist = useCallback(async () => {
    if (!customer) { navigate('/login'); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/api/flutter/wishlist', {
        headers: { 'X-Customer-Id': customer.id },
      });
      if (data.success) setItems(data.items || []);
    } catch {
      setToast({ type: 'danger', message: 'Failed to load wishlist.' });
    } finally {
      setLoading(false);
    }
  }, [customer, navigate]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  // POST /api/flutter/wishlist/toggle  — remove
  const removeFromWishlist = async (productId) => {
    try {
      await api.post('/api/flutter/wishlist/toggle',
        { productId },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      setItems(p => p.filter(i => i.productId !== productId));
      setToast({ type: 'success', message: 'Removed from wishlist.' });
    } catch {
      setToast({ type: 'danger', message: 'Could not remove item.' });
    }
  };

  // POST /api/flutter/cart/add  then optionally remove from wishlist
  const addToCart = async (productId) => {
    try {
      const { data } = await api.post('/api/flutter/cart/add',
        { productId },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      if (data.success) {
        setCartModal({ productId });
      } else {
        setToast({ type: 'danger', message: data.message || 'Could not add to cart.' });
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Could not add to cart.' });
    }
  };

  // Modal choice: keep in wishlist or remove
  const handleCartChoice = async (keepInWishlist) => {
    const productId = cartModal?.productId;
    setCartModal(null);
    if (!keepInWishlist && productId) {
      await removeFromWishlist(productId);
    }
    setToast({ type: 'success', message: keepInWishlist ? 'Added to cart!' : 'Moved to cart!' });
  };

  const handleLogout = () => { clearToken(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Poppins, sans-serif', color: '#fff' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: -20, background: "url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat", filter: 'blur(6px)', transform: 'scale(1.08)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(5,8,20,.82) 0%,rgba(8,12,28,.78) 40%,rgba(5,8,20,.88) 100%)' }} />
      </div>

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.22)', transition: 'background 0.3s' }}>
        <Link to="/home" style={brand}>
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }} /> Ek<span style={{ color: '#f5a800' }}>art</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/wishlist" style={{ ...navBtn, color: '#f5a800', borderColor: 'rgba(245,168,0,0.4)' }}><i className="fas fa-heart" /> Wishlist</Link>
          <Link to="/cart"     style={navBtn}><i className="fas fa-shopping-cart" /> Cart</Link>
          <Link to="/home"     style={navBtn}><i className="fas fa-th-large" /> Dashboard</Link>
          <button onClick={handleLogout} style={{ ...navBtn, background: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', borderColor: 'rgba(255,100,80,0.3)', color: 'rgba(255,100,80,0.8)' }}>
            <i className="fas fa-sign-out-alt" /> Logout
          </button>
        </div>
      </nav>

      {/* Toast */}
      {toast.message && (
        <div style={{ position: 'fixed', top: '5rem', right: '1.5rem', zIndex: 200 }}>
          <div style={{ padding: '0.875rem 1.25rem', background: 'rgba(10,12,30,0.88)', backdropFilter: 'blur(16px)', border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.45)' : 'rgba(255,100,80,0.45)'}`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.825rem', minWidth: '260px', color: toast.type === 'success' ? '#22c55e' : '#ff8060' }}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            <span>{toast.message}</span>
            <button onClick={() => setToast(p => ({ ...p, message: '' }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.6, fontSize: '1rem' }}>×</button>
          </div>
        </div>
      )}

      {/* Add to Cart Modal */}
      {cartModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(10,13,32,0.97)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '22px', padding: '2.5rem', maxWidth: 380, width: '92%', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛒</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Added to Cart!</h3>
            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>Would you like to keep this item in your wishlist?</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => handleCartChoice(true)} style={{ ...modalBtn, background: 'rgba(245,168,0,0.12)', borderColor: 'rgba(245,168,0,0.35)', color: '#f5a800' }}>
                <i className="fas fa-heart" /> Keep in Wishlist
              </button>
              <button onClick={() => handleCartChoice(false)} style={{ ...modalBtn, background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)', color: '#22c55e' }}>
                <i className="fas fa-check" /> Move to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page */}
      <main style={{ flex: 1, padding: '7rem 1.5rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Header */}
          <div style={glassCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.75rem)', fontWeight: 700, marginBottom: '0.25rem' }}>
                  My <span style={{ color: '#f5a800' }}>Wishlist</span>
                </h1>
                <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.5)' }}>{items.length} item{items.length !== 1 ? 's' : ''} saved for later</p>
              </div>
              <div style={{ width: 60, height: 60, background: 'rgba(245,168,0,0.15)', border: '2px solid rgba(245,168,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                <i className="fas fa-heart" style={{ color: '#f5a800' }} />
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#f5a800' }} />
              <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Loading wishlist…</p>
            </div>
          )}

          {/* Empty */}
          {!loading && items.length === 0 && (
            <div style={{ ...glassCard, textAlign: 'center', padding: '4rem 2rem' }}>
              <i className="far fa-heart" style={{ fontSize: '3.5rem', opacity: 0.3, marginBottom: '1rem', display: 'block' }} />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Your wishlist is empty</h2>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>Start adding items you love by clicking the heart icon on products</p>
              <Link to="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f5a800', color: '#1a1000', borderRadius: '50px', padding: '0.75rem 1.75rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <i className="fas fa-shopping-bag" /> Browse Products
              </Link>
            </div>
          )}

          {/* Product Grid */}
          {!loading && items.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {items.map((p, idx) => (
                <div key={p.productId} style={{ ...glassCard, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: `fadeUp 0.4s ease ${0.05 + idx * 0.04}s both`, transition: 'transform 0.25s, box-shadow 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', height: 180, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                    {p.imageLink ? (
                      <img src={p.imageLink} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.3 }}>📦</div>
                    )}
                    {/* Category pill */}
                    <span style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 600 }}>
                      {p.category}
                    </span>
                    {/* Remove button */}
                    <button onClick={() => removeFromWishlist(p.productId)} title="Remove from wishlist" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: 30, height: 30, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f5a800' }}>₹{p.price}</span>
                      {p.inStock ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                          <i className="fas fa-check" /> In Stock
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                          <i className="fas fa-times" /> Out of Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => p.inStock && addToCart(p.productId)}
                      disabled={!p.inStock}
                      style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none', background: p.inStock ? '#f5a800' : 'rgba(255,255,255,0.08)', color: p.inStock ? '#1a1000' : 'rgba(255,255,255,0.3)', fontFamily: 'Poppins,sans-serif', fontSize: '0.78rem', fontWeight: 700, cursor: p.inStock ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                    >
                      <i className="fas fa-cart-plus" /> {p.inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                    <Link to={`/product/${p.productId}`} style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '0.8rem', flexShrink: 0 }}>
                      <i className="fas fa-eye" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link to="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.78rem' }}>
              <i className="fas fa-arrow-left" /> Back to Home
            </Link>
          </div>
        </div>
      </main>

      <footer style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.22)', padding: '1.25rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Ek<span style={{ color: '#f5a800' }}>art</span></div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>© 2026 Ekart. All rights reserved.</div>
      </footer>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
const glassCard = { background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '20px', padding: '2rem' };
const brand     = { fontSize: '1.6rem', fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' };
const navBtn    = { display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500, padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.22)' };
const modalBtn  = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1.25rem', borderRadius: '11px', fontFamily: 'Poppins,sans-serif', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', border: '1px solid', transition: 'all 0.2s' };