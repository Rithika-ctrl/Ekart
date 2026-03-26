import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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

    const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card:   rgba(255, 255, 255, 0.13);
            --glass-nav:    rgba(0, 0, 0, 0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
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

        /* ── STATS ROW ── */
        .stats-row {
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
        .stat-card-icon.admin { background: rgba(139,92,246,0.15); color: #8b5cf6; }
        .stat-card-icon.manager { background: rgba(59,130,246,0.15); color: #3b82f6; }
        .stat-card-icon.customer { background: rgba(34,197,94,0.15); color: #22c55e; }
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

        /* ── SECTION CARD ── */
        .section-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 2rem;
        }
        .section-card h2 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .section-card h2 i { color: var(--yellow); }

        /* ── SEARCH BAR ── */
        .search-bar {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .search-input {
            flex: 1;
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            padding-left: 2.5rem;
            font-size: 0.9rem;
            color: var(--text-white);
            font-family: inherit;
            transition: all 0.2s;
        }
        .search-input:focus {
            outline: none;
            border-color: var(--yellow);
            background: rgba(0,0,0,0.4);
        }
        .search-input::placeholder { color: var(--text-dim); }
        .search-wrapper {
            position: relative;
            flex: 1;
        }
        .search-wrapper i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-dim);
        }

        /* ── TABLE ── */
        .user-table {
            width: 100%;
            border-collapse: collapse;
        }
        .user-table th, .user-table td {
            text-align: left;
            padding: 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .user-table th {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .user-table td {
            font-size: 0.9rem;
            color: var(--text-light);
        }
        .user-table tr:last-child td { border-bottom: none; }
        .user-table tr:hover td { background: rgba(255,255,255,0.03); }

        .user-name {
            font-weight: 500;
            color: var(--text-white);
        }
        .user-email {
            font-size: 0.8rem;
            color: var(--text-dim);
        }
        .user-provider {
            font-size: 0.7rem;
            color: var(--text-dim);
            display: flex;
            align-items: center;
            gap: 0.3rem;
        }
        .user-provider i.fa-google { color: #ea4335; }
        .user-provider i.fa-github { color: #fff; }

        /* ── ROLE BADGE ── */
        .role-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 0.35rem 0.8rem;
            border-radius: 50px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .role-badge.admin {
            background: rgba(139,92,246,0.15);
            color: #8b5cf6;
            border: 1px solid rgba(139,92,246,0.3);
        }
        .role-badge.order_manager {
            background: rgba(59,130,246,0.15);
            color: #3b82f6;
            border: 1px solid rgba(59,130,246,0.3);
        }
        .role-badge.customer {
            background: rgba(34,197,94,0.15);
            color: #22c55e;
            border: 1px solid rgba(34,197,94,0.3);
        }

        /* ── ROLE SELECT ── */
        .role-select {
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
            color: var(--text-white);
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 150px;
        }
        .role-select:focus {
            outline: none;
            border-color: var(--yellow);
        }
        .role-select option {
            background: #1a1a2e;
            color: var(--text-white);
        }

        /* ── MODAL ── */
        .modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .modal-overlay.active { display: flex; }
        .modal {
            background: rgba(20,20,40,0.95);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem;
            max-width: 450px;
            width: 90%;
            animation: modalIn 0.3s ease;
        }
        @keyframes modalIn {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-icon {
            width: 60px; height: 60px;
            margin: 0 auto 1.5rem;
            background: rgba(255,193,7,0.15);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.75rem;
            color: #ffc107;
        }
        .modal-icon.danger {
            background: rgba(255,80,80,0.15);
            color: #ff5050;
        }
        .modal h3 {
            font-size: 1.25rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.75rem;
        }
        .modal p {
            font-size: 0.9rem;
            color: var(--text-dim);
            text-align: center;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .modal-highlight {
            color: var(--yellow);
            font-weight: 600;
        }
        .modal-btns {
            display: flex;
            gap: 1rem;
        }
        .modal-btn {
            flex: 1;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
        }
        .modal-btn.cancel {
            background: rgba(255,255,255,0.1);
            border: 1px solid var(--glass-border);
            color: var(--text-light);
        }
        .modal-btn.cancel:hover { background: rgba(255,255,255,0.15); }
        .modal-btn.confirm {
            background: var(--yellow);
            border: none;
            color: #1a1000;
        }
        .modal-btn.confirm:hover { background: var(--yellow-d); }
        .modal-btn.confirm.danger {
            background: #ff5050;
            color: white;
        }
        .modal-btn.confirm.danger:hover { background: #e04040; }

        /* ── EMPTY STATE ── */
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-dim);
        }
        .empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
        .empty-state p { font-size: 0.95rem; }

        /* ── PERMISSIONS MATRIX ── */
        .permissions-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.25rem;
        }
        .permission-card {
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 1.25rem;
        }
        .permission-card-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .permission-card-icon {
            width: 40px; height: 40px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem;
        }
        .permission-card-icon.admin { background: rgba(139,92,246,0.15); color: #8b5cf6; }
        .permission-card-icon.manager { background: rgba(59,130,246,0.15); color: #3b82f6; }
        .permission-card-icon.customer { background: rgba(34,197,94,0.15); color: #22c55e; }
        .permission-card-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--text-white);
        }
        .permission-card-subtitle {
            font-size: 0.7rem;
            color: var(--text-dim);
        }
        .permission-list {
            list-style: none;
        }
        .permission-list li {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8rem;
            color: var(--text-light);
            padding: 0.4rem 0;
        }
        .permission-list li i.fa-check { color: #22c55e; font-size: 0.7rem; }
        .permission-list li i.fa-times { color: #ff5050; font-size: 0.7rem; }
        .permission-list li i.fa-lock { color: var(--yellow); font-size: 0.7rem; }
        .access-routes {
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid rgba(255,255,255,0.08);
        }
        .access-routes-label {
            font-size: 0.65rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .route-tag {
            display: inline-block;
            font-size: 0.65rem;
            font-family: monospace;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            margin: 0.15rem;
            color: var(--text-light);
        }
        @media(max-width: 1024px) {
            .permissions-grid { grid-template-columns: 1fr; }
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
            .stats-row { grid-template-columns: repeat(2, 1fr); }
        }
        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .stats-row { grid-template-columns: 1fr 1fr; }
            .user-table { display: block; overflow-x: auto; }
            footer { flex-direction: column; text-align: center; gap: 0.5rem; }
        }`;

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
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize: '1.1rem'}}></i> Ekart
                </a>
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                    <div className="nav-links">
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link">Dashboard</a>
                        <Link to="/admin/products" className="nav-link">Approvals</Link>
                        <Link to="/admin/users" className="nav-link">Users</Link>
                        <Link to="/admin/security" className="nav-link active">RBAC</Link>
                    </div>
                    <div style={{width:'1px', height:'24px', background:'rgba(255,255,255,0.15)'}}></div>
                    <span style={{padding:'0.3rem 0.8rem', borderRadius:'50px', background:'rgba(245,168,0,0.15)', border:'1px solid rgba(245,168,0,0.3)', color:'var(--yellow)', fontSize:'0.72rem', fontWeight:700}}>
                        <i className="fas fa-shield-alt"></i> Admin
                    </span>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link" style={{border: '1px solid rgba(255,100,80,0.3)', color: '#ff8060'}}>Logout</a>
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