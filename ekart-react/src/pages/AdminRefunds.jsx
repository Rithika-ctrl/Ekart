import React, { useState, useEffect } from 'react';

/**
 * Ekart - Admin Dashboard Component
 * @param {Object} props
 * @param {Object} props.session - Session object containing admin data and alert messages
 */
export default function AdminHome({ 
    session = { admin: null, success: null, failure: null } 
}) {
    // --- STATE ---
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

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Poppins', sans-serif; min-height: 100vh; color: var(--text-white); display: flex; flex-direction: column; overflow-x: hidden; }

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: ''; position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
        }
        .bg-layer::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 0.75rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border); transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }
        .nav-brand { font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-brand span { color: var(--yellow); }

        .nav-links { display: flex; align-items: center; gap: 0.4rem; }
        .nav-link { 
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none; 
            font-size: 0.8rem; font-weight: 500; padding: 0.5rem 0.8rem; border-radius: 8px; 
            transition: all 0.2s; 
        }
        .nav-link:hover { color: var(--yellow); background: rgba(245,168,0,0.08); }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); border: 1px solid rgba(245,168,0,0.3); }

        .nav-right { display: flex; align-items: center; gap: 0.8rem; }
        .nav-badge { 
            display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; font-weight: 700; 
            padding: 0.4rem 0.9rem; border-radius: 50px; background: rgba(245,168,0,0.15); 
            border: 1px solid rgba(245,168,0,0.3); color: var(--yellow); text-transform: uppercase; 
        }

        .india-flag-badge {
            display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.7rem; 
            border-radius: 20px; border: 1px solid rgba(255,153,51,0.45); 
            background: rgba(255,153,51,0.08); font-size: 0.7rem; font-weight: 600; color: white;
        }

        .btn-logout { 
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none; 
            font-size: 0.8rem; font-weight: 500; padding: 0.5rem 1rem; border-radius: 8px; 
            border: 1px solid rgba(255,255,255,0.15); transition: all 0.2s; 
        }
        .btn-logout:hover { background: rgba(255,100,80,0.1); border-color: rgba(255,100,80,0.4); color: #ff8060; }

        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert { padding: 0.875rem 1.25rem; background: rgba(10,12,30,0.88); backdrop-filter: blur(16px); border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.625rem; font-size: 0.825rem; min-width: 260px; animation: slideIn 0.3s ease both; }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }

        .page { flex: 1; padding: 7rem 4rem 3rem; display: flex; flex-direction: column; gap: 2rem; max-width: 1400px; margin: 0 auto; width: 100%; }

        .welcome-banner {
            background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
            border-radius: 24px; padding: 3rem 3.5rem; display: flex; align-items: center; justify-content: space-between;
            animation: fadeUp 0.5s ease both;
        }
        .welcome-text h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; }
        .welcome-text h1 span { color: var(--yellow); }
        .welcome-text p { font-size: 0.95rem; color: var(--text-dim); font-weight: 400; }
        .welcome-icon { 
            width: 64px; height: 64px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); 
            border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--text-dim);
        }

        .dash-grid { 
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; 
            animation: fadeUp 0.6s ease 0.2s both;
        }

        .dash-card {
            background: var(--glass-card); backdrop-filter: blur(18px); border: 1px solid var(--glass-border);
            border-radius: 22px; padding: 2.5rem 2rem; text-decoration: none; color: white;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1); display: flex; flex-direction: column;
            align-items: center; text-align: center; gap: 1.25rem; position: relative;
        }
        .dash-card:hover { transform: translateY(-8px); border-color: rgba(245,168,0,0.4); background: rgba(245,168,0,0.03); }

        .dash-card-icon {
            width: 50px; height: 50px; background: transparent; border-radius: 50%;
            display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: var(--yellow);
            border: 1.5px dashed rgba(245,168,0,0.4); transition: all 0.3s;
        }
        .dash-card:hover .dash-card-icon { background: var(--yellow); color: #1a1000; border-style: solid; border-color: var(--yellow); }

        .dash-card-body h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.6rem; }
        .dash-card-body p { font-size: 0.85rem; color: var(--text-dim); line-height: 1.6; }

        footer { 
            background: rgba(0,0,0,0.3); border-top: 1px solid var(--glass-border); padding: 1.5rem 3rem;
            display: flex; align-items: center; justify-content: space-between; margin-top: auto;
        }
        .footer-brand { font-weight: 700; font-size: 1.1rem; }
        .footer-copy { font-size: 0.75rem; color: var(--text-dim); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width: 1100px) { .dash-grid { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 768px) { 
            .dash-grid { grid-template-columns: 1fr; } 
            .page { padding: 6rem 1.5rem 2rem; }
            .welcome-banner { padding: 2rem; flex-direction: column; text-align: center; }
        }
    `;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{CSS}</style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            <div className="bg-layer"></div>

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

            <nav id="nav" className={scrolled ? 'scrolled' : ''}>
                <a href="/admin/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ color: 'var(--yellow)', fontSize: '1.2rem' }}></i> Ekart
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        <a href="/admin/home" className="nav-link active"><i className="fas fa-home"></i> Dashboard</a>
                        <a href="/approve-products" className="nav-link"><i className="fas fa-list-check"></i> Approvals</a>
                        <a href="/admin/reviews" className="nav-link"><i className="fas fa-star"></i> Reviews</a>
                        <a href="/admin/refunds" className="nav-link"><i className="fas fa-rotate-left"></i> Refunds</a>
                        <a href="/admin/accounts" className="nav-link"><i className="fas fa-users-gear"></i> Users</a>
                        <a href="/analytics" className="nav-link"><i className="fas fa-chart-line"></i> Analytics</a>
                        <a href="/admin/delivery" className="nav-link"><i className="fas fa-truck-fast"></i> Delivery</a>
                        <a href="/admin/warehouses" className="nav-link"><i className="fas fa-warehouse"></i> Warehouses</a>
                        <a href="/admin/policies" className="nav-link"><i className="fas fa-book-open"></i> Policies</a>
                    </div>
                    <span className="nav-badge"><i className="fas fa-shield-halved"></i> Admin</span>
                    <div className="india-flag-badge">
                        <img src="https://flagcdn.com/w20/in.png" alt="India" style={{ width: '18px', borderRadius: '2px' }} />
                        <span>India</span>
                    </div>
                    <a href="/admin/logout" className="btn-logout"><i className="fas fa-right-from-bracket"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="welcome-banner">
                    <div className="welcome-text">
                        <h1>Admin <span>Dashboard</span> 🛡️</h1>
                        <p>Manage products, review approvals, and oversee platform users — all in one place.</p>
                    </div>
                    <div className="welcome-icon">
                        <i className="fas fa-gear"></i>
                    </div>
                </div>

                <div className="dash-grid">
                    <a href="/approve-products" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-list-check"></i></div>
                        <div className="dash-card-body">
                            <h3>Approve Products</h3>
                            <p>Review and approve pending vendor product listings before they go live.</p>
                        </div>
                    </a>

                    <a href="/admin/accounts" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-users-gear"></i></div>
                        <div className="dash-card-body">
                            <h3>User Oversight</h3>
                            <p>Manage user accounts, view profiles, and control access permissions.</p>
                        </div>
                    </a>

                    {session.admin != null && (
                        <a href="/admin/policies" className="dash-card">
                            <div className="dash-card-icon"><i className="fas fa-book-open"></i></div>
                            <div className="dash-card-body">
                                <h3>Policies & SOPs</h3>
                                <p>Manage, edit, and publish platform policies and SOP documentation.</p>
                            </div>
                        </a>
                    )}

                    <a href="/admin/refunds" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-rotate-left"></i></div>
                        <div className="dash-card-body">
                            <h3>Refund Management</h3>
                            <p>Review, approve, or reject customer refund requests.</p>
                        </div>
                    </a>

                    <a href="/admin/content" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-image"></i></div>
                        <div className="dash-card-body">
                            <h3>Content Management</h3>
                            <p>Manage promotional banners for the home page carousel.</p>
                        </div>
                    </a>

                    <a href="/security-settings" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-shield-halved"></i></div>
                        <div className="dash-card-body">
                            <h3>Security Settings</h3>
                            <p>Configure authentication, roles, and access permissions.</p>
                        </div>
                    </a>

                    <a href="/analytics" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-chart-line"></i></div>
                        <div className="dash-card-body">
                            <h3>Analytics & Reports</h3>
                            <p>View platform analytics, sales metrics, and generate reports.</p>
                        </div>
                    </a>

                    <a href="/admin/reviews" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-star"></i></div>
                        <div className="dash-card-body">
                            <h3>Review Management</h3>
                            <p>Monitor, filter, and moderate all customer reviews across the platform.</p>
                        </div>
                    </a>

                    <a href="/admin/coupons" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-tag"></i></div>
                        <div className="dash-card-body">
                            <h3>Coupon Management</h3>
                            <p>Create, manage and track promo codes and discount coupons.</p>
                        </div>
                    </a>

                    <a href="/admin/delivery" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-truck-fast"></i></div>
                        <div className="dash-card-body">
                            <h3>Delivery Management</h3>
                            <p>Approve delivery partners, assign orders, and manage the pipeline.</p>
                        </div>
                    </a>

                    <a href="/admin/warehouses" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-warehouse"></i></div>
                        <div className="dash-card-body">
                            <h3>Warehouse Management</h3>
                            <p>Add and manage warehouses and their served pin codes.</p>
                        </div>
                    </a>
                </div>
            </main>

            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}