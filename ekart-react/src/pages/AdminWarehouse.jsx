import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * AdminWarehouse Component
 * @param {Object} props
 * @param {Array} props.warehouses - List of warehouse objects [{warehouseCode, name, city, state, servedPinCodes, active}]
 * @param {Object} props.session - Session notification object {success: string, failure: string}
 * @param {string} props.csrfToken - Security token for POST requests
 */
export default function AdminWarehouse({
    warehouses = [],
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        state: '',
        servedPinCodes: ''
    });
    const [alerts, setAlerts] = useState({ 
        success: session.success, 
        failure: session.failure 
    });
    const [toast, setToast] = useState({ show: false, msg: '', isSuccess: true });
    const [isScrolled, setIsScrolled] = useState(false);

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
    const showToast = (msg, isSuccess) => {
        setToast({ show: true, msg, isSuccess });
        setTimeout(() => setToast({ show: false, msg: '', isSuccess: true }), 3500);
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        const key = id.replace('wh-', '');
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const addWarehouse = async () => {
        const { name, city, state, servedPinCodes } = formData;

        if (!name) { showToast('Warehouse name is required', false); return; }
        if (!city) { showToast('City is required', false); return; }
        if (!servedPinCodes) { showToast('Enter at least one pin code', false); return; }

        const fd = new FormData();
        fd.append('name', name);
        fd.append('city', city);
        fd.append('state', state);
        fd.append('servedPinCodes', servedPinCodes);
        if (csrfToken) fd.append('_csrf', csrfToken);

        try {
            const response = await fetch('/admin/delivery/warehouse', { 
                method: 'POST', 
                body: fd 
            });
            const data = await response.json();
            
            showToast(data.message, data.success);
            if (data.success) {
                setTimeout(() => window.location.reload(), 1600);
            }
        } catch (error) {
            showToast('Request failed', false);
        }
    };

    const CSS = `:root{--yellow:#f5a800;--yellow-d:#d48f00;--glass-border:rgba(255,255,255,0.22);--glass-card:rgba(255,255,255,0.13);--glass-nav:rgba(0,0,0,0.25);--text-white:#ffffff;--text-light:rgba(255,255,255,0.80);--text-dim:rgba(255,255,255,0.50);}
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        #root {font-family:'Poppins',sans-serif;min-height:100vh;color:var(--text-white);display:flex;flex-direction:column;}
        .bg-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;}
        .bg-layer::before{content:'';position:absolute;inset:-20px;background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;filter:blur(6px);transform:scale(1.08);}
        .bg-layer::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%);}

        /* NAV */
        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:1rem 3rem;display:flex;align-items:center;justify-content:space-between;background:var(--glass-nav);backdrop-filter:blur(14px);border-bottom:1px solid var(--glass-border);transition:background 0.3s;}
        nav.scrolled{background:rgba(0,0,0,0.45);}
        .nav-brand{font-size:1.6rem;font-weight:700;color:var(--text-white);text-decoration:none;display:flex;align-items:center;gap:0.5rem;}
        .nav-brand span{color:var(--yellow);}
        .nav-right{display:flex;align-items:center;gap:1rem;}
        .nav-links{display:flex;align-items:center;gap:0.5rem;}
        .nav-link{display:flex;align-items:center;gap:0.4rem;color:var(--text-light);text-decoration:none;font-size:0.82rem;font-weight:500;padding:0.45rem 0.9rem;border-radius:6px;border:1px solid transparent;transition:all 0.2s;}
        .nav-link:hover{color:var(--yellow);border-color:rgba(245,168,0,0.3);background:rgba(245,168,0,0.08);}
        .nav-link.active{color:var(--yellow);background:rgba(245,168,0,0.12);border-color:rgba(245,168,0,0.4);}
        .nav-divider{width:1px;height:24px;background:rgba(255,255,255,0.15);margin:0 0.5rem;}
        .nav-badge{display:flex;align-items:center;gap:0.4rem;font-size:0.72rem;font-weight:700;padding:0.3rem 0.8rem;border-radius:50px;background:rgba(245,168,0,0.15);border:1px solid rgba(245,168,0,0.3);color:var(--yellow);letter-spacing:0.06em;text-transform:uppercase;}
        .btn-logout{display:flex;align-items:center;gap:0.4rem;color:var(--text-light);text-decoration:none;font-size:0.82rem;font-weight:500;padding:0.45rem 0.9rem;border-radius:6px;border:1px solid rgba(255,100,80,0.3);transition:all 0.2s;}
        .btn-logout:hover{color:#ff8060;border-color:rgba(255,100,80,0.6);background:rgba(255,100,80,0.08);}

        /* ALERTS */
        .alert-stack{position:fixed;top:5rem;right:1.5rem;z-index:200;display:flex;flex-direction:column;gap:0.5rem;}
        .alert{padding:0.875rem 1.25rem;background:rgba(10,12,30,0.88);backdrop-filter:blur(16px);border:1px solid;border-radius:10px;display:flex;align-items:center;gap:0.625rem;font-size:0.825rem;min-width:260px;animation:slideIn 0.3s ease both;}
        .alert-success{border-color:rgba(34,197,94,0.45);color:#22c55e;}
        .alert-danger{border-color:rgba(255,100,80,0.45);color:#ff8060;}
        .alert-close{margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;opacity:0.6;font-size:1rem;}

        /* PAGE */
        .page{flex:1;padding:7rem 3rem 3rem;max-width:1100px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:1.5rem;}

        /* PAGE HEADER */
        .page-header{background:var(--glass-card);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:20px;padding:2rem 2.5rem;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;animation:fadeUp 0.4s ease both;}
        .page-header h1{font-size:clamp(1.2rem,2.5vw,1.75rem);font-weight:700;margin-bottom:0.25rem;}
        .page-header h1 span{color:var(--yellow);}
        .page-header p{font-size:0.825rem;color:var(--text-dim);}
        .page-header-icon{width:56px;height:56px;background:rgba(245,168,0,0.15);border:2px solid rgba(245,168,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;}

        /* LAYOUT */
        .layout-grid{display:grid;grid-template-columns:380px 1fr;gap:1.5rem;align-items:start;}

        /* PANEL */
        .panel{background:var(--glass-card);backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:18px;overflow:hidden;margin-bottom:1.25rem;}
        .panel:last-child{margin-bottom:0;}
        .panel-header{padding:1rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:0.75rem;}
        .panel-header h3{font-size:0.9rem;font-weight:600;}
        .panel-icon{width:34px;height:34px;background:rgba(245,168,0,0.15);border:1px solid rgba(245,168,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:var(--yellow);flex-shrink:0;}
        .panel-#root {padding:1.25rem 1.5rem;}

        /* FORM */
        .form-group{margin-bottom:1rem;}
        .form-group:last-child{margin-bottom:0;}
        .form-label{display:block;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-bottom:0.4rem;}
        .form-control{width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:0.7rem 0.9rem;color:white;font-family:'Poppins',sans-serif;font-size:0.85rem;transition:all 0.3s;outline:none;}
        .form-control::placeholder{color:var(--text-dim);}
        .form-control:focus{background:rgba(255,255,255,0.10);border-color:var(--yellow);box-shadow:0 0 0 3px rgba(245,168,0,0.12);}
        textarea.form-control{resize:vertical;min-height:80px;}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;}
        .btn-action{width:100%;background:var(--yellow);color:#1a1000;border:none;border-radius:10px;padding:0.8rem;font-family:'Poppins',sans-serif;font-size:0.88rem;font-weight:700;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:0.25rem;}
        .btn-action:hover{background:var(--yellow-d);transform:translateY(-1px);}

        /* TABLE */
        .tbl-wrap{overflow-x:auto;}
        table{width:100%;border-collapse:collapse;font-size:0.82rem;}
        thead tr{background:rgba(255,255,255,0.05);}
        th{padding:0.75rem 1rem;text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);white-space:nowrap;}
        td{padding:0.85rem 1rem;border-top:1px solid rgba(255,255,255,0.06);vertical-align:middle;}
        tbody tr:hover{background:rgba(255,255,255,0.04);}

        /* BADGES */
        .badge{display:inline-flex;align-items:center;gap:0.3rem;padding:3px 10px;border-radius:50px;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;}
        .badge-active{background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);}
        .badge-inactive{background:rgba(255,100,80,0.15);color:#ff8060;border:1px solid rgba(255,100,80,0.3);}
        .badge-code{background:rgba(245,168,0,0.15);color:var(--yellow);border:1px solid rgba(245,168,0,0.3);}

        .empty-state{padding:3rem 2rem;text-align:center;color:var(--text-dim);}
        .empty-state i{font-size:2rem;margin-bottom:0.75rem;display:block;opacity:0.4;}
        .empty-state p{font-size:0.85rem;}

        /* FOOTER */
        footer{background:rgba(0,0,0,0.5);backdrop-filter:blur(16px);border-top:1px solid var(--glass-border);padding:1.25rem 3rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;}
        .footer-brand{font-size:1.1rem;font-weight:700;color:white;}
        .footer-brand span{color:var(--yellow);}
        .footer-copy{font-size:0.72rem;color:var(--text-dim);}

        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px);}to{opacity:1;transform:translateX(0);}}

        @media(max-width:900px){.layout-grid{grid-template-columns:1fr;}.nav-links{display:none;}.nav-divider{display:none;}nav{padding:0.875rem 1.25rem;}.page{padding:5.5rem 1.25rem 2rem;}}
        @media(max-width:500px){.form-row{grid-template-columns:1fr;}}`;

    return (
        <div className="warehouse-mgmt-container">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i><span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({...p, success: null}))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i><span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({...p, failure: null}))}>×</button>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav className={isScrolled ? 'scrolled' : ''}>
                <Link to="/admin" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize: '1.1rem'}}></i><span>Ekart</span>
                </Link>
                <div className="nav-right">
                    <div className="nav-links">
                        <Link to="/admin" className="nav-link"><i className="fas fa-home"></i> Dashboard</Link>
                        <Link to="/admin/delivery" className="nav-link"><i className="fas fa-truck"></i> Delivery</Link>
                        <Link to="/admin/warehouse" className="nav-link active"><i className="fas fa-warehouse"></i> Warehouses</Link>
                    </div>
                    <div style={{width:'1px', height:'24px', background:'rgba(255,255,255,0.15)', margin:'0 0.5rem'}}></div>
                    <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>
                    <Link to="/admin/login" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</Link>
                </div>
            </nav>

            <main className="page">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1>Warehouse <span>Management</span></h1>
                        <p>Add warehouses and manage the pin codes they serve for delivery operations.</p>
                    </div>
                    <div style={{display:'flex', gap:'0.75rem', alignItems:'center'}}>
                        <Link to="/admin/delivery" style={{display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'rgba(255,255,255,0.07)', border:'1px solid var(--glass-border)', color:'var(--text-light)', textDecoration:'none', fontSize:'0.82rem', fontWeight:600, padding:'0.6rem 1.1rem', borderRadius:'10px'}}>
                            <i className="fas fa-arrow-left"></i> Back to Delivery
                        </Link>
                        <div className="page-header-icon"><i className="fas fa-warehouse" style={{color:'var(--yellow)'}}></i></div>
                    </div>
                </div>

                <div className="layout-grid">
                    {/* LEFT: Add Warehouse Form */}
                    <div>
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-icon"><i className="fas fa-plus"></i></div>
                                <h3>Add New Warehouse</h3>
                            </div>
                            <div style={{padding:'1.25rem 1.5rem'}}>
                                <div style={{marginBottom:'1rem'}}>
                                    <label style={{display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-dim)', marginBottom:'0.4rem'}}>Warehouse Name</label>
                                    <input type="text" id="wh-name" value={formData.name} onChange={handleInputChange} className="form-control" placeholder="e.g. Bengaluru Central Warehouse"/>
                                </div>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1rem'}}>
                                    <div>
                                        <label style={{display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-dim)', marginBottom:'0.4rem'}}>City</label>
                                        <input type="text" id="wh-city" value={formData.city} onChange={handleInputChange} className="form-control" placeholder="Bengaluru"/>
                                    </div>
                                    <div>
                                        <label style={{display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-dim)', marginBottom:'0.4rem'}}>State</label>
                                        <input type="text" id="wh-state" value={formData.state} onChange={handleInputChange} className="form-control" placeholder="Karnataka"/>
                                    </div>
                                </div>
                                <div style={{marginBottom:'1rem'}}>
                                    <label style={{display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-dim)', marginBottom:'0.4rem'}}>Served Pin Codes (comma separated)</label>
                                    <textarea id="wh-pins" value={formData.servedPinCodes} onChange={(e) => setFormData(p => ({...p, servedPinCodes: e.target.value}))} className="form-control" style={{minHeight:'80px'}} placeholder="560001,560002,560003"></textarea>
                                </div>
                                <button className="btn-action" onClick={addWarehouse}>
                                    <i className="fas fa-plus"></i> Add Warehouse
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Table */}
                    <div>
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-icon"><i className="fas fa-list"></i></div>
                                <h3>All Warehouses</h3>
                                <span style={{
                                    marginLeft: 'auto', 
                                    background: 'rgba(245,168,0,0.15)', 
                                    color: 'var(--yellow)', 
                                    border: '1px solid rgba(245,168,0,0.3)', 
                                    fontSize: '0.7rem', 
                                    fontWeight: 700, 
                                    padding: '0.2rem 0.6rem', 
                                    borderRadius: '20px' // Corrected camelCase
                                }}>
                                    {warehouses.length}
                                </span>
                            </div>
                            {warehouses.length === 0 ? (
                                <div style={{padding:'3rem 2rem', textAlign:'center', color:'var(--text-dim)'}}>
                                    <i className="fas fa-warehouse" style={{fontSize:'2rem', marginBottom:'0.75rem', display:'block', opacity:0.4}}></i>
                                    <p>No warehouses added yet.</p>
                                </div>
                            ) : (
                                <div style={{overflowX:'auto'}}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Code</th>
                                                <th>Name</th>
                                                <th>City / State</th>
                                                <th>Pin Codes</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {warehouses.map((wh, idx) => (
                                                <tr key={idx}>
                                                    <td><span className="badge badge-code">{wh.warehouseCode}</span></td>
                                                    <td><span style={{fontWeight:600, color:'white'}}>{wh.name}</span></td>
                                                    <td>{wh.city}<span style={{color:'var(--text-dim)'}}>, {wh.state}</span></td>
                                                    <td style={{maxWidth:'260px', fontSize:'0.75rem', color:'var(--text-dim)', wordBreak:'break-all'}}>{wh.servedPinCodes || '—'}</td>
                                                    <td>
                                                        {wh.active ? (
                                                            <span className="badge badge-active"><i className="fas fa-check"></i> Active</span>
                                                        ) : (
                                                            <span className="badge badge-inactive"><i className="fas fa-times"></i> Inactive</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* TOAST */}
            {toast.show && (
                <div className="toast-msg" style={{ borderColor: toast.isSuccess ? 'rgba(34,197,94,0.45)' : 'rgba(255,100,80,0.45)', color: toast.isSuccess ? '#22c55e' : '#ff8060' }}>
                    <i className={`fas fa-${toast.isSuccess ? 'check' : 'times'}-circle`}></i> {toast.msg}
                </div>
            )}

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}