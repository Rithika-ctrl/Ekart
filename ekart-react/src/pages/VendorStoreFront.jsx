import React, { useState, useEffect } from 'react';

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

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex; flex-direction: column;
        }

        /* ── Background ── */
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

        /* ── Navbar ── */
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
        .nav-right { display: flex; align-items: center; gap: 0.75rem; }
        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border); transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        /* ── Alert Stack ── */
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
        .alert-success { border-color: rgba(34,197,94,0.45);  color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── Page Layout ── */
        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 2rem;
        }
        .inner { width: 100%; max-width: 1000px; display: flex; flex-direction: column; gap: 2rem; }

        /* ── Page Header ── */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem;
            animation: fadeUp 0.45s ease both;
        }
        .page-header-left h1 { font-size: clamp(1.2rem, 2.5vw, 1.75rem); font-weight: 700; margin-bottom: 0.25rem; }
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

        /* ── Two-column grid ── */
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 1.75rem;
            align-items: start;
        }

        /* ── Glass Card ── */
        .glass-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.5rem;
            box-shadow: 0 40px 100px rgba(0,0,0,0.4);
            animation: fadeUp 0.5s ease 0.05s both;
        }

        /* ── Section Label ── */
        .section-label {
            display: flex; align-items: center; gap: 0.6rem;
            font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.12em;
            color: var(--yellow); margin-bottom: 1.25rem;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

        /* ── Form ── */
        .form-group { display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 1.25rem; }
        .form-group label {
            font-size: 0.72rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.1em;
            color: var(--text-dim); margin-left: 0.15rem;
        }
        .input-wrapper { position: relative; }
        .input-wrapper .input-icon {
            position: absolute; left: 1rem; top: 50%;
            transform: translateY(-50%);
            color: var(--text-dim); font-size: 0.875rem;
            transition: color 0.3s; pointer-events: none; z-index: 1;
        }
        .input-wrapper:focus-within .input-icon { color: var(--yellow); }

        .form-control {
            width: 100%;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 0.8rem 1rem 0.8rem 2.75rem;
            color: white; font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; transition: all 0.3s;
        }
        .form-control::placeholder { color: var(--text-dim); }
        .form-control:focus {
            outline: none; background: rgba(255,255,255,0.10);
            border-color: var(--yellow);
            box-shadow: 0 0 0 3px rgba(245,168,0,0.12);
        }
        .form-control[readonly] {
            opacity: 0.55; cursor: not-allowed;
        }
        .form-control[readonly]:focus {
            border-color: var(--glass-border);
            box-shadow: none; background: rgba(255,255,255,0.06);
        }

        /* ── Submit Button ── */
        .btn-submit {
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 12px; padding: 0.85rem 2rem;
            font-family: 'Poppins', sans-serif; font-size: 0.875rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow: 0 8px 24px rgba(245,168,0,0.25);
            display: inline-flex; align-items: center; gap: 0.5rem;
            margin-top: 0.75rem;
        }
        .btn-submit:hover { background: var(--yellow-d); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(245,168,0,0.42); }
        .btn-submit:active { transform: translateY(0); }

        /* ── Stat Cards (sidebar) ── */
        .stats-stack { display: flex; flex-direction: column; gap: 1rem; animation: fadeUp 0.5s ease 0.1s both; }

        .stat-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 16px; padding: 1.4rem 1.5rem;
            display: flex; align-items: center; gap: 1rem;
            position: relative; overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,0.3); }
        .stat-card::before {
            content: ''; position: absolute; top: 0; left: 0;
            width: 4px; height: 100%; border-radius: 4px 0 0 4px;
        }
        .stat-card.blue::before   { background: #3b82f6; }
        .stat-card.orange::before { background: var(--yellow); }
        .stat-card.green::before  { background: #22c55e; }
        .stat-card.red::before    { background: #ef4444; }

        .stat-icon {
            width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem;
        }
        .stat-card.blue   .stat-icon { background: rgba(59,130,246,0.15); color: #3b82f6; }
        .stat-card.orange .stat-icon { background: rgba(245,168,0,0.15);  color: var(--yellow); }
        .stat-card.green  .stat-icon { background: rgba(34,197,94,0.15);  color: #22c55e; }
        .stat-card.red    .stat-icon { background: rgba(239,68,68,0.15);  color: #ef4444; }

        .stat-body { flex: 1; }
        .stat-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); margin-bottom: 0.2rem; }
        .stat-val   { font-size: 1.55rem; font-weight: 800; color: var(--text-white); line-height: 1; }

        /* Verified badge styling */
        .verified-badge {
            display: inline-flex; align-items: center; gap: 0.4rem;
            font-size: 0.78rem; font-weight: 700; padding: 0.2rem 0.7rem;
            border-radius: 20px;
        }
        .verified-badge.yes { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .verified-badge.no  { background: rgba(239,68,68,0.12);  color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }
        
        /* ── Vendor ID Badge ── */
        .vendor-id-card { background: linear-gradient(135deg, rgba(245,168,0,0.18), rgba(245,168,0,0.06)); border-color: rgba(245,168,0,0.4) !important; }
        .vendor-id-code {
            font-size: 1.3rem; font-weight: 800; color: var(--yellow);
            letter-spacing: 0.08em; line-height: 1;
            font-family: 'Courier New', monospace;
        }
        .vendor-id-copy {
            background: none; border: 1px solid rgba(245,168,0,0.35);
            color: var(--yellow); border-radius: 6px;
            padding: 0.2rem 0.55rem; font-size: 0.7rem; font-weight: 600;
            cursor: pointer; transition: all 0.2s; margin-top: 0.4rem;
            display: inline-flex; align-items: center; gap: 0.3rem;
        }
        .vendor-id-copy:hover { background: rgba(245,168,0,0.15); }
        .vendor-id-copy.copied { color: #22c55e; border-color: rgba(34,197,94,0.4); }


        /* ── Summary card header ── */
        .summary-header {
            display: flex; align-items: center; gap: 0.6rem;
            font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.12em;
            color: var(--yellow); margin-bottom: 1.25rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--glass-border);
        }

        /* ── Footer ── */
        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        /* ── Animations ── */
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        /* ── Responsive ── */
        @media(max-width: 800px) {
            .content-grid { grid-template-columns: 1fr; }
            .stats-stack { flex-direction: row; flex-wrap: wrap; }
            .stat-card { flex: 1 1 calc(50% - 0.5rem); }
        }
        @media(max-width: 600px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .glass-card { padding: 1.75rem 1.25rem; }
            .stats-stack { flex-direction: column; }
            .stat-card { flex: unset; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }
`;

/**
 * VendorStoreFront Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {Object} props.vendor - Vendor details object
 * @param {string|null} props.vendor.name - Name of the vendor
 * @param {string|null} props.vendor.email - Email of the vendor
 * @param {string|null} props.vendor.mobile - Mobile of the vendor
 * @param {string|null} props.vendor.vendorCode - Unique vendor ID
 * @param {boolean} props.vendor.verified - Verification status
 * @param {number} props.productCount - Number of products listed
 * @param {number} props.alertCount - Number of stock alerts
 * @param {string|null} props.csrfToken - CSRF token
 */
export default function VendorStoreFront({
    successMessage = null,
    failureMessage = null,
    vendor = { name: '', email: '', mobile: '', vendorCode: 'VND-00001', verified: false },
    productCount = 0,
    alertCount = 0,
    csrfToken = null
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => setFadeAlerts(true), 2500);
            const timer2 = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 3000);
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        }
    }, [showSuccess, showFailure]);

    const copyVendorId = () => {
        if (!vendor.vendorCode) return;
        navigator.clipboard.writeText(vendor.vendorCode).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        });
    };

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Store Front</title>
            <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3Cpath fill='%23f5a800' d='M528.12 301.319l47.273-208C578.806 78.301 567.391 64 551.99 64H159.208l-9.166-44.81C147.758 8.021 137.93 0 126.529 0H24C10.745 0 0 10.745 0 24v16c0 13.255 10.745 24 24 24h69.883l70.248 343.435C147.325 417.1 136 435.222 136 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-15.674-6.447-29.835-16.824-40h209.647C430.447 426.165 424 440.326 424 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-22.172-12.888-41.332-31.579-50.405l5.517-24.276c3.413-15.018-8.002-29.319-23.403-29.319H218.117l-6.545-32h293.145c11.206 0 20.92-7.754 23.403-18.681z'/%3E%3C/svg%3E" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* Alert Stack */}
            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={alertStyle}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            {/* Navbar */}
            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <a href="/vendor/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </a>
                <div className="nav-right">
                    <a href="/vendor/home" className="nav-link-btn"><i className="fas fa-th-large"></i> Dashboard</a>
                    <a href="/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="inner">

                    {/* Page Header */}
                    <div className="page-header">
                        <div className="page-header-left">
                            <h1><span>Store Front</span> Profile 🏪</h1>
                            <p>Manage your seller details and review your store summary at a glance.</p>
                        </div>
                        <div className="page-header-icon">🛍️</div>
                    </div>

                    {/* Two-column layout */}
                    <div className="content-grid">

                        {/* Left: Profile Form */}
                        <div className="glass-card">
                            <div className="section-label"><i className="fas fa-user-circle"></i> Store Details</div>

                            <form action="/vendor/store-front/update" method="post">
                                {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                                
                                {/* Store Owner Name */}
                                <div className="form-group">
                                    <label htmlFor="name">Store Owner Name</label>
                                    <div className="input-wrapper">
                                        <i className="fas fa-user input-icon"></i>
                                        <input type="text" id="name" name="name" className="form-control"
                                               defaultValue={vendor.name} placeholder="Your full name" required />
                                    </div>
                                </div>

                                {/* Email (readonly) */}
                                <div className="form-group">
                                    <label htmlFor="email">Email Address <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem', textTransform: 'none', letterSpacing: 0 }}>(read-only)</span></label>
                                    <div className="input-wrapper">
                                        <i className="fas fa-envelope input-icon"></i>
                                        <input type="email" id="email" className="form-control"
                                               defaultValue={vendor.email} readOnly />
                                    </div>
                                </div>

                                {/* Mobile */}
                                <div className="form-group">
                                    <label htmlFor="mobile">Mobile Number</label>
                                    <div className="input-wrapper">
                                        <i className="fas fa-phone input-icon"></i>
                                        <input type="tel" id="mobile" name="mobile" className="form-control"
                                               defaultValue={vendor.mobile} placeholder="e.g. 9876543210" required />
                                    </div>
                                </div>

                                <button type="submit" className="btn-submit">
                                    <i className="fas fa-save"></i> Update Profile
                                </button>

                            </form>
                        </div>

                        {/* Right: Store Summary */}
                        <div className="stats-stack">

                            {/* Header label above the cards */}
                            <div className="summary-header">
                                <i className="fas fa-chart-line"></i> Store Summary
                            </div>


                            {/* Vendor ID Badge */}
                            <div className="stat-card vendor-id-card">
                                <div className="stat-icon" style={{ background: 'rgba(245,168,0,0.15)', color: 'var(--yellow)' }}>
                                    <i className="fas fa-id-badge"></i>
                                </div>
                                <div className="stat-body">
                                    <div className="stat-label">Vendor ID</div>
                                    <div className="vendor-id-code">{vendor.vendorCode || 'N/A'}</div>
                                    {vendor.vendorCode && (
                                        <button className={`vendor-id-copy ${isCopied ? 'copied' : ''}`}
                                                onClick={copyVendorId}>
                                            <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'}`}></i> {isCopied ? 'Copied!' : 'Copy ID'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Products Listed */}
                            <div className="stat-card blue">
                                <div className="stat-icon"><i className="fas fa-boxes"></i></div>
                                <div className="stat-body">
                                    <div className="stat-label">Products Listed</div>
                                    <div className="stat-val">{productCount}</div>
                                </div>
                            </div>

                            {/* Stock Alerts */}
                            <div className="stat-card orange">
                                <div className="stat-icon"><i className="fas fa-bell"></i></div>
                                <div className="stat-body">
                                    <div className="stat-label">Open Stock Alerts</div>
                                    <div className="stat-val">{alertCount}</div>
                                </div>
                            </div>

                            {/* Verified Status */}
                            <div className={`stat-card ${vendor.verified ? 'green' : 'red'}`}>
                                <div className="stat-icon">
                                    <i className={`fas ${vendor.verified ? 'fa-shield-check' : 'fa-shield-xmark'}`}></i>
                                </div>
                                <div className="stat-body">
                                    <div className="stat-label">Profile Verified</div>
                                    <div style={{ marginTop: '0.2rem' }}>
                                        {vendor.verified ? (
                                            <span className="verified-badge yes">
                                                <i className="fas fa-check-circle"></i> Verified
                                            </span>
                                        ) : (
                                            <span className="verified-badge no">
                                                <i className="fas fa-times-circle"></i> Not Verified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </>
    );
}