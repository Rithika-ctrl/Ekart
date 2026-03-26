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
            --yellow: #f5a800;
            --yellow-d: #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --glass-nav: rgba(0, 0, 0, 0.25);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
            --green: #22c55e;
            --red: #ef4444;
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
            background: linear-gradient(180deg, rgba(5,8,20,0.85) 0%, rgba(8,12,28,0.80) 40%, rgba(5,8,20,0.90) 100%);
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

        .nav-right { display: flex; align-items: center; gap: 1rem; }
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
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); border-color: rgba(245,168,0,0.4); }

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
        .alert-danger { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        /* ── PAGE HEADER ── */
        .page-header {
            display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
        }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; }
        .page-header h1 span { color: var(--yellow); }
        .page-header p { font-size: 0.9rem; color: var(--text-dim); margin-top: 0.3rem; }
        .page-header-icon { font-size: 2.5rem; }

        /* ── STATS ROW ── */
        .stats-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
            max-width: 500px;
        }
        .stat-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
        }
        .stat-card-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--yellow);
        }
        .stat-card-label {
            font-size: 0.8rem;
            color: var(--text-dim);
            margin-top: 0.3rem;
        }

        /* ── TABS ── */
        .tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .tab-btn {
            padding: 0.6rem 1.2rem;
            border-radius: 8px;
            border: 1px solid var(--glass-border);
            background: var(--glass-card);
            color: var(--text-light);
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .tab-btn:hover { border-color: rgba(245,168,0,0.4); color: var(--yellow); }
        .tab-btn.active {
            background: rgba(245,168,0,0.15);
            border-color: rgba(245,168,0,0.5);
            color: var(--yellow);
        }
        .tab-btn .badge {
            background: var(--yellow);
            color: #1a1000;
            font-size: 0.68rem;
            font-weight: 700;
            padding: 0.15rem 0.5rem;
            border-radius: 50px;
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* ── REFUND TABLE ── */
        .refund-table-container {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            overflow: hidden;
        }
        .refund-table {
            width: 100%;
            border-collapse: collapse;
        }
        .refund-table th, .refund-table td {
            padding: 1rem 1.25rem;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .refund-table th {
            background: rgba(0,0,0,0.2);
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-dim);
        }
        .refund-table td {
            font-size: 0.875rem;
            color: var(--text-light);
        }
        .refund-table tr:last-child td { border-bottom: none; }
        .refund-table tr:hover td { background: rgba(255,255,255,0.03); }

        .order-id { color: var(--yellow); font-weight: 600; }
        .amount { font-weight: 600; color: #22c55e; }
        .reason-text { 
            max-width: 200px; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap;
            font-size: 0.8rem;
            color: var(--text-dim);
        }

        .status-badge {
            display: inline-flex;
            padding: 0.25rem 0.6rem;
            border-radius: 50px;
            font-size: 0.72rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-pending { background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid rgba(251,191,36,0.4); }
        .status-approved { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.4); }
        .status-rejected { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); }

        .action-btns { display: flex; gap: 0.5rem; }
        .btn-approve, .btn-reject {
            padding: 0.45rem 0.9rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
        }
        .btn-approve {
            background: rgba(34,197,94,0.2);
            color: #22c55e;
            border: 1px solid rgba(34,197,94,0.4);
        }
        .btn-approve:hover { background: rgba(34,197,94,0.35); }
        .btn-reject {
            background: rgba(239,68,68,0.2);
            color: #ef4444;
            border: 1px solid rgba(239,68,68,0.4);
        }
        .btn-reject:hover { background: rgba(239,68,68,0.35); }
        .btn-approve:disabled, .btn-reject:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-evidence {
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 600;
            border: 1px solid rgba(245,168,0,0.35);
            background: rgba(245,168,0,0.08);
            color: var(--yellow);
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            white-space: nowrap;
        }
        .btn-evidence:hover { background: rgba(245,168,0,0.18); border-color: rgba(245,168,0,0.6); }

        /* Evidence Modal */
        .evidence-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; min-height: 60px; }
        .evidence-thumb {
            width: 90px; height: 90px; border-radius: 8px; object-fit: cover;
            border: 1px solid var(--glass-border); cursor: pointer;
            transition: transform 0.15s, border-color 0.15s;
        }
        .evidence-thumb:hover { transform: scale(1.05); border-color: var(--yellow); }
        .evidence-none { color: var(--text-dim); font-size: 0.82rem; padding: 1rem 0; }
        .evidence-loading { color: var(--text-dim); font-size: 0.82rem; display:flex; align-items:center; gap:0.4rem; }

        /* Lightbox */
.lightbox { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:500; align-items:center; justify-content:center; }
.lightbox.open { display:flex; }
.lightbox img { max-width:90vw; max-height:88vh; border-radius:12px; }
.lightbox-close { position:absolute; top:1.5rem; right:1.5rem; background:rgba(255,255,255,0.1); border:1px solid var(--glass-border); color:white; border-radius:50%; width:36px; height:36px; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; }

.empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-dim);
}
.empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }

        /* ── MODAL ── */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(8px);
            z-index: 300;
            display: none;
            align-items: center;
            justify-content: center;
        }
        .modal-overlay.active { display: flex; }
        .modal {
            background: rgba(15,18,40,0.95);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 2rem;
            max-width: 450px;
            width: 90%;
            animation: modalIn 0.2s ease;
        }
        @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .modal h3 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--red);
        }
        .modal p {
            font-size: 0.85rem;
            color: var(--text-dim);
            margin-bottom: 1.25rem;
        }
        .modal textarea {
            width: 100%;
            min-height: 100px;
            padding: 0.75rem;
            border-radius: 8px;
            border: 1px solid var(--glass-border);
            background: rgba(0,0,0,0.3);
            color: white;
            font-family: inherit;
            font-size: 0.85rem;
            resize: vertical;
            margin-bottom: 1rem;
        }
        .modal textarea:focus {
            outline: none;
            border-color: rgba(239,68,68,0.5);
        }
        .modal-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
        }
        .modal-btn {
            padding: 0.55rem 1.1rem;
            border-radius: 6px;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .modal-btn-cancel {
            background: transparent;
            border: 1px solid var(--glass-border);
            color: var(--text-light);
        }
        .modal-btn-cancel:hover { background: rgba(255,255,255,0.1); }
        .modal-btn-confirm {
            background: rgba(239,68,68,0.3);
            border: 1px solid rgba(239,68,68,0.5);
            color: #ef4444;
        }
        .modal-btn-confirm:hover { background: rgba(239,68,68,0.45); }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes slideIn {
            from { opacity: 0; transform: translateX(14px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @media(max-width: 1024px) {
            .nav-links { display: none; }
            .nav-divider { display: none; }
        }
        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .stats-row { grid-template-columns: 1fr; max-width: 100%; }
            .refund-table { font-size: 0.8rem; }
            .refund-table th, .refund-table td { padding: 0.75rem; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; gap: 0.5rem; }
        }`;

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
                        <Link to="/admin/policies" className="nav-link"><i className="fas fa-book-open"></i> Policies</Link>
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

                    <Link to="/admin/refunds" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-rotate-left"></i></div>
                        <div className="dash-card-body">
                            <h3>Refund Management</h3>
                            <p>Review, approve, or reject customer refund requests.</p>
                        </div>
                    </Link>

                    <Link to="/admin/content" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-image"></i></div>
                        <div className="dash-card-body">
                            <h3>Content Management</h3>
                            <p>Manage promotional banners for the home page carousel.</p>
                        </div>
                    </Link>

                    <Link to="/security-settings" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-shield-halved"></i></div>
                        <div className="dash-card-body">
                            <h3>Security Settings</h3>
                            <p>Configure authentication, roles, and access permissions.</p>
                        </div>
                    </Link>

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
                            <p>Create, manage and track promo codes and discount coupons.</p>
                        </div>
                    </Link>

                    <Link to="/admin/delivery" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-truck-fast"></i></div>
                        <div className="dash-card-body">
                            <h3>Delivery Management</h3>
                            <p>Approve delivery partners, assign orders, and manage the pipeline.</p>
                        </div>
                    </Link>

                    <Link to="/admin/warehouse" className="dash-card">
                        <div className="dash-card-icon"><i className="fas fa-warehouse"></i></div>
                        <div className="dash-card-body">
                            <h3>Warehouse Management</h3>
                            <p>Add and manage warehouses and their served pin codes.</p>
                        </div>
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