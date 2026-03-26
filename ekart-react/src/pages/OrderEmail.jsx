import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * OrderEmail Component
 * @param {Object} props
 * @param {string} props.name - Customer name
 * @param {string|number} props.orderId - Unique order ID
 * @param {string} props.date - Date of the order
 * @param {string} props.paymentMode - Mode of payment (e.g., COD, Online)
 * @param {string} props.deliveryTime - Estimated delivery window
 * @param {Array} props.items - List of ordered items [{name, quantity, price}]
 * @param {string|number} props.amount - Total order amount
 */
export default function OrderEmail({
    name = "Customer",
    orderId = "000",
    date = "Today",
    paymentMode = "Online",
    deliveryTime = "3-5 Business Days",
    items = [],
    amount = "0.00"
}) {
    const CSS = `* { margin: 0; padding: 0; box-sizing: border-box; }

        #root {
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
            background: linear-gradient(135deg, #0f1a0a 0%, #1a2e0f 100%);
            border-bottom: 1px solid rgba(245,168,0,0.2);
            padding: 36px 36px 28px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -40px; right: -40px;
            width: 160px; height: 160px;
            background: radial-gradient(circle, rgba(245,168,0,0.1), transparent 70%);
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
            background: rgba(34,197,94,0.15);
            border: 1px solid rgba(34,197,94,0.35);
            color: #4ade80;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 50px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .status-dot {
            width: 7px; height: 7px;
            background: #4ade80;
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
            color: rgba(255,255,255,0.45);
        }

        /* ── BODY ── */
        .#root { padding: 32px 36px; }

        .greeting {
            font-size: 15px;
            color: rgba(255,255,255,0.75);
            margin-bottom: 6px;
            line-height: 1.6;
        }
        .greeting strong { color: #ffffff; }

        .sub-text {
            font-size: 13.5px;
            color: rgba(255,255,255,0.4);
            margin-bottom: 28px;
            line-height: 1.65;
        }

        /* ── INFO BOX ── */
        .info-box {
            background: rgba(245,168,0,0.06);
            border: 1px solid rgba(245,168,0,0.18);
            border-radius: 14px;
            padding: 18px 22px;
            margin-bottom: 28px;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .info-item { display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
        .info-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(255,255,255,0.3);
        }
        .info-value {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
        }

        /* ── PAYMENT BADGES ── */
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 12px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: 700;
        }
        .badge-online {
            background: rgba(34,197,94,0.15);
            border: 1px solid rgba(34,197,94,0.3);
            color: #4ade80;
        }
        .badge-cod {
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.3);
            color: #f5a800;
        }

        /* ── SECTION TITLE ── */
        .section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: rgba(255,255,255,0.3);
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.07);
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
            color: rgba(255,255,255,0.35);
        }
        td {
            padding: 12px 14px;
            font-size: 13.5px;
            color: rgba(255,255,255,0.65);
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        tr:last-child td { border-bottom: none; }

        .total-row td {
            background: rgba(245,168,0,0.08);
            color: #f5a800;
            font-weight: 700;
            font-size: 14px;
            border-top: 1px solid rgba(245,168,0,0.2);
        }

        /* ── NOTICE ── */
        .notice-box {
            background: rgba(59,130,246,0.07);
            border: 1px solid rgba(59,130,246,0.2);
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 24px;
            font-size: 13px;
            color: rgba(255,255,255,0.45);
            line-height: 1.6;
        }
        .notice-box strong { color: #60a5fa; }

        /* ── SIGN OFF ── */
        .sign-off {
            font-size: 14px;
            color: rgba(255,255,255,0.45);
            line-height: 1.7;
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
        .footer-brand { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.35); }
        .footer-brand span { color: #f5a800; }
        .footer-copy { font-size: 11px; color: rgba(255,255,255,0.2); }`;

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
                            Confirmed
                        </div>
                    </div>
                    <h1>Order Received!</h1>
                    <p>Thank you for shopping with Ekart.</p>
                </div>

                {/* BODY */}
                <div className="body">
                    <p className="greeting">Hi <strong>{name}</strong>,</p>
                    <p className="sub-text">
                        Great choice! We've received your order and are currently preparing it for shipment. 
                        Below are your order details and estimated delivery timeline.
                    </p>

                    {/* Info Grid */}
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Order ID</span>
                            <span className="info-value">#{orderId}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Date</span>
                            <span className="info-value">{date}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Payment</span>
                            <span className="info-value">{paymentMode}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Est. Delivery</span>
                            <span className="info-value">{deliveryTime}</span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="section-title">🚚 Items Ordered</div>
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
                                <td colSpan="2">Total Amount</td>
                                <td>₹{amount}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Notice */}
                    <div className="notice-box">
                        <strong>What's next?</strong><br />
                        We'll notify you once your items are out for delivery. Sit back and relax! 🚗
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