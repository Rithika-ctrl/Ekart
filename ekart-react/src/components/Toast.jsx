import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * Default Toast component (kept unchanged in structure)
 */
export default function Toast({ type = 'success', message, onClose, duration = 3000 }) {
  if (!message) return null
  return (
    <div className={`alert alert-${type}`}>
      <i className={`fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
      <span>{message}</span>
      <button className="alert-close" onClick={onClose}>×</button>
    </div>
  )
}

// ToastProvider + useToast hook
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false })

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ message: String(message || ''), type, visible: true })
    if (duration > 0) {
      setTimeout(() => setToast(t => ({ ...t, visible: false, message: '' })), duration)
    }
  }, [])

  const hide = useCallback(() => setToast({ message: '', type: 'success', visible: false }), [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <Toast type={toast.type} message={toast.message} onClose={hide} />
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
