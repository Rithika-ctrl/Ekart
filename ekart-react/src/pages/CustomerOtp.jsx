import React, { useState, useEffect, useRef } from 'react';

const CSS = `
        :root {
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

        body {
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

        /* ── ALERTS ── */
        .alert-stack {
            position: fixed; top: 1.5rem; right: 1.5rem;
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
        .alert-close {
            margin-left: auto; background: none; border: none;
            color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem;
        }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

        /* ── CARD ── */
        .otp-card {
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

        /* icon ring */
        .otp-icon-ring {
            width: 72px; height: 72px;
            background: rgba(245,168,0,0.15);
            border: 2px solid rgba(245,168,0,0.35);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 1.6rem; color: var(--yellow);
            animation: pulse-ring 2.5s ease-in-out infinite;
        }
        @keyframes pulse-ring {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245,168,0,0.3); }
            50%       { box-shadow: 0 0 0 12px rgba(245,168,0,0); }
        }

        .otp-card h1 {
            font-size: 1.6rem; font-weight: 700;
            color: white; margin-bottom: 0.5rem;
        }
        .otp-card .subtitle {
            font-size: 0.82rem; color: var(--text-dim);
            line-height: 1.65; margin-bottom: 2.25rem;
        }
        .otp-card .subtitle span { color: var(--yellow); font-weight: 600; }

        /* OTP input boxes */
        .otp-inputs {
            display: flex; gap: 0.75rem;
            justify-content: center; margin-bottom: 1.75rem;
        }
        .otp-box {
            width: 52px; height: 58px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 12px;
            font-family: 'Poppins', sans-serif;
            font-size: 1.5rem; font-weight: 700;
            color: white; text-align: center;
            outline: none; transition: all 0.25s;
            /* hide arrows on number input */
            -moz-appearance: textfield;
        }
        .otp-box::-webkit-outer-spin-button,
        .otp-box::-webkit-inner-spin-button { -webkit-appearance: none; }
        .otp-box:focus {
            border-color: var(--yellow);
            background: rgba(255,255,255,0.13);
            box-shadow: 0 0 0 3px rgba(245,168,0,0.18);
            transform: translateY(-2px);
        }
        .otp-box.filled { border-color: rgba(245,168,0,0.5); }

        /* hidden real input for form submission */
        #otp-hidden { display: none; }

        /* timer */
        .otp-timer {
            font-size: 0.78rem; color: var(--text-dim);
            margin-bottom: 1.75rem;
        }
        .otp-timer span { color: var(--yellow); font-weight: 600; }
        .resend-btn {
            background: none; border: none; cursor: pointer;
            color: var(--yellow); font-size: 0.78rem; font-weight: 600;
            font-family: 'Poppins', sans-serif;
            text-decoration: underline; display: none;
        }
        .resend-btn:hover { color: var(--yellow-d); }

        /* submit */
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
        .btn-submit:disabled {
            opacity: 0.5; cursor: not-allowed; transform: none;
        }

        .back-link {
            display: inline-flex; align-items: center; gap: 0.4rem;
            margin-top: 1.5rem; font-size: 0.78rem;
            color: var(--text-dim); text-decoration: none;
            transition: color 0.2s;
        }
        .back-link:hover { color: var(--text-white); }

        /* brand watermark bottom */
        .brand-mark {
            position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
            font-size: 0.75rem; color: var(--text-dim); letter-spacing: 0.1em;
        }
        .brand-mark span { color: var(--yellow); font-weight: 700; }
`;

/**
 * CustomerOtp Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {string|null} props.id - User/Request ID for verification
 * @param {string|null} props.csrfToken - CSRF token
 */
export default function CustomerOtp({
    successMessage = null,
    failureMessage = null,
    id = '',
    csrfToken = null
}) {
    const [otp, setOtp] = useState(Array(6).fill(''));
    const [timeLeft, setTimeLeft] = useState(120);
    const [showResend, setShowResend] = useState(false);
    const [resendStatus, setResendStatus] = useState('Resend OTP');
    const [resendDisabled, setResendDisabled] = useState(false);
    
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    
    const inputRefs = useRef([]);

    // Alerts auto-dismiss
    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => {
                setFadeAlerts(true);
            }, 2500);
            const timer2 = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 3000);
            
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, [showSuccess, showFailure]);

    // Timer logic
    useEffect(() => {
        if (timeLeft <= 0) {
            setShowResend(true);
            return;
        }
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    // Focus first input on mount
    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const formatTime = (seconds) => {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleResend = () => {
        // Hook this to your backend resend endpoint
        setResendStatus('OTP Sent!');
        setResendDisabled(true);
        setTimeout(() => {
            setResendStatus('Resend OTP');
            setResendDisabled(false);
        }, 30000);
    };

    const handleInputChange = (index, value) => {
        const val = value.replace(/\D/g, '');
        if (!val) {
            // Clearing the current input doesn't move focus
            const newOtp = [...otp];
            newOtp[index] = '';
            setOtp(newOtp);
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = val.slice(-1); // only take the last digit typed
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
            if (idx < 6) {
                newOtp[idx] = char;
            }
        });
        setOtp(newOtp);
        
        const nextFocus = Math.min(pasted.length, 5);
        inputRefs.current[nextFocus].focus();
    };

    const combinedOtp = otp.join('');
    const isSubmitDisabled = combinedOtp.length < 6;

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - OTP Verification</title>
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
            </div>

            <div className="otp-card">
                <div className="otp-icon-ring">
                    <i className="fas fa-shield-alt"></i>
                </div>

                <h1>OTP Verification</h1>
                <p className="subtitle">
                    We've sent a 6-digit code to your registered email.<br />
                    Enter it below to <span>verify your account.</span>
                </p>

                <form action="/customer/otp" method="post" id="otpForm">
                    {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="otp" id="otp-hidden" value={combinedOtp} />

                    <div className="otp-inputs">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                className={`otp-box ${digit ? 'filled' : ''}`}
                                type="text"
                                maxLength="1"
                                inputMode="numeric"
                                pattern="[0-9]"
                                value={digit}
                                onChange={e => handleInputChange(index, e.target.value)}
                                onKeyDown={e => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                            />
                        ))}
                    </div>

                    <div className="otp-timer">
                        {!showResend ? (
                            <>Code expires in <span id="timer">{formatTime(timeLeft)}</span></>
                        ) : (
                            <button 
                                type="button" 
                                className="resend-btn" 
                                id="resendBtn" 
                                style={{ display: 'inline' }}
                                onClick={handleResend}
                                disabled={resendDisabled}
                            >
                                {resendStatus}
                            </button>
                        )}
                    </div>

                    <button type="submit" className="btn-submit" id="verifyBtn" disabled={isSubmitDisabled}>
                        <i className="fas fa-check-circle"></i> Verify OTP
                    </button>
                </form>

                <a href="/customer/login" className="back-link">
                    <i className="fas fa-arrow-left" style={{ fontSize: '.7rem' }}></i> Back to Login
                </a>
            </div>

            <div className="brand-mark">Ek<span>art</span> · Secure Verification</div>
        </>
    );
}