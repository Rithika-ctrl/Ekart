import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

/**
 * LOCATION: ekart-frontend/src/pages/AdminSettlementPage.jsx
 * 
 * Admin Settlement Dashboard
 * - View all pending settlements
 * - Filter by warehouse
 * - Quick stats
 * - Navigate to review page
 */
export default function AdminSettlementPage() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('PENDING');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettlements();
  }, [filter]);

  const fetchSettlements = async () => {
    try {
      setLoading(true);

      // Mock settlements data
      const mockSettlements = [
        {
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
        },
        {
          id: 500,
          warehouseId: 5,
          warehouseName: 'Nagpur Hub',
          submittedBy: 'Vikram Patil',
          submittedAt: '2026-04-14 17:30',
          totalCash: 95400,
          orderCount: 4,
          adminCommission: 19080,
          vendorSettlement: 76320,
          status: 'PENDING_ADMIN_APPROVAL',
          vendorCount: 2,
        },
        {
          id: 499,
          warehouseId: 3,
          warehouseName: 'Jaipur Hub',
          submittedBy: 'Rajesh Kumar',
          submittedAt: '2026-04-13 18:00',
          totalCash: 210500,
          orderCount: 7,
          adminCommission: 42100,
          vendorSettlement: 168400,
          status: 'APPROVED',
          approvedAt: '2026-04-14 10:30',
          approvedBy: 'Admin User',
          vendorCount: 3,
        },
      ];

      const filtered = mockSettlements.filter((s) => {
        if (filter === 'ALL') return true;
        return s.status === filter;
      });

      setSettlements(filtered);
      setError('');
    } catch (err) {
      setError('Failed to fetch settlements: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    pending: settlements.filter((s) => s.status === 'PENDING_ADMIN_APPROVAL').length,
    approved: settlements.filter((s) => s.status === 'APPROVED').length,
    totalPending: settlements
      .filter((s) => s.status === 'PENDING_ADMIN_APPROVAL')
      .reduce((sum, s) => sum + s.totalCash, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 font-semibold">Loading settlements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            💰 Settlement Management
          </h1>
          <p className="text-gray-600">Review and approve cash settlements from warehouses</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Pending Approvals"
            value={stats.pending}
            icon="⏳"
            color="orange"
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Pending Amount"
            value={`₹${stats.totalPending.toLocaleString('en-IN')}`}
            icon="💸"
            color="red"
          />
          <StatCard
            title="Action Required"
            value={stats.pending > 0 ? 'YES' : 'NO'}
            icon={stats.pending > 0 ? '🔴' : '🟢'}
            color={stats.pending > 0 ? 'red' : 'green'}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg shadow-sm p-2">
          {['PENDING_ADMIN_APPROVAL', 'APPROVED', 'ALL'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === tab
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab === 'PENDING_ADMIN_APPROVAL'
                ? '⏳ Pending'
                : tab === 'APPROVED'
                ? '✅ Approved'
                : '📋 All'}
              {tab === 'PENDING_ADMIN_APPROVAL' && ` (${stats.pending})`}
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Settlements List */}
        <div className="space-y-4">
          {settlements.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 text-lg">📭 No settlements to display</p>
            </div>
          ) : (
            settlements.map((settlement) => (
              <SettlementCard
                key={settlement.id}
                settlement={settlement}
                onReview={() => navigate(`/admin/settlement/review/${settlement.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colorClass = {
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
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

function SettlementCard({ settlement, onReview }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-l-4 border-blue-500">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600 font-semibold">Settlement ID</p>
          <p className="text-2xl font-bold text-gray-800">#{settlement.id}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 font-semibold">Warehouse</p>
          <p className="font-semibold text-gray-800">{settlement.warehouseName}</p>
          <p className="text-xs text-gray-600">by {settlement.submittedBy}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 font-semibold">Amount</p>
          <p className="text-2xl font-bold text-orange-600">
            ₹{settlement.totalCash.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-600">{settlement.orderCount} orders</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 font-semibold">Commission</p>
          <p className="text-xl font-bold text-green-600">
            ₹{settlement.adminCommission.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-600">20% of total</p>
        </div>

        <div className="flex items-end justify-between md:justify-end">
          <div>
            <p className="text-sm text-gray-600 font-semibold mb-1 text-right">Status</p>
            <div
              className={`px-3 py-1 rounded-full text-white font-semibold text-xs ${
                settlement.status === 'PENDING_ADMIN_APPROVAL'
                  ? 'bg-orange-500'
                  : 'bg-green-500'
              }`}
            >
              {settlement.status === 'PENDING_ADMIN_APPROVAL'
                ? '⏳ Pending'
                : '✅ Approved'}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="border-t border-gray-200 pt-4 mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>
            Submitted: <strong>{settlement.submittedAt}</strong>
          </p>
          {settlement.status === 'APPROVED' && (
            <p className="text-green-600">
              ✅ Approved on {settlement.approvedAt} by {settlement.approvedBy}
            </p>
          )}
          <p className="mt-1">
            Affecting <strong>{settlement.vendorCount}</strong> vendors
          </p>
        </div>

        {settlement.status === 'PENDING_ADMIN_APPROVAL' && (
          <button
            onClick={onReview}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition font-semibold"
          >
            Review & Approve →
          </button>
        )}
      </div>
    </div>
  );
}
