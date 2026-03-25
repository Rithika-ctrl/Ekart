import React from 'react';

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
    const CSS = `
        .stock-alert-container {
            font-family: 'Poppins', Arial, sans-serif;
            background-color: #090c1e;
            margin: 0;
            padding: 48px 16px;
            color: #ffffff;
            min-height: 100vh;
        }

        .email-wrapper {
            max-width: 620px;
            margin: 0 auto;
        }

        .logo-bar {
            text-align: center;
            margin-bottom: 28px;
        }

        .logo-bar .brand {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 1.55rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 0.04em;
            text-decoration: none;
        }

        .brand-accent { color: #f5a800; }

        .main-card {
            background: rgba(255, 255, 255, 0.07);
            border: 1px solid rgba(255, 255, 255, 0.13);
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 40px 100px rgba(0, 0, 0, 0.55);
        }

        .card-hero {
            background: linear-gradient(135deg, rgba(220, 38, 38, 0.22) 0%, rgba(153, 27, 27, 0.18) 100%);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px 40px 36px;
            text-align: center;
            position: relative;
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(220, 38, 38, 0.20);
            border: 1px solid rgba(239, 68, 68, 0.35);
            border-radius: 100px;
            padding: 5px 14px;
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #fca5a5;
            margin-bottom: 18px;
        }

        .hero-icon {
            font-size: 3.5rem;
            line-height: 1;
            margin-bottom: 16px;
            display: block;
        }

        .card-hero h1 {
            font-size: 1.6rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.01em;
            margin-bottom: 6px;
        }

        .hero-subtitle {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.5);
            font-weight: 400;
        }

        .card-body {
            padding: 36px 40px;
        }

        .greeting {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 6px;
        }

        .intro-text {
            font-size: 0.82rem;
            color: rgba(255, 255, 255, 0.55);
            line-height: 1.7;
            margin-bottom: 28px;
        }

        .alert-strip {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            background: rgba(220, 38, 38, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.28);
            border-left: 4px solid #ef4444;
            border-radius: 12px;
            padding: 16px 18px;
            margin-bottom: 28px;
        }

        .strip-content strong {
            display: block;
            font-size: 0.82rem;
            font-weight: 700;
            color: #fca5a5;
            letter-spacing: 0.02em;
            margin-bottom: 4px;
        }

        .strip-content p {
            font-size: 0.78rem;
            color: rgba(255, 255, 255, 0.5);
            line-height: 1.6;
            margin: 0;
        }

        .section-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: #f5a800;
            margin-bottom: 14px;
        }

        .section-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
        }

        .product-grid {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            overflow: hidden;
            margin-bottom: 28px;
        }

        .product-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 13px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .product-row:last-child { border-bottom: none; }

        .row-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.45);
            font-weight: 500;
        }

        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(245, 168, 0, 0.5);
        }

        .row-value {
            font-size: 0.82rem;
            font-weight: 600;
            color: #ffffff;
        }

        .value-danger {
            color: #fca5a5;
            background: rgba(220, 38, 38, 0.18);
            border: 1px solid rgba(239, 68, 68, 0.25);
            padding: 3px 10px;
            border-radius: 100px;
            font-size: 0.75rem;
        }

        .value-warn { color: #fde68a; }

        .cta-wrap { text-align: center; margin-bottom: 10px; }

        .btn-cta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #f5a800;
            color: #1a1000;
            text-decoration: none;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 13px 32px;
            border-radius: 10px;
            box-shadow: 0 8px 28px rgba(245, 168, 0, 0.28);
            transition: all 0.2s;
        }

        .note {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.38);
            text-align: center;
            line-height: 1.7;
            margin-top: 20px;
        }

        .card-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding: 22px 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .footer-brand {
            font-size: 1rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 0.04em;
        }

        .footer-copy {
            font-size: 0.68rem;
            color: rgba(255, 255, 255, 0.3);
            text-align: right;
            line-height: 1.6;
        }

        @media (max-width: 520px) {
            .product-row { flex-direction: column; align-items: flex-start; gap: 4px; }
            .card-footer { flex-direction: column; text-align: center; }
            .footer-copy { text-align: center; }
        }
    `;

    return (
        <div className="stock-alert-container">
            <style>{CSS}</style>
            <div className="email-wrapper">
                {/* Logo Bar */}
                <div className="logo-bar">
                    <span className="brand">
                        <svg width="20" height="20" viewBox="0 0 576 512" fill="#f5a800">
                            <path d="M528.12 301.319l47.273-208C578.806 78.301 567.391 64 551.99 64H159.208l-9.166-44.81C147.758 8.021 137.93 0 126.529 0H24C10.745 0 0 10.745 0 24v16c0 13.255 10.745 24 24 24h69.883l70.248 343.435C147.325 417.1 136 435.222 136 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-15.674-6.447-29.835-16.824-40h209.647C430.447 426.165 424 440.326 424 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-22.172-12.888-41.332-31.579-50.405l5.517-24.276c3.413-15.018-8.002-29.319-23.403-29.319H218.117l-6.545-32h293.145c11.206 0 20.92-7.754 23.403-18.681z" />
                        </svg>
                        <span>Ek<span className="brand-accent">art</span></span>
                    </span>
                </div>

                <div className="main-card">
                    {/* Hero Section */}
                    <div className="card-hero">
                        <div className="hero-badge">⚠️ Automated Alert</div>
                        <span className="hero-icon">📦</span>
                        <h1>Low <span className="brand-accent">Stock</span> Alert</h1>
                        <p className="hero-subtitle">Action required — your inventory is running low</p>
                    </div>

                    <div className="card-body">
                        <p className="greeting">Hello, <span className="brand-accent">{vendorName}</span> 👋</p>
                        <p className="intro-text">
                            One of your listed products has crossed the low-stock threshold you configured.
                            Please restock soon to keep your customers happy and avoid missed sales.
                        </p>

                        {/* Alert Strip */}
                        <div className="alert-strip">
                            <span style={{ fontSize: '1.25rem' }}>🔔</span>
                            <div className="strip-content">
                                <strong>Low Stock Alert Triggered</strong>
                                <p>Current inventory has dropped to or below your configured alert threshold. Immediate restocking is recommended.</p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="section-label">🏷️ Product Details</div>
                        <div className="product-grid">
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

                        {/* CTA */}
                        <div className="cta-wrap">
                            <a href="/manage-products" className="btn-cta">
                                🛒 Manage Products
                            </a>
                        </div>

                        <p className="note">
                            Log in to your Ekart vendor dashboard to update stock levels.<br />
                            This is an automated notification — please do not reply to this email.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="card-footer">
                        <div className="footer-brand">Ek<span className="brand-accent">art</span></div>
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