import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * StockAlertEmail Component
 * * @param {Object} props
 * @param {string} props.vendorName - The name of the vendor receiving the alert.
 * @param {string} props.productName - The name of the product low on stock.
 * @param {string|number} props.productId - Unique identifier for the product.
 * @param {number} props.currentStock - The current number of units remaining.
 * @param {number} props.threshold - The stock level that triggered this alert.
 */
export default function StockAlertEmail({
    vendorName = "Vendor",
    productName = "Product Name",
    productId = "000",
    currentStock = 0,
    threshold = 10
}) {
    const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card:   rgba(255, 255, 255, 0.13);
            --glass-nav:    rgba(0, 0, 0, 0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
            --green:        #22c55e;
            --blue:         #3b82f6;
            --purple:       #8b5cf6;
            --pink:         #ec4899;
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
            background: linear-gradient(180deg, rgba(5,8,20,0.85) 0%, rgba(8,12,28,0.82) 40%, rgba(5,8,20,0.90) 100%);
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
            background: rgba(59,130,246,0.15);
            border: 2px solid rgba(59,130,246,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; flex-shrink: 0;
            color: var(--blue);
        }

        /* ── HERO METRIC ── */
        .hero-metric {
            background: linear-gradient(135deg, rgba(245,168,0,0.15) 0%, rgba(245,168,0,0.05) 100%);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(245,168,0,0.3);
            border-radius: 24px;
            padding: 2.5rem 3rem;
            text-align: center;
            animation: fadeUp 0.5s ease both;
            animation-delay: 0.1s;
        }
        .hero-metric-label {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 0.5rem;
        }
        .hero-metric-value {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            color: var(--yellow);
            line-height: 1.1;
        }
        .hero-metric-value sup {
            font-size: 0.4em;
            font-weight: 700;
            vertical-align: super;
        }
        .hero-metric-sub {
            font-size: 0.85rem;
            color: var(--text-light);
            margin-top: 0.75rem;
        }

        /* ── STATS GRID ── */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.25rem;
        }
        .stat-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
            animation: fadeUp 0.5s ease both;
        }
        .stat-card:nth-child(1) { animation-delay: 0.15s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.25s; }

        .stat-icon {
            width: 48px; height: 48px;
            margin: 0 auto 1rem;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }
        .stat-icon.green { background: rgba(34,197,94,0.15); color: var(--green); }
        .stat-icon.blue { background: rgba(59,130,246,0.15); color: var(--blue); }
        .stat-icon.purple { background: rgba(139,92,246,0.15); color: var(--purple); }

        .stat-value {
            font-size: 1.75rem;
            font-weight: 800;
            color: white;
            margin-bottom: 0.25rem;
        }
        .stat-label {
            font-size: 0.8rem;
            color: var(--text-dim);
        }

        /* ── CHARTS GRID ── */
        .charts-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1.5rem;
        }
        @media(max-width: 900px) {
            .charts-grid { grid-template-columns: 1fr; }
        }

        .chart-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 1.75rem;
            animation: fadeUp 0.5s ease both;
            animation-delay: 0.3s;
        }
        .chart-card h3 {
            font-size: 1rem;
            font-weight: 700;
            color: white;
            margin-bottom: 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .chart-card h3 i { color: var(--yellow); }

        .chart-container {
            position: relative;
            height: 300px;
        }
        .chart-container.pie {
            height: 280px;
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
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
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

        /* ── RESPONSIVE ── */
        @media(max-width: 900px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .hero-metric { padding: 2rem 1.5rem; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }`;

    return (
        <div className="stock-alert-body">
            <style>{CSS}</style>
            <div className="email-wrapper">
                <div className="alert-card">
                    {/* Header */}
                    <div className="card-header">
                        <div className="icon-box">📦</div>
                        <h1 className="header-title">Low Stock Alert</h1>
                        <p className="header-sub">Inventory Notification</p>
                    </div>

                    {/* Body */}
                    <div className="card-body">
                        <p className="greeting">Hi <strong>{vendorName}</strong>,</p>
                        <p className="main-message">
                            One of your products on <strong>Ekart</strong> has reached its minimum stock threshold. 
                            Please restock soon to avoid service interruptions.
                        </p>

                        <div className="product-info">
                            <div className="product-row">
                                <span className="row-label"><span className="dot"></span>Product Name</span>
                                <span className="row-value">{productName}</span>
                            </div>
                            <div className="product-row">
                                <span className="row-label"><span className="dot"></span>Product ID</span>
                                <span className="row-value">#{productId}</span>
                            </div>
                            <div className="product-row">
                                <span className="row-label"><span className="dot"></span>Current Stock</span>
                                <span className="row-value value-danger">{currentStock} units</span>
                            </div>
                            <div className="product-row">
                                <span className="row-label"><span className="dot"></span>Alert Threshold</span>
                                <span className="row-value value-warn">{threshold} units</span>
                            </div>
                        </div>

                        <div className="cta-wrap">
                            <Link to="/vendor/products" className="btn-cta">
                                🛒 &nbsp;Manage Products
                            </Link>
                        </div>

                        <p className="note">
                            Log in to your Ekart vendor dashboard to update stock levels.<br />
                            This is an automated notification — please do not reply to this email.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="card-footer">
                        <div className="footer-brand">E<span>kart</span></div>
                        <div className="footer-copy">
                            © 2026 Ekart. All rights reserved.<br />
                            Automated inventory notification system.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}