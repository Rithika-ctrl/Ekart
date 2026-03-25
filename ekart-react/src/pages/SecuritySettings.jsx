import React, { useState, useEffect } from 'react';

/**
 * SecuritySettings Component
 * * @param {Object} props
 * @param {string} props.adminEmail - The email address of the current admin.
 * @param {string} props.lastLoginTime - The timestamp of the last login.
 * @param {number} props.customerCount - Total number of registered customers.
 * @param {number} props.vendorCount - Total number of registered vendors.
 * @param {Object} props.session - Session notification object {success: string, failure: string}.
 * @param {string} props.csrfToken - CSRF token value for security.
 */
export default function SecuritySettings({
    adminEmail = "admin@ekart.com",
    lastLoginTime = "",
    customerCount = 0,
    vendorCount = 0,
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
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

        .security-mgmt-container {
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

        /* ── INFO CARDS ── */
        .info-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 2rem;
        }
        .info-card h2 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center; gap: 0.5rem;
        }
        .info-card h2 i { color: var(--yellow); }

        .info-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .info-row:last-child { border-bottom: none; }
        .info-row-label { font-size: 0.85rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.5rem; }
        .info-row-label i { color: var(--yellow); font-size: 0.9rem; }
        
        .status-badge {
            padding: 0.3rem 0.75rem; border-radius: 20px;
            font-size: 0.75rem; font-weight: 600;
            background: rgba(34,197,94,0.2); color: #22c55e;
            border: 1px solid rgba(34,197,94,0.4);
        }

        /* ── STATS GRID ── */
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .stat-card {
            background: rgba(0,0,0,0.2); border-radius: 12px;
            padding: 1.5rem; text-align: center;
        }
        .stat-card-value { font-size: 2rem; font-weight: 700; color: var(--yellow); }
        .stat-card-label { font-size: 0.8rem; color: var(--text-dim); margin-top: 0.3rem; }

        /* ── RBAC LINK CARD ── */
        .rbac-link-card {
            display: flex; align-items: center; justify-content: space-between;
            background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15));
            backdrop-filter: blur(18px); border: 1px solid rgba(139,92,246,0.3);
            border-radius: 16px; padding: 1.5rem 2rem; text-decoration: none; transition: all 0.3s;
        }
        .rbac-link-card:hover { border-color: rgba(139,92,246,0.6); transform: translateY(-2px); }
        .rbac-link-content { display: flex; align-items: center; gap: 1.25rem; }
        .rbac-icon {
            width: 56px; height: 56px; background: rgba(139,92,246,0.2);
            border-radius: 14px; display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; color: #8b5cf6;
        }
        .rbac-text h3 { font-size: 1rem; font-weight: 600; color: var(--text-white); margin-bottom: 0.25rem; }
        .rbac-text p { font-size: 0.8rem; color: var(--text-dim); max-width: 400px; }

        /* ── FORM ── */
        .form-group { margin-bottom: 1.25rem; }
        .form-group label {
            display: block; font-size: 0.8rem; font-weight: 500;
            color: var(--text-dim); margin-bottom: 0.5rem;
            text-transform: uppercase; letter-spacing: 0.05em;
        }
        .form-group input {
            width: 100%; padding: 0.875rem 1rem; background: rgba(0,0,0,0.3);
            border: 1px solid var(--glass-border); border-radius: 10px;
            color: white; font-family: inherit; font-size: 0.9rem;
        }
        .form-group input:focus { outline: none; border-color: var(--yellow); }

        .btn-submit {
            padding: 0.875rem 2rem; background: linear-gradient(135deg, var(--yellow), var(--yellow-d));
            border: none; border-radius: 10px; color: #1a1000;
            font-family: inherit; font-size: 0.9rem; font-weight: 600;
            cursor: pointer; transition: all 0.3s; display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(245,168,0,0.3); }

        .security-note {
            margin-top: 1.5rem; padding: 1rem; background: rgba(255,200,0,0.1);
            border: 1px solid rgba(255,200,0,0.3); border-radius: 10px;
            font-size: 0.8rem; color: var(--yellow); display: flex; gap: 0.75rem;
        }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem; display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width: 1024px) { .nav-links, .nav-divider { display: none; } }
        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .stats-grid { grid-template-columns: 1fr; }
            footer { flex-direction: column; text-align: center; gap: 0.5rem; }
        }
    `;

    return (
        <div className="security-mgmt-container">
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* ── ALERTS ── */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button style={{marginLeft:'auto', background:'none', border:'none', color:'inherit', cursor:'pointer'}} onClick={() => setAlerts({...alerts, success: null})}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button style={{marginLeft:'auto', background:'none', border:'none', color:'inherit', cursor:'pointer'}} onClick={() => setAlerts({...alerts, failure: null})}>×</button>
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
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Security <span>Settings</span> 🔐</h1>
                        <p>Configure authentication, roles, and access permissions.</p>
                    </div>
                    <div className="page-header-icon">🛡️</div>
                </div>

                {/* Account Info */}
                <div className="info-card">
                    <h2><i className="fas fa-user-shield"></i> Admin Account</h2>
                    <div className="info-row">
                        <span className="info-row-label"><i className="fas fa-envelope"></i> Email</span>
                        <span className="info-row-value">{adminEmail}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-row-label"><i className="fas fa-clock"></i> Last Login</span>
                        <span className="info-row-value">{lastLoginTime || '01 Jan 2026, 10:00'}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-row-label"><i className="fas fa-check-circle"></i> Account Status</span>
                        <span className="status-badge">Active</span>
                    </div>
                </div>

                {/* User Access Stats */}
                <div className="info-card">
                    <h2><i className="fas fa-users-cog"></i> Platform Access</h2>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-card-value">{customerCount}</div>
                            <div className="stat-card-label">Registered Customers</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-value">{vendorCount}</div>
                            <div className="stat-card-label">Registered Vendors</div>
                        </div>
                    </div>
                </div>

                {/* RBAC Management Link */}
                <a href="/admin/security" className="rbac-link-card">
                    <div className="rbac-link-content">
                        <div className="rbac-icon"><i className="fas fa-user-shield"></i></div>
                        <div className="rbac-text">
                            <h3>Role-Based Access Control (RBAC)</h3>
                            <p>Manage user roles, view permissions matrix, and assign Admin/Order Manager roles to users.</p>
                        </div>
                    </div>
                    <div style={{ color: '#8b5cf6' }}><i className="fas fa-arrow-right"></i></div>
                </a>

                {/* Change Password Form */}
                <div className="info-card">
                    <h2><i className="fas fa-key"></i> Change Password</h2>
                    <form action="/update-admin-password" method="post">
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        <div className="form-group">
                            <label htmlFor="currentPassword">Current Password</label>
                            <input type="password" id="currentPassword" name="currentPassword" 
                                placeholder="Enter current password" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input type="password" id="newPassword" name="newPassword" 
                                placeholder="Enter new password (min 6 characters)" required minLength="6" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" 
                                placeholder="Confirm new password" required />
                        </div>
                        <button type="submit" className="btn-submit">
                            <i className="fas fa-lock"></i> Update Password
                        </button>
                    </form>

                    <div className="security-note">
                        <i className="fas fa-info-circle"></i>
                        <div>
                            <strong>Note:</strong> Admin credentials are managed through application configuration. 
                            Password change requests will be logged and require system administrator action.
                        </div>
                    </div>
                </div>
            </main>

            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}