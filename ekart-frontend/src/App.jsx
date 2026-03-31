import { createContext, useContext, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import AuthPage    from "./pages/AuthPage.jsx";
import CustomerApp from "./pages/CustomerApp.jsx";
import VendorApp   from "./pages/VendorApp.jsx";
import AdminApp    from "./pages/AdminApp.jsx";
import DeliveryApp from "./pages/DeliveryApp.jsx";

// ─── Auth Context ───────────────────────────────────────────────────────────

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

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

// ─── Role → default landing path mapping ────────────────────────────────────

const ROLE_HOME = {
  CUSTOMER: "/shop/home",
  GUEST:    "/shop/home",
  VENDOR:   "/vendor/dashboard",
  ADMIN:    "/admin/overview",
  DELIVERY: "/delivery/dashboard",
};

// ─── OAuthCallback ──────────────────────────────────────────────────────────

/**
 * OAuthCallback — rendered at /oauth2/callback after a successful
 * social login (Google, GitHub, Facebook, Instagram, …) initiated from
 * the React app.
 *
 * The backend encodes:
 *   ?role=CUSTOMER&id=1&name=…&email=…&token=…&provider=Google
 * or on failure:
 *   ?error=suspended
 *
 * OAuth logins always use localStorage (persistent) because the user
 * deliberately initiated a full redirect flow; the UX expectation is that
 * they stay logged in.
 */
// ─── OAuthLinkCallback ────────────────────────────────────────────────────────
/**
 * Displays status after OAuth provider linking/unlinking.
 * Called at /oauth2/link-callback?status=linked&provider=Google
 * Auto-redirects to profile security tab after 1.5 seconds.
 */
function OAuthLinkCallback() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const status   = params.get("status");
  const provider = params.get("provider") ?? "Social";

  useEffect(() => {
    setTimeout(() => navigate("/shop/home?tab=profile", { replace: true }), 1500);
  }, [navigate]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", fontFamily: "DM Sans, sans-serif", background: "#f2f0eb", gap: 12 }}>
      <div style={{ fontSize: 32 }}>{status === "linked" ? "✅" : "❌"}</div>
      <div style={{ fontSize: 16, color: "#555" }}>
        {status === "linked" ? `${provider} account linked!` : "Linking failed. Please try again."}
      </div>
    </div>
  );
}

function OAuthCallback({ login }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Processing…");

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const error    = params.get("error");

    if (error) {
      setStatus(error === "suspended"
        ? "⚠️ Your account has been suspended. Contact support."
        : "OAuth login failed. Please try again.");
      setTimeout(() => navigate("/auth", { replace: true }), 3000);
      return;
    }

    const role     = params.get("role");
    const id       = parseInt(params.get("id"), 10);
    const name     = params.get("name");
    const email    = params.get("email");
    const token    = params.get("token");
    // provider param is appended by OAuth2LoginSuccessHandler — e.g. "Google", "GitHub"
    const provider = params.get("provider") ?? "Social";

    if (!role || !id || !email) {
      setStatus("Invalid callback. Redirecting…");
      setTimeout(() => navigate("/auth", { replace: true }), 2000);
      return;
    }

    setStatus(`Signing you in with ${provider}…`);

    // OAuth always persists — user started a full redirect flow intentionally.
    const user = { role, id, name, email, token };
    login(user, true /* rememberMe */);
    navigate(ROLE_HOME[role] ?? "/auth", { replace: true });
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "DM Sans, sans-serif",
      background: "#f2f0eb", flexDirection: "column", gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <div style={{ fontSize: 16, color: "#555" }}>{status}</div>
    </div>
  );
}

// ─── Guards ─────────────────────────────────────────────────────────────────

/**
 * RequireAuth — redirects unauthenticated users to /auth.
 * Remembers the page they were trying to reach via `state.from` so
 * AuthPage can send them straight there after login.
 */
function RequireAuth({ auth, allowedRoles, children }) {
  const location = useLocation();

  if (!auth) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    // Logged in but wrong role — send to their own home
    return <Navigate to={ROLE_HOME[auth.role] ?? "/auth"} replace />;
  }
  return children;
}

// ─── Root App ────────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth] = useState(() => readAuth());

  /**
   * login(user, rememberMe)
   *
   * @param {object}  user       - { role, id, email, name, token }
   * @param {boolean} rememberMe - true  → localStorage (persists across restarts)
   *                               false → sessionStorage (cleared on tab close)
   */
  const login = (user, rememberMe = true) => {
    setAuth(user);
    writeAuth(user, rememberMe);
  };

  /**
   * logout()
   *
   * Clears auth from BOTH storages so that stale state cannot linger
   * regardless of which storage the session was written to.
   */
  const logout = () => {
    setAuth(null);
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      <BrowserRouter>
        <Routes>
          {/* ── Public ────────────────────────────────────────────── */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/oauth2/callback" element={<OAuthCallback login={login} />} /><Route path="/oauth2/link-callback" element={<OAuthLinkCallback />} />


          {/* ── Customer / Guest (all sub-pages handled inside CustomerApp) ── */}
          <Route
            path="/shop/*"
            element={
              <RequireAuth auth={auth} allowedRoles={["CUSTOMER", "GUEST", "VENDOR"]}>
                <CustomerApp />
              </RequireAuth>
            }
          />

          {/* ── Vendor ────────────────────────────────────────────── */}
          <Route
            path="/vendor/*"
            element={
              <RequireAuth auth={auth} allowedRoles={["VENDOR"]}>
                <VendorApp />
              </RequireAuth>
            }
          />

          {/* ── Admin ─────────────────────────────────────────────── */}
          <Route
            path="/admin/*"
            element={
              <RequireAuth auth={auth} allowedRoles={["ADMIN"]}>
                <AdminApp />
              </RequireAuth>
            }
          />

          {/* ── Delivery ──────────────────────────────────────────── */}
          <Route
            path="/delivery/*"
            element={
              <RequireAuth auth={auth} allowedRoles={["DELIVERY"]}>
                <DeliveryApp />
              </RequireAuth>
            }
          />

          {/* ── Root redirect ─────────────────────────────────────── */}
          <Route
            path="/"
            element={
              auth
                ? <Navigate to={ROLE_HOME[auth.role] ?? "/auth"} replace />
                : <Navigate to="/auth" replace />
            }
          />

          {/* ── Catch-all ─────────────────────────────────────────── */}
          <Route
            path="*"
            element={
              auth
                ? <Navigate to={ROLE_HOME[auth.role] ?? "/auth"} replace />
                : <Navigate to="/auth" replace />
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}