import React, { useState, useEffect, useRef } from 'react';

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
            const res = await fetch(`/api/user-activity/user/${userId}`);
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

    const CSS = `
        :root {
            --yellow: #f5a800;
            --yellow-d: #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --glass-nav: rgba(0, 0, 0, 0.25);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
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

        .nav-brand { font-size: 1.6rem; font-weight: 700; color: white; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-link { color: var(--text-light); text-decoration: none; font-size: 0.82rem; padding: 0.45rem 0.9rem; border-radius: 6px; transition: 0.2s; }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); border: 1px solid rgba(245,168,0,0.4); }

        .page { flex: 1; padding: 7rem 3rem 3rem; max-width: 1000px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.5rem; }
        .page-header { background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem 2.5rem; display: flex; align-items: center; justify-content: space-between; }
        
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .stat-card { background: var(--glass-card); border: 1px solid var(--glass-border); border-radius: 14px; padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1rem; backdrop-filter: blur(18px); }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .stat-icon.yellow { background: rgba(245,168,0,0.15); color: var(--yellow); }

        .search-bar { background: var(--glass-card); border: 1px solid var(--glass-border); border-radius: 18px; padding: 1.5rem 2rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .search-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); border-radius: 10px; padding: 0.75rem 1rem 0.75rem 2.75rem; color: white; outline: none; }
        
        .filter-btn { padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.06); color: var(--text-dim); cursor: pointer; font-size: 0.78rem; font-weight: 600; }
        .filter-btn.active { background: var(--yellow); color: #1a1000; border-color: var(--yellow); }

        .user-card { background: var(--glass-card); border: 1px solid var(--glass-border); border-radius: 14px; padding: 1.1rem 1.5rem; display: flex; align-items: center; gap: 1.25rem; transition: 0.3s; }
        .user-card:hover { transform: translateX(4px); background: rgba(255,255,255,0.15); border-color: rgba(245,168,0,0.35); }
        
        .user-avatar { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 800; flex-shrink: 0; }
        .avatar-customer { background: linear-gradient(135deg, #3b82f6, #6366f1); }
        .avatar-vendor { background: linear-gradient(135deg, #10b981, #059669); }

        .badge { padding: 2px 10px; border-radius: 50px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; border: 1px solid; }
        .badge-customer { background: rgba(59,130,246,0.2); color: #60a5fa; border-color: rgba(59,130,246,0.3); }
        .badge-verified { background: rgba(34,197,94,0.15); color: #4ade80; border-color: rgba(34,197,94,0.25); }

        .activity-panel { margin-top: 0.75rem; background: rgba(0,0,0,0.25); border-top: 1px solid var(--glass-border); border-radius: 0 0 14px 14px; padding: 1rem 1.5rem; }
        .activity-step { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.78rem; }
    `;

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
                <a href="/admin/home" className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> <span>Ekart</span>
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        <a href="/admin/home" className="nav-link">Dashboard</a>
                        <a href="/approve-products" className="nav-link">Approvals</a>
                        <a href="/admin/search-users" className="nav-link active">Users</a>
                        <a href="/admin/delivery" className="nav-link">Delivery</a>
                    </div>
                    <div className="nav-divider" style={{width:'1px', height:'24px', background:'rgba(255,255,255,0.15)', margin:'0 0.5rem'}}></div>
                    <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>
                    <a href="/admin/logout" className="btn-logout">Logout</a>
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