import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';

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
            display: flex; flex-direction: column;
        }

        /* ── Background ── */
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

        /* ── Navbar ── */
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
            border: 1px solid var(--glass-border); transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        /* ── Alert Stack ── */
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
        .alert-success { border-color: rgba(34,197,94,0.45);  color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── Page ── */
        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 2rem;
        }
        .inner { width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 2rem; }

        /* ── Page Header ── */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem;
            animation: fadeUp 0.45s ease both;
        }
        .page-header-left h1 { font-size: clamp(1.2rem, 2.5vw, 1.75rem); font-weight: 700; margin-bottom: 0.25rem; }
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
        .header-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }

        /* ── Add Product CTA ── */
        .btn-add {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 10px; padding: 0.6rem 1.25rem;
            font-family: 'Poppins', sans-serif; font-size: 0.82rem; font-weight: 700;
            letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer;
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow: 0 4px 16px rgba(245,168,0,0.25);
            white-space: nowrap;
        }
        .btn-add:hover { background: var(--yellow-d); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(245,168,0,0.4); color: #1a1000; text-decoration: none; }

        /* ── Product Grid ── */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            animation: fadeUp 0.5s ease 0.05s both;
        }

        /* ── Product Card ── */
        .product-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            overflow: hidden;
            display: flex; flex-direction: column;
            transition: transform 0.25s, box-shadow 0.25s;
        }
        .product-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 24px 60px rgba(0,0,0,0.4);
            border-color: rgba(245,168,0,0.3);
        }

        /* Product image */
        .product-img-wrap {
            position: relative; width: 100%; height: 190px; overflow: hidden;
        }
        .product-img-wrap img {
            width: 100%; height: 100%; object-fit: cover;
            transition: transform 0.4s ease;
        }
        .product-card:hover .product-img-wrap img { transform: scale(1.05); }
        .product-img-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(180deg, transparent 50%, rgba(5,8,20,0.7) 100%);
        }
        .product-category-badge {
            position: absolute; top: 0.75rem; right: 0.75rem;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.35);
            backdrop-filter: blur(8px);
            color: var(--yellow); font-size: 0.65rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.08em;
            padding: 0.25rem 0.65rem; border-radius: 20px;
        }

        /* Product body */
        .product {
            padding: 1.25rem 1.4rem;
            display: flex; flex-direction: column; gap: 0.6rem; flex: 1;
        }

        .product-name {
            font-size: 1rem; font-weight: 700; color: var(--text-white);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .product-desc {
            font-size: 0.75rem; color: var(--text-dim);
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden; line-height: 1.55;
        }

        .product-meta {
            display: flex; align-items: center; justify-content: space-between;
            margin-top: 0.25rem;
        }
        .product-price {
            font-size: 1.15rem; font-weight: 800; color: var(--yellow);
        }
        .product-stock {
            display: flex; align-items: center; gap: 0.3rem;
            font-size: 0.72rem; font-weight: 600;
            padding: 0.2rem 0.65rem; border-radius: 20px;
        }
        .product-stock.ok  { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.25); }
        .product-stock.low { background: rgba(245,168,0,0.12); color: var(--yellow); border: 1px solid rgba(245,168,0,0.25); }
        .product-stock.out { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }

        /* Action buttons */
        .product-actions {
            display: flex; gap: 0.6rem;
            padding: 0 1.4rem 1.4rem;
            margin-top: auto;
        }
        .btn-edit, .btn-delete {
            flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
            border: none; border-radius: 10px; padding: 0.6rem 0.5rem;
            font-family: 'Poppins', sans-serif; font-size: 0.78rem; font-weight: 700;
            letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer;
            text-decoration: none; transition: all 0.2s;
        }
        .btn-edit {
            background: rgba(245,168,0,0.15); color: var(--yellow);
            border: 1px solid rgba(245,168,0,0.3);
        }
        .btn-edit:hover { background: var(--yellow); color: #1a1000; text-decoration: none; transform: translateY(-1px); }
        .btn-delete {
            background: rgba(239,68,68,0.1); color: #ef4444;
            border: 1px solid rgba(239,68,68,0.25);
        }
        .btn-delete:hover { background: #ef4444; color: white; text-decoration: none; transform: translateY(-1px); }

        /* ── Empty state ── */
        .empty-state {
            text-align: center; padding: 4rem 2rem;
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            animation: fadeUp 0.5s ease both;
        }
        .empty-state-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.4; }
        .empty-state h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-light); }
        .empty-state p  { font-size: 0.82rem; color: var(--text-dim); margin-bottom: 1.5rem; }

        /* ── Back link ── */
        .back-wrap {
            display: flex; justify-content: center;
            animation: fadeUp 0.5s ease 0.1s both;
        }
        .back-link {
            display: inline-flex; align-items: center; gap: 0.4rem;
            color: var(--text-dim); text-decoration: none;
            font-size: 0.78rem; transition: color 0.2s;
        }
        .back-link:hover { color: var(--text-white); text-decoration: none; }

        /* ── Footer ── */
        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        /* ── Animations ── */
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        /* stagger product cards */
        .product-card:nth-child(1)  { animation: fadeUp 0.4s ease 0.05s both; }
        .product-card:nth-child(2)  { animation: fadeUp 0.4s ease 0.10s both; }
        .product-card:nth-child(3)  { animation: fadeUp 0.4s ease 0.15s both; }
        .product-card:nth-child(4)  { animation: fadeUp 0.4s ease 0.20s both; }
        .product-card:nth-child(5)  { animation: fadeUp 0.4s ease 0.25s both; }
        .product-card:nth-child(6)  { animation: fadeUp 0.4s ease 0.30s both; }
        .product-card:nth-child(n+7){ animation: fadeUp 0.4s ease 0.35s both; }

        /* ── Responsive ── */
        @media(max-width: 700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .header-actions { justify-content: center; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }`;

/**
 * VendorViewProducts Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {Array} props.products - List of products to display
 */
export default function VendorViewProducts({
    successMessage = null,
    failureMessage = null,
    products = []
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/vendor/login'); };
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    const [localProducts, setLocalProducts] = useState(products || []);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => {
                setFadeAlerts(true);
            }, 2500);
            const timer2 = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 3000);
            
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, [showSuccess, showFailure]);

    // Fetch vendor products when component mounts if no products prop provided
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            if (products && products.length > 0) return; // props provided
            setLoading(true);
            setApiError(null);
            try {
                const res = await vendorApi.products();
                if (res?.data?.success) {
                    if (mounted) setLocalProducts(res.data.products || []);
                } else {
                    if (mounted) setApiError(res?.data?.message || 'Failed to load products');
                }
            } catch (err) {
                if (mounted) setApiError(err?.response?.data?.message || err.message || 'Failed to load products');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [products]);

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Manage Products</title>
            <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3Cpath fill='%23f5a800' d='M528.12 301.319l47.273-208C578.806 78.301 567.391 64 551.99 64H159.208l-9.166-44.81C147.758 8.021 137.93 0 126.529 0H24C10.745 0 0 10.745 0 24v16c0 13.255 10.745 24 24 24h69.883l70.248 343.435C147.325 417.1 136 435.222 136 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-15.674-6.447-29.835-16.824-40h209.647C430.447 426.165 424 440.326 424 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-22.172-12.888-41.332-31.579-50.405l5.517-24.276c3.413-15.018-8.002-29.319-23.403-29.319H218.117l-6.545-32h293.145c11.206 0 20.92-7.754 23.403-18.681z'/%3E%3C/svg%3E" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* Alert Stack */}
            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={alertStyle}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            {/* Navbar */}
            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <Link to="/vendor" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </Link>
                <div className="nav-right">
                    <Link to="/vendor/add-product" className="nav-link-btn"><i className="fas fa-plus"></i> Add Product</Link>
                    <Link to="/vendor" className="nav-link-btn"><i className="fas fa-th-large"></i> Dashboard</Link>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Manage <span>Products</span> 📦</h1>
                        <p>View, edit, or remove your listed items.</p>
                    </div>
                    <Link to="/vendor/add-product" className="btn-add">
                        <i className="fas fa-plus-circle"></i> New Product
                    </Link>
                </div>

                {/* Products Grid */}
                { (localProducts && localProducts.length > 0) ? (
                    <div className="products-grid">
                        {localProducts.map((p, index) => (
                            <div key={p.id || index} className="product-card">
                                <div className="product-image-wrapper">
                                    <img src={p.imageLink} alt={p.name} className="product-image" />
                                    <span className="category-badge">{p.category}</span>
                                </div>
                                <div className="product-info">
                                    <h3 className="product-title">{p.name}</h3>
                                    <div className="price-tag">
                                        <span className="currency">₹</span>{p.price}
                                    </div>
                                    <div className="stock-info">
                                        {p.stock > 10 && (
                                            <span className="stock-badge in-stock">
                                                <i className="fas fa-check-circle"></i> In Stock ({p.stock})
                                            </span>
                                        )}
                                        {p.stock > 0 && p.stock <= 10 && (
                                            <span className="stock-badge low-stock">
                                                <i className="fas fa-exclamation-triangle"></i> Low Stock ({p.stock})
                                            </span>
                                        )}
                                        {p.stock === 0 && (
                                            <span className="stock-badge out-stock">
                                                <i className="fas fa-times-circle"></i> Out of Stock
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="product-actions">
                                    <a href={`/edit-product/${p.id}`} className="btn-edit">
                                        <i className="fas fa-edit"></i> Edit
                                    </a>
                                    <a href={`/delete/${p.id}`} className="btn-delete" onClick={(e) => { if(!window.confirm('Delete this product?')) e.preventDefault(); }}>
                                        <i className="fas fa-trash-alt"></i> Delete
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <h3>{ loading ? 'Loading your products...' : (apiError ? 'Unable to load products' : 'No Products Listed Yet') }</h3>
                        <p>{ apiError ? apiError : (loading ? 'Please wait while we fetch your listings.' : "You haven't added any products. Start by listing your first item!") }</p>
                        <Link to="/vendor/add-product" className="btn-add"><i className="fas fa-plus-circle"></i> Add Your First Product</Link>
                    </div>
                )}

                {/* Back */}
                <div className="back-wrap">
                    <Link to="/vendor" className="back-link">
                        <i className="fas fa-arrow-left"></i> Back to Dashboard
                    </Link>
                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </>
    );
}