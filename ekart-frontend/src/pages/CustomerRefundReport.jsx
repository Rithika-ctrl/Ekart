import { useState, useEffect } from "react";

export default function CustomerRefundReport({ api, onSelectOrder }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const d = await api("/orders");
        if (!d.success) { setEntries([]); setLoading(false); return; }
        const orders = d.orders || [];
        const promises = orders.map(async (o) => {
          const r = await api(`/refund/status/${o.id}`);
          if (r && r.success && r.hasRefund) {
            return {
              orderId: o.id,
              orderDate: o.orderDate,
              amount: o.totalPrice || o.amount || 0,
              status: r.status,
              type: r.type,
              reason: r.reason || "",
            };
          }
          return null;
        });
        const results = await Promise.all(promises);
        const list = results.filter(Boolean).sort((a,b) => new Date(b.orderDate) - new Date(a.orderDate));
        setEntries(list);
      } catch (e) { setEntries([]); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = entries.filter(e => filter === "ALL" ? true : e.status === filter);

  return (
    <div>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Refund History</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8 }}>
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      {loading && <div style={{ color: '#9ca3af' }}>Loading refund history...</div>}
      {!loading && filtered.length === 0 && <div style={{ color: '#9ca3af' }}>No refund requests found.</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map(e => (
          <div key={e.orderId} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontWeight: 700 }}>Order #{e.orderId}</div>
              <div style={{ color: e.status === 'PENDING' ? '#f59e0b' : e.status === 'APPROVED' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{e.status}</div>
            </div>
            <div style={{ color: '#9ca3af', marginBottom: 8 }}>{e.type} — {e.reason}</div>
            <div style={{ display:'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#9ca3af' }}>Amount: ₹{(e.amount||0).toLocaleString('en-IN')}</div>
              <div>
                <button style={{ padding: '6px 10px', borderRadius: 6, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => onSelectOrder && onSelectOrder({ id: e.orderId })}>View Order</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
