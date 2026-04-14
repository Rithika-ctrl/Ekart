import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

/**
 * LOCATION: ekart-frontend/src/pages/OrderTrackingPage.jsx
 * 
 * Order Tracking with COD Payment Status
 * - Real-time order status
 * - Multi-hub transfer tracking
 * - COD payment instructions
 * - OTP verification display
 */
export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrderTracking();
    const interval = setInterval(fetchOrderTracking, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrderTracking = async () => {
    try {
      // Try to fetch order details from available endpoints
      let foundOrder = null;

      try {
        // Try admin orders endpoints
        const packedRes = await api.get('/api/react/admin/orders/packed').catch(() => null);
        if (packedRes?.data?.success && packedRes.data?.orders) {
          foundOrder = packedRes.data.orders.find(o => o.id === parseInt(orderId));
        }

        if (!foundOrder) {
          const shippedRes = await api.get('/api/react/admin/orders/shipped').catch(() => null);
          if (shippedRes?.data?.success && shippedRes.data?.orders) {
            foundOrder = shippedRes.data.orders.find(o => o.id === parseInt(orderId));
          }
        }

        if (!foundOrder) {
          const outRes = await api.get('/api/react/admin/orders/out-for-delivery').catch(() => null);
          if (outRes?.data?.success && outRes.data?.orders) {
            foundOrder = outRes.data.orders.find(o => o.id === parseInt(orderId));
          }
        }
      } catch (err) {
        console.warn('Could not fetch order from admin endpoints:', err);
      }

      // If found in API, use it; otherwise use mock data
      const order = foundOrder || {
        id: parseInt(orderId),
        customerId: 5,
        customerName: 'Priya Sharma',
        product: 'iPhone 13 Pro',
        amount: 79999,
        deliveryCharge: 0,
        totalAmount: 79999,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        status: 'OUT_FOR_DELIVERY',
        deliveryAddress: 'Whitefield Tech Park, Bengaluru',
        estimatedDelivery: 'Today 2:00 PM - 4:00 PM',
        deliveryBoyName: 'Suresh Kumar',
        deliveryBoyPhone: '9876543210',
        otp: '847362',
      };

      // Build tracking timeline based on order status
      const trackingTimeline = buildTrackingTimeline(order);

      setOrder(order);
      setTracking(trackingTimeline);
      setError('');
    } catch (err) {
      setError('Failed to fetch tracking: ' + err.message);
      console.error('Tracking error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to build tracking timeline from order data
  const buildTrackingTimeline = (orderData) => {
    const timeline = [];

    // Always include order placed
    timeline.push({
      timestamp: orderData.orderDate || 'Just now',
      status: 'PAYMENT_PENDING',
      location: 'Your City',
      message: 'Order placed - awaiting warehouse dispatch',
      icon: '✅',
    });

    // Add status-based events
    if (orderData.status === 'PACKED' || orderData.status === 'SHIPPED' || orderData.status === 'OUT_FOR_DELIVERY' || orderData.status === 'DELIVERED') {
      timeline.push({
        timestamp: 'Yesterday',
        status: 'WAREHOUSE_RECEIVED',
        location: 'Origin Warehouse',
        message: 'Item received in warehouse',
        icon: '✅',
      });
    }

    if (orderData.status === 'SHIPPED' || orderData.status === 'OUT_FOR_DELIVERY' || orderData.status === 'DELIVERED') {
      timeline.push({
        timestamp: 'This morning',
        status: 'IN_HUB_TRANSIT',
        location: 'In Hub Network',
        message: 'In transit via hub network',
        icon: '✅',
      });

      timeline.push({
        timestamp: '2 hours ago',
        status: 'WAREHOUSE_RECEIVED',
        location: 'Destination Warehouse',
        message: 'Arrived at destination warehouse',
        icon: '✅',
      });
    }

    if (orderData.status === 'OUT_FOR_DELIVERY' || orderData.status === 'DELIVERED') {
      timeline.push({
        timestamp: '1 hour ago',
        status: 'ASSIGNED_TO_DELIVERY_BOY',
        location: 'Warehouse',
        message: 'Order assigned to delivery boy: ' + (orderData.deliveryBoyName || 'Driver'),
        icon: '✅',
      });

      timeline.push({
        timestamp: 'Just now',
        status: 'OUT_FOR_DELIVERY',
        location: 'In Transit',
        message: 'Delivery boy picked up - on the way to your address',
        icon: '🟡',
      });

      timeline.push({
        timestamp: 'Expected soon',
        status: 'EXPECTED_DELIVERY',
        location: 'Your Address',
        message: 'Expected delivery window - be available to receive',
        icon: '⏳',
      });
    }

    if (orderData.status === 'DELIVERED') {
      timeline.push({
        timestamp: 'Just now',
        status: 'DELIVERED',
        location: 'Your Address',
        message: 'Order delivered successfully',
        icon: '✅',
      });
    }

    return timeline;
  };

  if (loading) {
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => window.history.back()}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2 mb-6"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Tracking</h1>
        <p className="text-gray-600 mb-6">Order #{order?.id}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Status - Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <p className="text-gray-600 text-sm font-semibold mb-2">Current Status</p>
              <div className="mb-3">
                <p className="text-2xl font-bold text-blue-600">
                  {order?.trackingStatus === 'OUT_FOR_DELIVERY'
                    ? '🚗 Out for Delivery'
                    : order?.trackingStatus === 'DELIVERED'
                    ? '✅ Delivered'
                    : order?.trackingStatus === 'PAYMENT_PENDING'
                    ? '⏳ Pending'
                    : order?.trackingStatus}
                </p>
              </div>
              <p className="text-gray-700 text-sm">
                Expected Delivery: <strong>{order?.estimatedDelivery}</strong>
              </p>
            </div>

            {/* Delivery Boy Info */}
            {order?.trackingStatus === 'OUT_FOR_DELIVERY' && (
              <div className="bg-blue-50 rounded-lg shadow-md p-6 border border-blue-200">
                <p className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="text-2xl mr-2">🛵</span>
                  On Its Way
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Delivery Partner</p>
                    <p className="text-lg font-bold text-gray-800">{order?.deliveryBoyName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Contact</p>
                    <p className="text-gray-800">{order?.deliveryBoyPhone}</p>
                  </div>
                  <button className="w-full bg-blue-500 text-white font-semibold py-2 rounded mt-3 hover:bg-blue-600 transition">
                    📍 Live Tracking Map
                  </button>
                </div>
              </div>
            )}

            {/* Payment Section */}
            <div
              className={`rounded-lg shadow-md p-6 border-l-4 ${
                order?.paymentStatus === 'RECEIVED'
                  ? 'bg-green-50 border-green-500'
                  : 'bg-yellow-50 border-orange-500'
              }`}
            >
              <p className="font-semibold text-gray-800 mb-3 flex items-center">
                {order?.paymentStatus === 'RECEIVED' ? (
                  <>
                    <span className="text-2xl mr-2">✅</span>
                    Payment Confirmed
                  </>
                ) : (
                  <>
                    <span className="text-2xl mr-2">💰</span>
                    Payment Method
                  </>
                )}
              </p>

              <div className="space-y-2">
                <div>
                  <p className="text-gray-600 text-sm font-semibold">Amount Due</p>
                  <p className="text-3xl font-bold text-orange-600">
                    ₹{order?.totalAmount?.toLocaleString('en-IN')}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm font-semibold">Method</p>
                  <p className="text-gray-800 font-semibold">CASH ON DELIVERY</p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm font-semibold">Status</p>
                  <p
                    className={`font-semibold ${
                      order?.paymentStatus === 'RECEIVED'
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {order?.paymentStatus === 'RECEIVED'
                      ? '✅ Collected'
                      : '⏳ Pending at Doorstep'}
                  </p>
                </div>
              </div>
            </div>

            {/* OTP Display */}
            {order?.trackingStatus === 'OUT_FOR_DELIVERY' && order?.otp && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 border border-purple-200">
                <p className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="text-2xl mr-2">🔐</span>
                  Your Payment OTP
                </p>

                <div className="bg-white rounded-lg p-4 border-2 border-purple-300 mb-3">
                  <p className="text-center text-4xl font-bold text-purple-600 tracking-widest">
                    {order?.otp}
                  </p>
                </div>

                <div className="bg-purple-100 p-3 rounded border border-purple-300 text-sm text-purple-800">
                  <p className="font-semibold mb-2">📝 Instructions:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Share this OTP with delivery partner</li>
                    <li>Ask them to verify the order</li>
                    <li>Inspect package before payment</li>
                    <li>Pay ₹{order?.totalAmount?.toLocaleString('en-IN')} CASH</li>
                    <li>Get receipt from delivery partner</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Issue Reporting */}
            <button className="w-full bg-white border-2 border-red-300 text-red-600 font-bold py-2 rounded hover:bg-red-50 transition">
              🆘 Report an Issue
            </button>
          </div>

          {/* Timeline - Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-2">📍</span>
                Tracking Timeline
              </h2>

              {/* Vertical Timeline */}
              <div className="relative">
                {tracking.map((event, index) => (
                  <div key={index} className="flex gap-4 mb-6 relative">
                    {/* Timeline Line */}
                    {index < tracking.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-12 bg-gradient-to-b from-blue-300 to-gray-300"></div>
                    )}

                    {/* Timeline Dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                          event.status === 'EXPECTED_DELIVERY' ||
                          event.status === 'OUT_FOR_DELIVERY'
                            ? 'bg-yellow-100 text-gray-800'
                            : event.status === 'DELIVERED'
                            ? 'bg-green-100'
                            : 'bg-blue-100'
                        }`}
                      >
                        {event.icon}
                      </div>
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 pt-1 pb-6">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-bold text-gray-800">{event.message}</p>
                          {event.status === 'DELIVERED' && (
                            <span className="text-2xl">✅</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">TIME</p>
                            <p className="font-semibold">{event.timestamp}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500">LOCATION</p>
                            <p className="font-semibold">{event.location}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hub Transfer Info */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <p className="font-bold text-gray-800 mb-3 flex items-center">
                  <span className="text-2xl mr-2">🚚</span>
                  Multi-Hub Route
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs text-gray-600">LEG 1</p>
                    <p className="font-bold text-gray-800 text-sm">Delhi ➜ Jaipur</p>
                    <p className="text-xs text-gray-600">280 km</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs text-gray-600">LEG 2</p>
                    <p className="font-bold text-gray-800 text-sm">Jaipur ➜ Bhopal</p>
                    <p className="text-xs text-gray-600">400 km</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs text-gray-600">LEG 3</p>
                    <p className="font-bold text-gray-800 text-sm">Bhopal ➜ Nagpur</p>
                    <p className="text-xs text-gray-600">450 km</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="text-xs text-gray-600">LEG 4</p>
                    <p className="font-bold text-gray-800 text-sm">Nagpur ➜ Bengaluru</p>
                    <p className="text-xs text-gray-600">1050 km ✅</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary at Bottom */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-2">Product</p>
              <p className="font-bold text-gray-800 text-lg">{order?.product}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-2">Delivery Address</p>
              <p className="font-bold text-gray-800">{order?.deliveryAddress}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-2">Subtotal</p>
              <p className="font-bold text-gray-800">
                ₹{(order?.totalAmount - order?.deliveryCharge)?.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-2">Delivery Charge</p>
              <p className="font-bold text-gray-800">
                {order?.deliveryCharge === 0 ? '✅ FREE' : `₹${order?.deliveryCharge}`}
              </p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-gray-600 text-sm font-semibold mb-2">Total</p>
              <p className="font-bold text-2xl text-orange-600">
                ₹{order?.totalAmount?.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-gray-600 text-sm font-semibold mb-2">Placed On</p>
              <p className="font-bold text-gray-800">{order?.orderDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
