import React, { useState, useEffect, useRef } from 'react';

/**
 * AdminSecurity Component
 * * @param {Object} props
 * @param {Array} props.users - List of user objects: [{id, name, email, provider, role}]
 * @param {Array} props.roles - List of available role objects/strings
 * @param {number} props.totalUsers - Count of all registered users
 * @param {number} props.adminCount - Count of users with ADMIN role
 * @param {number} props.orderManagerCount - Count of users with ORDER_MANAGER role
 * @param {number} props.customerCount - Count of users with CUSTOMER role
 * @param {Object} props.session - Session messages: {success: string, failure: string}
 * @param {string} props.csrfToken - Spring Security CSRF token
 */
export default function AdminSecurity({
    users = [],
    roles = [],
    totalUsers = 0,
    adminCount = 0,
    orderManagerCount = 0,
    customerCount = 0,
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingChange, setPendingChange] = useState(null);
    const [isModalActive, setIsModalActive] = useState(false);
    const [alerts, setAlerts] = useState({ 
        success: session.success, 
        failure: session.failure 
    });

    const roleFormRef = useRef(null);

    // --- EFFECTS ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 3000);
        return () => clearTimeout(timer);
    }, [session]);

    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // --- LOGIC ---
    const filteredUsers = users.filter(user => {
        const name = (user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    });

    const confirmRoleChange = (e, user) => {
        const newRole = e.target.value;
        if (user.role === newRole) return;
        setPendingChange({ ...user, newRole });
        setIsModalActive(true);
    };

    const closeModal = () => {
        setIsModalActive(false);
        setPendingChange(null);
    };

    const submitRoleChange = () => {
        if (pendingChange && roleFormRef.current) {
            roleFormRef.current.action = `/admin/security/update-role/${pendingChange.id}`;
            roleFormRef.current.submit();
        }
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

        .admin-security-container { font-family: 'Poppins', sans-serif; color: var(--text-white); min-height: 100vh; }
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
            background: var(--glass-nav); backdrop-filter: blur(14px); border-bottom: 1px solid var(--glass-border);
        }
        .nav-brand { font-size: 1.6rem; font-weight: 700; color: white; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-link { color: var(--text-light); text-decoration: none; font-size: 0.82rem; padding: 0.45rem 0.9rem; border-radius: 6px; transition: 0.2s; }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); border: 1px solid rgba(245,168,0,0.4); }

        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert { padding: 0.875rem 1.25rem; background: rgba(10,12,30,0.88); backdrop-filter: blur(16px); border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.6rem; min-width: 260px; }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger { border-color: rgba(255,100,80,0.45); color: #ff8060; }

        .page { flex: 1; padding: 7rem 3rem 3rem; display: flex; flex-direction: column; gap: 2rem; }
        .page-header { display: flex; align-items: center; justify-content: space-between; background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem 2.5rem; }
        
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
        .stat-card { background: var(--glass-card); border: 1px solid var(--glass-border); border-radius: 16px; padding: 1.5rem; text-align: center; backdrop-filter: blur(18px); }
        .stat-card-icon { width: 48px; height: 48px; margin: 0 auto 0.75rem; background: rgba(245,168,0,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--yellow); }
        .stat-card-icon.admin { color: #8b5cf6; background: rgba(139,92,246,0.15); }
        .stat-card-icon.manager { color: #3b82f6; background: rgba(59,130,246,0.15); }
        .stat-card-icon.customer { color: #22c55e; background: rgba(34,197,94,0.15); }

        .section-card { background: var(--glass-card); border: 1px solid var(--glass-border); border-radius: 16px; padding: 2rem; backdrop-filter: blur(18px); }
        .search-input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); border-radius: 8px; padding: 0.75rem 1rem 0.75rem 2.5rem; color: white; outline: none; }
        
        .user-table { width: 100%; border-collapse: collapse; }
        .user-table th { text-align: left; padding: 1rem; color: var(--text-dim); font-size: 0.7rem; text-transform: uppercase; }
        .user-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.9rem; }
        
        .role-badge { padding: 0.35rem 0.8rem; border-radius: 50px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; border: 1px solid; }
        .role-badge.admin { background: rgba(139,92,246,0.15); color: #8b5cf6; border-color: rgba(139,92,246,0.3); }
        .role-badge.order_manager { background: rgba(59,130,246,0.15); color: #3b82f6; border-color: rgba(59,130,246,0.3); }
        .role-badge.customer { background: rgba(34,197,94,0.15); color: #22c55e; border-color: rgba(34,197,94,0.3); }

        .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center; }
        .modal-overlay.active { display: flex; }
        .modal { background: rgba(20,20,40,0.95); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem; max-width: 450px; width: 90%; text-align: center; }
        .modal-btn { flex: 1; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600; border: none; transition: 0.2s; }
        .modal-btn.cancel { background: rgba(255,255,255,0.1); color: white; }
        .modal-btn.confirm { background: var(--yellow); color: #1a1000; }
        .modal-btn.confirm.danger { background: #ff5050; color: white; }

        .permissions-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
        .permission-card { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.25rem; }
        .route-tag { display: inline-block; font-size: 0.65rem; background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; margin: 0.15rem; color: var(--text-light); border: 1px solid rgba(255,255,255,0.1); }
    `;

    return (
        <div className="admin-security-container">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button style={{marginLeft:'auto', background:'none', border:'none', color:'inherit'}} onClick={() => setAlerts({...alerts, success: null})}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button style={{marginLeft:'auto', background:'none', border:'none', color:'inherit'}} onClick={() => setAlerts({...alerts, failure: null})}>×</button>
                    </div>
                )}
            </div>

            {/* NAVIGATION */}
            <nav>
                <a href="/admin/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize: '1.1rem'}}></i> Ekart
                </a>
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                    <div className="nav-links">
                        <a href="/admin/home" className="nav-link">Dashboard</a>
                        <a href="/approve-products" className="nav-link">Approvals</a>
                        <a href="/admin/search-users" className="nav-link">Users</a>
                        <a href="/admin/security" className="nav-link active">RBAC</a>
                    </div>
                    <div style={{width:'1px', height:'24px', background:'rgba(255,255,255,0.15)'}}></div>
                    <span style={{padding:'0.3rem 0.8rem', borderRadius:'50px', background:'rgba(245,168,0,0.15)', border:'1px solid rgba(245,168,0,0.3)', color:'var(--yellow)', fontSize:'0.72rem', fontWeight:700}}>
                        <i className="fas fa-shield-alt"></i> Admin
                    </span>
                    <a href="/admin/logout" className="nav-link" style={{border: '1px solid rgba(255,100,80,0.3)', color: '#ff8060'}}>Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div>
                        <h1><span style={{color:'var(--yellow)'}}>Role-Based</span> Access Control</h1>
                        <p style={{color:'var(--text-dim)', fontSize:'0.9rem'}}>Manage user roles and permissions across the platform.</p>
                    </div>
                    <i className="fas fa-user-shield" style={{fontSize: '2.5rem', color: 'var(--yellow)'}}></i>
                </div>

                {/* STATS */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-card-icon"><i className="fas fa-users"></i></div>
                        <div style={{fontSize:'1.75rem', fontWeight:700}}>{totalUsers}</div>
                        <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>TOTAL USERS</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon admin"><i className="fas fa-crown"></i></div>
                        <div style={{fontSize:'1.75rem', fontWeight:700}}>{adminCount}</div>
                        <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>ADMINS</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon manager"><i className="fas fa-clipboard-list"></i></div>
                        <div style={{fontSize:'1.75rem', fontWeight:700}}>{orderManagerCount}</div>
                        <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>MANAGERS</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon customer"><i className="fas fa-user"></i></div>
                        <div style={{fontSize:'1.75rem', fontWeight:700}}>{customerCount}</div>
                        <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>CUSTOMERS</div>
                    </div>
                </div>

                {/* PERMISSIONS MATRIX */}
                <div className="section-card">
                    <h2><i className="fas fa-key" style={{color:'var(--yellow)'}}></i> Role Permissions Matrix</h2>
                    <div className="permissions-grid">
                        <div className="permission-card">
                            <h4 style={{marginBottom:'0.5rem'}}>ADMIN</h4>
                            <p style={{fontSize:'0.7rem', color:'var(--text-dim)', marginBottom:'1rem'}}>Full System Access</p>
                            <div className="route-tag">/admin/*</div>
                            <div className="route-tag">/admin/security</div>
                        </div>
                        <div className="permission-card">
                            <h4 style={{marginBottom:'0.5rem'}}>ORDER_MANAGER</h4>
                            <p style={{fontSize:'0.7rem', color:'var(--text-dim)', marginBottom:'1rem'}}>Order Operations</p>
                            <div className="route-tag">/orders/*</div>
                            <div className="route-tag">/track-order/*</div>
                        </div>
                        <div className="permission-card">
                            <h4 style={{marginBottom:'0.5rem'}}>CUSTOMER</h4>
                            <p style={{fontSize:'0.7rem', color:'var(--text-dim)', marginBottom:'1rem'}}>Standard User</p>
                            <div className="route-tag">/customer/*</div>
                            <div className="route-tag">/cart</div>
                        </div>
                    </div>
                </div>

                {/* USER LIST */}
                <div className="section-card">
                    <h2><i className="fas fa-users-cog" style={{color:'var(--yellow)'}}></i> User Management</h2>
                    <div style={{position:'relative', marginBottom:'1.5rem'}}>
                        <i className="fas fa-search" style={{position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)'}}></i>
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Search by name or email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {users.length === 0 ? (
                        <div style={{textAlign:'center', padding:'4rem', color:'var(--text-dim)'}}>
                            <i className="fas fa-users" style={{fontSize:'3rem', marginBottom:'1rem', opacity:0.5}}></i>
                            <p>No users registered yet.</p>
                        </div>
                    ) : (
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td><div style={{fontWeight:500}}>{user.name || 'Unnamed User'}</div></td>
                                        <td><div style={{color:'var(--text-dim)'}}>{user.email}</div></td>
                                        <td>
                                            <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span>
                                        </td>
                                        <td>
                                            <select 
                                                style={{background:'rgba(0,0,0,0.3)', color:'white', border:'1px solid var(--glass-border)', padding:'0.5rem', borderRadius:'8px'}}
                                                value={user.role}
                                                onChange={(e) => confirmRoleChange(e, user)}
                                            >
                                                {roles.map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* MODAL */}
            <div className={`modal-overlay ${isModalActive ? 'active' : ''}`} onClick={(e) => e.target.id === 'modalOverlay' && closeModal()} id="modalOverlay">
                <div className="modal">
                    <div style={{fontSize:'2.5rem', marginBottom:'1rem', color: pendingChange?.newRole === 'ADMIN' ? '#8b5cf6' : '#ffc107'}}>
                        <i className={pendingChange?.newRole === 'ADMIN' ? "fas fa-crown" : "fas fa-exchange-alt"}></i>
                    </div>
                    <h3>{pendingChange?.newRole === 'ADMIN' ? 'Grant Admin Access?' : 'Confirm Role Change'}</h3>
                    <p style={{margin:'1rem 0', color:'var(--text-dim)', fontSize:'0.9rem'}}>
                        Update <span style={{color:'white', fontWeight:600}}>{pendingChange?.name}</span>'s role to 
                        <span style={{color:'var(--yellow)', fontWeight:600}}> {pendingChange?.newRole}</span>?
                    </p>
                    <div style={{display:'flex', gap:'1rem'}}>
                        <button className="modal-btn cancel" onClick={closeModal}>Cancel</button>
                        <button 
                            className={`modal-btn confirm ${pendingChange?.newRole === 'ADMIN' ? 'danger' : ''}`} 
                            onClick={submitRoleChange}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>

            {/* POST FORM */}
            <form ref={roleFormRef} method="post" style={{ display: 'none' }}>
                <input type="hidden" name="role" value={pendingChange?.newRole || ''} />
                {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
            </form>

            <footer style={{background:'rgba(0,0,0,0.5)', padding:'1.5rem 3rem', display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--glass-border)'}}>
                <div style={{fontWeight:700}}>Ekart</div>
                <div style={{fontSize:'0.72rem', color:'var(--text-dim)'}}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}