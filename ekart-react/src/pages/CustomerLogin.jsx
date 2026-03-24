import { useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, saveToken } from '../utils/api';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import '../styles/customer-login.css';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Form state ────────────────────────────────────────────────────────
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Toast state ───────────────────────────────────────────────────────
  const [toast, setToast] = useState(() => {
    // Handle ?deleted=true query param (account deletion redirect)
    if (searchParams.get('deleted') === 'true') {
      return { type: 'success', message: 'Your account has been permanently deleted.' };
    }
    return { type: 'success', message: '' };
  });

  const clearToast = useCallback(() => setToast((t) => ({ ...t, message: '' })), []);

  const showToast = (type, message) => setToast({ type, message });

  // ── Input handler ─────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Submit → POST /api/flutter/auth/login ─────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await authApi.login(form.email, form.password);

      if (data.success) {
        saveToken(data.token, data.customer);
        showToast('success', 'Login successful! Redirecting…');

        // Redirect based on role
        const role = data.customer?.role;
        setTimeout(() => {
          if (role === 'VENDOR') navigate('/vendor/home');
          else if (role === 'ADMIN') navigate('/admin/home');
          else navigate('/home');
        }, 800);
      } else {
        showToast('danger', data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Unable to connect. Please try again later.';
      showToast('danger', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Blurred background */}
      <div className="bg-layer" />

      <Navbar />

      {/* Toast alerts */}
      <div className="alert-stack">
        <Toast type={toast.type} message={toast.message} onClose={clearToast} />
      </div>

      {/* Login card */}
      <main className="login-card">
        <div className="card-icon">
          <i className="fas fa-user-lock"></i>
        </div>

        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to your Ekart account</p>

        {/* Role switcher pills */}
        <div className="role-pills">
          <span className="role-pill active">
            <i className="fas fa-user" style={{ fontSize: '.65rem' }}></i> Customer
          </span>
          <a href="/vendor/login" className="role-pill">
            <i className="fas fa-store" style={{ fontSize: '.65rem' }}></i> Vendor
          </a>
          <a href="/admin/login" className="role-pill">
            <i className="fas fa-shield-alt" style={{ fontSize: '.65rem' }}></i> Admin
          </a>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrap">
              <i className="fas fa-envelope field-icon"></i>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <i className="fas fa-lock field-icon"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <span
                className="pw-toggle"
                role="button"
                tabIndex={0}
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword((v) => !v)}
                onKeyDown={(e) => e.key === 'Enter' && setShowPassword((v) => !v)}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} id="pw-eye"></i>
              </span>
            </div>
            <Link to="/customer/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <hr className="form-divider" />

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Signing in…
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> Log In
              </>
            )}
          </button>
        </form>

        {/* OAuth social login */}
        <div className="social-divider">
          <span>or continue with</span>
        </div>

        <div className="social-buttons">
          <a href="/oauth2/authorize/google?type=customer" className="social-btn google-btn">
            {/* Google SVG icon */}
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </a>

          <a href="/oauth2/authorize/facebook?type=customer" className="social-btn facebook-btn">
            <i className="fab fa-facebook-f"></i> Facebook
          </a>

          <a href="/oauth2/authorize/instagram?type=customer" className="social-btn instagram-btn">
            <i className="fab fa-instagram"></i> Instagram
          </a>
        </div>

        <p className="card-footer-text">
          Don't have an account?{' '}
          <Link to="/register">Sign up free</Link>
        </p>
      </main>

      <p className="card-footer-text" style={{ marginTop: '0.75rem' }}>
        Just looking?{' '}
        <a href="/guest/start">Browse as Guest</a>
      </p>

      <div className="brand-mark">
        Ekart · <span>Secure Login</span>
      </div>
    </>
  );
}