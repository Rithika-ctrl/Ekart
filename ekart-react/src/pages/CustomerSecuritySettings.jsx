import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const CustomerSecuritySettings = ({ 
  customerEmail = "customer@ekart.com", 
  lastLoginTime = "01 Jan 2026, 10:00" 
}) => {
  return (
    <>
      {/* Embedded CSS */}
      <style dangerouslySetInnerHTML={{ __html: `:root {
            --yellow: #f5a800;
            --yellow-d: #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --glass-nav: rgba(0, 0, 0, 0.25);
            --text-white: #ffffff;
            --text-light: rgba(255,255,255,0.80);
            --text-dim: rgba(255,255,255,0.50);
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
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-right { display: flex; align-items: center; gap: 1rem; }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3);
            transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            max-width: 900px;
            margin: 0 auto;
            width: 100%;
        }
        .page-header {
            display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
        }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; }
        .page-header h1 span { color: var(--yellow); }
        .page-header p { font-size: 0.9rem; color: var(--text-dim); margin-top: 0.3rem; }
        .page-header-icon { font-size: 2.5rem; }
        .info-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 2rem;
        }
        .info-card h2 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .info-card h2 i { color: var(--yellow); }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .info-row:last-child { border-bottom: none; }
        .info-row-label {
            font-size: 0.85rem;
            color: var(--text-dim);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .info-row-label i { color: var(--yellow); font-size: 0.9rem; }
        .info-row-value {
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--text-white);
        }
        .status-badge {
            padding: 0.3rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            background: rgba(34,197,94,0.2);
            color: #22c55e;
            border: 1px solid rgba(34,197,94,0.4);
        }
        footer {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }
        @media(max-width: 1024px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            footer { flex-direction: column; text-align: center; gap: 0.5rem; }
        }`}} />

      <div className="bg-layer"></div>

      {/* NAV */}
      <nav id="nav">
        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
          Ekart
        </a>
        <div className="nav-right">
          <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout">
            <i className="fas fa-sign-out-alt"></i> Logout
          </a>
        </div>
      </nav>

      <main className="page">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Security <span>Settings</span> 🔐</h1>
            <p>View your account security details.</p>
          </div>
          <div className="page-header-icon">🛡️</div>
        </div>

        <div className="info-card">
          <h2><i className="fas fa-user-shield"></i> Customer Account</h2>
          
          <div className="info-row">
            <span className="info-row-label">
              <i className="fas fa-envelope"></i> Email
            </span>
            <span className="info-row-value">{customerEmail}</span>
          </div>
          
          <div className="info-row">
            <span className="info-row-label">
              <i className="fas fa-clock"></i> Last Login
            </span>
            <span className="info-row-value">{lastLoginTime}</span>
          </div>
          
          <div className="info-row">
            <span className="info-row-label">
              <i className="fas fa-check-circle"></i> Account Status
            </span>
            <span className="status-badge active">Active</span>
          </div>
        </div>
      </main>

      <footer>
        <div className="footer-brand">Ekart</div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>
    </>
  );
};

export default CustomerSecuritySettings;