import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - Coupon Management Component
 * @param {Object} props
 * @param {Array} props.coupons - List of coupon objects [{id, code, description, type, value, minOrderAmount, maxDiscount, usedCount, usageLimit, expiryDate, active}]
 * @param {number} props.activeCoupons - Count of currently active coupons
 * @param {number} props.totalUses - Sum of uses across all coupons
 * @param {Object} props.session - Session object for notifications {success: string, failure: string}
 * @param {string} props.csrfToken - CSRF token for form security
 */
export default function AdminCoupons({
    coupons = [],
    activeCoupons = 0,
    totalUses = 0,
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/admin/login'); };
    const [scrolled, setScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    const [discountType, setDiscountType] = useState('PERCENT');
    const [couponCode, setCouponCode] = useState('');

    // --- REFS ---
    const navRef = useRef(null);

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        const alertTimeout = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 3000);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(alertTimeout);
        };
    }, []);

    // --- HANDLERS ---
    const handleCodeInput = (e) => {
        const val = e.target.value.toUpperCase().replace(/\s/g, '');
        setCouponCode(val);
    };

    const handleTypeChange = (e) => {
        setDiscountType(e.target.value);
    };

    const CSS = `:root {
            --yellow: #f5a800; --yellow-d: #d48f00;
            --glass-border: rgba(255,255,255,0.14);
            --glass-card: rgba(255,255,255,0.07);
            --glass-nav: rgba(0,0,0,0.3);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.82);
            --text-dim: rgba(255,255,255,0.45);
            --input-bg: rgba(255,255,255,0.07);
            --input-border: rgba(255,255,255,0.14);
            --success: #22c55e; --danger: #f87171;
        }
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        #root { font-family:'Poppins',sans-serif; min-height:100vh; color:var(--text-white); background:#060a18; }
        .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
        .bg-layer::before { content:''; position:absolute; inset:-20px;
            background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter:blur(6px); transform:scale(1.08); }
        .bg-layer::after { content:''; position:absolute; inset:0;
            background:linear-gradient(135deg,rgba(5,8,20,0.92),rgba(8,12,28,0.88)); }

        /* NAV */
        nav { position:fixed; top:0; left:0; right:0; z-index:100;
            padding:0.75rem 2rem; display:flex; align-items:center; justify-content:space-between;
            background:var(--glass-nav); backdrop-filter:blur(14px);
            border-bottom:1px solid var(--glass-border); gap:1rem; }
        .nav-brand { font-size:1.6rem; font-weight:700; color:var(--text-white);
            text-decoration:none; letter-spacing:0.04em;
            display:flex; align-items:center; gap:0.45rem; }
        .nav-brand span { color:var(--yellow); }
        .nav-right { display:flex; align-items:center; gap:0.75rem; }
        .nav-link { display:flex; align-items:center; gap:0.4rem; color:var(--text-light);
            text-decoration:none; font-size:0.8rem; font-weight:500; padding:0.4rem 0.75rem;
            border-radius:8px; border:1px solid transparent; transition:all 0.2s; }
        .nav-link:hover, .nav-link.active { border-color:rgba(245,168,0,0.3);
            background:rgba(245,168,0,0.08); color:var(--yellow); }
        .btn-logout { display:flex; align-items:center; gap:0.4rem; background:rgba(239,68,68,0.12);
            border:1px solid rgba(239,68,68,0.25); color:#f87171; text-decoration:none;
            padding:0.4rem 0.9rem; border-radius:8px; font-size:0.8rem; font-weight:600; transition:all 0.2s; }
        .btn-logout:hover { background:rgba(239,68,68,0.22); }

        /* PAGE */
        main { padding:7rem 2rem 3rem; max-width:1100px; margin:0 auto; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        /* ALERTS */
        .alert-stack { position:fixed; top:5rem; right:1.5rem; z-index:200; display:flex; flex-direction:column; gap:0.5rem; }
        .alert { display:flex; align-items:center; gap:0.6rem; padding:0.7rem 1rem;
            border-radius:10px; font-size:0.82rem; font-weight:500; animation:fadeUp 0.3s ease both; }
        .alert-success { background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); color:#22c55e; }
        .alert-danger  { background:rgba(248,113,113,0.15); border:1px solid rgba(248,113,113,0.3); color:#f87171; }
        .alert-close { background:none; border:none; color:inherit; cursor:pointer; margin-left:auto; font-size:1rem; opacity:0.6; }

        /* PAGE HEADER */
        .page-header { display:flex; align-items:center; justify-content:space-between;
            margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .page-title { font-size:1.5rem; font-weight:700; }
        .page-title span { color:var(--yellow); }
        .page-subtitle { font-size:0.82rem; color:var(--text-dim); margin-top:0.2rem; }

        /* GLASS CARD */
        .glass-card { background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:18px; padding:1.5rem; }

        /* FORM */
        .form-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1rem; }
        .form-group { display:flex; flex-direction:column; gap:0.35rem; }
        .form-group.full { grid-column:1/-1; }
        .form-label { font-size:0.7rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.08em; color:var(--text-dim); }
        .form-control { background:var(--input-bg); border:1px solid var(--input-border);
            border-radius:10px; color:white; font-family:'Poppins',sans-serif;
            font-size:0.85rem; padding:0.6rem 0.9rem; outline:none; transition:border-color 0.2s; width:100%; }
        .form-control:focus { border-color:rgba(245,168,0,0.5); }
        .form-control option { background:#0f172a; color:white; }
        select.form-control { appearance:none; cursor:pointer; }
        .form-hint { font-size:0.68rem; color:var(--text-dim); margin-top:0.2rem; }

        /* SUBMIT */
        .btn-create { display:inline-flex; align-items:center; gap:0.5rem;
            background:var(--yellow); color:#1a1000; border:none; border-radius:10px;
            padding:0.7rem 1.5rem; font-family:'Poppins',sans-serif;
            font-size:0.875rem; font-weight:700; cursor:pointer; transition:all 0.2s; }
        .btn-create:hover { background:var(--yellow-d); transform:translateY(-1px); }

        /* SECTION LABEL */
        .section-label { display:flex; align-items:center; gap:0.6rem;
            font-size:0.7rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.12em; color:var(--yellow); margin-bottom:1.25rem; }
        .section-label::after { content:''; flex:1; height:1px; background:var(--glass-border); }

        /* TABLE */
        .coupon-table { width:100%; border-collapse:collapse; }
        .coupon-table th { font-size:0.68rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.08em; color:var(--text-dim); padding:0 0 0.75rem;
            border-bottom:1px solid var(--glass-border); text-align:left; }
        .coupon-table td { padding:0.85rem 0; border-bottom:1px solid rgba(255,255,255,0.05);
            font-size:0.83rem; color:var(--text-light); vertical-align:middle; }
        .coupon-table tr:last-child td { border-bottom:none; }

        /* BADGES */
        .badge { display:inline-flex; align-items:center; gap:0.3rem;
            padding:0.2rem 0.7rem; border-radius:20px; font-size:0.7rem; font-weight:700; }
        .badge-active   { background:rgba(34,197,94,0.15); color:#22c55e; border:1px solid rgba(34,197,94,0.3); }
        .badge-inactive { background:rgba(248,113,113,0.12); color:#f87171; border:1px solid rgba(248,113,113,0.25); }
        .badge-percent  { background:rgba(245,168,0,0.12); color:var(--yellow); border:1px solid rgba(245,168,0,0.25); }
        .badge-flat     { background:rgba(99,102,241,0.12); color:#818cf8; border:1px solid rgba(99,102,241,0.25); }

        /* CODE PILL */
        .code-pill { display:inline-block; background:rgba(245,168,0,0.12);
            border:1px solid rgba(245,168,0,0.3); color:var(--yellow);
            padding:0.2rem 0.65rem; border-radius:6px;
            font-family:monospace; font-size:0.85rem; font-weight:700; letter-spacing:0.06em; }

        /* ACTION BUTTONS */
        .btn-toggle { display:inline-flex; align-items:center; gap:0.3rem;
            background:none; border:1px solid var(--glass-border); border-radius:7px;
            color:var(--text-dim); font-family:'Poppins',sans-serif;
            font-size:0.72rem; font-weight:600; padding:0.3rem 0.7rem;
            cursor:pointer; transition:all 0.2s; }
        .btn-toggle:hover { border-color:rgba(245,168,0,0.4); color:var(--yellow); }
        .btn-del { display:inline-flex; align-items:center; gap:0.3rem;
            background:none; border:1px solid rgba(239,68,68,0.2); border-radius:7px;
            color:#f87171; font-family:'Poppins',sans-serif;
            font-size:0.72rem; font-weight:600; padding:0.3rem 0.7rem;
            cursor:pointer; transition:all 0.2s; margin-left:0.4rem; }
        .btn-del:hover { background:rgba(239,68,68,0.1); }

        /* EMPTY STATE */
        .empty-state { text-align:center; padding:3rem 1rem; color:var(--text-dim); }
        .empty-state i { font-size:2.5rem; color:rgba(245,168,0,0.3); margin-bottom:1rem; display:block; }

        /* STATS ROW */
        .stats-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:1rem; margin-bottom:1.5rem; }
        .stat-card { background:var(--glass-card); border:1px solid var(--glass-border);
            border-radius:14px; padding:1rem 1.25rem; }
        .stat-val { font-size:1.6rem; font-weight:800; color:var(--yellow); }
        .stat-label { font-size:0.68rem; color:var(--text-dim); text-transform:uppercase;
            letter-spacing:0.08em; margin-top:0.2rem; }

        @media(max-width:700px) {
            main { padding:6rem 1rem 2rem; }
            .form-grid { grid-template-columns:1fr; }
            nav { padding:0.75rem 1rem; }
            .nav-link span { display:none; }
        }`;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#060a18' }}>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts({ ...alerts, success: null })}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts({ ...alerts, failure: null })}>×</button>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav id="nav" className={scrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }}></i>
                    Ek<span>art</span>
                </a>
                <div className="nav-right">
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link"><i className="fas fa-home"></i> <span>Dashboard</span></a>
                    <Link to="/admin/products" className="nav-link"><i className="fas fa-tasks"></i> <span>Approvals</span></Link>
                    <Link to="/admin/coupons" className="nav-link active"><i className="fas fa-tag"></i> <span>Coupons</span></Link>
                    <Link to="/admin/refunds" className="nav-link"><i className="fas fa-undo-alt"></i> <span>Refunds</span></Link>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page-main">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Coupon <span>Management</span></div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Create and manage promo codes for customers</div>
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-val">{coupons.length}</div>
                        <div className="stat-label">Total Coupons</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-val">{activeCoupons}</div>
                        <div className="stat-label">Active</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-val">{totalUses}</div>
                        <div className="stat-label">Total Uses</div>
                    </div>
                </div>

                {/* Create Coupon Form */}
                <div className="glass-card" style={{ marginBottom: '1.5rem', animation: 'fadeUp 0.4s ease both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--yellow)', marginBottom: '1.25rem' }}>
                        <i className="fas fa-plus-circle"></i> Create New Coupon
                    </div>
                    <form action="/admin/coupons/create" method="post">
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Coupon Code *</label>
                                <input 
                                    type="text" 
                                    name="code" 
                                    className="form-control" 
                                    placeholder="e.g. SAVE20"
                                    required 
                                    maxLength="20"
                                    value={couponCode}
                                    onInput={handleCodeInput}
                                />
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Auto uppercased, no spaces</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Discount Type *</label>
                                <select name="type" className="form-control" required onChange={handleTypeChange}>
                                    <option value="PERCENT">Percentage (%) Off</option>
                                    <option value="FLAT">Flat (₹) Off</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Discount Value *</label>
                                <input 
                                    type="number" 
                                    name="value" 
                                    className="form-control" 
                                    placeholder={discountType === 'PERCENT' ? "e.g. 10" : "e.g. 50"}
                                    required 
                                    min="1" 
                                    step="0.01"
                                    max={discountType === 'PERCENT' ? "100" : ""}
                                />
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                                    {discountType === 'PERCENT' ? "Enter % value (e.g. 10 = 10% off)" : "Enter ₹ amount (e.g. 50 = ₹50 off)"}
                                </span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Min Order Amount (₹)</label>
                                <input type="number" name="minOrderAmount" className="form-control" placeholder="0 = no minimum" min="0" step="1" defaultValue="0" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Max Discount Cap (₹)</label>
                                <input type="number" name="maxDiscount" className="form-control" placeholder="0 = no cap" min="0" step="1" defaultValue="0" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Usage Limit</label>
                                <input type="number" name="usageLimit" className="form-control" placeholder="0 = unlimited" min="0" step="1" defaultValue="0" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Expiry Date</label>
                                <input type="date" name="expiryDate" className="form-control" />
                            </div>

                            <div className="form-group full">
                                <label className="form-label">Description (shown to customers) *</label>
                                <input type="text" name="description" className="form-control" placeholder="e.g. Get 20% off on orders above ₹500" required maxLength="200" />
                            </div>
                        </div>

                        <div style={{ marginTop: '1.25rem' }}>
                            <button type="submit" className="btn-create">
                                <i className="fas fa-plus"></i> Create Coupon
                            </button>
                        </div>
                    </form>
                </div>

                {/* Coupons Table */}
                <div className="glass-card" style={{ animation: 'fadeUp 0.4s 0.1s ease both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--yellow)', marginBottom: '1.25rem' }}>
                        <i className="fas fa-list"></i> All Coupons
                    </div>

                    {coupons.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                            <i className="fas fa-tag" style={{ fontSize: '2.5rem', color: 'rgba(245,168,0,0.3)', marginBottom: '1rem', display: 'block' }}></i>
                            <p>No coupons yet. Create one above.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="coupon-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Description</th>
                                        <th>Discount</th>
                                        <th>Min Order</th>
                                        <th>Cap</th>
                                        <th>Usage</th>
                                        <th>Expiry</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.map((c) => (
                                        <tr key={c.id}>
                                            <td><span className="code-pill">{c.code}</span></td>
                                            <td style={{ maxWidth: '220px', color: 'rgba(255,255,255,0.65)' }}>{c.description}</td>
                                            <td>
                                                {c.type === 'PERCENT' ? (
                                                    <span className="badge badge-percent">{c.value}% off</span>
                                                ) : (
                                                    <span className="badge badge-flat">₹{c.value.toLocaleString()} off</span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{ color: c.minOrderAmount > 0 ? 'var(--text-light)' : 'var(--text-dim)' }}>
                                                    {c.minOrderAmount > 0 ? `₹${c.minOrderAmount.toLocaleString()}` : 'None'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ color: c.maxDiscount > 0 ? 'var(--text-light)' : 'var(--text-dim)' }}>
                                                    {c.maxDiscount > 0 ? `₹${c.maxDiscount.toLocaleString()}` : 'No cap'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>{c.usedCount}</span>
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                                                    {c.usageLimit > 0 ? ` / ${c.usageLimit}` : ' / ∞'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                                    {c.expiryDate ? c.expiryDate : 'Never'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${c.active ? 'badge-active' : 'badge-inactive'}`}>
                                                    <i className="fas fa-circle" style={{ fontSize: '0.45rem' }}></i> {c.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <form action={`/admin/coupons/toggle/${c.id}`} method="post" style={{ display: 'inline' }}>
                                                    <button type="submit" className="btn-toggle">
                                                        <i className={`fas ${c.active ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                                                        <span>{c.active ? 'Disable' : 'Enable'}</span>
                                                    </button>
                                                </form>
                                                <form action={`/admin/coupons/delete/${c.id}`} method="post" style={{ display: 'inline' }} onsubmit={(e) => !window.confirm(`Delete coupon ${c.code}?`) && e.preventDefault()}>
                                                    <button type="submit" className="btn-del">
                                                        <i className="fas fa-trash-alt"></i> Delete
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', marginTop: '2rem' }}>
                © 2026 Ekart Admin Panel
            </footer>
        </div>
    );
}