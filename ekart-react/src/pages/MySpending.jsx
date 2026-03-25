import React, { useState, useEffect } from 'react';

/**
 * MySpending Component
 * * @param {Object} props
 * @param {number} props.totalSpent - Total amount spent by the customer
 * @param {number} props.totalOrders - Total number of orders placed
 * @param {number} props.averageOrderValue - Average value per order
 * @param {Array} props.orders - List of order objects [{id, date, status, paymentMode, amount}]
 * @param {Object} props.session - Session object for notifications {success: string, failure: string}
 */
export default function MySpending({
    totalSpent = 0,
    totalOrders = 0,
    averageOrderValue = 0,
    orders = [],
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
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card:   rgba(255, 255, 255, 0.13);
            --glass-nav:    rgba(0, 0, 0, 0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }

        .spending-container {
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

        .nav-links { display: flex; align-items: center; gap: 0.5rem; }
        .nav-link {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            transition: all 0.2s;
        }
        .nav-link:hover { color: var(--yellow); background: rgba(245,168,0,0.08); }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); }

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
        }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger { border-color: rgba(255,100,80,0.45); color: #ff8060; }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            max-width: 1200px;
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

        /* ── STATS ── */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }
        .stat-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.75rem;
            text-align: center;
        }
        .stat-card-icon {
            width: 48px; height: 48px;
            margin: 0 auto 1rem;
            background: rgba(245,168,0,0.15);
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.25rem; color: var(--yellow);
        }
        .stat-card-value { font-size: 1.75rem; font-weight: 800; color: white; }
        .stat-card-label { font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; margin-top: 0.25rem; letter-spacing: 0.05em; }

        /* ── TABLE ── */
        .orders-table-wrap {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            overflow: hidden;
        }
        table { width: 100%; border-collapse: collapse; }
        th {
            text-align: left; padding: 1.25rem;
            font-size: 0.7rem; color: var(--text-dim);
            text-transform: uppercase; letter-spacing: 0.1em;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        td { padding: 1.25rem; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--text-light); }
        
        .status-pill {
            padding: 0.25rem 0.75rem; border-radius: 50px; font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; border: 1px solid;
        }
        .status-delivered { background: rgba(34,197,94,0.15); color: #4ade80; border-color: rgba(34,197,94,0.3); }
        .status-pending { background: rgba(245,168,0,0.15); color: var(--yellow); border-color: rgba(245,168,0,0.3); }
        .status-shipped { background: rgba(59,130,246,0.15); color: #60a5fa; border-color: rgba(59,130,246,0.3); }

        .payment-cod { color: #f87171; font-weight: 600; font-size: 0.8rem; }
        .payment-online { color: #34d399; font-weight: 600; font-size: 0.8rem; }

        .amount-cell { font-weight: 700; color: white; font-size: 1rem; }

        /* ── EMPTY STATE ── */
        .empty-state {
            padding: 5rem 2rem; text-align: center; color: var(--text-dim);
        }
        .empty-state i { font-size: 3.5rem; margin-bottom: 1.5rem; opacity: 0.3; }
        .empty-state a {
            display: inline-block; margin-top: 1.5rem; color: var(--yellow);
            text-decoration: none; font-weight: 600; border-bottom: 1px solid;
        }

        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.5rem 3rem; display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; }
        .footer-brand span { color: var(--yellow); }

        @media(max-width: 768px) {
            nav { padding: 1rem 1.5rem; }
            .page { padding: 6rem 1.25rem 2rem; }
            .stats-grid { grid-template-columns: 1fr; }
            .page-header { flex-direction: column; text-align: center; gap: 1rem; }
            .orders-table-wrap { overflow-x: auto; }
        }
    `;

    return (
        <div className="spending-container">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav className={isScrolled ? 'scrolled' : ''} id="nav">
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ek<span>art</span>
                </a>
                <div className="nav-links">
                    <a href="/customer/home" className="nav-link"><i className="fas fa-home"></i> Home</a>
                    <a href="/customer/view-products" className="nav-link"><i className="fas fa-search"></i> Browse</a>
                    <a href="/customer/spending" className="nav-link active"><i className="fas fa-chart-line"></i> Spending</a>
                    <a href="/logout" className="nav-link" style={{ color: '#ff8060' }}><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div>
                        <h1>My <span>Spending</span> Insights 📊</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                            Track your shopping patterns and order history on Ekart.
                        </p>
                    </div>
                    <div style={{ background: 'rgba(245,168,0,0.1)', padding: '1rem', borderRadius: '15px', border: '1px solid rgba(245,168,0,0.2)' }}>
                        <i className="fas fa-wallet" style={{ fontSize: '2rem', color: 'var(--yellow)' }}></i>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-icon"><i className="fas fa-receipt"></i></div>
                        <div className="stat-card-value">₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="stat-card-label">Total Expenditure</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon" style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.15)' }}><i className="fas fa-box"></i></div>
                        <div className="stat-card-value">{totalOrders}</div>
                        <div className="stat-card-label">Orders Placed</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon" style={{ color: '#34d399', background: 'rgba(52,211,153,0.15)' }}><i className="fas fa-calculator"></i></div>
                        <div className="stat-card-value">₹{averageOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="stat-card-label">Avg. Order Value</div>
                    </div>
                </div>

                <div className="section-content">
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <i className="fas fa-history" style={{ color: 'var(--yellow)' }}></i> Order History
                    </h2>

                    {(!orders || orders.length === 0) ? (
                        <div className="orders-table-wrap">
                            <div className="empty-state">
                                <i className="fas fa-shopping-bag"></i>
                                <p>You haven't placed any orders yet.</p>
                                <a href="/customer/home">Start Shopping</a>
                            </div>
                        </div>
                    ) : (
                        <div className="orders-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Payment</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order, index) => (
                                        <tr key={order.id || index}>
                                            <td style={{ fontWeight: 600 }}>#{order.id}</td>
                                            <td>{order.date}</td>
                                            <td>
                                                <span className={`status-pill status-${(order.status || '').toLowerCase()}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td>
                                                {(!order.paymentMode || order.paymentMode === 'Cash on Delivery') ? (
                                                    <span className="payment-cod">💵 COD</span>
                                                ) : (
                                                    <span className="payment-online">💳 Online</span>
                                                )}
                                            </td>
                                            <td className="amount-cell">
                                                ₹{Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <footer>
                <div className="footer-brand">Ek<span>art</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}