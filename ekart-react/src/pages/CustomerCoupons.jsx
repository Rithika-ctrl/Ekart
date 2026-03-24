import React, { useState } from 'react';

const CustomerCoupons = ({ coupons = [] }) => {
  // --- State ---
  const [toast, setToast] = useState({ show: false, message: '' });
  const [copiedCode, setCopiedCode] = useState(null);

  // --- Helper Functions ---
  const formatNumber = (num) => {
    if (num == null) return '0';
    return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3000);
  };

  const handleCopyCode = async (code) => {
    const successMsg = `✓ Code "${code}" copied! Paste it in your cart.`;
    
    const onCopied = () => {
      setCopiedCode(code);
      triggerToast(successMsg);
      setTimeout(() => setCopiedCode(null), 2500);
    };

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code);
        onCopied();
      } catch (err) {
        fallbackCopy(code);
        onCopied();
      }
    } else {
      fallbackCopy(code);
      onCopied();
    }
  };

  const fallbackCopy = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  return (
    <>
      {/* Embedded CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
            --yellow: #f5a800; 
            --yellow-d: #d48f00;
            --glass-border: rgba(255,255,255,0.14);
            --glass-card: rgba(255,255,255,0.07);
            --glass-nav: rgba(0,0,0,0.3);
            --text-white: #ffffff; 
            --text-light: rgba(255,255,255,0.82);
            --text-dim: rgba(255,255,255,0.45);
        }
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Poppins', sans-serif; min-height: 100vh; color: var(--text-white); background: #060a18; }
        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before { 
            content: ''; position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover;
            filter: blur(6px); transform: scale(1.08); 
        }
        .bg-layer::after { 
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(135deg, rgba(5,8,20,0.92), rgba(8,12,28,0.88)); 
        }

        /* NAV */
        nav { 
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 0.75rem 2rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border); gap: 1rem; 
        }
        .nav-brand { 
            font-size: 1.6rem; font-weight: 700; color: var(--text-white);
            text-decoration: none; display: flex; align-items: center; gap: 0.45rem; 
        }
        .nav-brand span { color: var(--yellow); }
        .nav-right { display: flex; align-items: center; gap: 0.75rem; }
        .nav-link { 
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light);
            text-decoration: none; font-size: 0.8rem; font-weight: 500; padding: 0.4rem 0.75rem;
            border-radius: 8px; border: 1px solid transparent; transition: all 0.2s; 
        }
        .nav-link:hover { border-color: rgba(245,168,0,0.3); color: var(--yellow); }

        /* PAGE */
        main { padding: 7rem 2rem 3rem; max-width: 900px; margin: 0 auto; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        /* HEADER */
        .page-header { text-align: center; margin-bottom: 2rem; animation: fadeUp 0.4s ease both; }
        .page-header h1 { font-size: 1.8rem; font-weight: 800; }
        .page-header h1 span { color: var(--yellow); }
        .page-header p { color: var(--text-dim); font-size: 0.88rem; margin-top: 0.4rem; }

        /* COUPON GRID */
        .coupon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

        /* COUPON CARD */
        .coupon-card {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 16px;
            overflow: hidden; animation: fadeUp 0.4s ease both;
            position: relative; transition: transform 0.2s, border-color 0.2s;
        }
        .coupon-card:hover { transform: translateY(-3px); border-color: rgba(245,168,0,0.35); }

        /* Left stripe */
        .coupon-card::before { 
            content: ''; position: absolute; left: 0; top: 0; bottom: 0;
            width: 4px; background: var(--yellow); border-radius: 16px 0 0 16px; 
        }

        .coupon-top { padding: 1rem 1.1rem 0.75rem 1.3rem; }
        .coupon-code-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
        .coupon-code { 
            font-family: monospace; font-size: 1rem; font-weight: 800;
            color: var(--yellow); letter-spacing: 0.08em;
            background: rgba(245,168,0,0.1); border: 1px solid rgba(245,168,0,0.25);
            padding: 0.2rem 0.65rem; border-radius: 6px; 
        }
        .coupon-type-badge { 
            font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; padding: 0.15rem 0.55rem; border-radius: 20px; 
        }
        .type-percent { background: rgba(245,168,0,0.12); color: var(--yellow); border: 1px solid rgba(245,168,0,0.25); }
        .type-flat    { background: rgba(99,102,241,0.12); color: #818cf8; border: 1px solid rgba(99,102,241,0.25); }

        .coupon-value { font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 0.3rem; }
        .coupon-value span { font-size: 0.85rem; font-weight: 500; color: var(--text-dim); }
        .coupon-desc { font-size: 0.8rem; color: var(--text-light); line-height: 1.5; }

        .coupon-bottom { 
            padding: 0.65rem 1.1rem 0.75rem 1.3rem;
            background: rgba(0,0,0,0.15); border-top: 1px dashed rgba(255,255,255,0.08);
            display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; 
        }
        .coupon-meta { display: flex; flex-direction: column; gap: 0.2rem; }
        .coupon-meta-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; color: var(--text-dim); }
        .coupon-meta-item i { width: 12px; text-align: center; color: var(--yellow); font-size: 0.65rem; }
        .coupon-meta-item strong { color: var(--text-light); }

        /* Copy button */
        .btn-copy { 
            display: flex; align-items: center; gap: 0.4rem;
            background: var(--yellow); color: #1a1000; border: none; border-radius: 8px;
            font-family: 'Poppins', sans-serif; font-size: 0.75rem; font-weight: 700;
            padding: 0.45rem 0.85rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; 
        }
        .btn-copy:hover { background: var(--yellow-d); }
        .btn-copy.copied { background: #22c55e; color: white; }

        /* Expiry warning */
        .expiry-warn { font-size: 0.68rem; color: #f87171; display: flex; align-items: center; gap: 0.3rem; margin-top: 0.4rem; }

        /* Empty state */
        .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text-dim); }
        .empty-state i { font-size: 3rem; color: rgba(245,168,0,0.25); display: block; margin-bottom: 1rem; }

        /* Go to cart banner */
        .cart-banner { 
            background: rgba(245,168,0,0.08); border: 1px solid rgba(245,168,0,0.2);
            border-radius: 12px; padding: 1rem 1.25rem;
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 1.5rem; gap: 1rem; animation: fadeUp 0.4s 0.05s ease both; flex-wrap: wrap; 
        }
        .cart-banner-text { font-size: 0.85rem; color: var(--text-light); }
        .cart-banner-text strong { color: var(--yellow); }
        .btn-go-cart { 
            display: flex; align-items: center; gap: 0.45rem;
            background: var(--yellow); color: #1a1000; text-decoration: none;
            border-radius: 9px; padding: 0.5rem 1.1rem; font-size: 0.82rem; font-weight: 700;
            transition: all 0.2s; white-space: nowrap; 
        }
        .btn-go-cart:hover { background: var(--yellow-d); transform: translateY(-1px); }

        /* Toast */
        .toast { 
            position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px);
            background: rgba(34,197,94,0.9); color: white; padding: 0.65rem 1.25rem;
            border-radius: 50px; font-size: 0.82rem; font-weight: 600; opacity: 0;
            transition: all 0.3s; z-index: 999; pointer-events: none; white-space: nowrap; 
        }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      `}} />

      <div className="bg-layer"></div>
      
      {/* Toast Notification */}
      <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
        {toast.message}
      </div>

      {/* NAV */}
      <nav>
        <a href="/customer/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }}></i>
          Ek<span>art</span>
        </a>
        <div className="nav-right">
          <a href="/customer/home" className="nav-link"><i className="fas fa-home"></i> Home</a>
          <a href="/view-cart" className="nav-link"><i className="fas fa-shopping-cart"></i> Cart</a>
        </div>
      </nav>

      <main>
        {/* Header */}
        <div className="page-header">
          <h1>Available <span>Coupons</span> 🎟️</h1>
          <p>Copy a code and apply it at checkout to save on your order</p>
        </div>

        {/* Go to cart banner */}
        <div className="cart-banner">
          <div className="cart-banner-text">
            Ready to shop? <strong>Copy a coupon code</strong> and paste it in your cart at checkout.
          </div>
          <a href="/view-cart" className="btn-go-cart">
            <i className="fas fa-shopping-cart"></i> Go to Cart
          </a>
        </div>

        {/* Dynamic Content */}
        {!coupons || coupons.length === 0 ? (
          /* Empty state */
          <div className="empty-state">
            <i className="fas fa-tag"></i>
            <h3 style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }}>
              No coupons available right now
            </h3>
            <p>Check back soon — new offers are added regularly!</p>
          </div>
        ) : (
          /* Coupon Grid */
          <div className="coupon-grid">
            {coupons.map((c, index) => (
              <div className="coupon-card" key={index}>
                <div className="coupon-top">
                  <div className="coupon-code-row">
                    <span className="coupon-code">{c.code}</span>
                    {c.type === 'PERCENT' && <span className="coupon-type-badge type-percent">% Off</span>}
                    {c.type === 'FLAT' && <span className="coupon-type-badge type-flat">Flat Off</span>}
                  </div>

                  <div className="coupon-value">
                    {c.type === 'PERCENT' && <span>{formatNumber(c.value)}% OFF</span>}
                    {c.type === 'FLAT' && <span>₹{formatNumber(c.value)} OFF</span>}
                    {c.minOrderAmount > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dim)' }}> on orders ₹{formatNumber(c.minOrderAmount)}+</span>}
                  </div>

                  <div className="coupon-desc">{c.description}</div>

                  {c.expiryDate && (
                    <div className="expiry-warn">
                      <i className="fas fa-clock"></i>
                      Expires: <strong>{c.expiryDate}</strong>
                    </div>
                  )}
                </div>

                <div className="coupon-bottom">
                  <div className="coupon-meta">
                    {c.minOrderAmount > 0 ? (
                      <div className="coupon-meta-item">
                        <i className="fas fa-rupee-sign"></i>
                        Min order: <strong>₹{formatNumber(c.minOrderAmount)}</strong>
                      </div>
                    ) : (
                      <div className="coupon-meta-item">
                        <i className="fas fa-check"></i>
                        <strong>No minimum order</strong>
                      </div>
                    )}

                    {c.maxDiscount > 0 && (
                      <div className="coupon-meta-item">
                        <i className="fas fa-tag"></i>
                        Max saving: <strong>₹{formatNumber(c.maxDiscount)}</strong>
                      </div>
                    )}

                    {c.usageLimit > 0 && (
                      <div className="coupon-meta-item">
                        <i className="fas fa-users"></i>
                        <strong>{c.usageLimit - c.usedCount} uses left</strong>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    className={`btn-copy ${copiedCode === c.code ? 'copied' : ''}`} 
                    onClick={() => handleCopyCode(c.code)}
                  >
                    {copiedCode === c.code ? (
                      <><i className="fas fa-check"></i> Copied!</>
                    ) : (
                      <><i className="fas fa-copy"></i> Copy Code</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ 
        textAlign: 'center', 
        padding: '1.5rem', 
        color: 'rgba(255,255,255,0.3)', 
        fontSize: '0.72rem', 
        marginTop: '2rem' 
      }}>
        © 2026 Ekart. All rights reserved.
      </footer>
    </>
  );
};

export default CustomerCoupons;