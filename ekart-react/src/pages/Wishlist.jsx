import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - My Wishlist Component (Empty State)
 * * @param {Object} props
 * @param {Array} props.products - List of products in the wishlist
 * @param {number} props.wishlistCount - Total number of items saved
 * @param {Object} props.session - Session object for success/failure alerts
 */
export default function Wishlist({ 
    products = [], 
    wishlistCount = 0, 
    session = { success: null, failure: null } 
}) {
    // --- STATE ---
    const [wishlistItems, setWishlistItems] = useState(products);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
    const [scrolled, setScrolled] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentCartProductId, setCurrentCartProductId] = useState(null);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        const alertTimer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 5000);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(alertTimer);
        };
    }, []);

    // --- HANDLERS ---
    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const removeFromWishlist = async (productId) => {
        try {
            const response = await authFetch(`/api/wishlist/${productId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            
            if (data.success) {
                setWishlistItems(prev => prev.filter(p => p.id !== productId));
                showToast('Removed from wishlist', 'success');
                if (wishlistItems.length <= 1) {
                    window.location.reload();
                }
            } else {
                showToast(data.message || 'Failed to remove', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        }
    };

    const addToCartFromWishlist = async (productId) => {
        setCurrentCartProductId(productId);
        try {
            const response = await fetch(`/add-cart/${productId}`);
            if (response.ok) {
                setShowModal(true);
            } else {
                showToast('Failed to add to cart', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        }
    };

    const handleCartChoice = async (keepInWishlist) => {
        setShowModal(false);
        if (!keepInWishlist && currentCartProductId) {
            await removeFromWishlist(currentCartProductId);
            showToast('Moved to cart', 'success');
        } else {
            showToast('Added to cart (kept in wishlist)', 'success');
        }
        setCurrentCartProductId(null);
    };

    const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card:   rgba(255, 255, 255, 0.13);
            --glass-nav:    rgba(0, 0, 0, 0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
            --red:          #ef4444;
            --green:        #22c55e;
        }
            /* Analytics styles scoped */
            .ekart-analytics-hide { display:none !important; }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        #root {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
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
        .nav-link-btn.active { color: var(--yellow); border-color: rgba(245,168,0,0.4); }

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
            background: rgba(239,68,68,0.15);
            border: 2px solid rgba(239,68,68,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; flex-shrink: 0;
            color: var(--red);
        }

        /* ── EMPTY STATE ── */
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            animation: fadeUp 0.5s ease both;
        }
        .empty-state i {
            font-size: 4rem;
            color: var(--text-dim);
            margin-bottom: 1.5rem;
        }
        .empty-state h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        .empty-state p {
            color: var(--text-dim);
            margin-bottom: 2rem;
        }
        .btn-browse {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--yellow);
            color: #1a1000;
            text-decoration: none;
            padding: 0.8rem 2rem;
            border-radius: 50px;
            font-weight: 700;
            font-size: 0.875rem;
            transition: all 0.3s;
        }
        .btn-browse:hover {
            background: var(--yellow-d);
            transform: translateY(-2px);
        }

        /* ── PRODUCT GRID ── */
        .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.75rem;
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

        /* ── IMAGE AREA ── */
        .img-area { position: relative; height: 200px; overflow: hidden; flex-shrink: 0; }
        .card-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
        .product-card:hover .card-image { transform: scale(1.07); }

        .category-pill {
            position: absolute; top: 12px; left: 12px;
            background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
            border: 1px solid var(--glass-border);
            color: var(--yellow); font-size: 0.65rem; font-weight: 700;
            padding: 4px 10px; border-radius: 20px;
            text-transform: uppercase; letter-spacing: 0.06em;
        }

        .btn-remove-wishlist {
            position: absolute; top: 12px; right: 12px;
            width: 36px; height: 36px;
            background: rgba(239,68,68,0.9);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 10;
        }
        .btn-remove-wishlist:hover {
            background: var(--red);
            transform: scale(1.1);
        }

        /* ── CARD BODY ── */
        .card-#root {
            padding: 1.25rem;
            display: flex; flex-direction: column; gap: 0.6rem;
            flex: 1;
        }

        .product-name {
            font-size: 1rem; font-weight: 700; color: white; line-height: 1.3;
        }

        .product-description {
            font-size: 0.75rem; color: var(--text-dim); line-height: 1.55;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .product-meta {
            display: flex; align-items: center; gap: 0.5rem;
            font-size: 0.75rem;
        }
        .meta-label { font-weight: 700; color: var(--yellow); }
        .meta-val { color: white; }

        .price-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: auto;
            padding-top: 0.75rem;
            border-top: 1px solid var(--glass-border);
        }

        .price-tag {
            font-size: 1.4rem; font-weight: 800; color: var(--yellow);
        }
        .price-tag sup { font-size: 0.8rem; font-weight: 700; vertical-align: super; }

        .stock-badge {
            font-size: 0.7rem;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 20px;
        }
        .stock-badge.in-stock {
            background: rgba(34,197,94,0.15);
            color: var(--green);
            border: 1px solid rgba(34,197,94,0.3);
        }
        .stock-badge.out-of-stock {
            background: rgba(239,68,68,0.15);
            color: var(--red);
            border: 1px solid rgba(239,68,68,0.3);
        }

        /* ── CARD ACTIONS ── */
        .card-actions {
            padding: 1rem 1.25rem;
            display: flex;
            gap: 0.75rem;
            border-top: 1px solid var(--glass-border);
        }

        .btn-add-cart {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            background: var(--yellow);
            color: #1a1000;
            text-decoration: none;
            padding: 0.7rem 1rem;
            border-radius: 10px;
            font-weight: 700;
            font-size: 0.8rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-add-cart:hover {
            background: var(--yellow-d);
            transform: translateY(-2px);
        }
        .btn-add-cart:disabled {
            background: rgba(255,255,255,0.1);
            color: var(--text-dim);
            cursor: not-allowed;
            transform: none;
        }

        .btn-remove {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            background: rgba(239,68,68,0.1);
            color: var(--red);
            text-decoration: none;
            padding: 0.7rem 1rem;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.8rem;
            border: 1px solid rgba(239,68,68,0.3);
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-remove:hover {
            background: rgba(239,68,68,0.2);
            border-color: rgba(239,68,68,0.5);
        }

        /* ── TOAST ── */
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
            min-width: 280px;
        }
        .toast.success { border-color: rgba(34,197,94,0.5); }
        .toast.success i { color: var(--green); }
        .toast.error { border-color: rgba(239,68,68,0.5); }
        .toast.error i { color: var(--red); }

        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100px); }
            to { opacity: 1; transform: translateX(0); }
        }

        /* ── MODAL ── */
        .modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        }
        .modal-overlay.show { display: flex; }

        .modal {
            background: rgba(15, 18, 40, 0.95);
            backdrop-filter: blur(24px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 2rem 2.5rem;
            max-width: 400px;
            width: 90%;
            text-align: center;
            animation: popIn 0.3s ease both;
        }

        @keyframes popIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        .modal h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }
        .modal p {
            color: var(--text-dim);
            font-size: 0.85rem;
            margin-bottom: 1.5rem;
        }
        .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        .modal-btn {
            padding: 0.7rem 1.5rem;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-family: 'Poppins', sans-serif;
        }
        .modal-btn.primary {
            background: var(--yellow);
            color: #1a1000;
        }
        .modal-btn.primary:hover {
            background: var(--yellow-d);
        }
        .modal-btn.secondary {
            background: rgba(255,255,255,0.1);
            color: var(--text-light);
            border: 1px solid var(--glass-border);
        }
        .modal-btn.secondary:hover {
            background: rgba(255,255,255,0.15);
        }

        /* ── FOOTER ── */
        footer {
            margin-top: auto;
            padding: 1.5rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            border-top: 1px solid var(--glass-border);
            background: rgba(0,0,0,0.2);
        }
        .footer-brand { font-weight: 700; font-size: 1rem; }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
        }

        /* ── RESPONSIVE ── */
        @media(max-width: 900px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }
        @media(max-width: 560px) {
            .product-grid { grid-template-columns: 1fr; }
            .card-actions { flex-direction: column; }
        }

        /* Animation delays */
        .product-card:nth-child(1) { animation-delay: 0.05s; }
        .product-card:nth-child(2) { animation-delay: 0.10s; }
        .product-card:nth-child(3) { animation-delay: 0.15s; }
        .product-card:nth-child(4) { animation-delay: 0.20s; }
        .product-card:nth-child(5) { animation-delay: 0.25s; }
        .product-card:nth-child(6) { animation-delay: 0.30s; }`;

    return (
        <div className="wishlist-body">
            <style>{CSS}</style>
            <div className="bg-layer"></div>
            
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            {/* --- NAV --- */}
            <nav id="nav" className={scrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize: '1.2rem', marginRight: '8px'}}></i>
                    Ekart
                </a>
                <div className="nav-right">
                    <Link to="/wishlist" className="nav-link-btn active">
                        <i className="fas fa-heart"></i> Wishlist
                    </Link>
                    <Link to="/cart" className="nav-link-btn">
                        <i className="fas fa-shopping-cart"></i> Cart
                    </Link>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link-btn">
                        <i className="fas fa-th-large"></i> Dashboard
                    </a>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            {/* --- MAIN PAGE --- */}
            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>My <span>Wishlist</span></h1>
                        <p>{wishlistCount} items saved for later</p>
                    </div>
                    <div className="page-header-icon">
                        <i className="fas fa-heart"></i>
                    </div>
                </div>

                {/* --- EMPTY STATE UI (Matches Uploaded Screenshot) --- */}
                <div className="empty-state">
                    <i className="far fa-heart"></i>
                    <h2>Your wishlist is empty</h2>
                    <p>Start adding items you love by clicking the heart icon on products</p>
                    <Link to="/products" className="btn-browse">
                        <i className="fas fa-shopping-bag" style={{opacity: 0.3}}></i> Browse Products
                    </Link>
                </div>
            </main>
        </div>
    );
}