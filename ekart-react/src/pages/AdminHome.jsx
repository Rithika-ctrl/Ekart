import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - Admin Dashboard Component
 * Matches admin-home.html and visual expectation screenshots exactly.
 */
export default function AdminHome({ 
    session = { admin: null, success: null, failure: null } 
}) {
    // --- STATE ---
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });

    // --- HANDLERS ---
    const handleLogout = (e) => { 
        if (e) e.preventDefault();
        logout(); 
        navigate('/admin/login'); 
    };

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

    const CSS = `
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

        .nav-links { display: flex; align-items: center; gap: 0.5rem; }
        .nav-link {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .nav-link:hover { color: var(--yellow); border-color: rgba(245,168,0,0.3); background: rgba(245,168,0,0.08); }
        .nav-link.active {
            color: var(--yellow); background: rgba(245,168,0,0.12); border-color: rgba(245,168,0,0.4);
        }

        .nav-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.15); margin: 0 0.5rem; }

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

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .welcome-banner {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.5rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 2rem;
            animation: fadeUp 0.5s ease both;
        }
        .welcome-text h1 { font-size: clamp(1.4rem, 2.5vw, 2rem); font-weight: 700; margin-bottom: 0.35rem; }
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
        .dash-card:hover {
            transform: translateY(-6px);
            border-color: rgba(245,168,0,0.45);
            box-shadow: 0 20px 50px rgba(0,0,0,0.4);
        }

        .dash-card-icon {
            width: 56px; height: 56px;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.35rem; color: var(--yellow);
            transition: all 0.3s;
        }
        .dash-card:hover .dash-card-icon {
            background: var(--yellow);
            color: #1a1000;
            border-color: var(--yellow);
            transform: scale(1.08);
        }

        .dash-card-body h3 { font-size: 1.1rem; font-weight: 600; color: white; margin-bottom: 0.5rem; }
        .dash-card-body p  { font-size: 0.8rem; color: var(--text-dim); line-height: 1.6; }

        .dash-card-arrow {
            position: absolute; bottom: 1.25rem; right: 1.5rem;
            color: rgba(255,255,255,0.15); font-size: 0.8rem;
            transition: all 0.3s;
        }
        .dash-card:hover .dash-card-arrow { color: var(--yellow); transform: translate(3px,-3px); }

        footer {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* ── NAV ── */}
            <nav id="nav" className={scrolled ? 'scrolled' : ''}>
                <Link to="/admin/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    Ekart
                </Link>
                <div className="nav-right">
                    <div className="nav-links">
                        <Link to="/admin/home" className="nav-link active"><i className="fas fa-home"></i> Dashboard</Link>
                        <Link to="/approve-products" className="nav-link"><i className="fas fa-tasks"></i> Approvals</Link>
                        <Link to="/admin/reviews" className="nav-link"><i className="fas fa-star"></i> Reviews</Link>
                        <Link to="/admin/refunds" className="nav-link"><i className="fas fa-undo-alt"></i> Refunds</Link>
                        <Link to="/admin/accounts" className="nav-link"><i className="fas fa-users-cog"></i> Users</Link>
                        <Link to="/analytics" className="nav-link"><i className="fas fa-chart-line"></i> Analytics</Link>
                        <Link to="/admin/delivery" className="nav-link"><i className="fas fa-truck"></i> Delivery</Link>
                        <Link to="/admin/warehouses" className="nav-link"><i className="fas fa-warehouse"></i> Warehouses</Link>
                        <Link to="/admin/policies" className="nav-link"><i className="fas fa-book"></i> Policies & SOPs</Link>
                    </div>
                    <div className="nav-divider"></div>
                    <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>

                    {/* Indian Flag Badge from image_99b223.jpg */}
                    <div className="india-flag-badge">
                        <svg width="22" height="16" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: '2px' }}>
                            <rect width="22" height="16" fill="#fff"/><rect width="22" height="5.33" fill="#FF9933"/><rect y="10.67" width="22" height="5.33" fill="#138808"/>
                            <circle cx="11" cy="8" r="2.5" fill="none" stroke="#000080" strokeWidth="0.5"/><circle cx="11" cy="8" r="0.5" fill="#000080"/>
                            <g stroke="#000080" strokeWidth="0.35" fill="none"><line x1="11" y1="5.5" x2="11" y2="10.5"/><line x1="8.5" y1="8" x2="13.5" y2="8"/></g>
                        </svg>
                        <span>India</span>
                    </div>

                    <a href="#" onClick={handleLogout} className="btn-logout">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            <main className="page">
                {/* Welcome Banner from Screenshot 7.41.59 PM */}
                <div className="welcome-banner">
                    <div className="welcome-text">
                        <h1>Admin <span>Dashboard</span> 🛡️</h1>
                        <p>Manage products, review approvals, and oversee platform users — all in one place.</p>
                    </div>
                    <div className="welcome-icon">⚙️</div>
                </div>

                {/* Grid matching your Scroll Expectation (Screenshot 7.42.49 PM and 7.43.12 PM) */}
                <div className="dash-grid">
                    <Link to="/approve-products" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-tasks"></i></div>
                        <div className="dash-card-body">
                            <h3>Approve Products</h3>
                            <p>Review and approve pending vendor product listings before they go live.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/admin/accounts" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-users-cog"></i></div>
                        <div className="dash-card-body">
                            <h3>User Oversight</h3>
                            <p>Manage user accounts, view profiles, and control access permissions.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/admin/policies" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-book"></i></div>
                        <div className="dash-card-body">
                            <h3>Policies & SOPs</h3>
                            <p>Manage, edit, and publish platform policies and SOP documentation.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/admin/refunds" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-undo-alt"></i></div>
                        <div className="dash-card-body">
                            <h3>Refund Management</h3>
                            <p>Review, approve, or reject customer refund requests.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/admin/content" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-images"></i></div>
                        <div className="dash-card-body">
                            <h3>Content Management</h3>
                            <p>Manage promotional banners for the home page carousel.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/security-settings" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-shield-alt"></i></div>
                        <div className="dash-card-body">
                            <h3>Security Settings</h3>
                            <p>Configure authentication, roles, and access permissions.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/analytics" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-chart-line"></i></div>
                        <div className="dash-card-body">
                            <h3>Analytics & Reports</h3>
                            <p>View platform analytics, sales metrics, and generate reports.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/admin/reviews" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-star"></i></div>
                        <div className="dash-card-body">
                            <h3>Review Management</h3>
                            <p>Monitor, filter, and moderate all customer reviews across the platform.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/admin/coupons" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-tag"></i></div>
                        <div className="dash-card-body">
                            <h3>Coupon Management</h3>
                            <p>Create, manage and track promo codes and discount coupons for customers.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/admin/delivery" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-truck"></i></div>
                        <div className="dash-card-body">
                            <h3>Delivery Management</h3>
                            <p>Approve delivery partners, assign orders, and manage the delivery pipeline.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>

                    <Link to="/admin/warehouses" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-warehouse"></i></div>
                        <div className="dash-card-body">
                            <h3>Warehouse Management</h3>
                            <p>Add and manage warehouses and their served pin codes for delivery.</p>
                        </div>
                        <i className="fas fa-arrow-up-right dash-card-arrow"></i>
                    </Link>
                </div>
            </main>

            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}