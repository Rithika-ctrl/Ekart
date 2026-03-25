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
        .stock-alert-body {
            font-family: 'Poppins', Arial, sans-serif;
            background-color: #090c1e;
            margin: 0;
            padding: 48px 16px;
            color: #ffffff;
        }

        .email-wrapper {
            max-width: 520px;
            margin: 0 auto;
        }

        .alert-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4);
        }

        .card-header {
            background: linear-gradient(135deg, rgba(245, 168, 0, 0.12) 0%, transparent 100%);
            padding: 40px 40px 32px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .icon-box {
            width: 64px;
            height: 64px;
            background: rgba(245, 168, 0, 0.15);
            border: 1.5px solid rgba(245, 168, 0, 0.3);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 24px;
        }

        .header-title {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 8px;
            color: #ffffff;
        }

        .header-sub {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.45);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 600;
        }

        .card-body {
            padding: 40px;
        }

        .greeting {
            font-size: 15px;
            color: rgba(255, 255, 255, 0.85);
            margin-bottom: 12px;
        }

        .main-message {
            font-size: 14px;
            line-height: 1.7;
            color: rgba(255, 255, 255, 0.55);
            margin-bottom: 32px;
        }

        .product-info {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
        }

        .product-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .product-row:last-child {
            border-bottom: none;
        }

        .row-label {
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .dot {
            width: 5px;
            height: 5px;
            background: #f5a800;
            border-radius: 50%;
        }

        .row-value {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
        }

        .value-danger {
            color: #ff5f52;
        }

        .value-warn {
            color: #f5a800;
        }

        .cta-wrap {
            text-align: center;
            margin-bottom: 32px;
        }

        .btn-cta {
            display: inline-block;
            background: #f5a800;
            color: #1a1000;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 800;
            text-decoration: none;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            box-shadow: 0 8px 24px rgba(245, 168, 0, 0.25);
        }

        .note {
            font-size: 12px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.3);
            text-align: center;
        }

        .card-footer {
            background: rgba(0, 0, 0, 0.2);
            padding: 24px 40px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .footer-brand {
            font-size: 16px;
            font-weight: 800;
            color: rgba(255, 255, 255, 0.4);
            margin-bottom: 6px;
        }

        .footer-brand span {
            color: #f5a800;
        }

        .footer-copy {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.2);
            letter-spacing: 0.02em;
        }
    `;

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
                            <a href="/manage-products" className="btn-cta">
                                🛒 &nbsp;Manage Products
                            </a>
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