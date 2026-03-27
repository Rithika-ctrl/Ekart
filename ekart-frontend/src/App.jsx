import { createContext, useContext, useState } from "react";
import AuthPage from "./pages/AuthPage.jsx";
import CustomerApp from "./pages/CustomerApp.jsx";
import VendorApp from "./pages/VendorApp.jsx";
import AdminApp from "./pages/AdminApp.jsx";
import DeliveryApp from "./pages/DeliveryApp.jsx";

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

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

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {!auth && <CustomerApp />}
      {auth?.role === "CUSTOMER"  && <CustomerApp />}
      {auth?.role === "GUEST"     && <CustomerApp />}
      {auth?.role === "VENDOR"    && <VendorApp />}
      {auth?.role === "ADMIN"     && <AdminApp />}
      {auth?.role === "DELIVERY"  && <DeliveryApp />}
    </AuthContext.Provider>
  );
}