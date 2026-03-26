import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
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
    const CSS = `:root {
            --yellow: #f5a800;
            --glass-border: rgba(255,255,255,0.22);
            --glass-card: rgba(255,255,255,0.13);
            --glass-nav: rgba(0,0,0,0.25);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
        }
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        #root { font-family: 'Poppins', sans-serif; min-height: 100vh; color: var(--text-white); display: flex; flex-direction: column; }

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: ''; position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
        }
        .bg-layer::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

        /* NAV */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border); transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }
        .nav-brand { font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
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
        .nav-link-btn.active { color: var(--yellow); border-color: rgba(245,168,0,0.4); background: rgba(245,168,0,0.1); }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        /* ALERTS */
        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert {
            padding: 0.875rem 1.25rem; background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px; animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; }

        /* PAGE */
        .page { flex: 1; padding: 7rem 1.5rem 3rem; display: flex; flex-direction: column; align-items: center; gap: 2rem; }
        .inner { width: 100%; max-width: 860px; display: flex; flex-direction: column; gap: 1.75rem; }

        /* PAGE HEADER */
        .page-header {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
            animation: fadeUp 0.4s ease both;
        }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; }
        .page-header h1 span { color: var(--yellow); }
        .page-header p { font-size: 0.875rem; color: var(--text-dim); }
        .page-header-icon { font-size: 2.5rem; }

        /* STATS GRID */
        .stats-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem;
            animation: fadeUp 0.4s ease 0.1s both;
        }
        .stat-card {
            background: var(--glass-card); backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border); border-radius: 16px;
            padding: 1.5rem 1.25rem; text-align: center;
            transition: transform 0.2s, border-color 0.2s;
        }
        .stat-card:hover { transform: translateY(-4px); border-color: rgba(245,168,0,0.35); }
        .stat-icon { font-size: 1.6rem; margin-bottom: 0.6rem; }
        .stat-value { font-size: 1.6rem; font-weight: 800; color: var(--yellow); line-height: 1; }
        .stat-label { font-size: 0.75rem; color: var(--text-dim); margin-top: 0.4rem; font-weight: 500; }

        /* ORDER HISTORY TABLE */
        .section-title {
            font-size: 1rem; font-weight: 700; color: var(--text-light);
            display: flex; align-items: center; gap: 0.5rem;
            animation: fadeUp 0.4s ease 0.2s both;
        }
        .section-title i { color: var(--yellow); }

        .orders-table-wrap {
            background: var(--glass-card); backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border); border-radius: 16px;
            overflow-x: auto;
            animation: fadeUp 0.4s ease 0.3s both;
        }
        .orders-table { width: 100%; border-collapse: collapse; }
        .orders-table th, .orders-table td {
            padding: 0.9rem 1.25rem; text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .orders-table th {
            background: rgba(0,0,0,0.2);
            font-size: 0.72rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim);
        }
        .orders-table td { font-size: 0.875rem; color: var(--text-light); }
        .orders-table tr:last-child td { border-bottom: none; }
        .orders-table tbody tr:hover td { background: rgba(255,255,255,0.03); }

        .order-id-cell { color: var(--yellow); font-weight: 700; }
        .amount-cell { color: #22c55e; font-weight: 700; }
        .payment-online { color: #60a5fa; font-size: 0.8rem; }
        .payment-cod { color: #fbbf24; font-size: 0.8rem; }

        /* EMPTY STATE */
        .empty-state { text-align: center; padding: 3rem; color: var(--text-dim); }
        .empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.4; display: block; }
        .empty-state p { font-size: 0.95rem; }
        .empty-state a {
            display: inline-block; margin-top: 1rem;
            padding: 0.6rem 1.5rem; border-radius: 8px;
            background: rgba(245,168,0,0.15); border: 1px solid rgba(245,168,0,0.3);
            color: var(--yellow); text-decoration: none; font-size: 0.85rem; font-weight: 600;
            transition: all 0.2s;
        }
        .empty-state a:hover { background: rgba(245,168,0,0.25); }

        /* FOOTER */
        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem; display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .page-header { flex-direction: column; text-align: center; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; gap: 0.5rem; }
        }`;

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
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ek<span>art</span>
                </a>
                <div className="nav-links">
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link"><i className="fas fa-home"></i> Home</a>
                    <Link to="/products" className="nav-link"><i className="fas fa-search"></i> Browse</Link>
                    <Link to="/spending" className="nav-link active"><i className="fas fa-chart-line"></i> Spending</Link>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link" style={{ color: '#ff8060' }}><i className="fas fa-sign-out-alt"></i> Logout</a>
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
                                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}}>Start Shopping</a>
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