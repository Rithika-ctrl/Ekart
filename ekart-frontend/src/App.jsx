import { createContext, useContext, useState, useEffect } from "react";
import AuthPage from "./pages/AuthPage.jsx";
import CustomerApp from "./pages/CustomerApp.jsx";
import VendorApp from "./pages/VendorApp.jsx";
import AdminApp from "./pages/AdminApp.jsx";
import DeliveryApp from "./pages/DeliveryApp.jsx";

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

// ─── Storage key used in both localStorage and sessionStorage ──────────────
const AUTH_KEY = "ekart_auth";

/**
 * Reads the persisted auth state on startup.
 *
 * Priority order:
 *  1. localStorage  – written when the user checked "Remember me" (survives
 *     browser close / restart).
 *  2. sessionStorage – written when "Remember me" is unchecked (cleared when
 *     the tab/browser is closed).
 *  3. null           – user is not authenticated; AuthPage is rendered.
 */
function readAuth() {
  try {
    const ls = localStorage.getItem(AUTH_KEY);
    if (ls) return JSON.parse(ls);
    const ss = sessionStorage.getItem(AUTH_KEY);
    if (ss) return JSON.parse(ss);
  } catch { /* corrupted storage — treat as logged out */ }
  return null;
}

/**
 * Persists auth state according to the rememberMe flag:
 *  - rememberMe=true  → localStorage  (survives browser close)
 *  - rememberMe=false → sessionStorage (cleared on tab/browser close)
 *
 * Always clears the other storage to avoid stale state when the user
 * switches preference between sessions.
 */
function writeAuth(user, rememberMe) {
  try {
    if (rememberMe) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      sessionStorage.removeItem(AUTH_KEY);
    } else {
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
      localStorage.removeItem(AUTH_KEY);
    }
  } catch { /* storage unavailable (private mode quota) — in-memory only */ }
}

/** Clears auth from both storages unconditionally. */
function clearAuth() {
  try {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
  } catch { /* ignore */ }
}

// ─── OAuthCallback ─────────────────────────────────────────────────────────

/**
 * OAuthCallback — rendered when the backend redirects back to /oauth2/callback
 * after a successful Google/GitHub login initiated from the React app.
 *
 * The backend encodes: ?role=CUSTOMER&id=1&name=...&email=...&token=...
 * or on failure:       ?error=suspended
 *
 * OAuth logins always use localStorage (persistent) because the user
 * deliberately initiated a full redirect flow; the UX expectation is that
 * they stay logged in.
 */
function OAuthCallback({ login }) {
  const [status, setStatus] = useState("Processing…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error  = params.get("error");

    if (error) {
      setStatus(error === "suspended"
        ? "⚠️ Your account has been suspended. Contact support."
        : "OAuth login failed. Please try again.");
      setTimeout(() => { window.location.replace("/"); }, 3000);
      return;
    }

    const role  = params.get("role");
    const id    = parseInt(params.get("id"), 10);
    const name  = params.get("name");
    const email = params.get("email");
    const token = params.get("token");

    if (!role || !id || !email) {
      setStatus("Invalid callback. Redirecting…");
      setTimeout(() => { window.location.replace("/"); }, 2000);
      return;
    }

    // OAuth always persists — user started a full redirect flow intentionally.
    login({ role, id, name, email, token }, true /* rememberMe */);
    window.history.replaceState({}, "", "/");
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "DM Sans, sans-serif",
      background: "#f2f0eb", flexDirection: "column", gap: 12
    }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <div style={{ fontSize: 16, color: "#555" }}>{status}</div>
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────

export default function App() {
  /**
   * Auth state bootstrap:
   *   - Checks localStorage first (rememberMe sessions), then sessionStorage
   *     (non-persistent sessions).  Falls back to null (not logged in).
   *
   * Session lifecycle:
   *   - rememberMe=true  → state survives browser close (localStorage)
   *   - rememberMe=false → state cleared on tab/browser close (sessionStorage)
   *   - logout()         → clears both storages; user must sign in again
   */
  const [auth, setAuth] = useState(() => readAuth());

  /**
   * login(user, rememberMe)
   *
   * @param {object}  user       - { role, id, email, name, token }
   * @param {boolean} rememberMe - true  → localStorage (persists across restarts)
   *                               false → sessionStorage (cleared on tab close)
   *
   * Default is true so that OAuth callbacks and any future callers that omit
   * the flag get the safer, more user-friendly persistent behaviour.  The
   * AuthPage always passes the flag explicitly from the "Remember me" checkbox.
   */
  const login = (user, rememberMe = true) => {
    setAuth(user);
    writeAuth(user, rememberMe);
  };

  /**
   * logout()
   *
   * Clears auth from BOTH localStorage and sessionStorage so that stale state
   * cannot linger regardless of which storage the session was written to.
   * The user must sign in again after calling this.
   */
  const logout = () => {
    setAuth(null);
    clearAuth();
  };

  // Handle OAuth2 callback redirect from backend
  if (window.location.pathname === "/oauth2/callback") {
    return (
      <AuthContext.Provider value={{ auth, login, logout }}>
        <OAuthCallback login={login} />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {!auth && <AuthPage />}
      {auth?.role === "CUSTOMER"  && <CustomerApp />}
      {auth?.role === "GUEST"     && <CustomerApp />}
      {auth?.role === "VENDOR"    && <VendorApp />}
      {auth?.role === "ADMIN"     && <AdminApp />}
      {auth?.role === "DELIVERY"  && <DeliveryApp />}
    </AuthContext.Provider>
  );
}