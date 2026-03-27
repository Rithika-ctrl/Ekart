import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { vendorAuthApi, saveToken } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255,255,255,0.22);
            --glass-card:   rgba(255,255,255,0.13);
            --glass-nav:    rgba(0,0,0,0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        #root {font-family:'Poppins',sans-serif;min-height:100vh;color:var(--text-white);display:flex;flex-direction:column;}

        .bg-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;}
        .bg-layer::before{content:'';position:absolute;inset:-20px;background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;filter:blur(6px);transform:scale(1.08);}
        .bg-layer::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%);}

        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:1rem 3rem;display:flex;align-items:center;justify-content:space-between;background:var(--glass-nav);backdrop-filter:blur(14px);border-bottom:1px solid var(--glass-border);transition:background 0.3s;}
        nav.scrolled{background:rgba(0,0,0,0.45);}
        .nav-brand{font-size:1.6rem;font-weight:700;color:var(--text-white);text-decoration:none;letter-spacing:0.04em;display:flex;align-items:center;gap:0.5rem;}
        .nav-brand span{color:var(--yellow);}

        .nav-dropdown{position:relative;}
        .nav-dropdown-btn{display:flex;align-items:center;gap:0.4rem;color:var(--text-light);font-size:0.82rem;font-weight:500;padding:0.45rem 0.9rem;border-radius:6px;border:1px solid var(--glass-border);background:none;cursor:pointer;transition:all 0.2s;font-family:'Poppins',sans-serif;}
        .nav-dropdown-btn:hover{color:white;background:rgba(255,255,255,0.1);}
        .dropdown-menu{display:none;position:absolute;top:calc(100% + 8px);right:0;background:rgba(10,12,30,0.97);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:12px;padding:0.5rem;min-width:210px;box-shadow:0 20px 48px rgba(0,0,0,0.5);}
        .nav-dropdown.open .dropdown-menu{display:block;animation:fadeUp 0.2s ease both;}
        .dropdown-divider{height:1px;background:var(--glass-border);margin:0.4rem 0.5rem;}
        .dropdown-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--yellow);padding:0.4rem 0.75rem 0.2rem;}
        .dropdown-item{display:flex;align-items:center;gap:0.5rem;color:var(--text-light);text-decoration:none;font-size:0.78rem;font-weight:500;padding:0.5rem 0.75rem;border-radius:8px;transition:all 0.15s;}
        .dropdown-item:hover{color:white;background:rgba(255,255,255,0.08);}
        .dropdown-item i{color:var(--yellow);width:14px;text-align:center;}

        .alert-stack{position:fixed;top:5rem;right:1.5rem;z-index:200;display:flex;flex-direction:column;gap:0.5rem;}
        .alert{padding:0.875rem 1.25rem;background:rgba(10,12,30,0.88);backdrop-filter:blur(16px);border:1px solid;border-radius:10px;display:flex;align-items:center;gap:0.625rem;font-size:0.825rem;min-width:260px;animation:slideIn 0.3s ease both;}
        .alert-success{border-color:rgba(245,168,0,0.45);color:var(--yellow);}
        .alert-danger{border-color:rgba(255,100,80,0.45);color:#ff8060;}
        .alert-close{margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;opacity:0.6;font-size:1rem;}

        .page{flex:1;display:flex;align-items:center;justify-content:center;padding:6rem 1.5rem 3rem;}

        .form-card{background:var(--glass-card);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:20px;padding:2.5rem;width:100%;max-width:440px;box-shadow:0 40px 100px rgba(0,0,0,0.4);animation:fadeUp 0.5s ease both;}

        .card-top{text-align:center;margin-bottom:2rem;}
        .card-icon{width:64px;height:64px;background:rgba(245,168,0,0.15);border:2px solid rgba(245,168,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin:0 auto 1.1rem;}
        .card-top h1{font-size:1.4rem;font-weight:700;color:var(--text-white);margin-bottom:0.3rem;}
        .card-top h1 span{color:var(--yellow);}
        .card-top p{font-size:0.78rem;color:var(--text-dim);}

        .section-label{display:flex;align-items:center;gap:0.6rem;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--yellow);margin-bottom:1.1rem;}
        .section-label::after{content:'';flex:1;height:1px;background:var(--glass-border);}

        .form-group{display:flex;flex-direction:column;gap:0.45rem;margin-bottom:1.1rem;}
        .form-group label{font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-left:0.15rem;}
        .input-wrapper{position:relative;}
        .input-icon{position:absolute;left:1rem;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:0.875rem;transition:color 0.3s;pointer-events:none;}
        .input-wrapper:focus-within .input-icon{color:var(--yellow);}
        .form-control{width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:12px;padding:0.8rem 1rem 0.8rem 2.75rem;color:white;font-family:'Poppins',sans-serif;font-size:0.875rem;transition:all 0.3s;}
        .form-control::placeholder{color:var(--text-dim);}
        .form-control:focus{outline:none;background:rgba(255,255,255,0.10);border-color:var(--yellow);box-shadow:0 0 0 3px rgba(245,168,0,0.12);}

        .forgot-link{display:flex;justify-content:flex-end;margin-top:-0.4rem;margin-bottom:1.25rem;}
        .forgot-link a{font-size:0.72rem;color:var(--yellow);text-decoration:none;font-weight:500;transition:opacity 0.2s;}
        .forgot-link a:hover{opacity:0.75;}

        .btn-submit{width:100%;background:var(--yellow);color:#1a1000;border:none;border-radius:12px;padding:0.95rem;font-family:'Poppins',sans-serif;font-size:0.9rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;transition:all 0.3s cubic-bezier(0.23,1,0.32,1);box-shadow:0 8px 24px rgba(245,168,0,0.25);display:flex;align-items:center;justify-content:center;gap:0.5rem;}
        .btn-submit:hover{background:var(--yellow-d);transform:translateY(-2px);box-shadow:0 12px 32px rgba(245,168,0,0.42);}
        .btn-submit:active{transform:translateY(0);}

        .register-row{display:flex;align-items:center;justify-content:center;gap:0.4rem;margin-top:1.25rem;font-size:0.78rem;color:var(--text-dim);}
        .register-row a{color:var(--yellow);text-decoration:none;font-weight:600;transition:opacity 0.2s;}
        .register-row a:hover{opacity:0.75;}

        footer{background:rgba(0,0,0,0.5);backdrop-filter:blur(16px);border-top:1px solid var(--glass-border);padding:1.25rem 3rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;}
        .footer-brand{font-size:1.1rem;font-weight:700;color:white;}
        .footer-brand span{color:var(--yellow);}
        .footer-copy{font-size:0.72rem;color:var(--text-dim);}

        @keyframes fadeUp{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px);}to{opacity:1;transform:translateX(0);}}

        @media(max-width:500px){
            nav{padding:0.875rem 1.25rem;}
            .form-card{padding:1.75rem 1.25rem;}
            footer{padding:1.25rem;flex-direction:column;text-align:center;}
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
 * VendorLogin Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {string|null} props.csrfToken - CSRF token for secure form submission
 */
export default function VendorLogin({
    successMessage = null,
    failureMessage = null,
    csrfToken = null
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [formError, setFormError] = useState('');
    const { login } = useAuth();
    
    const dropdownRef = useRef(null);

    // Handle scroll for navbar styling
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Handle clicking outside the dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Handle alert fade out
    useEffect(() => {
        if (showSuccess || showFailure) {
            const fadeTimer = setTimeout(() => {
                setFadeAlerts(true);
            }, 2500);
            const removeTimer = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 3000);
            
            return () => {
                clearTimeout(fadeTimer);
                clearTimeout(removeTimer);
            };
        }
    }, [showSuccess, showFailure]);

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Vendor Login</title>
            <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3Cpath fill='%23f5a800' d='M528.12 301.319l47.273-208C578.806 78.301 567.391 64 551.99 64H159.208l-9.166-44.81C147.758 8.021 137.93 0 126.529 0H24C10.745 0 0 10.745 0 24v16c0 13.255 10.745 24 24 24h69.883l70.248 343.435C147.325 417.1 136 435.222 136 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-15.674-6.447-29.835-16.824-40h209.647C430.447 426.165 424 440.326 424 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-22.172-12.888-41.332-31.579-50.405l5.517-24.276c3.413-15.018-8.002-29.319-23.403-29.319H218.117l-6.545-32h293.145c11.206 0 20.92-7.754 23.403-18.681z'/%3E%3C/svg%3E" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button type="button" className="alert-close" onClick={() => setShowSuccess(false)}>x</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={alertStyle}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button type="button" className="alert-close" onClick={() => setShowFailure(false)}>x</button>
                    </div>
                )}
            </div>

            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <Link to="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </Link>
                <div className={`nav-dropdown ${isDropdownOpen ? 'open' : ''}`} id="accountDropdown" ref={dropdownRef}>
                    <button type="button" className="nav-dropdown-btn" onClick={toggleDropdown}>
                        <i className="fas fa-user"></i> Account <i className="fas fa-chevron-down" style={{ fontSize: '0.65rem' }}></i>
                    </button>
                    <div className="dropdown-menu">
                        <div className="dropdown-label">Vendor</div>
                        <Link to="/vendor/login" className="dropdown-item"><i className="fas fa-sign-in-alt"></i> Vendor Login</Link>
                        <Link to="/vendor/register" className="dropdown-item"><i className="fas fa-user-plus"></i> Vendor Register</Link>
                        <div className="dropdown-divider"></div>
                        <div className="dropdown-label">Customer</div>
                        <Link to="/login" className="dropdown-item"><i className="fas fa-sign-in-alt"></i> Customer Login</Link>
                        <Link to="/register" className="dropdown-item"><i className="fas fa-user-plus"></i> Customer Register</Link>
                        <div className="dropdown-divider"></div>
                        <div className="dropdown-label">Admin</div>
                        <Link to="/admin/login" className="dropdown-item"><i className="fas fa-sign-in-alt"></i> Admin Login</Link>
                    </div>
                </div>
            </nav>

            <main className="page">
                <div className="form-card">
                    <div className="card-top">
                        <div className="card-icon"><i className="fas fa-store" style={{ color: 'var(--yellow)' }}></i></div>
                        <h1>Vendor <span>Login</span></h1>
                        <p>Sign in to manage your Ekart store.</p>
                    </div>

                    <div className="section-label"><i className="fas fa-key"></i> Credentials</div>

                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setFormError('');
                        try {
                            const res = await vendorAuthApi.login(email, passwordInput);
                            if (res?.data?.success) {
                                const user = { vendorId: res.data.vendorId, name: res.data.name, email: res.data.email };
                                saveToken(res.data.token, user, 'vendor');
                                login(user, 'vendor');
                                navigate('/vendor');
                            } else {
                                setFormError(res?.data?.message || 'Login failed');
                            }
                        } catch (err) {
                            setFormError('Invalid email or password');
                        }
                    }}>
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}

                        {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <div className="input-wrapper">
                                <i className="fas fa-envelope input-icon"></i>
                                <input type="email" id="email" name="email" className="form-control" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrapper">
                                <i className="fas fa-lock input-icon"></i>
                                <input type="password" id="password" name="password" className="form-control" placeholder="Enter your password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
                            </div>
                        </div>
                        <div className="forgot-link">
                            <Link to="/vendor/forgot-password">Forgot Password?</Link>
                        </div>
                        <button type="submit" className="btn-submit">
                            <i className="fas fa-sign-in-alt"></i> Login
                        </button>
                    </form>

                    {/* Social Login Section */}
                    <div className="social-divider">
                        <span>or continue with</span>
                    </div>
                    
                    <div className="social-buttons">
                        <a href="/oauth2/authorize/google?type=vendor" className="social-btn google-btn">
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </a>
                        <a href="/oauth2/authorize/facebook?type=vendor" className="social-btn facebook-btn">
                            <i className="fab fa-facebook-f"></i>
                            Facebook
                        </a>
                        <a href="/oauth2/authorize/instagram?type=vendor" className="social-btn instagram-btn">
                            <i className="fab fa-instagram"></i>
                            Instagram
                        </a>
                    </div>

                    <div className="register-row">
                        Don't have an account? <Link to="/vendor/register">Register here</Link>
                    </div>
                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">&#169; 2026 Ekart. All rights reserved.</div>
            </footer>

            
        </>
    );
}