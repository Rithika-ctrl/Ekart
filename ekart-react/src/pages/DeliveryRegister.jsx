import React, { useState, useEffect } from 'react';

/**
 * Ekart - Delivery Registration Component
 * @param {Object} props
 * @param {Object} props.session - Session object for notifications {success: string, failure: string}.
 * @param {string} props.csrfToken - CSRF token value for security.
 */
export default function DeliveryRegister({
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [warehouses, setWarehouses] = useState([]);
    const [isLoadingWh, setIsLoadingWh] = useState(true);
    const [whLoadMsg, setWhLoadMsg] = useState("");
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

        // Fetch warehouses on mount
        const loadWarehouses = async () => {
            try {
                const res = await fetch('/delivery/warehouses');
                const list = await res.json();
                if (!list || list.length === 0) {
                    setWhLoadMsg('No warehouses have been added by admin yet. Please check back later.');
                    setWarehouses([]);
                } else {
                    setWarehouses(list);
                    setWhLoadMsg('');
                }
            } catch (e) {
                setWhLoadMsg('Failed to load warehouses. Please refresh the page.');
            } finally {
                setIsLoadingWh(false);
            }
        };

        loadWarehouses();
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

        .delivery-register-container {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            position: relative;
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

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px); border-bottom: 1px solid var(--glass-border);
        }
        .nav-brand {
            font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }
        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border); transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255, 255, 255, 0.1); }

        /* ── ALERTS ── */
        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert {
            padding: 0.875rem 1.25rem; background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px; animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(245, 168, 0, 0.45); color: var(--yellow); }
        .alert-danger { border-color: rgba(255, 100, 80, 0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── PAGE ── */
        .page { flex: 1; display: flex; align-items: center; justify-content: center; padding: 6rem 1.5rem 3rem; }

        .form-card {
            background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
            border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 500px;
            box-shadow: 0 40px 100px rgba(0,0,0,0.4); animation: fadeUp 0.5s ease both;
        }

        .card-top { text-align: center; margin-bottom: 2rem; }
        .card-icon {
            width: 64px; height: 64px; background: rgba(245,168,0,0.15); border: 2px solid rgba(245,168,0,0.3);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 1.6rem; margin: 0 auto 1.1rem;
        }
        .card-top h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.3rem; }
        .card-top h1 span { color: var(--yellow); }
        .card-top p { font-size: 0.78rem; color: var(--text-dim); line-height: 1.6; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .form-group { margin-bottom: 1rem; }
        .form-label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; }
        
        .input-wrapper { position: relative; }
        .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-dim); font-size: 0.875rem; transition: color 0.3s; pointer-events: none; }
        .input-wrapper:focus-within .input-icon { color: var(--yellow); }

        .form-control {
            width: 100%; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--glass-border);
            border-radius: 12px; padding: 0.8rem 1rem 0.8rem 2.75rem; color: white; font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; transition: all 0.3s; outline: none;
        }
        .form-control:focus { background: rgba(255, 255, 255, 0.10); border-color: var(--yellow); box-shadow: 0 0 0 3px rgba(245,168,0,0.12); }
        
        select.form-control { padding: 0.8rem 1rem 0.8rem 2.75rem; appearance: none; -webkit-appearance: none; cursor: pointer; }
        select.form-control option { background: #1a1208; color: white; }

        .select-loading { color: var(--text-dim); font-size: 0.78rem; padding: 0.5rem 0 0 0.25rem; }

        .info-box { background: rgba(245,168,0,0.08); border: 1px solid rgba(245,168,0,0.2); border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: flex-start; gap: 0.6rem; }
        .info-box i { color: var(--yellow); margin-top: 0.1rem; flex-shrink: 0; }
        .info-box p { font-size: 0.78rem; color: var(--text-light); line-height: 1.5; }

        .btn-submit {
            width: 100%; background: var(--yellow); color: #1a1000; border: none; border-radius: 12px;
            padding: 0.95rem; font-family: 'Poppins', sans-serif; font-size: 0.9rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
            transition: all 0.3s; box-shadow: 0 8px 24px rgba(245,168,0,0.25);
            display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1.25rem;
        }
        .btn-submit:hover { background: var(--yellow-d); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(245,168,0,0.42); }

        .form-footer { text-align: center; margin-top: 1.25rem; font-size: 0.78rem; color: var(--text-dim); }
        .form-footer a { color: var(--yellow); text-decoration: none; }

        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px); border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem; display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width:540px) {
            .form-row { grid-template-columns: 1fr; }
            .form-card { padding: 1.75rem 1.25rem; }
            nav { padding: 0.875rem 1.25rem; }
        }
    `;

    return (
        <div className="delivery-register-container">
            <style>{CSS}</style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            <div className="bg-layer"></div>

            {/* ── ALERTS ── */}
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
                <a className="nav-brand" href="/">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </a>
                <a href="/delivery/login" className="nav-link-btn">
                    <i className="fas fa-sign-in-alt"></i> Login
                </a>
            </nav>

            {/* ── PAGE ── */}
            <main className="page">
                <div className="form-card">
                    <div className="card-top">
                        <div className="card-icon">
                            <i className="fas fa-motorcycle" style={{ color: 'var(--yellow)' }}></i>
                        </div>
                        <h1>Join as <span>Delivery Partner</span></h1>
                        <p>Register to become an Ekart delivery boy. Your account will be reviewed and approved by admin.</p>
                    </div>

                    <div className="info-box">
                        <i className="fas fa-info-circle"></i>
                        <p>After registration, verify your email with an OTP. Your account will then be reviewed by our admin team. You will receive an email once approved.</p>
                    </div>

                    <form method="post" action="/delivery/register">
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <div className="input-wrapper">
                                <i className="fas fa-user input-icon"></i>
                                <input type="text" name="name" className="form-control" placeholder="Your full name" required minLength="3" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="input-wrapper">
                                <i className="fas fa-envelope input-icon"></i>
                                <input type="email" name="email" className="form-control" placeholder="your@email.com" required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mobile Number</label>
                            <div className="input-wrapper">
                                <i className="fas fa-phone input-icon"></i>
                                <input type="number" name="mobile" className="form-control" placeholder="10-digit mobile" min="6000000000" max="9999999999" required />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div className="input-wrapper">
                                    <i className="fas fa-lock input-icon"></i>
                                    <input type="password" name="password" className="form-control" placeholder="Min 6 chars" required minLength="6" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <div className="input-wrapper">
                                    <i className="fas fa-lock input-icon"></i>
                                    <input type="password" name="confirmPassword" className="form-control" placeholder="Repeat password" required />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Preferred Warehouse</label>
                            <div className="input-wrapper">
                                <i className="fas fa-warehouse input-icon"></i>
                                <select name="warehouseId" id="warehouseSelect" className="form-control" required disabled={isLoadingWh || warehouses.length === 0}>
                                    {isLoadingWh ? (
                                        <option value="">Loading warehouses…</option>
                                    ) : warehouses.length === 0 ? (
                                        <option value="">No warehouses available yet</option>
                                    ) : (
                                        <>
                                            <option value="">Select your warehouse</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id}>
                                                    {w.name} — {w.city} ({w.warehouseCode || w.code})
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="select-loading" id="whLoadMsg">{whLoadMsg}</div>
                        </div>

                        <button type="submit" className="btn-submit">
                            <i className="fas fa-paper-plane"></i> Submit Application
                        </button>
                    </form>

                    <div className="form-footer">
                        Already have an account? <a href="/delivery/login">Login here</a>
                    </div>
                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">&#169; 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}