import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Toast from '../components/Toast';
import '../styles/auth.css';

export default function CustomerOtp() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId     = searchParams.get('id');

  const [boxes, setBoxes]         = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [seconds, setSeconds]     = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [toast, setToast]         = useState({ type: 'success', message: '' });
  const inputRefs                 = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (seconds <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const timerStr = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const otp      = boxes.join('');

  const handleBoxChange = (val, idx) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...boxes];
    next[idx]   = digit;
    setBoxes(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !boxes[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
      const next = [...boxes]; next[idx - 1] = ''; setBoxes(next);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next   = ['', '', '', '', '', ''];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setBoxes(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    try {
      // POST /customer/otp — existing Spring MVC endpoint
      await api.post('/customer/otp', null, { params: { id: customerId, otp } });
      setToast({ type: 'success', message: 'Verified! Redirecting to login…' });
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Invalid OTP. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/customer/resend-otp', null, { params: { id: customerId } });
      setSeconds(120); setCanResend(false);
      setToast({ type: 'success', message: 'New OTP sent!' });
    } catch {
      setToast({ type: 'danger', message: 'Could not resend OTP.' });
    }
  };

  return (
    <>
      <div className="bg-layer" />

      <div className="alert-stack">
        <Toast type={toast.type} message={toast.message}
          onClose={() => setToast(t => ({ ...t, message: '' }))} />
      </div>

      <div className="auth-card">
        <div className="otp-icon-ring">
          <i className="fas fa-shield-alt"></i>
        </div>

        <h1>OTP Verification</h1>
        <p className="subtitle">
          We've sent a 6-digit code to your registered email.<br />
          Enter it below to <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>verify your account.</span>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="otp-inputs">
            {boxes.map((val, idx) => (
              <input
                key={idx}
                ref={el => inputRefs.current[idx] = el}
                className={`otp-box${val ? ' filled' : ''}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={val}
                autoFocus={idx === 0}
                onChange={e => handleBoxChange(e.target.value, idx)}
                onKeyDown={e => handleKeyDown(e, idx)}
                onPaste={handlePaste}
              />
            ))}
          </div>

          <div className="otp-timer">
            {canResend
              ? <button type="button" className="resend-btn" onClick={handleResend}>Resend OTP</button>
              : <>Code expires in <span>{timerStr}</span></>}
          </div>

          <button type="submit" className="btn-submit" disabled={otp.length < 6 || loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Verifying…</>
              : <><i className="fas fa-check-circle"></i> Verify OTP</>}
          </button>
        </form>

        <Link to="/login" className="back-link">
          <i className="fas fa-arrow-left" style={{ fontSize: '.7rem' }}></i> Back to Login
        </Link>
      </div>

      <div className="brand-mark">Ek<span>art</span> · Secure Verification</div>
    </>
  );
}