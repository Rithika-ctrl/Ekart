import React, { useState, useEffect } from 'react';

/**
 * ContentManagement Component
 * @param {Object} props
 * @param {string} props.bannerTitle - Current title of the homepage banner
 * @param {string} props.bannerSubtitle - Current subtitle of the homepage banner
 * @param {number} props.productCount - Total number of products on the platform
 * @param {number} props.categoryCount - Total number of categories on the platform
 * @param {Object} props.session - Session object for notifications {success: string, failure: string}
 * @param {string} props.csrfToken - CSRF token value for security
 */
export default function ContentManagement({
    bannerTitle = "Welcome to Ekart",
    bannerSubtitle = "Your one-stop shopping destination",
    productCount = 0,
    categoryCount = 0,
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [title, setTitle] = useState(bannerTitle);
    const [subtitle, setSubtitle] = useState(bannerSubtitle);
    const [alerts, setAlerts] = useState({ 
        success: session.success, 
        failure: session.failure 
    });

    // --- EFFECTS ---
    useEffect(() => {
        // Auto-dismiss alerts after 2.5 seconds
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);
        return () => clearTimeout(timer);
    }, [session]);

    // --- CSS ---
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

        .content-mgmt-container {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            position: relative;
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
            max-width: 900px;
            margin: 0 auto;
            width: 100%;
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
        .page-header-icon { font-size: 2.5rem; }

        /* ── FORM CARD ── */
        .form-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 2rem;
        }
        .form-card h2 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .form-card h2 i { color: var(--yellow); }

        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--text-dim);
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 0.875rem 1rem;
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--glass-border);
            border-radius: 10px;
            color: white;
            font-family: inherit;
            font-size: 0.9rem;
            transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: var(--yellow);
        }
        .form-group textarea {
            resize: vertical;
            min-height: 100px;
        }

        .btn-submit {
            padding: 0.875rem 2rem;
            background: linear-gradient(135deg, var(--yellow), var(--yellow-d));
            border: none;
            border-radius: 10px;
            color: #1a1000;
            font-family: inherit;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(245,168,0,0.3);
        }

        /* ── CONTENT PREVIEW ── */
        .preview-section {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 2rem;
        }
        .preview-section h2 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .preview-section h2 i { color: var(--yellow); }

        .preview-banner {
            background: linear-gradient(135deg, rgba(245,168,0,0.15), rgba(245,168,0,0.05));
            border: 1px solid rgba(245,168,0,0.3);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
        }
        .preview-banner h3 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        .preview-banner p {
            color: var(--text-dim);
            font-size: 0.9rem;
        }

        /* ── STATS GRID ── */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-top: 1.5rem;
        }
        .stat-item {
            background: rgba(0,0,0,0.2);
            border-radius: 10px;
            padding: 1rem;
            text-align: center;
        }
        .stat-item-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--yellow);
        }
        .stat-item-label {
            font-size: 0.75rem;
            color: var(--text-dim);
            margin-top: 0.2rem;
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
        }
        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .stats-grid { grid-template-columns: 1fr; }
            footer { flex-direction: column; text-align: center; gap: 0.5rem; }
        }
    `;

    return (
        <div className="content-mgmt-container">
            <style>{CSS}</style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            <div className="bg-layer"></div>

            {/* ── FLOATING ALERTS ── */}
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

            {/* ── NAV ── */}
            <nav id="nav">
                <a href="/admin/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    Ekart
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        <a href="/admin/home" className="nav-link"><i className="fas fa-home"></i> Dashboard</a>
                        <a href="/approve-products" className="nav-link"><i className="fas fa-tasks"></i> Approvals</a>
                        <a href="/admin/search-users" className="nav-link"><i className="fas fa-users"></i> Users</a>
                    </div>
                    <div className="nav-divider"></div>
                    <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>
                    <a href="/admin/logout" className="btn-logout">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            {/* ── PAGE ── */}
            <main className="page">

                {/* Page Header */}
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Content <span>Management</span> ✏️</h1>
                        <p>Edit banners, announcements, and site-wide content.</p>
                    </div>
                    <div className="page-header-icon">📝</div>
                </div>

                {/* Banner Settings Form */}
                <div className="form-card">
                    <h2><i className="fas fa-image"></i> Banner Settings</h2>
                    <form action="/update-banner" method="post">
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        <div className="form-group">
                            <label htmlFor="bannerTitle">Banner Title</label>
                            <input 
                                type="text" 
                                id="bannerTitle" 
                                name="bannerTitle" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter banner title" 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="bannerSubtitle">Banner Subtitle</label>
                            <textarea 
                                id="bannerSubtitle" 
                                name="bannerSubtitle" 
                                placeholder="Enter banner subtitle" 
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-submit">
                            <i className="fas fa-save"></i> Save Changes
                        </button>
                    </form>
                </div>

                {/* Preview Section */}
                <div className="preview-section">
                    <h2><i className="fas fa-eye"></i> Live Preview</h2>
                    <div className="preview-banner">
                        <h3>{title || 'Banner Title'}</h3>
                        <p>{subtitle || 'Banner subtitle'}</p>
                    </div>

                    {/* Content Stats */}
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-item-value">{productCount}</div>
                            <div className="stat-item-label">Total Products</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-item-value">{categoryCount}</div>
                            <div className="stat-item-label">Categories</div>
                        </div>
                    </div>
                </div>

            </main>

            {/* ── FOOTER ── */}
            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}