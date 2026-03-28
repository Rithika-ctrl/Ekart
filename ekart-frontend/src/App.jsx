import { createContext, useContext, useState, useEffect } from "react";
import AuthPage from "./pages/AuthPage.jsx";
import CustomerApp from "./pages/CustomerApp.jsx";
import VendorApp from "./pages/VendorApp.jsx";
import AdminApp from "./pages/AdminApp.jsx";
import DeliveryApp from "./pages/DeliveryApp.jsx";

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

/**
 * OAuthCallback — rendered when the backend redirects back to /oauth2/callback
 * after a successful Google/GitHub login initiated from the React app.
 *
 * The backend encodes: ?role=CUSTOMER&id=1&name=...&email=...&token=...
 * or on failure:       ?error=suspended
 *
 * This component reads those params, calls login(), then redirects home.
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

    login({ role, id, name, email, token });
    // Clean the URL then let React re-render via auth state
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

export default function App() {
  const [auth, setAuth] = useState(() => {
    try { const s = sessionStorage.getItem("ekart_auth"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });

  const login = (user) => {
    setAuth(user);
    try { sessionStorage.setItem("ekart_auth", JSON.stringify(user)); } catch {}
  };

  const logout = () => {
    setAuth(null);
    try { sessionStorage.removeItem("ekart_auth"); } catch {}
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