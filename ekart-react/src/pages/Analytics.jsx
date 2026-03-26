import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Analytics Component
 * * @param {Object} props
 * @param {number} props.totalCustomers - Total number of customers
 * @param {number} props.totalVendors - Total number of vendors
 * @param {number} props.totalProducts - Total number of products
 * @param {number} props.totalOrders - Total number of orders
 * @param {number} props.totalRevenue - Total platform revenue
 * @param {number} props.processingOrders - Count of orders in processing status
 * @param {number} props.shippedOrders - Count of orders in shipped status
 * @param {number} props.deliveredOrders - Count of orders in delivered status
 * @param {number} props.approvedProducts - Count of approved products
 * @param {number} props.pendingProducts - Count of products pending approval
 * @param {string} props.dailyOrdersJson - JSON string of daily order data (Date: Count)
 * @param {string} props.categoryStatsJson - JSON string of category distribution data (Category: Count)
 * @param {Object} props.session - Session object for success/failure messages
 */
export default function Analytics({
    totalCustomers = 0,
    totalVendors = 0,
    totalProducts = 0,
    totalOrders = 0,
    totalRevenue = 0,
    processingOrders = 0,
    shippedOrders = 0,
    deliveredOrders = 0,
    approvedProducts = 0,
    pendingProducts = 0,
    dailyOrdersJson = '{}',
    categoryStatsJson = '{}',
    session = { success: null, failure: null }
}) {
    // --- STATE ---
    const [alerts, setAlerts] = useState({
        success: session.success,
        failure: session.failure
    });

    // --- REFS ---
    const ordersChartRef = useRef(null);
    const categoryChartRef = useRef(null);
    const ordersChartInstance = useRef(null);
    const categoryChartInstance = useRef(null);

    // --- CSS ---
    const CSS = `:root {
            --yellow: #f5a800;
            --yellow-d: #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --glass-nav: rgba(0, 0, 0, 0.25);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
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
        }

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

        .nav-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.15); margin: 0 0.5rem; }

        .nav-badge {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.72rem; font-weight: 700;
            padding: 0.3rem 0.8rem; border-radius: 50px;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.3);
            color: var(--yellow);
        }

        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3);
            transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

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

        /* ── PAGE HEADER ── */
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

        /* ── STATS GRID ── */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.25rem;
        }
        .stat-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s;
        }
        .stat-card:hover {
            transform: translateY(-4px);
            border-color: rgba(245,168,0,0.4);
        }
        .stat-card-icon {
            width: 48px; height: 48px;
            margin: 0 auto 0.75rem;
            background: rgba(245,168,0,0.15);
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.25rem;
            color: var(--yellow);
        }
        .stat-card-value {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-white);
        }
        .stat-card-label {
            font-size: 0.75rem;
            color: var(--text-dim);
            margin-top: 0.25rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* ── CHARTS ROW ── */
        .charts-row {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1.5rem;
        }
        .chart-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
        }
        .chart-card h3 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .chart-card h3 i { color: var(--yellow); }
        .chart-container {
            position: relative;
            height: 250px;
        }

        /* ── ORDER STATUS ── */
        .order-status-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
        }
        .order-status-card {
            background: rgba(0,0,0,0.2);
            border-radius: 12px;
            padding: 1.25rem;
            text-align: center;
        }
        .order-status-card.processing { border-left: 4px solid #fbbf24; }
        .order-status-card.shipped { border-left: 4px solid #3b82f6; }
        .order-status-card.delivered { border-left: 4px solid #22c55e; }
        
        .order-status-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-white);
        }
        .order-status-label {
            font-size: 0.75rem;
            color: var(--text-dim);
            margin-top: 0.25rem;
        }

        /* ── REVENUE CARD ── */
        .revenue-card {
            background: linear-gradient(135deg, rgba(245,168,0,0.2), rgba(245,168,0,0.05));
            border: 1px solid rgba(245,168,0,0.4);
            border-radius: 16px;
            padding: 2rem;
            text-align: center;
        }
        .revenue-label {
            font-size: 0.8rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .revenue-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--yellow);
            margin: 0.5rem 0;
        }
        .revenue-orders {
            font-size: 0.9rem;
            color: var(--text-light);
        }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes slideIn {
            from { opacity: 0; transform: translateX(14px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @media(max-width: 1024px) {
            .nav-links { display: none; }
            .nav-divider { display: none; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .charts-row { grid-template-columns: 1fr; }
        }
        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .stats-grid { grid-template-columns: 1fr 1fr; }
            .order-status-grid { grid-template-columns: 1fr; }
            footer { flex-direction: column; text-align: center; gap: 0.5rem; }
        }`;

    // --- EFFECTS ---
    useEffect(() => {
        // Use the global 'Chart' object provided by the CDN in the HTML
        const ChartJS = window.Chart;
        if (!ChartJS) return;

        const dailyOrdersData = JSON.parse(dailyOrdersJson);
        const categoryStatsData = JSON.parse(categoryStatsJson);

        // Orders Line Chart
        if (ordersChartRef.current) {
            const ctx = ordersChartRef.current.getContext('2d');
            ordersChartInstance.current = new ChartJS(ctx, {
                type: 'line',
                data: {
                    labels: Object.keys(dailyOrdersData).map(d => {
                        const date = new Date(d);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }),
                    datasets: [{
                        label: 'Orders',
                        data: Object.values(dailyOrdersData),
                        borderColor: '#f5a800',
                        backgroundColor: 'rgba(245, 168, 0, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#f5a800',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 } }
                    }
                }
            });
        }

        // Category Doughnut Chart
        if (categoryChartRef.current) {
            const ctx = categoryChartRef.current.getContext('2d');
            const categoryLabels = Object.keys(categoryStatsData);
            const categoryValues = Object.values(categoryStatsData);
            const colors = ['#f5a800', '#3b82f6', '#22c55e', '#ec4899', '#8b5cf6', '#14b8a6'];

            categoryChartInstance.current = new ChartJS(ctx, {
                type: 'doughnut',
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        data: categoryValues,
                        backgroundColor: colors.slice(0, categoryLabels.length),
                        borderColor: 'rgba(0,0,0,0.3)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: 'rgba(255,255,255,0.7)',
                                padding: 15,
                                font: { size: 11 }
                            }
                        }
                    }
                }
            });
        }

        // Auto-dismiss alerts
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        return () => {
            if (ordersChartInstance.current) ordersChartInstance.current.destroy();
            if (categoryChartInstance.current) categoryChartInstance.current.destroy();
            clearTimeout(timer);
        };
    }, [dailyOrdersJson, categoryStatsJson]);

    return (
        <div className="analytics-body">
            <style>{CSS}</style>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
            <nav id="nav">
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    Ekart
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link"><i className="fas fa-home"></i> Dashboard</a>
                        <Link to="/admin/products" className="nav-link"><i className="fas fa-tasks"></i> Approvals</Link>
                        <Link to="/admin/users" className="nav-link"><i className="fas fa-users"></i> Users</Link>
                    </div>
                    <div className="nav-divider"></div>
                    <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            {/* PAGE */}
            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Analytics & <span>Reports</span> 📊</h1>
                        <p>View platform analytics, sales metrics, and generate reports.</p>
                    </div>
                    <div className="page-header-icon">📈</div>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-icon"><i className="fas fa-users"></i></div>
                        <div className="stat-card-value">{totalCustomers}</div>
                        <div className="stat-card-label">Customers</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon"><i className="fas fa-store"></i></div>
                        <div className="stat-card-value">{totalVendors}</div>
                        <div className="stat-card-label">Vendors</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon"><i className="fas fa-box"></i></div>
                        <div className="stat-card-value">{totalProducts}</div>
                        <div className="stat-card-label">Products</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon"><i className="fas fa-shopping-bag"></i></div>
                        <div className="stat-card-value">{totalOrders}</div>
                        <div className="stat-card-label">Orders</div>
                    </div>
                </div>

                {/* Revenue + Daily Orders */}
                <div className="charts-row">
                    <div className="chart-card">
                        <h3><i className="fas fa-chart-line"></i> Orders (Last 7 Days)</h3>
                        <div className="chart-container">
                            <canvas ref={ordersChartRef}></canvas>
                        </div>
                    </div>
                    <div className="revenue-card">
                        <div className="revenue-label">Total Revenue</div>
                        <div className="revenue-value">₹<span>{Math.floor(totalRevenue)}</span></div>
                        <div className="revenue-orders"><span>{totalOrders}</span> orders completed</div>
                    </div>
                </div>

                {/* Order Status + Category Distribution */}
                <div className="charts-row">
                    <div className="chart-card">
                        <h3><i className="fas fa-truck"></i> Order Status Breakdown</h3>
                        <div className="order-status-grid">
                            <div className="order-status-card processing">
                                <div className="order-status-value">{processingOrders}</div>
                                <div className="order-status-label">Processing</div>
                            </div>
                            <div className="order-status-card shipped">
                                <div className="order-status-value">{shippedOrders}</div>
                                <div className="order-status-label">Shipped</div>
                            </div>
                            <div className="order-status-card delivered">
                                <div className="order-status-value">{deliveredOrders}</div>
                                <div className="order-status-label">Delivered</div>
                            </div>
                        </div>
                    </div>
                    <div className="chart-card">
                        <h3><i className="fas fa-tags"></i> Products by Category</h3>
                        <div className="chart-container">
                            <canvas ref={categoryChartRef}></canvas>
                        </div>
                    </div>
                </div>

                {/* Product Approval Status */}
                <div className="chart-card">
                    <h3><i className="fas fa-clipboard-check"></i> Product Approval Status</h3>
                    <div className="order-status-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <div className="order-status-card" style={{ borderLeftColor: '#22c55e' }}>
                            <div className="order-status-value">{approvedProducts}</div>
                            <div className="order-status-label">Approved Products</div>
                        </div>
                        <div className="order-status-card" style={{ borderLeftColor: '#fbbf24' }}>
                            <div className="order-status-value">{pendingProducts}</div>
                            <div className="order-status-label">Pending Approval</div>
                        </div>
                    </div>
                </div>
            </main>

            {/* FOOTER */}
            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}