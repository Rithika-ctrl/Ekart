import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

export default function DeliveryApp() {
  const navigate = useNavigate();
  
  // Get delivery token from localStorage
  const deliveryToken = localStorage.getItem('deliveryToken');
  const deliveryName = localStorage.getItem('deliveryName');

  // Redirect if not logged in
  useEffect(() => {
    if (!deliveryToken) {
      navigate('/auth');
    }
  }, [deliveryToken, navigate]);

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [orders, setOrders] = useState([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [modalOtp, setModalOtp] = useState('');
  const [modalCashCollected, setModalCashCollected] = useState('');

  // Fetch orders on mount
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
          headers: { Authorization: `Bearer ${deliveryToken}` },
        });
        setOrders(response.data.orders || []);
        setError('');
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    if (deliveryToken) fetchOrders();
  }, [deliveryToken]);

  // Mark as picked up
  const markPickedUp = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/pickup`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Order ${orderId} marked as picked up`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error marking picked up:', err);
      setError('Failed to mark as picked up');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delivery (FIXED: OTP validation, cash pre-population, defensive checks)
  const confirmDelivery = async () => {
    if (!modalOtp || String(modalOtp).length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    const order = showConfirmModal;
    if (order?.paymentMethod === 'COD' && (!modalCashCollected || parseFloat(modalCashCollected) <= 0)) {
      setError('Please enter valid cash amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        otp: modalOtp,
      };
      if (order?.paymentMethod === 'COD') {
        payload.cashCollected = parseFloat(modalCashCollected);
      }

      await axios.post(
        `${API_BASE_URL}/delivery/orders/${order?.id}/confirm-delivery`,
        payload,
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );

      setSuccessMessage(`Delivery Confirmed! ${order?.paymentMethod === 'COD' ? `Please submit ₹${modalCashCollected} to your warehouse.` : ''}`);
      setShowConfirmModal(null);
      setModalOtp('');
      setModalCashCollected('');

      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError(err.response?.data?.error || 'Failed to confirm delivery');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Submit cash to warehouse
  const submitCashToWarehouse = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/submit-cash`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Cash submitted to warehouse for Order ${orderId}`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error submitting cash:', err);
      setError('Failed to submit cash');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('deliveryToken');
    localStorage.removeItem('deliveryId');
    localStorage.removeItem('deliveryName');
    localStorage.removeItem('deliveryEmail');
    navigate('/auth');
  };

  // Filter orders by status
  const shippedOrders = orders.filter(o => o.trackingStatus === 'SHIPPED');
  const outForDeliveryOrders = orders.filter(o => o.trackingStatus === 'OUT_FOR_DELIVERY');
  const deliveredCodOrders = orders.filter(o => o.trackingStatus === 'DELIVERED' && o.paymentStatus === 'COD_COLLECTED');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛵 Delivery App</h1>
            <p className="text-sm text-gray-600">{deliveryName || 'Delivery Boy'}</p>
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
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl mb-4">⏳</div>
            <p className="font-semibold">Loading orders...</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: My Orders */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">📦 My Orders</h2>

              {/* SHIPPED Orders - Mark Picked Up */}
              {shippedOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-indigo-600">📭 Ready to Pickup ({shippedOrders.length})</h3>
                  <div className="space-y-4">
                    {shippedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => markPickedUp(order.id)}
                        actionLabel="Mark Picked Up"
                        actionColor="bg-indigo-600 hover:bg-indigo-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* OUT_FOR_DELIVERY Orders - Confirm Delivery */}
              {outForDeliveryOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-yellow-600">🚚 Out for Delivery ({outForDeliveryOrders.length})</h3>
                  <div className="space-y-4">
                    {outForDeliveryOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => setShowConfirmModal(order)}
                        actionLabel="Confirm Delivery"
                        actionColor="bg-yellow-600 hover:bg-yellow-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Orders */}
              {shippedOrders.length === 0 && outForDeliveryOrders.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                  <p className="text-2xl mb-2">📭</p>
                  <p>No orders assigned yet</p>
                </div>
              )}
            </section>

            {/* SECTION 3: Submit Cash to Warehouse */}
            {deliveredCodOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">💰 Submit Cash to Warehouse</h2>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="space-y-4">
                    {deliveredCodOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-indigo-600">Order #{order?.id || 'N/A'}</h4>
                            <p className="text-sm text-gray-600">{order?.customerName || 'Customer'}</p>
                            <p className="text-sm text-gray-600">{order?.deliveryAddress || 'Address not provided'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">₹{order?.totalPrice || 'N/A'}</p>
                            <p className="text-xs text-gray-600">COD Collected</p>
                          </div>
                        </div>
                        <button
                          onClick={() => submitCashToWarehouse(order.id)}
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                        >
                          💳 Submit Cash
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* SECTION 2: Confirm Delivery Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">Confirm Delivery</h2>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="text-2xl font-bold text-indigo-600">#{showConfirmModal?.id || 'N/A'}</p>
              <p className="text-sm text-gray-700 mt-2">{showConfirmModal?.customerName || 'Customer'}</p>
              <p className="text-sm text-gray-700">{showConfirmModal?.customerPhone || 'N/A'}</p>
              <p className="text-sm text-gray-600 mt-2">{showConfirmModal?.deliveryAddress || 'Address not provided'}</p>
              <p className="text-sm text-gray-600">📍 PIN: {showConfirmModal?.pinCode || 'N/A'}</p>
            </div>

            {/* Payment Badge */}
            <div className="mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  showConfirmModal?.paymentMethod === 'COD'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {showConfirmModal?.paymentMethod === 'COD' ? '💵 COD' : '✓ Online Paid'}
              </span>
            </div>

            {/* OTP Field (FIXED: text input with numeric filtering) */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">OTP (6 digits)</label>
              <input
                type="text"
                inputMode="numeric"
                value={modalOtp}
                onChange={(e) => setModalOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center font-mono"
              />
            </div>

            {/* Cash Collected Field (FIXED: auto-populate with order total on modal open) */}
            {showConfirmModal?.paymentMethod === 'COD' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">💳 Cash Collected (₹)</label>
                <input
                  type="number"
                  value={modalCashCollected || showConfirmModal?.totalPrice || ''}
                  onChange={(e) => setModalCashCollected(e.target.value)}
                  placeholder={String(showConfirmModal?.totalPrice || '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Order total: ₹{showConfirmModal?.totalPrice || 'N/A'}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(null);
                  setModalOtp('');
                  setModalCashCollected('');
                  setError('');
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelivery}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Card Component (FIXED: defensive checks for optional fields)
function OrderCard({ order, onAction, actionLabel, actionColor, loading }) {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-indigo-600">Order #{order?.id || 'N/A'}</h4>
          <p className="text-sm text-gray-700 font-medium">{order?.customerName || 'Customer'}</p>
          <p className="text-sm text-gray-600">{order?.customerPhone || 'N/A'}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">₹{order?.totalPrice || 'N/A'}</p>
        </div>
      </div>

      {/* Address */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <p className="text-sm text-gray-700 flex items-start gap-2">
          <span className="text-indigo-600 mt-0.5">📍</span>
          <span>{order?.deliveryAddress || 'Address not provided'}</span>
        </p>
        {order?.pinCode && (
          <span className="inline-block mt-2 bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded">
            PIN: {order.pinCode}
          </span>
        )}
      </div>

      {/* Payment Badge & COD Amount */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            order?.paymentMethod === 'COD' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}
        >
          {order?.paymentMethod === 'COD' ? '💵 COD' : '✓ Prepaid'}
        </span>
        {order?.paymentMethod === 'COD' && (
          <p className="text-xs font-bold text-red-600">To collect: ₹{order?.totalPrice || 'N/A'}</p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={loading}
        className={`w-full text-white px-4 py-2 rounded-lg font-semibold transition disabled:bg-gray-400 ${actionColor}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

export default function DeliveryApp() {
  const navigate = useNavigate();
  
  // Get delivery token from localStorage
  const deliveryToken = localStorage.getItem('deliveryToken');
  const deliveryName = localStorage.getItem('deliveryName');

  // Redirect if not logged in
  useEffect(() => {
    if (!deliveryToken) {
      navigate('/auth');
    }
  }, [deliveryToken, navigate]);

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [orders, setOrders] = useState([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [modalOtp, setModalOtp] = useState('');
  const [modalCashCollected, setModalCashCollected] = useState('');

  // Fetch orders on mount
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
          headers: { Authorization: `Bearer ${deliveryToken}` },
        });
        setOrders(response.data.orders || []);
        setError('');
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    if (deliveryToken) fetchOrders();
  }, [deliveryToken]);

  // Mark as picked up
  const markPickedUp = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/pickup`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Order ${orderId} marked as picked up`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error marking picked up:', err);
      setError('Failed to mark as picked up');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delivery
  const confirmDelivery = async () => {
    if (!modalOtp || modalOtp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    const order = showConfirmModal;
    if (order.paymentMethod === 'COD' && (!modalCashCollected || parseFloat(modalCashCollected) <= 0)) {
      setError('Please enter valid cash amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        otp: modalOtp,
      };
      if (order.paymentMethod === 'COD') {
        payload.cashCollected = parseFloat(modalCashCollected);
      }

      await axios.post(
        `${API_BASE_URL}/delivery/orders/${order.id}/confirm-delivery`,
        payload,
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );

      setSuccessMessage(`Delivery Confirmed! ${order.paymentMethod === 'COD' ? `Please submit ₹${modalCashCollected} to your warehouse.` : ''}`);
      setShowConfirmModal(null);
      setModalOtp('');
      setModalCashCollected('');

      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError(err.response?.data?.error || 'Failed to confirm delivery');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Submit cash to warehouse
  const submitCashToWarehouse = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/submit-cash`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Cash submitted to warehouse for Order ${orderId}`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error submitting cash:', err);
      setError('Failed to submit cash');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('deliveryToken');
    localStorage.removeItem('deliveryId');
    localStorage.removeItem('deliveryName');
    localStorage.removeItem('deliveryEmail');
    navigate('/auth');
  };

  // Filter orders by status
  const shippedOrders = orders.filter(o => o.trackingStatus === 'SHIPPED');
  const outForDeliveryOrders = orders.filter(o => o.trackingStatus === 'OUT_FOR_DELIVERY');
  const deliveredCodOrders = orders.filter(o => o.trackingStatus === 'DELIVERED' && o.paymentStatus === 'COD_COLLECTED');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛵 Delivery App</h1>
            <p className="text-sm text-gray-600">{deliveryName || 'Delivery Boy'}</p>
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
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl mb-4">⏳</div>
            <p className="font-semibold">Loading orders...</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: My Orders */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">📦 My Orders</h2>

              {/* SHIPPED Orders - Mark Picked Up */}
              {shippedOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-indigo-600">📭 Ready to Pickup ({shippedOrders.length})</h3>
                  <div className="space-y-4">
                    {shippedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => markPickedUp(order.id)}
                        actionLabel="Mark Picked Up"
                        actionColor="bg-indigo-600 hover:bg-indigo-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* OUT_FOR_DELIVERY Orders - Confirm Delivery */}
              {outForDeliveryOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-yellow-600">🚚 Out for Delivery ({outForDeliveryOrders.length})</h3>
                  <div className="space-y-4">
                    {outForDeliveryOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => setShowConfirmModal(order)}
                        actionLabel="Confirm Delivery"
                        actionColor="bg-yellow-600 hover:bg-yellow-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Orders */}
              {shippedOrders.length === 0 && outForDeliveryOrders.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                  <p className="text-2xl mb-2">📭</p>
                  <p>No orders assigned yet</p>
                </div>
              )}
            </section>

            {/* SECTION 3: Submit Cash to Warehouse */}
            {deliveredCodOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">💰 Submit Cash to Warehouse</h2>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="space-y-4">
                    {deliveredCodOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-indigo-600">Order #{order.id}</h4>
                            <p className="text-sm text-gray-600">{order.customerName}</p>
                            <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">₹{order.totalPrice}</p>
                            <p className="text-xs text-gray-600">COD Collected</p>
                          </div>
                        </div>
                        <button
                          onClick={() => submitCashToWarehouse(order.id)}
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                        >
                          💳 Submit Cash
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* SECTION 2: Confirm Delivery Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">Confirm Delivery</h2>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="text-2xl font-bold text-indigo-600">#{showConfirmModal.id}</p>
              <p className="text-sm text-gray-700 mt-2">{showConfirmModal.customerName}</p>
              <p className="text-sm text-gray-700">{showConfirmModal.customerPhone}</p>
              <p className="text-sm text-gray-600 mt-2">{showConfirmModal.deliveryAddress}</p>
              <p className="text-sm text-gray-600">📍 PIN: {showConfirmModal.pinCode}</p>
            </div>

            {/* Payment Badge */}
            <div className="mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  showConfirmModal.paymentMethod === 'COD'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {showConfirmModal.paymentMethod === 'COD' ? '💵 COD' : '✓ Online Paid'}
              </span>
            </div>

            {/* OTP Field (always required) */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">OTP (6 digits)</label>
              <input
                type="number"
                value={modalOtp}
                onChange={(e) => setModalOtp(e.target.value.slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center"
              />
            </div>

            {/* Cash Collected Field (COD only) */}
            {showConfirmModal.paymentMethod === 'COD' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">💳 Cash Collected (₹)</label>
                <input
                  type="number"
                  value={modalCashCollected}
                  onChange={(e) => setModalCashCollected(e.target.value)}
                  placeholder={showConfirmModal.totalPrice}
                  defaultValue={showConfirmModal.totalPrice}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Order total: ₹{showConfirmModal.totalPrice}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(null);
                  setModalOtp('');
                  setModalCashCollected('');
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelivery}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onAction, actionLabel, actionColor, loading }) {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-indigo-600">Order #{order.id}</h4>
          <p className="text-sm text-gray-700 font-medium">{order.customerName}</p>
          <p className="text-sm text-gray-600">{order.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">₹{order.totalPrice}</p>
        </div>
      </div>

      {/* Address */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <p className="text-sm text-gray-700 flex items-start gap-2">
          <span className="text-indigo-600 mt-0.5">📍</span>
          <span>{order.deliveryAddress}</span>
        </p>
        {order.pinCode && (
          <span className="inline-block mt-2 bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded">
            PIN: {order.pinCode}
          </span>
        )}
      </div>

      {/* Payment Badge & COD Amount */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            order.paymentMethod === 'COD' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}
        >
          {order.paymentMethod === 'COD' ? '💵 COD' : '✓ Prepaid'}
        </span>
        {order.paymentMethod === 'COD' && (
          <p className="text-xs font-bold text-red-600">To collect: ₹{order.totalPrice}</p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={loading}
        className={`w-full text-white px-4 py-2 rounded-lg font-semibold transition disabled:bg-gray-400 ${actionColor}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

export default function DeliveryApp() {
  const navigate = useNavigate();
  
  // Get delivery token from localStorage
  const deliveryToken = localStorage.getItem('deliveryToken');
  const deliveryName = localStorage.getItem('deliveryName');

  // Redirect if not logged in
  useEffect(() => {
    if (!deliveryToken) {
      navigate('/auth');
    }
  }, [deliveryToken, navigate]);

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [orders, setOrders] = useState([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [modalOtp, setModalOtp] = useState('');
  const [modalCashCollected, setModalCashCollected] = useState('');

  // Fetch orders on mount
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
          headers: { Authorization: `Bearer ${deliveryToken}` },
        });
        setOrders(response.data.orders || []);
        setError('');
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    if (deliveryToken) fetchOrders();
  }, [deliveryToken]);

  // Mark as picked up
  const markPickedUp = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/pickup`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Order ${orderId} marked as picked up`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error marking picked up:', err);
      setError('Failed to mark as picked up');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delivery
  const confirmDelivery = async () => {
    if (!modalOtp || modalOtp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    const order = showConfirmModal;
    if (order.paymentMethod === 'COD' && (!modalCashCollected || parseFloat(modalCashCollected) <= 0)) {
      setError('Please enter valid cash amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        otp: modalOtp,
      };
      if (order.paymentMethod === 'COD') {
        payload.cashCollected = parseFloat(modalCashCollected);
      }

      await axios.post(
        `${API_BASE_URL}/delivery/orders/${order.id}/confirm-delivery`,
        payload,
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );

      setSuccessMessage(`Delivery Confirmed! ${order.paymentMethod === 'COD' ? `Please submit ₹${modalCashCollected} to your warehouse.` : ''}`);
      setShowConfirmModal(null);
      setModalOtp('');
      setModalCashCollected('');

      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError(err.response?.data?.error || 'Failed to confirm delivery');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Submit cash to warehouse
  const submitCashToWarehouse = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/submit-cash`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Cash submitted to warehouse for Order ${orderId}`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error submitting cash:', err);
      setError('Failed to submit cash');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('deliveryToken');
    localStorage.removeItem('deliveryId');
    localStorage.removeItem('deliveryName');
    localStorage.removeItem('deliveryEmail');
    navigate('/auth');
  };

  // Filter orders by status
  const shippedOrders = orders.filter(o => o.trackingStatus === 'SHIPPED');
  const outForDeliveryOrders = orders.filter(o => o.trackingStatus === 'OUT_FOR_DELIVERY');
  const deliveredCodOrders = orders.filter(o => o.trackingStatus === 'DELIVERED' && o.paymentStatus === 'COD_COLLECTED');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛵 Delivery App</h1>
            <p className="text-sm text-gray-600">{deliveryName || 'Delivery Boy'}</p>
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
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl mb-4">⏳</div>
            <p className="font-semibold">Loading orders...</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: My Orders */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">📦 My Orders</h2>

              {/* SHIPPED Orders - Mark Picked Up */}
              {shippedOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-indigo-600">📭 Ready to Pickup ({shippedOrders.length})</h3>
                  <div className="space-y-4">
                    {shippedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => markPickedUp(order.id)}
                        actionLabel="Mark Picked Up"
                        actionColor="bg-indigo-600 hover:bg-indigo-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* OUT_FOR_DELIVERY Orders - Confirm Delivery */}
              {outForDeliveryOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-yellow-600">🚚 Out for Delivery ({outForDeliveryOrders.length})</h3>
                  <div className="space-y-4">
                    {outForDeliveryOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => setShowConfirmModal(order)}
                        actionLabel="Confirm Delivery"
                        actionColor="bg-yellow-600 hover:bg-yellow-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Orders */}
              {shippedOrders.length === 0 && outForDeliveryOrders.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                  <p className="text-2xl mb-2">📭</p>
                  <p>No orders assigned yet</p>
                </div>
              )}
            </section>

            {/* SECTION 3: Submit Cash to Warehouse */}
            {deliveredCodOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">💰 Submit Cash to Warehouse</h2>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="space-y-4">
                    {deliveredCodOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-indigo-600">Order #{order.id}</h4>
                            <p className="text-sm text-gray-600">{order.customerName}</p>
                            <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">₹{order.totalPrice}</p>
                            <p className="text-xs text-gray-600">COD Collected</p>
                          </div>
                        </div>
                        <button
                          onClick={() => submitCashToWarehouse(order.id)}
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                        >
                          💳 Submit Cash
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* SECTION 2: Confirm Delivery Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">Confirm Delivery</h2>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="text-2xl font-bold text-indigo-600">#{showConfirmModal.id}</p>
              <p className="text-sm text-gray-700 mt-2">{showConfirmModal.customerName}</p>
              <p className="text-sm text-gray-700">{showConfirmModal.customerPhone}</p>
              <p className="text-sm text-gray-600 mt-2">{showConfirmModal.deliveryAddress}</p>
              <p className="text-sm text-gray-600">📍 PIN: {showConfirmModal.pinCode}</p>
            </div>

            {/* Payment Badge */}
            <div className="mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  showConfirmModal.paymentMethod === 'COD'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {showConfirmModal.paymentMethod === 'COD' ? '💵 COD' : '✓ Online Paid'}
              </span>
            </div>

            {/* OTP Field (always required) */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">OTP (6 digits)</label>
              <input
                type="number"
                value={modalOtp}
                onChange={(e) => setModalOtp(e.target.value.slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center"
              />
            </div>

            {/* Cash Collected Field (COD only) */}
            {showConfirmModal.paymentMethod === 'COD' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">💳 Cash Collected (₹)</label>
                <input
                  type="number"
                  value={modalCashCollected}
                  onChange={(e) => setModalCashCollected(e.target.value)}
                  placeholder={showConfirmModal.totalPrice}
                  defaultValue={showConfirmModal.totalPrice}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Order total: ₹{showConfirmModal.totalPrice}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(null);
                  setModalOtp('');
                  setModalCashCollected('');
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelivery}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onAction, actionLabel, actionColor, loading }) {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-indigo-600">Order #{order.id}</h4>
          <p className="text-sm text-gray-700 font-medium">{order.customerName}</p>
          <p className="text-sm text-gray-600">{order.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">₹{order.totalPrice}</p>
        </div>
      </div>

      {/* Address */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <p className="text-sm text-gray-700 flex items-start gap-2">
          <span className="text-indigo-600 mt-0.5">📍</span>
          <span>{order.deliveryAddress}</span>
        </p>
        {order.pinCode && (
          <span className="inline-block mt-2 bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded">
            PIN: {order.pinCode}
          </span>
        )}
      </div>

      {/* Payment Badge & COD Amount */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            order.paymentMethod === 'COD' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}
        >
          {order.paymentMethod === 'COD' ? '💵 COD' : '✓ Prepaid'}
        </span>
        {order.paymentMethod === 'COD' && (
          <p className="text-xs font-bold text-red-600">To collect: ₹{order.totalPrice}</p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={loading}
        className={`w-full text-white px-4 py-2 rounded-lg font-semibold transition disabled:bg-gray-400 ${actionColor}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

export default function DeliveryApp() {
  const navigate = useNavigate();
  
  // Get delivery token from localStorage
  const deliveryToken = localStorage.getItem('deliveryToken');
  const deliveryName = localStorage.getItem('deliveryName');

  // Redirect if not logged in
  useEffect(() => {
    if (!deliveryToken) {
      navigate('/auth');
    }
  }, [deliveryToken, navigate]);

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [orders, setOrders] = useState([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [modalOtp, setModalOtp] = useState('');
  const [modalCashCollected, setModalCashCollected] = useState('');

  // Fetch orders on mount
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
          headers: { Authorization: `Bearer ${deliveryToken}` },
        });
        setOrders(response.data.orders || []);
        setError('');
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    if (deliveryToken) fetchOrders();
  }, [deliveryToken]);

  // Mark as picked up
  const markPickedUp = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/pickup`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Order ${orderId} marked as picked up`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error marking picked up:', err);
      setError('Failed to mark as picked up');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delivery
  const confirmDelivery = async () => {
    if (!modalOtp || modalOtp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    const order = showConfirmModal;
    if (order.paymentMethod === 'COD' && (!modalCashCollected || parseFloat(modalCashCollected) <= 0)) {
      setError('Please enter valid cash amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        otp: modalOtp,
      };
      if (order.paymentMethod === 'COD') {
        payload.cashCollected = parseFloat(modalCashCollected);
      }

      await axios.post(
        `${API_BASE_URL}/delivery/orders/${order.id}/confirm-delivery`,
        payload,
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );

      setSuccessMessage(`Delivery Confirmed! ${order.paymentMethod === 'COD' ? `Please submit ₹${modalCashCollected} to your warehouse.` : ''}`);
      setShowConfirmModal(null);
      setModalOtp('');
      setModalCashCollected('');

      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError(err.response?.data?.error || 'Failed to confirm delivery');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Submit cash to warehouse
  const submitCashToWarehouse = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/submit-cash`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Cash submitted to warehouse for Order ${orderId}`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error submitting cash:', err);
      setError('Failed to submit cash');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('deliveryToken');
    localStorage.removeItem('deliveryId');
    localStorage.removeItem('deliveryName');
    localStorage.removeItem('deliveryEmail');
    navigate('/auth');
  };

  // Filter orders by status
  const shippedOrders = orders.filter(o => o.trackingStatus === 'SHIPPED');
  const outForDeliveryOrders = orders.filter(o => o.trackingStatus === 'OUT_FOR_DELIVERY');
  const deliveredCodOrders = orders.filter(o => o.trackingStatus === 'DELIVERED' && o.paymentStatus === 'COD_COLLECTED');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛵 Delivery App</h1>
            <p className="text-sm text-gray-600">{deliveryName || 'Delivery Boy'}</p>
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
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl mb-4">⏳</div>
            <p className="font-semibold">Loading orders...</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: My Orders */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">📦 My Orders</h2>

              {/* SHIPPED Orders - Mark Picked Up */}
              {shippedOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-indigo-600">📭 Ready to Pickup ({shippedOrders.length})</h3>
                  <div className="space-y-4">
                    {shippedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => markPickedUp(order.id)}
                        actionLabel="Mark Picked Up"
                        actionColor="bg-indigo-600 hover:bg-indigo-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* OUT_FOR_DELIVERY Orders - Confirm Delivery */}
              {outForDeliveryOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-yellow-600">🚚 Out for Delivery ({outForDeliveryOrders.length})</h3>
                  <div className="space-y-4">
                    {outForDeliveryOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => setShowConfirmModal(order)}
                        actionLabel="Confirm Delivery"
                        actionColor="bg-yellow-600 hover:bg-yellow-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Orders */}
              {shippedOrders.length === 0 && outForDeliveryOrders.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                  <p className="text-2xl mb-2">📭</p>
                  <p>No orders assigned yet</p>
                </div>
              )}
            </section>

            {/* SECTION 3: Submit Cash to Warehouse */}
            {deliveredCodOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">💰 Submit Cash to Warehouse</h2>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="space-y-4">
                    {deliveredCodOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-indigo-600">Order #{order.id}</h4>
                            <p className="text-sm text-gray-600">{order.customerName}</p>
                            <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">₹{order.totalPrice}</p>
                            <p className="text-xs text-gray-600">COD Collected</p>
                          </div>
                        </div>
                        <button
                          onClick={() => submitCashToWarehouse(order.id)}
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                        >
                          💳 Submit Cash
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* SECTION 2: Confirm Delivery Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">Confirm Delivery</h2>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="text-2xl font-bold text-indigo-600">#{showConfirmModal.id}</p>
              <p className="text-sm text-gray-700 mt-2">{showConfirmModal.customerName}</p>
              <p className="text-sm text-gray-700">{showConfirmModal.customerPhone}</p>
              <p className="text-sm text-gray-600 mt-2">{showConfirmModal.deliveryAddress}</p>
              <p className="text-sm text-gray-600">📍 PIN: {showConfirmModal.pinCode}</p>
            </div>

            {/* Payment Badge */}
            <div className="mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  showConfirmModal.paymentMethod === 'COD'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {showConfirmModal.paymentMethod === 'COD' ? '💵 COD' : '✓ Online Paid'}
              </span>
            </div>

            {/* OTP Field (always required) */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">OTP (6 digits)</label>
              <input
                type="number"
                value={modalOtp}
                onChange={(e) => setModalOtp(e.target.value.slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center"
              />
            </div>

            {/* Cash Collected Field (COD only) */}
            {showConfirmModal.paymentMethod === 'COD' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">💳 Cash Collected (₹)</label>
                <input
                  type="number"
                  value={modalCashCollected}
                  onChange={(e) => setModalCashCollected(e.target.value)}
                  placeholder={showConfirmModal.totalPrice}
                  defaultValue={showConfirmModal.totalPrice}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Order total: ₹{showConfirmModal.totalPrice}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(null);
                  setModalOtp('');
                  setModalCashCollected('');
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelivery}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onAction, actionLabel, actionColor, loading }) {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-indigo-600">Order #{order.id}</h4>
          <p className="text-sm text-gray-700 font-medium">{order.customerName}</p>
          <p className="text-sm text-gray-600">{order.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">₹{order.totalPrice}</p>
        </div>
      </div>

      {/* Address */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <p className="text-sm text-gray-700 flex items-start gap-2">
          <span className="text-indigo-600 mt-0.5">📍</span>
          <span>{order.deliveryAddress}</span>
        </p>
        {order.pinCode && (
          <span className="inline-block mt-2 bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded">
            PIN: {order.pinCode}
          </span>
        )}
      </div>

      {/* Payment Badge & COD Amount */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            order.paymentMethod === 'COD' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}
        >
          {order.paymentMethod === 'COD' ? '💵 COD' : '✓ Prepaid'}
        </span>
        {order.paymentMethod === 'COD' && (
          <p className="text-xs font-bold text-red-600">To collect: ₹{order.totalPrice}</p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={loading}
        className={`w-full text-white px-4 py-2 rounded-lg font-semibold transition disabled:bg-gray-400 ${actionColor}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/react';

export default function DeliveryApp() {
  const navigate = useNavigate();
  
  // Get delivery token from localStorage
  const deliveryToken = localStorage.getItem('deliveryToken');
  const deliveryName = localStorage.getItem('deliveryName');

  // Redirect if not logged in
  useEffect(() => {
    if (!deliveryToken) {
      navigate('/auth');
    }
  }, [deliveryToken, navigate]);

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [orders, setOrders] = useState([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [modalOtp, setModalOtp] = useState('');
  const [modalCashCollected, setModalCashCollected] = useState('');

  // Fetch orders on mount
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
          headers: { Authorization: `Bearer ${deliveryToken}` },
        });
        setOrders(response.data.orders || []);
        setError('');
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    if (deliveryToken) fetchOrders();
  }, [deliveryToken]);

  // Mark as picked up
  const markPickedUp = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/pickup`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Order ${orderId} marked as picked up`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error marking picked up:', err);
      setError('Failed to mark as picked up');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delivery
  const confirmDelivery = async () => {
    if (!modalOtp || modalOtp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    const order = showConfirmModal;
    if (order.paymentMethod === 'COD' && (!modalCashCollected || parseFloat(modalCashCollected) <= 0)) {
      setError('Please enter valid cash amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        otp: modalOtp,
      };
      if (order.paymentMethod === 'COD') {
        payload.cashCollected = parseFloat(modalCashCollected);
      }

      await axios.post(
        `${API_BASE_URL}/delivery/orders/${order.id}/confirm-delivery`,
        payload,
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );

      setSuccessMessage(`Delivery Confirmed! ${order.paymentMethod === 'COD' ? `Please submit ₹${modalCashCollected} to your warehouse.` : ''}`);
      setShowConfirmModal(null);
      setModalOtp('');
      setModalCashCollected('');

      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError(err.response?.data?.error || 'Failed to confirm delivery');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Submit cash to warehouse
  const submitCashToWarehouse = async (orderId) => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/delivery/orders/${orderId}/submit-cash`,
        {},
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
      setSuccessMessage(`Cash submitted to warehouse for Order ${orderId}`);
      // Refresh orders
      const response = await axios.get(`${API_BASE_URL}/delivery/my-orders`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      setOrders(response.data.orders || []);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error submitting cash:', err);
      setError('Failed to submit cash');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('deliveryToken');
    localStorage.removeItem('deliveryId');
    localStorage.removeItem('deliveryName');
    localStorage.removeItem('deliveryEmail');
    navigate('/auth');
  };

  // Filter orders by status
  const shippedOrders = orders.filter(o => o.trackingStatus === 'SHIPPED');
  const outForDeliveryOrders = orders.filter(o => o.trackingStatus === 'OUT_FOR_DELIVERY');
  const deliveredCodOrders = orders.filter(o => o.trackingStatus === 'DELIVERED' && o.paymentStatus === 'COD_COLLECTED');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-md mx-auto mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛵 Delivery App</h1>
            <p className="text-sm text-gray-600">{deliveryName || 'Delivery Boy'}</p>
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
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg rounded-lg">
            {error}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-md mx-auto mt-4 px-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl mb-4">⏳</div>
            <p className="font-semibold">Loading orders...</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: My Orders */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">📦 My Orders</h2>

              {/* SHIPPED Orders - Mark Picked Up */}
              {shippedOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-indigo-600">📭 Ready to Pickup ({shippedOrders.length})</h3>
                  <div className="space-y-4">
                    {shippedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => markPickedUp(order.id)}
                        actionLabel="Mark Picked Up"
                        actionColor="bg-indigo-600 hover:bg-indigo-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* OUT_FOR_DELIVERY Orders - Confirm Delivery */}
              {outForDeliveryOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="text-lg font-bold mb-4 text-yellow-600">🚚 Out for Delivery ({outForDeliveryOrders.length})</h3>
                  <div className="space-y-4">
                    {outForDeliveryOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAction={() => setShowConfirmModal(order)}
                        actionLabel="Confirm Delivery"
                        actionColor="bg-yellow-600 hover:bg-yellow-700"
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Orders */}
              {shippedOrders.length === 0 && outForDeliveryOrders.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                  <p className="text-2xl mb-2">📭</p>
                  <p>No orders assigned yet</p>
                </div>
              )}
            </section>

            {/* SECTION 3: Submit Cash to Warehouse */}
            {deliveredCodOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">💰 Submit Cash to Warehouse</h2>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="space-y-4">
                    {deliveredCodOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-indigo-600">Order #{order.id}</h4>
                            <p className="text-sm text-gray-600">{order.customerName}</p>
                            <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">₹{order.totalPrice}</p>
                            <p className="text-xs text-gray-600">COD Collected</p>
                          </div>
                        </div>
                        <button
                          onClick={() => submitCashToWarehouse(order.id)}
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                        >
                          💳 Submit Cash
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* SECTION 2: Confirm Delivery Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">Confirm Delivery</h2>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="text-2xl font-bold text-indigo-600">#{showConfirmModal.id}</p>
              <p className="text-sm text-gray-700 mt-2">{showConfirmModal.customerName}</p>
              <p className="text-sm text-gray-700">{showConfirmModal.customerPhone}</p>
              <p className="text-sm text-gray-600 mt-2">{showConfirmModal.deliveryAddress}</p>
              <p className="text-sm text-gray-600">📍 PIN: {showConfirmModal.pinCode}</p>
            </div>

            {/* Payment Badge */}
            <div className="mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  showConfirmModal.paymentMethod === 'COD'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {showConfirmModal.paymentMethod === 'COD' ? '💵 COD' : '✓ Online Paid'}
              </span>
            </div>

            {/* OTP Field (always required) */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">OTP (6 digits)</label>
              <input
                type="number"
                value={modalOtp}
                onChange={(e) => setModalOtp(e.target.value.slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center"
              />
            </div>

            {/* Cash Collected Field (COD only) */}
            {showConfirmModal.paymentMethod === 'COD' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">💳 Cash Collected (₹)</label>
                <input
                  type="number"
                  value={modalCashCollected}
                  onChange={(e) => setModalCashCollected(e.target.value)}
                  placeholder={showConfirmModal.totalPrice}
                  defaultValue={showConfirmModal.totalPrice}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Order total: ₹{showConfirmModal.totalPrice}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(null);
                  setModalOtp('');
                  setModalCashCollected('');
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelivery}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onAction, actionLabel, actionColor, loading }) {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-indigo-600">Order #{order.id}</h4>
          <p className="text-sm text-gray-700 font-medium">{order.customerName}</p>
          <p className="text-sm text-gray-600">{order.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">₹{order.totalPrice}</p>
        </div>
      </div>

      {/* Address */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <p className="text-sm text-gray-700 flex items-start gap-2">
          <span className="text-indigo-600 mt-0.5">📍</span>
          <span>{order.deliveryAddress}</span>
        </p>
        {order.pinCode && (
          <span className="inline-block mt-2 bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded">
            PIN: {order.pinCode}
          </span>
        )}
      </div>

      {/* Payment Badge & COD Amount */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            order.paymentMethod === 'COD' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}
        >
          {order.paymentMethod === 'COD' ? '💵 COD' : '✓ Prepaid'}
        </span>
        {order.paymentMethod === 'COD' && (
          <p className="text-xs font-bold text-red-600">To collect: ₹{order.totalPrice}</p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={loading}
        className={`w-full text-white px-4 py-2 rounded-lg font-semibold transition disabled:bg-gray-400 ${actionColor}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
            <div key={i} className={`dk-animation p-4 rounded-xl border flex items-center gap-3 min-w-72 shadow-lg ${
              a.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <i className={`fas ${a.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`} />
              <span className="text-sm font-medium flex-1">{a.msg}</span>
              <button className="opacity-60 hover:opacity-100" onClick={() => dismissAlert(i)}>×</button>
            </div>
          ))}
        </div>

        {/* Header */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-shopping-cart text-lg" />
            <span>Ekart Delivery</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-100 text-indigo-600 uppercase">
              <i className="fas fa-motorcycle" /> Delivery Partner
            </span>
            <span className="text-sm text-gray-600 font-medium">
              {profile?.name || auth?.email || "Delivery Partner"}
            </span>
            <button 
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition ${
                togglingAvailable
                  ? "bg-gray-100 border-gray-300 text-gray-500 cursor-wait"
                  : isAvailable 
                    ? "bg-green-50 border-green-300 text-green-600 hover:bg-green-100" 
                    : "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
              }`}
              onClick={toggleAvailability}
              disabled={togglingAvailable}
              title={togglingAvailable ? "Updating status..." : isAvailable ? "Click to go Offline" : "Click to go Online"}
            >
              {togglingAvailable
                ? <><i className="fas fa-spinner fa-spin text-xs" /> Updating…</>
                : isAvailable
                  ? <><i className="fas fa-circle text-xs animate-pulse" /> 🟢 Online</>
                  : <><i className="fas fa-circle text-xs" /> ⚫ Offline</>
              }
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-gray-300 rounded-lg hover:bg-red-50 transition"
              onClick={() => { logout(); navigate("/auth", { replace: true }); }}
            >
              <i className="fas fa-sign-out-alt" /> Logout
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-6 pt-24 pb-8 px-6 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <i className="fas fa-spinner fa-spin text-4xl mb-4" />
              <p className="text-lg">Loading…</p>
            </div>
          ) : (
            <>
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome, <span className="text-indigo-600">{profile?.name ? profile.name.split(' ')[0] : (auth?.email ? auth.email.split('@')[0] : "Delivery Partner")}</span>! 👋
                  </h1>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="text-xs text-gray-600 font-bold">DELIVERY ID</div>
                      <div className="text-lg font-bold text-indigo-600">
                        {profile?.deliveryBoyCode || (profile?.id ? `DEL-${profile.id}` : "N/A")}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="text-xs text-gray-600 font-bold">EMAIL</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">{profile?.email || auth?.email || "N/A"}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="text-xs text-gray-600 font-bold">PHONE</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {profile?.mobile
                          ? <a href={`tel:${profile.mobile}`} className="text-indigo-600 hover:underline">+91 {profile.mobile}</a>
                          : <span className="text-gray-400 italic">Not set</span>
                        }
                      </div>
                    </div>
                    <div className={`rounded-lg p-3 border font-bold text-center ${
                      isAvailable 
                        ? "bg-green-50 border-green-300 text-green-700" 
                        : "bg-red-50 border-red-300 text-red-700"
                    }`}>
                      <div className="text-xs text-gray-600 font-bold mb-1">STATUS</div>
                      {isAvailable ? "🟢 ONLINE" : "⚫ OFFLINE"}
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <i className="fas fa-motorcycle text-4xl text-indigo-600" />
                </div>
              </div>

              {/* Warehouse Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4 hover:shadow-md transition">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-warehouse text-xl text-indigo-600" />
                  </div>
                  {profile?.warehouse ? (
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{profile.warehouse.name || "Warehouse"}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <i className="fas fa-map-marker-alt text-xs" />
                        {profile.warehouse.city || "N/A"}, {profile.warehouse.state || "N/A"}
                      </div>
                      <div className="text-xs text-indigo-600 font-bold mt-1">Code: {profile.warehouse.warehouseCode || "N/A"}</div>
                      {profile.assignedPinCodes ? (
                        <div className="text-xs text-gray-700 mt-2 bg-blue-50 p-2 rounded">
                          <strong>📍 PIN Codes:</strong> {profile.assignedPinCodes}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                          <strong>📍 PIN Codes:</strong> <span className="italic">Not assigned yet — contact admin</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="font-semibold text-red-600">⚠️ No Warehouse Assigned</div>
                      <div className="text-sm text-gray-600">Contact admin to get a warehouse assigned.</div>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {pendingTransfer ? (
                    <div className="inline-block bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-xs font-bold p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fas fa-clock" />
                        <strong>Transfer Pending</strong>
                      </div>
                      <div>To: {pendingTransfer.requestedWarehouse?.name || "Unknown"}</div>
                      <div className="text-xs mt-1">Status: {pendingTransfer.status || "Awaiting Review"}</div>
                    </div>
                  ) : (
                    <button 
                      className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-200 transition flex items-center gap-2 whitespace-nowrap"
                      onClick={openTransferModal}
                    >
                      <i className="fas fa-exchange-alt" /> Request Transfer
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">{toPickUp.length}</div>
                  <div className="text-sm text-gray-600">To Pick Up</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">{outNow.length}</div>
                  <div className="text-sm text-gray-600">Out for Delivery</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition">
                  <div className="text-3xl font-bold text-green-600 mb-2">{delivered.length}</div>
                  <div className="text-sm text-gray-600">Delivered</div>
                </div>
              </div>

              {/* ── COD CASH COLLECTION DASHBOARD ── */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <i className="fas fa-money-bill-wave text-amber-600 text-xl" /> 💵 COD Cash Collection
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Track your Cash on Delivery collections</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-amber-700">{fmt(getTodaysCashCollection())}</div>
                    <div className="text-xs text-amber-600 font-semibold">Today's Collection</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-4 border border-amber-200">
                    <div className="text-sm text-gray-600 font-semibold mb-1">📍 Pending Collection</div>
                    <div className="text-2xl font-bold text-red-600">{getCodOrdersForCollection().length}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Pending: {fmt(getCodOrdersForCollection().reduce((s, o) => s + (o.totalPrice || 0) + (o.deliveryCharge || 0), 0))}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="text-sm text-gray-600 font-semibold mb-1">✅ Collected Today</div>
                    <div className="text-2xl font-bold text-green-600">{Object.values(cashCollected).filter(c => c.collected).length}</div>
                    <div className="text-xs text-gray-500 mt-1">Orders from deliveries</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-sm text-gray-600 font-semibold mb-1">💳 Payment Methods</div>
                    <div className="text-2xl font-bold text-blue-600">COD</div>
                    <div className="text-xs text-gray-500 mt-1">100% Cash Collection</div>
                  </div>
                </div>

                {getCodOrdersForCollection().length > 0 && (
                  <div className="mt-4 bg-orange-100 border border-orange-300 rounded-lg p-3 text-sm text-orange-800 flex items-start gap-2">
                    <i className="fas fa-exclamation-circle flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Action Required:</strong> You have <strong>{getCodOrdersForCollection().length} active COD delivery/deliveries</strong> awaiting payment collection.
                    </div>
                  </div>
                )}
              </div>

              {/* 3-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* TO PICK UP */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-box text-indigo-600" /> 📦 Waiting Pickup
                    </h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold">{toPickUp.length}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {toPickUp.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <i className="fas fa-box-open text-4xl mb-3 block opacity-50" />
                        <p className="text-sm font-medium">No orders waiting for pickup</p>
                      </div>
                    ) : toPickUp.map(order => (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-white hover:border-indigo-300 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-indigo-600 text-sm">Order #{order.id}</span>
                          <span className="text-sm font-bold text-green-600">{fmt(order.amount || order.totalPrice)}</span>
                        </div>
                        
                        {/* Payment Mode Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                            order.isCod
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-green-100 text-green-700 border border-green-300'
                          }`}>
                            {order.isCod ? '💵 COD' : '✓ Prepaid'}
                          </span>
                          {order.isCod && (
                            <span className="text-xs font-bold text-red-600">
                              To Collect: ₹{Number((order.totalPrice || 0) + (order.deliveryCharge || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-900 font-medium mb-1">{order.customer?.name || order.customerName}</div>
                        <div className="text-xs text-gray-500 mb-2">{order.customer?.mobile || order.mobile}</div>
                        {order.deliveryPinCode && (
                          <div className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold mb-2">
                            📍 PIN: {order.deliveryPinCode}
                          </div>
                        )}
                        {(order.deliveryAddress || order.address) && (
                          <div className="text-xs text-gray-600 mb-2 flex items-start gap-2">
                            <i className="fas fa-map-marker-alt text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div>
                              {order.deliveryAddress || order.address}
                              {order.landmark && <div className="text-gray-500 italic mt-1">📍 {order.landmark}</div>}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <a className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold hover:bg-indigo-100 transition" href={telHref(order.customer?.mobile || order.mobile)}>
                            <i className="fas fa-phone text-xs" /> Call
                          </a>
                          <a className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 text-green-600 rounded text-xs font-semibold hover:bg-green-100 transition" href={waHref(order.customer?.mobile || order.mobile, order.id)} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-whatsapp text-xs" /> Chat
                          </a>
                          <button className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-bold transition ${
                            pickupPhotos[order.id]
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-yellow-500 text-white hover:bg-yellow-600'
                          }`} onClick={() => pickupPhotos[order.id] ? handlePickupWithPhoto(order.id) : openPhotoModal(order.id, 'pickup')}>
                            <i className={`fas ${pickupPhotos[order.id] ? 'fa-check' : 'fa-camera'} text-xs`} /> {pickupPhotos[order.id] ? 'Picked' : 'Photo'}
                          </button>
                        </div>
                        {pickupPhotos[order.id] && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
                            <i className="fas fa-check-circle" /> Photo captured - Ready to mark picked
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* OUT FOR DELIVERY */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-motorcycle text-yellow-600" /> 🛵 Active
                    </h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-600 text-white rounded-full text-xs font-bold">{outNow.length}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {outNow.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <i className="fas fa-road text-4xl mb-3 block opacity-50" />
                        <p className="text-sm font-medium">No active deliveries</p>
                      </div>
                    ) : outNow.map(order => (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-white hover:border-yellow-300 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-indigo-600 text-sm">Order #{order.id}</span>
                          <span className="text-sm font-bold text-green-600">{fmt(order.amount || order.totalPrice)}</span>
                        </div>
                        
                        {/* Payment Mode Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                            order.isCod
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-green-100 text-green-700 border border-green-300'
                          }`}>
                            {order.isCod ? '💵 COD' : '✓ Prepaid'}
                          </span>
                          {order.isCod && (
                            <span className="text-xs font-bold text-red-600">
                              To Collect: ₹{Number((order.totalPrice || 0) + (order.deliveryCharge || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-900 font-medium mb-1">{order.customer?.name || order.customerName}</div>
                        <div className="text-xs text-gray-500 mb-2">{order.customer?.mobile || order.mobile}</div>
                        {order.deliveryPinCode && (
                          <div className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold mb-2">
                            📍 PIN: {order.deliveryPinCode}
                          </div>
                        )}
                        {(order.deliveryAddress || order.address) && (
                          <div className="text-xs text-gray-600 mb-3 flex items-start gap-2">
                            <i className="fas fa-map-marker-alt text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div>
                              {order.deliveryAddress || order.address}
                              {order.landmark && <div className="text-gray-500 italic mt-1">📍 {order.landmark}</div>}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mb-3">
                          <a className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold hover:bg-indigo-100 transition" href={telHref(order.customer?.mobile || order.mobile)}>
                            <i className="fas fa-phone text-xs" /> Call
                          </a>
                          <a className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 text-green-600 rounded text-xs font-semibold hover:bg-green-100 transition" href={waHref(order.customer?.mobile || order.mobile, order.id)} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-whatsapp text-xs" /> Chat
                          </a>
                        </div>
                        
                        {/* Photo Capture Section */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 mb-2">
                          <label className="text-xs font-bold text-orange-700 flex items-center gap-2 mb-2">
                            <i className="fas fa-camera text-xs" /> 📸 Take Photo Before Delivery
                          </label>
                          <button 
                            className={`w-full py-2 rounded text-xs font-bold transition flex items-center justify-center gap-2 ${
                              deliveryPhotos[order.id]
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200'
                            }`}
                            onClick={() => openPhotoModal(order.id, 'delivery')}
                          >
                            <i className={`fas ${deliveryPhotos[order.id] ? 'fa-check-circle' : 'fa-camera'} text-sm`} /> 
                            {deliveryPhotos[order.id] ? '✓ Photo Captured' : '📸 Capture Photo'}
                          </button>
                          {!deliveryPhotos[order.id] && (
                            <div className="p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-800 mt-2 flex items-start gap-2">
                              <i className="fas fa-exclamation-circle flex-shrink-0 mt-0.5" />
                              <span><strong>MANDATORY:</strong> Photo required before delivery</span>
                            </div>
                          )}
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-green-700 flex items-center gap-2">
                              <i className="fas fa-key text-xs" /> OTP
                            </label>
                            <button
                              className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                              onClick={() => resendOtp(order.id)}
                            >
                              <i className="fas fa-paper-plane text-xs" /> Resend OTP
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              className="flex-1 bg-white border border-green-300 rounded px-2 py-1.5 text-center text-sm font-mono focus:border-green-600 focus:ring-1 focus:ring-green-300 outline-none"
                              placeholder="000000"
                              maxLength={6}
                              min={100000}
                              max={999999}
                              value={otpMap[order.id] || ""}
                              onChange={e => setOtp(order.id, e.target.value)}
                            />
                            <button 
                              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                                deliveryPhotos[order.id]
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-400 text-white cursor-not-allowed'
                              }`}
                              onClick={() => handleDeliveryWithPhoto(order.id)}
                              disabled={!deliveryPhotos[order.id]}
                            >
                              <i className="fas fa-check text-xs" /> Deliver
                            </button>
                          </div>
                        </div>

                        {/* ── COD PAYMENT COLLECTION ── */}
                        {order.isCod && (
                          <div className="mt-2.5 bg-red-50 border-2 border-red-300 rounded-lg p-2.5">
                            {!cashCollected[order.id]?.collected ? (
                              <>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-xs font-bold text-red-700 flex items-center gap-2">
                                    <i className="fas fa-money-bill text-xs" /> 💵 COD Amount Due
                                  </label>
                                  <span className="text-sm font-bold text-red-700">
                                    {fmt((order.totalPrice || 0) + (order.deliveryCharge || 0))}
                                  </span>
                                </div>
                                <button 
                                  className="w-full px-3 py-1.5 rounded text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition flex items-center justify-center gap-2"
                                  onClick={() => setShowCashModal({ 
                                    orderId: order.id, 
                                    amount: (order.totalPrice || 0) + (order.deliveryCharge || 0),
                                    customerName: order.customer?.name || order.customerName
                                  })}
                                >
                                  <i className="fas fa-check-circle text-xs" /> Mark Payment Received
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-700 font-semibold">
                                <i className="fas fa-check-double text-sm" />
                                ✅ Payment {fmt(cashCollected[order.id].amount)} collected at {cashCollected[order.id].timestamp}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* DELIVERED */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-check-circle text-green-600" /> ✅ Completed
                    </h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-xs font-bold">{delivered.length}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {delivered.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <i className="fas fa-clipboard-check text-4xl mb-3 block opacity-50" />
                        <p className="text-sm font-medium">No completed deliveries yet</p>
                      </div>
                    ) : delivered.map(order => (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-75 hover:opacity-100 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-indigo-600 text-sm">Order #{order.id}</span>
                          <span className="text-sm font-bold text-green-600">{fmt(order.amount || order.totalPrice)}</span>
                        </div>
                        <div className="text-sm text-gray-900 font-medium mb-1">{order.customer?.name || order.customerName}</div>
                        <div className="text-xs text-gray-500">
                          {(order.items || []).map((item, i) => (
                            <span key={i}>{item.name} ×{item.quantity}{i < order.items.length - 1 ? ", " : ""}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between text-sm">
          <div className="font-bold text-gray-900">Ekart</div>
          <div className="text-gray-500">© 2026 Ekart. All rights reserved.</div>
        </footer>

        {/* Warehouse Transfer Modal */}
        {transferModal && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setTransferModal(false); }}>
            <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <i className="fas fa-exchange-alt text-indigo-600" /> Request Warehouse Transfer
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Your request will be reviewed by admin. You will be notified by email once approved or rejected.
              </p>
              {profile?.warehouse && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <strong>Current Warehouse:</strong> {profile.warehouse.name} ({profile.warehouse.city})
                </div>
              )}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-900 uppercase mb-2 tracking-wider">Transfer to Warehouse *</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:border-indigo-600 focus:bg-white outline-none transition"
                  value={selectedWh} 
                  onChange={e => setSelectedWh(e.target.value)}
                >
                  <option value="">— Select a warehouse —</option>
                  {warehouseList
                    .filter(w => !profile?.warehouse || w.id !== profile.warehouse.id)
                    .map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} • {w.city}, {w.state} {w.warehouseCode ? `(${w.warehouseCode})` : ""}
                      </option>
                    ))}
                </select>
                {warehouseList.length === 0 && (
                  <div className="text-xs text-red-600 mt-1">No other warehouses available</div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-900 uppercase mb-2 tracking-wider">
                  Reason <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:border-indigo-600 focus:bg-white outline-none transition resize-none"
                  placeholder="e.g. Relocating, closer to new address, traffic reasons..."
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  maxLength={500}
                  rows="3"
                />
                <div className="text-xs text-gray-500 mt-1">{transferReason.length}/500</div>
              </div>
              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                  onClick={() => setTransferModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                    selectedWh && warehouseList.length > 0
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-400 text-white cursor-not-allowed"
                  }`}
                  onClick={submitTransfer}
                  disabled={!selectedWh || warehouseList.length === 0}
                >
                  <i className="fas fa-paper-plane" /> Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* ── PAYMENT RECEIVED MODAL ── */}
        {showCashModal && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowCashModal(null); }}>
            <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <i className="fas fa-money-bill-wave text-2xl text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Confirm Payment Received</h2>
                  <p className="text-sm text-gray-600">Order #{showCashModal.orderId}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="text-xs text-gray-600 font-semibold mb-1">Amount Collected</div>
                <div className="text-3xl font-bold text-green-600">{fmt(showCashModal.amount)}</div>
                <div className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <i className="fas fa-user-circle" /> From: {showCashModal.customerName}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-2">📝 Collection Notes (Optional)</label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:ring-1 focus:ring-green-300 outline-none"
                  placeholder="E.g., Customer paid via Google Pay, exact change, etc."
                  rows="3"
                  value={collectionNotes[showCashModal.orderId] || ""}
                  onChange={(e) => setCollectionNotes(prev => ({
                    ...prev,
                    [showCashModal.orderId]: e.target.value
                  }))}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 mb-4 flex items-start gap-2">
                <i className="fas fa-info-circle flex-shrink-0 mt-0.5" />
                <span>Confirming payment marks this order as cash collected. This can be synced with admin later.</span>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => setShowCashModal(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  onClick={() => markPaymentReceived(showCashModal.orderId, showCashModal.amount)}
                >
                  <i className="fas fa-check-circle" /> Confirm Payment
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Photo inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePhotoCapture(e, 'pickup')}
          style={{ display: 'none' }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePhotoCapture(e, 'delivery')}
          style={{ display: 'none' }}
        />

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className={`p-4 rounded-xl border flex items-center gap-3 min-w-64 shadow-lg dk-animation ${
              toast.success 
                ? "bg-green-50 border-green-200 text-green-700" 
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <i className={`fas ${toast.success ? "fa-check-circle" : "fa-exclamation-circle"}`} />
              <span className="text-sm font-medium">{toast.msg}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}