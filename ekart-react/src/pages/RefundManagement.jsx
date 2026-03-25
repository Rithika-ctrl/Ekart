import React, { useState, useEffect } from 'react';

/**
 * RefundManagement Component
 * * @param {Object} props
 * @param {Array} props.refundRequests - List of order objects with pending refunds [{id, customer: {name}, totalPrice, orderDate}]
 * @param {number} props.pendingCount - Total number of pending refund requests
 * @param {number} props.totalRefundAmount - Sum of all pending refund amounts
 * @param {Object} props.session - Session notification object {success: string, failure: string}
 */
export default function RefundManagement({
    refundRequests = [],
    pendingCount = 0,
    totalRefundAmount = 0,
    session = { success: null, failure: null }
}) {
    // --- STATE ---
    const [isScrolled, setIsScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ 
        success: session.success, 
        failure: session.failure 
    });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timer);
        };
    }, [session]);

    // --- CSS ---
    const CSS = `
        :root {
            --yellow: #f5a800;
            --yellow-d: #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --glass-nav: rgba(0, 0, 0, 0.25);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
        }

        .refund-mgmt-body {
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
            filter: blur(6px); transform: scale(1.08);
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

        .nav-right { display: flex; align-items: center; gap: 1rem; }
        .nav-links { display: flex; align-items: center; gap: 0.5rem; }

        .nav-link {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .nav-link:hover { color: var(--yellow); border-color: rgba(245,168,0,0.3); background: rgba(245,168,0,0.08); }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); border-color: rgba(245,168,0,0.4); }

        .nav-badge {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.72rem; font-weight: 700;
            padding: 0.3rem 0.8rem; border-radius: 50px;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.3);
            color: var(--yellow);
            letter-spacing: 0.06em; text-transform: uppercase;
        }

        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3);
            transition: all 0.2s;
        }

        /* ── ALERTS ── */
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
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .page-header {
            display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
        }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; }
        .page-header h1 span { color: var(--yellow); }
        .page-header p { font-size: 0.9rem; color: var(--text-dim); margin-top: 0.3rem; }
        .page-header-icon { font-size: 2.5rem; }

        /* ── STATS ── */
        .stats-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
            max-width: 500px;
        }
        .stat-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
        }
        .stat-card-value { font-size: 2rem; font-weight: 700; color: var(--yellow); }
        .stat-card-label { font-size: 0.8rem; color: var(--text-dim); margin-top: 0.3rem; }

        /* ── TABLE ── */
        .refund-table-container {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            overflow: hidden;
        }
        .refund-table { width: 100%; border-collapse: collapse; }
        .refund-table th, .refund-table td {
            padding: 1rem 1.25rem;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .refund-table th {
            background: rgba(0,0,0,0.2);
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-dim);
        }
        .refund-table td { font-size: 0.875rem; color: var(--text-light); }
        .refund-table tr:hover td { background: rgba(255,255,255,0.03); }

        .order-id { color: var(--yellow); font-weight: 600; }
        .amount { font-weight: 600; color: #22c55e; }

        .action-btns { display: flex; gap: 0.5rem; }
        .btn-approve, .btn-deny {
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
        }
        .btn-approve {
            background: rgba(34,197,94,0.2);
            color: #22c55e;
            border: 1px solid rgba(34,197,94,0.4);
        }
        .btn-deny {
            background: rgba(255,100,80,0.2);
            color: #ff8060;
            border: 1px solid rgba(255,100,80,0.4);
        }

        .empty-state { text-align: center; padding: 3rem; color: var(--text-dim); }
        .empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }

        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .stats-row { grid-template-columns: 1fr; max-width: 100%; }
            .refund-table-container { overflow-x: auto; }
            footer { flex-direction: column; text-align: center; gap: 0.5rem; }
        }
    `;

    return (
        <div className="refund-mgmt-body">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({ ...p, success: null }))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({ ...p, failure: null }))}>×</button>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav className={isScrolled ? 'scrolled' : ''} id="nav">
                <a href="/admin/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i> Ekart
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        <a href="/admin/home" className="nav-link"><i className="fas fa-home"></i> Dashboard</a>
                        <a href="/approve-products" className="nav-link"><i className="fas fa-tasks"></i> Approvals</a>
                        <a href="/admin/search-users" className="nav-link"><i className="fas fa-users"></i> Users</a>
                    </div>
                    <div className="nav-divider" style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', margin: '0 0.5rem' }}></div>
                    <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>
                    <a href="/admin/logout" className="btn-logout">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Refund <span>Management</span> 💸</h1>
                        <p>Process refund requests and manage return claims from customers.</p>
                    </div>
                    <div className="page-header-icon">🔄</div>
                </div>

                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-card-value">{pendingCount}</div>
                        <div className="stat-card-label">Pending Requests</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-value">₹{Math.floor(totalRefundAmount).toLocaleString('en-IN')}</div>
                        <div className="stat-card-label">Total Refund Amount</div>
                    </div>
                </div>

                <div className="refund-table-container">
                    {(refundRequests && refundRequests.length > 0) ? (
                        <table className="refund-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Order Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refundRequests.map((order) => (
                                    <tr key={order.id}>
                                        <td className="order-id">#{order.id}</td>
                                        <td>{order.customer?.name}</td>
                                        <td className="amount">₹{order.totalPrice?.toLocaleString('en-IN')}</td>
                                        <td>{order.orderDate}</td>
                                        <td><span style={{ color: '#fbbf24' }}>Refund Requested</span></td>
                                        <td className="action-btns">
                                            <a href={`/process-refund/${order.id}?action=approve`} className="btn-approve">
                                                <i className="fas fa-check"></i> Approve
                                            </a>
                                            <a href={`/process-refund/${order.id}?action=deny`} className="btn-deny">
                                                <i className="fas fa-times"></i> Deny
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">
                            <i className="fas fa-inbox"></i>
                            <p>No pending refund requests</p>
                        </div>
                    )}
                </div>
            </main>

            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}