import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

/**
 * LOCATION: ekart-frontend/src/pages/WarehouseStaffLoginPage.jsx
 * 
 * Warehouse Staff Login Page
 * - Email-based authentication
 * - Password validation
 * - Session storage
 * - Redirects to dashboard on successful login
 */
export default function WarehouseStaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/warehouse/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      }).then(r => r.json());

      if (response.data?.success) {
        // Store in session storage
        sessionStorage.setItem('warehouseStaffId', response.data.staff_id);
        sessionStorage.setItem('warehouseStaffName', response.data.staff_name);
        sessionStorage.setItem('warehouseStaffEmail', response.data.staff_email);
        sessionStorage.setItem('warehouseStaffRole', response.data.role);
        sessionStorage.setItem('warehouseId', response.data.warehouse_id);

        // Show success message
        alert(`✅ Welcome, ${response.data.staff_name}!`);

        // Redirect to dashboard
        navigate('/warehouse/dashboard');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Login failed. Please try again.';
      setError(errorMsg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('ajay@warehouseblr.com');
    setPassword('SecurePass@123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl text-white font-bold">📦</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">EKART</h1>
          <p className="text-gray-600 mt-2">Warehouse Staff Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <span className="text-xl mr-3">⚠️</span>
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="E.g., ajay@warehouseblr.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition disabled:bg-gray-100"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Logging in...
              </>
            ) : (
              'Login to Dashboard'
            )}
          </button>
        </form>

        {/* Demo Login */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-600 text-sm mb-3">Demo Mode:</p>
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full bg-blue-100 text-blue-700 font-semibold py-2 rounded-lg hover:bg-blue-200 transition disabled:opacity-50"
          >
            🔧 Auto-fill Demo Credentials
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            (For testing: Ajay Singh, Bengaluru warehouse manager)
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>💡 Tip:</strong> Warehouse staff should have received login
            credentials via email after account creation by admin.
          </p>
        </div>

        {/* Support */}
        <p className="text-center text-gray-600 text-sm mt-6">
          Need help?{' '}
          <a href="#" className="text-orange-500 hover:text-orange-600 font-semibold">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
