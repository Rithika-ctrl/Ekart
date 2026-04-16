import React, { useState, useMemo } from "react";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN");

export default function CODSettlementAdmin({ codStats, orders = [] }) {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Extract COD orders and create settlement records
  const settlements = useMemo(() => {
    if (!orders.length) return [];
    
    const codOrders = orders.filter(o => (o.paymentMode || "").toUpperCase() === "COD");
    
    return codOrders.map(order => {
      const isCollected = order.paymentStatus === "RECEIVED";
      const status = isCollected ? "approved" : "pending";
      
      return {
        id: order.id,
        orderId: order.customOrderId || `ORD-${order.id}`,
        vendorId: order.vendorId,
        vendorName: order.vendorName || "Unknown Vendor",
        amount: order.amount || 0,
        orderDate: order.createdAt || new Date().toISOString(),
        collectionDate: order.paymentReceivedAt || null,
        status: status,
        paymentStatus: order.paymentStatus,
        adminCom: (order.amount || 0) * 0.2,
        vendorPay: (order.amount || 0) * 0.8,
      };
    });
  }, [orders]);

  // Filter settlements
  const filteredSettlements = useMemo(() => {
    return settlements.filter(s => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesSearch = 
        s.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [settlements, statusFilter, searchQuery]);

  // Calculate statistics for displayed settlements
  const stats = useMemo(() => {
    const pending = settlements.filter(s => s.status === "pending");
    const approved = settlements.filter(s => s.status === "approved");

    return {
      totalSettlements: settlements.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      pendingAmount: pending.reduce((sum, s) => sum + s.amount, 0),
      approvedAmount: approved.reduce((sum, s) => sum + s.amount, 0),
      adminCommission: approved.reduce((sum, s) => sum + s.adminCom, 0),
    };
  }, [settlements]);

  return (
    <div>
      <h2 style={as.pageTitle}>💰 COD Settlement Management</h2>

      {/* Statistics Cards */}
      <div style={as.statsGrid}>
        <div style={as.statCard}>
          <div style={as.statIcon("#e11d48")}></div>
          <div style={as.statVal}>{stats.pendingCount}</div>
          <div style={as.statLabel}>Pending Settlements</div>
        </div>
        <div style={as.statCard}>
          <div style={as.statIcon("#22c55e")}></div>
          <div style={as.statVal}>{stats.approvedCount}</div>
          <div style={as.statLabel}>Approved Settlements</div>
        </div>
        <div style={as.statCard}>
          <div style={as.statIcon("#f59e0b")}></div>
          <div style={as.statVal}>{fmt(stats.pendingAmount)}</div>
          <div style={as.statLabel}>Pending Amount</div>
        </div>
        <div style={as.statCard}>
          <div style={as.statIcon("#10b981")}></div>
          <div style={as.statVal}>{fmt(stats.approvedAmount)}</div>
          <div style={as.statLabel}>Approved Amount</div>
        </div>
        <div style={as.statCard}>
          <div style={as.statIcon("#3b82f6")}></div>
          <div style={as.statVal}>{fmt(stats.adminCommission)}</div>
          <div style={as.statLabel}>Admin Commission (20%)</div>
        </div>
      </div>

      {/* Filter & Search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by Order ID or Vendor..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={as.searchInput}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "pending", "approved"].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                ...as.filterBtn,
                ...(statusFilter === f ? as.filterBtnActive : {}),
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Settlements Table */}
      <div style={as.tableWrap}>
        {filteredSettlements.length === 0 ? (
          <div style={as.empty}>No settlements found</div>
        ) : (
          <table style={as.table}>
            <thead style={as.thead}>
              <tr style={as.tr}>
                <th style={as.th}>Order ID</th>
                <th style={as.th}>Vendor</th>
                <th style={as.th}>Amount</th>
                <th style={as.th}>Admin (20%)</th>
                <th style={as.th}>Vendor (80%)</th>
                <th style={as.th}>Date</th>
                <th style={as.th}>Status</th>
                <th style={as.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSettlements.map(settlement => (
                <tr key={settlement.id} style={as.tr}>
                  <td style={as.td}>
                    <span style={{ fontWeight: 600, color: "#0284c7" }}>{settlement.orderId}</span>
                  </td>
                  <td style={as.td}>{settlement.vendorName}</td>
                  <td style={as.td}>
                    <span style={{ fontWeight: 600, color: "#059669" }}>{fmt(settlement.amount)}</span>
                  </td>
                  <td style={as.td}>
                    <span style={{ fontWeight: 600, color: "#e11d48" }}>{fmt(settlement.adminCom)}</span>
                  </td>
                  <td style={as.td}>
                    <span style={{ fontWeight: 600, color: "#10b981" }}>{fmt(settlement.vendorPay)}</span>
                  </td>
                  <td style={as.td}>
                    {settlement.orderDate 
                      ? new Date(settlement.orderDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={as.td}>
                    <span
                      style={{
                        ...as.badge,
                        background:
                          settlement.status === "approved"
                            ? "#dcfce7"
                            : settlement.status === "pending"
                            ? "#fef3c7"
                            : "#f3f4f6",
                        color:
                          settlement.status === "approved"
                            ? "#15803d"
                            : settlement.status === "pending"
                            ? "#92400e"
                            : "#6b7280",
                      }}
                    >
                      {settlement.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={as.td}>
                    {settlement.status === "pending" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleApprove(settlement.id)}
                          style={as.approveBtn}
                          title="Approve settlement"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReject(settlement.id)}
                          style={as.rejectBtn}
                          title="Reject settlement"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Commission Breakdown Info */}
      <div
        style={{
          background: "rgba(37, 99, 235, 0.05)",
          border: "1.5px solid rgba(37, 99, 235, 0.2)",
          borderRadius: 12,
          padding: "16px 20px",
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>
            Commission Breakdown
          </div>
          <div style={{ fontSize: 14, color: "#1f2937", lineHeight: 1.6 }}>
            <div>
              <strong>Admin Commission:</strong> 20% of order value
            </div>
            <div>
              <strong>Vendor Payment:</strong> 80% of order value
            </div>
            <div style={{ marginTop: 8 }}>
              Commission is calculated when payment is marked as <span style={{ fontWeight: 700, color: "#059669" }}>RECEIVED</span> by the delivery partner.
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>
            Settlement Flow
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
            <div>1. ✓ Delivery boy marks payment as received</div>
            <div>2. ⏳ Settlement appears in "Pending" status</div>
            <div>3. 📋 Admin reviews and approves settlement</div>
            <div>4. 💳 Vendor receives 80% (Admin keeps 20%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settlement handlers - approve/reject with API calls
async function handleApprove(settlementId) {
  try {
    const response = await fetch(`/api/react/admin/settlements/approve/${settlementId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    
    if (response.ok) {
      showToast('Settlement approved successfully');
      fetchSettlements(); // Refresh list
    } else {
      showToast('Failed to approve settlement');
    }
  } catch (error) {
    showToast('Error approving settlement: ' + error.message);
  }
}

async function handleReject(settlementId) {
  try {
    const response = await fetch(`/api/react/admin/settlements/reject/${settlementId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    
    if (response.ok) {
      showToast('Settlement rejected successfully');
      fetchSettlements(); // Refresh list
    } else {
      showToast('Failed to reject settlement');
    }
  } catch (error) {
    showToast('Error rejecting settlement: ' + error.message);
  }
}

// ── Styles (inherit from AdminApp) ──
const as = {
  pageTitle: { fontSize: 28, fontWeight: 800, marginBottom: 28, color: "var(--ek-text)", letterSpacing: "-0.5px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 },
  statCard: { background: "var(--ek-surface)", border: "1.5px solid var(--ek-border)", borderRadius: 16, padding: 22, boxShadow: "var(--ek-shadow)", transition: "all 0.3s", cursor: "pointer" },
  statIcon: c => ({ fontSize: 24, marginBottom: 12, width: 48, height: 48, borderRadius: 12, background: c + "15", display: "flex", alignItems: "center", justifyContent: "center" }),
  statVal: { fontSize: 26, fontWeight: 900, color: "var(--ek-text)", marginBottom: 4 },
  statLabel: { color: "var(--ek-muted)", fontSize: 13, fontWeight: 500 },
  searchInput: { padding: "11px 16px", borderRadius: 10, border: "1.5px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-text)", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" },
  filterBtn: { padding: "7px 16px", borderRadius: 8, border: "1.5px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-text)", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s" },
  filterBtnActive: { background: "var(--ek-primary)", color: "#fff", border: "1.5px solid var(--ek-primary)", boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)" },
  tableWrap: { background: "var(--ek-surface)", borderRadius: 16, border: "1.5px solid var(--ek-border)", overflow: "hidden", boxShadow: "var(--ek-shadow)" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 800 },
  thead: { background: "var(--ek-surface-alt)" },
  th: { padding: "14px 16px", textAlign: "left", color: "var(--ek-muted)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid var(--ek-border)", transition: "background-color 0.2s" },
  td: { padding: "14px 16px", fontSize: 14, color: "var(--ek-text)" },
  badge: { padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  approveBtn: { padding: "6px 14px", borderRadius: 8, border: "1.5px solid #10b981", background: "#ecfdf5", color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s" },
  rejectBtn: { padding: "6px 14px", borderRadius: 8, border: "1.5px solid #e11d48", background: "#ffe4e6", color: "#e11d48", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s" },
  empty: { textAlign: "center", padding: "48px 24px", color: "var(--ek-muted)", fontSize: 15, fontWeight: 500 },
};
