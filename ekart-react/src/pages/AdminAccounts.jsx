import React, { useState, useEffect, useCallback } from 'react';

/**
 * Ekart - User Oversight Dashboard Component
 * * @param {Object} props
 * @param {Array} props.accounts - List of user accounts
 * @param {Object} props.stats - Account statistics
 */
export default function AdminAccounts({ 
    accounts = [], 
    stats = { totalAccounts: 0, activeAccounts: 0, suspendedAccounts: 0 } 
}) {
    // --- STATE ---
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [profileModal, setProfileModal] = useState({ active: false, id: null, data: null, loading: false });
    const [deleteModal, setDeleteModal] = useState({ active: false, id: null, name: '' });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- LOGIC ---
    const closeProfileModal = () => setProfileModal({ active: false, id: null, data: null, loading: false });
    const closeDeleteModal = () => setDeleteModal({ active: false, id: null, name: '' });

    const CSS = `
        :root {
            --yellow: #f5a800;
            --glass-border: rgba(255, 255, 255, 0.1);
            --glass-card: rgba(255, 255, 255, 0.08);
            --glass-nav: rgba(15, 15, 25, 0.8);
            --text-white: #ffffff;
            --text-dim: rgba(255, 255, 255, 0.5);
            --green: #22c55e;
            --red: #ef4444;
            --blue: #3b82f6;
        }

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: '';
            position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(8px); transform: scale(1.1);
        }
        .bg-layer::after {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(10, 10, 20, 0.85) 0%, rgba(15, 15, 30, 0.9) 100%);
        }

        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 0.8rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
        }
        .nav-brand { font-size: 1.6rem; font-weight: 800; color: white; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-brand span { color: var(--yellow); }
        
        .nav-links { display: flex; align-items: center; gap: 0.5rem; }
        .nav-link { 
            display: flex; align-items: center; gap: 0.4rem; color: rgba(255,255,255,0.7); 
            text-decoration: none; font-size: 0.85rem; font-weight: 500; padding: 0.5rem 1rem; border-radius: 8px;
        }
        .nav-link.active { background: rgba(245, 168, 0, 0.15); color: var(--yellow); }

        .admin-badge {
            background: rgba(245, 168, 0, 0.1); border: 1px solid rgba(245, 168, 0, 0.3);
            color: var(--yellow); padding: 0.4rem 1rem; border-radius: 10px; font-size: 0.75rem; font-weight: 700;
            display: flex; align-items: center; gap: 0.4rem; margin: 0 1rem;
        }

        .btn-logout { 
            background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border);
            color: white; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; text-decoration: none;
        }

        .page { padding: 6rem 4rem 4rem; max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }

        /* Stats Section */
        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .stat-card {
            background: var(--glass-card); backdrop-filter: blur(30px);
            border: 1px solid var(--glass-border); border-radius: 24px;
            padding: 2.5rem; display: flex; align-items: center; gap: 1.5rem;
        }
        .stat-icon {
            width: 54px; height: 54px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
        }
        .stat-icon.total { background: rgba(245, 168, 0, 0.1); color: var(--yellow); }
        .stat-icon.active { background: rgba(34, 197, 94, 0.1); color: var(--green); }
        .stat-icon.suspended { background: rgba(239, 68, 68, 0.1); color: var(--red); }
        .stat-val { font-size: 2.2rem; font-weight: 800; line-height: 1; margin-bottom: 0.2rem; color: white; }
        .stat-label { font-size: 0.85rem; color: var(--text-dim); font-weight: 500; }

        /* Search Section */
        .search-box {
            background: var(--glass-card); backdrop-filter: blur(30px);
            border: 1px solid var(--glass-border); border-radius: 16px;
            padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem;
        }
        .search-box input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 0.95rem; }
        .search-box input::placeholder { color: var(--text-dim); }

        /* Table Section */
        .table-container {
            background: var(--glass-card); backdrop-filter: blur(30px);
            border: 1px solid var(--glass-border); border-radius: 24px;
            padding: 2rem;
        }
        .table-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.7rem; color: white; }
        .table-title i { color: var(--yellow); }

        .accounts-table { width: 100%; border-collapse: collapse; }
        .accounts-table th { 
            text-align: left; font-size: 0.75rem; font-weight: 700; color: var(--text-dim); 
            text-transform: uppercase; letter-spacing: 0.1em; padding: 0 1rem 1.5rem;
        }
        .accounts-table td { padding: 1.2rem 1rem; border-top: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }

        .user-info { display: flex; align-items: center; gap: 1rem; }
        .user-avatar { width: 42px; height: 42px; border-radius: 50%; background: rgba(245,168,0,0.15); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--yellow); }
        .user-details h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.1rem; color: white; }
        .user-details p { font-size: 0.75rem; color: var(--text-dim); }

        .role-badge { 
            background: rgba(59, 130, 246, 0.1); color: var(--blue); border: 1px solid rgba(59,130,246,0.2);
            padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
        }
        .status-badge { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 700; }
        .status-badge.active { color: var(--green); }
        .status-badge i { font-size: 0.4rem; }

        .actions-cell { display: flex; gap: 0.6rem; justify-content: flex-end; }
        .btn-action {
            width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center; font-size: 0.85rem; transition: all 0.2s;
        }
        .btn-action.view { background: rgba(59,130,246,0.15); color: var(--blue); }
        .btn-action.ban { background: rgba(239, 68, 68, 0.15); color: var(--red); }
        .btn-action.key { background: rgba(245, 168, 0, 0.15); color: var(--yellow); }
        .btn-action.del { background: rgba(239, 68, 68, 0.15); color: var(--red); border: 1px solid rgba(239, 68, 68, 0.2); }
    `;

    return (
        <div style={{ fontFamily: "'Poppins', sans-serif", color: 'white', minHeight: '100vh' }}>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* Navbar */}
            <nav>
                <a href="/admin/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ color: 'var(--yellow)' }}></i> E<span>kart</span>
                </a>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="nav-links">
                        <a href="/admin/home" className="nav-link"><i className="fas fa-home"></i> Dashboard</a>
                        <a href="/approve-products" className="nav-link"><i className="fas fa-tasks"></i> Approvals</a>
                        <a href="/admin/refunds" className="nav-link"><i className="fas fa-undo-alt"></i> Refunds</a>
                        <a href="/admin/accounts" className="nav-link active"><i className="fas fa-users"></i> Users</a>
                    </div>
                    <div className="admin-badge"><i className="fas fa-shield-alt"></i> Admin</div>
                    <a href="/admin/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <div className="page">
                {/* Statistics */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon total"><i className="fas fa-users"></i></div>
                        <div>
                            <div className="stat-val">{stats.totalAccounts}</div>
                            <div className="stat-label">Total Accounts</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon active"><i className="fas fa-user-check"></i></div>
                        <div>
                            <div className="stat-val">{stats.activeAccounts}</div>
                            <div className="stat-label">Active Accounts</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon suspended"><i className="fas fa-user-slash"></i></div>
                        <div>
                            <div className="stat-val">{stats.suspendedAccounts}</div>
                            <div className="stat-label">Suspended Accounts</div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="search-box">
                    <i className="fas fa-search" style={{ color: 'var(--text-dim)' }}></i>
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Users Table */}
                <div className="table-container">
                    <div className="table-title">
                        <i className="fas fa-users-cog"></i> User Accounts
                    </div>
                    <table className="accounts-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Total Orders</th>
                                <th>Last Login</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map((account) => (
                                <tr key={account.id}>
                                    <td>
                                        <div className="user-info">
                                            <div className="user-avatar">{(account.name || '?').charAt(0).toUpperCase()}</div>
                                            <div className="user-details">
                                                <h4>{account.name}</h4>
                                                <p>{account.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="role-badge">{account.role}</span></td>
                                    <td>
                                        <div className="status-badge active">
                                            <i className="fas fa-circle"></i> Active
                                        </div>
                                    </td>
                                    <td>{account.totalOrders}</td>
                                    <td style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                                        {account.lastLogin ? account.lastLogin : 'Never'}
                                    </td>
                                    <td className="actions-cell">
                                        <button className="btn-action view"><i className="fas fa-eye"></i></button>
                                        <button className="btn-action ban"><i className="fas fa-user-slash"></i></button>
                                        <button className="btn-action key"><i className="fas fa-key"></i></button>
                                        <button className="btn-action del"><i className="fas fa-trash-alt"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}