import React from 'react';

/**
 * CancelEmail Component
 * * @param {Object} props
 * @param {string} props.name - The name of the customer
 * @param {string|number} props.orderId - The unique identifier for the cancelled order
 * @param {string|number} props.amount - The total amount to be refunded
 * @param {Array} props.items - List of objects representing cancelled products
 * @param {string} props.items[].name - Name of the product
 * @param {number} props.items[].quantity - Quantity of the product cancelled
 * @param {string|number} props.items[].price - Individual price of the product
 */
export default function CancelEmail({ 
    name = "Customer", 
    orderId = "000", 
    amount = "0.00", 
    items = [] 
}) {
    const CSS = `
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .email-body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #0d1020;
            padding: 32px 16px;
            color: #e2e8f0;
        }

        .wrapper {
            max-width: 600px;
            margin: auto;
            background: #13162b;
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }

        /* ── HEADER ── */
        .header {
            background: linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 100%);
            border-bottom: 1px solid rgba(255,100,80,0.25);
            padding: 36px 36px 28px;
            position: relative;
            overflow: hidden;
            text-align: left;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -40px; right: -40px;
            width: 160px; height: 160px;
            background: radial-gradient(circle, rgba(255,80,60,0.12), transparent 70%);
            border-radius: 50%;
        }

        .header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .brand {
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 0.04em;
        }
        .brand span { color: #f5a800; }

        .status-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,80,60,0.15);
            border: 1px solid rgba(255,80,60,0.35);
            color: #ff6b5b;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 50px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .status-dot {
            width: 7px; height: 7px;
            background: #ff6b5b;
            border-radius: 50%;
        }

        .header h1 {
            font-size: 26px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 6px;
            letter-spacing: -0.01em;
        }
        .header p {
            font-size: 14px;
            color: rgba(255,255,255,0.5);
        }

        /* ── BODY ── */
        .body { padding: 32px 36px; text-align: left; }

        .greeting {
            font-size: 15px;
            color: rgba(255,255,255,0.75);
            margin-bottom: 8px;
            line-height: 1.6;
        }
        .greeting strong { color: #ffffff; }

        .sub-text {
            font-size: 13.5px;
            color: rgba(255,255,255,0.45);
            margin-bottom: 28px;
            line-height: 1.65;
        }

        /* ── INFO BOX ── */
        .info-box {
            background: rgba(255,80,60,0.07);
            border: 1px solid rgba(255,80,60,0.2);
            border-radius: 14px;
            padding: 18px 22px;
            margin-bottom: 28px;
            display: flex;
            gap: 32px;
            flex-wrap: wrap;
        }
        .info-item { display: flex; flex-direction: column; gap: 4px; }
        .info-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(255,255,255,0.35);
        }
        .info-value {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
        }
        .info-value.refund { color: #ff6b5b; }

        /* ── SECTION TITLE ── */
        .section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: rgba(255,255,255,0.35);
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        /* ── TABLE ── */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 28px;
        }
        thead tr {
            background: rgba(255,255,255,0.04);
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        th {
            padding: 11px 14px;
            text-align: left;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: rgba(255,255,255,0.4);
        }
        td {
            padding: 12px 14px;
            font-size: 13.5px;
            color: rgba(255,255,255,0.7);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            text-align: left;
        }
        tr:last-child td { border-bottom: none; }

        .total-row td {
            background: rgba(255,80,60,0.08);
            color: #ff6b5b;
            font-weight: 700;
            font-size: 14px;
            border-top: 1px solid rgba(255,80,60,0.2);
        }

        /* ── NOTICE BOX ── */
        .notice-box {
            background: rgba(245,168,0,0.07);
            border: 1px solid rgba(245,168,0,0.2);
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 24px;
            font-size: 13px;
            color: rgba(255,255,255,0.5);
            line-height: 1.6;
        }
        .notice-box strong { color: #f5a800; }

        /* ── SIGN OFF ── */
        .sign-off {
            font-size: 14px;
            color: rgba(255,255,255,0.5);
            line-height: 1.7;
            margin-top: 8px;
        }
        .sign-off strong { color: #f5a800; font-size: 15px; }

        /* ── FOOTER ── */
        .footer {
            background: rgba(0,0,0,0.3);
            border-top: 1px solid rgba(255,255,255,0.07);
            padding: 18px 36px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
        }
        .footer-brand { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.4); }
        .footer-brand span { color: #f5a800; }
        .footer-copy { font-size: 11px; color: rgba(255,255,255,0.25); }
    `;

    return (
        <div className="email-body">
            <style>{CSS}</style>
            <div className="wrapper">
                {/* HEADER */}
                <div className="header">
                    <div className="header-top">
                        <div className="brand">E<span>kart</span></div>
                        <div className="status-chip">
                            <div className="status-dot"></div>
                            Cancelled
                        </div>
                    </div>
                    <h1>Order Cancelled</h1>
                    <p>Your cancellation has been processed successfully.</p>
                </div>

                {/* BODY */}
                <div className="body">
                    <p className="greeting">Hi <strong>{name}</strong>,</p>
                    <p className="sub-text">
                        Your order has been successfully cancelled as per your request.
                        Details of the cancellation and your refund are listed below.
                    </p>

                    {/* Info Box */}
                    <div className="info-box">
                        <div className="info-item">
                            <span className="info-label">Order ID</span>
                            <span className="info-value">#{orderId}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Refund Amount</span>
                            <span className="info-value refund">₹{amount}</span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="section-title">🚚 Cancelled Items</div>
                    <table>
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
                                    <td>{item.name}</td>
                                    <td>{item.quantity}</td>
                                    <td>₹{item.price}</td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td colSpan="2">Total Refund</td>
                                <td>₹{amount}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Notice */}
                    <div className="notice-box">
                        <strong>Didn't request this cancellation?</strong><br />
                        If you did not initiate this cancellation or need assistance, please contact our support team immediately so we can help resolve it.
                    </div>

                    {/* Sign off */}
                    <div className="sign-off">
                        Regards,<br />
                        <strong>The Ekart Team</strong>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="footer">
                    <div className="footer-brand">E<span>kart</span></div>
                    <div className="footer-copy">&#169; 2026 Ekart. All rights reserved.</div>
                </div>
            </div>
        </div>
    );
}