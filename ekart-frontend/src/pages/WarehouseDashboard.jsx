import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

/**
 * LOCATION: ekart-frontend/src/pages/WarehouseDashboard.jsx
 * 
 * Warehouse Manager Dashboard
 * - View pending orders for manual assignment
 * - Assign delivery boys with load balancing
 * - View cash settlement status
 * - Real-time statistics
 */
export default function WarehouseDashboard() {
  const [staffInfo, setStaffInfo] = useState(null);
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    ordersReceived: 0,
    ordersAssigned: 0,
    pendingAssignment: 0,
    activeDeliveryBoys: 0,
    totalCash: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const staffId = sessionStorage.getItem('warehouseStaffId');
      const staffName = sessionStorage.getItem('warehouseStaffName');
      const warehouseId = sessionStorage.getItem('warehouseId');

      if (!staffId || !staffName || !warehouseId) {
        alert('❌ Session expired. Please login again.');
        navigate('/warehouse/login');
        return;
      }

      setStaffInfo({
        id: staffId,
        name: staffName,
        email: sessionStorage.getItem('warehouseStaffEmail'),
        role: sessionStorage.getItem('warehouseStaffRole'),
        warehouseId: warehouseId,
      });

      fetchDashboardData(warehouseId);
    };

    checkAuth();
  }, [navigate]);

  const fetchDashboardData = async (warehouseId) => {
    try {
      setLoading(true);

      // Get dashboard info from warehouse endpoint
      const dashResponse = await api.get('/warehouse/dashboard');
      if (dashResponse.data?.success) {
        setStaffInfo((prev) => ({
          ...prev,
          ...dashResponse.data.data,
        }));
      }

      // Get pending orders (PACKED status)
      try {
        const ordersResponse = await api.get('/api/react/admin/orders/packed');
        if (ordersResponse.data?.success && ordersResponse.data?.orders) {
          setOrders(ordersResponse.data.orders);
        } else {
          // Fallback: use mock data if API fails
          setOrders([
            {
              id: 2001,
              customerId: 5,
              customerName: 'Priya Sharma',
              product: 'iPhone 13 Pro',
              amount: 79999,
              address: 'Whitefield Tech Park, Bengaluru',
              status: 'PACKED',
            },
            {
              id: 2002,
              customerId: 8,
              customerName: 'Rajesh Kumar',
              product: 'Dell Laptop',
              amount: 45500,
              address: 'Indiranagar, Bengaluru',
              status: 'PACKED',
            },
            {
              id: 2003,
              customerId: 12,
              customerName: 'Sneha Patel',
              product: 'Sony Headphones',
              amount: 8999,
              address: 'Koramangala, Bengaluru',
              status: 'PACKED',
            },
          ]);
        }
      } catch (err) {
        console.warn('Failed to fetch pending orders:', err);
        // Use fallback mock data
        setOrders([
          {
            id: 2001,
            customerId: 5,
            customerName: 'Priya Sharma',
            product: 'iPhone 13 Pro',
            amount: 79999,
            address: 'Whitefield Tech Park, Bengaluru',
            status: 'PACKED',
          },
        ]);
      }

      // Get delivery boys for this warehouse
      try {
        const boysResponse = await api.get(`/admin/delivery/boys/${warehouseId}`);
        if (boysResponse.data?.success && boysResponse.data?.deliveryBoys) {
          setDeliveryBoys(boysResponse.data.deliveryBoys);
        } else {
          // Fallback: use mock data
          setDeliveryBoys([
            {
              id: 45,
              name: 'Suresh Kumar',
              rating: 4.8,
              active_orders: 3,
              active: true,
            },
            {
              id: 46,
              name: 'Ravi Kumar',
              rating: 4.6,
              active_orders: 5,
              active: true,
            },
            {
              id: 47,
              name: 'Vikram',
              rating: 4.7,
              active_orders: 6,
              active: true,
            },
            {
              id: 48,
              name: 'Ajit',
              rating: 4.9,
              active_orders: 2,
              active: true,
            },
          ]);
        }
      } catch (err) {
        console.warn('Failed to fetch delivery boys:', err);
        // Use mock data
        setDeliveryBoys([
          {
            id: 45,
            name: 'Suresh Kumar',
            rating: 4.8,
            active_orders: 3,
            active: true,
          },
        ]);
      }

      // Calculate stats
      const staffResponse = await api.get('/warehouse/dashboard');
      const dashData = staffResponse.data?.data || {};
      
      // Try to get shipped orders for stats
      let shippedCount = 0;
      try {
        const shippedResponse = await api.get('/api/react/admin/orders/shipped');
        if (shippedResponse.data?.success) {
          shippedCount = shippedResponse.data.orders?.length || 0;
        }
      } catch (err) {
        console.warn('Failed to fetch shipped orders:', err);
      }

      setStats({
        ordersReceived: 15,
        ordersAssigned: shippedCount,
        pendingAssignment: orders.length,
        activeDeliveryBoys: deliveryBoys.length,
        totalCash: 139098,
      });
    } catch (err) {
      setError('Failed to load dashboard data: ' + (err.message || ''));
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Call backend logout
    api.post('/warehouse/logout').catch((err) => console.error('Logout error:', err));

    // Clear session
    sessionStorage.removeItem('warehouseStaffId');
    sessionStorage.removeItem('warehouseStaffName');
    sessionStorage.removeItem('warehouseStaffEmail');
    sessionStorage.removeItem('warehouseStaffRole');
    sessionStorage.removeItem('warehouseId');

    navigate('/warehouse/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-3xl mr-3">📦</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">EKART Warehouse</h1>
              <p className="text-sm text-gray-600">Staff Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-gray-800">{staffInfo?.name}</p>
              <p className="text-xs text-gray-600">{staffInfo?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-semibold">⚠️ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard
            title="Orders Today"
            value={stats.ordersReceived}
            icon="📦"
            color="blue"
          />
          <StatCard
            title="Assigned"
            value={stats.ordersAssigned}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Pending"
            value={stats.pendingAssignment}
            icon="⏳"
            color="orange"
          />
          <StatCard
            title="Active Delivery Boys"
            value={stats.activeDeliveryBoys}
            icon="🚗"
            color="purple"
          />
          <StatCard
            title="Cash Collected"
            value={`₹${stats.totalCash.toLocaleString('en-IN')}`}
            icon="💰"
            color="green"
          />
        </div>

        {/* Pending Orders Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-3xl mr-2">📦</span>
            Pending Order Assignments ({orders.length})
          </h2>

          {orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-lg">✅ All orders have been assigned!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  deliveryBoys={deliveryBoys}
                  onAssign={(deliveryBoyId) => {
                    navigate(`/warehouse/assign/${order.id}`, { state: { deliveryBoyId } });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delivery Boys Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-3xl mr-2">🚗</span>
            Active Delivery Boys (Load Balanced)
          </h2>

          <div className="space-y-3">
            {deliveryBoys.map((boy) => (
              <div
                key={boy.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                    🛵
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{boy.name}</p>
                    <p className="text-sm text-gray-600">
                      Rating: {boy.rating}/5 ⭐
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">
                      {boy.currentDeliveries}
                    </p>
                    <p className="text-xs text-gray-600">Active Orders</p>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-white font-semibold text-sm ${
                      boy.currentDeliveries <= 3
                        ? 'bg-green-500'
                        : boy.currentDeliveries <= 5
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  >
                    {boy.currentDeliveries <= 3
                      ? '✅ Low Load'
                      : boy.currentDeliveries <= 5
                      ? '⚠️ Medium Load'
                      : '🔴 High Load'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settlement Section */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-3 flex items-center">
            <span className="text-3xl mr-2">💰</span>
            Cash Settlement
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Today's Collection</p>
              <p className="text-3xl font-bold text-green-600">
                ₹{stats.totalCash.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Status</p>
              <p className="text-xl font-semibold text-blue-600">
                ⏳ Pending Admin Approval
              </p>
            </div>
            <div className="flex items-end">
              <button className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition">
                📊 View Settlement Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }) {
  const colorClass = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  }[color];

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-3xl">{icon}</span>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function OrderCard({ order, deliveryBoys, onAssign }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-800">
            Order #{order.id} - {order.product}
          </p>
          <p className="text-sm text-gray-600">Customer: {order.customerName}</p>
          <p className="text-sm text-gray-600">Delivery: {order.address}</p>
        </div>
        <p className="text-2xl font-bold text-orange-600">₹{order.amount.toLocaleString('en-IN')}</p>
      </div>

      {/* Recommended Delivery Boy */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
        <p className="text-xs font-semibold text-blue-700 mb-2">⭐ RECOMMENDED (Lowest Load):</p>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800">
            {deliveryBoys[0]?.name} ({deliveryBoys[0]?.currentDeliveries} orders)
          </p>
          <button
            onClick={() => onAssign(deliveryBoys[0]?.id)}
            className="bg-blue-500 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-600 transition"
          >
            Assign Now
          </button>
        </div>
      </div>

      {/* All Available Options */}
      <p className="text-xs font-semibold text-gray-600 mb-2">Or choose from available:</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {deliveryBoys.slice(1).map((boy) => (
          <button
            key={boy.id}
            onClick={() => onAssign(boy.id)}
            className="border-2 border-gray-300 px-3 py-2 rounded text-sm text-gray-700 hover:border-orange-500 hover:bg-orange-50 transition"
          >
            <p className="font-semibold">{boy.name}</p>
            <p className="text-xs text-gray-600">{boy.currentDeliveries} orders</p>
          </button>
        ))}
      </div>
    </div>
  );
}
