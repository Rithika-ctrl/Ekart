import React, { useState, useEffect } from 'react';

const CustomerViewProducts = ({ 
  products = [], 
  sessionSuccess, 
  sessionFailure 
}) => {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [alerts, setAlerts] = useState({ success: sessionSuccess, failure: sessionFailure });
  const [toasts, setToasts] = useState([]);
  
  // Budget Logic
  const initialMax = products.length > 0 
    ? Math.ceil(Math.max(...products.map(p => p.price || 0)) / 500) * 500 
    : 10000;
  
  const [maxBudget, setMaxBudget] = useState(initialMax || 10000);
  const [budget, setBudget] = useState(initialMax || 10000);
  
  // Interactivity
  const [wishlist, setWishlist] = useState(new Set());
  const [mainImages, setMainImages] = useState({}); // Maps productId to currently selected image URL

  // --- Effects ---
  
  // Page Loader & Nav Scroll
  useEffect(() => {
    const loaderTimer = setTimeout(() => setLoading(false), 1500); // Simulate initial load
    
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      clearTimeout(loaderTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auto-dismiss Alerts
  useEffect(() => {
    const timer = setTimeout(() => setAlerts({ success: null, failure: null }), 2500);
    return () => clearTimeout(timer);
  }, [sessionSuccess, sessionFailure]);

  // Fetch initial wishlist state
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const response = await fetch('/api/wishlist/ids');
        const data = await response.json();
        if (data.success && data.productIds) {
          setWishlist(new Set(data.productIds));
        }
      } catch (error) {
        console.error('Failed to load wishlist state:', error);
      }
    };
    fetchWishlist();
  }, []);


  // --- Handlers ---
  
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const toggleWishlist = async (productId) => {
    const isCurrentlyActive = wishlist.has(productId);
    
    // Optimistic UI update
    setWishlist(prev => {
      const next = new Set(prev);
      isCurrentlyActive ? next.delete(productId) : next.add(productId);
      return next;
    });

    try {
      const response = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      const data = await response.json();
      
      if (!data.success) {
        // Revert on failure
        setWishlist(prev => {
          const next = new Set(prev);
          isCurrentlyActive ? next.add(productId) : next.delete(productId);
          return next;
        });
        addToast(data.message || 'Failed to update wishlist', 'error');
      } else {
        addToast(data.message, 'success');
      }
    } catch (error) {
      // Revert on error
      setWishlist(prev => {
        const next = new Set(prev);
        isCurrentlyActive ? next.add(productId) : next.delete(productId);
        return next;
      });
      addToast('Something went wrong', 'error');
    }
  };

  const handleImageSwap = (productId, url) => {
    setMainImages(prev => ({ ...prev, [productId]: url }));
  };

  // --- Helper Functions ---
  
  const visibleProductsCount = products.filter(p => p.price <= budget).length;

  const renderStars = (avgRating) => {
    return [1, 2, 3, 4, 5].map(i => {
      if (i <= avgRating) {
        return <i key={i} className="fas fa-star" style={{ color: 'var(--yellow)', fontSize: '0.65rem' }}></i>;
      } else if ((i - 0.5) <= avgRating) {
        return <i key={i} className="fas fa-star-half-alt" style={{ color: 'var(--yellow)', fontSize: '0.65rem' }}></i>;
      } else {
        return <i key={i} className="far fa-star" style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.65rem' }}></i>;
      }
    });
  };

  return (
    <>
      {/* Embedded CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card:   rgba(255, 255, 255, 0.13);
            --glass-nav:    rgba(0, 0, 0, 0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            background: #060a18;
        }

        /* ── BACKGROUND ── */
        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: '';
            position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px);
            transform: scale(1.08);
        }
        .bg-layer::after {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav);
            backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border);
            transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }

        .nav-brand {
            font-size: 1.6rem; font-weight: 700;
            color: var(--text-white); text-decoration: none;
            letter-spacing: 0.04em;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }

        .nav-right { display: flex; align-items: center; gap: 0.75rem; }

        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border);
            transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }

        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3);
            transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        /* ── ALERTS ── */
        .alert-stack {
            position: fixed; top: 5rem; right: 1.5rem;
            z-index: 200; display: flex; flex-direction: column; gap: 0.5rem;
        }
        .alert {
            padding: 0.875rem 1.25rem;
            background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px;
            display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px;
            animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        /* ── PAGE HEADER ── */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            flex-wrap: wrap;
            animation: fadeUp 0.5s ease both;
        }
        .page-header-left h1 {
            font-size: clamp(1.2rem, 2.5vw, 1.75rem);
            font-weight: 700; margin-bottom: 0.25rem;
        }
        .page-header-left h1 span { color: var(--yellow); }
        .page-header-left p { font-size: 0.825rem; color: var(--text-dim); }

        .page-header-icon {
            width: 60px; height: 60px;
            background: rgba(245,168,0,0.15);
            border: 2px solid rgba(245,168,0,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; flex-shrink: 0;
        }

        /* ── BUDGET BAR ── */
        .budget-bar {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 1.5rem 2.5rem;
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
            animation: fadeUp 0.5s ease both;
            animation-delay: 0.05s;
        }

        .budget-label {
            display: flex; align-items: center; gap: 0.5rem;
            font-weight: 700; color: var(--yellow); font-size: 0.875rem;
            white-space: nowrap;
        }

        .budget-bar input[type=range] {
            flex: 1; min-width: 160px;
            accent-color: var(--yellow); cursor: pointer;
            height: 4px;
        }

        .budget-value {
            font-weight: 800; font-size: 1.1rem;
            color: white; white-space: nowrap; min-width: 130px;
        }

        .budget-count {
            color: var(--text-dim); font-size: 0.78rem;
            white-space: nowrap;
        }

        .btn-reset {
            background: transparent;
            border: 1px solid var(--yellow);
            color: var(--yellow);
            padding: 0.4rem 1.2rem;
            border-radius: 8px;
            font-weight: 600; font-size: 0.82rem;
            cursor: pointer; transition: all 0.25s;
            font-family: 'Poppins', sans-serif;
            white-space: nowrap;
        }
        .btn-reset:hover { background: var(--yellow); color: #1a1000; }

        /* ── PRODUCT GRID ── */
        .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 1.75rem;
        }

        /* ── PRODUCT CARD WRAPPER (for budget filter) ── */
        .product-card-wrapper { transition: opacity 0.4s, transform 0.4s, filter 0.4s; }
        .product-card-wrapper.product-over-budget {
            opacity: 0.2; filter: grayscale(1);
            pointer-events: none; transform: scale(0.96);
        }

        /* ── PRODUCT CARD ── */
        .product-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 22px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            animation: fadeUp 0.6s ease both;
            position: relative;
            height: 100%;
        }
        .product-card:hover {
            transform: translateY(-8px);
            border-color: rgba(245,168,0,0.45);
            box-shadow: 0 25px 55px rgba(0,0,0,0.35);
        }
        .product-card::before {
            content: '';
            position: absolute; inset: 0; border-radius: 22px;
            background: linear-gradient(135deg, rgba(245,168,0,0.06), transparent);
            opacity: 0; transition: opacity 0.3s; pointer-events: none;
        }
        .product-card:hover::before { opacity: 1; }

        /* ── IMAGE AREA ── */
        .img-area { position: relative; height: 230px; overflow: hidden; flex-shrink: 0; }
        .card-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
        .product-card:hover .card-image { transform: scale(1.07); }

        .budget-badge {
            position: absolute; top: 12px; right: 12px;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
            font-size: 0.68rem; font-weight: 800;
            padding: 4px 12px; border-radius: 50px;
            display: none; z-index: 10;
            box-shadow: 0 4px 12px rgba(34,197,94,0.4);
        }
        .within-budget .budget-badge { display: block; }

        .category-pill {
            position: absolute; top: 12px; left: 12px;
            background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
            border: 1px solid var(--glass-border);
            color: var(--yellow); font-size: 0.65rem; font-weight: 700;
            padding: 4px 10px; border-radius: 20px;
            text-transform: uppercase; letter-spacing: 0.06em;
        }

        /* ── WISHLIST HEART ICON ── */
        .btn-wishlist {
            position: absolute; top: 12px; right: 55px;
            width: 36px; height: 36px;
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(8px);
            border: 1px solid var(--glass-border);
            border-radius: 50%;
            color: var(--text-dim);
            font-size: 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            z-index: 15;
        }
        .btn-wishlist:hover {
            background: rgba(239,68,68,0.2);
            color: #ef4444;
            border-color: rgba(239,68,68,0.4);
            transform: scale(1.1);
        }
        .btn-wishlist.active {
            background: rgba(239,68,68,0.9);
            color: white;
            border-color: #ef4444;
        }
        .btn-wishlist.active:hover {
            background: #ef4444;
        }
        .btn-wishlist i {
            transition: transform 0.3s;
        }
        .btn-wishlist:active i {
            transform: scale(1.3);
        }

        /* ── TOAST NOTIFICATIONS ── */
        .toast-container {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .toast {
            background: rgba(10,12,30,0.95);
            backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.85rem;
            animation: slideInRight 0.3s ease both;
            min-width: 260px;
        }
        .toast.success { border-color: rgba(34,197,94,0.5); }
        .toast.success i { color: #22c55e; }
        .toast.error { border-color: rgba(239,68,68,0.5); }
        .toast.error i { color: #ef4444; }
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100px); }
            to { opacity: 1; transform: translateX(0); }
        }

        /* ── MEDIA TRAY ── */
        .media-tray {
            background: rgba(0,0,0,0.3);
            padding: 8px 12px;
            display: flex; gap: 8px;
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--yellow) transparent;
        }
        .media-tray img {
            width: 46px; height: 46px;
            border-radius: 8px; cursor: pointer;
            border: 2px solid transparent;
            object-fit: cover; transition: all 0.2s; flex-shrink: 0;
        }
        .media-tray img:hover { border-color: var(--yellow); transform: scale(1.1); }

        /* ── VIDEO ── */
        .video-box { padding: 10px 12px 0; }
        .video-box video {
            width: 100%; border-radius: 12px;
            max-height: 180px; background: #000;
            border: 1px solid var(--glass-border);
        }

        /* ── CARD BODY ── */
        .card-body {
            padding: 1.4rem;
            display: flex; flex-direction: column; gap: 0.7rem;
            flex: 1;
        }

        .product-name {
            font-size: 1rem; font-weight: 700; color: white; line-height: 1.3;
        }

        .product-description {
            font-size: 0.78rem; color: var(--text-dim); line-height: 1.55;
        }

        .product-meta {
            display: flex; align-items: center; gap: 0.5rem;
            font-size: 0.78rem;
        }
        .meta-label { font-weight: 700; color: var(--yellow); }
        .meta-val { color: white; }

        .price-tag {
            font-size: 1.65rem; font-weight: 800; color: var(--yellow);
            margin-top: 0.2rem;
        }
        .price-tag sup { font-size: 0.9rem; font-weight: 700; vertical-align: super; }

        /* ── DIVIDER ── */
        .card-divider {
            border: none;
            border-top: 1px solid var(--glass-border);
            margin: 0.25rem 0;
        }

        /* ── REVIEWS ── */
        .reviews-header {
            display: flex; align-items: center; gap: 0.5rem;
            font-size: 0.78rem; font-weight: 700; color: white;
            margin-bottom: 0.5rem;
        }
        .reviews-header i { color: var(--yellow); }

        .review-box {
            background: rgba(255,255,255,0.05);
            border-radius: 10px; padding: 10px 12px;
            margin-bottom: 8px;
            border-left: 3px solid var(--yellow);
        }
        .review-top {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 4px;
        }
        .review-stars { color: var(--yellow); font-size: 0.6rem; }
        .review-customer { font-size: 0.72rem; font-weight: 700; color: white; }
        .review-comment { font-size: 0.72rem; color: var(--text-dim); line-height: 1.45; }

        /* ── REVIEW FORM ── */
        .avg-rating-badge {
            display: inline-flex; align-items: center; gap: 3px;
            background: rgba(245,168,0,0.15); border: 1px solid rgba(245,168,0,0.35);
            color: var(--yellow); font-size: 0.72rem; font-weight: 700;
            padding: 1px 6px; border-radius: 20px; line-height: 1.4;
        }
        .star-row { display: inline-flex; align-items: center; gap: 1px; }
        .review-form { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
        .review-form select,
        .review-form input {
            background: rgba(255,255,255,0.07);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            color: white;
            font-family: 'Poppins', sans-serif;
            font-size: 0.75rem;
            padding: 0.45rem 0.65rem;
            transition: all 0.25s;
        }
        .review-form select { flex-shrink: 0; width: 70px; }
        .review-form input { flex: 1; }
        .review-form select:focus,
        .review-form input:focus {
            outline: none;
            border-color: var(--yellow);
            background: rgba(255,255,255,0.1);
        }
        .review-form select option { background: #0f1228; }

        .btn-post {
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 8px;
            padding: 0.45rem 0.875rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.72rem; font-weight: 700;
            cursor: pointer; transition: all 0.25s;
            white-space: nowrap; flex-shrink: 0;
        }
        .btn-post:hover { background: var(--yellow-d); }

        /* ── ADD TO CART BUTTON ── */
        .btn-add-cart {
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 14px;
            padding: 0.9rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.85rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase;
            text-decoration: none;
            cursor: pointer; transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow: 0 6px 20px rgba(245,168,0,0.25);
            margin-top: auto;
        }
        .btn-add-cart:hover {
            background: var(--yellow-d);
            transform: translateY(-2px);
            box-shadow: 0 10px 28px rgba(245,168,0,0.42);
            color: #1a1000; text-decoration: none;
        }

        /* ── BACK BUTTON ── */
        .page-footer-actions {
            display: flex; justify-content: center;
            padding-top: 0.5rem;
        }
        .btn-back {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: transparent;
            border: 1px solid var(--glass-border);
            color: var(--text-light);
            padding: 0.75rem 2rem; border-radius: 12px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.85rem; font-weight: 600;
            text-decoration: none;
            transition: all 0.25s;
        }
        .btn-back:hover { background: rgba(255,255,255,0.08); color: white; border-color: rgba(255,255,255,0.35); }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(22px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(14px); }
            to   { opacity: 1; transform: translateX(0); }
        }

        .product-card-wrapper:nth-child(1) .product-card { animation-delay: 0.05s; }
        .product-card-wrapper:nth-child(2) .product-card { animation-delay: 0.10s; }
        .product-card-wrapper:nth-child(3) .product-card { animation-delay: 0.15s; }
        .product-card-wrapper:nth-child(4) .product-card { animation-delay: 0.20s; }
        .product-card-wrapper:nth-child(5) .product-card { animation-delay: 0.25s; }
        .product-card-wrapper:nth-child(6) .product-card { animation-delay: 0.30s; }

        /* ── PAGE LOADER ── */
        #page-loader {
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(5, 8, 20, 0.92);
            backdrop-filter: blur(10px);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            gap: 1.25rem;
            transition: opacity 0.45s ease, visibility 0.45s ease;
        }
        #page-loader.hidden {
            opacity: 0; visibility: hidden; pointer-events: none;
        }
        .loader-spinner {
            width: 52px; height: 52px;
            border: 3px solid rgba(245,168,0,0.15);
            border-top-color: var(--yellow);
            border-radius: 50%;
            animation: spin 0.75s linear infinite;
        }
        .loader-cart-icon {
            font-size: 1.8rem;
            animation: cartBounce 1s ease-in-out infinite;
        }
        .loader-text {
            font-size: 0.9rem; font-weight: 600;
            color: rgba(255,255,255,0.75);
            letter-spacing: 0.08em;
        }
        .loader-dots span {
            display: inline-block;
            animation: blink 1.2s infinite;
            color: var(--yellow);
        }
        .loader-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loader-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes blink     { 0%,80%,100%{opacity:0} 40%{opacity:1} }
        @keyframes cartBounce{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

        /* ── RESPONSIVE ── */
        @media(max-width: 900px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .budget-bar { padding: 1.25rem 1.5rem; }
            .page-header { flex-direction: column; text-align: center; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }
        @media(max-width: 560px) {
            .product-grid { grid-template-columns: 1fr; }
            .review-form { flex-wrap: wrap; }
            .review-form input { width: 100%; }
        }
      `}} />

      {/* ── PAGE LOADER ── */}
      <div id="page-loader" className={!loading ? 'hidden' : ''}>
        <div className="loader-cart-icon">🛒</div>
        <div className="loader-spinner"></div>
        <div className="loader-text">
          Loading products
          <span className="loader-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      </div>

      <div className="bg-layer"></div>

      {/* ── TOAST CONTAINER ── */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ── FLOATING ALERTS ── */}
      <div className="alert-stack">
        {alerts.success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            <span>{alerts.success}</span>
            <button className="alert-close" onClick={() => setAlerts({...alerts, success: null})}>×</button>
          </div>
        )}
        {alerts.failure && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle"></i>
            <span>{alerts.failure}</span>
            <button className="alert-close" onClick={() => setAlerts({...alerts, failure: null})}>×</button>
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav className={scrolled ? 'scrolled' : ''}>
        <a href="/customer/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
          Ekart
        </a>
        <div className="nav-right">
          <a href="/account/wishlist" className="nav-link-btn" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <i className="fas fa-heart" style={{ color: '#ef4444' }}></i> Wishlist
          </a>
          <a href="/account/spending" className="nav-link-btn" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
            <i className="fas fa-chart-pie" style={{ color: '#10b981' }}></i> Spending
          </a>
          <a href="/view-cart" className="nav-link-btn">
            <i className="fas fa-shopping-cart"></i> Cart
          </a>
          <a href="/customer/home" className="nav-link-btn">
            <i className="fas fa-th-large"></i> Dashboard
          </a>
          <a href="/logout" className="btn-logout">
            <i className="fas fa-sign-out-alt"></i> Logout
          </a>
        </div>
      </nav>

      {/* ── PAGE ── */}
      <main className="page">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Browse <span>Products</span> 🛍️</h1>
            <p>Explore our full catalogue from verified vendors. Use Budget Mode to shop smart.</p>
          </div>
          <div className="page-header-icon">🛒</div>
        </div>

        {/* Budget Bar */}
        <div className="budget-bar">
          <span className="budget-label">
            <i className="fas fa-coins"></i> Budget Mode
          </span>
          <input 
            type="range" 
            min="0" 
            max={maxBudget} 
            step="50" 
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
          <span className="budget-value">
            {budget >= maxBudget ? 'All Products' : `₹${budget.toLocaleString('en-IN')}`}
          </span>
          <span className="budget-count">
            {visibleProductsCount} of {products.length} products
          </span>
          <button className="btn-reset" onClick={() => setBudget(maxBudget)}>
            <i className="fas fa-redo-alt"></i> Reset
          </button>
        </div>

        {/* Product Grid */}
        <div className="product-grid">
          {products.map((p) => {
            const isOverBudget = p.price > budget;
            const currentImg = mainImages[p.id] || p.imageLink;
            const isWishlisted = wishlist.has(p.id);

            return (
              <div 
                key={p.id} 
                className={`product-card-wrapper ${isOverBudget ? 'product-over-budget' : ''}`}
              >
                <div className={`product-card ${!isOverBudget ? 'within-budget' : ''}`}>
                  
                  {/* Main Image */}
                  <div className="img-area">
                    <img className="card-image" src={currentImg} alt={p.name} />
                    <span className="category-pill">{p.category}</span>
                    <button 
                      className={`btn-wishlist ${isWishlisted ? 'active' : ''}`}
                      onClick={() => toggleWishlist(p.id)}
                      title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <i className={isWishlisted ? "fas fa-heart" : "far fa-heart"}></i>
                    </button>
                    <span className="budget-badge"><i className="fas fa-check-double"></i> In Budget</span>
                  </div>

                  {/* Thumbnail Tray */}
                  {p.extraImageList && p.extraImageList.length > 0 && (
                    <div className="media-tray">
                      <img 
                        src={p.imageLink} 
                        onClick={() => handleImageSwap(p.id, p.imageLink)} 
                        alt="Main"
                      />
                      {p.extraImageList.map((url, idx) => (
                        <img 
                          key={idx} 
                          src={url} 
                          onClick={() => handleImageSwap(p.id, url)} 
                          alt={`Extra ${idx}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Video */}
                  {p.videoLink && (
                    <div className="video-box">
                      <video controls>
                        <source src={p.videoLink} type="video/mp4" />
                      </video>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="card-body">
                    <div className="product-name">{p.name}</div>
                    <div className="product-description">{p.description}</div>

                    <div className="product-meta">
                      <span className="meta-label">Stock:</span>
                      <span className="meta-val">{p.stock} units</span>
                    </div>

                    <div className="price-tag">
                      <sup>₹</sup><span>{p.price}</span>
                      {p.discounted && (
                        <>
                          <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: 'rgba(255,255,255,0.4)' }}>
                            ₹{p.mrp}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444', marginLeft: '0.2rem' }}>
                            -{p.discountPercent}%
                          </span>
                        </>
                      )}
                    </div>

                    <hr className="card-divider" />

                    {/* Reviews */}
                    <div>
                      {/* Avg Rating Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                        {p.reviewCount > 0 ? (
                          <>
                            <span className="avg-rating-badge">
                              <i className="fas fa-star" style={{ fontSize: '0.68rem' }}></i>
                              <span>{p.averageRating?.toFixed(1) || '0.0'}</span>
                            </span>
                            <span className="star-row">
                              {renderStars(p.averageRating)}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              ({p.reviewCount} {p.reviewCount === 1 ? 'review' : 'reviews'})
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="star-row">
                              {[1, 2, 3, 4, 5].map(i => (
                                <i key={i} className="far fa-star" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}></i>
                              ))}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>No reviews yet</span>
                          </>
                        )}
                      </div>

                      <div className="reviews-header">
                        <i className="fas fa-star"></i> Customer Reviews
                      </div>

                      {p.reviews && p.reviews.map((review, idx) => (
                        <div key={idx} className="review-box">
                          <div className="review-top">
                            <span className="review-stars">
                              {Array.from({ length: review.rating || 0 }).map((_, i) => (
                                <i key={i} className="fas fa-star"></i>
                              ))}
                            </span>
                            <span className="review-customer">{review.customerName}</span>
                          </div>
                          <p className="review-comment">{review.comment}</p>
                        </div>
                      ))}

                      {/* Review Form */}
                      <form action="/add-review" method="post">
                        <input type="hidden" name="productId" value={p.id || ''} />
                        <div className="review-form">
                          <select name="rating" required defaultValue="5">
                            <option value="5">5 ★</option>
                            <option value="4">4 ★</option>
                            <option value="3">3 ★</option>
                            <option value="2">2 ★</option>
                            <option value="1">1 ★</option>
                          </select>
                          <input type="text" name="comment" placeholder="Write a review…" required />
                          <button type="submit" className="btn-post">Post</button>
                        </div>
                      </form>
                    </div>

                    {/* Add to Cart */}
                    <a href={`/add-cart/${p.id}`} className="btn-add-cart">
                      <i className="fas fa-cart-plus"></i> Add to Cart
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <div className="page-footer-actions">
          <a href="/customer/home" className="btn-back">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </a>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-brand">Ekart</div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>
    </>
  );
};

export default CustomerViewProducts;