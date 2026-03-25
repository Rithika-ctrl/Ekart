import React, { useState, useEffect } from 'react';

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
            --danger:       #ff5f52;
            --success:      #4ade80;
        }

        .stock-alerts-container {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            position: relative;
        }

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: ''; position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
        }
        .bg-layer::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.85) 0%, rgba(8,12,28,0.80) 40%, rgba(5,8,20,0.90) 100%);
        }

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px); border-bottom: 1px solid var(--glass-border);
            transition: all 0.3s;
        }
        nav.scrolled { background: rgba(0, 0, 0, 0.45); }

        .nav-brand { font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-brand span { color: var(--yellow); }

        .nav-link {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            transition: all 0.2s;
        }
        .nav-link:hover { color: var(--yellow); background: rgba(245,168,0,0.08); }

        /* ── ALERTS ── */
        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert { padding: 0.875rem 1.25rem; background: rgba(10,12,30,0.88); backdrop-filter: blur(16px); border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.625rem; font-size: 0.825rem; min-width: 260px; animation: slideIn 0.3s ease both; }
        .alert-success { border-color: var(--success); color: var(--success); }
        .alert-danger { border-color: var(--danger); color: var(--danger); }

        /* ── PAGE ── */
        .page { flex: 1; padding: 7rem 3rem 3rem; max-width: 1000px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.5rem; }
        .page-header { background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem 2.5rem; margin-bottom: 1rem; }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; }
        .page-header h1 span { color: var(--yellow); }

        /* ── ALERT LIST ── */
        .alerts-grid { display: flex; flex-direction: column; gap: 1rem; }
        .alert-card {
            background: var(--glass-card); backdrop-filter: blur(18px); border: 1px solid var(--glass-border);
            border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; justify-content: space-between;
            transition: transform 0.2s;
        }
        .alert-card:hover { transform: translateX(8px); border-color: var(--yellow); }
        .alert-card.acknowledged { opacity: 0.6; grayscale: 0.5; }
        
        .alert-info { display: flex; align-items: center; gap: 1.25rem; }
        .alert-icon { width: 50px; height: 50px; background: rgba(255,95,82,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: var(--danger); }
        .alert-card.acknowledged .alert-icon { background: rgba(74,222,128,0.1); color: var(--success); }

        .product-name { font-size: 1rem; font-weight: 700; color: white; margin-bottom: 0.25rem; }
        .product-meta { font-size: 0.75rem; color: var(--text-dim); }
        .stock-indicator { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; }
        .stock-pill { background: rgba(255,95,82,0.15); color: var(--danger); border: 1px solid rgba(255,95,82,0.3); padding: 0.2rem 0.6rem; border-radius: 50px; font-size: 0.7rem; font-weight: 700; }
        
        .btn-action { padding: 0.6rem 1.25rem; border-radius: 10px; font-size: 0.8rem; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; border: none; transition: all 0.2s; }
        .btn-primary { background: var(--yellow); color: #1a1000; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(245,168,0,0.3); }
        .btn-ghost { background: transparent; border: 1px solid var(--glass-border); color: var(--text-light); }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); color: white; }

        .acknowledged-label { font-size: 0.75rem; color: var(--success); font-weight: 700; display: flex; align-items: center; gap: 0.4rem; }
        .back-link { margin-top: 2rem; color: var(--text-dim); text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center; transition: color 0.2s; }
        .back-link:hover { color: var(--yellow); }

        /* ── EMPTY STATE ── */
        .no-alerts { text-align: center; padding: 5rem 2rem; background: var(--glass-card); border-radius: 20px; border: 1px solid var(--glass-border); }
        .no-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
        
        footer { background: rgba(0,0,0,0.5); backdrop-filter: blur(16px); border-top: 1px solid var(--glass-border); padding: 1.5rem 3rem; display: flex; align-items: center; justify-content: space-between; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width: 768px) {
            nav { padding: 1rem 1.5rem; }
            .page { padding: 6rem 1.25rem 2rem; }
            .alert-card { flex-direction: column; align-items: flex-start; gap: 1.25rem; }
            .btn-action { width: 100%; justify-content: center; }
        }
    `;

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
                <a href="/vendor/home" className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ek<span>art</span>
                </a>
                <div className="nav-links">
                    <a href="/vendor/home" className="nav-link"><i className="fas fa-home"></i> Home</a>
                    <a href="/manage-products" className="nav-link"><i className="fas fa-box"></i> Products</a>
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
                        <a href="/manage-products" className="btn-action btn-primary">
                            <i className="fas fa-box"></i> View Products
                        </a>
                        <a href="/vendor/home" className="back-link">
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </a>
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
                        <a href="/vendor/home" className="back-link">
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </a>
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