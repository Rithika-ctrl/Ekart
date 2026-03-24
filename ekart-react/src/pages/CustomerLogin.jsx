import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────
   Ekart · CustomerLogin.jsx
   Converted from: customer-login.html (Thymeleaf)
   All th:* directives replaced with React state.
───────────────────────────────────────────────*/

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  :root {
    --yellow:       #f5a800;
    --yellow-d:     #d48f00;
    --glass-border: rgba(255,255,255,0.22);
    --glass-card:   rgba(255,255,255,0.13);
    --text-white:   #ffffff;
    --text-light:   rgba(255,255,255,0.80);
    --text-dim:     rgba(255,255,255,0.50);
    --input-bg:     rgba(255,255,255,0.08);
    --input-border: rgba(255,255,255,0.20);
  }

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  .ek-body {
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
    color: var(--text-white);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
  }

  /* ── BACKGROUND ── */
  .ek-bg {
    position: fixed; inset: 0; z-index: -1;
    overflow: hidden;
  }
  .ek-bg::before {
    content: '';
    position: absolute; inset: -20px;
    background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
    filter: blur(6px);
    transform: scale(1.08);
  }
  .ek-bg::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
  }

  /* ── NAV ── */
  .ek-nav {
    position: fixed; top:0; left:0; right:0; z-index:100;
    padding: 1rem 3rem;
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(0,0,0,0.25);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--glass-border);
  }
  .ek-nav-brand {
    font-size:1.6rem; font-weight:700;
    color:var(--text-white); text-decoration:none;
    letter-spacing:0.04em;
    display:flex; align-items:center; gap:0.5rem;
    cursor: pointer; background:none; border:none;
  }
  .ek-nav-brand span { color:var(--yellow); }

  .ek-nav-links { display:flex; align-items:center; gap:0.25rem; list-style:none; }
  .ek-nav-links a, .ek-nav-links button {
    color:var(--text-light); text-decoration:none;
    font-size:0.82rem; font-weight:500;
    padding:0.45rem 0.9rem; border-radius:6px;
    transition:all 0.2s; background:none; border:none; cursor:pointer;
    font-family:'Poppins',sans-serif;
  }
  .ek-nav-links a:hover, .ek-nav-links button:hover { color:white; background:rgba(255,255,255,0.1); }

  .ek-dropdown { position:relative; }
  .ek-dropdown-menu {
    position:absolute; top:calc(100% + 0.75rem); right:0;
    background:rgba(10,12,30,0.90);
    backdrop-filter:blur(20px);
    border:1px solid var(--glass-border);
    border-radius:10px; padding:0.5rem; min-width:210px;
    list-style:none;
  }
  .ek-dropdown-menu li a {
    display:flex; align-items:center; gap:0.625rem;
    padding:0.6rem 1rem; border-radius:7px;
    color:var(--text-light); text-decoration:none; font-size:0.82rem;
    transition:background 0.15s;
  }
  .ek-dropdown-menu li a:hover { background:rgba(255,255,255,0.1); color:white; }
  .ek-dropdown-divider { border:none; border-top:1px solid rgba(255,255,255,0.1); margin:0.3rem 0; }

  /* ── ALERTS ── */
  .ek-alert-stack {
    position:fixed; top:5rem; right:1.5rem;
    z-index:200; display:flex; flex-direction:column; gap:0.5rem;
  }
  .ek-alert {
    padding:0.875rem 1.25rem;
    background:rgba(10,12,30,0.88); backdrop-filter:blur(16px);
    border:1px solid; border-radius:10px;
    display:flex; align-items:center; gap:0.625rem;
    font-size:0.825rem; min-width:260px;
    animation:ek-slideIn 0.3s ease both;
    transition: opacity 0.5s;
  }
  .ek-alert-success { border-color:rgba(34,197,94,0.45); color:#22c55e; }
  .ek-alert-danger  { border-color:rgba(255,100,80,0.45); color:#ff8060; }
  .ek-alert-close {
    margin-left:auto; background:none; border:none;
    color:inherit; cursor:pointer; opacity:0.6; font-size:1rem;
  }
  @keyframes ek-slideIn {
    from { opacity:0; transform:translateX(14px); }
    to   { opacity:1; transform:translateX(0); }
  }

  /* ── LOGIN CARD ── */
  .ek-login-card {
    background:var(--glass-card);
    backdrop-filter:blur(22px);
    border:1px solid var(--glass-border);
    border-radius:24px;
    padding:3rem 2.5rem;
    width:100%; max-width:420px;
    box-shadow:0 24px 80px rgba(0,0,0,0.45);
    animation:ek-fadeUp 0.55s ease both;
    text-align:center;
  }
  @keyframes ek-fadeUp {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .ek-card-icon {
    width:60px; height:60px;
    background:rgba(245,168,0,0.15);
    border:2px solid rgba(245,168,0,0.35);
    border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 1.25rem;
    font-size:1.4rem; color:var(--yellow);
  }
  .ek-login-card h1 { font-size:1.6rem; font-weight:700; color:white; margin-bottom:0.4rem; }
  .ek-subtitle { font-size:0.8rem; color:var(--text-dim); margin-bottom:2rem; }

  /* ── FORM ── */
  .ek-form-group { margin-bottom:1.1rem; text-align:left; }
  .ek-form-group label {
    display:block;
    font-size:0.72rem; font-weight:600;
    letter-spacing:0.08em; text-transform:uppercase;
    color:var(--text-dim); margin-bottom:0.45rem;
  }
  .ek-input-wrap { position:relative; }
  .ek-field-icon {
    position:absolute; left:0.875rem; top:50%;
    transform:translateY(-50%);
    font-size:0.85rem; color:var(--text-dim);
    pointer-events:none; transition:color 0.2s;
  }
  .ek-input-wrap:focus-within .ek-field-icon { color:var(--yellow); }
  .ek-input-wrap input {
    width:100%;
    background:var(--input-bg);
    border:1px solid var(--input-border);
    border-radius:10px;
    padding:0.75rem 0.875rem 0.75rem 2.5rem;
    font-family:'Poppins',sans-serif;
    font-size:0.875rem; color:white;
    transition:all 0.25s; outline:none;
  }
  .ek-input-wrap input::placeholder { color:rgba(255,255,255,0.28); }
  .ek-input-wrap input:focus {
    border-color:rgba(245,168,0,0.55);
    background:rgba(255,255,255,0.12);
    box-shadow:0 0 0 3px rgba(245,168,0,0.12);
  }
  .ek-pw-toggle {
    position:absolute; right:0.875rem; top:50%;
    transform:translateY(-50%);
    cursor:pointer; color:var(--text-dim); font-size:0.85rem;
    transition:color 0.2s; background:none; border:none;
  }
  .ek-pw-toggle:hover { color:var(--yellow); }
  .ek-forgot-link {
    display:block; text-align:right;
    font-size:0.75rem; color:var(--yellow);
    text-decoration:none; margin-top:0.5rem;
    transition:opacity 0.2s; cursor:pointer;
  }
  .ek-forgot-link:hover { opacity:0.8; text-decoration:underline; }
  .ek-form-divider { border:none; border-top:1px solid rgba(255,255,255,0.1); margin:1.5rem 0; }

  .ek-btn-submit {
    width:100%;
    background:var(--yellow); color:#1a1000;
    border:none; border-radius:50px;
    padding:0.9rem;
    font-family:'Poppins',sans-serif;
    font-size:0.875rem; font-weight:700;
    letter-spacing:0.1em; text-transform:uppercase;
    cursor:pointer; transition:all 0.3s;
    display:flex; align-items:center; justify-content:center; gap:0.5rem;
    box-shadow:0 6px 24px rgba(245,168,0,0.35);
  }
  .ek-btn-submit:hover {
    background:var(--yellow-d);
    transform:translateY(-2px);
    box-shadow:0 10px 32px rgba(245,168,0,0.5);
  }
  .ek-btn-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

  .ek-card-footer { margin-top:1.5rem; font-size:0.8rem; color:var(--text-dim); }
  .ek-card-footer a { color:var(--yellow); font-weight:600; text-decoration:none; margin-left:0.25rem; }
  .ek-card-footer a:hover { text-decoration:underline; }

  /* ── ROLE PILLS ── */
  .ek-role-pills {
    display:flex; gap:0.5rem; justify-content:center;
    margin-bottom:1.75rem; flex-wrap:wrap;
  }
  .ek-role-pill {
    font-size:0.7rem; font-weight:600; letter-spacing:0.06em;
    padding:0.35rem 1rem; border-radius:50px;
    text-decoration:none; border:1px solid var(--glass-border);
    color:var(--text-dim); transition:all 0.2s;
    cursor:pointer; background:none;
    font-family:'Poppins',sans-serif;
  }
  .ek-role-pill:hover { border-color:rgba(245,168,0,0.4); color:var(--text-light); }
  .ek-role-pill.active {
    background:rgba(245,168,0,0.15);
    border-color:rgba(245,168,0,0.5);
    color:var(--yellow);
  }

  /* ── SOCIAL LOGIN ── */
  .ek-social-divider {
    display:flex; align-items:center;
    margin:1.5rem 0;
    color:var(--text-dim); font-size:0.75rem;
  }
  .ek-social-divider::before, .ek-social-divider::after {
    content:''; flex:1;
    border-top:1px solid rgba(255,255,255,0.1);
  }
  .ek-social-divider span { padding:0 1rem; }
  .ek-social-buttons {
    display:flex; flex-wrap:wrap; gap:0.5rem;
    margin-bottom:1rem; justify-content:center;
  }
  .ek-social-btn {
    display:flex; align-items:center; justify-content:center; gap:0.4rem;
    padding:0.6rem 0.8rem; border-radius:8px;
    text-decoration:none; font-size:0.8rem; font-weight:500;
    transition:all 0.2s;
    border:1px solid var(--glass-border);
    min-width:100px; color:var(--text-white);
    font-family:'Poppins',sans-serif; cursor:pointer;
  }
  .ek-google-btn  { background:rgba(255,255,255,0.05); }
  .ek-google-btn:hover  { background:rgba(255,255,255,0.1); border-color:rgba(66,133,244,0.5); }
  .ek-fb-btn      { background:rgba(24,119,242,0.1); }
  .ek-fb-btn:hover      { background:rgba(24,119,242,0.2); border-color:rgba(24,119,242,0.5); }
  .ek-ig-btn      { background:rgba(225,48,108,0.1); }
  .ek-ig-btn:hover      { background:rgba(225,48,108,0.2); border-color:rgba(225,48,108,0.5); }

  /* ── BRAND MARK ── */
  .ek-brand-mark {
    position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%);
    font-size:0.72rem; color:var(--text-dim); letter-spacing:0.1em;
  }
  .ek-brand-mark span { color:var(--yellow); font-weight:700; }

  @media(max-width:480px) {
    .ek-nav { padding:0.875rem 1.25rem; }
    .ek-login-card { padding:2rem 1.5rem; }
  }
`;

/* ── Google SVG Icon ── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/* ══════════════════════════════════════════
   CustomerLogin Component
   ══════════════════════════════════════════ */
export default function CustomerLogin({
  /* Props mirror what Spring would put in session / query params */
  sessionSuccess = null,   // replaces th:if="${session.success}"
  sessionFailure = null,   // replaces th:if="${session.failure}"
  accountDeleted = false,  // replaces th:if="${param.deleted != null}"
  onNavigate = (path) => { window.location.href = path; },
  onLogin = async ({ email, password }) => {
    /* Default: real POST to /customer/login  */
    const res = await fetch("/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password }),
    });
    return res;
  },
}) {
  /* ── Local state ── */
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [alerts, setAlerts]       = useState(() => {
    const initial = [];
    if (sessionSuccess) initial.push({ id: Date.now(),     type: "success", msg: sessionSuccess });
    if (sessionFailure) initial.push({ id: Date.now() + 1, type: "danger",  msg: sessionFailure });
    if (accountDeleted) initial.push({ id: Date.now() + 2, type: "success", msg: "Your account has been permanently deleted." });
    return initial;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* ── Auto-dismiss alerts after 2.5 s (mirrors original JS) ── */
  useEffect(() => {
    if (alerts.length === 0) return;
    const t = setTimeout(() => setAlerts([]), 2500);
    return () => clearTimeout(t);
  }, [alerts]);

  /* ── Helpers ── */
  const dismissAlert = (id) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const addAlert = (type, msg) =>
    setAlerts((prev) => [...prev, { id: Date.now(), type, msg }]);

  /* ── Form submit — replaces <form action="/customer/login" method="post"> ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onLogin({ email, password });
      if (res.ok) {
        onNavigate("/customer/home");
      } else {
        const text = await res.text().catch(() => "Login failed. Please try again.");
        addAlert("danger", text || "Invalid credentials.");
      }
    } catch {
      addAlert("danger", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Inject scoped CSS */}
      <style>{styles}</style>

      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />

      <div className="ek-body">
        {/* Background */}
        <div className="ek-bg" />

        {/* ── Alerts (replaces th:if blocks) ── */}
        <div className="ek-alert-stack">
          {alerts.map((a) => (
            <div key={a.id} className={`ek-alert ek-alert-${a.type}`}>
              <i className={`fas fa-${a.type === "success" ? "check" : "exclamation"}-circle`} />
              <span>{a.msg}</span>
              <button className="ek-alert-close" onClick={() => dismissAlert(a.id)}>×</button>
            </div>
          ))}
        </div>

        {/* ── Nav ── */}
        <nav className="ek-nav">
          <button className="ek-nav-brand" onClick={() => onNavigate("/")}>
            <i className="fas fa-shopping-cart" style={{ fontSize: "1.1rem" }} />
            Ek<span>art</span>
          </button>

          <ul className="ek-nav-links">
            <li><a onClick={() => onNavigate("/products")}>Shop</a></li>

            <li className="ek-dropdown">
              <button onClick={() => setDropdownOpen((o) => !o)}>
                <i className="fas fa-user-circle" /> Account{" "}
                <i className="fas fa-angle-down" style={{ fontSize: ".65rem" }} />
              </button>

              {dropdownOpen && (
                <ul className="ek-dropdown-menu">
                  <li><a onClick={() => onNavigate("/customer/login")}>
                    <i className="fas fa-sign-in-alt" style={{ color: "var(--yellow)", width: 14 }} /> Customer Login
                  </a></li>
                  <li><a onClick={() => onNavigate("/customer/register")}>
                    <i className="fas fa-user-plus" style={{ color: "#7dc97d", width: 14 }} /> Customer Register
                  </a></li>
                  <hr className="ek-dropdown-divider" />
                  <li><a onClick={() => onNavigate("/vendor/login")}>
                    <i className="fas fa-store" style={{ color: "var(--yellow)", width: 14 }} /> Vendor Login
                  </a></li>
                  <li><a onClick={() => onNavigate("/vendor/register")}>
                    <i className="fas fa-store" style={{ color: "#7dc97d", width: 14 }} /> Vendor Register
                  </a></li>
                  <hr className="ek-dropdown-divider" />
                  <li><a onClick={() => onNavigate("/admin/login")}>
                    <i className="fas fa-shield-alt" style={{ color: "rgba(255,255,255,0.4)", width: 14 }} /> Admin Login
                  </a></li>
                </ul>
              )}
            </li>

            <li>
              <a
                onClick={() => onNavigate("/customer/register")}
                style={{
                  background: "var(--yellow)", color: "#1a1000", fontWeight: 700,
                  borderRadius: "50px", padding: ".45rem 1.2rem",
                }}
              >
                Register
              </a>
            </li>
          </ul>
        </nav>

        {/* ── Login Card ── */}
        <div className="ek-login-card">

          <div className="ek-card-icon">
            <i className="fas fa-user-lock" />
          </div>

          <h1>Welcome Back</h1>
          <p className="ek-subtitle">Sign in to your Ekart account</p>

          {/* Role switcher pills */}
          <div className="ek-role-pills">
            <button className="ek-role-pill active" onClick={() => onNavigate("/customer/login")}>
              <i className="fas fa-user" style={{ fontSize: ".65rem" }} /> Customer
            </button>
            <button className="ek-role-pill" onClick={() => onNavigate("/vendor/login")}>
              <i className="fas fa-store" style={{ fontSize: ".65rem" }} /> Vendor
            </button>
            <button className="ek-role-pill" onClick={() => onNavigate("/admin/login")}>
              <i className="fas fa-shield-alt" style={{ fontSize: ".65rem" }} /> Admin
            </button>
          </div>

          {/* Login form — replaces <form action="/customer/login" method="post"> */}
          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div className="ek-form-group">
              <label htmlFor="ek-email">Email Address</label>
              <div className="ek-input-wrap">
                <i className="fas fa-envelope ek-field-icon" />
                <input
                  type="email"
                  id="ek-email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="ek-form-group">
              <label htmlFor="ek-password">Password</label>
              <div className="ek-input-wrap">
                <i className="fas fa-lock ek-field-icon" />
                <input
                  type={showPw ? "text" : "password"}
                  id="ek-password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* Replaces onclick="togglePw()" */}
                <button
                  type="button"
                  className="ek-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  <i className={`fas fa-${showPw ? "eye-slash" : "eye"}`} />
                </button>
              </div>
              <a
                className="ek-forgot-link"
                onClick={() => onNavigate("/customer/forgot-password")}
              >
                Forgot password?
              </a>
            </div>

            <hr className="ek-form-divider" />

            <button type="submit" className="ek-btn-submit" disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin" /> Signing in…</>
                : <><i className="fas fa-sign-in-alt" /> Log In</>
              }
            </button>
          </form>

          {/* Social Login */}
          <div className="ek-social-divider"><span>or continue with</span></div>

          <div className="ek-social-buttons">
            <a
              href="/oauth2/authorize/google?type=customer"
              className="ek-social-btn ek-google-btn"
            >
              <GoogleIcon /> Google
            </a>
            <a
              href="/oauth2/authorize/facebook?type=customer"
              className="ek-social-btn ek-fb-btn"
            >
              <i className="fab fa-facebook-f" /> Facebook
            </a>
            <a
              href="/oauth2/authorize/instagram?type=customer"
              className="ek-social-btn ek-ig-btn"
            >
              <i className="fab fa-instagram" /> Instagram
            </a>
          </div>

          <div className="ek-card-footer">
            Don't have an account?
            <a onClick={() => onNavigate("/customer/register")}>Sign up free</a>
          </div>
        </div>

        {/* Guest link */}
        <div className="ek-card-footer" style={{ marginTop: "0.75rem" }}>
          Just looking?
          <a onClick={() => onNavigate("/guest/start")} style={{ marginLeft: "0.25rem" }}>
            Browse as Guest
          </a>
        </div>

        <div className="ek-brand-mark">Ekart · <span>Secure Login</span></div>
      </div>
    </>
  );
}