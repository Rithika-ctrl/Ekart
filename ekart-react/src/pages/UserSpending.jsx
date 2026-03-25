import React, { useState, useEffect } from 'react';

/**
 * UserSpending Component (Simplified - No external Chart libraries)
 * @param {Object} props
 * @param {number} props.platformTotal - Total revenue of the platform
 * @param {number} props.totalCustomers - Total number of registered customers
 * @param {number} props.activeCustomers - Number of customers who have placed at least one order
 * @param {number} props.avgSpendPerCustomer - Average spending amount per customer
 * @param {Array} props.spendingData - List of customer spending details [{name, email, orderCount, totalSpent, avgOrder}]
 * @param {Object} props.session - Session notification object {success: string, failure: string}
 */
export default function UserSpending({
    platformTotal = 0,
    totalCustomers = 0,
    activeCustomers = 0,
    avgSpendPerCustomer = 0,
    spendingData = [],
    session = { success: null, failure: null }
}) {
    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState("");
    const [isScrolled, setIsScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timer);
        };
    }, [session]);

    // --- LOGIC ---
    const filteredData = spendingData.filter(row => 
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        row.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const CSS = `
        :root {
            --yellow: #f5a800;
            --yellow-d: #d48f00;
            --glass-border: rgba(255,255,255,0.22);
            --glass-card: rgba(255,255,255,0.13);
            --glass-nav: rgba(0,0,0,0.25);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
        }

        .user-spending-body {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            position: relative;
        }

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

        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border); transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }
        .nav-brand { font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-brand span { color: var(--yellow); }

        .nav-links { display: flex; align-items: center; gap: 0.5rem; }
        .nav-link {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            transition: all 0.2s;
        }
        .nav-link:hover { color: var(--yellow); background: rgba(245,168,0,0.08); }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); border: 1px solid rgba(245,168,0,0.4); }

        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }

        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert { padding: 0.875rem 1.25rem; background: rgba(10,12,30,0.88); backdrop-filter: blur(16px); border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.625rem; font-size: 0.825rem; min-width: 260px; }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger { border-color: rgba(255,100,80,0.45); color: #ff8060; }

        .page { flex: 1; padding: 7rem 3rem 3rem; display: flex; flex-direction: column; gap: 2rem; }
        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem 2.5rem; }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; }
        .page-header h1 span { color: var(--yellow); }

        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
        .stat-card { background: var(--glass-card); backdrop-filter: blur(18px); border: 1px solid var(--glass-border); border-radius: 16px; padding: 1.5rem; text-align: center; }
        .stat-card-value { font-size: 1.75rem; font-weight: 700; color: var(--yellow); }
        .stat-card-label { font-size: 0.78rem; color: var(--text-dim); margin-top: 0.3rem; }

        .search-input { width: 100%; max-width: 360px; padding: 0.65rem 1rem 0.65rem 2.5rem; background: var(--glass-card); border: 1px solid var(--glass-border); border-radius: 10px; color: white; font-family: 'Poppins', sans-serif; font-size: 0.85rem; outline: none; }
        
        .table-container { background: var(--glass-card); backdrop-filter: blur(18px); border: 1px solid var(--glass-border); border-radius: 16px; overflow-x: auto; }
        .spending-table { width: 100%; border-collapse: collapse; }
        .spending-table th, .spending-table td { padding: 1rem 1.25rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .spending-table th { background: rgba(0,0,0,0.2); font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
        
        .rank { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-size: 0.78rem; font-weight: 700; }
        .rank-1 { background: rgba(255,215,0,0.2); color: #ffd700; border: 1px solid #ffd700; }
        .rank-2 { background: rgba(192,192,192,0.2); color: #c0c0c0; border: 1px solid #c0c0c0; }
        .rank-3 { background: rgba(205,127,50,0.2); color: #cd7f32; border: 1px solid #cd7f32; }

        footer { background: rgba(0,0,0,0.5); backdrop-filter: blur(16px); border-top: 1px solid var(--glass-border); padding: 1.25rem 3rem; display: flex; align-items: center; justify-content: space-between; }
        @media(max-width: 1024px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 600px) { .page { padding: 5.5rem 1.25rem 2rem; } .stats-row { grid-template-columns: 1fr 1fr; } }
    `;

    return (
        <div className="user-spending-body">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            <div className="bg-layer"></div>

            <div className="alert-stack">
                {alerts.success && <div className="alert alert-success"><i className="fas fa-check-circle"></i>{alerts.success}</div>}
                {alerts.failure && <div className="alert alert-danger"><i className="fas fa-exclamation-circle"></i>{alerts.failure}</div>}
            </div>

            <nav className={isScrolled ? 'scrolled' : ''}>
                <a href="/admin/home" className="nav-brand"><i className="fas fa-shopping-cart"></i> Ek<span>art</span></a>
                <div className="nav-links">
                    <a href="/admin/home" className="nav-link"><i className="fas fa-home"></i> Home</a>
                    <a href="/user-spending" className="nav-link active"><i className="fas fa-wallet"></i> Spending</a>
                    <a href="/admin/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div>
                        <h1>User <span>Spending</span> 💰</h1>
                        <p>Track how much each customer has spent on the platform — sorted by highest spender.</p>
                    </div>
                    <div style={{fontSize: '2.5rem'}}>📊</div>
                </div>

                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-card-value">₹{platformTotal.toLocaleString('en-IN')}</div>
                        <div className="stat-card-label">Total Platform Revenue</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-value">{totalCustomers}</div>
                        <div className="stat-card-label">Total Customers</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-value">{activeCustomers}</div>
                        <div className="stat-card-label">Active Customers</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-value">₹{avgSpendPerCustomer.toLocaleString('en-IN')}</div>
                        <div className="stat-card-label">Avg Spend per Customer</div>
                    </div>
                </div>

                <div className="search-bar">
                    <div style={{position: 'relative', flex: 1}}>
                        <i className="fas fa-search" style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)'}}></i>
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Search by name or email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    <table className="spending-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Customer</th>
                                <th>Email</th>
                                <th>Orders</th>
                                <th>Total Spent</th>
                                <th>Avg Order Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, idx) => (
                                <tr key={row.email}>
                                    <td>
                                        <span className={`rank ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : ''}`}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td style={{fontWeight: 500}}>{row.name}</td>
                                    <td style={{fontSize: '0.8rem', color: 'var(--text-dim)'}}>{row.email}</td>
                                    <td>
                                        <span style={{background: 'rgba(245,168,0,0.12)', border: '1px solid rgba(245,168,0,0.25)', padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.72rem', color: 'var(--yellow)', fontWeight: 600}}>
                                            {row.orderCount} orders
                                        </span>
                                    </td>
                                    <td style={{fontWeight: 700, color: row.totalSpent >= 1000 ? '#22c55e' : 'var(--yellow)'}}>
                                        ₹{row.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{color: 'var(--text-dim)', fontSize: '0.85rem'}}>
                                        {row.avgOrder > 0 ? `₹${row.avgOrder.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && (
                        <div className="empty-state">
                            <i className="fas fa-users"></i>
                            <p>No customers found</p>
                        </div>
                    )}
                </div>
            </main>

            <footer>
                <div style={{fontWeight: 700}}>Ek<span>art</span></div>
                <div style={{fontSize: '0.72rem', color: 'var(--text-dim)'}}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}