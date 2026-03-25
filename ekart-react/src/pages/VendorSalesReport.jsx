import React, { useState, useEffect, useRef, useCallback } from 'react';

const CSS = `
        :root {
            --yellow: #f5a800; --yellow-d: #d48f00;
            --glass-border: rgba(255,255,255,0.22); --glass-card: rgba(255,255,255,0.13);
            --glass-card-s: rgba(255,255,255,0.08); --glass-nav: rgba(0,0,0,0.25);
            --text-white: #ffffff; --text-light: rgba(255,255,255,0.80); --text-dim: rgba(255,255,255,0.50);
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Poppins', sans-serif; min-height: 100vh; color: var(--text-white); display: flex; flex-direction: column; }

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

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border); transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }
        .nav-brand { font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none; letter-spacing: 0.04em; display: flex; align-items: center; gap: 0.5rem; }
        .nav-brand span { color: var(--yellow); }
        .nav-right { display: flex; align-items: center; gap: 0.75rem; }
        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border); transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        /* ── ALERTS ── */
        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert {
            padding: 0.875rem 1.25rem; background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px; animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── PAGE ── */
        .page { flex: 1; padding: 7rem 2rem 3rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }

        .page-header {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 20px;
            padding: 2rem 2.5rem; display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; width: 100%; max-width: 1000px; animation: fadeUp 0.5s ease both;
        }
        .page-header-left h1 { font-size: clamp(1.2rem, 2.5vw, 1.75rem); font-weight: 700; margin-bottom: 0.25rem; }
        .page-header-left h1 span { color: var(--yellow); }
        .page-header-left p { font-size: 0.825rem; color: var(--text-dim); }
        .header-actions { display: flex; gap: 0.75rem; }
        .btn-sync {
            background: rgba(245,168,0,0.15); border: 1px solid rgba(245,168,0,0.3);
            color: var(--yellow); font-family: 'Poppins', sans-serif; font-size: 0.82rem; font-weight: 600;
            padding: 0.5rem 1.1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s;
            display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .btn-sync:hover { background: rgba(245,168,0,0.25); border-color: rgba(245,168,0,0.5); color: var(--yellow); }
        .btn-sync:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── SUMMARY CARDS ── */
        .summary-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem;
            width: 100%; max-width: 1000px; animation: fadeUp 0.5s ease 0.05s both;
        }
        .summary-card {
            background: var(--glass-card-s); border: 1px solid var(--glass-border);
            border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; gap: 1rem;
        }
        .summary-icon {
            width: 52px; height: 52px; border-radius: 14px;
            background: rgba(245,168,0,0.1); border: 1px solid rgba(245,168,0,0.25);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.3rem; color: var(--yellow); flex-shrink: 0;
        }
        .summary-text { flex: 1; }
        .summary-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 0.2rem; }
        .summary-num { font-size: 1.5rem; font-weight: 800; color: white; }
        .summary-num span { color: white; }

        /* ── CHART SECTION ── */
        .chart-section {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 20px;
            padding: 2rem; width: 100%; max-width: 1000px;
            animation: fadeUp 0.5s ease 0.1s both;
        }
        .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .section-label { display: flex; align-items: center; gap: 0.6rem; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--yellow); }
        .chart-tabs { display: flex; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 0.25rem; }
        .chart-tab {
            background: transparent; border: none; color: var(--text-dim);
            padding: 0.4rem 1rem; font-family: 'Poppins', sans-serif; font-size: 0.75rem; font-weight: 600;
            border-radius: 6px; cursor: pointer; transition: all 0.2s;
        }
        .chart-tab:hover { color: white; }
        .chart-tab.active { background: var(--yellow); color: #1a1000; }
        .chart-container { position: relative; height: 320px; width: 100%; }

        /* ── RECENT SALES TABLE ── */
        .table-section {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 20px;
            padding: 2rem; width: 100%; max-width: 1000px;
            animation: fadeUp 0.5s ease 0.15s both; overflow: hidden;
        }
        .table-responsive { width: 100%; overflow-x: auto; margin-top: 1rem; }
        .sales-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .sales-table th {
            text-align: left; padding: 1rem; font-size: 0.72rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim);
            border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.15);
        }
        .sales-table td {
            padding: 1rem; font-size: 0.825rem; color: var(--text-light);
            border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle;
        }
        .sales-table tr:hover td { background: rgba(255,255,255,0.02); }
        .sales-table td.amt { font-weight: 700; color: var(--yellow); }
        .empty-row { text-align: center; padding: 3rem !important; color: var(--text-dim); }

        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border); padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media (max-width: 800px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 6rem 1rem 2rem; }
            .summary-grid { grid-template-columns: 1fr; }
            .page-header, .chart-section, .table-section { padding: 1.5rem; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }
`;

/**
 * VendorSalesReport Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {Array} props.initialSales - List of initial recent sales
 */
export default function VendorSalesReport({
    successMessage = null,
    failureMessage = null,
    initialSales = []
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    
    const [salesData, setSalesData] = useState(initialSales);
    const [currentTab, setCurrentTab] = useState('daily');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('Sync Orders');

    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [chartLoaded, setChartLoaded] = useState(false);

    // Derived Statistics
    const totalRevenue = salesData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalOrders = new Set(salesData.map(item => item.id)).size; // Assuming id maps to order uniqueness
    const totalItems = salesData.reduce((sum, item) => sum + parseInt(item.quantity || item.itemCount || 1, 10), 0);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Alert dismissal
    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => setFadeAlerts(true), 2500);
            const timer2 = setTimeout(() => { setShowSuccess(false); setShowFailure(false); }, 3000);
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        }
    }, [showSuccess, showFailure]);

    // Data Processing for Chart
    const processData = useCallback((data, type) => {
        const aggregated = {};
        data.forEach(item => {
            const d = new Date(item.orderDate);
            if (isNaN(d.getTime())) return;
            let key = '';
            if (type === 'daily') {
                key = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
            } else if (type === 'weekly') {
                const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
                key = 'Week of ' + firstDay.toLocaleDateString('en-CA');
            } else if (type === 'monthly') {
                key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
            }
            aggregated[key] = (aggregated[key] || 0) + (parseFloat(item.amount) || 0);
        });
        return aggregated;
    }, []);

    // Render Chart
    useEffect(() => {
        if (!chartLoaded || !window.Chart || !chartRef.current) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const aggregated = processData(salesData, currentTab);
        const labels = Object.keys(aggregated).sort();
        const dataPoints = labels.map(l => aggregated[l]);

        const ctx = chartRef.current.getContext('2d');
        
        // Gradient
        let gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(245, 168, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(245, 168, 0, 0.0)');

        chartInstance.current = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue (₹)',
                    data: dataPoints,
                    borderColor: '#f5a800',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#1a1000',
                    pointBorderColor: '#f5a800',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10,12,30,0.9)',
                        titleColor: '#fff',
                        bodyColor: '#f5a800',
                        borderColor: 'rgba(245,168,0,0.3)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return '₹ ' + context.parsed.y.toLocaleString('en-IN', {minimumFractionDigits: 2});
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: "'Poppins', sans-serif" } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: "'Poppins', sans-serif" } }
                    }
                }
            }
        });
    }, [salesData, currentTab, chartLoaded, processData]);

    // Data Polling
    const refreshSalesData = useCallback(() => {
        fetch('/vendor/api/sales-data')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const mapped = data.map(o => ({
                        id: o.id,
                        amount: o.amount || 0,
                        orderDate: o.orderDate,
                        productName: o.productName || '',
                        category: o.category || 'Other',
                        quantity: o.quantity || o.itemCount || 1
                    }));
                    setSalesData(mapped);
                }
            })
            .catch(err => console.warn('Sales refresh failed:', err));
    }, []);

    useEffect(() => {
        // Only run fetch logic if we are running in an environment that has fetch (skip for simple SSR preview if needed)
        if (typeof window !== 'undefined') {
            const interval = setInterval(refreshSalesData, 30000);
            return () => clearInterval(interval);
        }
    }, [refreshSalesData]);

    // Script Loading Check
    useEffect(() => {
        const checkChart = setInterval(() => {
            if (window.Chart) {
                setChartLoaded(true);
                clearInterval(checkChart);
            }
        }, 100);
        return () => clearInterval(checkChart);
    }, []);

    // Sync Orders Logic
    const handleSyncOrders = () => {
        setIsSyncing(true);
        setSyncMessage('Syncing...');
        
        fetch('/vendor/sync-reporting', { method: 'POST' })
            .then(r => r.json())
            .then(data => {
                setSyncMessage(`Synced (${data.synced || 0})`);
                refreshSalesData();
                setTimeout(() => {
                    setIsSyncing(false);
                    setSyncMessage('Sync Orders');
                }, 3000);
            })
            .catch(() => {
                setIsSyncing(false);
                setSyncMessage('Sync Orders');
            });
    };

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Sales Report</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            {/* Chart.js Script */}
            
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* Alerts */}
            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={alertStyle}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <a href="/vendor/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </a>
                <div className="nav-right">
                    <a href="/vendor/home" className="nav-link-btn"><i className="fas fa-th-large"></i> Dashboard</a>
                    <a href="/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                {/* Header */}
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Sales <span>Report</span> 📈</h1>
                        <p>Track your revenue, order volume, and business growth.</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn-sync" onClick={handleSyncOrders} disabled={isSyncing}>
                            {isSyncing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                            {syncMessage}
                        </button>
                    </div>
                </div>

                {/* Summary Grid */}
                <div className="summary-grid">
                    <div className="summary-card">
                        <div className="summary-icon"><i className="fas fa-wallet"></i></div>
                        <div className="summary-text">
                            <div className="summary-label">Total Revenue</div>
                            <div className="summary-num">₹<span>{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-icon"><i className="fas fa-boxes"></i></div>
                        <div className="summary-text">
                            <div className="summary-label">Total Orders</div>
                            <div className="summary-num"><span>{totalOrders}</span></div>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-icon"><i class="fas fa-tags"></i></div>
                        <div className="summary-text">
                            <div className="summary-label">Items Sold</div>
                            <div className="summary-num"><span>{totalItems}</span></div>
                        </div>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="chart-section">
                    <div className="chart-header">
                        <div className="section-label" style={{ marginBottom: 0 }}>
                            <i className="fas fa-chart-area"></i> Revenue Trend
                        </div>
                        <div className="chart-tabs">
                            <button className={`chart-tab ${currentTab === 'daily' ? 'active' : ''}`} onClick={() => setCurrentTab('daily')}>Daily</button>
                            <button className={`chart-tab ${currentTab === 'weekly' ? 'active' : ''}`} onClick={() => setCurrentTab('weekly')}>Weekly</button>
                            <button className={`chart-tab ${currentTab === 'monthly' ? 'active' : ''}`} onClick={() => setCurrentTab('monthly')}>Monthly</button>
                        </div>
                    </div>
                    <div className="chart-container">
                        <canvas id="salesChart" ref={chartRef}></canvas>
                    </div>
                </div>

                {/* Recent Sales Table */}
                <div className="table-section">
                    <div className="section-label"><i className="fas fa-list"></i> Recent Sales Activity</div>
                    <div className="table-responsive">
                        <table className="sales-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Date & Time</th>
                                    <th>Product</th>
                                    <th>Category</th>
                                    <th>Qty</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesData.length > 0 ? (
                                    salesData.map((sale, idx) => (
                                        <tr key={idx}>
                                            <td>#{sale.id}</td>
                                            <td>
                                                {new Date(sale.orderDate).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                })}
                                            </td>
                                            <td>{sale.productName || '—'}</td>
                                            <td>{sale.category || '—'}</td>
                                            <td>{sale.quantity || 1}</td>
                                            <td className="amt">₹{parseFloat(sale.amount || 0).toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="empty-row">No recent sales data available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </>
    );
}