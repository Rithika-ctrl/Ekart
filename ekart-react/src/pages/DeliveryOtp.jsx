import React, { useState, useEffect, useRef } from 'react';

/**
 * Ekart - OTP Verification Component
 * @param {Object} props
 * @param {string|number} props.id - The unique identifier for the delivery partner account.
 * @param {Object} props.session - Session object for notifications {success: string, failure: string}.
 * @param {string} props.csrfToken - CSRF token value for security.
 */
export default function DeliveryOtp({
    id = "",
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [otpValues, setOtpValues] = useState(new Array(6).fill(""));
    const [alerts, setAlerts] = useState({ 
        success: session.success, 
        failure: session.failure 
    });

    // --- REFS ---
    const inputRefs = useRef([]);
    const hiddenInputRef = useRef(null);
    const formRef = useRef(null);

    // --- EFFECTS ---
    useEffect(() => {
        // Auto-focus first box on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }

        // Auto-dismiss alerts after 2.5 seconds
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        return () => clearTimeout(timer);
    }, [session]);

    // --- LOGIC ---
    const handleInput = (e, index) => {
        const val = e.target.value.replace(/[^0-9]/g, '').slice(-1);
        const newOtp = [...otpValues];
        newOtp[index] = val;
        setOtpValues(newOtp);

        // Move to next box if value entered
        if (val && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        // Move to previous box on backspace if current is empty
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otpValues];
        
        [...pastedData].forEach((char, index) => {
            newOtp[index] = char;
        });
        
        setOtpValues(newOtp);
        
        // Focus the last filled box or the next empty one
        const focusIndex = Math.min(pastedData.length, 5);
        inputRefs.current[focusIndex].focus();
    };

    const handleSubmit = (e) => {
        const otpString = otpValues.join('');
        if (otpString.length < 6) {
            e.preventDefault();
            inputRefs.current[0].focus();
        }
    };

    const CSS = `
        :root {
            --yellow: #f5a800;
            --yellow-d: #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --glass-nav: rgba(0, 0, 0, 0.25);
            --text-white: #ffffff;
            --text-light: rgba(255, 255, 255, 0.80);
            --text-dim: rgba(255, 255, 255, 0.50);
        }

        .otp-verification-container {
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
            border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 440px;
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

        .section-label { display: flex; align-items: center; gap: 0.6rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--yellow); margin-bottom: 1.1rem; }
        .section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

        .otp-group { display: flex; gap: 0.75rem; justify-content: center; margin-bottom: 1.5rem; }
        .otp-box {
            width: 52px; height: 60px; background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border);
            border-radius: 12px; text-align: center; font-family: 'Poppins', sans-serif; font-size: 1.4rem;
            font-weight: 700; color: white; transition: all 0.3s; caret-color: var(--yellow);
        }
        .otp-box:focus { outline: none; background: rgba(255,255,255,0.10); border-color: var(--yellow); box-shadow: 0 0 0 3px rgba(245,168,0,0.12); }
        .otp-box::placeholder { color: rgba(255,255,255,0.15); }

        .form-hint { display: flex; align-items: center; justify-content: center; gap: 0.35rem; font-size: 0.7rem; color: var(--text-dim); margin-bottom: 1.25rem; }
        .form-hint i { color: var(--yellow); font-size: 0.65rem; }

        .btn-submit {
            width: 100%; background: var(--yellow); color: #1a1000; border: none; border-radius: 12px;
            padding: 0.95rem; font-family: 'Poppins', sans-serif; font-size: 0.9rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1); box-shadow: 0 8px 24px rgba(245,168,0,0.25);
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .btn-submit:hover { background: var(--yellow-d); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(245,168,0,0.42); }

        .back-link { display: flex; align-items: center; justify-content: center; gap: 0.4rem; margin-top: 1.25rem; color: var(--text-dim); text-decoration: none; font-size: 0.78rem; transition: color 0.2s; }
        .back-link:hover { color: var(--text-white); }

        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px); border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem; display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width:500px) {
            nav { padding: 0.875rem 1.25rem; }
            .form-card { padding: 1.75rem 1.25rem; }
            .otp-box { width: 42px; height: 52px; font-size: 1.2rem; }
        }
    `;

    return (
        <div className="otp-verification-container">
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
                <a href="/delivery/login" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </a>
                <a href="/delivery/login" className="nav-link-btn">
                    <i className="fas fa-arrow-left"></i> Back to Login
                </a>
            </nav>

            <main className="page">
                <div className="form-card">
                    <div className="card-top">
                        <div className="card-icon">
                            <i className="fas fa-shield-alt" style={{ color: 'var(--yellow)' }}></i>
                        </div>
                        <h1>OTP <span>Verification</span></h1>
                        <p>Enter the 6-digit code sent to your registered email address to verify your delivery account.</p>
                    </div>

                    <div className="section-label"><i className="fas fa-hashtag"></i> Enter OTP</div>

                    <form action={`/delivery/otp/${id}`} method="post" id="otpForm" ref={formRef} onSubmit={handleSubmit}>
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        <input type="hidden" name="id" value={id} />

                        <div className="otp-group" aria-hidden="true">
                            {otpValues.map((val, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    className="otp-box"
                                    type="text"
                                    maxLength="1"
                                    inputMode="numeric"
                                    pattern="[0-9]"
                                    placeholder="0"
                                    value={val}
                                    onChange={(e) => handleInput(e, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    onPaste={handlePaste}
                                />
                            ))}
                        </div>

                        <input 
                            type="hidden" 
                            name="otp" 
                            id="otpHidden" 
                            ref={hiddenInputRef} 
                            value={otpValues.join('')} 
                        />

                        <div className="form-hint">
                            <i className="fas fa-info-circle"></i> Check your inbox — OTP expires shortly.
                        </div>

                        <button type="submit" className="btn-submit">
                            <i className="fas fa-check-circle"></i> Verify OTP
                        </button>
                    </form>

                    <a href="/delivery/login" className="back-link">
                        <i className="fas fa-arrow-left"></i> Back to Login
                    </a>
                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">&#169; 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}