import React, { useMemo } from 'react';

const CSS = `
        :root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --green:        #22c55e;
            --glass-border: rgba(255,255,255,0.14);
            --glass-card:   rgba(255,255,255,0.08);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.48);
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
        }

        /* ── BACKGROUND ── */
        .bg-layer {
            position: fixed; inset: 0; z-index: -1;
            overflow: hidden;
            background: #050814;
        }
        .bg-layer::before {
            content: '';
            position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(12px) brightness(0.6);
            transform: scale(1.08);
        }
        .bg-layer::after {
            content: '';
            position: absolute; inset: 0;
            background: radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.15) 0%, transparent 60%),
                        linear-gradient(180deg, rgba(5,8,20,0.85) 0%, rgba(5,8,20,0.95) 100%);
        }

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
        }
        .nav-brand {
            font-size: 1.5rem; font-weight: 700;
            color: var(--text-white); text-decoration: none;
            letter-spacing: 0.04em;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }

        .nav-back {
            display: flex; align-items: center; gap: 0.5rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.85rem; font-weight: 500;
            padding: 0.5rem 1.1rem; border-radius: 50px;
            border: 1px solid var(--glass-border);
            background: rgba(255,255,255,0.03);
            backdrop-filter: blur(10px);
            transition: all 0.2s;
        }
        .nav-back:hover {
            background: rgba(255,255,255,0.1);
            color: white; border-color: rgba(255,255,255,0.3);
        }

        /* ── PAGE WRAPPER ── */
        .page-wrapper {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6rem 1.5rem 2rem;
        }

        /* ── SUCCESS CARD ── */
        .success-card {
            background: rgba(10, 14, 30, 0.6);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 28px;
            width: 100%;
            max-width: 540px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.6), inset 0 0 40px rgba(34, 197, 94, 0.05);
            animation: popIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
            position: relative;
            overflow: hidden;
            display: flex; flex-direction: column;
        }

        @keyframes popIn {
            0% { opacity: 0; transform: scale(0.9) translateY(30px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Confetti Container */
        .confetti-wrap {
            position: absolute; inset: 0;
            pointer-events: none; z-index: 1;
            overflow: hidden;
        }
        .confetti-wrap span {
            position: absolute; top: -10px;
            display: block;
            animation: fall linear forwards;
            opacity: 0;
        }
        @keyframes fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(600px) rotate(360deg); opacity: 0; }
        }

        /* Header Area */
        .card-header-area {
            text-align: center;
            padding: 3.5rem 2.5rem 2rem;
            position: relative; z-index: 2;
        }
        .success-icon {
            width: 80px; height: 80px;
            background: rgba(34, 197, 94, 0.15);
            border: 2px solid rgba(34, 197, 94, 0.4);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2.2rem; color: var(--green);
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.3);
            animation: pulseGreen 2s infinite;
        }
        @keyframes pulseGreen {
            0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.2); }
            50%      { box-shadow: 0 0 40px rgba(34, 197, 94, 0.5); }
        }

        .card-header-area h1 {
            font-size: 2rem; font-weight: 700;
            color: white; margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
        }
        .card-header-area p {
            font-size: 0.95rem; color: var(--text-light);
            line-height: 1.5;
        }
        .card-header-area p strong { color: var(--yellow); font-weight: 600; }

        /* Order Details Box */
        .order-details-box {
            background: rgba(0,0,0,0.25);
            border-top: 1px solid rgba(255,255,255,0.06);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            padding: 1.75rem 2.5rem;
            position: relative; z-index: 2;
        }
        .detail-row {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 1rem;
        }
        .detail-row:last-child { margin-bottom: 0; }
        .detail-label {
            font-size: 0.8rem; color: var(--text-dim);
            text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;
        }
        .detail-val {
            font-size: 0.95rem; font-weight: 600; color: white;
            display: flex; align-items: center; gap: 0.4rem;
        }
        .detail-val.highlight { color: var(--yellow); font-size: 1.1rem; font-weight: 700; }
        .detail-val i { font-size: 0.85rem; color: var(--text-dim); }

        /* Next Steps */
        .next-steps {
            padding: 2rem 2.5rem;
            position: relative; z-index: 2;
        }
        .next-steps h4 {
            font-size: 0.85rem; color: var(--text-light); font-weight: 600;
            margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .step-list { list-style: none; }
        .step-list li {
            display: flex; align-items: flex-start; gap: 0.75rem;
            margin-bottom: 0.85rem; font-size: 0.85rem; color: var(--text-dim);
            line-height: 1.5;
        }
        .step-list li:last-child { margin-bottom: 0; }
        .step-list li i {
            color: var(--yellow); font-size: 0.9rem; margin-top: 3px;
        }

        /* Action Buttons */
        .action-btns {
            display: flex; gap: 0.75rem; flex-wrap: wrap;
            padding: 0 2.5rem 2.5rem;
            position: relative; z-index: 2;
        }
        .btn {
            flex: 1; min-width: 140px;
            display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
            padding: 0.85rem; border-radius: 12px;
            font-family: 'Poppins', sans-serif; font-size: 0.85rem; font-weight: 600;
            text-decoration: none; transition: all 0.25s; cursor: pointer;
            text-align: center;
        }
        .btn-track {
            background: var(--yellow); color: #1a1000; border: none;
            box-shadow: 0 6px 20px rgba(245,168,0,0.25);
        }
        .btn-track:hover {
            background: var(--yellow-d); transform: translateY(-2px);
            box-shadow: 0 10px 28px rgba(245,168,0,0.4); color: #1a1000;
        }
        .btn-orders {
            background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border);
            color: var(--text-white);
        }
        .btn-orders:hover {
            background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.3);
            color: white; transform: translateY(-2px);
        }
        .btn-home {
            flex-basis: 100%;
            background: transparent; border: none;
            color: var(--text-dim); font-size: 0.8rem;
            padding: 0.5rem; margin-top: 0.25rem;
        }
        .btn-home:hover { color: var(--yellow); text-decoration: underline; }

        /* Footer inside card */
        .card-footer {
            background: rgba(0,0,0,0.4);
            padding: 1rem 2.5rem; text-align: center;
            display: flex; justify-content: space-between; align-items: center;
            position: relative; z-index: 2;
        }
        .footer-brand { font-size: 0.9rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.7rem; color: var(--text-dim); }

        @media(max-width: 560px) {
            nav { padding: 1rem 1.5rem; }
            .page-wrapper { padding: 6rem 1rem 1.5rem; }
            .card-header-area { padding: 2.5rem 1.5rem 1.5rem; }
            .order-details-box, .next-steps, .action-btns { padding-left: 1.5rem; padding-right: 1.5rem; }
            .action-btns { flex-direction: column; }
            .card-footer { flex-direction: column; gap: 0.4rem; padding: 1rem 1.5rem; }
        }
`;

/**
 * OrderSuccess Component
 * @param {Object} props
 * @param {string|number} props.orderId - The confirmed order ID
 * @param {number|string} props.amount - Total amount paid/to be paid
 * @param {string} props.deliveryTime - Estimated delivery time
 */
export default function OrderSuccess({
    orderId = 'ORD-XXXX',
    amount = '0.00',
    deliveryTime = '2-3 Business Days'
}) {
    // Generate confetti pieces declaratively using useMemo so it only calculates once
    const confettiPieces = useMemo(() => {
        const colours = ['#f5a800','#22c55e','#ffffff','#fbbf24','#a3e635','#34d399'];
        return Array.from({ length: 55 }).map((_, i) => ({
            id: i,
            left: (Math.random() * 100) + '%',
            background: colours[Math.floor(Math.random() * colours.length)],
            width: (5 + Math.random() * 7) + 'px',
            height: (5 + Math.random() * 7) + 'px',
            animationDelay: (Math.random() * 2) + 's',
            animationDuration: (3 + Math.random() * 4) + 's'
        }));
    }, []);

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Order Placed - Ekart</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* Nav */}
            <nav>
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.2rem' }}></i>
                    Ek<span>art</span>
                </a>
                <a href="/customer/home" className="nav-back">
                    <i className="fas fa-arrow-left"></i> Continue Shopping
                </a>
            </nav>

            {/* Main Content */}
            <div className="page-wrapper">
                <div className="success-card">
                    
                    {/* Confetti Animation */}
                    <div className="confetti-wrap" id="confetti">
                        {confettiPieces.map(piece => (
                            <span 
                                key={piece.id} 
                                style={{
                                    left: piece.left,
                                    background: piece.background,
                                    width: piece.width,
                                    height: piece.height,
                                    animationDelay: piece.animationDelay,
                                    animationDuration: piece.animationDuration
                                }}
                            ></span>
                        ))}
                    </div>

                    <div className="card-header-area">
                        <div className="success-icon">
                            <i className="fas fa-check"></i>
                        </div>
                        <h1>Order Confirmed!</h1>
                        <p>Thank you for shopping with Ekart.<br />Your order <strong>#{orderId}</strong> has been placed successfully.</p>
                    </div>

                    <div className="order-details-box">
                        <div className="detail-row">
                            <span className="detail-label">Order Number</span>
                            <span className="detail-val"><i className="fas fa-hashtag"></i> {orderId}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Amount Paid</span>
                            <span className="detail-val highlight">₹{amount}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Est. Delivery</span>
                            <span className="detail-val"><i className="fas fa-truck"></i> {deliveryTime}</span>
                        </div>
                    </div>

                    <div className="next-steps">
                        <h4>What happens next?</h4>
                        <ul className="step-list">
                            <li><i className="fas fa-envelope-open-text"></i> We've sent a confirmation email with order details and your invoice.</li>
                            <li><i className="fas fa-box-open"></i> The seller is preparing your items for dispatch.</li>
                            <li><i className="fas fa-map-marked-alt"></i> You will receive shipping updates once the package is on its way.</li>
                        </ul>
                    </div>

                    <div className="action-btns">
                        <a href={`/track/${orderId}`} className="btn btn-track">
                            <i className="fas fa-location-dot"></i> Track Order
                        </a>
                        <a href="/view-orders" className="btn btn-orders">
                            <i className="fas fa-list-check"></i> My Orders
                        </a>
                        <a href="/customer/home" className="btn btn-home">
                            <i className="fas fa-home"></i> Home
                        </a>
                    </div>

                    {/* Footer inside card */}
                    <div className="card-footer">
                        <div className="footer-brand">E<span>kart</span></div>
                        <div className="footer-copy">&#169; 2026 Ekart. All rights reserved.</div>
                    </div>

                </div>
            </div>
        </>
    );
}