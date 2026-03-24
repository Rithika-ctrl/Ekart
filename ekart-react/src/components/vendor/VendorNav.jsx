import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import '../../styles/vendor-glass.css'

export default function VendorNav({ alertCount = 0 }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/vendor/login')
  }

  const isActive = (path) => location.pathname === path ? 'vnd-nav-link active-link' : 'vnd-nav-link'

  return (
    <nav className={`vnd-nav${scrolled ? ' scrolled' : ''}`}>
      <Link to="/vendor/home" className="vnd-nav-brand">
        <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }} aria-hidden="true" />
        E<span>kart</span>
      </Link>

      <div className="vnd-nav-right">
        <span className="vnd-nav-badge">
          <i className="fas fa-store" aria-hidden="true" /> Vendor
        </span>
        {user?.name && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {user.name}
          </span>
        )}
        <Link to="/vendor/home"          className={isActive('/vendor/home')}>
          <i className="fas fa-th-large" aria-hidden="true" /> Dashboard
        </Link>
        <Link to="/vendor/orders"        className={isActive('/vendor/orders')}>
          <i className="fas fa-boxes" aria-hidden="true" /> Orders
        </Link>
        <Link to="/vendor/products"      className={isActive('/vendor/products')}>
          <i className="fas fa-box" aria-hidden="true" /> Products
        </Link>
        <Link to="/vendor/sales-report"  className={isActive('/vendor/sales-report')}>
          <i className="fas fa-chart-line" aria-hidden="true" /> Sales
        </Link>
        <Link to="/vendor/store-front"   className={isActive('/vendor/store-front')}>
          <i className="fas fa-store" aria-hidden="true" /> Store
        </Link>
        {alertCount > 0 && (
          <Link to="/vendor/stock-alerts" className="vnd-nav-link" style={{ position: 'relative' }}>
            <i className="fas fa-bell" aria-hidden="true" />
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              background: 'var(--yellow)', color: '#1a1000',
              fontSize: '0.6rem', fontWeight: 800,
              width: 18, height: 18, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {alertCount}
            </span>
          </Link>
        )}
        <button className="vnd-btn-logout" onClick={handleLogout} aria-label="Logout">
          <i className="fas fa-sign-out-alt" aria-hidden="true" /> Logout
        </button>
      </div>
    </nav>
  )
}
