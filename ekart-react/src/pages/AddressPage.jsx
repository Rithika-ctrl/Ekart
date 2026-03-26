import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - Shipping Details Component
 * * @param {Object} props
 * @param {Object} props.customer - Customer object containing saved addresses
 * @param {Object} props.session - Session object for notifications {success: string, failure: string}
 * @param {string} props.csrfToken - Security token for form submission
 */
export default function AddressPage({ 
    customer = { addresses: [] }, 
    session = { success: null, failure: null },
    csrfToken = "" 
}) {
    // --- STATE ---
    const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
    const [scrolled, setScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    const [homePin, setHomePin] = useState(null);
    const [formData, setFormData] = useState({
        recipientName: '',
        houseStreet: '',
        city: '',
        state: '',
        postalCode: ''
    });
    const [errors, setErrors] = useState({});
    const [pinMismatch, setPinMismatch] = useState(false);
    const [activeAddressWarning, setActiveAddressWarning] = useState(null);

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);

        const storedPin = localStorage.getItem('ekart_delivery_pin');
        if (storedPin && storedPin.length === 6) {
            setHomePin(storedPin);
        }

        const alertTimer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(alertTimer);
        };
    }, []);

    // --- LOGIC ---
    const isIndianPin = (val) => {
        if (!/^\d{6}$/.test(val)) return false;
        const prefix = val.slice(0, 2);
        const validPrefixes = new Set([
            '11','12','13','14','15','16','17','18','19',
            '20','21','22','23','24','25','26','27','28',
            '30','31','32','33','34','36','37','38','39',
            '40','41','42','43','44','45','46','47','48','49',
            '50','51','52','53','56','57','58','59',
            '60','61','62','63','64','65','66','67','68','69',
            '70','71','72','73','74','75','76','77','78','79',
            '80','81','82','83','84','85',
            '90','91','92','93','94','95','96','97','98','99'
        ]);
        return validPrefixes.has(prefix);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let cleanedValue = value;

        if (name === 'postalCode') {
            cleanedValue = value.replace(/[^0-9]/g, '').slice(0, 6);
            if (cleanedValue.length === 6 && homePin && cleanedValue !== homePin) {
                setPinMismatch(true);
            } else {
                setPinMismatch(false);
            }
        }

        setFormData(prev => ({ ...prev, [name]: cleanedValue }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
    };

    const validateForm = (e) => {
        const newErrors = {};
        if (formData.recipientName.trim().length < 2) newErrors.recipientName = true;
        if (formData.houseStreet.trim().length < 5) newErrors.houseStreet = true;
        if (formData.city.trim().length < 2) newErrors.city = true;
        if (formData.state.trim().length < 2) newErrors.state = true;
        if (!isIndianPin(formData.postalCode)) newErrors.postalCode = true;

        if (Object.keys(newErrors).length > 0 || (homePin && formData.postalCode !== homePin)) {
            e.preventDefault();
            setErrors(newErrors);
            if (homePin && formData.postalCode !== homePin) setPinMismatch(true);
            return false;
        }
        return true;
    };

    const useSavedAddress = (addr) => {
        const addrPin = (addr.postalCode || '').trim();
        if (!homePin || homePin.length !== 6 || addrPin === homePin) {
            navigate('/payment');
            return;
        }
        setActiveAddressWarning(addr.id);
    };

    const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255,255,255,0.22);
            --glass-card:   rgba(255,255,255,0.13);
            --glass-nav:    rgba(0,0,0,0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
            --input-bg:     rgba(255,255,255,0.07);
            --input-border: rgba(255,255,255,0.18);
            --success:      #22c55e;
        }

        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; }

        #root {
            font-family:'Poppins', sans-serif;
            min-height:100vh;
            color:var(--text-white);
            display:flex; flex-direction:column;
        }

        /* ── BACKGROUND ── */
        .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
        .bg-layer::before {
            content:''; position:absolute; inset:-20px;
            background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter:blur(6px); transform:scale(1.08);
        }
        .bg-layer::after {
            content:''; position:absolute; inset:0;
            background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%);
        }

        /* ── NAV ── */
        nav {
            position:fixed; top:0; left:0; right:0; z-index:100;
            padding:1rem 3rem;
            display:flex; align-items:center; justify-content:space-between;
            background:var(--glass-nav); backdrop-filter:blur(14px);
            border-bottom:1px solid var(--glass-border); transition:background 0.3s;
        }
        nav.scrolled { background:rgba(0,0,0,0.45); }
        .nav-brand {
            font-size:1.6rem; font-weight:700; color:var(--text-white);
            text-decoration:none; letter-spacing:0.04em;
            display:flex; align-items:center; gap:0.5rem;
        }
        .nav-right { display:flex; align-items:center; gap:0.75rem; }
        .nav-link-btn {
            display:flex; align-items:center; gap:0.4rem;
            color:var(--text-light); text-decoration:none;
            font-size:0.82rem; font-weight:500;
            padding:0.45rem 0.9rem; border-radius:6px;
            border:1px solid var(--glass-border); transition:all 0.2s;
        }
        .nav-link-btn:hover { color:white; background:rgba(255,255,255,0.1); }
        .btn-logout {
            display:flex; align-items:center; gap:0.4rem;
            color:var(--text-light); text-decoration:none;
            font-size:0.82rem; font-weight:500;
            padding:0.45rem 0.9rem; border-radius:6px;
            border:1px solid rgba(255,100,80,0.3); transition:all 0.2s;
        }
        .btn-logout:hover { color:#ff8060; border-color:rgba(255,100,80,0.6); background:rgba(255,100,80,0.08); }

        /* ── ALERTS ── */
        .alert-stack { position:fixed; top:5rem; right:1.5rem; z-index:200; display:flex; flex-direction:column; gap:0.5rem; }
        .alert {
            padding:0.875rem 1.25rem; background:rgba(10,12,30,0.88); backdrop-filter:blur(16px);
            border:1px solid; border-radius:10px; display:flex; align-items:center; gap:0.625rem;
            font-size:0.825rem; min-width:260px; animation:slideIn 0.3s ease both;
        }
        .alert-success { border-color:rgba(34,197,94,0.45); color:#22c55e; }
        .alert-danger  { border-color:rgba(255,100,80,0.45); color:#ff8060; }
        .alert-close { margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; opacity:0.6; font-size:1rem; }

        /* ── PAGE ── */
        .page-center {
            flex:1; display:flex; align-items:center; justify-content:center;
            padding:7rem 1.5rem 3rem;
        }

        /* ── PANEL ── */
        .shipping-panel {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:20px;
            padding:2.75rem; width:100%; max-width:560px;
            box-shadow:0 40px 100px rgba(0,0,0,0.5);
            animation:fadeUp 0.5s cubic-bezier(0.23,1,0.32,1) both;
        }

        /* ── PANEL HEADER ── */
        .panel-header { display:flex; align-items:center; gap:1.1rem; margin-bottom:2rem; }
        .panel-header-icon {
            width:52px; height:52px; flex-shrink:0;
            background:rgba(245,168,0,0.15); border:2px solid rgba(245,168,0,0.3);
            border-radius:50%; display:flex; align-items:center; justify-content:center;
            font-size:1.25rem; color:var(--yellow);
        }
        .panel-header-text h2 { font-size:1.35rem; font-weight:700; margin-bottom:0.2rem; }
        .panel-header-text p  { font-size:0.78rem; color:var(--text-dim); }

        /* ── PROGRESS STEPS ── */
        .steps { display:flex; align-items:center; margin-bottom:2rem; }
        .step { display:flex; flex-direction:column; align-items:center; gap:0.35rem; flex:1; }
        .step-dot {
            width:28px; height:28px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:0.65rem; font-weight:800;
            border:2px solid var(--glass-border); color:var(--text-dim);
            background:rgba(255,255,255,0.05); transition:all 0.3s;
        }
        .step.active .step-dot { background:var(--yellow); border-color:var(--yellow); color:#1a1000; box-shadow:0 0 0 4px rgba(245,168,0,0.2); }
        .step.done   .step-dot { background:rgba(34,197,94,0.2); border-color:#22c55e; color:#22c55e; }
        .step-label { font-size:0.62rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; }
        .step.active .step-label { color:var(--yellow); }
        .step.done   .step-label { color:#22c55e; }
        .step-line { flex:1; height:1px; background:var(--glass-border); margin-bottom:1.1rem; }
        .step-line.done { background:rgba(34,197,94,0.4); }

        /* ── SECTION LABEL ── */
        .section-label {
            display:flex; align-items:center; gap:0.5rem;
            font-size:0.68rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.12em; color:var(--yellow); margin-bottom:1rem;
        }
        .section-label::after { content:''; flex:1; height:1px; background:var(--glass-border); }

        /* ── SAVED ADDRESS CARDS ── */
        .address-card {
            background:rgba(255,255,255,0.06); border:1px solid var(--glass-border);
            border-radius:14px; padding:1.2rem 1.4rem; margin-bottom:0.875rem;
            transition:all 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        .address-card:hover {
            border-color:rgba(245,168,0,0.4); background:rgba(245,168,0,0.05);
            transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,0,0,0.25);
        }
        .addr-recipient { font-size:0.85rem; font-weight:700; color:var(--text-white); margin-bottom:0.2rem; }
        .addr-line      { font-size:0.80rem; color:var(--text-light); line-height:1.55; }
        .addr-pin       { display:inline-flex; align-items:center; gap:0.3rem; margin-top:0.45rem; font-size:0.72rem; font-weight:700; color:var(--yellow); }
        .address-actions { display:flex; align-items:center; justify-content:space-between; margin-top:1rem; }

        .btn-use-address {
            display:inline-flex; align-items:center; gap:0.4rem;
            background:var(--yellow); color:#1a1000; border:none;
            padding:0.45rem 1.1rem; border-radius:50px;
            font-family:'Poppins',sans-serif; font-size:0.72rem; font-weight:700;
            letter-spacing:0.06em; text-transform:uppercase; cursor:pointer;
            transition:all 0.25s; text-decoration:none;
            box-shadow:0 4px 14px rgba(245,168,0,0.25);
        }
        .btn-use-address:hover { background:var(--yellow-d); transform:translateY(-1px); box-shadow:0 6px 18px rgba(245,168,0,0.4); }

        .btn-delete-address {
            display:inline-flex; align-items:center; gap:0.35rem;
            color:rgba(255,100,80,0.6); text-decoration:none; font-size:0.72rem; font-weight:600;
            transition:color 0.2s; background:none; border:none; cursor:pointer;
            font-family:'Poppins',sans-serif;
        }
        .btn-delete-address:hover { color:#ff8060; }

        /* ── DIVIDER ── */
        .panel-divider { border:none; border-top:1px solid var(--glass-border); margin:1.75rem 0; }

        /* ── FORM GRID ── */
        .form-grid {
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:1rem;
        }
        .form-grid .full { grid-column:1 / -1; }

        .field-group { display:flex; flex-direction:column; gap:0.4rem; }
        .field-label {
            font-size:0.68rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.08em; color:var(--text-dim);
            display:flex; align-items:center; gap:0.35rem;
        }
        .field-label i { font-size:0.6rem; }
        .field-label .req { color:var(--yellow); }

        .form-input {
            width:100%; background:var(--input-bg); border:1px solid var(--input-border);
            border-radius:10px; padding:0.75rem 1rem;
            color:white; font-family:'Poppins',sans-serif; font-size:0.875rem;
            outline:none; transition:all 0.25s;
        }
        .form-input::placeholder { color:var(--text-dim); font-size:0.8rem; }
        .form-input:focus {
            background:rgba(255,255,255,0.10); border-color:var(--yellow);
            box-shadow:0 0 0 3px rgba(245,168,0,0.12);
        }
        .form-input.error { border-color:rgba(255,100,80,0.6); }
        .field-hint { font-size:0.65rem; color:var(--text-dim); margin-top:0.1rem; }
        .field-error { font-size:0.65rem; color:#ff8060; margin-top:0.1rem; display:none; }

        /* Pin code row */
        .pin-row { display:flex; gap:0.5rem; align-items:flex-end; }
        .pin-row .form-input { flex:1; }

        /* Address preview */
        .addr-preview {
            background:rgba(245,168,0,0.06); border:1px dashed rgba(245,168,0,0.3);
            border-radius:12px; padding:1rem 1.25rem;
            font-size:0.82rem; color:var(--text-light); line-height:1.7;
            margin-top:1rem; display:none;
        }
        .addr-preview.visible { display:block; }
        .addr-preview .preview-label {
            font-size:0.62rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.1em; color:var(--yellow); margin-bottom:0.5rem;
        }

        /* ── SUBMIT BUTTON ── */
        .btn-submit {
            width:100%; background:var(--yellow); color:#1a1000;
            border:none; border-radius:12px; padding:0.95rem;
            margin-top:1.25rem;
            font-family:'Poppins',sans-serif; font-size:0.875rem; font-weight:700;
            letter-spacing:0.06em; text-transform:uppercase; cursor:pointer;
            transition:all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow:0 8px 24px rgba(245,168,0,0.25);
            display:flex; align-items:center; justify-content:center; gap:0.5rem;
        }
        .btn-submit:hover { background:var(--yellow-d); transform:translateY(-2px); box-shadow:0 12px 32px rgba(245,168,0,0.42); }
        .btn-submit:active { transform:translateY(0); }

        /* ── BACK LINK ── */
        .back-link {
            display:flex; align-items:center; justify-content:center; gap:0.4rem;
            margin-top:1.5rem; color:var(--text-dim); text-decoration:none;
            font-size:0.78rem; transition:color 0.2s;
        }
        .back-link:hover { color:var(--text-white); }

        /* ── FOOTER ── */
        footer {
            background:rgba(0,0,0,0.5); backdrop-filter:blur(16px);
            border-top:1px solid var(--glass-border); padding:1.25rem 3rem;
            display:flex; align-items:center; justify-content:space-between;
            flex-wrap:wrap; gap:0.75rem;
        }
        .footer-brand { font-size:1.1rem; font-weight:700; color:white; }
        .footer-copy  { font-size:0.72rem; color:var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

        /* ── RESPONSIVE ── */
        @media(max-width:600px) {
            nav { padding:0.875rem 1.25rem; }
            .shipping-panel { padding:2rem 1.25rem; }
            .form-grid { grid-template-columns:1fr; }
            .form-grid .full { grid-column:1; }
            footer { padding:1.25rem; flex-direction:column; text-align:center; }
        }`;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts(a => ({...a, success:null}))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts(a => ({...a, failure:null}))}>×</button>
                    </div>
                )}
            </div>

            <nav className={scrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i> Ekart
                </a>
                <div className="nav-right">
                    <Link to="/cart" className="nav-link-btn"><i className="fas fa-shopping-cart"></i> Cart</Link>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page-center">
                <div className="shipping-panel">
                    <div className="panel-header">
                        <div className="panel-header-icon"><i className="fas fa-truck"></i></div>
                        <div className="panel-header-text">
                            <h2>Shipping Details</h2>
                            <p>Choose a saved address or enter a new delivery address.</p>
                        </div>
                    </div>

                    <div className="steps">
                        <div className="step done">
                            <div className="step-dot"><i className="fas fa-check" style={{ fontSize: '0.6rem' }}></i></div>
                            <span className="step-label">Cart</span>
                        </div>
                        <div className="step-line done"></div>
                        <div className="step active">
                            <div className="step-dot">2</div>
                            <span className="step-label">Shipping</span>
                        </div>
                        <div className="step-line"></div>
                        <div className="step">
                            <div className="step-dot">3</div>
                            <span className="step-label">Payment</span>
                        </div>
                    </div>

                    {customer.addresses && customer.addresses.length > 0 && (
                        <>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--yellow)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <i className="fas fa-map-marker-alt"></i> Saved Addresses
                            </div>
                            {customer.addresses.map(addr => (
                                <div key={addr.id} className="address-card" style={{
                                    border: activeAddressWarning === addr.id ? '1px solid rgba(255,96,60,0.5)' : '1px solid var(--glass-border)',
                                    background: activeAddressWarning === addr.id ? 'rgba(255,96,60,0.1)' : 'rgba(255,255,255,0.06)'
                                }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>{addr.recipientName || addr.details}</div>
                                    <div style={{ fontSize: '0.80rem', color: 'var(--text-light)' }}>{addr.houseStreet}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                                        <button onClick={() => useSavedAddress(addr)} style={{ background: 'var(--yellow)', color: '#1a1000', border: 'none', padding: '0.45rem 1.1rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                            USE THIS ADDRESS
                                        </button>
                                        <a href={`/customer/delete-address/${addr.id}`} style={{ color: 'rgba(255,100,80,0.6)', textDecoration: 'none', fontSize: '0.72rem', fontWeight: 600 }}>
                                            DELETE
                                        </a>
                                    </div>
                                    {activeAddressWarning === addr.id && (
                                        <div style={{ marginTop: '0.75rem', background: 'rgba(255,96,60,0.1)', border: '1.5px solid rgba(255,96,60,0.45)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#ff8060' }}>
                                            <i className="fas fa-exclamation-triangle"></i> PIN Mismatch with {homePin}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1.75rem 0' }} />
                        </>
                    )}

                    <form action="/customer/save-address" method="post" onSubmit={validateForm}>
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--yellow)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <i className="fas fa-location-dot"></i> New Address
                        </div>

                        <div className="form-grid">
                            <div className="field-group full">
                                <label className="field-label">
                                    <i className="fas fa-user"></i> RECIPIENT NAME <span className="req">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="recipientName" 
                                    className={`form-input ${errors.recipientName ? 'error' : ''}`} 
                                    placeholder="Full name of the person receiving the order"
                                    value={formData.recipientName} 
                                    onChange={handleInputChange} 
                                    required 
                                />
                            </div>

                            <div className="field-group full">
                                <label className="field-label">
                                    <i className="fas fa-home"></i> HOUSE / BUILDING & STREET <span className="req">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="houseStreet" 
                                    className={`form-input ${errors.houseStreet ? 'error' : ''}`} 
                                    placeholder="e.g. Flat 4B, Sunrise Apts, MG Road"
                                    value={formData.houseStreet} 
                                    onChange={handleInputChange} 
                                    required 
                                />
                                <span className="field-hint">Include flat/house number, building name, and street.</span>
                            </div>

                            {/* City and State side-by-side */}
                            <div className="field-group">
                                <label className="field-label">
                                    <i className="fas fa-city"></i> CITY / LOCALITY <span className="req">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="city" 
                                    className={`form-input ${errors.city ? 'error' : ''}`} 
                                    placeholder="e.g. Bengaluru"
                                    value={formData.city} 
                                    onChange={handleInputChange} 
                                    required 
                                />
                            </div>

                            <div className="field-group">
                                <label className="field-label">
                                    <i className="fas fa-map"></i> STATE / PROVINCE <span className="req">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="state" 
                                    className={`form-input ${errors.state ? 'error' : ''}`} 
                                    placeholder="e.g. Karnataka"
                                    value={formData.state} 
                                    onChange={handleInputChange} 
                                    required 
                                />
                            </div>

                            <div className="field-group full">
                                <label className="field-label">
                                    <i className="fas fa-envelope"></i> POSTAL CODE <span className="req">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="postalCode" 
                                    className={`form-input ${errors.postalCode || pinMismatch ? 'error' : ''}`} 
                                    placeholder="6-digit PIN code"
                                    value={formData.postalCode} 
                                    onChange={handleInputChange} 
                                    required 
                                />
                            </div>
                        </div>

                        {pinMismatch && (
                            <div style={{ background: 'rgba(255,96,60,0.12)', border: '1.5px solid rgba(255,96,60,0.5)', borderRadius: '12px', padding: '1rem', marginTop: '1.5rem', color: '#ff8060', fontSize: '0.82rem' }}>
                                <i className="fas fa-exclamation-triangle"></i> PIN Mismatch: Your delivery location is set to <strong>{homePin}</strong>.
                            </div>
                        )}

                        <button type="submit" className="btn-submit">
                            <i className="fas fa-chevron-right"></i> SAVE & CONTINUE TO PAYMENT
                        </button>
                    </form>

                    <Link to="/cart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.5rem', color: 'var(--text-dim)', textDecoration: 'none', fontSize: '0.78rem' }}>
                        <i className="fas fa-arrow-left"></i> Back to Cart
                    </Link>
                </div>
            </main>

            <footer style={{ background: 'rgba(0,0,0,0.5)', padding: '1.25rem 3rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ fontWeight: 700 }}>Ekart</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}