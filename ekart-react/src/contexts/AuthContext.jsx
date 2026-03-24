import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('ekart_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  useEffect(() => {
    try {
      if (user) localStorage.setItem('ekart_user', JSON.stringify(user))
      else localStorage.removeItem('ekart_user')
    } catch {}
  }, [user])

  const login = (payload) => setUser(payload)
  const logout = () => setUser(null)

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
