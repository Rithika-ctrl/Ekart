import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - Access Denied (403) Component
 * * This component provides a user-friendly "Access Denied" page for unauthorized access attempts.
 * It includes options to redirect to the Admin Login or the Home page.
 */
export default function AccessDenied() {
    
    const CSS = `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        #root { font-family: 'Segoe UI', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f4f6fb; color: #1a1a2e; }
        .card { background: #fff; border-radius: 20px; padding: 3rem 2.5rem; text-align: center; max-width: 420px; width: 90%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .icon-wrap { width: 80px; height: 80px; background: #fff0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .icon-wrap i { font-size: 2rem; color: #e24b4a; }
        h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 0.5rem; }
        .code { font-size: 3rem; font-weight: 800; color: #e24b4a; margin-bottom: 0.25rem; }
        p { color: #666; font-size: 0.95rem; line-height: 1.6; margin-bottom: 2rem; }
        .btn-group { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.4rem; border-radius: 10px; font-size: 0.9rem; font-weight: 600; text-decoration: none; cursor: pointer; border: none; transition: opacity 0.2s, transform 0.15s; }
        .btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-primary { background: #e24b4a; color: #fff; }
        .btn-ghost { background: #f0f0f0; color: #333; }`;

    return (
        <div className="access-denied-body">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
            
            <div className="access-denied-card">
                <div className="icon-wrap">
                    <i className="fas fa-shield-alt"></i>
                </div>
                <div className="code">403</div>
                <h1>Access Denied</h1>
                <p>
                    You don't have permission to view this page. Please login with an account that has the required access level.
                </p>
                <div className="btn-group">
                    <Link to="/admin/login" className="btn btn-primary">
                        <i className="fas fa-sign-in-alt"></i> Admin Login
                    </Link>
                    <Link to="/" className="btn btn-ghost">
                        <i className="fas fa-home"></i> Home
                    </Link>
                </div>
            </div>
        </div>
    );
}