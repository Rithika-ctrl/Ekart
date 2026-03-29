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
  input::placeholder, textarea::placeholder { color: #6b7280; }
`
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)