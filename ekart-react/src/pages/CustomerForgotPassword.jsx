import React, { useState, useEffect } from 'react';

const CustomerForgotPassword = ({ sessionSuccess, sessionFailure, csrfToken }) => {
  // --- Alerts State ---
  const [alerts, setAlerts] = useState({
    success: sessionSuccess,
    failure: sessionFailure
  });

  // Auto-dismiss alerts after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setAlerts({ success: null, failure: null });
    }, 2500);

    return () => clearTimeout(timer);
  }, [sessionSuccess, sessionFailure]);

  return (
    <>
      {/* Embedded CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
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
            background: #060a18; /* Fallback background */
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
        .nav-back {
            display: flex; align-items: center; gap: 0.5rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border);
            transition: all 0.2s;
        }
        .nav-back:hover { color: white; background: rgba(255,255,255,0.1); }

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

        /* ── CARD ── */
        .fp-card {
            background: var(--glass-card);
            backdrop-filter: blur(22px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 3rem 2.5rem;
            width: 100%; max-width: 420px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.45);
            animation: fadeUp 0.55s ease both;
            text-align: center;
            position: relative;
            z-index: 10;
        }
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* icon */
        .card-icon {
            width: 64px; height: 64px;
            background: rgba(245,168,0,0.15);
            border: 2px solid rgba(245,168,0,0.35);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.25rem;
            font-size: 1.5rem; color: var(--yellow);
        }

        .fp-card h1 {
            font-size: 1.55rem; font-weight: 700;
            color: white; margin-bottom: 0.4rem;
        }
        .fp-card .subtitle {
            font-size: 0.82rem; color: var(--text-dim);
            line-height: 1.65; margin-bottom: 2rem;
        }

        /* steps indicator */
        .steps {
            display: flex; align-items: center; justify-content: center;
            gap: 0; margin-bottom: 2rem;
        }
        .step {
            display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
        }
        .step-dot {
            width: 28px; height: 28px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.7rem; font-weight: 700;
            border: 1.5px solid;
        }
        .step-dot.active {
            background: rgba(245,168,0,0.2);
            border-color: var(--yellow); color: var(--yellow);
        }
        .step-dot.inactive {
            background: transparent;
            border-color: rgba(255,255,255,0.2); color: var(--text-dim);
        }
        .step-label {
            font-size: 0.62rem; color: var(--text-dim);
            letter-spacing: 0.06em; text-transform: uppercase;
            white-space: nowrap;
        }
        .step-label.active { color: var(--yellow); }
        .step-line {
            width: 48px; height: 1px;
            background: rgba(255,255,255,0.12);
            margin: 0 0.5rem; margin-bottom: 1.2rem;
            flex-shrink: 0;
        }

        /* form */
        .form-group { margin-bottom: 1.25rem; text-align: left; }
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

        .hint-text {
            font-size: 0.72rem; color: var(--text-dim);
            margin-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem;
        }

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

        .back-link {
            display: inline-flex; align-items: center; gap: 0.4rem;
            margin-top: 1.5rem; font-size: 0.78rem;
            color: var(--text-dim); text-decoration: none;
            transition: color 0.2s;
        }
        .back-link:hover { color: var(--text-white); }

        .brand-mark {
            position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
            font-size: 0.72rem; color: var(--text-dim); letter-spacing: 0.1em;
            white-space: nowrap;
        }
        .brand-mark span { color: var(--yellow); font-weight: 700; }

        @media(max-width: 480px) {
            nav { padding: 0.875rem 1.25rem; }
            .fp-card { padding: 2rem 1.5rem; }
            .step-line { width: 28px; }
        }
      `}} />

      <div className="bg-layer"></div>

      {/* Floating Alerts */}
      <div className="alert-stack">
        {alerts.success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            <span>{alerts.success}</span>
            <button type="button" className="alert-close" onClick={() => setAlerts({ ...alerts, success: null })}>×</button>
          </div>
        )}
        {alerts.failure && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle"></i>
            <span>{alerts.failure}</span>
            <button type="button" className="alert-close" onClick={() => setAlerts({ ...alerts, failure: null })}>×</button>
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav>
        <a href="/" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
          Ekart
        </a>
        <a href="/customer/login" className="nav-back">
          <i className="fas fa-arrow-left" style={{ fontSize: '.75rem' }}></i> Back to Login
        </a>
      </nav>

      {/* ── CARD ── */}
      <div className="fp-card">
        <div className="card-icon">
          <i className="fas fa-key"></i>
        </div>

        <h1>Forgot Password?</h1>
        <p className="subtitle">No worries! Enter your registered email and we'll send you a one-time password to reset it.</p>

        {/* Steps */}
        <div className="steps">
          <div className="step">
            <div className="step-dot active">1</div>
            <div className="step-label active">Email</div>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-dot inactive">2</div>
            <div className="step-label">OTP</div>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-dot inactive">3</div>
            <div className="step-label">Reset</div>
          </div>
        </div>

        <form action="/customer/forgot-password" method="post">
          {/* CSRF Token (Passed as a prop from server-side rendering setup if needed) */}
          {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
          
          <div className="form-group">
            <label htmlFor="email">Registered Email Address</label>
            <div className="input-wrap">
              <i className="fas fa-envelope field-icon"></i>
              <input 
                type="email" 
                id="email" 
                name="email"
                placeholder="you@example.com" 
                required 
              />
            </div>
            <div className="hint-text">
              <i className="fas fa-info-circle" style={{ fontSize: '.65rem', color: 'var(--yellow)' }}></i>
              We'll send a 6-digit OTP to this email.
            </div>
          </div>

          <hr className="form-divider" />

          <button type="submit" className="btn-submit">
            <i className="fas fa-paper-plane"></i> Send OTP
          </button>
        </form>

        <a href="/customer/login" className="back-link">
          <i className="fas fa-arrow-left" style={{ fontSize: '.7rem' }}></i> Back to Login
        </a>
      </div>

      <div className="brand-mark">Ekart · Account Recovery</div>
    </>
  );
};

export default CustomerForgotPassword;