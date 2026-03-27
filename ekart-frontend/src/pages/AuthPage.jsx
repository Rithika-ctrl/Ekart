import { useState, useEffect, useRef } from "react";
import { useAuth } from "../App";
import { API_BASE } from "../api";

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
  .auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f2f0eb;padding:24px;font-family:'DM Sans',sans-serif}
  .auth-card{background:#fff;border-radius:20px;padding:40px;width:100%;max-width:420px;box-shadow:0 12px 40px rgba(0,0,0,0.12)}
  .auth-logo{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#0d0d0d;margin-bottom:28px;display:block}
  .auth-logo span{color:#e84c3c}
  .auth-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;color:#0d0d0d}
  .auth-sub{font-size:14px;color:rgba(13,13,13,0.55);margin-bottom:28px}
  .role-tabs{display:flex;gap:6px;margin-bottom:24px}
  .role-tab{flex:1;padding:8px 6px;border-radius:8px;border:2px solid #e8e4dc;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:rgba(13,13,13,0.55);transition:all 200ms}
  .role-tab.active{background:#0d0d0d;color:#fff;border-color:#0d0d0d}
  .auth-tabs{display:flex;background:#f2f0eb;border-radius:10px;padding:3px;margin-bottom:24px;gap:3px}
  .auth-tab{flex:1;padding:8px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:rgba(13,13,13,0.5);transition:all 200ms}
  .auth-tab.active{background:#fff;color:#0d0d0d;box-shadow:0 1px 4px rgba(0,0,0,0.1)}
  .form-group{margin-bottom:16px}
  .form-label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#0d0d0d}
  .form-input{width:100%;padding:11px 14px;border:2px solid #e8e4dc;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:15px;outline:none;transition:border-color 200ms;background:#fafaf8;box-sizing:border-box}
  .form-input:focus{border-color:#0d0d0d;background:#fff}
  .btn-primary{width:100%;padding:13px;border-radius:10px;border:none;background:#e84c3c;color:#fff;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 200ms;margin-top:4px}
  .btn-primary:hover{background:#c73e2e;transform:translateY(-1px)}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed;transform:none}
  .err-box{background:#fef2f2;color:#e84c3c;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px}
  .ok-box{background:#e8f9f2;color:#1db882;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px}
  .link-btn{background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#e84c3c;padding:0}
  .otp-row{display:flex;gap:10px;justify-content:center;margin:16px 0}
  .otp-inp{width:46px;height:54px;text-align:center;font-size:22px;font-weight:700;border-radius:10px;border:2px solid #e8e4dc;background:#fafaf8;font-family:'Syne',sans-serif;outline:none;transition:border-color 200ms}
  .otp-inp:focus{border-color:#0d0d0d}
  .back-link{background:none;border:none;cursor:pointer;font-size:13px;color:rgba(13,13,13,0.5);font-family:'DM Sans',sans-serif;padding:12px 0 0;display:block;text-align:center;width:100%}
  .screen-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;color:#0d0d0d}
  .screen-sub{font-size:14px;color:rgba(13,13,13,0.55);margin-bottom:20px;line-height:1.5}
  .timer-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
`;

export default function AuthPage() {
  const { login } = useAuth();
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({ name: "", email: "", password: "", mobile: "", confirmPassword: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetForm, setResetForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const clear = () => { setError(""); setInfo(""); };
  const fmtTimer = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (screen === "otp") {
      setTimer(120);
      timerRef.current = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; }), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen]);

  async function post(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.json();
  }

  async function handleLogin(e) {
    e.preventDefault(); clear(); setLoading(true);
    try {
      const data = await post(`/auth/${role}/login`, { email: form.email, password: form.password });
      if (!data.success) { setError(data.message || "Login failed"); setLoading(false); return; }
      const id = role === "customer" ? data.customerId : role === "vendor" ? data.vendorId : null;
      login({ role: role.toUpperCase(), id, email: form.email, name: data.name || form.email });
    } catch { setError("Network error — is the backend running on port 8080?"); }
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault(); clear();
    if (form.password !== form.confirmPassword) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      const data = await post(`/auth/${role}/register`, { name: form.name, email: form.email, password: form.password, mobile: form.mobile });
      if (!data.success) { setError(data.message || "Registration failed"); setLoading(false); return; }
      setInfo("Registered! Please sign in."); setScreen("login");
    } catch { setError("Network error."); }
    setLoading(false);
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
      setInfo("Password reset! Please sign in."); setScreen("login"); setResetForm({ newPassword: "", confirmPassword: "" });
    } catch { setError("Network error."); }
    setLoading(false);
  }

  async function resendOtp() {
    try { await post(`/auth/${role}/forgot-password`, { email: form.email }); setInfo("OTP resent!"); setTimer(120); } catch {}
  }

  const handleOtpKey = (i, e) => {
    if (!/^\d*$/.test(e.target.value)) return;
    const n = [...otp]; n[i] = e.target.value.slice(-1); setOtp(n);
    if (e.target.value && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpBackspace = (i, e) => { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); };

  const roles = [
    { id: "customer", label: "🛍️ Customer" },
    { id: "vendor",   label: "🏪 Vendor" },
    { id: "admin",    label: "⚙️ Admin" },
    { id: "delivery", label: "🛵 Delivery" },
  ];

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
                <button key={r.id} className={`role-tab${role === r.id ? " active" : ""}`} onClick={() => setRole(r.id)}>{r.label}</button>
              ))}
            </div>
          )}

          {/* Login / Register tabs */}
          {["login", "register"].includes(screen) && role !== "admin" && role !== "delivery" && (
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
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} required /></div>
              {role !== "admin" && role !== "delivery" && (
                <div style={{ textAlign: "right", marginBottom: 12 }}>
                  <button type="button" className="link-btn" onClick={() => { setScreen("forgot"); clear(); }}>Forgot password?</button>
                </div>
              )}
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Signing in…" : `Sign in as ${role}`}</button>
            </form>
          )}

          {/* ── REGISTER ── */}
          {screen === "register" && (
            <form onSubmit={handleRegister}>
              <div className="auth-title">Create account</div>
              <div className="auth-sub">Join thousands of happy shoppers</div>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Rahul Sharma" value={form.name} onChange={e => set("name", e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Mobile</label><input className="form-input" placeholder="9876543210" value={form.mobile} onChange={e => set("mobile", e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Confirm Password</label><input className="form-input" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} required /></div>
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Creating account…" : `Register as ${role}`}</button>
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
                    <button key={r.id} type="button" className={`role-tab${role === r.id ? " active" : ""}`} onClick={() => setRole(r.id)}>{r.label}</button>
                  ))}
                </div>
              )}
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required /></div>
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Sending…" : "Send OTP"}</button>
              <button type="button" className="back-link" onClick={() => { setScreen("login"); clear(); }}>← Back to Sign In</button>
            </form>
          )}

          {/* ── OTP ── */}
          {screen === "otp" && (
            <form onSubmit={handleOtp}>
              <div className="screen-title">📧 Verify OTP</div>
              <div className="screen-sub">We sent a 6-digit code to <strong>{form.email}</strong></div>
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input key={i} ref={el => otpRefs.current[i] = el} className="otp-inp" maxLength={1} value={d}
                    onChange={e => handleOtpKey(i, e)} onKeyDown={e => handleOtpBackspace(i, e)}
                    inputMode="numeric" autoFocus={i === 0} />
                ))}
              </div>
              <div className="timer-row">
                <span style={{ fontSize: 13, color: timer < 30 ? "#e84c3c" : "rgba(13,13,13,0.5)" }}>Expires in {fmtTimer(timer)}</span>
                <button type="button" className="link-btn" style={{ opacity: timer > 0 ? 0.4 : 1 }} disabled={timer > 0} onClick={resendOtp}>Resend OTP</button>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify OTP"}</button>
            </form>
          )}

          {/* ── RESET ── */}
          {screen === "reset" && (
            <form onSubmit={handleReset}>
              <div className="screen-title">🔒 New Password</div>
              <div className="screen-sub">Choose a strong password for your account.</div>
              <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" placeholder="••••••••" value={resetForm.newPassword} onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Confirm New Password</label><input className="form-input" type="password" placeholder="••••••••" value={resetForm.confirmPassword} onChange={e => setResetForm(f => ({ ...f, confirmPassword: e.target.value }))} required /></div>
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Resetting…" : "Reset Password"}</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}