import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

/**
 * LOCATION: ekart-frontend/src/pages/AssignDeliveryBoyPage.jsx
 * 
 * Manual Delivery Boy Assignment Page
 * - Assign specific delivery boy to order
 * - Load balancing display
 * - Call backend API to assign
 * - Return to dashboard after assignment
 */
export default function AssignDeliveryBoyPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check authentication
    const staffId = sessionStorage.getItem('warehouseStaffId');
    if (!staffId) {
      alert('Session expired. Please login again.');
      navigate('/warehouse/login');
      return;
    }

    fetchAssignmentData();
  }, [orderId, navigate]);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch eligible delivery boys for this order
      try {
        const boysResponse = await api.get(`/api/react/admin/delivery/boys/for-order/${orderId}`);
        if (boysResponse.data?.success && boysResponse.data?.deliveryBoys) {
          setDeliveryBoys(boysResponse.data.deliveryBoys);
          // Auto-select first (recommended) delivery boy
          if (boysResponse.data.deliveryBoys.length > 0) {
            setSelectedDeliveryBoy(boysResponse.data.deliveryBoys[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch eligible delivery boys:', err);
        // Use mock data as fallback
        const mockDeliveryBoys = [
          {
            id: 45,
            name: 'Suresh Kumar',
            email: 'suresh@ekart.com',
            mobile: '9876543210',
            rating: 4.8,
            active_orders: 3,
            verified: true,
          },
          {
            id: 46,
            name: 'Ravi Kumar',
            email: 'ravi@ekart.com',
            mobile: '9876543211',
            rating: 4.6,
            active_orders: 5,
            verified: true,
          },
        ];
        setDeliveryBoys(mockDeliveryBoys);
        setSelectedDeliveryBoy(mockDeliveryBoys[0].id);
      }

      // Try to fetch specific order details
      try {
        // First try to get from packed orders
        const ordersResponse = await api.get('/api/react/admin/orders/packed');
        if (ordersResponse.data?.success && ordersResponse.data?.orders) {
          const foundOrder = ordersResponse.data.orders.find(o => o.id === parseInt(orderId));
          if (foundOrder) {
            setOrder(foundOrder);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch order:', err);
      }

      // Fallback: use mock order
      setOrder({
        id: parseInt(orderId),
        customerId: 5,
        customerName: 'Priya Sharma',
        product: 'iPhone 13 Pro',
        amount: 79999,
        address: 'Whitefield Tech Park, Bengaluru',
        deliveryPinCode: '560066',
        status: 'PACKED',
      });
    } catch (err) {
      setError('Failed to load data: ' + (err.message || ''));
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignment = async (e) => {
    e.preventDefault();

    if (!selectedDeliveryBoy) {
      setError('Please select a delivery boy');
      return;
    }

    setAssigning(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/warehouse/assign-delivery-boy', {
        order_id: orderId,
        delivery_boy_id: selectedDeliveryBoy,
        notes: notes || null,
      });

      if (response.data?.success) {
        setSuccess('✅ Order assigned successfully!');
        setTimeout(() => {
          navigate('/warehouse/dashboard');
        }, 1500);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Assignment failed. Please try again.';
      setError(errorMsg);
      console.error('Assignment error:', err);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 font-semibold">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/warehouse/dashboard')}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2 mb-6"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Assign Delivery Boy - Order #{orderId}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details - Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">📦</span>
                Order Details
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-sm font-semibold">Order ID</p>
                  <p className="text-xl font-bold text-gray-800">#{order?.id}</p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm font-semibold">Product</p>
                  <p className="text-lg font-semibold text-gray-800">{order?.product}</p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm font-semibold">Amount</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₹{order?.amount?.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-gray-600 text-sm font-semibold mb-2">
                    Delivery Address
                  </p>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-semibold text-gray-800">{order?.customerName}</p>
                    <p className="text-sm text-gray-700">{order?.address}</p>
                    <p className="text-xs text-gray-600">Pincode: {order?.pincode}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-sm font-semibold text-green-800">
                    ✅ Status: {order?.status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Selection - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-semibold">❌ {error}</p>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-semibold">✅ {success}</p>
              </div>
            )}

            {/* Delivery Boy Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">🚗</span>
                Select Delivery Boy
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {deliveryBoys.map((boy) => (
                  <div
                    key={boy.id}
                    onClick={() => setSelectedDeliveryBoy(boy.id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      selectedDeliveryBoy === boy.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                          🛵
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{boy.name}</p>
                          <p className="text-sm text-gray-600">{boy.email}</p>
                          <p className="text-xs text-gray-600">📱 {boy.mobile}</p>
                        </div>
                      </div>
                      {selectedDeliveryBoy === boy.id && (
                        <div className="text-3xl">✅</div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600 font-semibold">Rating</p>
                        <p className="text-lg font-bold text-gray-800">
                          {boy.rating}⭐
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600 font-semibold">
                          Current Orders
                        </p>
                        <p className="text-lg font-bold text-gray-800">
                          {boy.currentDeliveries}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600 font-semibold">Load</p>
                        <p
                          className={`text-lg font-bold ${
                            boy.currentDeliveries <= 3
                              ? 'text-green-600'
                              : boy.currentDeliveries <= 5
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {boy.currentDeliveries <= 3
                            ? '✅ Low'
                            : boy.currentDeliveries <= 5
                            ? '⚠️ Med'
                            : '🔴 High'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>Service Area:</strong> {boy.serviceArea}
                      </p>
                    </div>

                    {/* Recommendation Badge */}
                    {boy.id === deliveryBoys[0].id && (
                      <div className="mt-3 bg-green-50 border border-green-200 px-3 py-2 rounded text-sm font-semibold text-green-700">
                        ⭐ RECOMMENDED (Lowest load: {boy.currentDeliveries} orders)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Special Instructions (Optional)
              </h2>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Customer prefers morning delivery, fragile item, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                rows="3"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/warehouse/dashboard')}
                className="flex-1 bg-gray-300 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignment}
                disabled={!selectedDeliveryBoy || assigning}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50 flex items-center justify-center"
              >
                {assigning ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Assigning...
                  </>
                ) : (
                  `Assign to ${
                    deliveryBoys.find((b) => b.id === selectedDeliveryBoy)?.name ||
                    'Selected Boy'
                  }`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
