import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * StockAlerts Component
 * * @param {Object} props
 * @param {Array} props.alerts - List of stock alert objects [{id, productId, productName, currentStock, threshold, acknowledged, createdAt}]
 * @param {Object} props.session - Session notification object {success: string, failure: string}
 */
export default function StockAlerts({
    alerts = [],
    session = { success: null, failure: null }
}) {
    // --- STATE ---
    const [isScrolled, setIsScrolled] = useState(false);
    const [notifications, setNotifications] = useState({ 
        success: session.success, 
        failure: session.failure 
    });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        const timer = setTimeout(() => {
            setNotifications({ success: null, failure: null });
        }, 2500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timer);
        };
    }, [session]);

    // --- CSS ---
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

        /* Background */
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

        /* Nav */
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

        /* Alerts */
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
        .alert-success { border-color: rgba(245,168,0,0.45); color: var(--yellow); }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* Page */
        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 2rem;
        }

        /* Page header */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; width: 100%; max-width: 860px;
            animation: fadeUp 0.5s ease both;
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
        .badge-new {
            display: inline-flex; align-items: center;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.35);
            color: var(--yellow);
            font-size: 0.68rem; font-weight: 700;
            letter-spacing: 0.1em; text-transform: uppercase;
            padding: 3px 10px; border-radius: 100px;
            margin-left: 0.6rem; vertical-align: middle;
        }

        /* Content wrapper */
        .content-wrap {
            width: 100%; max-width: 860px;
            display: flex; flex-direction: column; gap: 1.25rem;
            animation: fadeUp 0.5s ease 0.05s both;
        }

        /* Section label */
        .section-label {
            display: flex; align-items: center; gap: 0.6rem;
            font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.12em;
            color: var(--yellow); margin-bottom: 0.25rem;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

        /* Alert card */
        .alert-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-left: 3px solid var(--yellow);
            border-radius: 16px;
            padding: 1.75rem 2rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .alert-card:hover {
            transform: translateX(4px);
            box-shadow: 0 16px 48px rgba(0,0,0,0.35);
        }
        .alert-card.acknowledged {
            border-left-color: rgba(255,255,255,0.2);
            opacity: 0.6;
        }

        .card-top {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 1rem; margin-bottom: 1rem;
        }
        .card-top-left { display: flex; flex-direction: column; gap: 0.3rem; }
        .card-product-name {
            font-size: 1rem; font-weight: 700; color: var(--text-white);
            display: flex; align-items: center; gap: 0.5rem;
        }
        .card-message {
            font-size: 0.78rem; color: var(--text-dim); line-height: 1.5;
        }
        .card-time {
            font-size: 0.72rem; color: var(--text-dim);
            display: flex; align-items: center; gap: 0.35rem;
            white-space: nowrap; flex-shrink: 0;
        }

        /* Detail grid */
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 1rem;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 1rem 1.25rem;
            margin-bottom: 1.25rem;
        }
        .detail-item { display: flex; flex-direction: column; gap: 0.2rem; }
        .detail-label {
            font-size: 0.65rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.1em;
            color: var(--text-dim);
        }
        .detail-value {
            font-size: 0.9rem; font-weight: 700; color: var(--text-white);
        }
        .detail-value.highlight {
            color: var(--yellow);
        }

        /* Card actions */
        .card-actions {
            display: flex; align-items: center; justify-content: space-between;
            gap: 1rem; flex-wrap: wrap;
        }
        .btn-action {
            display: inline-flex; align-items: center; gap: 0.4rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.78rem; font-weight: 600;
            letter-spacing: 0.05em; text-transform: uppercase;
            padding: 0.55rem 1.2rem; border-radius: 8px;
            text-decoration: none; border: none; cursor: pointer;
            transition: all 0.2s;
        }
        .btn-action-primary {
            background: var(--yellow); color: #1a1000;
            box-shadow: 0 4px 16px rgba(245,168,0,0.2);
        }
        .btn-action-primary:hover {
            background: var(--yellow-d); transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(245,168,0,0.35);
        }
        .btn-action-ghost {
            background: rgba(255,255,255,0.07);
            border: 1px solid var(--glass-border);
            color: var(--text-light);
        }
        .btn-action-ghost:hover {
            background: rgba(255,255,255,0.12); color: white;
        }
        .acknowledged-label {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.78rem; font-weight: 600;
            color: rgba(255,255,255,0.4);
        }

        /* No alerts */
        .no-alerts {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 4rem 2.5rem;
            text-align: center;
            width: 100%; max-width: 860px;
            animation: fadeUp 0.5s ease 0.05s both;
        }
        .no-alerts .no-icon { font-size: 3.5rem; margin-bottom: 1rem; display: block; }
        .no-alerts h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; }
        .no-alerts p { font-size: 0.82rem; color: var(--text-dim); margin-bottom: 1.5rem; }

        /* Back link */
        .back-link {
            display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
            color: var(--text-dim); text-decoration: none;
            font-size: 0.78rem; transition: color 0.2s;
            margin-top: 0.5rem;
        }
        .back-link:hover { color: var(--text-white); }

        /* Footer */
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

        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media (max-width: 700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .alert-card { padding: 1.25rem; }
            .card-top { flex-direction: column; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }`;

    return (
        <div className="stock-alerts-container">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {notifications.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{notifications.success}</span>
                    </div>
                )}
                {notifications.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{notifications.failure}</span>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav className={isScrolled ? 'scrolled' : ''} id="nav">
                <Link to="/vendor" className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ek<span>art</span>
                </Link>
                <div className="nav-links">
                    <Link to="/vendor" className="nav-link"><i className="fas fa-home"></i> Home</Link>
                    <Link to="/vendor/products" className="nav-link"><i className="fas fa-box"></i> Products</Link>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <h1>Inventory <span>Alerts</span> 🚨</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                        The following products have reached or fallen below your set stock threshold.
                    </p>
                </div>

                {(!alerts || alerts.length === 0) ? (
                    <div className="no-alerts">
                        <span className="no-icon">✅</span>
                        <h3>All Clear — No Stock Alerts</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            All your products have sufficient stock levels. Keep up the great work!
                        </p>
                        <Link to="/vendor/products" className="btn-action btn-primary">
                            <i className="fas fa-box"></i> View Products
                        </Link>
                        <Link to="/vendor" className="back-link">
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="alerts-grid">
                        {alerts.map((alert) => (
                            <div key={alert.id} className={`alert-card ${alert.acknowledged ? 'acknowledged' : ''}`}>
                                <div className="alert-info">
                                    <div className="alert-icon">
                                        <i className={alert.acknowledged ? "fas fa-check" : "fas fa-exclamation-triangle"}></i>
                                    </div>
                                    <div>
                                        <div className="product-name">{alert.productName}</div>
                                        <div className="product-meta">ID: #{alert.productId} • Alerted on {alert.createdAt ? alert.createdAt.substring(0, 10) : 'Recent'}</div>
                                        <div className="stock-indicator">
                                            <span className="stock-pill">Current: {alert.currentStock}</span>
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Threshold: {alert.threshold}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="alert-actions">
                                    {!alert.acknowledged ? (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <a href={`/manage-products?edit=${alert.productId}`} className="btn-action btn-primary">
                                                <i className="fas fa-plus"></i> Restock
                                            </a>
                                            <form action={`/vendor/alerts/acknowledge/${alert.id}`} method="post">
                                                <button type="submit" className="btn-action btn-ghost">
                                                    Acknowledge
                                                </button>
                                            </form>
                                        </div>
                                    ) : (
                                        <span className="acknowledged-label">
                                            <i className="fas fa-check-double"></i> Acknowledged
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <Link to="/vendor" className="back-link">
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </Link>
                    </div>
                )}
            </main>

            <footer>
                <div className="footer-brand">Ek<span>art</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}