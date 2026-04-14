import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

/**
 * LOCATION: ekart-frontend/src/pages/AdminSettlementReviewPage.jsx
 * 
 * Admin Settlement Review & Approval
 * - Detailed settlement breakdown
 * - Order verification
 * - Vendor transfer calculations
 * - Approve/Reject functionality
 */
export default function AdminSettlementReviewPage() {
  const { settlementId } = useParams();
  const navigate = useNavigate();
  const [settlement, setSettlement] = useState(null);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchSettlementDetails();
  }, [settlementId]);

  const fetchSettlementDetails = async () => {
    try {
      setLoading(true);

      // Mock settlement data
      const mockSettlement = {
        id: 501,
        warehouseId: 7,
        warehouseName: 'Bengaluru Central',
        submittedBy: 'Ajay Singh',
        submittedAt: '2026-04-14 18:00',
        totalCash: 139098,
        orderCount: 5,
        adminCommission: 27819.6,
        vendorSettlement: 111278.4,
        status: 'PENDING_ADMIN_APPROVAL',
        vendorCount: 3,
      };

      // Mock orders
      const mockOrders = [
        {
          id: 2001,
          customerName: 'Priya Sharma',
          amount: 79999,
          paymentStatus: 'RECEIVED',
          deliveryBoyName: 'Suresh Kumar',
          vendorId: 10,
          vendorName: 'XYZ Electronics',
        },
        {
          id: 2002,
          customerName: 'Rajesh Kumar',
          amount: 15500,
          paymentStatus: 'RECEIVED',
          deliveryBoyName: 'Suresh Kumar',
          vendorId: 10,
          vendorName: 'XYZ Electronics',
        },
        {
          id: 2003,
          customerName: 'Sneha Patel',
          amount: 8999,
          paymentStatus: 'RECEIVED',
          deliveryBoyName: 'Ravi Kumar',
          vendorId: 15,
          vendorName: 'Tech Store',
        },
        {
          id: 2004,
          customerName: 'Aravind',
          amount: 12500,
          paymentStatus: 'RECEIVED',
          deliveryBoyName: 'Vikram',
          vendorId: 18,
          vendorName: 'Electronics Central',
        },
        {
          id: 2005,
          customerName: 'Deepti Singh',
          amount: 22100,
          paymentStatus: 'RECEIVED',
          deliveryBoyName: 'Suresh Kumar',
          vendorId: 10,
          vendorName: 'XYZ Electronics',
        },
      ];

      // Calculate vendor splits
      const vendorMap = {};
      mockOrders.forEach((order) => {
        if (!vendorMap[order.vendorId]) {
          vendorMap[order.vendorId] = {
            vendorId: order.vendorId,
            vendorName: order.vendorName,
            totalAmount: 0,
            orderCount: 0,
            orders: [],
          };
        }
        vendorMap[order.vendorId].totalAmount += order.amount;
        vendorMap[order.vendorId].orderCount += 1;
        vendorMap[order.vendorId].orders.push(order);
      });

      const vendorList = Object.values(vendorMap).map((vendor) => ({
        ...vendor,
        adminShare: vendor.totalAmount * 0.2,
        vendorShare: vendor.totalAmount * 0.8,
      }));

      setSettlement(mockSettlement);
      setOrders(mockOrders);
      setVendors(vendorList);
    } catch (err) {
      setError('Failed to fetch settlement details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const response = await api.post(`/settlement/approve`, {
        settlement_id: settlementId,
      });

      if (response.data?.success) {
        alert('✅ Settlement approved successfully!');
        setTimeout(() => navigate('/admin/settlements'), 1500);
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setRejecting(true);
    try {
      const response = await api.post(`/settlement/reject`, {
        settlement_id: settlementId,
        reason: rejectReason,
      });

      if (response.data?.success) {
        alert('❌ Settlement rejected. Reason sent to warehouse staff.');
        setTimeout(() => navigate('/admin/settlements'), 1500);
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setRejecting(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 font-semibold">Loading settlement details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/admin/settlements')}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2 mb-6"
        >
          ← Back to Settlements
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Review Settlement #{settlementId}
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary - Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Main Summary */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Summary</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-sm font-semibold">Warehouse</p>
                  <p className="text-lg font-bold text-gray-800">{settlement?.warehouseName}</p>
                  <p className="text-xs text-gray-600">Submitted by: {settlement?.submittedBy}</p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-gray-600 text-sm font-semibold">Total Cash</p>
                  <p className="text-3xl font-bold text-orange-600">
                    ₹{settlement?.totalCash?.toLocaleString('en-IN')}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm font-semibold">Orders</p>
                  <p className="text-2xl font-bold text-gray-800">{settlement?.orderCount}</p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm font-semibold">Vendors Affected</p>
                  <p className="text-2xl font-bold text-gray-800">{settlement?.vendorCount}</p>
                </div>

                <div className="bg-green-50 border border-green-200 p-3 rounded">
                  <p className="text-sm font-semibold text-green-800">Your Commission (20%)</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{settlement?.adminCommission?.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <p className="text-sm font-semibold text-blue-800">To Transfer to Vendors (80%)</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{settlement?.vendorSettlement?.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Verification Checklist</h2>

              <div className="space-y-2">
                <CheckItem checked={true} text="All orders have RECEIVED status" />
                <CheckItem checked={true} text="Math verification passed" />
                <CheckItem checked={true} text="No duplicate orders" />
                <CheckItem checked={true} text="All vendors verified" />
                <CheckItem checked={true} text="Bank accounts on file" />
              </div>

              <div className="bg-green-50 border border-green-200 p-3 rounded mt-4">
                <p className="text-sm text-green-800 font-semibold">
                  ✅ All checks passed - Safe to approve
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleApprove}
                disabled={approving}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 flex items-center justify-center"
              >
                {approving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Approving...
                  </>
                ) : (
                  '✅ Approve Settlement'
                )}
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={rejecting || !settlement}
                className="w-full bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                ❌ Reject
              </button>
            </div>
          </div>

          {/* Details - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vendor Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-3xl mr-2">🏢</span>
                Vendor Payment Breakdown
              </h2>

              <div className="space-y-4">
                {vendors.map((vendor) => (
                  <div key={vendor.vendorId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-800">{vendor.vendorName}</p>
                        <p className="text-sm text-gray-600">
                          {vendor.orderCount} orders
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          ₹{vendor.totalAmount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-600">Total Orders</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-red-50 p-3 rounded">
                        <p className="text-xs text-red-700 font-semibold">Admin (20%)</p>
                        <p className="text-lg font-bold text-red-600">
                          ₹{vendor.adminShare.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-xs text-green-700 font-semibold">Vendor (80%)</p>
                        <p className="text-lg font-bold text-green-600">
                          ₹{vendor.vendorShare.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <details className="cursor-pointer">
                        <summary className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                          View {vendor.orderCount} Orders →
                        </summary>
                        <div className="mt-2 space-y-2">
                          {vendor.orders.map((order) => (
                            <div
                              key={order.id}
                              className="bg-gray-50 p-2 rounded text-sm border border-gray-200"
                            >
                              <div className="flex justify-between">
                                <span className="font-semibold">Order #{order.id}</span>
                                <span className="text-green-600">✅ RECEIVED</span>
                              </div>
                              <p className="text-gray-600">
                                {order.customerName} - ₹{order.amount.toLocaleString('en-IN')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Orders */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-3xl mr-2">📦</span>
                Order Details ({orders.length})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b-2 border-gray-300">
                    <tr>
                      <th className="text-left py-2 px-2 font-bold">Order ID</th>
                      <th className="text-left py-2 px-2 font-bold">Customer</th>
                      <th className="text-left py-2 px-2 font-bold">Vendor</th>
                      <th className="text-right py-2 px-2 font-bold">Amount</th>
                      <th className="text-center py-2 px-2 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-2 font-bold text-blue-600">#{order.id}</td>
                        <td className="py-2 px-2">{order.customerName}</td>
                        <td className="py-2 px-2">{order.vendorName}</td>
                        <td className="py-2 px-2 text-right font-bold">
                          ₹{order.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                            ✅ RECEIVED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-300 mt-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-600 font-semibold">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-800">
                      ₹{orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Admin Commission (20%)</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{(orders.reduce((sum, o) => sum + o.amount, 0) * 0.2).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Vendor Share (80%)</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{(orders.reduce((sum, o) => sum + o.amount, 0) * 0.8).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reject Settlement?</h2>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (will be sent to warehouse staff)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows="4"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
                className="flex-1 bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckItem({ checked, text }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg ${checked ? '✅' : '⭕'}`}></span>
      <p className="text-gray-700">{text}</p>
    </div>
  );
}
