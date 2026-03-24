import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isLoggedIn, clearToken } from '../utils/api';

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  return (
    <nav className="ekart-nav">
      <Link to="/" className="nav-brand">
        <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
        Ek<span>art</span>
      </Link>

      <ul className="nav-links">
        <li><Link to="/products">Shop</Link></li>

        <li
          className="dropdown"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-user-circle"></i> Account{' '}
            <i className="fas fa-angle-down" style={{ fontSize: '.65rem' }}></i>
          </a>
          {dropdownOpen && (
            <ul className="dropdown-menu visible">
              {loggedIn ? (
                <>
                  <li><Link to="/profile"><i className="fas fa-user" style={{ color: 'var(--yellow)', width: 14 }}></i> My Profile</Link></li>
                  <li><Link to="/orders"><i className="fas fa-box" style={{ color: 'var(--yellow)', width: 14 }}></i> My Orders</Link></li>
                  <li><hr className="divider" /></li>
                  <li><button className="dropdown-btn" onClick={handleLogout}><i className="fas fa-sign-out-alt" style={{ width: 14 }}></i> Logout</button></li>
                </>
              ) : (
                <>
                  <li><Link to="/login"><i className="fas fa-sign-in-alt" style={{ color: 'var(--yellow)', width: 14 }}></i> Customer Login</Link></li>
                  <li><Link to="/register"><i className="fas fa-user-plus" style={{ color: '#7dc97d', width: 14 }}></i> Customer Register</Link></li>
                  <li><hr className="divider" /></li>
                  <li><a href="/vendor/login"><i className="fas fa-store" style={{ color: 'var(--yellow)', width: 14 }}></i> Vendor Login</a></li>
                  <li><a href="/vendor/register"><i className="fas fa-store" style={{ color: '#7dc97d', width: 14 }}></i> Vendor Register</a></li>
                  <li><hr className="divider" /></li>
                  <li><a href="/admin/login"><i className="fas fa-shield-alt" style={{ color: 'rgba(255,255,255,0.4)', width: 14 }}></i> Admin Login</a></li>
                </>
              )}
            </ul>
          )}
        </li>

        {!loggedIn && (
          <li>
            <Link
              to="/register"
              style={{
                background: 'var(--yellow)', color: '#1a1000',
                fontWeight: 700, borderRadius: '50px',
                padding: '.45rem 1.2rem',
              }}
            >
              Register
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}