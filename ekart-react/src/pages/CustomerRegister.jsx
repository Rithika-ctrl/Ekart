import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, saveToken } from '../utils/api';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import '../styles/auth.css';

function getStrength(password) {
  let s = 0;
  if (password.length >= 6)       s += 20;
  if (/[A-Z]/.test(password))     s += 20;
  if (/[a-z]/.test(password))     s += 20;
  if (/[0-9]/.test(password))     s += 20;
  if (/[@$!%*?&]/.test(password)) s += 20;
  return s;
}

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [toast, setToast]             = useState({ type: 'success', message: '' });

  const strength      = getStrength(form.password);
  const strengthColor = strength < 60 ? '#ef4444' : strength < 100 ? '#f5a800' : '#22c55e';
  const strengthLabel = strength === 0
    ? 'Must be 6+ chars with A, a, 1, @'
    : `Strength: ${strength < 60 ? 'Weak' : strength < 100 ? 'Medium' : 'Strong ✓'}`;

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())                        errs.name            = 'Name is required';
    if (!form.mobile.trim())                      errs.mobile          = 'Mobile is required';
    if (!form.email.trim())                       errs.email           = 'Email is required';
    if (form.password.length < 6)                 errs.password        = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword)   errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      // POST /api/flutter/auth/register
      const { data } = await authApi.register(form.name, form.email, form.password, form.mobile);
      if (data.success) {
        saveToken(data.token, data.customer);
        setToast({ type: 'success', message: 'Account created! Redirecting…' });
        setTimeout(() => navigate('/home'), 900);
      } else {
        setToast({ type: 'danger', message: data.message || 'Registration failed.' });
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Unable to connect.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="bg-layer" />
      <Navbar />

      <div className="alert-stack">
        <Toast type={toast.type} message={toast.message}
          onClose={() => setToast(t => ({ ...t, message: '' }))} />
      </div>

      <div className="page-wrapper">
        <div className="auth-card" style={{ maxWidth: 500, top: 0 }}>
          <div className="card-header-area">
            <div className="card-icon"><i className="fas fa-user-plus"></i></div>
            <h1>Create Account</h1>
            <p>Join Ekart — it's free and takes under a minute.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrap">
                  <i className="fas fa-user"></i>
                  <input type="text" id="name" name="name" placeholder="John Doe"
                    value={form.name} onChange={handleChange} />
                </div>
                {errors.name && <span className="error-msg">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="mobile">Mobile</label>
                <div className="input-wrap">
                  <i className="fas fa-phone"></i>
                  <input type="tel" id="mobile" name="mobile" placeholder="+91 9876543210"
                    value={form.mobile} onChange={handleChange} />
                </div>
                {errors.mobile && <span className="error-msg">{errors.mobile}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <i className="fas fa-envelope"></i>
                <input type="email" id="email" name="email" placeholder="you@example.com"
                  value={form.email} onChange={handleChange} />
              </div>
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <i className="fas fa-lock"></i>
                <input type={showPw ? 'text' : 'password'} id="password" name="password"
                  placeholder="Min 6 chars" value={form.password} onChange={handleChange} />
                <span className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                  <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </span>
              </div>
              {errors.password && <span className="error-msg">{errors.password}</span>}
              <div className="strength-wrap">
                <div className="strength-bar-bg">
                  <div className="strength-bar" style={{ width: strength + '%', background: strengthColor }}></div>
                </div>
                <div className="strength-text" style={{ color: strength === 0 ? 'rgba(255,255,255,0.4)' : strengthColor }}>
                  {strengthLabel}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrap">
                <i className="fas fa-lock"></i>
                <input type={showConfirm ? 'text' : 'password'} id="confirmPassword"
                  name="confirmPassword" placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={handleChange} />
                <span className="pw-toggle" onClick={() => setShowConfirm(v => !v)}>
                  <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </span>
              </div>
              {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword}</span>}
            </div>

            <hr className="form-divider" />

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin"></i> Creating…</>
                : <><i className="fas fa-user-plus"></i> Create My Account</>}
            </button>
          </form>

          <div className="card-footer-text">
            Already have an account? <Link to="/login">Sign in here</Link>
          </div>
        </div>
      </div>

      <footer className="auth-footer">
        <div className="footer-brand">Ek<span>art</span></div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>
    </div>
  );
}