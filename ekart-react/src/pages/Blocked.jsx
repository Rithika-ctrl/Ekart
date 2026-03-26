import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Blocked Component
 * * This component represents a restriction page for users accessing the platform 
 * from locations outside of India.
 */
export default function Blocked() {
    const CSS = `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        #root {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #0a0f1e 0%, #0d1a3a 50%, #080c18 100%);
            color: #ffffff;
        }
        .card {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 24px;
            padding: 3rem 2.5rem;
            text-align: center;
            max-width: 480px;
            width: 90%;
            backdrop-filter: blur(16px);
        }
        .flag { font-size: 4rem; margin-bottom: 1rem; }
        h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; }
        h1 span { color: #f5a800; }
        .subtitle {
            font-size: 0.9rem; color: rgba(255,255,255,0.6);
            line-height: 1.7; margin-bottom: 2rem;
        }
        .divider {
            width: 60px; height: 3px;
            background: linear-gradient(90deg, #f5a800, #ff6b35);
            border-radius: 2px; margin: 1.5rem auto;
        }
        .info-box {
            background: rgba(245,168,0,0.08);
            border: 1px solid rgba(245,168,0,0.25);
            border-radius: 12px; padding: 1.25rem;
            font-size: 0.82rem; color: rgba(255,255,255,0.65);
            line-height: 1.7;
        }
        .info-box strong { color: #f5a800; }`;

    return (
        <div className="blocked-container">
            <style>{CSS}</style>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
            <div className="card">
                <div className="flag">🇮🇳</div>
                <h1>Ekart is <span>India Only</span></h1>
                <div className="divider"></div>
                <p className="subtitle">
                    We currently serve customers within India only.<br />
                    Your location appears to be outside India.
                </p>
                <div className="info-box">
                    <strong>Why am I seeing this?</strong><br />
                    Ekart delivers exclusively within India. Access from other countries
                    is restricted. If you are in India and seeing this page,
                    please check your VPN settings or contact support.
                </div>
            </div>
        </div>
    );
}