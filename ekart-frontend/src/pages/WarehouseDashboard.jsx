import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

export default function WarehouseDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('receiving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Get user data from localStorage
  const warehouseToken = localStorage.getItem('warehouseToken');
  const warehouseId = localStorage.getItem('warehouseId');
  const warehouseName = localStorage.getItem('warehouseName');
  const warehouseCity = localStorage.getItem('warehouseCity');

  // Redirect if not logged in
  useEffect(() => {
    if (!warehouseToken) {
      navigate('/warehouse/login');
    }
  }, [warehouseToken, navigate]);

  // Tab 1: Receiving Queue
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
      const response = await axios.post(
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

  // Tab 2: In-Transit Management
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
        ? `/api/react/warehouse/orders/${orderId}/prepare-for-hub-transit`
        : action === 'transit'
        ? `/api/react/warehouse/orders/${orderId}/mark-in-hub-transit`
        : `/api/react/warehouse/orders/${orderId}/mark-arrived-at-destination`;

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

  // Tab 3: Assignment Queue
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
      const response = await axios.post(
        `${API_BASE_URL}/warehouse/orders/${selectedOrder.id}/assign-delivery-boy`,
        { deliveryBoyId: selectedDeliveryBoy },
        { headers: { Authorization: `Bearer ${warehouseToken}` } }
      );
      setSuccessMessage(`Delivery boy assigned successfully`);
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

  // Tab 4: COD Settlements
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
        setUploadProof(reader.result); // Base64 encoded image
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
      const response = await axios.post(
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

  // Load data when tabs change
  useEffect(() => {
    if (activeTab === 'receiving') fetchReceivingQueue();
    else if (activeTab === 'transit') fetchInTransitOrders();
    else if (activeTab === 'assignment') fetchAssignmentQueue();
    else if (activeTab === 'settlements') fetchPendingSettlements();
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('warehouseToken');
    localStorage.removeItem('warehouseId');
    localStorage.removeItem('warehouseName');
    localStorage.removeItem('warehouseCity');
    localStorage.removeItem('warehouseLoginId');
    navigate('/warehouse/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏭 Warehouse Dashboard</h1>
            <p className="text-sm text-gray-600">{warehouseName} • {warehouseCity}</p>
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
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
            {error}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-7xl mx-auto mt-4 px-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg" role="alert">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white shadow-md mt-4 max-w-7xl mx-auto rounded-t-lg">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('receiving')}
            className={`flex-1 py-4 px-6 font-semibold transition ${
              activeTab === 'receiving'
                ? 'bg-blue-600 text-white border-b-2 border-blue-700'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            📦 Receiving Queue
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`flex-1 py-4 px-6 font-semibold transition ${
              activeTab === 'transit'
                ? 'bg-blue-600 text-white border-b-2 border-blue-700'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            🚚 In-Transit
          </button>
          <button
            onClick={() => setActiveTab('assignment')}
            className={`flex-1 py-4 px-6 font-semibold transition ${
              activeTab === 'assignment'
                ? 'bg-blue-600 text-white border-b-2 border-blue-700'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            👤 Assignment
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={`flex-1 py-4 px-6 font-semibold transition ${
              activeTab === 'settlements'
                ? 'bg-blue-600 text-white border-b-2 border-blue-700'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            💰 COD Settlement
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab 1: Receiving Queue */}
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
                        <td className="border px-4 py-3 text-right font-semibold">₹{order.totalPrice}</td>
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

        {/* Tab 2: In-Transit Management */}
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

        {/* Tab 3: Assignment Queue */}
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
                        ₹{order.totalPrice}
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

        {/* Tab 4: COD Settlements */}
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
                    <strong className="ml-3">Total Amount:</strong> ₹{
                      pendingSettlements
                        .filter(s => selectedSettlements.includes(s.orderId))
                        .reduce((sum, s) => sum + s.codAmount, 0)
                    }
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
                        <p className="text-sm font-semibold text-orange-600">₹{settlement.codAmount} COD</p>
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
