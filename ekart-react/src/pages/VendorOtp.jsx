import React, { useState, useEffect, useRef } from 'react';

const CSS = `
        :root {
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
        body{font-family:'Poppins',sans-serif;min-height:100vh;color:var(--text-white);display:flex;flex-direction:column;}

        .bg-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;}
        .bg-layer::before{content:'';position:absolute;inset:-20px;background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;filter:blur(6px);transform:scale(1.08);}
        .bg-layer::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%);}

        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:1rem 3rem;display:flex;align-items:center;justify-content:space-between;background:var(--glass-nav);backdrop-filter:blur(14px);border-bottom:1px solid var(--glass-border);transition:background 0.3s;}
        nav.scrolled{background:rgba(0,0,0,0.45);}
        .nav-brand{font-size:1.6rem;font-weight:700;color:var(--text-white);text-decoration:none;letter-spacing:0.04em;display:flex;align-items:center;gap:0.5rem;}
        .nav-brand span{color:var(--yellow);}
        .nav-link-btn{display:flex;align-items:center;gap:0.4rem;color:var(--text-light);text-decoration:none;font-size:0.82rem;font-weight:500;padding:0.45rem 0.9rem;border-radius:6px;border:1px solid var(--glass-border);transition:all 0.2s;}
        .nav-link-btn:hover{color:white;background:rgba(255,255,255,0.1);}

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
        .card-top p{font-size:0.78rem;color:var(--text-dim);line-height:1.6;}

        .section-label{display:flex;align-items:center;gap:0.6rem;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--yellow);margin-bottom:1.1rem;}
        .section-label::after{content:'';flex:1;height:1px;background:var(--glass-border);}

        /* OTP digit boxes */
        .otp-group{display:flex;gap:0.75rem;justify-content:center;margin-bottom:1.5rem;}
        .otp-box{width:52px;height:60px;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:12px;text-align:center;font-family:'Poppins',sans-serif;font-size:1.4rem;font-weight:700;color:white;transition:all 0.3s;caret-color:var(--yellow);}
        .otp-box:focus{outline:none;background:rgba(255,255,255,0.10);border-color:var(--yellow);box-shadow:0 0 0 3px rgba(245,168,0,0.12);}
        .otp-box::placeholder{color:rgba(255,255,255,0.15);}

        .form-hint{display:flex;align-items:center;gap:0.35rem;font-size:0.7rem;color:var(--text-dim);margin-left:0.15rem;}
        .form-hint i{color:var(--yellow);font-size:0.65rem;}

        .btn-submit{width:100%;background:var(--yellow);color:#1a1000;border:none;border-radius:12px;padding:0.95rem;font-family:'Poppins',sans-serif;font-size:0.9rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;transition:all 0.3s cubic-bezier(0.23,1,0.32,1);box-shadow:0 8px 24px rgba(245,168,0,0.25);display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:0.5rem;}
        .btn-submit:hover{background:var(--yellow-d);transform:translateY(-2px);box-shadow:0 12px 32px rgba(245,168,0,0.42);}
        .btn-submit:active{transform:translateY(0);}

        .back-link{display:flex;align-items:center;justify-content:center;gap:0.4rem;margin-top:1.25rem;color:var(--text-dim);text-decoration:none;font-size:0.78rem;transition:color 0.2s;}
        .back-link:hover{color:var(--text-white);}

        footer{background:rgba(0,0,0,0.5);backdrop-filter:blur(16px);border-top:1px solid var(--glass-border);padding:1.25rem 3rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;}
        .footer-brand{font-size:1.1rem;font-weight:700;color:white;}
        .footer-brand span{color:var(--yellow);}
        .footer-copy{font-size:0.72rem;color:var(--text-dim);}

        @keyframes fadeUp{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px);}to{opacity:1;transform:translateX(0);}}

        @media(max-width:500px){
            nav{padding:0.875rem 1.25rem;}
            .form-card{padding:1.75rem 1.25rem;}
            .otp-box{width:42px;height:52px;font-size:1.2rem;}
            footer{padding:1.25rem;flex-direction:column;text-align:center;}
        }
`;

/**
 * VendorOtp Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {string|null} props.id - User/Request ID for verification
 * @param {string|null} props.csrfToken - CSRF token
 */
export default function VendorOtp({
    successMessage = null,
    failureMessage = null,
    id = '',
    csrfToken = null
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [otp, setOtp] = useState(Array(6).fill(''));
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    
    const inputRefs = useRef([]);

    // Scroll effect
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Alerts auto-dismiss
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

    // Focus first input on mount
    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleInputChange = (index, value) => {
        const val = value.replace(/\D/g, '');
        if (!val) {
            const newOtp = [...otp];
            newOtp[index] = '';
            setOtp(newOtp);
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = val.slice(-1);
        setOtp(newOtp);

        if (index < 5 && val) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
            const newOtp = [...otp];
            newOtp[index - 1] = '';
            setOtp(newOtp);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        pasted.split('').forEach((char, idx) => {
            if (idx < 6) newOtp[idx] = char;
        });
        setOtp(newOtp);
        
        const nextFocus = Math.min(pasted.length, 5);
        inputRefs.current[nextFocus].focus();
    };

    const combinedOtp = otp.join('');

    const handleSubmit = (e) => {
        if (combinedOtp.length < 6) {
            e.preventDefault();
            inputRefs.current[0].focus();
        }
    };

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - OTP Verification</title>
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
                <a href="/vendor/login" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </a>
                <a href="/vendor/login" className="nav-link-btn">
                    <i className="fas fa-arrow-left"></i> Back to Login
                </a>
            </nav>

            <main className="page">
                <div className="form-card">

                    <div className="card-top">
                        <div className="card-icon"><i className="fas fa-shield-alt" style={{ color: 'var(--yellow)' }}></i></div>
                        <h1>OTP <span>Verification</span></h1>
                        <p>Enter the one-time password sent to your registered email address to continue.</p>
                    </div>

                    <div className="section-label"><i className="fas fa-hashtag"></i> Enter OTP</div>

                    <form action="/vendor/otp" method="post" id="otpForm" onSubmit={handleSubmit}>
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        <input type="hidden" name="id" value={id} />

                        <div className="otp-group" aria-hidden="true">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => inputRefs.current[index] = el}
                                    className="otp-box"
                                    type="text"
                                    maxLength="1"
                                    inputMode="numeric"
                                    pattern="[0-9]"
                                    placeholder="0"
                                    value={digit}
                                    onChange={e => handleInputChange(index, e.target.value)}
                                    onKeyDown={e => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                />
                            ))}
                        </div>

                        <input type="hidden" name="otp" id="otpHidden" value={combinedOtp} />

                        <span className="form-hint" style={{ justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <i className="fas fa-info-circle"></i> Check your inbox — the OTP expires shortly.
                        </span>

                        <button type="submit" className="btn-submit">
                            <i className="fas fa-check-circle"></i> Verify OTP
                        </button>
                    </form>

                    <a href="/vendor/login" className="back-link">
                        <i className="fas fa-arrow-left"></i> Back to Login
                    </a>
                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">&#169; 2026 Ekart. All rights reserved.</div>
            </footer>
        </>
    );
}