import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - Admin Dashboard Component
 * @param {Object} props
 * @param {Object} props.session - Session object containing admin data and alert messages
 */
export default function AdminHome({ 
    session = { admin: null, success: null, failure: null } 
}) {
    // --- STATE ---
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/admin/login'); };
    const [scrolled, setScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        
        const alertTimer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(alertTimer);
        };
    }, []);

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

        .nav-right { display: flex; align-items: center; gap: 1rem; }

        /* ── INDIAN FLAG BADGE ── */
        .india-flag-badge {
            display: flex; align-items: center; gap: 0.4rem;
            padding: 0.3rem 0.65rem 0.3rem 0.5rem;
            border-radius: 20px;
            border: 1px solid rgba(255,153,51,0.45);
            background: rgba(255,153,51,0.08);
            font-size: 0.72rem; font-weight: 600;
            color: rgba(255,255,255,0.85);
            letter-spacing: 0.03em;
            flex-shrink: 0;
            user-select: none;
        }


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
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        /* ── WELCOME BANNER ── */
        .welcome-banner {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.5rem 3rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2rem;
            animation: fadeUp 0.5s ease both;
        }
        .welcome-text h1 {
            font-size: clamp(1.4rem, 2.5vw, 2rem);
            font-weight: 700; margin-bottom: 0.35rem;
        }
        .welcome-text h1 span { color: var(--yellow); }
        .welcome-text p { font-size: 0.875rem; color: var(--text-dim); }

        .welcome-icon {
            width: 72px; height: 72px;
            background: rgba(245,168,0,0.15);
            border: 2px solid rgba(245,168,0,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.75rem; flex-shrink: 0;
        }

        /* ── DASH GRID ── */
        .dash-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
            max-width: 1000px;
            margin: 0 auto;
            justify-items: center;
        }

        /* Handle 5 cards: center the last 2 cards */
        .dash-grid > .dash-card:nth-last-child(2):nth-child(3n + 1),
        .dash-grid > .dash-card:last-child:nth-child(3n + 2) {
            justify-self: end;
        }
        .dash-grid > .dash-card:last-child:nth-child(3n + 2) {
            justify-self: start;
        }
        /* Bottom row centering wrapper */
        @supports (grid-template-columns: subgrid) {
            .dash-grid {
                justify-content: center;
            }
        }

        .dash-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 18px;
            padding: 2rem 1.75rem;
            text-decoration: none;
            color: var(--text-white);
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1rem;
            position: relative;
            overflow: hidden;
            animation: fadeUp 0.5s ease both;
            width: 100%;
            max-width: 320px;
            min-height: 200px;
        }
        .dash-card:nth-child(1) { animation-delay: 0.05s; }
        .dash-card:nth-child(2) { animation-delay: 0.10s; }
        .dash-card:nth-child(3) { animation-delay: 0.15s; }
        .dash-card:nth-child(4) { animation-delay: 0.20s; }
        .dash-card:nth-child(5) { animation-delay: 0.25s; }
        .dash-card:nth-child(6) { animation-delay: 0.30s; }

        .dash-card::before {
            content: '';
            position: absolute; inset: 0; border-radius: 18px;
            background: linear-gradient(135deg, rgba(245,168,0,0.08), transparent);
            opacity: 0; transition: opacity 0.3s;
        }
        .dash-card:hover {
            transform: translateY(-6px);
            border-color: rgba(245,168,0,0.45);
            box-shadow: 0 20px 50px rgba(0,0,0,0.4);
        }
        .dash-card:hover::before { opacity: 1; }

        .dash-card-icon {
            width: 56px; height: 56px;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.35rem; color: var(--yellow);
            transition: all 0.3s;
            flex-shrink: 0;
        }
        .dash-card:hover .dash-card-icon {
            background: var(--yellow);
            color: #1a1000;
            border-color: var(--yellow);
            transform: scale(1.08);
        }

        .dash-card-#root { flex: 1; }
        .dash-card-body h3 { font-size: 1.1rem; font-weight: 600; color: white; margin-bottom: 0.5rem; }
        .dash-card-body p  { font-size: 0.8rem; color: var(--text-dim); line-height: 1.6; }

        .dash-card-arrow {
            position: absolute; bottom: 1.25rem; right: 1.5rem;
            color: rgba(255,255,255,0.15); font-size: 0.8rem;
            transition: all 0.3s;
        }
        .dash-card:hover .dash-card-arrow { color: var(--yellow); transform: translate(3px,-3px); }

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
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(14px); }
            to   { opacity: 1; transform: translateX(0); }
        }

        /* ── RESPONSIVE ── */
        @media(max-width: 1024px) {
            .dash-grid { grid-template-columns: repeat(2, 1fr); max-width: 700px; }
            .dash-card { max-width: none; }
            .nav-links { display: none; }
            .nav-divider { display: none; }
        }
        @media(max-width: 700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .welcome-banner { flex-direction: column; text-align: center; }
            .dash-grid { grid-template-columns: 1fr; max-width: 100%; gap: 1rem; }
            .dash-card { max-width: 400px; margin: 0 auto; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }`;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{CSS}</style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            <div className="bg-layer"></div>

            {/* Alert Stack */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts(prev => ({...prev, success: null}))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts(prev => ({...prev, failure: null}))}>×</button>
                    </div>
                )}
            </div>

            {/* Navbar matching image_99b223.jpg */}
            <nav id="nav" className={scrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ color: 'var(--yellow)', fontSize: '1.2rem' }}></i> Ekart
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link active"><i className="fas fa-home"></i> Dashboard</a>
                        <Link to="/admin/products" className="nav-link"><i className="fas fa-list-check"></i> Approvals</Link>
                        <Link to="/admin/reviews" className="nav-link"><i className="fas fa-star"></i> Reviews</Link>
                        <Link to="/admin/refunds" className="nav-link"><i className="fas fa-rotate-left"></i> Refunds</Link>
                        <Link to="/admin/accounts" className="nav-link"><i className="fas fa-users-gear"></i> Users</Link>
                        <Link to="/analytics" className="nav-link"><i className="fas fa-chart-line"></i> Analytics</Link>
                        <Link to="/admin/delivery" className="nav-link"><i className="fas fa-truck-fast"></i> Delivery</Link>
                        <Link to="/admin/warehouse" className="nav-link"><i className="fas fa-warehouse"></i> Warehouses</Link>
                        <Link to="/admin/policies" className="nav-link"><i className="fas fa-book-open"></i> Policies & SOPs</Link>
                    </div>
                    <span className="nav-badge"><i className="fas fa-shield-halved"></i> Admin</span>
                    <div className="india-flag-badge">
                        <img src="https://flagcdn.com/w20/in.png" alt="India" style={{ width: '18px', borderRadius: '2px' }} />
                        <span>India</span>
                    </div>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout"><i className="fas fa-right-from-bracket"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                {/* Welcome Banner matching image_99b223.jpg */}
                <div className="welcome-banner">
                    <div className="welcome-text">
                        <h1>Admin <span>Dashboard</span> 🛡️</h1>
                        <p>Manage products, review approvals, and oversee platform users — all in one place.</p>
                    </div>
                    <div className="welcome-icon">
                        <i className="fas fa-gear"></i>
                    </div>
                </div>

                {/* Dashboard Grid matching image_99b223.jpg */}
                <div className="dash-grid">
                    <Link to="/admin/products" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-list-check"></i></div>
                        <div className="dash-card-body">
                            <h3>Approve Products</h3>
                            <p>Review and approve pending vendor product listings before they go live.</p>
                        </div>
                    </Link>

                    <Link to="/admin/accounts" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-users-gear"></i></div>
                        <div className="dash-card-body">
                            <h3>User Oversight</h3>
                            <p>Manage user accounts, view profiles, and control access permissions.</p>
                        </div>
                    </Link>

                    {session.admin != null && (
                        <Link to="/admin/policies" className="dash-card">
                            <div className="dash-card-icon"><i className="fas fa-book-open"></i></div>
                            <div className="dash-card-body">
                                <h3>Policies & SOPs</h3>
                                <p>Manage, edit, and publish platform policies and SOP documentation.</p>
                            </div>
                        </Link>
                    )}

                    {session.admin != null && (
                        <Link to="/admin/refunds" className="dash-card">
                            <div className="dash-card-icon"><i className="fas fa-rotate-left"></i></div>
                            <div className="dash-card-body">
                                <h3>Refund Management</h3>
                                <p>Review, approve, or reject customer refund requests.</p>
                            </div>
                        </Link>
                    )}

                    {session.admin != null && (
                        <Link to="/admin/content" className="dash-card">
                            <div className="dash-card-icon"><i className="fas fa-image"></i></div>
                            <div className="dash-card-body">
                                <h3>Content Management</h3>
                                <p>Manage promotional banners for the home page carousel.</p>
                            </div>
                        </Link>
                    )}

                    {session.admin != null && (
                        <Link to="/security-settings" className="dash-card">
                            <div className="dash-card-icon"><i className="fas fa-shield-halved"></i></div>
                            <div className="dash-card-body">
                                <h3>Security Settings</h3>
                                <p>Configure authentication, roles, and access permissions.</p>
                            </div>
                        </Link>
                    )}

                    {/* Additional required cards from original structure */}
                    {session.admin != null && (
                        <>
                            <Link to="/analytics" className="dash-card">
                                <div className="dash-card-icon"><i className="fas fa-chart-line"></i></div>
                                <div className="dash-card-body">
                                    <h3>Analytics & Reports</h3>
                                    <p>View platform analytics, sales metrics, and generate reports.</p>
                                </div>
                            </Link>

                            <Link to="/admin/reviews" className="dash-card">
                                <div className="dash-card-icon"><i className="fas fa-star"></i></div>
                                <div className="dash-card-body">
                                    <h3>Review Management</h3>
                                    <p>Monitor, filter, and moderate all customer reviews across the platform.</p>
                                </div>
                            </Link>

                            <Link to="/admin/coupons" className="dash-card">
                                <div className="dash-card-icon"><i className="fas fa-tag"></i></div>
                                <div className="dash-card-body">
                                    <h3>Coupon Management</h3>
                                    <p>Create, manage and track promo codes and discount coupons for customers.</p>
                                </div>
                            </Link>

                            <Link to="/admin/delivery" className="dash-card">
                                <div className="dash-card-icon"><i className="fas fa-truck-fast"></i></div>
                                <div className="dash-card-body">
                                    <h3>Delivery Management</h3>
                                    <p>Approve delivery partners, assign orders, and manage the delivery pipeline.</p>
                                </div>
                            </Link>

                            <Link to="/admin/warehouse" className="dash-card">
                                <div className="dash-card-icon"><i className="fas fa-warehouse"></i></div>
                                <div className="dash-card-body">
                                    <h3>Warehouse Management</h3>
                                    <p>Add and manage warehouses and their served pin codes for delivery.</p>
                                </div>
                            </Link>
                        </>
                    )}
                </div>
            </main>

            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}