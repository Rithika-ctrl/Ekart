import { createContext, useContext, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import AuthPage         from "./pages/AuthPage.jsx";
import CustomerApp      from "./pages/CustomerApp.jsx";
import VendorApp        from "./pages/VendorApp.jsx";
import AdminApp         from "./pages/AdminApp.jsx";
import DeliveryApp      from "./pages/DeliveryApp.jsx";
import NotFoundPage     from "./pages/NotFoundPage.jsx";
import ForbiddenPage    from "./pages/ForbiddenPage.jsx";
import BlockedPage      from "./pages/BlockedPage.jsx";
import ErrorPage        from "./pages/ErrorPage.jsx";
import DocumentationPage from "./pages/DocumentationPage.jsx";

// Warehouse Staff Pages
import WarehouseStaffLoginPage from "./pages/WarehouseStaffLoginPage.jsx";
import WarehouseDashboard from "./pages/WarehouseDashboard.jsx";
import AssignDeliveryBoyPage from "./pages/AssignDeliveryBoyPage.jsx";
import OrderTrackingPage from "./pages/OrderTrackingPage.jsx";
import AdminStaffManagementPage from "./pages/AdminStaffManagementPage.jsx";

// ─── Auth Context ───────────────────────────────────────────────────────────

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

const ThemeContext = createContext(null);
export function useTheme() { return useContext(ThemeContext); }

const AUTH_KEY = "ekart_auth";
const THEME_KEY = "ekart_theme";
const TAB_ID_KEY = "ekart_tab_id"; // Unique identifier per tab

// Generate or retrieve unique tab ID to keep sessions separate across tabs
function getTabId() {
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  return tabId;
}

const tabId = getTabId();

const THEMES = {
  light: {
    "--ek-bg": "#f9fafb",
    "--ek-surface": "#ffffff",
    "--ek-surface-alt": "#f8fafc",
    "--ek-surface-muted": "#f3f4f6",
    "--ek-text": "#111827",
    "--ek-muted": "#6b7280",
    "--ek-border": "#e5e7eb",
    "--ek-primary": "#2563eb",
    "--ek-primary-soft": "#dbeafe",
    "--ek-success": "#16a34a",
    "--ek-success-soft": "#e8faf2",
    "--ek-danger": "#dc2626",
    "--ek-danger-soft": "#fef2f2",
    "--ek-warning": "#d97706",
    "--ek-warning-soft": "#fef9e7",
    "--ek-accent": "#7c3aed",
    "--ek-accent-soft": "#ede9fe",
    "--ek-shadow": "0 10px 30px rgba(15, 23, 42, 0.08)",
    "--ek-nav-bg": "#ffffff",
    "--ek-nav-shadow": "0 2px 8px rgba(0,0,0,0.06)",
    "--ek-overlay": "rgba(15, 23, 42, 0.55)",
    "--ek-input": "#ffffff",
  },
  dark: {
    "--ek-bg": "#0b1120",
    "--ek-surface": "#111827",
    "--ek-surface-alt": "#0f172a",
    "--ek-surface-muted": "#1f2937",
    "--ek-text": "#f9fafb",
    "--ek-muted": "#9ca3af",
    "--ek-border": "#243042",
    "--ek-primary": "#60a5fa",
    "--ek-primary-soft": "rgba(96, 165, 250, 0.16)",
    "--ek-success": "#4ade80",
    "--ek-success-soft": "rgba(74, 222, 128, 0.16)",
    "--ek-danger": "#f87171",
    "--ek-danger-soft": "rgba(248, 113, 113, 0.16)",
    "--ek-warning": "#fbbf24",
    "--ek-warning-soft": "rgba(251, 191, 36, 0.16)",
    "--ek-accent": "#c084fc",
    "--ek-accent-soft": "rgba(192, 132, 252, 0.16)",
    "--ek-shadow": "0 20px 40px rgba(0, 0, 0, 0.45)",
    "--ek-nav-bg": "#0f172a",
    "--ek-nav-shadow": "0 2px 10px rgba(0,0,0,0.35)",
    "--ek-overlay": "rgba(2, 6, 23, 0.72)",
    "--ek-input": "#111827",
  },
};

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  const palette = THEMES[theme] || THEMES.light;
  const root = document.documentElement;
  Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.body.style.background = palette["--ek-bg"];
  document.body.style.color = palette["--ek-text"];
}

/**
 * Reads the persisted auth state on startup - Tab-aware version.
 *
 * Priority order:
 *  1. sessionStorage – tab-specific, written on normal login (cleared when tab is closed)
 *  2. localStorage (with tab ID) – tab-isolated, persists on "Remember me"
 *  3. null – user is not authenticated
 *
 * Each tab has a unique ID to prevent cross-tab auth conflicts.
 */
function readAuth() {
  try {
    // Always check sessionStorage first (tab-specific, cleared on tab close)
    const ss = sessionStorage.getItem(AUTH_KEY);
    if (ss) return JSON.parse(ss);
    
    // Fall back to tab-isolated localStorage (tab-specific storage with tab ID prefix)
    const tabAuthKey = `${AUTH_KEY}_${tabId}`;
    const ls = localStorage.getItem(tabAuthKey);
    if (ls) return JSON.parse(ls);
  } catch { /* corrupted storage — treat as logged out */ }
  return null;
}

/**
 * Persists auth state according to the rememberMe flag:
 *  - rememberMe=true  → tab-isolated localStorage (persists this tab across restarts)
 *  - rememberMe=false → sessionStorage (cleared on tab close)
 *
 * Always write to sessionStorage to ensure immediate state, and use tab ID in localStorage
 * to ensure each tab maintains its own session even with "Remember me" checked.
 */
function writeAuth(user, rememberMe) {
  try {
    // Always write to sessionStorage for immediate tab-specific state
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
    
    if (rememberMe) {
      // Store in localStorage with tab ID to keep tabs isolated
      const tabAuthKey = `${AUTH_KEY}_${tabId}`;
      localStorage.setItem(tabAuthKey, JSON.stringify(user));
    } else {
      // Clear tab-specific localStorage entry
      const tabAuthKey = `${AUTH_KEY}_${tabId}`;
      localStorage.removeItem(tabAuthKey);
    }
  } catch { /* storage unavailable (private mode quota) — in-memory only */ }
}

/** Clears auth from both storages unconditionally. */
function clearAuth() {
  try {
    const tabAuthKey = `${AUTH_KEY}_${tabId}`;
    localStorage.removeItem(tabAuthKey);
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
                  justifyContent: "center", fontFamily: "DM Sans, sans-serif", background: "var(--ek-bg)", color: "var(--ek-text)", gap: 12 }}>
      <div style={{ fontSize: 32 }}>{status === "linked" ? "✅" : "❌"}</div>
      <div style={{ fontSize: 16, color: "var(--ek-muted)" }}>
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
      background: "var(--ek-bg)", color: "var(--ek-text)", flexDirection: "column", gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <div style={{ fontSize: 16, color: "var(--ek-muted)" }}>{status}</div>
    </div>
  );
}

function ThemeToggle() {
  const theme = useTheme();
  if (!theme) return null;
  const nextTheme = theme.theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => theme.setTheme(nextTheme)}
      style={{ position: "fixed", right: 18, bottom: 78, zIndex: 1000, border: "1px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-text)", borderRadius: 999, padding: "11px 16px", boxShadow: "var(--ek-shadow)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {theme.theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}

function FooterLinks() {
  const location = useLocation();
  const isDocsPage = location.pathname === "/sop-documentation" || location.pathname === "/policy-documentation";

  return (
    <footer style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 950,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
      padding: "10px 16px",
    }}>
      <div style={{
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
        padding: "10px 16px",
        borderRadius: 999,
        border: "1px solid var(--ek-border)",
        background: "var(--ek-surface)",
        boxShadow: "var(--ek-shadow)",
        color: "var(--ek-text)",
        fontSize: 12,
        maxWidth: "calc(100vw - 24px)",
      }}>
        <span style={{ color: "var(--ek-muted)", fontWeight: 600 }}>Documentation</span>
        <Link to="/sop-documentation" style={{ color: isDocsPage && location.pathname === "/sop-documentation" ? "var(--ek-primary)" : "var(--ek-text)", textDecoration: "none", fontWeight: 700 }}>
          SOP Documentation
        </Link>
        <span style={{ color: "var(--ek-border)" }}>•</span>
        <Link to="/policy-documentation" style={{ color: isDocsPage && location.pathname === "/policy-documentation" ? "var(--ek-primary)" : "var(--ek-text)", textDecoration: "none", fontWeight: 700 }}>
          Policy Documentation
        </Link>
        <span style={{ color: "var(--ek-border)" }}>•</span>
        <span style={{ color: "var(--ek-muted)" }}>© 2026 Ekart</span>
      </div>
    </footer>
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
  const [theme, setTheme] = useState(() => readTheme());

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    applyTheme(theme);
    console.log('Theme applied:', theme, 'Auth:', auth);
  }, [theme]);

  // Listen for auth changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === AUTH_KEY) {
        const newAuth = e.newValue ? JSON.parse(e.newValue) : null;
        setAuth(newAuth);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  const themeValue = {
    theme,
    setTheme,
    toggleTheme: () => setTheme(current => current === "dark" ? "light" : "dark"),
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <AuthContext.Provider value={{ auth, login, logout }}>
        <BrowserRouter>
          {/* Debug: App is rendering */}
          <ThemeToggle />
          <FooterLinks />
          <Routes>
          {/* ── Public ────────────────────────────────────────────── */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/oauth2/callback" element={<OAuthCallback login={login} />} /><Route path="/oauth2/link-callback" element={<OAuthLinkCallback />} />
          <Route path="/sop-documentation" element={<DocumentationPage type="sop" />} />
          <Route path="/policy-documentation" element={<DocumentationPage type="policy" />} />

          {/* ── Warehouse Staff (Standalone Auth - Session-based) ──– */}
          <Route path="/warehouse/login" element={<WarehouseStaffLoginPage />} />
          <Route path="/warehouse/dashboard" element={<WarehouseDashboard />} />
          <Route path="/warehouse/assign/:orderId" element={<AssignDeliveryBoyPage />} />

          {/* ── Order Tracking (Public for customers) ───────────── */}
          <Route path="/track/:orderId" element={<OrderTrackingPage />} />

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

          {/* ── Admin Staff Management (integrated with Admin app) ─ */}
          <Route
            path="/admin/staff-management"
            element={
              <RequireAuth auth={auth} allowedRoles={["ADMIN"]}>
                <AdminStaffManagementPage />
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

          {/* ── Error Pages ──────────────────────────────────────── */}
          <Route path="/error/404" element={<NotFoundPage />} />
          <Route path="/error/403" element={<ForbiddenPage />} />
          <Route path="/error/blocked" element={<BlockedPage />} />
          <Route path="/error/500" element={<ErrorPage />} />

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
                ? <NotFoundPage />
                : <Navigate to="/auth" replace />
            }
          />
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}