import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

export default function AdminWarehousePage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);
  const [newPasswordData, setNewPasswordData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    servedPinCodes: '',
    latitude: '',
    longitude: '',
  });

  const adminToken = localStorage.getItem('adminToken');
  const authHeader = { Authorization: `Bearer ${adminToken}` };

  // Fetch all warehouses
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/warehouses/all`, {
        headers: authHeader,
      });
      setWarehouses(response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      alert('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        city: formData.city,
        state: formData.state,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        address: formData.address,
        servedPinCodes: formData.servedPinCodes,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      const response = await axios.post(`${API_BASE_URL}/admin/warehouse/create`, payload, {
        headers: authHeader,
      });

      setNewCredentials({
        name: response.data.warehouseName,
        city: response.data.city,
        loginId: response.data.loginId,
        password: response.data.plainPassword,
      });

      setShowCreateModal(false);
      setShowSuccessModal(true);
      setFormData({
        name: '',
        city: '',
        state: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        servedPinCodes: '',
        latitude: '',
        longitude: '',
      });

      // Refresh warehouse list
      fetchWarehouses();
    } catch (error) {
      console.error('Error creating warehouse:', error);
      alert(error.response?.data?.error || 'Failed to create warehouse');
    }
  };

  const handleViewDetails = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowDetailsModal(true);
  };

  const handleResetPassword = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/warehouse/${selectedWarehouse.id}/reset-password`,
        {},
        { headers: authHeader }
      );

      setNewPasswordData({
        warehouseId: selectedWarehouse.id,
        password: response.data.newPassword,
      });

      setShowDetailsModal(false);
      setShowPasswordModal(true);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password');
    }
  };

  const handleToggleActive = async () => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/admin/warehouse/${selectedWarehouse.id}/toggle-active`,
        {},
        { headers: authHeader }
      );

      setSelectedWarehouse((prev) => ({
        ...prev,
        active: response.data.active,
      }));

      fetchWarehouses();
      alert(`Warehouse ${response.data.active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling warehouse status:', error);
      alert('Failed to toggle warehouse status');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            + Create Warehouse
          </button>
        </div>

        {/* Warehouse Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading warehouses...</div>
          ) : warehouses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No warehouses found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">City</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">State</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Login ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {warehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 text-sm text-gray-900">{wh.id}</td>
                    <td
                      className="px-6 py-4 text-sm text-gray-900 font-medium"
                      onClick={() => handleViewDetails(wh)}
                    >
                      {wh.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{wh.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{wh.state}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{wh.loginId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{wh.contactEmail}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          wh.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {wh.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleViewDetails(wh)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Warehouse Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Create New Warehouse</h2>
            </div>
            <form onSubmit={handleCreateWarehouse} className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Served Pin Codes (comma-separated)
                </label>
                <input
                  type="text"
                  name="servedPinCodes"
                  value={formData.servedPinCodes}
                  onChange={handleFormChange}
                  placeholder="110001,110002,110003"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleFormChange}
                    step="0.0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleFormChange}
                    step="0.0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  Create Warehouse
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal - Show Credentials */}
      {showSuccessModal && newCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-green-600 mb-4 text-center">
              ✓ Warehouse Created Successfully
            </h2>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Warehouse Name</p>
              <p className="text-lg font-semibold text-gray-900">{newCredentials.name}</p>

              <p className="text-sm text-gray-600 mt-3 mb-1">City</p>
              <p className="text-lg font-semibold text-gray-900">{newCredentials.city}</p>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Login ID</p>
              <p className="text-3xl font-bold text-blue-600 mb-4 font-mono text-center">
                {newCredentials.loginId}
              </p>

              <p className="text-sm text-gray-600 mb-2">Password</p>
              <p className="text-3xl font-bold text-red-600 font-mono text-center">
                {newCredentials.password}
              </p>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <p className="text-sm text-yellow-800 font-semibold">
                ⚠️ WARNING: Save these credentials now. The password will NOT be shown again.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(`${newCredentials.loginId} / ${newCredentials.password}`)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Copy Credentials
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setNewCredentials(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Warehouse Details</h2>

            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              <div>
                <p className="text-sm text-gray-600">Warehouse ID</p>
                <p className="font-semibold text-gray-900">{selectedWarehouse.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold text-gray-900">{selectedWarehouse.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">City</p>
                <p className="font-semibold text-gray-900">{selectedWarehouse.city}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">State</p>
                <p className="font-semibold text-gray-900">{selectedWarehouse.state}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Login ID</p>
                <p className="font-mono font-bold text-blue-600">{selectedWarehouse.loginId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Email</p>
                <p className="font-semibold text-gray-900">{selectedWarehouse.contactEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Phone</p>
                <p className="font-semibold text-gray-900">{selectedWarehouse.contactPhone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-semibold text-gray-900">{selectedWarehouse.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Served Pin Codes</p>
                <p className="font-semibold text-gray-900">{selectedWarehouse.servedPinCodes}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    selectedWarehouse.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {selectedWarehouse.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleResetPassword}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Reset Password
              </button>
              <button
                onClick={handleToggleActive}
                className={`w-full font-bold py-2 px-4 rounded-lg transition ${
                  selectedWarehouse.active
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {selectedWarehouse.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedWarehouse(null);
                }}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && newPasswordData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-green-600 mb-4 text-center">
              ✓ Password Reset Successfully
            </h2>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">New Password</p>
              <p className="text-3xl font-bold text-red-600 font-mono text-center">
                {newPasswordData.password}
              </p>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <p className="text-sm text-yellow-800 font-semibold">
                ⚠️ WARNING: Save this password now. It will NOT be shown again.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(newPasswordData.password)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Copy Password
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPasswordData(null);
                  setShowDetailsModal(true);
                  setSelectedWarehouse(selectedWarehouse);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
