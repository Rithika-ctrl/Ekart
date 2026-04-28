import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../api';

/**
 * OrderTrackingPage.jsx - Visual timeline tracking with warehouse hops
 * Shows order progress with color-coded stages and payment/COD status
 */
export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState(orderId || '');

  useEffect(() => {
    if (orderId) {
      fetchOrderTracking(orderId);
      const interval = setInterval(() => fetchOrderTracking(orderId), 15000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const fetchOrderTracking = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/customer/orders/${id}/tracking`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      const trackingData = await response.json();
      setOrder(trackingData);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to fetch tracking information');
      console.error('Tracking error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/track/${searchId}`);
      fetchOrderTracking(searchId);
    }
  };

  // Build timeline stages based on tracking status
  const buildTimeline = () => {
    if (!order) return [];

    const trackingStatus = order.status;
    const stages = [
      { name: 'Order Placed', icon: '📦', status: 'ORDER_PLACED' },
      { name: 'Order Packed by Vendor', icon: '📋', status: 'ORDER_PACKED' },
      { name: `Received at ${order.sourceWarehouse || 'Source'} Hub`, icon: '🏢', status: 'RECEIVED_SOURCE' },
      { name: 'In Transit', icon: '🚚', status: 'IN_TRANSIT', subtitle: order.routingPath },
      { name: `Arrived at ${order.destinationWarehouse || 'Destination'} Hub`, icon: '🏢', status: 'RECEIVED_DESTINATION' },
      { name: 'Out for Delivery', icon: '🛵', status: 'OUT_FOR_DELIVERY' },
      { name: 'Delivered', icon: '✅', status: 'DELIVERED' }
    ];

    const TRACKING_STAGE_INDEX = {
      'PROCESSING': 0,
      'PACKED': 1,
      'SHIPPED': 3,
      'OUT_FOR_DELIVERY': 5,
      'DELIVERED': 6
    };

    const currentIndex = TRACKING_STAGE_INDEX[trackingStatus] || 0;

    return stages.map((stage, index) => ({
      ...stage,
      completed: index < currentIndex,
      current: index === currentIndex,
      future: index > currentIndex
    }));
  };

  const timeline = buildTimeline();

  const getStatusBadgeColor = (paymentStatus) => {
    switch(paymentStatus) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'COD_COLLECTED': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'VERIFIED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodBadge = (method) => {
    if (method === 'COD') {
      return 'bg-orange-100 text-orange-800';
    }
    return 'bg-purple-100 text-purple-800';
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 font-semibold">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Search */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              📍 Order Tracking
            </h1>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 text-sm font-semibold"
            >
              ← Back
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="number"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Order ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {order && (
          <>
            {/* Order Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm font-semibold">Order ID</p>
                <p className="text-2xl font-bold text-gray-900">#{order.orderId}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm font-semibold">Payment Method</p>
                <p className={`px-3 py-1 rounded-full inline-block text-xs font-bold mt-2 ${getPaymentMethodBadge(order.paymentMethod)}`}>
                  {order.paymentMethod === 'COD' && '💵 COD'}
                  {order.paymentMethod === 'RAZORPAY' && '💳 Card'}
                  {!['COD', 'RAZORPAY'].includes(order.paymentMethod) && order.paymentMethod}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm font-semibold">Payment Status</p>
                <p className={`px-3 py-1 rounded-full inline-block text-xs font-bold mt-2 ${getStatusBadgeColor(order.paymentStatus)}`}>
                  {order.paymentStatus === 'PENDING' && '⏳ Pending'}
                  {order.paymentStatus === 'COD_COLLECTED' && '✓ Collected'}
                  {order.paymentStatus === 'PAID' && '✓ Paid'}
                  {order.paymentStatus === 'VERIFIED' && '✓ Verified'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm font-semibold">Amount</p>
                <p className="text-2xl font-bold text-green-600 mt-2">₹{order.totalPrice?.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Delivery Address */}
            {order.deliveryAddress && (
              <div className="bg-white rounded-lg shadow p-4 mb-8">
                <p className="text-gray-600 text-sm font-semibold mb-2">📍 Delivery Address</p>
                <p className="text-gray-900 font-semibold text-lg">{order.deliveryAddress}</p>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Order Progress</h2>
              
              <div className="relative">
                {timeline.map((stage, index) => (
                  <div key={index} className="mb-8 flex items-start">
                    {/* Timeline Line */}
                    {index < timeline.length - 1 && (
                      <div className="absolute left-6 top-16 w-1 h-12 bg-gray-200"></div>
                    )}

                    {/* Timeline Dot */}
                    <div className="flex flex-col items-center mr-6 relative z-10">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-2 ${
                          stage.completed
                            ? 'bg-green-100 border-green-500 text-green-600'
                            : stage.current
                            ? 'bg-blue-100 border-blue-500 text-blue-600 animate-pulse'
                            : 'bg-gray-100 border-gray-300 text-gray-600'
                        }`}
                      >
                        {stage.icon}
                      </div>
                    </div>

                    {/* Timeline Content */}
                    <div className="pt-2 pb-4">
                      <p className={`text-lg font-bold ${
                        stage.completed ? 'text-green-600' :
                        stage.current ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {stage.name}
                      </p>
                      {stage.subtitle && (
                        <p className="text-sm text-gray-600 mt-1">
                          Route: {stage.subtitle}
                        </p>
                      )}
                      {stage.completed && (
                        <p className="text-xs text-green-600 mt-1">✓ Completed</p>
                      )}
                      {stage.current && (
                        <p className="text-xs text-blue-600 font-semibold mt-1">→ Currently here</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Status */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-2">📦 Current Status</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {order.statusDisplay || order.status}
                </p>
                <p className="text-blue-700 text-sm mt-2">
                  Progress: {order.progressPercent}% complete
                </p>
              </div>

              {/* Estimated Delivery */}
              {order.estimatedDelivery && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
                  <h3 className="text-lg font-bold text-green-900 mb-2">📅 Estimated Delivery</h3>
                  <p className="text-lg font-semibold text-green-600">
                    {new Date(order.estimatedDelivery).toLocaleDateString()}
                  </p>
                  <p className="text-green-700 text-sm mt-2">Expected within 2-3 business days</p>
                </div>
              )}

              {/* COD Instructions */}
              {order.paymentMethod === 'COD' && (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6 border border-orange-200 md:col-span-2">
                  <h3 className="text-lg font-bold text-orange-900 mb-3">💰 Cash on Delivery Instructions</h3>
                  <ul className="text-orange-700 text-sm space-y-2">
                    <li>✓ Please keep exact cash ready</li>
                    <li>✓ Amount Due: ₹{order.totalPrice?.toLocaleString('en-IN')}</li>
                    <li>✓ Ask for invoice from delivery agent</li>
                    <li>✓ Inspect package before payment</li>
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
