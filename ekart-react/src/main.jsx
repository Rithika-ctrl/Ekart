import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'

// ✅ FIX 2: AuthProvider lives HERE (in main.jsx), not also in App.jsx
// App.jsx was also wrapping in <AuthProvider> which created two separate
// auth contexts — login state was shared with the wrong one.
// AuthProvider must wrap BrowserRouter so ProtectedRoute can see auth state.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)