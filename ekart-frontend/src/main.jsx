import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/*
  Global style resets for non-admin pages (CustomerApp, VendorApp, DeliveryApp)
  that still use inline styles. Tailwind's base layer handles the admin styles.
  We keep these imperative additions so those pages look correct too.
*/
const style = document.createElement('style')
style.textContent = `
  :root { color-scheme: light; }

  body {
    background: var(--ek-bg, #f9fafb);
    color: var(--ek-text, #111827);
    padding-bottom: 84px;
  }

  input::placeholder, textarea::placeholder { color: var(--ek-muted, #6b7280); }

  [data-theme="dark"] .bg-white { background-color: #111827 !important; }
  [data-theme="dark"] .bg-gray-50 { background-color: #0f172a !important; }
  [data-theme="dark"] .bg-gray-100 { background-color: #1f2937 !important; }
  [data-theme="dark"] .text-gray-900 { color: #f9fafb !important; }
  [data-theme="dark"] .text-gray-800 { color: #f9fafb !important; }
  [data-theme="dark"] .text-gray-700 { color: #d1d5db !important; }
  [data-theme="dark"] .text-gray-600 { color: #9ca3af !important; }
  [data-theme="dark"] .text-gray-500 { color: #9ca3af !important; }
  [data-theme="dark"] .border-gray-200 { border-color: #243042 !important; }
  [data-theme="dark"] .border-gray-300 { border-color: #374151 !important; }
  [data-theme="dark"] .bg-green-50 { background-color: rgba(74, 222, 128, 0.12) !important; }
  [data-theme="dark"] .bg-red-50 { background-color: rgba(248, 113, 113, 0.12) !important; }
  [data-theme="dark"] .bg-yellow-50 { background-color: rgba(251, 191, 36, 0.12) !important; }
  [data-theme="dark"] .bg-indigo-50 { background-color: rgba(96, 165, 250, 0.12) !important; }
  [data-theme="dark"] .bg-purple-50 { background-color: rgba(192, 132, 252, 0.12) !important; }
  [data-theme="dark"] .text-green-600 { color: #4ade80 !important; }
  [data-theme="dark"] .text-red-600 { color: #f87171 !important; }
  [data-theme="dark"] .text-yellow-600 { color: #fbbf24 !important; }
  [data-theme="dark"] .text-indigo-600 { color: #60a5fa !important; }
  [data-theme="dark"] .text-purple-600 { color: #c084fc !important; }
  [data-theme="dark"] .text-indigo-700 { color: #93c5fd !important; }
  [data-theme="dark"] .text-black { color: #f9fafb !important; }
`
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)