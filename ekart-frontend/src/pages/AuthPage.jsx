import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { API_BASE } from "../api";

// Role → default URL (mirrors ROLE_HOME in App.jsx)
const ROLE_HOME = {
  CUSTOMER: "/shop/home",
  GUEST:    "/shop/home",
  VENDOR:   "/vendor/dashboard",
  ADMIN:    "/admin/overview",
  DELIVERY: "/delivery/dashboard",
};

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
  .auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--ek-bg);padding:24px;font-family:'DM Sans',sans-serif}
  .auth-card{background:var(--ek-surface);border-radius:20px;padding:40px;width:100%;max-width:420px;box-shadow:var(--ek-shadow);border:1px solid var(--ek-border)}
  .auth-logo{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:var(--ek-text);margin-bottom:28px;display:block}
  .auth-logo span{color:var(--ek-danger)}
  .auth-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;color:var(--ek-text)}
  .auth-sub{font-size:14px;color:var(--ek-muted);margin-bottom:28px}
  .role-tabs{display:flex;gap:6px;margin-bottom:24px}
  .role-tab{flex:1;padding:8px 6px;border-radius:8px;border:1.5px solid var(--ek-border);background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:var(--ek-muted);transition:all 200ms}
  .role-tab.active{background:var(--ek-text);color:var(--ek-surface);border-color:var(--ek-text)}
  .auth-tabs{display:flex;background:var(--ek-surface-muted);border-radius:10px;padding:3px;margin-bottom:24px;gap:3px}
  .auth-tab{flex:1;padding:8px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:var(--ek-muted);transition:all 200ms}
  .auth-tab.active{background:var(--ek-surface);color:var(--ek-text);box-shadow:0 1px 4px rgba(0,0,0,0.1)}
  .form-group{margin-bottom:16px}
  .form-label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:var(--ek-text)}
  .form-input{width:100%;padding:11px 14px;border:1.5px solid var(--ek-border);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:15px;outline:none;transition:border-color 200ms;background:var(--ek-input);box-sizing:border-box;color:var(--ek-text)}
  .form-input:focus{border-color:var(--ek-primary);background:var(--ek-surface)}
  .btn-primary{width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--ek-danger),#b91c1c);color:#fff;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 200ms;margin-top:4px}
  .btn-primary:hover{filter:brightness(1.03);transform:translateY(-1px)}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed;transform:none}
  .btn-google{width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--ek-border);background:var(--ek-surface);color:var(--ek-text);font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all 200ms;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px}
  .btn-google:hover{border-color:var(--ek-text);background:var(--ek-surface-alt);transform:translateY(-1px)}
  .social-row{display:flex;gap:8px;margin-top:8px}
  .btn-social{flex:1;padding:11px 8px;border-radius:10px;border:1.5px solid var(--ek-border);background:var(--ek-surface);color:var(--ek-text);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 200ms;display:flex;align-items:center;justify-content:center;gap:7px}
  .btn-social:hover{border-color:var(--ek-text);background:var(--ek-surface-alt);transform:translateY(-1px)}
  .btn-social.github:hover{border-color:#24292f;background:#f6f8fa}
  .btn-social.facebook:hover{border-color:#1877f2;background:#f0f5ff}
  .btn-social.instagram:hover{border-color:#c13584;background:#fff0f8}
  .divider{display:flex;align-items:center;gap:10px;margin:16px 0 4px;color:var(--ek-muted);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
  .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--ek-border)}
  .err-box{background:var(--ek-danger-soft);color:var(--ek-danger);padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px}
  .ok-box{background:var(--ek-success-soft);color:var(--ek-success);padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px}
  .link-btn{background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:var(--ek-danger);padding:0}
  .otp-row{display:flex;gap:10px;justify-content:center;margin:16px 0}
  .otp-inp{width:46px;height:54px;text-align:center;font-size:22px;font-weight:700;border-radius:10px;border:1.5px solid var(--ek-border);background:var(--ek-input);font-family:'Syne',sans-serif;outline:none;transition:border-color 200ms;color:var(--ek-text)}
  .otp-inp:focus{border-color:var(--ek-primary)}
  .back-link{background:none;border:none;cursor:pointer;font-size:13px;color:var(--ek-muted);font-family:'DM Sans',sans-serif;padding:12px 0 0;display:block;text-align:center;width:100%}
  .btn-guest{width:100%;padding:12px;border-radius:10px;border:1.5px dashed var(--ek-border);background:transparent;color:var(--ek-muted);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 200ms;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px}
  .btn-guest:hover{border-color:var(--ek-text);color:var(--ek-text);background:var(--ek-surface-alt)}
  .remember-row{display:flex;align-items:center;gap:8px;margin:12px 0 4px}
  .remember-row input[type=checkbox]{width:16px;height:16px;accent-color:var(--ek-danger);cursor:pointer;flex-shrink:0}
  .remember-row label{font-size:13px;color:var(--ek-muted);cursor:pointer;user-select:none}
  .screen-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;color:var(--ek-text)}
  .screen-sub{font-size:14px;color:var(--ek-muted);margin-bottom:20px;line-height:1.5}
  .timer-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
`;

export default function AuthPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  // After login, go to where the user was trying to reach, or their role's home.
  const from = location.state?.from?.pathname ?? null;

  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({ name: "", email: "", password: "", mobile: "", confirmPassword: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetForm, setResetForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  /**
   * rememberMe – controls which storage backend is used by App.login().
   *   true  → localStorage  (default; session survives browser restart)
   *   false → sessionStorage (session cleared when tab/browser is closed)
   */
  const [rememberMe, setRememberMe] = useState(true);
  const [timer, setTimer] = useState(120);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  // Delivery OTP flow — stores the email after registration so the verify step can use it
  const [deliveryOtpEmail, setDeliveryOtpEmail] = useState("");
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const clear = () => { setError(""); setInfo(""); };
  const fmtTimer = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (role === "delivery" && screen === "register" && warehouses.length === 0) {
      fetch(`${API_BASE}/auth/delivery/warehouses`).then(r => r.json()).then(d => {
        if (d.success) setWarehouses(d.warehouses || []);
      }).catch(() => {});
    }
  }, [role, screen]);

  useEffect(() => {
    if (screen === "otp" || screen === "register-otp" || screen === "delivery-otp") {
      setTimer(120);
      timerRef.current = setInterval(() => setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      }), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen]);

  async function post(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function handleLogin(e) {
    e.preventDefault(); clear(); setLoading(true);
    try {
      const data = await post(`/auth/${role}/login`, { email: form.email, password: form.password });
      if (!data.success) { setError(data.message || "Login failed"); setLoading(false); return; }
      const id = role === "customer" ? (data.customer?.id || data.customerId)
               : role === "vendor"   ? data.vendorId
               : role === "delivery" ? data.deliveryBoyId
               : null;
      const token = data.token || null;
      const user = { role: role.toUpperCase(), id, email: form.email, name: data.name || form.email, token };
      login(user, rememberMe);
      navigate(from ?? ROLE_HOME[user.role] ?? "/", { replace: true });
    } catch { setError("Network error — could not reach the server. Please try again."); }
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault(); clear();
    if (form.password !== form.confirmPassword) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      const body = {
        name: form.name, email: form.email, password: form.password,
        confirmPassword: form.confirmPassword, mobile: form.mobile,
      };
      if (role === "delivery") body.warehouseId = parseInt(warehouseId) || 0;

      // Customer & Vendor: send OTP first, then show verify screen
      if (role === "customer" || role === "vendor") {
        const data = await post(`/auth/${role}/send-register-otp`, { email: form.email, name: form.name });
        if (!data.success) { setError(data.message || "Could not send OTP"); setLoading(false); return; }
        setInfo("A 6-digit verification code was sent to " + form.email);
        setScreen("register-otp");
        setLoading(false);
        return;
      }

      // Delivery: submit, then show OTP verification step
      const data = await post(`/auth/${role}/register`, body);
      if (!data.success) { setError(data.message || "Registration failed"); setLoading(false); return; }
      setDeliveryOtpEmail(form.email);
      setOtp(["", "", "", "", "", ""]);
      setInfo("OTP sent to " + form.email + ". Please verify your email to continue.");
      setScreen("delivery-otp");
    } catch { setError("Network error."); }
    setLoading(false);
  }

  async function handleRegisterOtp(e) {
    e.preventDefault(); clear();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      // Step 1: verify the OTP
      const verifyData = await post(`/auth/${role}/verify-register-otp`, { email: form.email, otp: code });
      if (!verifyData.success) { setError(verifyData.message || "Invalid OTP"); setLoading(false); return; }

      // Step 2: complete registration
      const body = {
        name: form.name, email: form.email, password: form.password,
        confirmPassword: form.confirmPassword, mobile: form.mobile,
      };
      const regData = await post(`/auth/${role}/register`, body);
      if (!regData.success) { setError(regData.message || "Registration failed"); setLoading(false); return; }

      setOtp(["", "", "", "", "", ""]);
      setInfo(role === "vendor"
        ? "Email verified! Your store has been registered. Await admin approval before signing in."
        : "Email verified! Your account is ready. Please sign in.");
      setScreen("login");
    } catch { setError("Network error."); }
    setLoading(false);
  }

  async function resendRegisterOtp() {
    try {
      await post(`/auth/${role}/send-register-otp`, { email: form.email, name: form.name });
      setInfo("OTP resent!"); setTimer(120);
    } catch {}
  }

  async function handleForgot(e) {
    e.preventDefault(); clear(); setLoading(true);
    try {
      const data = await post(`/auth/${role}/forgot-password`, { email: form.email });
      if (!data.success) { setError(data.message || "Email not found"); setLoading(false); return; }
      setInfo("OTP sent to your email."); setScreen("otp");
    } catch { setError("Network error."); }
    setLoading(false);
  }

  async function handleOtp(e) {
    e.preventDefault(); clear();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      const data = await post(`/auth/${role}/verify-otp`, { email: form.email, otp: code });
      if (!data.success) { setError(data.message || "Invalid OTP"); setLoading(false); return; }
      setScreen("reset");
    } catch { setError("Network error."); }
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault(); clear();
    if (resetForm.newPassword !== resetForm.confirmPassword) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      const data = await post(`/auth/${role}/reset-password`, { email: form.email, newPassword: resetForm.newPassword });
      if (!data.success) { setError(data.message || "Reset failed"); setLoading(false); return; }
      setInfo("Password reset! Please sign in.");
      setScreen("login");
      setResetForm({ newPassword: "", confirmPassword: "" });
    } catch { setError("Network error."); }
    setLoading(false);
  }

  /**
   * Initiates a social OAuth2 login/register flow for the given provider.
   * Supported: google, github, facebook, instagram (customer + vendor only).
   * The backend /oauth2/authorize/{provider}?type=flutter-{role} validates the
   * provider+role combination before starting the OAuth dance.
   * On success the backend redirects to /oauth2/callback which OAuthCallback in App.jsx handles.
   */
  function handleSocialLogin(provider) {
    if (role !== "customer" && role !== "vendor") return;
    window.location.href = `/oauth2/authorize/${provider}?type=flutter-${role}`;
  }

  async function resendOtp() {
    try {
      await post(`/auth/${role}/forgot-password`, { email: form.email });
      setInfo("OTP resent!"); setTimer(120);
    } catch {}
  }

  async function handleDeliveryOtp(e) {
    e.preventDefault(); clear();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      const data = await post("/auth/delivery/verify-otp", { email: deliveryOtpEmail, otp: code });
      if (!data.success) { setError(data.message || "Invalid OTP"); setLoading(false); return; }
      setOtp(["", "", "", "", "", ""]);
      setScreen("delivery-pending");
    } catch { setError("Network error."); }
    setLoading(false);
  }

  async function resendDeliveryOtp() {
    try {
      const data = await post("/auth/delivery/resend-otp", { email: deliveryOtpEmail });
      if (data.success) { setInfo("New OTP sent!"); setTimer(120); }
      else setError(data.message || "Could not resend OTP");
    } catch { setError("Network error."); }
  }

  const handleOtpKey = (i, e) => {
    if (!/^\d*$/.test(e.target.value)) return;
    const n = [...otp]; n[i] = e.target.value.slice(-1); setOtp(n);
    if (e.target.value && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpBackspace = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const roles = [
    { id: "customer", label: "🛍️ Customer" },
    { id: "vendor",   label: "🏪 Vendor" },
    { id: "admin",    label: "⚙️ Admin" },
    { id: "delivery", label: "🛵 Delivery" },
  ];

  // ── Social login SVGs ──────────────────────────────────────────────────────
  const GOOGLE_SVG = (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
  const GITHUB_SVG = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
  const FACEBOOK_SVG = (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.932-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
  const INSTAGRAM_SVG = (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );

  /**
   * Renders the social login button group for customer/vendor screens.
   * Google is shown full-width first, then GitHub / Facebook / Instagram
   * in a compact 3-across row beneath it.
   */
  const SocialButtons = () => (
    <>
      <div className="divider">or continue with</div>
      <button type="button" className="btn-google" onClick={() => handleSocialLogin("google")}>
        {GOOGLE_SVG} Continue with Google
      </button>
      <div className="social-row">
        <button type="button" className="btn-social github" onClick={() => handleSocialLogin("github")} title="Continue with GitHub">
          {GITHUB_SVG} GitHub
        </button>
        <button type="button" className="btn-social facebook" onClick={() => handleSocialLogin("facebook")} title="Continue with Facebook">
          {FACEBOOK_SVG} Facebook
        </button>
        <button type="button" className="btn-social instagram" onClick={() => handleSocialLogin("instagram")} title="Continue with Instagram">
          {INSTAGRAM_SVG} Instagram
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{S}</style>
      <div className="auth-wrap">
        <div className="auth-card">
          <span className="auth-logo">e<span>kart</span></span>

          {/* Role switcher — only on login/register/forgot */}
          {["login", "register", "forgot"].includes(screen) && (
            <div className="role-tabs">
              {roles.map(r => (
                <button key={r.id} className={`role-tab${role === r.id ? " active" : ""}`} onClick={() => setRole(r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {/* Login / Register tabs */}
          {["login", "register"].includes(screen) && role !== "admin" && (
            <div className="auth-tabs">
              <button className={`auth-tab${screen === "login" ? " active" : ""}`} onClick={() => { setScreen("login"); clear(); }}>Sign In</button>
              <button className={`auth-tab${screen === "register" ? " active" : ""}`} onClick={() => { setScreen("register"); clear(); }}>Register</button>
            </div>
          )}

          {error && <div className="err-box">{error}</div>}
          {info  && <div className="ok-box">{info}</div>}

          {/* ── LOGIN ── */}
          {screen === "login" && (
            <form onSubmit={handleLogin}>
              <div className="auth-title">Welcome back</div>
              <div className="auth-sub">Sign in to your {role} account</div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} required />
              </div>
              {role !== "admin" && role !== "delivery" && (
                <div style={{ textAlign: "right", marginBottom: 12 }}>
                  <button type="button" className="link-btn" onClick={() => { setScreen("forgot"); clear(); }}>Forgot password?</button>
                </div>
              )}
              <div className="remember-row">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Signing in…" : `Sign in as ${role}`}
              </button>

              {/* Social login — customer & vendor only */}
              {(role === "customer" || role === "vendor") && <SocialButtons />}

              {/* Guest browse — customer only */}
              {role === "customer" && (
                <>
                  <div className="divider">or</div>
                  <button
                    type="button"
                    className="btn-guest"
                    onClick={() => {
                      login({ role: "GUEST", id: null, name: "Guest", email: null, token: null }, false);
                      navigate("/shop/home", { replace: true });
                    }}
                  >
                    &#x1F441; Browse as Guest
                  </button>
                  <p style={{ textAlign: "center", fontSize: 11, color: "rgba(13,13,13,0.4)", marginTop: 8, marginBottom: 0 }}>
                    Browse products freely. Sign in to shop, track &amp; save.
                  </p>
                </>
              )}
            </form>
          )}

          {/* ── REGISTER ── */}
          {screen === "register" && (
            <form onSubmit={handleRegister}>
              <div className="auth-title">Create account</div>
              <div className="auth-sub">
                {role === "delivery"
                  ? "Apply to become a delivery partner. Your account will need admin approval."
                  : role === "vendor"
                  ? "Register your store and start selling on ekart."
                  : "Join thousands of happy shoppers"}
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Rahul Sharma" value={form.name} onChange={e => set("name", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="form-input" placeholder="9876543210" value={form.mobile} onChange={e => set("mobile", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} required />
              </div>
              {role === "delivery" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Select Warehouse</label>
                    <select className="form-input" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                      <option value="">Select your warehouse…</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} — {w.city}</option>)}
                    </select>
                  </div>
                  <div style={{ background: "#fffbeb", border: "1.5px solid #f6d860", borderRadius: 8, padding: "9px 13px", fontSize: 12, color: "#92610a", marginBottom: 16, lineHeight: 1.5 }}>
                    ⏳ After registering, your account will be reviewed by an admin before you can log in.
                  </div>
                </>
              )}
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Creating account…" : `Register as ${role}`}
              </button>

              {/* Social register — customer & vendor only */}
              {(role === "customer" || role === "vendor") && <SocialButtons />}
            </form>
          )}

          {/* ── REGISTER OTP (customer & vendor email verify) ── */}
          {screen === "register-otp" && (
            <form onSubmit={handleRegisterOtp}>
              <div className="screen-title">📧 Verify Your Email</div>
              <div className="screen-sub">
                We sent a 6-digit code to <strong>{form.email}</strong>.<br />
                Enter it below to activate your {role} account.
              </div>
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    className="otp-inp"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpKey(i, e)}
                    onKeyDown={e => handleOtpBackspace(i, e)}
                    inputMode="numeric"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <div className="timer-row">
                <span style={{ fontSize: 13, color: timer < 30 ? "#e84c3c" : "rgba(13,13,13,0.5)" }}>
                  Expires in {fmtTimer(timer)}
                </span>
                <button type="button" className="link-btn" style={{ opacity: timer > 0 ? 0.4 : 1 }} disabled={timer > 0} onClick={resendRegisterOtp}>
                  Resend OTP
                </button>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Verifying…" : "Verify & Create Account"}
              </button>
              <button type="button" className="back-link" onClick={() => { setScreen("register"); setOtp(["", "", "", "", "", ""]); clear(); }}>
                ← Back to Registration
              </button>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {screen === "forgot" && (
            <form onSubmit={handleForgot}>
              <div className="screen-title">🔑 Forgot Password</div>
              <div className="screen-sub">Enter your registered email address and we'll send you a one-time code.</div>
              {["customer", "vendor"].includes(role) || (
                <div className="role-tabs" style={{ marginBottom: 16 }}>
                  {[{ id: "customer", label: "🛍️ Customer" }, { id: "vendor", label: "🏪 Vendor" }].map(r => (
                    <button key={r.id} type="button" className={`role-tab${role === r.id ? " active" : ""}`} onClick={() => setRole(r.id)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send OTP"}
              </button>
              <button type="button" className="back-link" onClick={() => { setScreen("login"); clear(); }}>
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* ── OTP (forgot-password flow) ── */}
          {screen === "otp" && (
            <form onSubmit={handleOtp}>
              <div className="screen-title">📧 Verify OTP</div>
              <div className="screen-sub">We sent a 6-digit code to <strong>{form.email}</strong></div>
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    className="otp-inp"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpKey(i, e)}
                    onKeyDown={e => handleOtpBackspace(i, e)}
                    inputMode="numeric"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <div className="timer-row">
                <span style={{ fontSize: 13, color: timer < 30 ? "#e84c3c" : "rgba(13,13,13,0.5)" }}>
                  Expires in {fmtTimer(timer)}
                </span>
                <button type="button" className="link-btn" style={{ opacity: timer > 0 ? 0.4 : 1 }} disabled={timer > 0} onClick={resendOtp}>
                  Resend OTP
                </button>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Verifying…" : "Verify OTP"}
              </button>
            </form>
          )}

          {/* ── DELIVERY OTP (email verify after registration) ── */}
          {screen === "delivery-otp" && (
            <form onSubmit={handleDeliveryOtp}>
              <div className="screen-title">📧 Verify Your Email</div>
              <div className="screen-sub">
                We sent a 6-digit code to <strong>{deliveryOtpEmail}</strong>.<br />
                Verify your email to complete your delivery partner application.
              </div>
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    className="otp-inp"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpKey(i, e)}
                    onKeyDown={e => handleOtpBackspace(i, e)}
                    inputMode="numeric"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <div className="timer-row">
                <span style={{ fontSize: 13, color: timer < 30 ? "#e84c3c" : "rgba(13,13,13,0.5)" }}>
                  Expires in {fmtTimer(timer)}
                </span>
                <button type="button" className="link-btn" style={{ opacity: timer > 0 ? 0.4 : 1 }} disabled={timer > 0} onClick={resendDeliveryOtp}>
                  Resend OTP
                </button>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Verifying…" : "Verify Email"}
              </button>
              <button type="button" className="back-link" onClick={() => { setScreen("register"); setOtp(["", "", "", "", "", ""]); clear(); }}>
                ← Back to Registration
              </button>
            </form>
          )}

          {/* ── DELIVERY PENDING APPROVAL ── */}
          {screen === "delivery-pending" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
              <div className="screen-title">Application Submitted!</div>
              <div className="screen-sub" style={{ marginBottom: 20 }}>
                Your email has been verified. Your account is now <strong>pending admin approval</strong>.
                You&apos;ll receive an email at <strong>{deliveryOtpEmail}</strong> once your
                account is approved and you can start accepting deliveries.
              </div>
              <div style={{ background: "#fffbeb", border: "1.5px solid #f6d860", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#92610a", marginBottom: 24, lineHeight: 1.6, textAlign: "left" }}>
                <strong>What happens next?</strong><br />
                1. Admin reviews your application 🔍<br />
                2. Admin assigns your warehouse &amp; pin codes 📦<br />
                3. You receive an approval email ✉️<br />
                4. You can then log in and start delivering 🛵
              </div>
              <button
                className="btn-primary"
                onClick={() => { setScreen("login"); setRole("delivery"); clear(); setDeliveryOtpEmail(""); }}
              >
                Back to Login
              </button>
            </div>
          )}

          {/* ── RESET PASSWORD ── */}
          {screen === "reset" && (
            <form onSubmit={handleReset}>
              <div className="screen-title">🔒 New Password</div>
              <div className="screen-sub">Choose a strong password for your account.</div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={resetForm.newPassword} onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={resetForm.confirmPassword} onChange={e => setResetForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}

        </div>
      </div>
    </>
  );
}