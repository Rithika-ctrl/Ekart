import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom'; 
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
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/admin/login'); };
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

    const CSS = `:root {
            --yellow: #f5a800;
            --yellow-d: #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --glass-nav: rgba(0, 0, 0, 0.25);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
            --green: #22c55e;
            --red: #ef4444;
            --blue: #3b82f6;
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
            background: linear-gradient(180deg, rgba(5,8,20,0.85) 0%, rgba(8,12,28,0.80) 40%, rgba(5,8,20,0.90) 100%);
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
        .nav-brand span { color: var(--yellow); }
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
        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
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
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        /* ── PAGE ── */
        .page { flex: 1; padding: 7rem 3rem 3rem; display: flex; flex-direction: column; gap: 2rem; }

        /* ── STATS CARDS ── */
        .stats-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .stat-card {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 16px;
            padding: 1.5rem 2rem; flex: 1; min-width: 200px;
            display: flex; align-items: center; gap: 1rem;
        }
        .stat-icon {
            width: 50px; height: 50px;
            border-radius: 12px; display: flex; align-items: center; justify-content: center;
            font-size: 1.3rem;
        }
        .stat-icon.total { background: rgba(245,168,0,0.15); color: var(--yellow); }
        .stat-icon.active { background: rgba(34,197,94,0.15); color: var(--green); }
        .stat-icon.suspended { background: rgba(239,68,68,0.15); color: var(--red); }
        .stat-info h3 { font-size: 1.75rem; font-weight: 700; }
        .stat-info p { font-size: 0.8rem; color: var(--text-dim); }

        /* ── SEARCH BAR ── */
        .search-section { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .search-box {
            flex: 1; min-width: 300px;
            display: flex; align-items: center; gap: 0.75rem;
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 12px;
            padding: 0.75rem 1.25rem;
        }
        .search-box i { color: var(--text-dim); }
        .search-box input {
            flex: 1; background: none; border: none; outline: none;
            color: var(--text-white); font-size: 0.9rem;
        }
        .search-box input::placeholder { color: var(--text-dim); }

        /* ── TABLE CARD ── */
        .table-card {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 20px;
            padding: 1.5rem; overflow: hidden;
        }
        .table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .table-header h2 { font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .table-header h2 i { color: var(--yellow); }

        .accounts-table { width: 100%; border-collapse: collapse; }
        .accounts-table th, .accounts-table td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .accounts-table th { font-size: 0.75rem; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
        .accounts-table td { font-size: 0.85rem; }
        .accounts-table tr:hover { background: rgba(245,168,0,0.05); }

        .user-cell { display: flex; align-items: center; gap: 0.75rem; }
        .user-avatar {
            width: 36px; height: 36px;
            background: rgba(245,168,0,0.15); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: var(--yellow); font-weight: 600;
        }
        .user-info { display: flex; flex-direction: column; }
        .user-name { font-weight: 500; }
        .user-email { font-size: 0.75rem; color: var(--text-dim); }

        .status-badge {
            display: inline-flex; align-items: center; gap: 0.3rem;
            padding: 0.25rem 0.6rem; border-radius: 50px;
            font-size: 0.7rem; font-weight: 600;
        }
        .status-badge.active { background: rgba(34,197,94,0.15); color: var(--green); }
        .status-badge.suspended { background: rgba(239,68,68,0.15); color: var(--red); }
        .status-badge.unverified { background: rgba(245,168,0,0.15); color: var(--yellow); }

        .role-badge {
            display: inline-flex; padding: 0.2rem 0.5rem; border-radius: 4px;
            font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
            background: rgba(59,130,246,0.15); color: var(--blue);
        }

        .actions-cell { display: flex; gap: 0.5rem; }
        .btn-action {
            display: flex; align-items: center; justify-content: center;
            width: 32px; height: 32px; border-radius: 8px;
            border: none; cursor: pointer; transition: all 0.2s;
            font-size: 0.8rem;
        }
        .btn-view { background: rgba(59,130,246,0.15); color: var(--blue); }
        .btn-view:hover { background: rgba(59,130,246,0.3); }
        .btn-activate { background: rgba(34,197,94,0.15); color: var(--green); }
        .btn-activate:hover { background: rgba(34,197,94,0.3); }
        .btn-deactivate { background: rgba(239,68,68,0.15); color: var(--red); }
        .btn-deactivate:hover { background: rgba(239,68,68,0.3); }
        .btn-reset { background: rgba(245,168,0,0.15); color: var(--yellow); }
        .btn-reset:hover { background: rgba(245,168,0,0.3); }
        .btn-delete { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .btn-delete:hover { background: rgba(239,68,68,0.25); }

        .no-data { text-align: center; padding: 3rem; color: var(--text-dim); }
        .no-data i { font-size: 2.5rem; margin-bottom: 1rem; display: block; opacity: 0.5; }

        /* ── MODAL ── */
        .modal-overlay {
            position: fixed; inset: 0; z-index: 300;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
            display: none; align-items: center; justify-content: center;
            padding: 2rem;
        }
        .modal-overlay.active { display: flex; }
        .modal {
            background: linear-gradient(135deg, rgba(20,24,50,0.95), rgba(15,18,40,0.98));
            border: 1px solid var(--glass-border); border-radius: 20px;
            width: 100%; max-width: 700px; max-height: 85vh;
            overflow-y: auto; animation: modalIn 0.3s ease both;
        }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .modal-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .modal-header h3 { font-size: 1.2rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .modal-header h3 i { color: var(--yellow); }
        .modal-close { background: none; border: none; color: var(--text-dim); font-size: 1.25rem; cursor: pointer; }
        .modal-#root { padding: 1.5rem 2rem; }

        /* ── PROFILE SECTIONS ── */
        .profile-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .profile-avatar {
            width: 64px; height: 64px;
            background: rgba(245,168,0,0.15); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; color: var(--yellow); font-weight: 700;
        }
        .profile-title h4 { font-size: 1.25rem; font-weight: 600; }
        .profile-title p { font-size: 0.85rem; color: var(--text-dim); }

        .profile-section { margin-bottom: 1.5rem; }
        .profile-section h5 { font-size: 0.85rem; font-weight: 600; color: var(--yellow); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .profile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
        .profile-item { background: rgba(255,255,255,0.05); padding: 0.75rem 1rem; border-radius: 8px; }
        .profile-item label { font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; display: block; margin-bottom: 0.25rem; }
        .profile-item span { font-size: 0.9rem; font-weight: 500; }

        .orders-list, .wishlist-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; }
        .order-item, .wishlist-item {
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(255,255,255,0.05); padding: 0.75rem 1rem; border-radius: 8px;
        }
        .order-item span, .wishlist-item span { font-size: 0.85rem; }
        .order-item .amount { color: var(--yellow); font-weight: 600; }

        .modal-actions { display: flex; gap: 0.75rem; padding: 1.5rem 2rem; border-top: 1px solid rgba(255,255,255,0.1); }
        .btn-modal {
            flex: 1; padding: 0.85rem 1.5rem; border-radius: 10px;
            font-size: 0.85rem; font-weight: 600; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            transition: all 0.2s; border: none;
        }
        .btn-modal.primary { background: var(--yellow); color: #000; }
        .btn-modal.primary:hover { background: var(--yellow-d); }
        .btn-modal.danger { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
        .btn-modal.danger:hover { background: rgba(239,68,68,0.25); }
        .btn-modal.secondary { background: rgba(255,255,255,0.1); color: var(--text-light); }
        .btn-modal.secondary:hover { background: rgba(255,255,255,0.15); }

        /* ── LOADING ── */
        .loading { display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .spinner { width: 32px; height: 32px; border: 3px solid rgba(245,168,0,0.2); border-top-color: var(--yellow); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }`;

    return (
        <div style={{ fontFamily: "'Poppins', sans-serif", color: 'white', minHeight: '100vh' }}>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* Navbar */}
            <nav>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ color: 'var(--yellow)' }}></i> E<span>kart</span>
                </a>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="nav-links">
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link"><i className="fas fa-home"></i> Dashboard</a>
                        <Link to="/admin/products" className="nav-link"><i className="fas fa-tasks"></i> Approvals</Link>
                        <Link to="/admin/refunds" className="nav-link"><i className="fas fa-undo-alt"></i> Refunds</Link>
                        <Link to="/admin/accounts" className="nav-link active"><i className="fas fa-users"></i> Users</Link>
                    </div>
                    <div className="admin-badge"><i className="fas fa-shield-alt"></i> Admin</div>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
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