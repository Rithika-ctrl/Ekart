import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

// Formatters
const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WarehouseApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('receiving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auth
  const [warehouseToken, setWarehouseToken] = useState(localStorage.getItem('warehouseToken'));
  const [warehouseId, setWarehouseId] = useState(localStorage.getItem('warehouseId'));
  const warehouseName = localStorage.getItem('warehouseName');
  const warehouseCity = localStorage.getItem('warehouseCity');
  const warehouseLoginId = localStorage.getItem('warehouseLoginId');

  // Login form state
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // Login handler
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

        // Update state
        setWarehouseToken(response.data.token);
        setWarehouseId(response.data.warehouseId);
        setLoginId('');
        setPassword('');
        setError('');
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

  // ─── TAB 1: RECEIVING QUEUE ──────────────────────────────────────────────────
  const [receivingQueue, setReceivingQueue] = useState([]);
  const [loadingReceiving, setLoadingReceiving] = useState(false);

  const fetchReceivingQueue = async () => {
    setLoadingReceiving(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/warehouse/receiving-queue`, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
      });
      setReceivingQueue(response.data.orders || []);
      setError('');
    } catch (err) {
      console.error('Error fetching receiving queue:', err);
      setError('Failed to load receiving queue');
    } finally {
      setLoadingReceiving(false);
    }
  };

  const markAsReceived = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/warehouse/orders/${orderId}/mark-received`,
        {},
        { headers: { Authorization: `Bearer ${warehouseToken}` } }
      );
      setSuccessMessage(`Order ${orderId} marked as received`);
      fetchReceivingQueue();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error marking as received:', err);
      setError('Failed to mark as received');
    } finally {
      setLoading(false);
    }
  };

  // ─── TAB 2: IN-TRANSIT MANAGEMENT ────────────────────────────────────────────
  const [inTransitOrders, setInTransitOrders] = useState([]);
  const [loadingInTransit, setLoadingInTransit] = useState(false);

  const fetchInTransitOrders = async () => {
    setLoadingInTransit(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/warehouse/in-transit`, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
      });
      setInTransitOrders(response.data.orders || []);
      setError('');
    } catch (err) {
      console.error('Error fetching in-transit orders:', err);
      setError('Failed to load in-transit orders');
    } finally {
      setLoadingInTransit(false);
    }
  };

  const updateOrderStatus = async (orderId, action) => {
    try {
      setLoading(true);
      const endpoint = action === 'prepare'
        ? `/warehouse/orders/${orderId}/prepare-for-hub-transit`
        : action === 'transit'
        ? `/warehouse/orders/${orderId}/mark-in-hub-transit`
        : `/warehouse/orders/${orderId}/mark-arrived-at-destination`;

      await axios.post(
        `${API_BASE_URL}${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${warehouseToken}` } }
      );
      setSuccessMessage(`Order ${orderId} status updated`);
      fetchInTransitOrders();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  // ─── TAB 3: ASSIGNMENT QUEUE ────────────────────────────────────────────────
  const [assignmentQueue, setAssignmentQueue] = useState([]);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchAssignmentQueue = async () => {
    setLoadingAssignment(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/warehouse/assignment-queue`, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
      });
      setAssignmentQueue(response.data.orders || []);
      setError('');
    } catch (err) {
      console.error('Error fetching assignment queue:', err);
      setError('Failed to load assignment queue');
    } finally {
      setLoadingAssignment(false);
    }
  };

  const getDeliveryBoys = async (pinCode) => {
    if (!pinCode) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/warehouse/delivery-boys?pinCode=${pinCode}`, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
      });
      setDeliveryBoys(response.data.deliveryBoys || []);
    } catch (err) {
      console.error('Error fetching delivery boys:', err);
      setError('Failed to load delivery boys');
    }
  };

  const assignDeliveryBoy = async () => {
    if (!selectedOrder || !selectedDeliveryBoy) {
      setError('Please select both order and delivery boy');
      return;
    }
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/warehouse/orders/${selectedOrder.id}/assign-delivery-boy`,
        { deliveryBoyId: selectedDeliveryBoy },
        { headers: { Authorization: `Bearer ${warehouseToken}` } }
      );
      setSuccessMessage('Delivery boy assigned successfully');
      setShowAssignModal(false);
      setSelectedOrder(null);
      setSelectedDeliveryBoy(null);
      fetchAssignmentQueue();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error assigning delivery boy:', err);
      setError(err.response?.data?.error || 'Failed to assign delivery boy');
    } finally {
      setLoading(false);
    }
  };

  // ─── TAB 4: COD SETTLEMENTS ─────────────────────────────────────────────────
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [selectedSettlements, setSelectedSettlements] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProof, setUploadProof] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  const fetchPendingSettlements = async () => {
    setLoadingSettlements(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/warehouse/settlements/pending`, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
      });
      setPendingSettlements(response.data.settlements || []);
      setError('');
    } catch (err) {
      console.error('Error fetching settlements:', err);
      setError('Failed to load settlements');
    } finally {
      setLoadingSettlements(false);
    }
  };

  const toggleSettlementSelection = (orderId) => {
    if (selectedSettlements.includes(orderId)) {
      setSelectedSettlements(selectedSettlements.filter(id => id !== orderId));
    } else {
      setSelectedSettlements([...selectedSettlements, orderId]);
    }
  };

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadProof(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSettlementProof = async () => {
    if (selectedSettlements.length === 0) {
      setError('Please select at least one settlement');
      return;
    }
    if (!uploadProof) {
      setError('Please upload proof image');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/warehouse/settlements/create-and-upload-proof`,
        {
          orderIds: selectedSettlements,
          proofImage: uploadProof,
          notes: settlementNotes,
        },
        { headers: { Authorization: `Bearer ${warehouseToken}` } }
      );
      setSuccessMessage('Settlement proof uploaded successfully');
      setShowUploadModal(false);
      setUploadProof('');
      setSettlementNotes('');
      setSelectedSettlements([]);
      fetchPendingSettlements();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error uploading proof:', err);
      setError(err.response?.data?.error || 'Failed to upload proof');
    } finally {
      setLoading(false);
    }
  };

  // ─── TAB 5: DELIVERY BOY APPROVALS ────────────────────────────────────────────
  const [pendingDeliveryBoys, setPendingDeliveryBoys] = useState([]);
  const [loadingDeliveryBoys, setLoadingDeliveryBoys] = useState(false);

  const fetchPendingDeliveryBoys = async () => {
    setLoadingDeliveryBoys(true);
    try {
      console.log('🔍 Fetching pending delivery boys with token:', warehouseToken?.substring(0, 20) + '...');
      const response = await axios.get(`${API_BASE_URL}/warehouse/delivery-boys/pending`, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
      });
      console.log('✅ Response:', response.data);
      setPendingDeliveryBoys(response.data.pendingDeliveryBoys || []);
      setError('');
    } catch (err) {
      console.error('❌ Error fetching pending delivery boys:', err.response?.status, err.response?.data);
      setError('Failed to load pending delivery boys: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingDeliveryBoys(false);
    }
  };

  const handleApproveDeliveryBoy = async (deliveryBoyId, deliveryBoyName) => {
    if (!window.confirm(`Approve delivery boy "${deliveryBoyName}"?`)) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/warehouse/delivery-boys/${deliveryBoyId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${warehouseToken}` } }
      );

      if (response.data.success) {
        setSuccessMessage(`✓ Delivery boy "${deliveryBoyName}" approved successfully`);
        fetchPendingDeliveryBoys();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error approving delivery boy:', err);
      setError(err.response?.data?.message || 'Failed to approve delivery boy');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDeliveryBoy = async (deliveryBoyId, deliveryBoyName) => {
    if (!window.confirm(`Reject delivery boy "${deliveryBoyName}"?`)) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/warehouse/delivery-boys/${deliveryBoyId}/reject`,
        { reason: 'Rejected by warehouse staff' },
        { headers: { Authorization: `Bearer ${warehouseToken}` } }
      );

      if (response.data.success) {
        setSuccessMessage(`✓ Delivery boy "${deliveryBoyName}" rejected`);
        fetchPendingDeliveryBoys();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error rejecting delivery boy:', err);
      setError(err.response?.data?.message || 'Failed to reject delivery boy');
    } finally {
      setLoading(false);
    }
  };

  // ─── TAB 6: STAFF MANAGEMENT ────────────────────────────────────────────────
  const [staffFormData, setStaffFormData] = useState({ name: '', email: '', mobile: '', role: 'WAREHOUSE_STAFF' });
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState(null);
  const [staffCreateError, setStaffCreateError] = useState('');
  const [staffCreateLoading, setStaffCreateLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffListLoading, setStaffListLoading] = useState(false);
  const [staffListError, setStaffListError] = useState('');
  const [staffActiveTab, setStaffActiveTab] = useState('create');

  const loadStaffList = async () => {
    try {
      setStaffListLoading(true);
      const response = await axios.get(`${API_BASE_URL}/warehouse/staff/list`, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
      });
      if (response.data?.success) {
        setStaffList(response.data.staff || []);
      }
    } catch (error) {
      console.error('Failed to load staff list:', error);
      setStaffListError('Failed to load staff list');
    } finally {
      setStaffListLoading(false);
    }
  };

  const handleStaffFormChange = (e) => {
    const { name, value } = e.target;
    setStaffFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffCreateError('');
    setCreatedStaffCredentials(null);

    if (!staffFormData.name || !staffFormData.email || !staffFormData.mobile) {
      setStaffCreateError('Please fill all required fields');
      return;
    }

    try {
      setStaffCreateLoading(true);
      const payload = { ...staffFormData, warehouse_id: warehouseId };
      const response = await axios.post(`${API_BASE_URL}/warehouse/staff/create`, payload, {
        headers: { Authorization: `Bearer ${warehouseToken}` },
      });

      if (response.data?.success) {
        setCreatedStaffCredentials({
          staff_id: response.data.staff_id,
          email: response.data.email,
          password: response.data.password,
          name: response.data.name,
          mobile: response.data.mobile,
          role: response.data.role
        });
        setStaffFormData({ name: '', email: '', mobile: '', role: 'WAREHOUSE_STAFF' });
        setTimeout(() => loadStaffList(), 1000);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error?.message || 'Failed to create staff account';
      setStaffCreateError(errorMsg);
    } finally {
      setStaffCreateLoading(false);
    }
  };

  // ─── UTILITY: Fetch data when tab changes ───────────────────────────────────
  useEffect(() => {
    if (activeTab === 'receiving') fetchReceivingQueue();
    else if (activeTab === 'transit') fetchInTransitOrders();
    else if (activeTab === 'assignment') fetchAssignmentQueue();
    else if (activeTab === 'settlements') fetchPendingSettlements();
    else if (activeTab === 'delivery-boys') fetchPendingDeliveryBoys();
    else if (activeTab === 'staff-management') loadStaffList();
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('warehouseToken');
    localStorage.removeItem('warehouseId');
    localStorage.removeItem('warehouseName');
    localStorage.removeItem('warehouseCity');
    localStorage.removeItem('warehouseLoginId');
    setWarehouseToken(null);
    setWarehouseId(null);
    setLoginId('');
    setPassword('');
    setError('');
  };

  // Show login form if not authenticated
  if (!warehouseToken || !warehouseId) {
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏭 Warehouse Dashboard</h1>
            <p className="text-sm text-gray-600">{warehouseName} • {warehouseCity} (ID: {warehouseLoginId})</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="max-w-7xl mx-auto mt-4 px-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-7xl mx-auto mt-4 px-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white shadow-md mt-4 max-w-7xl mx-auto rounded-t-lg">
        <div className="flex border-b">
          {[
            { id: 'receiving', label: '📦 Receiving Queue' },
            { id: 'transit', label: '🚚 In-Transit' },
            { id: 'assignment', label: '👤 Assignment' },
            { id: 'delivery-boys', label: '🧑 Delivery Boy Approval' },
            { id: 'staff-management', label: '👔 Staff Management' },
            { id: 'settlements', label: '💰 COD Settlement' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-b-2 border-blue-700'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* TAB 1: Receiving Queue */}
        {activeTab === 'receiving' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">📦 Receiving Queue</h2>
            {loadingReceiving ? (
              <p className="text-gray-600">Loading...</p>
            ) : receivingQueue.length === 0 ? (
              <p className="text-gray-600">No orders in receiving queue</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border px-4 py-2 text-left">Order ID</th>
                      <th className="border px-4 py-2 text-left">Customer</th>
                      <th className="border px-4 py-2 text-left">Vendor</th>
                      <th className="border px-4 py-2 text-left">Payment</th>
                      <th className="border px-4 py-2 text-right">Amount</th>
                      <th className="border px-4 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivingQueue.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="border px-4 py-3 font-semibold">#{order.id}</td>
                        <td className="border px-4 py-3">{order.customerName}</td>
                        <td className="border px-4 py-3">{order.vendorName}</td>
                        <td className="border px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.paymentMethod === 'COD'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {order.paymentMethod}
                          </span>
                        </td>
                        <td className="border px-4 py-3 text-right font-semibold">{fmt(order.totalPrice)}</td>
                        <td className="border px-4 py-3 text-center">
                          <button
                            onClick={() => markAsReceived(order.id)}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-semibold"
                          >
                            ✓ Receive
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: In-Transit Management */}
        {activeTab === 'transit' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">🚚 In-Transit Management</h2>
            {loadingInTransit ? (
              <p className="text-gray-600">Loading...</p>
            ) : inTransitOrders.length === 0 ? (
              <p className="text-gray-600">No orders in transit</p>
            ) : (
              <div className="space-y-4">
                {inTransitOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {order.trackingStatus}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {order.trackingStatus === 'WAREHOUSE_RECEIVED' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'prepare')}
                          disabled={loading}
                          className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-semibold"
                        >
                          📋 Prepare for Transit
                        </button>
                      )}
                      {order.trackingStatus === 'PREPARED_FOR_HUB_TRANSIT' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'transit')}
                          disabled={loading}
                          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-semibold"
                        >
                          🚚 Mark In-Transit
                        </button>
                      )}
                      {order.trackingStatus === 'IN_HUB_TRANSIT' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'arrived')}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-semibold"
                        >
                          ✓ Mark Arrived
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Assignment Queue */}
        {activeTab === 'assignment' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">👤 Delivery Boy Assignment</h2>
            {loadingAssignment ? (
              <p className="text-gray-600">Loading...</p>
            ) : assignmentQueue.length === 0 ? (
              <p className="text-gray-600">No orders ready for assignment</p>
            ) : (
              <div className="space-y-4">
                {assignmentQueue.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        <p className="text-sm text-gray-600">PIN: {order.pinCode}</p>
                      </div>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {fmt(order.totalPrice)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        getDeliveryBoys(order.pinCode);
                        setShowAssignModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-semibold"
                    >
                      🎯 Assign Delivery Boy
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Assignment Modal */}
            {showAssignModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">Assign Delivery Boy</h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Order #{selectedOrder?.id}</p>
                    <label className="block text-sm font-semibold mb-2">Select Delivery Boy</label>
                    <select
                      value={selectedDeliveryBoy || ''}
                      onChange={(e) => setSelectedDeliveryBoy(parseInt(e.target.value) || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Choose a delivery boy --</option>
                      {deliveryBoys.map((boy) => (
                        <option key={boy.id} value={boy.id}>
                          {boy.name} (ID: {boy.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={assignDeliveryBoy}
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-semibold"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => {
                        setShowAssignModal(false);
                        setSelectedOrder(null);
                        setSelectedDeliveryBoy(null);
                      }}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Delivery Boy Approvals */}
        {activeTab === 'delivery-boys' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">🧑 Delivery Boy Approvals</h2>
            {loadingDeliveryBoys ? (
              <p className="text-gray-600">Loading...</p>
            ) : pendingDeliveryBoys.length === 0 ? (
              <p className="text-gray-600">No pending delivery boy approvals</p>
            ) : (
              <div className="space-y-3">
                {pendingDeliveryBoys.map((db) => (
                  <div key={db.id} className="flex items-start justify-between border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{db.name}</p>
                      <p className="text-sm text-gray-600">Email: {db.email}</p>
                      <p className="text-sm text-gray-600">Mobile: {db.mobile}</p>
                      <p className="text-sm text-gray-600">Code: {db.deliveryBoyCode}</p>
                      {db.assignedPinCodes && (
                        <p className="text-sm text-gray-600">PIN Codes: {db.assignedPinCodes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApproveDeliveryBoy(db.id, db.name)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-semibold whitespace-nowrap"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRejectDeliveryBoy(db.id, db.name)}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-semibold whitespace-nowrap"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Staff Management */}
        {activeTab === 'staff-management' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6">👔 Staff Management</h2>

            {/* Tab Buttons */}
            <div className="flex gap-4 mb-6 border-b pb-4">
              <button
                onClick={() => setStaffActiveTab('create')}
                className={`px-4 py-2 font-semibold transition ${
                  staffActiveTab === 'create'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                ➕ Create Staff
              </button>
              <button
                onClick={() => setStaffActiveTab('list')}
                className={`px-4 py-2 font-semibold transition ${
                  staffActiveTab === 'list'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📋 Existing Staff
              </button>
            </div>

            {/* Create Staff Tab */}
            {staffActiveTab === 'create' && (
              <div className="space-y-6">
                {staffCreateError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                    {staffCreateError}
                  </div>
                )}

                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Staff Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={staffFormData.name}
                      onChange={handleStaffFormChange}
                      placeholder="e.g., John Doe"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={staffFormData.email}
                      onChange={handleStaffFormChange}
                      placeholder="e.g., staff@warehouse.com"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Mobile Number *</label>
                    <input
                      type="tel"
                      name="mobile"
                      value={staffFormData.mobile}
                      onChange={handleStaffFormChange}
                      placeholder="e.g., 9876543210"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Role</label>
                    <select
                      name="role"
                      value={staffFormData.role}
                      onChange={handleStaffFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                      <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={staffCreateLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
                  >
                    {staffCreateLoading ? '⏳ Creating...' : '✓ Create Staff'}
                  </button>
                </form>

                {/* Created Credentials Display */}
                {createdStaffCredentials && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">✓</div>
                      <div>
                        <h3 className="text-lg font-bold text-green-800">Success!</h3>
                        <p className="text-sm text-green-700">Staff account created</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {[
                        { label: 'Staff Name', value: createdStaffCredentials.name },
                        { label: 'Staff ID', value: createdStaffCredentials.staff_id },
                        { label: 'Email', value: createdStaffCredentials.email },
                        { label: 'Password', value: createdStaffCredentials.password },
                        { label: 'Mobile', value: createdStaffCredentials.mobile },
                        { label: 'Role', value: createdStaffCredentials.role }
                      ].map((item, i) => (
                        <div key={i} className="bg-white p-3 rounded border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">{item.label}</p>
                          <p className="font-mono text-sm">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm mb-4">
                      <strong>⚠️ Important:</strong> Keep credentials safe. Share securely with staff.
                    </div>

                    <button
                      onClick={() => setCreatedStaffCredentials(null)}
                      className="w-full bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition"
                    >
                      Create Another
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* List Staff Tab */}
            {staffActiveTab === 'list' && (
              <div>
                {staffListError && (
                  <div className="text-red-600 text-center py-8">{staffListError}</div>
                )}
                {staffListLoading && (
                  <div className="text-gray-600 text-center py-8">Loading staff...</div>
                )}
                {!staffListLoading && staffList.length === 0 && (
                  <div className="text-gray-600 text-center py-8">No staff members found</div>
                )}
                {!staffListLoading && staffList.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Name</th>
                          <th className="text-left px-4 py-3 font-semibold">Email</th>
                          <th className="text-left px-4 py-3 font-semibold">Mobile</th>
                          <th className="text-left px-4 py-3 font-semibold">Role</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map((staff, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold">{staff.name}</td>
                            <td className="px-4 py-3">{staff.email}</td>
                            <td className="px-4 py-3">{staff.mobile}</td>
                            <td className="px-4 py-3">
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold">
                                {staff.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded text-xs font-semibold ${
                                staff.active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {staff.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: COD Settlements */}
        {activeTab === 'settlements' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">💰 COD Settlements</h2>
            {loadingSettlements ? (
              <p className="text-gray-600">Loading...</p>
            ) : pendingSettlements.length === 0 ? (
              <p className="text-gray-600">No pending COD settlements</p>
            ) : (
              <>
                <div className="mb-6 p-4 bg-blue-100 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Selected:</strong> {selectedSettlements.length} order(s) | 
                    <strong className="ml-3">Total Amount:</strong> {fmt(
                      pendingSettlements
                        .filter(s => selectedSettlements.includes(s.orderId))
                        .reduce((sum, s) => sum + s.codAmount, 0)
                    )}
                  </p>
                </div>
                <div className="space-y-3 mb-6">
                  {pendingSettlements.map((settlement) => (
                    <div key={settlement.orderId} className="flex items-start border rounded-lg p-4 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedSettlements.includes(settlement.orderId)}
                        onChange={() => toggleSettlementSelection(settlement.orderId)}
                        className="mt-1 mr-4 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">Order #{settlement.orderId}</p>
                        <p className="text-sm text-gray-600">{settlement.customerName}</p>
                        <p className="text-sm font-semibold text-orange-600">{fmt(settlement.codAmount)} COD</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  disabled={selectedSettlements.length === 0 || loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition font-semibold w-full"
                >
                  📸 Upload Proof ({selectedSettlements.length})
                </button>

                {/* Upload Modal */}
                {showUploadModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
                      <h3 className="text-xl font-bold mb-4">Upload Settlement Proof</h3>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">Proof Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofUpload}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {uploadProof && (
                          <p className="text-xs text-green-600 mt-2">✓ Image selected</p>
                        )}
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">Notes (optional)</label>
                        <textarea
                          value={settlementNotes}
                          onChange={(e) => setSettlementNotes(e.target.value)}
                          placeholder="Add any notes..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={uploadSettlementProof}
                          disabled={!uploadProof || loading}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-semibold"
                        >
                          Upload
                        </button>
                        <button
                          onClick={() => {
                            setShowUploadModal(false);
                            setUploadProof('');
                            setSettlementNotes('');
                          }}
                          className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
