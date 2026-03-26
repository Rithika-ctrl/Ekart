import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';

/**
 * AdminViewProducts Component
 * * @param {Object} props
 * @param {Array} props.products - List of product objects [{id, name, description, price, category, stock, imageLink, approved}]
 * @param {Object} props.session - Session notification object {success: string, failure: string}
 * @param {string} props.csrfToken - Security token for API requests
 */
export default function AdminViewProducts({
    products = [],
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [productList, setProductList] = useState(products);
    const [currentFilter, setCurrentFilter] = useState('all');
    const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0 });
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/admin/login'); };
    const [isScrolled, setIsScrolled] = useState(false);
    const [loadingStates, setLoadingStates] = useState({}); // Track loading per product ID
    const [isApproveAllLoading, setIsApproveAllLoading] = useState(false);

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        loadCounts();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 3000);
        return () => clearTimeout(timer);
    }, [session]);

    // --- API LOGIC ---
    const loadCounts = async () => {
        try {
            const response = await authFetch('/api/admin/products/counts');
            const data = await response.json();
            if (data.success) {
                setCounts({
                    total: data.total,
                    pending: data.pending,
                    approved: data.approved
                });
            }
        } catch (err) {
            console.error("Failed to load counts", err);
        }
    };

    const toggleApproval = async (productId) => {
        setLoadingStates(prev => ({ ...prev, [productId]: true }));

        try {
            const response = await authFetch(`/api/admin/products/${productId}/toggle-approval`, { 
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken }
            });
            const data = await response.json();

            if (data.success) {
                setProductList(prev => prev.map(p => 
                    p.id === productId ? { ...p, approved: data.approved } : p
                ));
                loadCounts();
            }
        } catch (err) {
            console.error("Toggle failed", err);
        } finally {
            setLoadingStates(prev => ({ ...prev, [productId]: false }));
        }
    };

    const approveAll = async () => {
        const pendingCount = productList.filter(p => !p.approved).length;
        if (pendingCount === 0) return;
        if (!window.confirm(`Approve all ${pendingCount} pending products?`)) return;

        setIsApproveAllLoading(true);
        try {
            const response = await authFetch('/api/admin/products/approve-all', { 
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken }
            });
            const data = await response.json();
            if (data.success) {
                setProductList(prev => prev.map(p => ({ ...p, approved: true })));
                loadCounts();
            }
        } catch (err) {
            console.error("Approve all failed", err);
        } finally {
            setIsApproveAllLoading(false);
        }
    };

    // --- HELPERS ---
    const filteredProducts = productList.filter(p => {
        if (currentFilter === 'pending') return !p.approved;
        if (currentFilter === 'approved') return p.approved;
        return true;
    });

    const CSS = `:root {
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
            filter: blur(6px); transform: scale(1.08);
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

        .nav-right { display: flex; align-items: center; gap: 1rem; }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .nav-link {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .nav-link:hover { 
            color: var(--yellow); 
            border-color: rgba(245,168,0,0.3); 
            background: rgba(245,168,0,0.08); 
        }
        .nav-link.active {
            color: var(--yellow);
            background: rgba(245,168,0,0.12);
            border-color: rgba(245,168,0,0.4);
        }

        .nav-divider {
            width: 1px;
            height: 24px;
            background: rgba(255,255,255,0.15);
            margin: 0 0.5rem;
        }

        .nav-badge {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.72rem; font-weight: 700;
            padding: 0.3rem 0.8rem; border-radius: 50px;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.3);
            color: var(--yellow);
            letter-spacing: 0.06em; text-transform: uppercase;
        }
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
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; flex-wrap: wrap;
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

        /* ── PRODUCT GRID ── */
        .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.75rem;
        }

        /* ── PRODUCT CARD ── */
        .product-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            animation: fadeUp 0.6s ease both;
            position: relative;
        }
        .product-card:nth-child(1) { animation-delay: 0.05s; }
        .product-card:nth-child(2) { animation-delay: 0.10s; }
        .product-card:nth-child(3) { animation-delay: 0.15s; }
        .product-card:nth-child(4) { animation-delay: 0.20s; }
        .product-card:nth-child(5) { animation-delay: 0.25s; }
        .product-card:nth-child(6) { animation-delay: 0.30s; }

        .product-card:hover {
            transform: translateY(-8px);
            border-color: rgba(245,168,0,0.4);
            box-shadow: 0 24px 55px rgba(0,0,0,0.35);
        }

        /* ── STATUS RIBBON ── */
        .status-ribbon {
            position: absolute; top: 14px; left: 14px;
            display: inline-flex; align-items: center; gap: 0.3rem;
            padding: 4px 12px; border-radius: 50px;
            font-size: 0.65rem; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.07em;
            z-index: 5;
        }
        .ribbon-approved {
            background: rgba(34,197,94,0.25);
            border: 1px solid rgba(34,197,94,0.45);
            color: #4ade80;
        }
        .ribbon-pending {
            background: rgba(245,168,0,0.2);
            border: 1px solid rgba(245,168,0,0.4);
            color: var(--yellow);
        }

        /* ── IMAGE ── */
        .img-area { position: relative; height: 210px; overflow: hidden; flex-shrink: 0; }
        .card-image {
            width: 100%; height: 100%; object-fit: cover;
            transition: transform 0.5s;
        }
        .product-card:hover .card-image { transform: scale(1.07); }

        /* ── CARD BODY ── */
        .card {
            padding: 1.4rem;
            display: flex; flex-direction: column;
            gap: 0.6rem; flex: 1;
        }

        .category-pill {
            display: inline-flex; align-items: center; gap: 0.3rem;
            background: rgba(245,168,0,0.12);
            border: 1px solid rgba(245,168,0,0.25);
            color: var(--yellow);
            font-size: 0.65rem; font-weight: 700;
            padding: 3px 10px; border-radius: 20px;
            text-transform: uppercase; letter-spacing: 0.06em;
            width: fit-content;
        }

        .product-name {
            font-size: 1rem; font-weight: 700; color: white; line-height: 1.3;
        }
        .product-description {
            font-size: 0.775rem; color: var(--text-dim); line-height: 1.55;
        }

        .meta-row {
            display: flex; gap: 1.25rem; flex-wrap: wrap;
        }
        .meta-item { font-size: 0.775rem; }
        .meta-item .meta-label { font-weight: 700; color: var(--yellow); margin-right: 0.3rem; }
        .meta-item .meta-val   { color: var(--text-light); }

        .price-tag {
            font-size: 1.5rem; font-weight: 800; color: var(--yellow);
        }
        .price-tag sup { font-size: 0.85rem; vertical-align: super; font-weight: 700; }

        /* ── CARD DIVIDER ── */
        .card-divider { border: none; border-top: 1px solid var(--glass-border); margin: 0.25rem 0; }

        /* ── ACTION BUTTONS ── */
        .card-actions { display: flex; gap: 0.75rem; margin-top: auto; }

        .btn-approve {
            flex: 1;
            display: flex; align-items: center; justify-content: center; gap: 0.45rem;
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 12px;
            padding: 0.8rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.78rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase;
            text-decoration: none;
            cursor: pointer; transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow: 0 5px 18px rgba(245,168,0,0.25);
        }
        .btn-approve:hover {
            background: var(--yellow-d); color: #1a1000;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(245,168,0,0.4);
        }

        .btn-hide {
            flex: 1;
            display: flex; align-items: center; justify-content: center; gap: 0.45rem;
            background: rgba(255,100,80,0.12);
            border: 1px solid rgba(255,100,80,0.35);
            color: #ff8060;
            border-radius: 12px; padding: 0.8rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.78rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase;
            text-decoration: none;
            cursor: pointer; transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        .btn-hide:hover {
            background: rgba(255,100,80,0.22);
            border-color: rgba(255,100,80,0.6);
            color: #ff8060;
            transform: translateY(-2px);
        }

        /* ── EMPTY STATE ── */
        .empty-state {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 5rem 2rem;
            text-align: center;
            color: var(--text-dim);
        }
        .empty-state i { font-size: 3rem; margin-bottom: 1.25rem; display: block; opacity: 0.4; }
        .empty-state p { font-size: 0.9rem; }

        /* ── BACK BUTTON ── */
        .page-footer {
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

        /* ── RESPONSIVE ── */
        @media(max-width: 1024px) {
            .nav-links { display: none; }
            .nav-divider { display: none; }
        }
        @media(max-width: 900px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }
        @media(max-width: 560px) {
            .product-grid { grid-template-columns: 1fr; }
        }`;

    return (
        <div style={{ fontFamily: 'Poppins, sans-serif', color: 'white', minHeight: '100vh' }}>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({ ...p, success: null }))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({ ...p, failure: null }))}>×</button>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav className={isScrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i> Ekart
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link"><i className="fas fa-home"></i> Dashboard</a>
                        <Link to="/admin/products" className="nav-link active"><i className="fas fa-tasks"></i> Approvals</Link>
                        <Link to="/admin/users" className="nav-link"><i className="fas fa-users"></i> Users</Link>
                    </div>
                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', margin: '0 0.5rem' }}></div>
                    <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            <main className="page">
                {/* Stats Bar */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1.2rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 600 }}>
                        <i className="fas fa-box"></i> Total: {counts.total}
                    </div>
                    <div style={{ background: 'rgba(245,168,0,0.15)', border: '1px solid rgba(245,168,0,0.4)', padding: '0.5rem 1.2rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 600, color: '#f5a800' }}>
                        <i className="fas fa-clock"></i> Pending: {counts.pending}
                    </div>
                    <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', padding: '0.5rem 1.2rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 600, color: '#22c55e' }}>
                        <i className="fas fa-check-circle"></i> Approved: {counts.approved}
                    </div>
                </div>

                {/* Header Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Approve <span style={{ color: 'var(--yellow)' }}>Products</span> 📋</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Review and approve pending vendor listings.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px' }}>
                            <button onClick={() => setCurrentFilter('all')} className={`tab-btn ${currentFilter === 'all' ? 'tab-active' : ''}`}>All</button>
                            <button onClick={() => setCurrentFilter('pending')} className={`tab-btn ${currentFilter === 'pending' ? 'tab-active' : ''}`}>Pending</button>
                            <button onClick={() => setCurrentFilter('approved')} className={`tab-btn ${currentFilter === 'approved' ? 'tab-active' : ''}`}>Approved</button>
                        </div>
                        <button 
                            disabled={isApproveAllLoading}
                            onClick={approveAll} 
                            style={{ background: '#f5a800', color: '#000', border: 'none', padding: '0.55rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {isApproveAllLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-double"></i>}
                            {counts.pending > 0 ? `Approve All Pending (${counts.pending})` : 'All Approved'}
                        </button>
                    </div>
                </div>

                {/* Grid */}
                {productList.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-box-open"></i>
                        <p>No products to review right now.</p>
                    </div>
                ) : (
                    <div className="product-grid">
                        {filteredProducts.map(p => (
                            <div key={p.id} className={`product-card ${p.approved ? 'card-approved' : 'card-pending'}`}>
                                <div className={`status-ribbon ${p.approved ? 'ribbon-approved' : 'ribbon-pending'}`}>
                                    <i className={`fas ${p.approved ? 'fa-check-circle' : 'fa-clock'}`}></i> {p.approved ? 'Approved' : 'Pending'}
                                </div>
                                
                                <div className="img-area">
                                    <img 
                                        className="card-image" 
                                        src={p.imageLink} 
                                        alt={p.name} 
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/200x160?text=No+Image' }} 
                                    />
                                </div>

                                <div className="card-body">
                                    <span className="category-pill">{p.category}</span>
                                    <div className="product-name">{p.name}</div>
                                    <div className="product-description">{p.description}</div>
                                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.775rem' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--yellow)' }}>Stock:</span>
                                        <span style={{ color: 'var(--text-light)' }}>{p.stock} units</span>
                                    </div>
                                    <div className="price-tag"><sup>₹</sup>{p.price}</div>
                                    
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.25rem 0' }} />

                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                                        <button 
                                            disabled={loadingStates[p.id]}
                                            onClick={() => toggleApproval(p.id)}
                                            className={p.approved ? 'btn-hide' : 'btn-approve'}>
                                            {loadingStates[p.id] ? (
                                                <i className="fas fa-spinner fa-spin"></i>
                                            ) : (
                                                <><i className={`fas ${p.approved ? 'fa-eye-slash' : 'fa-check'}`}></i> {p.approved ? 'Hide' : 'Approve'}</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-light)', padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 600, textDecoration: 'none' }}>
                        <i className="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            </main>

            <footer style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--glass-border)', padding: '1.25rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Ekart</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}