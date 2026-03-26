import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - Error Page Component
 * @param {Object} props
 * @param {string} props.errorMessage - Debug information or specific error message to display.
 */
export default function Error({
    errorMessage = null
}) {
    // --- CSS ---
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

        #root {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
        }

        /* ── BACKGROUND ── */
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
            letter-spacing: 0.04em;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }

        /* ── PAGE CENTER ── */
        .page-center {
            flex: 1;
            display: flex; align-items: center; justify-content: center;
            padding: 7rem 1.5rem 3rem;
        }

        /* ── ERROR CARD ── */
        .error-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 3.5rem 3rem;
            width: 100%; max-width: 520px;
            text-align: center;
            box-shadow: 0 40px 100px rgba(0,0,0,0.5);
            animation: fadeUp 0.6s cubic-bezier(0.23,1,0.32,1) both;
        }

        /* ── PULSING ICON ── */
        .error-icon-wrap {
            width: 88px; height: 88px;
            margin: 0 auto 2rem;
            position: relative;
        }
        .error-icon-ring {
            position: absolute; inset: 0; border-radius: 50%;
            border: 2px solid rgba(255,100,80,0.3);
            animation: pulse-ring 2s ease-out infinite;
        }
        .error-icon-ring:nth-child(2) { animation-delay: 0.5s; }
        .error-icon-core {
            position: absolute; inset: 12px;
            background: rgba(255,100,80,0.12);
            border: 2px solid rgba(255,100,80,0.4);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.75rem; color: #ff8060;
        }

        @keyframes pulse-ring {
            0%   { transform: scale(1);   opacity: 0.6; }
            100% { transform: scale(1.55); opacity: 0; }
        }

        .error-title {
            font-size: 1.45rem; font-weight: 700;
            color: white; margin-bottom: 0.65rem;
        }
        .error-message {
            font-size: 0.845rem; color: var(--text-dim);
            line-height: 1.7; margin-bottom: 2rem;
        }

        /* ── DEBUG BOX ── */
        .debug-box {
            background: rgba(255,80,60,0.07);
            border: 1px solid rgba(255,80,60,0.25);
            border-radius: 12px;
            padding: 1rem 1.25rem;
            margin-bottom: 1.75rem;
            text-align: left;
        }
        .debug-label {
            font-size: 0.65rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.1em;
            color: rgba(255,100,80,0.7); margin-bottom: 0.4rem;
            display: flex; align-items: center; gap: 0.35rem;
        }
        .debug-text {
            font-size: 0.775rem; color: var(--text-dim);
            font-family: monospace; word-break: break-all; line-height: 1.6;
        }

        /* ── DIVIDER ── */
        .divider { border: none; border-top: 1px solid var(--glass-border); margin: 0 0 2rem; }

        /* ── BUTTONS ── */
        .btn-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

        .btn-back {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: transparent;
            border: 1px solid var(--glass-border);
            color: var(--text-light);
            padding: 0.8rem 1.5rem; border-radius: 12px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; font-weight: 600;
            text-decoration: none; cursor: pointer;
            transition: all 0.25s;
        }
        .btn-back:hover { background: rgba(255,255,255,0.08); color: white; border-color: rgba(255,255,255,0.35); }

        .btn-home {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 12px;
            padding: 0.8rem 2rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase;
            text-decoration: none; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow: 0 8px 24px rgba(245,168,0,0.25);
        }
        .btn-home:hover {
            background: var(--yellow-d); color: #1a1000;
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(245,168,0,0.42);
        }

        /* ── FOOTER ── */
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

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(28px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        @media(max-width: 600px) {
            nav { padding: 0.875rem 1.25rem; }
            .error-card { padding: 2.5rem 1.5rem; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }`;

    return (
        <div className="error-page-container">
            <style>{CSS}</style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            <div className="bg-layer"></div>

            <nav>
                <Link to="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </Link>
            </nav>

            <main className="page-center">
                <div className="error-card">

                    {/* Animated icon */}
                    <div className="error-icon-wrap">
                        <div className="error-icon-ring"></div>
                        <div className="error-icon-ring"></div>
                        <div className="error-icon-core">
                            <i className="fas fa-exclamation"></i>
                        </div>
                    </div>

                    <h1 className="error-title">Oops! Something went wrong</h1>
                    <p className="error-message">The page could not be processed. Please go back or return to the home page and try again.</p>

                    {/* Debug info box — only shown when errorMessage is present */}
                    {errorMessage && (
                        <div className="debug-box">
                            <div className="debug-label"><i className="fas fa-bug"></i> Debug Info</div>
                            <div className="debug-text">{errorMessage}</div>
                        </div>
                    )}

                    <hr className="divider" />

                    <div className="btn-actions">
                        <a href="javascript:history.back()" className="btn-back">
                            <i className="fas fa-arrow-left"></i> Go Back
                        </a>
                        <Link to="/" className="btn-home">
                            <i className="fas fa-house"></i> Go to Home
                        </Link>
                    </div>

                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}