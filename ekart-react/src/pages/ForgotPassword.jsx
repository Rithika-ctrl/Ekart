import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Toast from '../components/Toast';
import '../styles/auth.css';

export default function ForgotPassword() {
  const navigate      = useNavigate();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState({ type: 'success', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // POST /customer/forgot-password — existing Spring MVC endpoint
      await api.post('/customer/forgot-password', null, { params: { email } });
      setToast({ type: 'success', message: 'OTP sent! Check your email.' });
      setTimeout(() => navigate('/customer/otp'), 1200);
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Could not send OTP.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-layer" />

      <nav className="ekart-nav">
        <Link to="/" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
          Ek<span>art</span>
        </Link>
        <Link to="/login" className="nav-back">
          <i className="fas fa-arrow-left" style={{ fontSize: '.75rem' }}></i> Back to Login
        </Link>
      </nav>

      <div className="alert-stack">
        <Toast type={toast.type} message={toast.message}
          onClose={() => setToast(t => ({ ...t, message: '' }))} />
      </div>

      <div className="auth-card">
        <div className="card-icon"><i className="fas fa-key"></i></div>
        <h1>Forgot Password?</h1>
        <p className="subtitle">
          No worries! Enter your registered email and we'll send you a one-time password to reset it.
        </p>

        {/* Step indicator */}
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Registered Email Address</label>
            <div className="input-wrap">
              <i className="fas fa-envelope"></i>
              <input type="email" id="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="hint-text">
              <i className="fas fa-info-circle" style={{ fontSize: '.65rem', color: 'var(--yellow)' }}></i>
              We'll send a 6-digit OTP to this email.
            </div>
          </div>

          <hr className="form-divider" />

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Sending…</>
              : <><i className="fas fa-paper-plane"></i> Send OTP</>}
          </button>
        </form>

        <Link to="/login" className="back-link">
          <i className="fas fa-arrow-left" style={{ fontSize: '.7rem' }}></i> Back to Login
        </Link>
      </div>

      <div className="brand-mark">Ekart · Account Recovery</div>
    </>
  );
}