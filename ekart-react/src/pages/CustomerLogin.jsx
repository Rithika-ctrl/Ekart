import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, saveToken } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card:   rgba(255, 255, 255, 0.13);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
            --input-bg:     rgba(255, 255, 255, 0.08);
            --input-border: rgba(255, 255, 255, 0.20);
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        #root {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem 1.5rem;
        }

        /* ── BACKGROUND ── */
        .bg-layer {
            position: fixed; inset: 0; z-index: -1;
            overflow: hidden;
        }
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
            background: linear-gradient(
                180deg,
                rgba(5, 8, 20, 0.82) 0%,
                rgba(8, 12, 28, 0.78) 40%,
                rgba(5, 8, 20, 0.88) 100%
            );
        }

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(0,0,0,0.25);
            backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border);
        }
        .nav-brand {
            font-size: 1.6rem; font-weight: 700;
            color: var(--text-white); text-decoration: none;
            letter-spacing: 0.04em;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }

        .nav-links { display: flex; align-items: center; gap: 0.25rem; list-style: none; }
        .nav-links a {
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            transition: all 0.2s;
        }
        .nav-links a:hover { color: white; background: rgba(255,255,255,0.1); }

        .dropdown { position: relative; }
        .dropdown > a { display: flex; align-items: center; gap: 0.35rem; cursor: pointer; }
        .dropdown-menu {
            position: absolute; top: calc(100% + 0.75rem); right: 0;
            background: rgba(10, 12, 30, 0.90);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 10px; padding: 0.5rem; min-width: 210px;
            opacity: 0; visibility: hidden; transform: translateY(-6px);
            transition: all 0.22s; list-style: none;
        }
        .dropdown:hover .dropdown-menu { opacity: 1; visibility: visible; transform: translateY(0); }
        .dropdown-menu li a {
            display: flex; align-items: center; gap: 0.625rem;
            padding: 0.6rem 1rem; border-radius: 7px;
            color: var(--text-light); text-decoration: none; font-size: 0.82rem;
            transition: background 0.15s;
        }
        .dropdown-menu li a:hover { background: rgba(255,255,255,0.1); color: white; }
        .dropdown-menu .divider { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 0.3rem 0; }

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
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

        /* ── LOGIN CARD ── */
        .login-card {
            background: var(--glass-card);
            backdrop-filter: blur(22px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 3rem 2.5rem;
            width: 100%; max-width: 420px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.45);
            animation: fadeUp 0.55s ease both;
            text-align: center;
        }
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .card-icon {
            width: 60px; height: 60px;
            background: rgba(245,168,0,0.15);
            border: 2px solid rgba(245,168,0,0.35);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.25rem;
            font-size: 1.4rem; color: var(--yellow);
        }

        .login-card h1 {
            font-size: 1.6rem; font-weight: 700;
            color: white; margin-bottom: 0.4rem;
        }
        .login-card .subtitle {
            font-size: 0.8rem; color: var(--text-dim);
            margin-bottom: 2rem;
        }

        /* ── FORM ── */
        .form-group { margin-bottom: 1.1rem; text-align: left; }
        .form-group label {
            display: block;
            font-size: 0.72rem; font-weight: 600;
            letter-spacing: 0.08em; text-transform: uppercase;
            color: var(--text-dim); margin-bottom: 0.45rem;
        }
        .input-wrap { position: relative; }
        .input-wrap i.field-icon {
            position: absolute; left: 0.875rem; top: 50%;
            transform: translateY(-50%);
            font-size: 0.85rem; color: var(--text-dim);
            pointer-events: none; transition: color 0.2s;
        }
        .input-wrap:focus-within i.field-icon { color: var(--yellow); }
        .input-wrap input {
            width: 100%;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 10px;
            padding: 0.75rem 0.875rem 0.75rem 2.5rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; color: white;
            transition: all 0.25s; outline: none;
        }
        .input-wrap input::placeholder { color: rgba(255,255,255,0.28); }
        .input-wrap input:focus {
            border-color: rgba(245,168,0,0.55);
            background: rgba(255,255,255,0.12);
            box-shadow: 0 0 0 3px rgba(245,168,0,0.12);
        }
        .pw-toggle {
            position: absolute; right: 0.875rem; top: 50%;
            transform: translateY(-50%);
            cursor: pointer; color: var(--text-dim); font-size: 0.85rem;
            transition: color 0.2s;
        }
        .pw-toggle:hover { color: var(--yellow); }

        .forgot-link {
            display: block; text-align: right;
            font-size: 0.75rem; color: var(--yellow);
            text-decoration: none; margin-top: 0.5rem;
            transition: opacity 0.2s;
        }
        .forgot-link:hover { opacity: 0.8; text-decoration: underline; }

        .form-divider {
            border: none; border-top: 1px solid rgba(255,255,255,0.1);
            margin: 1.5rem 0;
        }

        .btn-submit {
            width: 100%;
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 50px;
            padding: 0.9rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; font-weight: 700;
            letter-spacing: 0.1em; text-transform: uppercase;
            cursor: pointer; transition: all 0.3s;
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            box-shadow: 0 6px 24px rgba(245,168,0,0.35);
        }
        .btn-submit:hover {
            background: var(--yellow-d);
            transform: translateY(-2px);
            box-shadow: 0 10px 32px rgba(245,168,0,0.5);
        }

        .card-footer-text {
            margin-top: 1.5rem;
            font-size: 0.8rem; color: var(--text-dim);
        }
        .card-footer-text a {
            color: var(--yellow); font-weight: 600;
            text-decoration: none; margin-left: 0.25rem;
        }
        .card-footer-text a:hover { text-decoration: underline; }

        /* role switcher pills */
        .role-pills {
            display: flex; gap: 0.5rem; justify-content: center;
            margin-bottom: 1.75rem; flex-wrap: wrap;
        }
        .role-pill {
            font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em;
            padding: 0.35rem 1rem; border-radius: 50px;
            text-decoration: none; border: 1px solid var(--glass-border);
            color: var(--text-dim); transition: all 0.2s;
        }
        .role-pill:hover { border-color: rgba(245,168,0,0.4); color: var(--text-light); }
        .role-pill.active {
            background: rgba(245,168,0,0.15);
            border-color: rgba(245,168,0,0.5);
            color: var(--yellow);
        }

        /* brand watermark */
        .brand-mark {
            position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
            font-size: 0.72rem; color: var(--text-dim); letter-spacing: 0.1em;
        }
        .brand-mark span { color: var(--yellow); font-weight: 700; }

        @media(max-width: 480px) {
            nav { padding: 0.875rem 1.25rem; }
            .login-card { padding: 2rem 1.5rem; }
        }

        /* Social Login Styles */
        .social-divider {
            display: flex;
            align-items: center;
            margin: 1.5rem 0;
            color: var(--text-dim);
            font-size: 0.75rem;
        }
        .social-divider::before,
        .social-divider::after {
            content: '';
            flex: 1;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .social-divider span {
            padding: 0 1rem;
        }
        .social-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
            justify-content: center;
        }
        .social-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            padding: 0.6rem 0.8rem;
            border-radius: 8px;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 500;
            transition: all 0.2s;
            border: 1px solid var(--glass-border);
            min-width: 100px;
        }
        .google-btn {
            background: rgba(255,255,255,0.05);
            color: var(--text-white);
        }
        .google-btn:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(66,133,244,0.5);
        }
        .facebook-btn {
            background: rgba(24,119,242,0.1);
            color: var(--text-white);
        }
        .facebook-btn:hover {
            background: rgba(24,119,242,0.2);
            border-color: rgba(24,119,242,0.5);
        }
        .instagram-btn {
            background: rgba(225,48,108,0.1);
            color: var(--text-white);
        }
        .instagram-btn:hover {
            background: rgba(225,48,108,0.2);
            border-color: rgba(225,48,108,0.5);
        }
        .social-btn i, .social-btn svg {
            font-size: 1rem;
        }`;

/**
 * CustomerLogin Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {boolean} props.accountDeleted - Flag indicating if account was recently deleted
 * @param {string|null} props.csrfToken - CSRF token for secure form submission
 */
export default function CustomerLogin({
    successMessage = null,
    failureMessage = null,
    accountDeleted = false,
    csrfToken = null
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [showDeleted, setShowDeleted] = useState(!!accountDeleted);
    const [fadeAlerts, setFadeAlerts] = useState(false);

    // Handle alert fade out
    useEffect(() => {
        if (showSuccess || showFailure || showDeleted) {
            const fadeTimer = setTimeout(() => {
                setFadeAlerts(true);
            }, 2500);
            const removeTimer = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
                setShowDeleted(false);
            }, 3000);
            
            return () => {
                clearTimeout(fadeTimer);
                clearTimeout(removeTimer);
            };
        }
    }, [showSuccess, showFailure, showDeleted]);

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    // Login form state
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [formError, setFormError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            const res = await authApi.login(email, passwordInput);
            if (res?.data?.success) {
                const cust = res.data.customer || {};
                const user = { customerId: cust.id ?? cust.customerId ?? null, id: cust.id ?? cust.customerId ?? null, name: cust.name, email: cust.email, mobile: cust.mobile };
                saveToken(res.data.token, user, 'customer');
                login(user, 'customer');
                navigate('/');
            } else {
                setFormError(res?.data?.message || 'Login failed');
            }
        } catch (err) {
            setFormError('Invalid email or password');
        }
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Customer Login</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            <link rel="stylesheet" href="/css/ekart-ui.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button type="button" className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={alertStyle}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button type="button" className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
                {showDeleted && (
                    <div className="alert alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>Your account has been permanently deleted.</span>
                        <button type="button" className="alert-close" onClick={() => setShowDeleted(false)}>×</button>
                    </div>
                )}
            </div>

            <nav>
                <Link to="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    Ekart
                </Link>
                <ul className="nav-links">
                    <li><Link to="/products">Shop</Link></li>
                    <li className="dropdown">
                        <a href="#">
                            <i className="fas fa-user-circle"></i> Account
                            <i className="fas fa-angle-down" style={{ fontSize: '.65rem' }}></i>
                        </a>
                        <ul className="dropdown-menu">
                            <li><Link to="/login"><i className="fas fa-sign-in-alt" style={{ color: 'var(--yellow)', width: '14px' }}></i> Customer Login</Link></li>
                            <li><Link to="/register"><i className="fas fa-user-plus" style={{ color: '#7dc97d', width: '14px' }}></i> Customer Register</Link></li>
                            <li><hr className="divider" /></li>
                            <li><Link to="/vendor/login"><i className="fas fa-store" style={{ color: 'var(--yellow)', width: '14px' }}></i> Vendor Login</Link></li>
                            <li><Link to="/vendor/register"><i className="fas fa-store" style={{ color: '#7dc97d', width: '14px' }}></i> Vendor Register</Link></li>
                            <li><hr className="divider" /></li>
                            <li><Link to="/admin/login"><i className="fas fa-shield-alt" style={{ color: 'rgba(255,255,255,0.4)', width: '14px' }}></i> Admin Login</Link></li>
                        </ul>
                    </li>
                    <li><Link to="/register" style={{ background: 'var(--yellow)', color: '#1a1000', fontWeight: 700, borderRadius: '50px', padding: '.45rem 1.2rem' }}>Register</Link></li>
                </ul>
            </nav>

            <div className="login-card">
                <div className="card-icon">
                    <i className="fas fa-user-lock"></i>
                </div>

                <h1>Welcome Back</h1>
                <p className="subtitle">Sign in to your Ekart account</p>

                <div className="role-pills">
                    <Link to="/login" className="role-pill active"><i className="fas fa-user" style={{ fontSize: '.65rem' }}></i> Customer</Link>
                    <Link to="/vendor/login" className="role-pill"><i className="fas fa-store" style={{ fontSize: '.65rem' }}></i> Vendor</Link>
                    <Link to="/admin/login" className="role-pill"><i className="fas fa-shield-alt" style={{ fontSize: '.65rem' }}></i> Admin</Link>
                </div>

                <form onSubmit={handleSubmit}>
                    {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}

                    {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrap">
                            <i className="fas fa-envelope field-icon"></i>
                            <input type="email" id="email" name="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrap">
                            <i className="fas fa-lock field-icon"></i>
                            <input type={showPassword ? 'text' : 'password'} id="password" name="password" placeholder="Enter your password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
                            <span className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} id="pw-eye"></i>
                            </span>
                        </div>
                        <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
                    </div>

                    <hr className="form-divider" />

                    <button type="submit" className="btn-submit">
                        <i className="fas fa-sign-in-alt"></i> Log In
                    </button>
                </form>

                <div className="social-divider">
                    <span>or continue with</span>
                </div>
                
                <div className="social-buttons">
                    <a href="/oauth2/authorize/google?type=customer" className="social-btn google-btn">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                    </a>
                    <a href="/oauth2/authorize/facebook?type=customer" className="social-btn facebook-btn">
                        <i className="fab fa-facebook-f"></i>
                        Facebook
                    </a>
                    <a href="/oauth2/authorize/instagram?type=customer" className="social-btn instagram-btn">
                        <i className="fab fa-instagram"></i>
                        Instagram
                    </a>
                </div>

                <div className="card-footer-text">
                    Don't have an account?
                    <Link to="/register">Sign up free</Link>
                </div>
            </div>

            <div className="card-footer-text" style={{ marginTop: '0.75rem' }}>
                Just looking?
                <Link to="/browse">Browse as Guest</Link>
            </div>

            <div className="brand-mark">Ekart · Secure Login</div>

            
            
        </>
    );
}