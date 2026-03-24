import { useEffect, useRef, useState } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  :root {
    --yellow: #f5a800;
    --yellow-d: #d48f00;
    --glass-border: rgba(255,255,255,0.22);
    --glass-card: rgba(255,255,255,0.13);
    --glass-nav: rgba(0,0,0,0.25);
    --text-white: #ffffff;
    --text-light: rgba(255,255,255,0.80);
    --text-dim: rgba(255,255,255,0.50);
  }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }

  .vendor-otp-root {
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
    color: var(--text-white);
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
  .bg-layer::before {
    content: '';
    position: absolute;
    inset: -20px;
    background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
    filter: blur(6px);
    transform: scale(1.08);
  }
  .bg-layer::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
  }

  .otp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 1rem 3rem;
    display: flex; align-items: center; justify-content: space-between;
    background: var(--glass-nav);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--glass-border);
    transition: background 0.3s;
  }
  .otp-nav.scrolled { background: rgba(0,0,0,0.45); }

  .nav-brand {
    font-size: 1.6rem; font-weight: 700; color: var(--text-white);
    text-decoration: none; letter-spacing: 0.04em;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .nav-brand span { color: var(--yellow); }

  .nav-link-btn {
    display: flex; align-items: center; gap: 0.4rem;
    color: var(--text-light); text-decoration: none;
    font-size: 0.82rem; font-weight: 500;
    padding: 0.45rem 0.9rem; border-radius: 6px;
    border: 1px solid var(--glass-border); transition: all 0.2s;
    background: none; cursor: pointer; font-family: 'Poppins', sans-serif;
  }
  .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }

  .alert-stack {
    position: fixed; top: 5rem; right: 1.5rem; z-index: 200;
    display: flex; flex-direction: column; gap: 0.5rem;
  }
  .alert {
    padding: 0.875rem 1.25rem;
    background: rgba(10,12,30,0.88);
    backdrop-filter: blur(16px);
    border: 1px solid;
    border-radius: 10px;
    display: flex; align-items: center; gap: 0.625rem;
    font-size: 0.825rem; min-width: 260px;
    animation: slideIn 0.3s ease both;
  }
  .alert-success { border-color: rgba(245,168,0,0.45); color: var(--yellow); }
  .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
  .alert-close {
    margin-left: auto; background: none; border: none;
    color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem;
  }

  .otp-page {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 6rem 1.5rem 3rem;
  }

  .form-card {
    background: var(--glass-card);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 2.5rem;
    width: 100%; max-width: 440px;
    box-shadow: 0 40px 100px rgba(0,0,0,0.4);
    animation: fadeUp 0.5s ease both;
  }

  .card-top { text-align: center; margin-bottom: 2rem; }
  .card-icon {
    width: 64px; height: 64px;
    background: rgba(245,168,0,0.15);
    border: 2px solid rgba(245,168,0,0.3);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; margin: 0 auto 1.1rem;
  }
  .card-top h1 { font-size: 1.4rem; font-weight: 700; color: var(--text-white); margin-bottom: 0.3rem; }
  .card-top h1 span { color: var(--yellow); }
  .card-top p { font-size: 0.78rem; color: var(--text-dim); line-height: 1.6; }

  .section-label {
    display: flex; align-items: center; gap: 0.6rem;
    font-size: 0.7rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--yellow); margin-bottom: 1.1rem;
  }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

  .otp-group { display: flex; gap: 0.75rem; justify-content: center; margin-bottom: 1.5rem; }
  .otp-box {
    width: 52px; height: 60px;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    text-align: center;
    font-family: 'Poppins', sans-serif;
    font-size: 1.4rem; font-weight: 700;
    color: white; transition: all 0.3s;
    caret-color: var(--yellow);
  }
  .otp-box:focus {
    outline: none;
    background: rgba(255,255,255,0.10);
    border-color: var(--yellow);
    box-shadow: 0 0 0 3px rgba(245,168,0,0.12);
  }
  .otp-box::placeholder { color: rgba(255,255,255,0.15); }

  .form-hint {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.7rem; color: var(--text-dim); margin-left: 0.15rem;
  }
  .form-hint i { color: var(--yellow); font-size: 0.65rem; }

  .btn-submit {
    width: 100%; background: var(--yellow); color: #1a1000;
    border: none; border-radius: 12px; padding: 0.95rem;
    font-family: 'Poppins', sans-serif; font-size: 0.9rem;
    font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    cursor: pointer; transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    box-shadow: 0 8px 24px rgba(245,168,0,0.25);
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .btn-submit:hover { background: var(--yellow-d); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(245,168,0,0.42); }
  .btn-submit:active { transform: translateY(0); }

  .back-link {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    margin-top: 1.25rem; color: var(--text-dim);
    text-decoration: none; font-size: 0.78rem; transition: color 0.2s;
    background: none; border: none; cursor: pointer;
    font-family: 'Poppins', sans-serif; width: 100%;
  }
  .back-link:hover { color: var(--text-white); }

  .otp-footer {
    background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
    border-top: 1px solid var(--glass-border);
    padding: 1.25rem 3rem;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 0.75rem;
  }
  .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
  .footer-brand span { color: var(--yellow); }
  .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

  @media (max-width: 500px) {
    .otp-nav { padding: 0.875rem 1.25rem; }
    .form-card { padding: 1.75rem 1.25rem; }
    .otp-box { width: 42px; height: 52px; font-size: 1.2rem; }
    .otp-footer { padding: 1.25rem; flex-direction: column; text-align: center; }
  }
`;

// Props:
// id          – vendor ID passed to the form (replaces th:value="${id}")
// success     – success flash message (replaces session.success)
// failure     – failure flash message (replaces session.failure)
// onSubmit    – (otp: string, id: string) => void  (replaces form POST)
// onBack      – () => void  (replaces /vendor/login navigation)
export default function VendorOtp({
  id = "",
  success = null,
  failure = null,
  onSubmit,
  onBack,
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [alerts, setAlerts] = useState(() => {
    const list = [];
    if (success) list.push({ type: "success", msg: success, key: "s" });
    if (failure) list.push({ type: "danger",  msg: failure, key: "f" });
    return list;
  });
  const [scrolled, setScrolled] = useState(false);
  const boxRefs = useRef([]);

  // Scroll listener
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Auto-dismiss alerts after 2.5 s
  useEffect(() => {
    if (!alerts.length) return;
    const t = setTimeout(() => setAlerts([]), 2500);
    return () => clearTimeout(t);
  }, [alerts]);

  // Focus first box on mount
  useEffect(() => { boxRefs.current[0]?.focus(); }, []);

  const updateDigit = (idx, val) => {
    const clean = val.replace(/[^0-9]/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = clean;
      return next;
    });
    if (clean && idx < 5) boxRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      boxRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)
      .getData("text")
      .replace(/\D/g, "");
    const next = [...digits];
    [...pasted].slice(0, 6).forEach((ch, j) => { next[j] = ch; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    boxRefs.current[focusIdx]?.focus();
  };

  const otp = digits.join("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.length < 6) { boxRefs.current[0]?.focus(); return; }
    onSubmit?.(otp, id);
  };

  return (
    <>
      <style>{styles}</style>
      {/* Font Awesome CDN */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />

      <div className="vendor-otp-root">
        <div className="bg-layer" />

        {/* Alerts */}
        <div className="alert-stack">
          {alerts.map((a) => (
            <div key={a.key} className={`alert alert-${a.type}`}>
              <i className={`fas fa-${a.type === "success" ? "check" : "exclamation"}-circle`} />
              <span>{a.msg}</span>
              <button className="alert-close" onClick={() => setAlerts((prev) => prev.filter((x) => x.key !== a.key))}>
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav id="nav" className={`otp-nav${scrolled ? " scrolled" : ""}`}>
          <button className="nav-brand" onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <i className="fas fa-shopping-cart" style={{ fontSize: "1.1rem" }} />
            <span>Ekart</span>
          </button>
          <button className="nav-link-btn" onClick={onBack}>
            <i className="fas fa-arrow-left" /> Back to Login
          </button>
        </nav>

        {/* Main */}
        <main className="otp-page">
          <div className="form-card">
            <div className="card-top">
              <div className="card-icon">
                <i className="fas fa-shield-alt" style={{ color: "var(--yellow)" }} />
              </div>
              <h1>OTP <span>Verification</span></h1>
              <p>Enter the one-time password sent to your registered email address to continue.</p>
            </div>

            <div className="section-label">
              <i className="fas fa-hashtag" /> Enter OTP
            </div>

            <form id="otpForm" onSubmit={handleSubmit}>
              <input type="hidden" name="id" value={id} readOnly />

              {/* OTP digit boxes */}
              <div className="otp-group" aria-hidden="true">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (boxRefs.current[i] = el)}
                    className="otp-box"
                    type="text"
                    maxLength={1}
                    inputMode="numeric"
                    pattern="[0-9]"
                    placeholder="0"
                    value={d}
                    onChange={(e) => updateDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    data-index={i}
                  />
                ))}
              </div>

              <input type="hidden" name="otp" value={otp} readOnly />

              <span className="form-hint" style={{ justifyContent: "center", marginBottom: "1.25rem" }}>
                <i className="fas fa-info-circle" /> Check your inbox — the OTP expires shortly.
              </span>

              <button type="submit" className="btn-submit">
                <i className="fas fa-check-circle" /> Verify OTP
              </button>
            </form>

            <button className="back-link" onClick={onBack}>
              <i className="fas fa-arrow-left" /> Back to Login
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="otp-footer">
          <div className="footer-brand"><span>Ekart</span></div>
          <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
        </footer>
      </div>
    </>
  );
}