import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - User Oversight Dashboard Component
 * Matches admin-accounts.html design and backend API exactly.
 */
export default function AdminAccounts({ 
    initialAccounts = [], 
    stats = { totalAccounts: 0, activeAccounts: 0, suspendedAccounts: 0 } 
}) {
    // --- STATE ---
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [accounts, setAccounts] = useState(initialAccounts);
    
    // UI Modals
    const [profileModal, setProfileModal] = useState({ active: false, id: null, data: null, loading: false });
    const [deleteModal, setDeleteModal] = useState({ active: false, id: null, name: '' });
    const [alerts, setAlerts] = useState({ success: null, danger: null });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- API HANDLERS ---

    const showAlert = (type, message) => {
        setAlerts({ [type]: message });
        setTimeout(() => setAlerts({ success: null, danger: null }), 5000);
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        try {
            const url = query ? `/api/admin/accounts?search=${encodeURIComponent(query)}` : '/api/admin/accounts';
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) setAccounts(data.accounts);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const viewProfile = async (id) => {
        setProfileModal({ active: true, id, data: null, loading: true });
        try {
            const response = await fetch(`/api/admin/accounts/${id}/profile`);
            const profile = await response.json();
            setProfileModal(prev => ({ ...prev, data: profile, loading: false }));
        } catch (error) {
            showAlert('danger', 'Failed to load profile');
            setProfileModal(prev => ({ ...prev, active: false }));
        }
    };

    const toggleStatus = async (id, activate) => {
        const action = activate ? 'activate' : 'deactivate';
        if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;

        try {
            const response = await fetch(`/api/admin/accounts/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: activate })
            });
            const data = await response.json();
            if (data.success) {
                showAlert('success', data.message);
                handleSearch(searchQuery);
                if (profileModal.active) setProfileModal(prev => ({ ...prev, active: false }));
            } else {
                showAlert('danger', data.message);
            }
        } catch (error) {
            showAlert('danger', 'Failed to update account status');
        }
    };

    const executeDelete = async () => {
        try {
            const res = await fetch(`/api/admin/accounts/${deleteModal.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setAccounts(prev => prev.filter(acc => acc.id !== deleteModal.id));
                showAlert('success', data.message || 'Account deleted successfully');
                setDeleteModal({ active: false, id: null, name: '' });
            } else {
                showAlert('danger', data.message || 'Could not delete account');
            }
        } catch (e) {
            showAlert('danger', 'Error deleting account');
        }
    };

    const handleLogout = (e) => {
        e.preventDefault();
        logout();
        navigate('/admin/logout');
    };

    const CSS = `
        :root {
            --yellow: #f5a800; --yellow-d: #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --glass-nav: rgba(0, 0, 0, 0.25);
            --text-white: #ffffff; --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
            --green: #22c55e; --red: #ef4444; --blue: #3b82f6;
        }
        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: ''; position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
        }
        .bg-layer::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.85) 0%, rgba(8,12,28,0.80) 40%, rgba(5,8,20,0.90) 100%);
        }
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px); border-bottom: 1px solid var(--glass-border);
        }
        .nav-brand { font-size: 1.6rem; font-weight: 700; color: white; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-link {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px; transition: all 0.2s;
        }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); border-color: rgba(245,168,0,0.4); }
        .page { flex: 1; padding: 7rem 3rem 3rem; display: flex; flex-direction: column; gap: 2rem; }
        .stats-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .stat-card {
            background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
            border-radius: 16px; padding: 1.5rem 2rem; flex: 1; min-width: 200px; display: flex; align-items: center; gap: 1rem;
        }
        .stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
        .stat-icon.total { background: rgba(245,168,0,0.15); color: var(--yellow); }
        .stat-icon.active { background: rgba(34,197,94,0.15); color: var(--green); }
        .stat-icon.suspended { background: rgba(239,68,68,0.15); color: var(--red); }
        .search-box {
            display: flex; align-items: center; gap: 0.75rem; background: var(--glass-card);
            backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.75rem 1.25rem;
        }
        .accounts-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .accounts-table th, .accounts-table td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .status-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.6rem; border-radius: 50px; font-size: 0.7rem; font-weight: 600; }
        .status-badge.active { background: rgba(34,197,94,0.15); color: var(--green); }
        .status-badge.suspended { background: rgba(239,68,68,0.15); color: var(--red); }
        .btn-action { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; transition: 0.2s; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; }
        .btn-view { background: rgba(59,130,246,0.15); color: var(--blue); }
        .btn-delete { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .modal-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .modal { background: linear-gradient(135deg, rgba(20,24,50,0.95), rgba(15,18,40,0.98)); border: 1px solid var(--glass-border); border-radius: 20px; width: 100%; max-width: 700px; max-height: 85vh; overflow-y: auto; }
    `;

    return (
        <div style={{ fontFamily: 'Poppins, sans-serif', color: 'white', minHeight: '100vh' }}>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            <nav>
                <Link to="/admin/home" className="nav-brand"><i className="fas fa-shopping-cart" style={{color:'var(--yellow)'}}></i> Ekart</Link>
                <div className="nav-right">
                    <div className="nav-links">
                        <Link to="/admin/home" className="nav-link">Dashboard</Link>
                        <Link to="/approve-products" className="nav-link">Approvals</Link>
                        <Link to="/admin/refunds" className="nav-link">Refunds</Link>
                        <Link to="/admin/accounts" className="nav-link active">Users</Link>
                    </div>
                    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '50px', background: 'rgba(245,168,0,0.15)', color: 'var(--yellow)', fontSize: '0.72rem', fontWeight: 700 }}>Admin</span>
                    <a href="/admin/logout" onClick={handleLogout} className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon total"><i className="fas fa-users"></i></div>
                        <div><h3>{stats.totalAccounts}</h3><p>Total Accounts</p></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon active"><i className="fas fa-user-check"></i></div>
                        <div><h3>{stats.activeAccounts}</h3><p>Active Accounts</p></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon suspended"><i className="fas fa-user-slash"></i></div>
                        <div><h3>{stats.suspendedAccounts}</h3><p>Suspended Accounts</p></div>
                    </div>
                </div>

                <div className="search-box">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none' }} />
                </div>

                <div style={{ background: 'var(--glass-card)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--glass-border)' }}>
                    <table className="accounts-table">
                        <thead>
                            <tr><th>User</th><th>Role</th><th>Status</th><th>Total Orders</th><th>Last Login</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {accounts.map(account => (
                                <tr key={account.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(245,168,0,0.15)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'var(--yellow)', fontWeight: 600 }}>{account.name.charAt(0).toUpperCase()}</div>
                                            <div><div style={{ fontWeight: 500 }}>{account.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{account.email}</div></div>
                                        </div>
                                    </td>
                                    <td><span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: 'var(--blue)' }}>{account.role}</span></td>
                                    <td>
                                        <span className={`status-badge ${account.isActive ? 'active' : 'suspended'}`}>
                                            <i className={`fas fa-${account.isActive ? 'circle' : 'ban'}`} style={{ fontSize: '0.5rem' }}></i> {account.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td>{account.totalOrders}</td>
                                    <td style={{ color: account.lastLogin ? 'white' : 'var(--text-dim)' }}>{account.lastLogin || 'Never'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-action btn-view" onClick={() => viewProfile(account.id)}><i className="fas fa-eye"></i></button>
                                            <button className={`btn-action ${account.isActive ? 'btn-deactivate' : 'btn-activate'}`} onClick={() => toggleStatus(account.id, !account.isActive)} style={{ background: account.isActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: account.isActive ? 'var(--red)' : 'var(--green)' }}>
                                                <i className={`fas fa-user-${account.isActive ? 'slash' : 'check'}`}></i>
                                            </button>
                                            <button className="btn-action btn-delete" onClick={() => setDeleteModal({ active: true, id: account.id, name: account.name })}><i className="fas fa-trash-alt"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Profile Modal */}
            {profileModal.active && (
                <div className="modal-overlay" onClick={() => setProfileModal(p => ({...p, active: false}))}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                            <h3><i className="fas fa-user-circle"></i> User Profile</h3>
                            <button onClick={() => setProfileModal(p => ({...p, active: false}))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
                        </div>
                        <div style={{ padding: '2rem' }}>
                            {profileModal.loading ? <div style={{ textAlign: 'center' }}>Loading...</div> : profileModal.data && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245,168,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--yellow)', fontWeight: 700 }}>{profileModal.data.name.charAt(0)}</div>
                                        <div><h4 style={{ fontSize: '1.25rem' }}>{profileModal.data.name}</h4><p style={{ color: 'var(--text-dim)' }}>{profileModal.data.email}</p></div>
                                    </div>
                                    {/* Additional profile sections like spending summary, orders, etc can be mapped here */}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal.active && (
                <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.75)' }}>
                    <div style={{ background: '#1a1208', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '20px', padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem' }}>⚠️</div>
                        <h2 style={{ color: '#ef4444' }}>Delete Account?</h2>
                        <p>Permanently delete <strong>{deleteModal.name}</strong>?</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button onClick={() => setDeleteModal({ active: false, id: null, name: '' })} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'none', border: '1px solid #444', color: 'white' }}>Cancel</button>
                            <button onClick={executeDelete} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: 'white', fontWeight: 600 }}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}