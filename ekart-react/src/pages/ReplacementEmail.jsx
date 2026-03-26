import React from 'react';

/**
 * ReplacementEmail Component
 * * @param {Object} props
 * @param {string} props.name - Customer name
 * @param {string|number} props.orderId - Unique order ID
 * @param {string|number} props.amount - Total order amount
 * @param {Array} props.items - List of ordered items [{name, quantity, price}]
 */
export default function ReplacementEmail({
    name = "Customer",
    orderId = "000",
    amount = "0.0",
    items = []
}) {
    const CSS = `
        /* Reset */
        .replacement-email-body * { margin: 0; padding: 0; box-sizing: border-box; }
        .replacement-email-body {
            font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
            background: #0f1624;
            padding: 40px 16px;
            color: #e2e8f0;
        }

        .email-wrapper {
            max-width: 580px;
            margin: 0 auto;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }

        /* ── HEADER ── */
        .email-header {
            background: linear-gradient(135deg, #1a1200 0%, #2d1f00 100%);
            border-bottom: 2px solid #f5a800;
            padding: 36px 36px 28px;
            text-align: center;
        }
        .brand-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        .brand-icon {
            width: 38px; height: 38px;
            background: #f5a800;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px;
        }
        .brand-name {
            font-size: 22px; font-weight: 800;
            color: #ffffff; letter-spacing: 0.04em;
        }
        .brand-name span { color: #f5a800; }

        .status-badge {
            display: inline-block;
            background: rgba(245,168,0,0.15);
            border: 1.5px solid rgba(245,168,0,0.4);
            color: #f5a800;
            padding: 6px 18px;
            border-radius: 50px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 14px;
        }

        .header-title {
            font-size: 26px; font-weight: 800;
            color: #ffffff; margin-bottom: 6px;
            letter-spacing: -0.02em;
        }
        .header-sub {
            font-size: 13px;
            color: rgba(255,255,255,0.55);
        }

        /* ── BODY ── */
        .email-body {
            background: #111827;
            padding: 36px;
        }

        .greeting {
            font-size: 15px;
            color: #cbd5e1;
            margin-bottom: 10px;
            line-height: 1.65;
        }
        .greeting strong { color: #f5a800; }

        .intro-text {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.75;
            margin-bottom: 24px;
        }
        .intro-text strong { color: #e2e8f0; }

        /* ── INFO BOX ── */
        .info-box {
            background: rgba(245,168,0,0.06);
            border: 1px solid rgba(245,168,0,0.25);
            border-radius: 14px;
            padding: 20px 24px;
            margin-bottom: 24px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            font-size: 13px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-weight: 500; }
        .info-value { color: #e2e8f0; font-weight: 600; text-align: right; }
        .status-pill {
            display: inline-block;
            background: rgba(245,168,0,0.15);
            color: #f5a800;
            padding: 3px 12px;
            border-radius: 50px;
            font-size: 11px;
            font-weight: 700;
            border: 1px solid rgba(245,168,0,0.3);
        }

        /* ── SECTION TITLE ── */
        .section-title {
            font-size: 13px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.1em;
            color: #f5a800;
            display: flex; align-items: center; gap: 8px;
            margin-bottom: 16px;
        }
        .section-title::after {
            content: '';
            flex: 1; height: 1px;
            background: rgba(255,255,255,0.08);
        }

        /* ── STEPS ── */
        .steps-box {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            padding: 20px 24px;
            margin-bottom: 28px;
        }
        .step {
            display: flex;
            gap: 14px;
            align-items: flex-start;
            margin-bottom: 14px;
        }
        .step:last-child { margin-bottom: 0; }
        .step-num {
            width: 26px; height: 26px;
            background: #f5a800;
            color: #1a1000;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 800;
            flex-shrink: 0; margin-top: 1px;
        }
        .step-text {
            font-size: 13px;
            color: #94a3b8;
            line-height: 1.6;
            padding-top: 3px;
        }

        /* ── ORDER TABLE ── */
        .order-table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 14px;
            overflow: hidden;
            margin-bottom: 28px;
        }
        .order-table thead tr {
            background: rgba(245,168,0,0.12);
            border-bottom: 1px solid rgba(245,168,0,0.25);
        }
        .order-table th {
            padding: 12px 16px;
            font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.1em;
            color: #f5a800; text-align: left;
        }
        .order-table td {
            padding: 12px 16px;
            font-size: 13px;
            color: #94a3b8;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            background: rgba(255,255,255,0.02);
        }
        .order-table tr:last-child td { border-bottom: none; }
        .order-table .product-name { color: #cbd5e1; font-weight: 500; }
        .order-table .price-cell { color: #f5a800; font-weight: 600; }

        .total-row td {
            background: rgba(245,168,0,0.08) !important;
            border-top: 1px solid rgba(245,168,0,0.2) !important;
            font-weight: 700 !important;
            font-size: 14px !important;
        }
        .total-row .total-label { color: #e2e8f0 !important; }
        .total-row .total-amount { color: #f5a800 !important; font-size: 16px !important; }

        /* ── SUPPORT NOTE ── */
        .support-note {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 12px;
            padding: 16px 20px;
            font-size: 13px;
            color: #64748b;
            line-height: 1.7;
            margin-bottom: 20px;
        }

        .sign-off {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.8;
        }
        .sign-off strong { color: #f5a800; }

        /* ── FOOTER ── */
        .email-footer {
            background: #0d111c;
            border-top: 1px solid rgba(255,255,255,0.06);
            padding: 20px 36px;
            text-align: center;
        }
        .footer-brand {
            font-size: 16px; font-weight: 800;
            color: #ffffff; margin-bottom: 6px;
            letter-spacing: 0.04em;
        }
        .footer-brand span { color: #f5a800; }
        .footer-copy {
            font-size: 11px;
            color: #334155;
            letter-spacing: 0.04em;
        }
    `;

    return (
        <div className="replacement-email-body">
            <style>{CSS}</style>
            <div className="email-wrapper">
                {/* HEADER */}
                <div className="email-header">
                    <div className="brand-row">
                        <div className="brand-icon">🛒</div>
                        <div className="brand-name">Ek<span>art</span></div>
                    </div>
                    <div className="status-badge">🔄 Replacement Request</div>
                    <div className="header-title">We've Got Your Request</div>
                    <div className="header-sub">Our team will review and get back to you shortly.</div>
                </div>

                {/* BODY */}
                <div className="email-body">
                    <p className="greeting">Hi <strong>{name}</strong>,</p>
                    <p className="intro-text">
                        Your replacement request has been submitted successfully. Our team will review it
                        and get back to you within <strong>24–48 hours</strong>. We apologize for any inconvenience caused.
                    </p>

                    {/* Order Info */}
                    <div className="section-title">Order Details</div>
                    <div className="info-box">
                        <div className="info-row">
                            <span className="info-label">Order ID</span>
                            <span className="info-value">#{orderId}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Order Amount</span>
                            <span className="info-value">₹{amount}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Current Status</span>
                            <span className="info-value">
                                <span className="status-pill">Replacement Under Review</span>
                            </span>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="section-title">What Happens Next?</div>
                    <div className="steps-box">
                        <div className="step">
                            <div className="step-num">1</div>
                            <div className="step-text">Our team reviews your replacement request within 24 hours.</div>
                        </div>
                        <div className="step">
                            <div className="step-num">2</div>
                            <div className="step-text">You'll receive a confirmation call or email from our support team.</div>
                        </div>
                        <div className="step">
                            <div className="step-num">3</div>
                            <div className="step-text">A pickup of the original item will be scheduled at your address.</div>
                        </div>
                        <div className="step">
                            <div className="step-num">4</div>
                            <div className="step-text">Your replacement product will be dispatched within 2–3 business days.</div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="section-title">Items in This Order</div>
                    <table className="order-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="product-name">{item.name}</td>
                                    <td>{item.quantity}</td>
                                    <td className="price-cell">₹{item.price}</td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td colSpan="2" className="total-label">Order Total</td>
                                <td className="total-amount">₹{amount}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Support Note */}
                    <div className="support-note">
                        If you have any questions or need assistance, simply reply to this email or
                        reach out to our support team. We're always happy to help.
                    </div>

                    <div className="sign-off">
                        Warm regards,<br />
                        <strong>The Ekart Team</strong>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="email-footer">
                    <div className="footer-brand">Ek<span>art</span></div>
                    <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
                </div>
            </div>
        </div>
    );
}
