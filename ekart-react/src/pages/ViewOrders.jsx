import React, { useState, useEffect, useRef } from 'react';

/**
 * Ekart - Order History Component
 * * @param {Object} props
 * @param {Array} props.orders - Array of order objects [{id, amount, orderDate, trackingStatus, deliveryTime, items: [], razorpay_payment_id}]
 * @param {Object} props.session - Session object for notifications {success: string, failure: string}
 * @param {Object} props.returnEligibleMap - Map of orderId (key) to boolean eligibility (value)
 * @param {Object} props.replacementRequestedMap - Map of orderId (key) to boolean request status (value)
 * @param {string} props.csrfToken - CSRF token value for security
 */
export default function ViewOrders({
    orders = [],
    session = { success: null, failure: null },
    returnEligibleMap = {},
    replacementRequestedMap = {},
    csrfToken = ""
}) {
    // --- State ---
    const [scrolled, setScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    const [confirmModal, setConfirmModal] = useState({ active: false, type: null, orderId: null });

    // --- Refs ---
    const navRef = useRef(null);

    // --- Effects ---
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        const alertTimeout = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        const handleEsc = (e) => {
            if (e.key === 'Escape') closeConfirm();
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('keydown', handleEsc);
            clearTimeout(alertTimeout);
        };
    }, []);

    // --- Handlers ---
    const showConfirm = (type, orderId) => {
        setConfirmModal({ active: true, type, orderId });
    };

    const closeConfirm = () => {
        setConfirmModal({ active: false, type: null, orderId: null });
    };

    const handleOverlayClick = (e) => {
        if (e.target.id === 'confirmModal') closeConfirm();
    };

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

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: '';
            position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
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
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        .alert-stack {
            position: fixed; top: 5rem; right: 1.5rem;
            z-index: 200; display: flex; flex-direction: column; gap: 0.5rem;
        }
        .alert {
            padding: 0.875rem 1.25rem;
            background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px;
            display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px;
            animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(34,197,94,0.45);  color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 2rem; min-height: 100vh;
        }
        .inner { width: 100%; max-width: 900px; display: flex; flex-direction: column; gap: 1.5rem; }

        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem;
            animation: fadeUp 0.45s ease both;
        }
        .page-header-left h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; color: white; }
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

        .order-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            overflow: hidden;
            transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
            margin-bottom: 1.5rem;
        }
        .order-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 50px rgba(0,0,0,0.35);
            border-color: rgba(245,168,0,0.28);
        }

        .order-card-header {
            padding: 1.1rem 1.75rem;
            background: rgba(255,255,255,0.06);
            border-bottom: 1px solid var(--glass-border);
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.6rem;
        }
        .order-id { font-size: 0.95rem; font-weight: 700; color: var(--text-white); }
        .order-id span { color: var(--yellow); }
        .order-date { font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.35rem; }

        .order-card-body { padding: 1.4rem 1.75rem; display: flex; flex-direction: column; gap: 0.9rem; }

        .info-row { display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.84rem; }
        .info-row .info-label {
            font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.09em; color: var(--text-dim);
            white-space: nowrap; padding-top: 0.1rem; min-width: 90px;
        }
        .info-row .info-value { color: var(--text-light); }
        .amount-value { color: var(--yellow); font-weight: 800; font-size: 1rem; }

        .status-badge {
            display: inline-flex; align-items: center; gap: 0.35rem;
            padding: 0.2rem 0.7rem; border-radius: 20px;
            font-size: 0.72rem; font-weight: 700;
        }

        .delivery-chip {
            display: inline-flex; align-items: center; gap: 0.35rem;
            background: rgba(59,130,246,0.1); color: #60a5fa;
            border: 1px solid rgba(59,130,246,0.25);
            padding: 0.2rem 0.7rem; border-radius: 20px;
            font-size: 0.72rem; font-weight: 600;
        }

        .items-wrap { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .item-chip {
            display: inline-flex; align-items: center; gap: 0.3rem;
            background: rgba(255,255,255,0.08);
            border: 1px solid var(--glass-border);
            color: var(--text-light);
            padding: 0.25rem 0.75rem; border-radius: 20px;
            font-size: 0.72rem; font-weight: 600;
        }

        .return-badge {
            display: inline-flex; align-items: center; gap: 0.35rem;
            padding: 0.25rem 0.75rem; border-radius: 20px;
            font-size: 0.72rem; font-weight: 700;
        }

        .order-card-footer {
            padding: 1rem 1.75rem;
            border-top: 1px solid var(--glass-border);
            display: flex; flex-wrap: wrap; gap: 0.6rem;
            align-items: center;
        }
        .action-btn {
            display: inline-flex; align-items: center; gap: 0.4rem;
            border-radius: 9px; padding: 0.5rem 1rem;
            font-size: 0.75rem; font-weight: 700;
            letter-spacing: 0.04em; text-transform: uppercase;
            text-decoration: none; cursor: pointer; border: 1px solid;
            transition: all 0.2s;
        }
        .btn-cancel { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.25); }
        .btn-cancel:hover { background: #ef4444; color: white; transform: translateY(-1px); }
        .btn-retry { background: rgba(245,168,0,0.12); color: var(--yellow); border-color: rgba(245,168,0,0.3); }
        .btn-retry:hover { background: var(--yellow); color: #1a1000; transform: translateY(-1px); }
        .btn-replace { background: rgba(168,85,247,0.1); color: #c084fc; border-color: rgba(168,85,247,0.3); }
        .btn-replace:hover { background: #a855f7; color: white; transform: translateY(-1px); }
        .btn-track { background: rgba(34,197,94,0.12); color: #22c55e; border-color: rgba(34,197,94,0.3); }
        .btn-track:hover { background: #22c55e; color: white; transform: translateY(-1px); }

        .empty-state {
            text-align: center; padding: 4rem 2rem;
            background: var(--glass-card); border-radius: 20px;
            border: 1px solid var(--glass-border);
        }

        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
        }

        .confirm-overlay {
            position: fixed; inset: 0; z-index: 999;
            background: rgba(0,0,0,0.70); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; pointer-events: none; transition: opacity 0.25s ease;
        }
        .confirm-overlay.active { opacity: 1; pointer-events: all; }
        .confirm-box {
            background: rgba(10,13,32,0.97); border: 1px solid rgba(255,255,255,0.18);
            border-radius: 22px; padding: 2.5rem 2.75rem; max-width: 400px; width: 92%;
            text-align: center; transform: scale(0.9) translateY(20px);
            transition: transform 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        .confirm-overlay.active .confirm-box { transform: scale(1) translateY(0); }

        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
    `;

    return (
        <div style={{ fontFamily: 'Poppins, sans-serif' }}>
            <style>{CSS}</style>
            
            <div className="bg-layer"></div>

            {/* Notification Stack */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts({...alerts, success: null})}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts({...alerts, failure: null})}>×</button>
                    </div>
                )}
            </div>

            {/* Navbar */}
            <nav className={scrolled ? 'scrolled' : ''}>
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </a>
                <div className="nav-right">
                    <a href="/customer/home" className="nav-link-btn"><i className="fas fa-th-large"></i> Shop</a>
                    <a href="/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="inner">
                    {/* Header */}
                    <div className="page-header">
                        <div className="page-header-left">
                            <h1>Order <span>History</span> 📦</h1>
                            <p>Track, manage and review all your past orders in one place.</p>
                        </div>
                        <div className="page-header-icon">🚚</div>
                    </div>

                    {/* Orders List */}
                    {orders && orders.length > 0 ? (
                        <div>
                            {orders.map((o) => (
                                <div className="order-card" key={o.id}>
                                    <div className="order-card-header">
                                        <div className="order-id">Order <span>#{o.id}</span></div>
                                        <div className="order-date">
                                            <i className="fas fa-calendar-alt"></i>
                                            <span>{o.orderDate || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="order-card-body">
                                        <div className="info-row">
                                            <span className="info-label">Amount</span>
                                            <span className="info-value amount-value">₹{o.amount}</span>
                                        </div>

                                        <div className="info-row">
                                            <span className="info-label">Status</span>
                                            <span className="info-value">
                                                {(!o.trackingStatus || ['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.trackingStatus.name)) && (
                                                    <span className="status-badge" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                                                        <i className="fas fa-check-circle"></i> {o.trackingStatus?.displayName || 'Placed'}
                                                    </span>
                                                )}
                                                {o.trackingStatus?.name === 'DELIVERED' && (
                                                    <span className="status-badge" style={{ background: 'rgba(34,197,94,0.18)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)' }}>
                                                        <i className="fas fa-box-open"></i> Delivered
                                                    </span>
                                                )}
                                                {o.trackingStatus?.name === 'CANCELLED' && (
                                                    <span className="status-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                        <i className="fas fa-times-circle"></i> Cancelled
                                                    </span>
                                                )}
                                                {o.trackingStatus?.name === 'REFUNDED' && (
                                                    <span className="status-badge" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                                                        <i className="fas fa-undo"></i> Refunded
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {o.deliveryTime && (
                                            <div className="info-row">
                                                <span className="info-label">Delivery</span>
                                                <span className="info-value">
                                                    <span className="delivery-chip"><i className="fas fa-clock"></i> {o.deliveryTime}</span>
                                                </span>
                                            </div>
                                        )}

                                        {o.items && o.items.length > 0 && (
                                            <div className="info-row">
                                                <span className="info-label">Items</span>
                                                <div className="info-value items-wrap">
                                                    {o.items.map((it, idx) => (
                                                        <span className="item-chip" key={idx}>
                                                            <i className="fas fa-box" style={{ fontSize: '0.6rem', opacity: 0.6 }}></i>
                                                            {it.name} × {it.quantity}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="info-row">
                                            <span className="info-label">Returns</span>
                                            <span className="info-value">
                                                {returnEligibleMap[o.id] ? (
                                                    <span className="return-badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                                                        <i className="fas fa-undo"></i> Return Eligible (within 7 days)
                                                    </span>
                                                ) : (
                                                    <span className="return-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <i className="fas fa-times-circle"></i> Not Eligible for Return
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="order-card-footer">
                                        {(!o.trackingStatus || !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.trackingStatus.name)) && (
                                            <a href={`/track/${o.id}`} className="action-btn btn-track">
                                                <i className="fas fa-truck"></i> Track Order
                                            </a>
                                        )}

                                        {(!o.trackingStatus || !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.trackingStatus.name)) && (
                                            <button className="action-btn btn-cancel" onClick={() => showConfirm('cancel', o.id)}>
                                                <i className="fas fa-times"></i> Cancel Order
                                            </button>
                                        )}

                                        {o.razorpay_payment_id === 'COD_NA' && (
                                            <a href="/payment" className="action-btn btn-retry">
                                                <i className="fas fa-redo"></i> Switch to Online Payment
                                            </a>
                                        )}

                                        {returnEligibleMap[o.id] && !replacementRequestedMap[o.id] && (
                                            <button className="action-btn btn-replace" onClick={() => showConfirm('replace', o.id)}>
                                                <i className="fas fa-exchange-alt"></i> Request Replacement
                                            </button>
                                        )}

                                        {replacementRequestedMap[o.id] && (
                                            <span className="replacement-badge" style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
                                                <i className="fas fa-check-circle"></i> Replacement Requested
                                            </span>
                                        )}

                                        <a href={`/customer/refund/report/${o.id}`} className="action-btn btn-cancel">
                                            <i className="fas fa-shield-alt"></i> Report Issue
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">📭</div>
                            <h3>No Orders Yet</h3>
                            <p>Your placed orders will appear here once you start shopping.</p>
                            <a href="/view-products" className="btn-shop"><i className="fas fa-store"></i> Start Shopping</a>
                        </div>
                    )}

                    <div className="back-wrap">
                        <a href="/customer/home" className="back-link">
                            <i className="fas fa-arrow-left"></i> Back to Home
                        </a>
                    </div>
                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>

            {/* Modal Overlay */}
            <div 
                id="confirmModal" 
                className={`confirm-overlay ${confirmModal.active ? 'active' : ''}`} 
                onClick={handleOverlayClick}
            >
                <div className="confirm-box">
                    <div className="confirm-icon">
                        {confirmModal.type === 'cancel' ? '🚫' : '🔄'}
                    </div>
                    <h3 className="confirm-title">
                        {confirmModal.type === 'cancel' ? `Cancel Order #${confirmModal.orderId}?` : 'Request Replacement?'}
                    </h3>
                    <p className="confirm-msg">
                        {confirmModal.type === 'cancel' 
                            ? 'This will permanently cancel your order and restore stock. This action cannot be undone.'
                            : `A replacement request will be sent for Order #${confirmModal.orderId}. Our team will contact you shortly.`}
                    </p>
                    <div className="confirm-actions">
                        <button className="confirm-btn-cancel" onClick={closeConfirm}>
                            <i className="fas fa-arrow-left"></i> Go Back
                        </button>
                        <a 
                            href={confirmModal.type === 'cancel' ? `/cancel-order/${confirmModal.orderId}` : `/request-replacement/${confirmModal.orderId}`}
                            className={`confirm-btn-ok ${confirmModal.type === 'cancel' ? 'danger' : 'purple'}`}
                        >
                            <i className={`fas ${confirmModal.type === 'cancel' ? 'fa-times' : 'fa-exchange-alt'}`}></i>
                            <span>{confirmModal.type === 'cancel' ? 'Yes, Cancel Order' : 'Yes, Request Replacement'}</span>
                        </a>
                    </div>
                </div>
            </div>
            
            {/* CSRF Security Hidden Input for POST forms if needed */}
            {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
        </div>
    );
}