import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clearToken } from '../utils/api';

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isAuthenticated, isAdmin, isVendor, isDelivery, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    logout();
    navigate('/login');
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
              {isAuthenticated ? (
                <>
                  {user?.name && (
                    <li style={{ padding: '0.4rem 1rem', color: 'var(--yellow)', fontSize: '0.82rem', fontWeight: 600 }}>
                      <i className="fas fa-user-circle" style={{ marginRight: 6 }}></i>
                      {user.name}
                    </li>
                  )}
                  <li><hr className="divider" /></li>

                  {/* Customer links */}
                  {!isAdmin && !isVendor && !isDelivery && (
                    <>
                      <li><Link to="/profile"><i className="fas fa-user" style={{ color: 'var(--yellow)', width: 14 }}></i> My Profile</Link></li>
                      <li><Link to="/orders"><i className="fas fa-box" style={{ color: 'var(--yellow)', width: 14 }}></i> My Orders</Link></li>
                      <li><Link to="/wishlist"><i className="fas fa-heart" style={{ color: '#e74c3c', width: 14 }}></i> Wishlist</Link></li>
                      <li><Link to="/cart"><i className="fas fa-shopping-cart" style={{ color: 'var(--yellow)', width: 14 }}></i> Cart</Link></li>
                    </>
                  )}

                  {/* Vendor links */}
                  {isVendor && (
                    <>
                      <li><Link to="/vendor"><i className="fas fa-store" style={{ color: 'var(--yellow)', width: 14 }}></i> Dashboard</Link></li>
                      <li><Link to="/vendor/products"><i className="fas fa-box" style={{ color: 'var(--yellow)', width: 14 }}></i> My Products</Link></li>
                      <li><Link to="/vendor/orders"><i className="fas fa-list-alt" style={{ color: 'var(--yellow)', width: 14 }}></i> Orders</Link></li>
                    </>
                  )}

                  {/* Admin links */}
                  {isAdmin && (
                    <>
                      <li><Link to="/admin"><i className="fas fa-shield-alt" style={{ color: 'var(--yellow)', width: 14 }}></i> Admin Panel</Link></li>
                    </>
                  )}

                  {/* Delivery links */}
                  {isDelivery && (
                    <>
                      <li><Link to="/delivery"><i className="fas fa-truck" style={{ color: 'var(--yellow)', width: 14 }}></i> Delivery Dashboard</Link></li>
                    </>
                  )}

                  <li><hr className="divider" /></li>
                  <li>
                    <button className="dropdown-btn" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt" style={{ width: 14 }}></i> Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li><Link to="/login"><i className="fas fa-sign-in-alt" style={{ color: 'var(--yellow)', width: 14 }}></i> Customer Login</Link></li>
                  <li><Link to="/register"><i className="fas fa-user-plus" style={{ color: '#7dc97d', width: 14 }}></i> Customer Register</Link></li>
                  <li><hr className="divider" /></li>
                  <li><Link to="/vendor/login"><i className="fas fa-store" style={{ color: 'var(--yellow)', width: 14 }}></i> Vendor Login</Link></li>
                  <li><Link to="/vendor/register"><i className="fas fa-store" style={{ color: '#7dc97d', width: 14 }}></i> Vendor Register</Link></li>
                  <li><hr className="divider" /></li>
                  <li><Link to="/delivery/login"><i className="fas fa-truck" style={{ color: 'rgba(255,255,255,0.5)', width: 14 }}></i> Delivery Login</Link></li>
                  <li><hr className="divider" /></li>
                  <li><Link to="/admin/login"><i className="fas fa-shield-alt" style={{ color: 'rgba(255,255,255,0.4)', width: 14 }}></i> Admin Login</Link></li>
                </>
              )}
            </ul>
          )}
        </li>

        {!isAuthenticated && (
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
