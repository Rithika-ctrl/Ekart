import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import '../styles/vendor-glass.css'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function VendorLogin() {
  const navigate  = useNavigate()
  const { login, isAuthenticated, isVendor } = useAuth()
  const toast = useToast()

  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [ddOpen, setDdOpen]   = useState(false)

  useEffect(() => {
    if (isAuthenticated && isVendor) navigate('/vendor/home', { replace: true })
  }, [isAuthenticated, isVendor, navigate])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.vnd-dd-wrap')) setDdOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password) { toast.error('Please fill in all fields.'); return }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/flutter/auth/vendor/login', {
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (!data.success) { toast.error(data.message || 'Login failed.'); return }
      login({ type: 'vendor', id: data.vendorId, name: data.name, email: data.email, token: data.token, vendorCode: data.vendorCode })
      toast.success(`Welcome back, ${data.name}!`)
      navigate('/vendor/home', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = (provider) => { window.location.href = `/oauth2/authorize/${provider}?type=vendor` }

  return (
    <div className="vnd" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div className="vnd-bg" aria-hidden="true" />

      {/* Nav */}
      <nav className="vnd-nav">
        <Link to="/" className="vnd-nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }} aria-hidden="true" />
          E<span>kart</span>
        </Link>
        <div className="vnd-dd-wrap" style={{ position: 'relative' }}>
          <button
            className="vnd-nav-link"
            style={{ background: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}
            onClick={() => setDdOpen(v => !v)}
            aria-haspopup="true" aria-expanded={ddOpen}
          >
            <i className="fas fa-user" aria-hidden="true" /> Account{' '}
            <i className="fas fa-chevron-down" style={{ fontSize: '0.65rem' }} aria-hidden="true" />
          </button>
          {ddOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'rgba(10,12,30,0.97)', backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)', borderRadius: 12,
              padding: '0.5rem', minWidth: 210, zIndex: 200,
              boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
            }}>
              {[
                { label: 'Vendor Login',     href: '/vendor/login',    icon: 'sign-in-alt' },
                { label: 'Vendor Register',  href: '/vendor/register', icon: 'user-plus' },
                null,
                { label: 'Customer Login',   href: '/customer/login',  icon: 'sign-in-alt' },
                { label: 'Customer Register',href: '/customer/register',icon:'user-plus' },
                null,
                { label: 'Admin Login',      href: '/admin/login',     icon: 'shield-alt' },
              ].map((item, i) => item === null ? (
                <hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.3rem 0.5rem' }} />
              ) : (
                <Link key={item.href} to={item.href}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.78rem' }}
                  onClick={() => setDdOpen(false)}
                >
                  <i className={`fas fa-${item.icon}`} style={{ color: 'var(--yellow)', width: 14 }} aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Card */}
      <main className="vnd-page" style={{ flex: 1 }}>
        <div className="vnd-form-card">
          <div className="vnd-card-top">
            <div className="vnd-card-icon"><i className="fas fa-store" aria-hidden="true" /></div>
            <h1>Vendor <span>Login</span></h1>
            <p>Sign in to manage your Ekart store.</p>
          </div>

          <div className="vnd-section-label"><i className="fas fa-key" aria-hidden="true" /> Credentials</div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="vnd-form-group">
              <label htmlFor="vl-email">Email</label>
              <div className="vnd-input-wrap">
                <i className="fas fa-envelope vnd-input-icon" aria-hidden="true" />
                <input id="vl-email" className="vnd-input" type="email" name="email"
                  value={form.email} onChange={handleChange}
                  placeholder="you@example.com" autoComplete="email" required disabled={loading} />
              </div>
            </div>

            <div className="vnd-form-group">
              <label htmlFor="vl-password">Password</label>
              <div className="vnd-input-wrap">
                <i className="fas fa-lock vnd-input-icon" aria-hidden="true" />
                <input id="vl-password" className="vnd-input has-toggle"
                  type={showPw ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange}
                  placeholder="Enter your password" autoComplete="current-password" required disabled={loading} />
                <button type="button" className="vnd-input-toggle" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="vnd-forgot-link">
              <Link to="/vendor/forgot-password">Forgot Password?</Link>
            </div>

            <button type="submit" className="vnd-btn-submit" disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Signing in…</>
                : <><i className="fas fa-sign-in-alt" aria-hidden="true" /> Login</>}
            </button>
          </form>

          <div className="vnd-social-divider"><span>or continue with</span></div>
          <div className="vnd-social-btns">
            <button type="button" className="vnd-social-btn vnd-google-btn" onClick={() => handleOAuth('google')}>
              <GoogleIcon /> Google
            </button>
            <button type="button" className="vnd-social-btn vnd-facebook-btn" onClick={() => handleOAuth('facebook')}>
              <i className="fab fa-facebook-f" aria-hidden="true" /> Facebook
            </button>
            <button type="button" className="vnd-social-btn vnd-instagram-btn" onClick={() => handleOAuth('instagram')}>
              <i className="fab fa-instagram" aria-hidden="true" /> Instagram
            </button>
          </div>

          <div className="vnd-register-row">
            Don't have an account? <Link to="/vendor/register">Register here</Link>
          </div>
        </div>
      </main>

      <footer className="vnd-footer">
        <div className="vnd-footer-brand"><span>Ekart</span></div>
        <div className="vnd-footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>
    </div>
  )
}