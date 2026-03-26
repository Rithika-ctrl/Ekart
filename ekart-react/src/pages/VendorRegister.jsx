import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

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

        /* ── Background ── */
        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
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
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── Page Layout ── */
        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 2rem;
        }

        /* ── Page Header ── */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; width: 100%; max-width: 560px;
            animation: fadeUp 0.5s ease both;
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

        /* ── Form Card ── */
        .form-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.5rem;
            width: 100%; max-width: 560px;
            box-shadow: 0 40px 100px rgba(0,0,0,0.4);
            animation: fadeUp 0.5s ease 0.05s both;
        }

        /* ── Section Label ── */
        .section-label {
            display: flex; align-items: center; gap: 0.6rem;
            font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.12em;
            color: var(--yellow); margin-bottom: 1.25rem; margin-top: 0.5rem;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

        /* ── Form Elements ── */
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

        /* toggle icon on right */
        .input-wrapper .toggle-pw {
            position: absolute; right: 1rem; top: 50%;
            transform: translateY(-50%);
            color: var(--text-dim); font-size: 0.875rem;
            cursor: pointer; transition: color 0.2s; z-index: 1;
        }
        .input-wrapper .toggle-pw:hover { color: var(--yellow); }

        .form-control {
            width: 100%;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 0.8rem 1rem 0.8rem 2.75rem;
            color: white; font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; transition: all 0.3s;
        }
        .form-control.has-toggle { padding-right: 2.75rem; }
        .form-control::placeholder { color: var(--text-dim); }
        .form-control:focus {
            outline: none; background: rgba(255,255,255,0.10);
            border-color: var(--yellow);
            box-shadow: 0 0 0 3px rgba(245,168,0,0.12);
        }
        .form-control.is-invalid {
            border-color: rgba(255,100,80,0.6);
            box-shadow: 0 0 0 3px rgba(255,100,80,0.08);
        }

        /* ── Error message ── */
        .error-message {
            font-size: 0.7rem; color: #ff8060;
            display: flex; align-items: center; gap: 0.3rem;
            margin-left: 0.15rem;
        }
        .error-message:empty { display: none; }

        /* ── Password Strength ── */
        .strength-bar-wrap {
            height: 6px; border-radius: 99px;
            background: rgba(255,255,255,0.08);
            overflow: hidden; margin-top: 0.4rem;
        }
        .strength-bar {
            height: 100%; width: 0%;
            border-radius: 99px;
            transition: width 0.35s ease, background 0.35s ease;
        }
        .strength-label {
            font-size: 0.68rem; color: var(--text-dim);
            margin-top: 0.3rem; margin-left: 0.15rem;
            transition: color 0.3s;
        }

        /* ── Submit Button ── */
        .btn-submit {
            width: 100%; background: var(--yellow); color: #1a1000;
            border: none; border-radius: 12px; padding: 0.95rem;
            font-family: 'Poppins', sans-serif; font-size: 0.9rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow: 0 8px 24px rgba(245,168,0,0.25);
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            margin-top: 2rem;
        }
        .btn-submit:hover { background: var(--yellow-d); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(245,168,0,0.42); }
        .btn-submit:active { transform: translateY(0); }

        /* ── Login redirect ── */
        .login-redirect {
            text-align: center; margin-top: 1.5rem;
            font-size: 0.8rem; color: var(--text-dim);
        }
        .login-redirect a {
            color: var(--yellow); text-decoration: none; font-weight: 600;
            transition: color 0.2s;
        }
        .login-redirect a:hover { color: var(--yellow-d); }

        /* ── Back link ── */
        .back-link {
            display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
            margin-top: 1.25rem; color: var(--text-dim); text-decoration: none;
            font-size: 0.78rem; transition: color 0.2s; width: 100%;
        }
        .back-link:hover { color: var(--text-white); }

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
        @media(max-width: 700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .form-card { padding: 1.75rem 1.25rem; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }`;

export default function VendorRegister({
    errors = {},
    successMessage = null,
    failureMessage = null,
}) {
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [scrolled, setScrolled] = useState(false);

    const [strength, setStrength] = useState(0);
    const [strengthText, setStrengthText] = useState('Must be 6+ chars with A, a, 1, @');
    const [strengthColor, setStrengthColor] = useState('transparent');
    const [strengthLabelColor, setStrengthLabelColor] = useState('rgba(255,255,255,0.4)');

    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (showSuccess || showFailure) {
            const t = setTimeout(() => { setShowSuccess(false); setShowFailure(false); }, 2500);
            return () => clearTimeout(t);
        }
    }, [showSuccess, showFailure]);

    useEffect(() => {
        let s = 0;
        if (password.length >= 6) s += 20;
        if (/[A-Z]/.test(password)) s += 20;
        if (/[a-z]/.test(password)) s += 20;
        if (/[0-9]/.test(password)) s += 20;
        if (/[@$!%*?&]/.test(password)) s += 20;
        setStrength(s);
        if (s === 0) { setStrengthColor('transparent'); setStrengthText('Must be 6+ chars with A, a, 1, @'); setStrengthLabelColor('rgba(255,255,255,0.4)'); }
        else if (s < 60) { setStrengthColor('#ef4444'); setStrengthText('Strength: Weak'); setStrengthLabelColor('#ef4444'); }
        else if (s < 100) { setStrengthColor('#f5a800'); setStrengthText('Strength: Medium'); setStrengthLabelColor('#f5a800'); }
        else { setStrengthColor('#22c55e'); setStrengthText('Strength: Strong ✓'); setStrengthLabelColor('#22c55e'); }
    }, [password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (password !== confirmPassword) { setFormError('Passwords do not match'); return; }
        setLoading(true);
        try {
            const res = await api.post('/api/flutter/auth/vendor/register', { name, email, password, mobile });
            if (res?.data?.success) {
                alert(res.data.message || 'Registered successfully. Wait for admin approval.');
                navigate('/vendor/login');
            } else {
                setFormError(res?.data?.message || 'Registration failed');
            }
        } catch (err) {
            setFormError(err?.response?.data?.message || err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* Alert Stack */}
            <div className="alert-stack">
                {showFailure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
                {showSuccess && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {formError && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{formError}</span>
                        <button className="alert-close" onClick={() => setFormError('')}>×</button>
                    </div>
                )}
            </div>

            {/* Navbar */}
            <nav className={scrolled ? 'scrolled' : ''}>
                <Link to="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </Link>
                <div className="nav-right">
                    <Link to="/vendor/login" className="nav-link-btn"><i className="fas fa-sign-in-alt"></i> Vendor Login</Link>
                    <Link to="/login" className="nav-link-btn"><i className="fas fa-user"></i> Customer Login</Link>
                </div>
            </nav>

            <main className="page">

                {/* Page Header */}
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Vendor <span>Registration</span> 🏪</h1>
                        <p>Create your seller account and start listing products on Ekart.</p>
                    </div>
                    <div className="page-header-icon">🛍️</div>
                </div>

                {/* Form Card */}
                <div className="form-card">
                    <form onSubmit={handleSubmit} noValidate>

                        {/* Section: Account Info */}
                        <div className="section-label"><i className="fas fa-user-circle"></i> Account Info</div>

                        {/* Name */}
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <div className="input-wrapper">
                                <i className="fas fa-user input-icon"></i>
                                <input
                                    type="text" id="name" name="name"
                                    className={`form-control${errors?.name ? ' is-invalid' : ''}`}
                                    placeholder="e.g. Ramesh Kumar"
                                    value={name} onChange={e => setName(e.target.value)} required
                                />
                            </div>
                            {errors?.name && <span className="error-message"><i className="fas fa-exclamation-circle"></i> {errors.name}</span>}
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="input-wrapper">
                                <i className="fas fa-envelope input-icon"></i>
                                <input
                                    type="email" id="email" name="email"
                                    className={`form-control${errors?.email ? ' is-invalid' : ''}`}
                                    placeholder="e.g. ramesh@email.com"
                                    value={email} onChange={e => setEmail(e.target.value)} required
                                />
                            </div>
                            {errors?.email && <span className="error-message"><i className="fas fa-exclamation-circle"></i> {errors.email}</span>}
                        </div>

                        {/* Mobile */}
                        <div className="form-group">
                            <label htmlFor="mobile">Mobile Number</label>
                            <div className="input-wrapper">
                                <i className="fas fa-phone input-icon"></i>
                                <input
                                    type="tel" id="mobile" name="mobile"
                                    className={`form-control${errors?.mobile ? ' is-invalid' : ''}`}
                                    placeholder="e.g. 9876543210"
                                    value={mobile} onChange={e => setMobile(e.target.value)} required
                                />
                            </div>
                            {errors?.mobile && <span className="error-message"><i className="fas fa-exclamation-circle"></i> {errors.mobile}</span>}
                        </div>

                        {/* Section: Security */}
                        <div className="section-label" style={{ marginTop: '2rem' }}><i className="fas fa-lock"></i> Security</div>

                        {/* Password */}
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrapper">
                                <i className="fas fa-key input-icon"></i>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password" name="password"
                                    className={`form-control has-toggle${errors?.password ? ' is-invalid' : ''}`}
                                    placeholder="Min. 6 chars — A, a, 1, @"
                                    value={password} onChange={e => setPassword(e.target.value)} required
                                />
                                <i
                                    className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-pw`}
                                    onClick={() => setShowPassword(!showPassword)}
                                ></i>
                            </div>
                            {errors?.password && <span className="error-message"><i className="fas fa-exclamation-circle"></i> {errors.password}</span>}
                            <div className="strength-bar-wrap">
                                <div className="strength-bar" style={{ width: `${strength}%`, background: strengthColor }}></div>
                            </div>
                            <div className="strength-label" style={{ color: strengthLabelColor }}>{strengthText}</div>
                        </div>

                        {/* Confirm Password */}
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="input-wrapper">
                                <i className="fas fa-lock input-icon"></i>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword" name="confirmPassword"
                                    className={`form-control has-toggle${errors?.confirmPassword ? ' is-invalid' : ''}`}
                                    placeholder="Re-enter your password"
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                                />
                                <i
                                    className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-pw`}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                ></i>
                            </div>
                            {errors?.confirmPassword && <span className="error-message"><i className="fas fa-exclamation-circle"></i> {errors.confirmPassword}</span>}
                        </div>

                        {/* Submit */}
                        <button type="submit" className="btn-submit" disabled={loading}>
                            <i className="fas fa-user-plus"></i> {loading ? 'Creating...' : 'Create Account'}
                        </button>

                    </form>

                    {/* Login redirect */}
                    <div className="login-redirect">
                        Already have an account? <Link to="/vendor/login">Sign in here</Link>
                    </div>

                    <Link to="/" className="back-link">
                        <i className="fas fa-arrow-left"></i> Back to Home
                    </Link>
                </div>

            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </>
    );
}