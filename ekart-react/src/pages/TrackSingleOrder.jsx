import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * TrackSingleOrder Component
 * * @param {Object} props
 * @param {Object} props.order - The order object containing tracking details.
 * @param {string} props.order.id - Unique identifier for the order.
 * @param {string} props.order.currentCity - Current location of the package.
 * @param {string} props.trackingStatus - Current status string (e.g., 'PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED').
 * @param {string} props.estimatedDelivery - Formatted string for estimated delivery time.
 * @param {Array} props.history - List of tracking events [{status, description, timestamp}].
 */
export default function TrackSingleOrder({
    order = { id: "000", currentCity: null },
    trackingStatus = "PLACED",
    estimatedDelivery = null,
    history = []
}) {
    // --- STATE ---
    const [isScrolled, setIsScrolled] = useState(false);

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
            --green:        #22c55e;
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
            filter: blur(6px);
            transform: scale(1.08);
        }
        .bg-layer::after {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

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
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); text-decoration: none; }
        .nav-link-btn.active { color: var(--yellow); border-color: rgba(245,168,0,0.4); background: rgba(245,168,0,0.08); }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); text-decoration: none; }

        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 2rem;
        }

        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; width: 100%; max-width: 800px;
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

        .track-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 100%; max-width: 800px;
            animation: fadeUp 0.5s ease 0.05s both;
        }

        .order-header {
            display: flex; justify-content: space-between;
            align-items: flex-start; flex-wrap: wrap; gap: 1rem;
            margin-bottom: 2rem; padding-bottom: 1.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .order-id {
            font-size: 1.1rem; font-weight: 700; color: var(--text-white);
            display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;
        }
        .order-id i { color: var(--yellow); }
        .order-id .id-chip {
            background: rgba(245,168,0,0.12);
            border: 1px solid rgba(245,168,0,0.28);
            color: var(--yellow);
            font-size: 0.8rem; font-weight: 700;
            padding: 3px 12px; border-radius: 50px;
        }
        .order-date { font-size: 0.78rem; color: var(--text-dim); }
        .order-right { text-align: right; }
        .order-amount { font-size: 1.1rem; font-weight: 700; color: var(--yellow); margin-bottom: 0.5rem; }
        .item-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: flex-end; }
        .item-chip {
            display: inline-block; padding: 0.25rem 0.8rem; border-radius: 100px;
            background: rgba(245,168,0,0.12); border: 1px solid rgba(245,168,0,0.25);
            color: var(--yellow); font-size: 0.72rem; font-weight: 600;
        }

        /* ── VERTICAL STEPPER ── */
        .tracking-stepper {
            display: flex;
            flex-direction: column;
            gap: 0;
            position: relative;
            padding-left: 40px;
            margin: 1.5rem 0;
        }

        .step {
            position: relative;
            padding: 0 0 2rem 1.5rem;
            display: flex;
            flex-direction: column;
        }
        .step:last-child { padding-bottom: 0; }

        .step::before {
            content: '';
            position: absolute;
            left: -30px;
            top: 0;
            width: 3px;
            height: 100%;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
        }
        .step:last-child::before { display: none; }

        .step.completed::before { background: var(--green); }
        .step.active::before { 
            background: linear-gradient(180deg, var(--green) 50%, rgba(255,255,255,0.1) 50%);
        }

        .step-icon {
            position: absolute;
            left: -40px;
            top: 0;
            width: 24px; height: 24px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.65rem;
            background: rgba(255,255,255,0.05);
            border: 2px solid rgba(255,255,255,0.15);
            color: var(--text-dim);
            z-index: 1;
        }
        .step.completed .step-icon {
            background: var(--green);
            border-color: var(--green);
            color: #000;
        }
        .step.active .step-icon {
            background: rgba(34, 197, 94, 0.15);
            border-color: var(--green);
            color: var(--green);
            box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
        }

        .step-content h4 {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-dim);
            margin-bottom: 0.25rem;
        }
        .step.completed .step-content h4,
        .step.active .step-content h4 {
            color: var(--text-white);
        }

        .step-content p {
            font-size: 0.75rem;
            color: var(--text-dim);
        }
        .step-content .step-time {
            font-size: 0.7rem;
            color: var(--yellow);
            margin-top: 0.25rem;
        }

        /* ── DELIVERY INFO ── */
        .delivery-info {
            display: flex; align-items: center; gap: 0.75rem;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.25);
            border-radius: 12px; padding: 1rem 1.25rem;
            margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-light);
        }
        .delivery-info i { color: var(--green); font-size: 1.2rem; flex-shrink: 0; }
        .delivery-info.delivered {
            background: rgba(34, 197, 94, 0.15);
            border-color: rgba(34, 197, 94, 0.35);
        }
        .delivery-info.pending {
            background: rgba(245, 168, 0, 0.08);
            border-color: rgba(245, 168, 0, 0.22);
        }
        .delivery-info.pending i { color: var(--yellow); }

        /* ── CURRENT LOCATION ── */
        .location-badge {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            border-radius: 8px; padding: 0.6rem 1rem;
            font-size: 0.78rem; color: var(--text-light);
            margin-top: 1rem;
        }
        .location-badge i { color: var(--yellow); }

        .btn-ghost {
            display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
            padding: 0.7rem 1.5rem; border-radius: 10px;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            color: var(--text-light);
            font-size: 0.85rem; font-weight: 600;
            text-decoration: none; transition: all 0.2s;
        }
        .btn-ghost:hover {
            background: rgba(255,255,255,0.11);
            border-color: rgba(255,255,255,0.35);
            color: var(--text-white); text-decoration: none;
        }

        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border); padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .track-card { padding: 1.5rem; }
            .order-header { flex-direction: column; }
            .order-right { text-align: left; }
            .item-chips { justify-content: flex-start; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }`;

    return (
        <div className="track-order-container">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <div className="bg-layer"></div>

            {/* NAV */}
            <nav className={isScrolled ? 'scrolled' : ''} id="nav">
                <Link to="/" className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ek<span>art</span>
                </Link>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div>
                        <h1>Track Order <span>#{order.id}</span> 📦</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                            Stay updated on your package journey.
                        </p>
                    </div>
                    <div style={{ background: 'rgba(245,168,0,0.1)', padding: '1rem', borderRadius: '15px', border: '1px solid rgba(245,168,0,0.2)' }}>
                        <i className="fas fa-truck-moving" style={{ fontSize: '2rem', color: 'var(--yellow)' }}></i>
                    </div>
                </div>

                <div className="tracking-card">
                    <div className="timeline">
                        {history.map((event, index) => (
                            <div key={index} className={`timeline-item ${index === 0 ? 'active' : ''}`}>
                                <div className="timeline-dot"></div>
                                <div className="timeline-content">
                                    <div className="status-title">{event.status}</div>
                                    <div className="status-desc">{event.description}</div>
                                    <div className="status-time">{event.timestamp}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current Location Badge */}
                {order.currentCity && (
                    <div className="location-badge">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>Current Location: <strong>{order.currentCity}</strong></span>
                    </div>
                )}

                {/* Delivery Status Info */}
                {trackingStatus === 'DELIVERED' ? (
                    <div className="delivery-info delivered">
                        <i className="fas fa-check-circle"></i>
                        <span><strong>Delivered!</strong> Your package has been delivered successfully.</span>
                    </div>
                ) : (
                    estimatedDelivery && (
                        <div className="delivery-info pending">
                            <i className="fas fa-clock"></i>
                            <span>
                                <strong>Estimated Delivery:</strong> {estimatedDelivery}
                            </span>
                        </div>
                    )
                )}

                <Link to="/orders" className="btn-ghost">
                    <i className="fas fa-arrow-left"></i> Back to Order History
                </Link>
            </main>

            <footer>
                <div className="footer-brand">Ek<span>art</span></div>
                <div className="footer-copy">&copy; 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}