import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Toast from '../components/Toast';
import '../styles/auth.css';

export default function ResetPassword() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId     = searchParams.get('id');

  const [form, setForm]     = useState({ otp: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [toast, setToast]     = useState({ type: 'success', message: '' });

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.otp)                                errs.otp             = 'OTP is required';
    if (form.password.length < 6)                 errs.password        = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword)   errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      // POST /customer/reset-password — existing Spring MVC endpoint
      await api.post('/customer/reset-password', null, {
        params: { id: customerId, otp: form.otp, password: form.password, confirmPassword: form.confirmPassword }
      });
      setToast({ type: 'success', message: 'Password reset! Redirecting to login…' });
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Reset failed. Try again.' });
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
        <div className="card-icon"><i className="fas fa-lock-open"></i></div>
        <h1>Reset Password</h1>
        <p className="subtitle">Enter the OTP sent to your email and set a new password.</p>

        {/* Step indicator — step 3 active */}
        <div className="steps">
          <div className="step">
            <div className="step-dot inactive">1</div>
            <div className="step-label">Email</div>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-dot inactive">2</div>
            <div className="step-label">OTP</div>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-dot active">3</div>
            <div className="step-label active">Reset</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* OTP */}
          <div className="form-group">
            <label htmlFor="otp">Verification Code</label>
            <div className="input-wrap">
              <i className="fas fa-key"></i>
              <input type="text" id="otp" name="otp" placeholder="Enter OTP"
                value={form.otp} onChange={handleChange} inputMode="numeric" />
            </div>
            {errors.otp && <span className="error-msg">{errors.otp}</span>}
          </div>

          {/* New password */}
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="input-wrap">
              <i className="fas fa-lock"></i>
              <input type={showPw ? 'text' : 'password'} id="password" name="password"
                placeholder="Min 6 characters" value={form.password} onChange={handleChange} />
              <span className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            {errors.password && <span className="error-msg">{errors.password}</span>}
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrap">
              <i className="fas fa-check-double"></i>
              <input type="password" id="confirmPassword" name="confirmPassword"
                placeholder="Re-enter new password" value={form.confirmPassword} onChange={handleChange} />
            </div>
            {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword}</span>}
          </div>

          <hr className="form-divider" />

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Updating…</>
              : <><i className="fas fa-check"></i> Update Password</>}
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