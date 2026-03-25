import React, { useState, useEffect } from 'react';

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
        }

        .track-order-container {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            position: relative;
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

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav);
            backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border);
            transition: all 0.3s;
        }
        nav.scrolled { background: rgba(0, 0, 0, 0.45); }

        .nav-brand {
            font-size: 1.6rem; font-weight: 700;
            color: var(--text-white); text-decoration: none;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .page-header {
            display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
        }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; }
        .page-header h1 span { color: var(--yellow); }

        /* ── TRACKING CARD ── */
        .tracking-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.5rem;
        }

        /* ── TIMELINE ── */
        .timeline { position: relative; padding-left: 2.5rem; }
        .timeline::before {
            content: ''; position: absolute; left: 0.45rem; top: 0; bottom: 0;
            width: 2px; background: rgba(255,255,255,0.1);
        }

        .timeline-item { position: relative; margin-bottom: 2rem; }
        .timeline-item:last-child { margin-bottom: 0; }
        
        .timeline-dot {
            position: absolute; left: -2.5rem; top: 0.25rem;
            width: 1rem; height: 1rem; border-radius: 50%;
            background: #333; border: 3px solid rgba(255,255,255,0.1);
            z-index: 1;
        }
        .timeline-item.active .timeline-dot {
            background: var(--yellow);
            box-shadow: 0 0 15px var(--yellow);
            border-color: rgba(245,168,0,0.3);
        }

        .timeline-content { padding-top: 0; }
        .status-title { font-weight: 700; font-size: 1.1rem; color: white; margin-bottom: 0.25rem; }
        .timeline-item.active .status-title { color: var(--yellow); }
        .status-desc { font-size: 0.85rem; color: var(--text-dim); line-height: 1.5; }
        .status-time { font-size: 0.75rem; color: var(--text-dim); margin-top: 0.5rem; font-style: italic; }

        /* ── INFO BOXES ── */
        .location-badge {
            display: inline-flex; align-items: center; gap: 0.6rem;
            background: rgba(245,168,0,0.1); border: 1px solid rgba(245,168,0,0.25);
            padding: 0.75rem 1.25rem; border-radius: 12px; margin-top: 1rem;
            font-size: 0.85rem; color: var(--text-light);
        }
        .location-badge i { color: var(--yellow); }

        .delivery-info {
            display: flex; align-items: center; gap: 1rem;
            padding: 1.25rem 1.5rem; border-radius: 15px; margin-top: 1rem;
            font-size: 0.9rem;
        }
        .delivery-info.delivered { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); color: #4ade80; }
        .delivery-info.pending { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); color: #60a5fa; }

        .btn-ghost {
            display: inline-flex; align-items: center; gap: 0.5rem;
            color: var(--text-dim); text-decoration: none; font-size: 0.85rem;
            margin-top: 1rem; transition: color 0.2s;
        }
        .btn-ghost:hover { color: white; }

        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.5rem 3rem; display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; }

        @media(max-width: 768px) {
            nav { padding: 1rem 1.5rem; }
            .page { padding: 6rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; gap: 1rem; }
        }
    `;

    return (
        <div className="track-order-container">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <div className="bg-layer"></div>

            {/* NAV */}
            <nav className={isScrolled ? 'scrolled' : ''} id="nav">
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ek<span>art</span>
                </a>
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

                <a href="/customer/order-history" className="btn-ghost">
                    <i className="fas fa-arrow-left"></i> Back to Order History
                </a>
            </main>

            <footer>
                <div className="footer-brand">Ek<span>art</span></div>
                <div className="footer-copy">&copy; 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}