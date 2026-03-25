import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      // Read from ekart_customer (set by api.js saveToken)
      const raw = localStorage.getItem('ekart_customer')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  const login = (payload) => {
    setUser(payload)
    try { localStorage.setItem('ekart_customer', JSON.stringify(payload)) } catch {}
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem('ekart_token')
      localStorage.removeItem('ekart_customer')
      localStorage.removeItem('ekart_user')
    } catch {}
  }

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isVendor: user?.type === 'vendor',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
