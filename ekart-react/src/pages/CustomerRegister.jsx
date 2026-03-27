import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, saveToken } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const CSS = `:root {
            --yellow:        #f5a800;
            --yellow-d:      #d48f00;
            --glass-bg:      rgba(255, 255, 255, 0.10);
            --glass-border:  rgba(255, 255, 255, 0.22);
            --glass-card:    rgba(255, 255, 255, 0.13);
            --text-white:    #ffffff;
            --text-light:    rgba(255,255,255,0.80);
            --text-dim:      rgba(255,255,255,0.50);
            --input-bg:      rgba(255, 255, 255, 0.08);
            --input-border:  rgba(255, 255, 255, 0.20);
            --input-focus:   rgba(245, 168, 0, 0.55);
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

        /* ── PAGE WRAPPER ── */
        .page-wrapper {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 7rem 1.5rem 3rem;
        }

        /* ── GLASS CARD ── */
        .reg-card {
            background: var(--glass-card);
            backdrop-filter: blur(22px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.75rem 2.5rem;
            width: 100%;
            max-width: 500px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.45);
            animation: fadeUp 0.55s ease both;
        }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* Card header */
        .card-header-area {
            text-align: center;
            margin-bottom: 2rem;
        }
        .card-icon {
            width: 56px; height: 56px;
            background: rgba(245,168,0,0.18);
            border: 1px solid rgba(245,168,0,0.35);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1rem;
            font-size: 1.3rem; color: var(--yellow);
        }
        .card-header-area h1 {
            font-size: 1.55rem; font-weight: 700;
            color: white; margin-bottom: 0.3rem;
        }
        .card-header-area p {
            font-size: 0.8rem; color: var(--text-dim);
        }

        /* ── FORM ── */
        .form-row-2 {
            display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
        }

        .form-group {
            margin-bottom: 1.1rem;
        }
        .form-group label {
            display: block;
            font-size: 0.75rem; font-weight: 600;
            letter-spacing: 0.06em; text-transform: uppercase;
            color: var(--text-dim); margin-bottom: 0.45rem;
        }

        .input-wrap {
            position: relative;
        }
        .input-wrap i {
            position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%);
            font-size: 0.85rem; color: var(--text-dim); pointer-events: none;
            transition: color 0.2s;
        }
        .input-wrap input {
            width: 100%;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 10px;
            padding: 0.7rem 0.875rem 0.7rem 2.5rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; color: white;
            transition: all 0.25s;
            outline: none;
        }
        .input-wrap input::placeholder { color: rgba(255,255,255,0.28); }
        .input-wrap input:focus {
            border-color: var(--input-focus);
            background: rgba(255,255,255,0.12);
            box-shadow: 0 0 0 3px rgba(245,168,0,0.12);
        }
        .input-wrap input:focus + i,
        .input-wrap:focus-within i { color: var(--yellow); }
        /* icon is before input so use sibling trick differently */
        .input-wrap:focus-within i { color: var(--yellow); }

        /* password toggle */
        .pw-toggle {
            position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%);
            cursor: pointer; color: var(--text-dim); font-size: 0.85rem;
            transition: color 0.2s; pointer-events: all;
        }
        .pw-toggle:hover { color: var(--yellow); }

        /* error */
        .error-msg {
            font-size: 0.72rem; color: #ff8060;
            margin-top: 0.3rem; display: block;
        }

        /* strength bar */
        .strength-wrap { margin-top: 0.6rem; }
        .strength-bar-bg {
            height: 4px; border-radius: 999px;
            background: rgba(255,255,255,0.1); overflow: hidden;
        }
        .strength-bar {
            height: 100%; width: 0%;
            border-radius: 999px;
            transition: width 0.35s ease, background 0.35s ease;
        }
        .strength-text {
            font-size: 0.68rem; color: var(--text-dim);
            margin-top: 0.3rem;
        }

        /* divider */
        .form-divider {
            border: none; border-top: 1px solid rgba(255,255,255,0.1);
            margin: 1.5rem 0;
        }

        /* submit */
        .btn-submit {
            width: 100%;
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 50px;
            padding: 0.875rem;
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
            text-align: center; margin-top: 1.5rem;
            font-size: 0.8rem; color: var(--text-dim);
        }
        .card-footer-text a {
            color: var(--yellow); text-decoration: none; font-weight: 600;
            margin-left: 0.25rem;
        }
        .card-footer-text a:hover { text-decoration: underline; }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @media(max-width: 560px) {
            nav { padding: 0.875rem 1.25rem; }
            .reg-card { padding: 2rem 1.5rem; }
            .form-row-2 { grid-template-columns: 1fr; }
        }`;

/**
 * CustomerRegister Component
 * @param {Object} props
 * @param {Object} props.customer - Initial customer object containing default field values
 * @param {Object} props.errors - Field validation errors object
 * @param {string|null} props.csrfToken - CSRF token for secure form submission
 */
export default function CustomerRegister({
    customer = { name: '', mobile: '', email: '' },
    errors = {},
    csrfToken = null
}) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [name, setName] = useState(customer?.name || '');
    const [email, setEmail] = useState(customer?.email || '');
    const [mobile, setMobile] = useState(customer?.mobile || '');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');

    const navigate = useNavigate();
    const { login } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // Password Strength State
    const [strength, setStrength] = useState(0);
    const [strengthText, setStrengthText] = useState('Must be 6+ chars with A, a, 1, @');
    const [strengthColor, setStrengthColor] = useState('transparent');
    const [textColor, setTextColor] = useState('rgba(255,255,255,0.4)');
    
    const dropdownRef = useRef(null);

    // Click outside handler for dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Password strength logic
    useEffect(() => {
        let s = 0;
        if (password.length >= 6) s += 20;
        if (/[A-Z]/.test(password)) s += 20;
        if (/[a-z]/.test(password)) s += 20;
        if (/[0-9]/.test(password)) s += 20;
        if (/[@$!%*?&]/.test(password)) s += 20;

        setStrength(s);

        if (s === 0) {
            setStrengthColor('transparent');
            setStrengthText('Must be 6+ chars with A, a, 1, @');
            setTextColor('rgba(255,255,255,0.4)');
        } else if (s < 60) {
            setStrengthColor('#ef4444');
            setStrengthText('Strength: Weak');
            setTextColor('#ef4444');
        } else if (s < 100) {
            setStrengthColor('#f5a800');
            setStrengthText('Strength: Medium');
            setTextColor('#f5a800');
        } else {
            setStrengthColor('#22c55e');
            setStrengthText('Strength: Strong ✓');
            setTextColor('#22c55e');
        }
    }, [password]);

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Customer Registration</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* ── NAV ── */}
            <nav>
                <Link to="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    Ek<span>art</span>
                </Link>
                <ul className="nav-links">
                    <li><Link to="/products">Shop</Link></li>
                    <li className={`dropdown ${isDropdownOpen ? 'open' : ''}`} ref={dropdownRef}>
                        <a onClick={(e) => { e.preventDefault(); setIsDropdownOpen(!isDropdownOpen); }}>
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
                </ul>
            </nav>

            {/* ── MAIN ── */}
            <div className="page-wrapper">
                <div className="reg-card">

                    {/* Header */}
                    <div className="card-header-area">
                        <div className="card-icon"><i className="fas fa-user-plus"></i></div>
                        <h1>Create Account</h1>
                        <p>Join Ekart — it's free and takes under a minute.</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setFormError('');
                        if (password !== confirmPassword) {
                            setFormError('Passwords do not match');
                            return;
                        }
                        try {
                            const res = await authApi.register(name, email, password, mobile);
                            if (res?.data?.success) {
                                const data = res.data || {};
                                // FlutterApiController returns: { success, message, customerId }
                                // Customer ID is required because backend protected APIs use `X-Customer-Id`.
                                const customerId = data.customerId ?? data.id ?? null;
                                const user = {
                                    customerId,
                                    id: customerId,
                                    name,
                                    email,
                                    mobile,
                                };
                                // token is not returned by FlutterApiController on register
                                saveToken(data.token || '', user, 'customer');
                                login(user, 'customer');
                                navigate('/');
                            } else {
                                setFormError(res?.data?.message || 'Registration failed');
                            }
                        } catch (err) {
                            setFormError('Registration failed');
                        }
                    }}>
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}

                        {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}

                        <div className="form-row-2">
                            {/* Name */}
                            <div className="form-group">
                                <label htmlFor="name">Full Name</label>
                                <div className="input-wrap">
                                    <i className="fas fa-user"></i>
                                    <input type="text" id="name" name="name" placeholder="John Doe" defaultValue={customer?.name || ''} />
                                </div>
                                {errors?.name && <span className="error-msg">{errors.name}</span>}
                            </div>

                            {/* Mobile */}
                            <div className="form-group">
                                <label htmlFor="mobile">Mobile</label>
                                <div className="input-wrap">
                                    <i className="fas fa-phone"></i>
                                    <input type="tel" id="mobile" name="mobile" placeholder="+91 9876543210" defaultValue={customer?.mobile || ''} />
                                </div>
                                {errors?.mobile && <span className="error-msg">{errors.mobile}</span>}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="input-wrap">
                                <i className="fas fa-envelope"></i>
                                <input type="email" id="email" name="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            {errors?.email && <span className="error-msg">{errors.email}</span>}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrap">
                                <i className="fas fa-lock"></i>
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    id="password" 
                                    name="password"
                                    placeholder="Min 6 chars" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <span className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </span>
                            </div>
                            {errors?.password && <span className="error-msg">{errors.password}</span>}
                            
                            <div className="strength-wrap">
                                <div className="strength-bar-bg">
                                    <div 
                                        className="strength-bar" 
                                        id="strength-bar"
                                        style={{ width: `${strength}%`, background: strengthColor }}
                                    ></div>
                                </div>
                                <div 
                                    className="strength-text" 
                                    id="password-text"
                                    style={{ color: textColor }}
                                >
                                    {strengthText}
                                </div>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="input-wrap">
                                <i className="fas fa-lock"></i>
                                <input 
                                    type={showConfirmPassword ? 'text' : 'password'} 
                                    id="confirmPassword" 
                                    name="confirmPassword" 
                                    placeholder="Re-enter password" 
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                                <span className="pw-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </span>
                            </div>
                            {errors?.confirmPassword && <span className="error-msg">{errors.confirmPassword}</span>}
                        </div>

                        <hr className="form-divider" />

                        <button type="submit" className="btn-submit">
                            <i className="fas fa-user-plus"></i> Create My Account
                        </button>
                    </form>

                    <div className="card-footer-text">
                        Already have an account?
                        <Link to="/login">Sign in here</Link>
                    </div>
                </div>
            </div>

            {/* ── FOOTER ── */}
            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>

            
        </>
    );
}