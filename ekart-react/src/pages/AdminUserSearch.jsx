import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';

/**
 * VendorHome Component
 * * @param {Object} props
 * @param {Array} props.customersJson - List of customer objects [{id, name, email, mobile, verified}]
 * @param {Array} props.vendorsJson - List of vendor objects [{id, name, email, mobile, verified}]
 * @param {Object} props.session - Session messages {success: string, failure: string}
 * @param {string} props.csrfToken - Spring Security CSRF token
 */
export default function VendorHome({
    customersJson = [],
    vendorsJson = [],
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFilter, setCurrentFilter] = useState('all');
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/admin/login'); };
    const [isScrolled, setIsScrolled] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ show: false, name: '', url: '' });
    const [activityData, setActivityData] = useState({}); // { userId: [actions] }
    const [loadingActivity, setLoadingActivity] = useState({});
    const [openActivityId, setOpenActivityId] = useState(null);

    // --- REFS ---
    const navRef = useRef(null);

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
    }, []);

    // --- LOGIC ---
    const stats = {
        total: customersJson.length + vendorsJson.length,
        customers: customersJson.length,
        vendors: vendorsJson.length,
        verified: [...customersJson, ...vendorsJson].filter(u => u.verified).length
    };

    const handleSearch = (e) => setSearchQuery(e.target.value.toLowerCase());

    const getFilteredResults = () => {
        let results = [];
        if (currentFilter !== 'vendors') {
            customersJson.forEach(c => {
                const s = (c.name + c.email + c.mobile).toLowerCase();
                if (!searchQuery || s.includes(searchQuery)) results.push({ ...c, type: 'customer' });
            });
        }
        if (currentFilter !== 'customers') {
            vendorsJson.forEach(v => {
                const s = (v.name + v.email + v.mobile).toLowerCase();
                if (!searchQuery || s.includes(searchQuery)) results.push({ ...v, type: 'vendor' });
            });
        }
        return results;
    };

    const fetchActivity = async (userId) => {
        if (activityData[userId]) return;
        setLoadingActivity(prev => ({ ...prev, [userId]: true }));
        try {
            const res = await authFetch(`/api/user-activity/user/${userId}`);
            const data = await res.json();
            setActivityData(prev => ({ ...prev, [userId]: data }));
        } catch (err) {
            console.error("Failed to load activity", err);
        } finally {
            setLoadingActivity(prev => ({ ...prev, [userId]: false }));
        }
    };

    const toggleActivity = (userId) => {
        if (openActivityId === userId) {
            setOpenActivityId(null);
        } else {
            setOpenActivityId(userId);
            fetchActivity(userId);
        }
    };

    const confirmDelete = (name, url) => {
        setDeleteModal({ show: true, name, url });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ show: false, name: '', url: '' });
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

        /* ── BACKGROUND ── */
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
            transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }

        .nav-brand {
            font-size: 1.6rem; font-weight: 700;
            color: var(--text-white); text-decoration: none;
            letter-spacing: 0.04em;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }

        .nav-right { display: flex; align-items: center; gap: 1rem; }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .nav-link {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .nav-link:hover {
            color: var(--yellow);
            border-color: rgba(245,168,0,0.3);
            background: rgba(245,168,0,0.08);
        }
        .nav-link.active {
            color: var(--yellow);
            background: rgba(245,168,0,0.12);
            border-color: rgba(245,168,0,0.4);
        }

        .nav-divider {
            width: 1px; height: 24px;
            background: rgba(255,255,255,0.15);
            margin: 0 0.5rem;
        }

        .nav-badge {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.72rem; font-weight: 700;
            padding: 0.3rem 0.8rem; border-radius: 50px;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.3);
            color: var(--yellow);
            letter-spacing: 0.06em; text-transform: uppercase;
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
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            max-width: 1000px;
            margin: 0 auto;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        /* ── PAGE HEADER ── */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; flex-wrap: wrap;
            animation: fadeUp 0.5s ease both;
        }
        .page-header-left h1 {
            font-size: clamp(1.2rem, 2.5vw, 1.75rem);
            font-weight: 700; margin-bottom: 0.25rem;
        }
        .page-header-left h1 span { color: var(--yellow); }
        .page-header-left p { font-size: 0.825rem; color: var(--text-dim); }
        .page-header-icon {
            width: 60px; height: 60px;
            background: rgba(245,168,0,0.15);
            border: 2px solid rgba(245,168,0,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; flex-shrink: 0;
        }

        /* ── STATS ROW ── */
        .stats-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            animation: fadeUp 0.5s ease both;
            animation-delay: 0.05s;
        }
        .stat-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 14px;
            padding: 1.25rem 1.5rem;
            display: flex; align-items: center; gap: 1rem;
        }
        .stat-icon {
            width: 40px; height: 40px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; flex-shrink: 0;
        }
        .stat-icon.yellow  { background: rgba(245,168,0,0.15); color: var(--yellow); }
        .stat-icon.blue    { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .stat-icon.green   { background: rgba(34,197,94,0.15);  color: #4ade80; }
        .stat-icon.emerald { background: rgba(16,185,129,0.15); color: #34d399; }

        .stat-info strong {
            display: block; font-size: 1.4rem; font-weight: 800; line-height: 1;
            margin-bottom: 0.2rem;
        }
        .stat-info span { font-size: 0.72rem; color: var(--text-dim); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

        /* ── SEARCH & FILTER BAR ── */
        .search-bar {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 18px;
            padding: 1.5rem 2rem;
            display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
            animation: fadeUp 0.5s ease both;
            animation-delay: 0.10s;
        }

        .search-input-wrapper {
            position: relative; flex: 1; min-width: 220px;
        }
        .search-input-wrapper i {
            position: absolute; left: 1rem; top: 50%;
            transform: translateY(-50%);
            color: var(--text-dim); font-size: 0.875rem;
            pointer-events: none; transition: color 0.3s;
        }
        .search-input-wrapper:focus-within i { color: var(--yellow); }

        .search-input {
            width: 100%;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            border-radius: 10px;
            padding: 0.75rem 1rem 0.75rem 2.75rem;
            color: white;
            font-family: 'Poppins', sans-serif;
            font-size: 0.875rem;
            transition: all 0.3s;
        }
        .search-input::placeholder { color: var(--text-dim); }
        .search-input:focus {
            outline: none;
            background: rgba(255,255,255,0.10);
            border-color: var(--yellow);
            box-shadow: 0 0 0 3px rgba(245,168,0,0.12);
        }

        .filter-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .filter-btn {
            display: flex; align-items: center; gap: 0.35rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            color: var(--text-dim);
            padding: 0.5rem 1rem; border-radius: 8px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.78rem; font-weight: 600;
            cursor: pointer; transition: all 0.25s;
            white-space: nowrap;
        }
        .filter-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .filter-btn.active {
            background: var(--yellow);
            color: #1a1000;
            border-color: var(--yellow);
        }

        /* ── RESULTS META ── */
        .results-meta {
            font-size: 0.78rem; color: var(--text-dim); font-weight: 600;
            padding: 0 0.25rem;
        }
        .results-meta strong { color: var(--yellow); }

        /* ── RESULTS CONTAINER ── */
        .results-container {
            display: flex; flex-direction: column; gap: 0.75rem;
            animation: fadeUp 0.5s ease both;
            animation-delay: 0.15s;
        }

        /* ── USER CARD ── */
        .user-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 14px;
            padding: 1.1rem 1.5rem;
            display: flex; align-items: center; gap: 1.25rem;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        .user-card:hover {
            border-color: rgba(245,168,0,0.35);
            background: rgba(255,255,255,0.15);
            transform: translateX(4px);
            box-shadow: 0 8px 28px rgba(0,0,0,0.25);
        }

        .user-avatar {
            width: 46px; height: 46px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; font-weight: 800; color: white;
            flex-shrink: 0; letter-spacing: -0.02em;
        }
        .avatar-customer { background: linear-gradient(135deg, #3b82f6, #6366f1); }
        .avatar-vendor   { background: linear-gradient(135deg, #10b981, #059669); }

        .user-info { flex: 1; min-width: 0; }
        .user-name-row {
            display: flex; align-items: center; gap: 0.5rem;
            flex-wrap: wrap; margin-bottom: 0.3rem;
        }
        .user-name { font-size: 0.9rem; font-weight: 700; color: white; }

        /* Badges */
        .badge {
            display: inline-flex; align-items: center; gap: 0.25rem;
            padding: 2px 10px; border-radius: 50px;
            font-size: 0.65rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.05em;
        }
        .badge-customer  { background: rgba(59,130,246,0.2);  color: #60a5fa;  border: 1px solid rgba(59,130,246,0.3); }
        .badge-vendor    { background: rgba(16,185,129,0.2);  color: #34d399;  border: 1px solid rgba(16,185,129,0.3); }
        .badge-verified  { background: rgba(34,197,94,0.15);  color: #4ade80;  border: 1px solid rgba(34,197,94,0.25); }
        .badge-unverified{ background: rgba(255,100,80,0.15); color: #ff8060;  border: 1px solid rgba(255,100,80,0.25); }

        .user-meta {
            font-size: 0.75rem; color: var(--text-dim);
            display: flex; gap: 1rem; flex-wrap: wrap;
        }
        .user-meta span { display: flex; align-items: center; gap: 0.3rem; }

        .user-id {
            font-size: 0.7rem; color: var(--text-dim);
            white-space: nowrap; flex-shrink: 0; font-weight: 600;
        }

        /* ── ACTIVITY PANEL ── */
        .activity-panel {
            display: none;
            margin-top: 0.75rem;
            background: rgba(0,0,0,0.25);
            border-top: 1px solid var(--glass-border);
            border-radius: 0 0 14px 14px;
            padding: 1rem 1.5rem;
        }
        .activity-panel.open { display: block; }
        .activity-title {
            font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.08em; color: var(--yellow); margin-bottom: 0.75rem;
        }
        .activity-step {
            display: flex; align-items: flex-start; gap: 0.75rem;
            padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.06);
            font-size: 0.78rem;
        }
        .activity-step:last-child { border-bottom: none; }
        .activity-step b { color: white; text-transform: capitalize; }
        .activity-step span { color: var(--text-dim); flex: 1; }
        .activity-step time { color: var(--text-dim); font-size: 0.7rem; white-space: nowrap; }
        .activity-empty { color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem 0; }
        .activity-loading { color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem 0; }

        /* ── EMPTY STATE ── */
        .empty-state {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 18px;
            padding: 4rem 2rem;
            text-align: center; color: var(--text-dim);
        }
        .empty-state i { font-size: 2.5rem; margin-bottom: 1rem; display: block; opacity: 0.5; }
        .empty-state p { font-size: 0.875rem; }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(14px); }
            to   { opacity: 1; transform: translateX(0); }
        }

        /* ── RESPONSIVE ── */
        @media(max-width: 1024px) { .nav-links { display: none; } .nav-divider { display: none; } }
        @media(max-width: 900px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .stats-row { grid-template-columns: 1fr 1fr; }
            .page-header { flex-direction: column; text-align: center; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }
        @media(max-width: 500px) {
            .stats-row { grid-template-columns: 1fr 1fr; }
            .search-bar { flex-direction: column; align-items: stretch; }
        }`;

    const results = getFilteredResults();

    return (
        <div style={{ fontFamily: 'Poppins, sans-serif', color: 'white', minHeight: '100vh' }}>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i> <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({...p, success: null}))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i> <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({...p, failure: null}))}>×</button>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav className={isScrolled ? 'scrolled' : ''} ref={navRef}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> <span>Ekart</span>
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link">Dashboard</a>
                        <Link to="/admin/products" className="nav-link">Approvals</Link>
                        <Link to="/admin/users" className="nav-link active">Users</Link>
                        <Link to="/admin/delivery" className="nav-link">Delivery</Link>
                    </div>
                    <div className="nav-divider" style={{width:'1px', height:'24px', background:'rgba(255,255,255,0.15)', margin:'0 0.5rem'}}></div>
                    <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout">Logout</a>
                </div>
            </nav>

            <main className="page">
                <header className="page-header">
                    <div>
                        <h1 style={{fontSize:'1.75rem'}}>Search <span>Users</span> 👥</h1>
                        <p style={{fontSize:'0.825rem', color:'var(--text-dim)'}}>Find and inspect customer and vendor accounts.</p>
                    </div>
                    <div className="stat-icon yellow" style={{width:'60px', height:'60px', borderRadius:'50%', fontSize:'1.5rem'}}>🔍</div>
                </header>

                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon yellow"><i className="fas fa-users"></i></div>
                        <div className="stat-info"><strong>{stats.total}</strong><span>Total</span></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow" style={{color:'#60a5fa'}}><i className="fas fa-user"></i></div>
                        <div className="stat-info"><strong>{stats.customers}</strong><span>Customers</span></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow" style={{color:'#34d399'}}><i className="fas fa-store"></i></div>
                        <div className="stat-info"><strong>{stats.vendors}</strong><span>Vendors</span></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow" style={{color:'#4ade80'}}><i className="fas fa-check-circle"></i></div>
                        <div className="stat-info"><strong>{stats.verified}</strong><span>Verified</span></div>
                    </div>
                </div>

                <div className="search-bar">
                    <div style={{position:'relative', flex:1}}>
                        <i className="fas fa-search" style={{position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)'}}></i>
                        <input type="text" className="search-input" placeholder="Search users..." value={searchQuery} onChange={handleSearch} />
                    </div>
                    <div className="filter-btns">
                        <button className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentFilter('all')}>All</button>
                        <button className={`filter-btn ${currentFilter === 'customers' ? 'active' : ''}`} onClick={() => setCurrentFilter('customers')}>Customers</button>
                        <button className={`filter-btn ${currentFilter === 'vendors' ? 'active' : ''}`} onClick={() => setCurrentFilter('vendors')}>Vendors</button>
                    </div>
                </div>

                <div className="results-container">
                    {results.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-user-slash"></i>
                            <p>No users found matching your search.</p>
                        </div>
                    ) : (
                        results.map(u => (
                            <React.Fragment key={`${u.type}-${u.id}`}>
                                <div className="user-card">
                                    <div className={`user-avatar ${u.type === 'vendor' ? 'avatar-vendor' : 'avatar-customer'}`}>
                                        {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="user-info">
                                        <div style={{display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.3rem'}}>
                                            <span style={{fontWeight:700}}>{u.name || 'Unknown'}</span>
                                            <span className={`badge badge-${u.type === 'vendor' ? 'vendor' : 'customer'}`}>{u.type}</span>
                                            {u.verified && <span className="badge badge-verified">Verified</span>}
                                        </div>
                                        <div style={{fontSize:'0.75rem', color:'var(--text-dim)', display:'flex', gap:'1rem'}}>
                                            <span><i className="fas fa-envelope"></i> {u.email}</span>
                                            <span><i className="fas fa-phone"></i> {u.mobile}</span>
                                        </div>
                                    </div>
                                    <div style={{fontSize:'0.7rem', color:'var(--text-dim)', fontWeight:600}}>ID #{u.id}</div>
                                    <div style={{display:'flex', gap:'0.5rem', marginLeft:'auto'}}>
                                        {u.type === 'customer' && (
                                            <button onClick={() => toggleActivity(u.id)} style={{background:'rgba(245,168,0,0.1)', border:'1px solid rgba(245,168,0,0.3)', color:'var(--yellow)', borderRadius:'8px', padding:'0.4rem 0.75rem', cursor:'pointer', fontSize:'0.8rem'}}>
                                                <i className="fas fa-chart-line"></i> Activity
                                            </button>
                                        )}
                                        <button onClick={() => confirmDelete(u.name, `/admin/delete-${u.type}/${u.id}`)} style={{background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', color:'#ef4444', borderRadius:'8px', padding:'0.4rem 0.75rem', cursor:'pointer', fontSize:'0.8rem'}}>
                                            <i className="fas fa-trash-alt"></i> Delete
                                        </button>
                                    </div>
                                </div>
                                {openActivityId === u.id && (
                                    <div className="activity-panel">
                                        <div style={{fontSize:'0.72rem', fontWeight:700, color:'var(--yellow)', marginBottom:'0.75rem'}}>Recent Activity</div>
                                        {loadingActivity[u.id] ? <div>Loading...</div> : (
                                            activityData[u.id]?.length > 0 ? (
                                                activityData[u.id].map((a, i) => (
                                                    <div className="activity-step" key={i}>
                                                        <b>{a.actionType?.replace(/_/g, ' ')}</b>
                                                        <span style={{flex:1, color:'var(--text-dim)'}}>{a.metadata || ''}</span>
                                                        <time style={{fontSize:'0.7rem'}}>{new Date(a.timestamp).toLocaleString()}</time>
                                                    </div>
                                                ))
                                            ) : <div>No activity recorded.</div>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        ))
                    )}
                </div>
            </main>

            {/* DELETE MODAL */}
            {deleteModal.show && (
                <div style={{position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center'}} onClick={closeDeleteModal}>
                    <div style={{background:'#1a1208', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'20px', padding:'2rem', maxWidth:'400px', width:'90%'}} onClick={e => e.stopPropagation()}>
                        <div style={{textAlign:'center'}}>
                            <div style={{fontSize:'2.5rem'}}>⚠️</div>
                            <h2 style={{color:'#ef4444'}}>Delete Account?</h2>
                            <p style={{color:'#aaa', fontSize:'0.85rem', margin:'1rem 0'}}>Permanently delete <strong>{deleteModal.name}</strong>?</p>
                        </div>
                        <div style={{display:'flex', gap:'0.8rem'}}>
                            <button onClick={closeDeleteModal} style={{flex:1, padding:'0.75rem', borderRadius:'12px', border:'1px solid #444', background:'transparent', color:'#ccc', cursor:'pointer'}}>Cancel</button>
                            <a href={deleteModal.url} style={{flex:1, padding:'0.75rem', borderRadius:'12px', background:'#ef4444', color:'white', textAlign:'center', textDecoration:'none', fontWeight:600}}>Yes, Delete</a>
                        </div>
                    </div>
                </div>
            )}

            <footer style={{background:'rgba(0,0,0,0.5)', padding:'1.25rem 3rem', display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--glass-border)'}}>
                <div style={{fontWeight:700}}><span>Ekart</span></div>
                <div style={{fontSize:'0.72rem', color:'var(--text-dim)'}}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}