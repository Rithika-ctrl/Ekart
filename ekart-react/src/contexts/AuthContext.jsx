import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => { try { return JSON.parse(localStorage.getItem('ekart_user')); }   catch { return null; } });
  const [role, setRole]   = useState(() => localStorage.getItem('ekart_role') || null);

  // ── Cross-tab sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'ekart_user') {
        try { setUser(e.newValue ? JSON.parse(e.newValue) : null); } catch { setUser(null); }
      }
      if (e.key === 'ekart_role') {
        setRole(e.newValue || null);
      }
      if (e.key === 'ekart_token' && !e.newValue) {
        setUser(null);
        setRole(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── login — called after a successful API response ──────────────────────
  // usage: login({ customerId, name, email, ... }, 'customer')
  //        login({ vendorId, name, email, ... },   'vendor')
  //        login({ name, email, ... },              'admin')
  //        login({ deliveryId, name, email, ... },  'delivery')
  const login = (payload, userRole = 'customer') => {
    setUser(payload);
    setRole(userRole);
    try {
      localStorage.setItem('ekart_user', JSON.stringify(payload));
      localStorage.setItem('ekart_role', userRole);
      // Legacy keys so existing pages that read ekart_customer still work
      if (userRole === 'customer') localStorage.setItem('ekart_customer', JSON.stringify(payload));
      if (userRole === 'vendor')   localStorage.setItem('ekart_vendor',   JSON.stringify(payload));
    } catch { /* storage quota */ }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    try {
      ['ekart_token', 'ekart_role', 'ekart_user', 'ekart_customer', 'ekart_vendor'].forEach(
        (k) => localStorage.removeItem(k)
      );
    } catch { /* ignore */ }
  };

  const value = {
    user,
    role,
    login,
    logout,
    isAuthenticated: !!user,
    isCustomer:  role === 'customer',
    isVendor:    role === 'vendor',
    isAdmin:     role === 'admin',
    isDelivery:  role === 'delivery',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
