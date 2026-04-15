import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

export default function WarehouseStaffLoginPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!loginId || !password) {
        setError('Please enter both Login ID and Password');
        setLoading(false);
        return;
      }

      if (loginId.length !== 8) {
        setError('Login ID must be 8 digits');
        setLoading(false);
        return;
      }

      if (password.length !== 6) {
        setError('Password must be 6 digits');
        setLoading(false);
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/auth/warehouse/login`, {
        loginId,
        password,
      });

      if (response.data.success) {
        // Store credentials in localStorage
        localStorage.setItem('warehouseToken', response.data.token);
        localStorage.setItem('warehouseId', response.data.warehouseId);
        localStorage.setItem('warehouseName', response.data.warehouseName);
        localStorage.setItem('warehouseCity', response.data.city || '');
        localStorage.setItem('warehouseLoginId', loginId);

        // Redirect to dashboard
        navigate('/warehouse/dashboard');
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Failed to login. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏭 Warehouse Staff</h1>
          <p className="text-gray-600">Login to Your Dashboard</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Warehouse Login ID
            </label>
            <input
              type="number"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.slice(0, 8))}
              placeholder="Enter 8-digit ID"
              maxLength="8"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 6))}
              placeholder="Enter 6-digit password"
              maxLength="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 mt-6"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            For support, contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}