import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - Delivery Management Component
 * @param {Object} props
 * @param {Array} props.pendingApprovals - List of delivery boys awaiting approval
 * @param {Array} props.pendingWarehouseChanges - List of transfer requests
 * @param {Array} props.packedOrders - List of orders ready for assignment
 * @param {Array} props.shippedOrders - List of orders currently shipped
 * @param {Array} props.outOrders - List of orders out for delivery
 * @param {Array} props.warehouses - List of available warehouses
 * @param {Object} props.session - Session object for success/failure messages
 * @param {string} props.csrfToken - CSRF token for form security
 */
export default function AdminDeliveryManagement({
    pendingApprovals = [],
    pendingWarehouseChanges = [],
    packedOrders = [],
    shippedOrders = [],
    outOrders = [],
    warehouses = [],
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    const [toast, setToast] = useState({ visible: false, message: '', success: true });
    const [deliveryBoysForOrders, setDeliveryBoysForOrders] = useState({});

    // --- EFFECTS ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);
        
        // Fetch eligible delivery boys for packed orders on mount
        packedOrders.forEach(order => {
            fetch(`/admin/delivery/boys/for-order/${order.id}`)
                .then(r => r.json())
                .then(data => {
                    setDeliveryBoysForOrders(prev => ({
                        ...prev,
                        [order.id]: {
                            list: data.deliveryBoys || [],
                            pin: data.orderPin || 'N/A',
                            loading: false
                        }
                    }));
                })
                .catch(() => {
                    setDeliveryBoysForOrders(prev => ({
                        ...prev,
                        [order.id]: { list: [], pin: 'Error', loading: false }
                    }));
                });
        });

        return () => clearTimeout(timer);
    }, [packedOrders]);

    // --- HANDLERS ---
    const showToast = (msg, success) => {
        setToast({ visible: true, message: msg, success });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
    };

    const handleAssignDeliveryBoy = async (orderId) => {
        const select = document.getElementById(`db-select-${orderId}`);
        if (!select || !select.value) {
            showToast('Select a delivery boy first', false);
            return;
        }

        const fd = new FormData();
        fd.append('orderId', orderId);
        fd.append('deliveryBoyId', select.value);
        if (csrfToken) fd.append('_csrf', csrfToken);

        try {
            const r = await fetch('/admin/delivery/assign', { method: 'POST', body: fd });
            const data = await r.json();
            showToast(data.message, data.success);
            if (data.success) setTimeout(() => window.location.reload(), 1800);
        } catch (e) {
            showToast('Request failed', false);
        }
    };

    const handleApproveDB = async (dbId) => {
        const pinsInput = document.getElementById(`pins-approve-${dbId}`);
        const pins = pinsInput ? pinsInput.value.trim() : '';
        if (!window.confirm('Approve this delivery boy for their requested warehouse?')) return;

        const fd = new FormData();
        fd.append('deliveryBoyId', dbId);
        fd.append('assignedPinCodes', pins);
        if (csrfToken) fd.append('_csrf', csrfToken);

        try {
            const r = await fetch('/admin/delivery/boy/approve', { method: 'POST', body: fd });
            const data = await r.json();
            showToast(data.message, data.success);
            if (data.success) setTimeout(() => window.location.reload(), 1800);
        } catch (e) {
            showToast('Request failed', false);
        }
    };

    const handleRejectDB = async (dbId) => {
        const reason = window.prompt('Enter rejection reason (optional — will be emailed to them):') || '';
        if (!window.confirm('Reject this delivery boy application? This cannot be undone easily.')) return;

        const fd = new FormData();
        fd.append('deliveryBoyId', dbId);
        fd.append('reason', reason);
        if (csrfToken) fd.append('_csrf', csrfToken);

        try {
            const r = await fetch('/admin/delivery/boy/reject', { method: 'POST', body: fd });
            const data = await r.json();
            showToast(data.message, data.success);
            if (data.success) setTimeout(() => window.location.reload(), 1800);
        } catch (e) {
            showToast('Request failed', false);
        }
    };

    const handleApproveWarehouseChange = async (requestId, name) => {
        const note = window.prompt(`Approve warehouse transfer for ${name}?\nOptional note for delivery boy (leave blank to skip):`);
        if (note === null) return;
        const fd = new FormData();
        fd.append('requestId', requestId);
        fd.append('adminNote', note || '');
        if (csrfToken) fd.append('_csrf', csrfToken);

        try {
            const r = await fetch('/admin/delivery/warehouse-change/approve', { method: 'POST', body: fd });
            const data = await r.json();
            showToast(data.message, data.success);
            if (data.success) setTimeout(() => window.location.reload(), 1800);
        } catch (e) {
            showToast('Request failed. Try again.', false);
        }
    };

    const handleRejectWarehouseChange = async (requestId, name) => {
        const note = window.prompt(`Reject warehouse transfer for ${name}.\nReason (will be emailed to delivery boy):`);
        if (note === null) return;
        const fd = new FormData();
        fd.append('requestId', requestId);
        fd.append('adminNote', note || '');
        if (csrfToken) fd.append('_csrf', csrfToken);

        try {
            const r = await fetch('/admin/delivery/warehouse-change/reject', { method: 'POST', body: fd });
            const data = await r.json();
            showToast(data.message, data.success);
            if (data.success) setTimeout(() => window.location.reload(), 1800);
        } catch (e) {
            showToast('Request failed. Try again.', false);
        }
    };

    const CSS = `:root{--yellow:#f5a800;--yellow-d:#d48f00;--glass-border:rgba(255,255,255,0.22);--glass-card:rgba(255,255,255,0.13);--glass-nav:rgba(0,0,0,0.25);--text-white:#ffffff;--text-light:rgba(255,255,255,0.80);--text-dim:rgba(255,255,255,0.50);}
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        #root {font-family:'Poppins',sans-serif;min-height:100vh;color:var(--text-white);display:flex;flex-direction:column;}
        .bg-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;}
        .bg-layer::before{content:'';position:absolute;inset:-20px;background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;filter:blur(6px);transform:scale(1.08);}
        .bg-layer::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%);}

        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;background:var(--glass-nav);backdrop-filter:blur(14px);border-bottom:1px solid var(--glass-border);}
        .nav-brand{font-size:1.4rem;font-weight:700;color:var(--text-white);text-decoration:none;display:flex;align-items:center;gap:0.5rem;}
        .nav-brand span{color:var(--yellow);}
        .nav-right{display:flex;align-items:center;gap:0.75rem;}
        .nav-badge{display:flex;align-items:center;gap:0.4rem;font-size:0.72rem;font-weight:700;padding:0.3rem 0.8rem;border-radius:50px;background:rgba(245,168,0,0.15);border:1px solid rgba(245,168,0,0.3);color:var(--yellow);text-transform:uppercase;letter-spacing:0.06em;}
        .nav-link{display:flex;align-items:center;gap:0.4rem;color:var(--text-light);text-decoration:none;font-size:0.82rem;font-weight:500;padding:0.45rem 0.9rem;border-radius:6px;border:1px solid var(--glass-border);transition:all 0.2s;}
        .nav-link:hover{color:white;background:rgba(255,255,255,0.08);}
        .btn-logout{display:flex;align-items:center;gap:0.4rem;color:var(--text-light);text-decoration:none;font-size:0.82rem;font-weight:500;padding:0.45rem 0.9rem;border-radius:6px;border:1px solid rgba(255,100,80,0.3);transition:all 0.2s;}
        .btn-logout:hover{color:#ff8060;border-color:rgba(255,100,80,0.6);}

        .alert-stack{position:fixed;top:5rem;right:1.5rem;z-index:200;display:flex;flex-direction:column;gap:0.5rem;}
        .alert{padding:0.875rem 1.25rem;background:rgba(10,12,30,0.88);backdrop-filter:blur(16px);border:1px solid;border-radius:10px;display:flex;align-items:center;gap:0.625rem;font-size:0.825rem;min-width:260px;animation:slideIn 0.3s ease both;}
        .alert-success{border-color:rgba(34,197,94,0.45);color:#22c55e;}
        .alert-danger{border-color:rgba(255,100,80,0.45);color:#ff8060;}
        .alert-close{margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;opacity:0.6;font-size:1rem;}

        .page{flex:1;padding:7rem 2rem 3rem;display:flex;flex-direction:column;gap:1.5rem;}

        .page-header{background:var(--glass-card);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:20px;padding:1.75rem 2rem;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;}
        .page-header h1{font-size:1.5rem;font-weight:700;}
        .page-header h1 span{color:var(--yellow);}
        .page-header p{font-size:0.8rem;color:var(--text-dim);margin-top:0.2rem;}
        .page-header-icon{width:56px;height:56px;background:rgba(245,168,0,0.15);border:2px solid rgba(245,168,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;}

        .layout-grid{display:grid;grid-template-columns:1fr;gap:1.5rem;align-items:start;}

        /* Panel */
        .panel{background:var(--glass-card);backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:18px;overflow:hidden;margin-bottom:1.25rem;}
        .panel:last-child{margin-bottom:0;}
        .panel-header{padding:1rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:0.75rem;}
        .panel-header h3{font-size:0.9rem;font-weight:600;}
        .panel-icon{width:34px;height:34px;background:rgba(245,168,0,0.15);border:1px solid rgba(245,168,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:var(--yellow);flex-shrink:0;}
        .panel-#root {padding:1.25rem 1.5rem;}

        /* Pending panel — special highlight */
        .panel.pending-panel{border-color:rgba(245,168,0,0.4);}
        .panel.pending-panel .panel-header{background:rgba(245,168,0,0.08);border-bottom-color:rgba(245,168,0,0.2);}

        /* Form */
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;}
        .form-group{margin-bottom:0.9rem;}
        .form-group:last-child{margin-bottom:0;}
        .form-label{display:block;font-size:0.72rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.4rem;}
        .form-control{width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:0.65rem 0.9rem;color:white;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;transition:all 0.2s;}
        .form-control::placeholder{color:var(--text-dim);}
        .form-control:focus{border-color:rgba(245,168,0,0.5);background:rgba(255,255,255,0.09);}
        textarea.form-control{resize:vertical;min-height:70px;}
        select.form-control option{background:#0d0f1e;color:white;}
        .btn-action{width:100%;background:var(--yellow);color:#1a1000;border:none;border-radius:10px;padding:0.75rem;font-family:'Poppins',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:0.75rem;}
        .btn-action:hover{background:var(--yellow-d);}

        /* Table */
        .tbl-wrap{overflow-x:auto;}
        table{width:100%;border-collapse:collapse;}
        thead tr{background:rgba(0,0,0,0.2);}
        th{padding:0.75rem 1rem;text-align:left;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim);border-bottom:1px solid rgba(255,255,255,0.08);}
        td{padding:0.875rem 1rem;font-size:0.82rem;color:var(--text-light);border-bottom:1px solid rgba(255,255,255,0.06);}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:rgba(255,255,255,0.03);}
        .order-id-cell{color:var(--yellow);font-weight:700;}
        .amount-cell{color:#22c55e;font-weight:600;}
        .empty-row td{text-align:center;padding:2rem;color:var(--text-dim);}

        /* Badges */
        .badge{padding:0.25rem 0.7rem;border-radius:20px;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;}
        .badge-packed{background:rgba(245,168,0,0.15);color:var(--yellow);border:1px solid rgba(245,168,0,0.3);}
        .badge-shipped{background:rgba(99,179,237,0.15);color:#63b3ed;border:1px solid rgba(99,179,237,0.3);}
        .badge-out{background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);}
        .badge-pending{background:rgba(245,168,0,0.15);color:var(--yellow);border:1px solid rgba(245,168,0,0.4);animation:pulse 2s ease-in-out infinite;}

        /* Assign row */
        .assign-select{background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:8px;padding:0.5rem 0.75rem;color:white;font-family:'Poppins',sans-serif;font-size:0.78rem;outline:none;width:100%;}
        .assign-select:focus{border-color:rgba(245,168,0,0.5);}
        .assign-select option{background:#0d0f1e;}
        .btn-assign{background:var(--yellow);color:#1a1000;border:none;border-radius:8px;padding:0.5rem 0.9rem;font-family:'Poppins',sans-serif;font-size:0.78rem;font-weight:700;cursor:pointer;transition:background 0.2s;white-space:nowrap;}
        .btn-assign:hover{background:var(--yellow-d);}
        .btn-approve{background:rgba(34,197,94,0.2);color:#22c55e;border:1px solid rgba(34,197,94,0.4);border-radius:8px;padding:0.45rem 0.85rem;font-family:'Poppins',sans-serif;font-size:0.78rem;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
        .btn-approve:hover{background:rgba(34,197,94,0.35);}
        .btn-reject{background:rgba(255,100,80,0.15);color:#ff8060;border:1px solid rgba(255,100,80,0.35);border-radius:8px;padding:0.45rem 0.85rem;font-family:'Poppins',sans-serif;font-size:0.78rem;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
        .btn-reject:hover{background:rgba(255,100,80,0.25);}

        /* Toast */
        .toast-wrap{position:fixed;bottom:2rem;right:2rem;z-index:9999;display:none;}
        .toast{background:rgba(10,12,30,0.95);backdrop-filter:blur(16px);border:1px solid;border-radius:12px;padding:1rem 1.25rem;font-size:0.85rem;min-width:240px;display:flex;align-items:center;gap:0.6rem;box-shadow:0 12px 40px rgba(0,0,0,0.5);}
        .toast.success{border-color:rgba(34,197,94,0.5);color:#22c55e;}
        .toast.error{border-color:rgba(255,100,80,0.5);color:#ff8060;}

        footer{background:rgba(0,0,0,0.5);backdrop-filter:blur(16px);border-top:1px solid var(--glass-border);padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;}
        .footer-brand{font-size:1.1rem;font-weight:700;color:white;}
        .footer-brand span{color:var(--yellow);}
        .footer-copy{font-size:0.72rem;color:var(--text-dim);}

        @keyframes fadeUp{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px);}to{opacity:1;transform:translateX(0);}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,168,0,0.3);}50%{box-shadow:0 0 0 6px rgba(245,168,0,0);}}
        @media(max-width:1024px){.layout-grid{grid-template-columns:1fr;}}
        @media(max-width:600px){.form-row{grid-template-columns:1fr;}.page{padding:6rem 1rem 2rem;}}`;

    return (
        <>
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({...p, success: null}))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({...p, failure: null}))}>×</button>
                    </div>
                )}
            </div>

            <nav>
                <Link className="nav-brand" to="/admin">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </Link>
                <div className="nav-right">
                    <span className="nav-badge" style={{ background: 'rgba(245,168,0,0.15)', border: '1px solid rgba(245,168,0,0.3)', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.06em', borderRadius: '50px', padding: '0.3rem 0.8rem', fontSize: '0.72rem', fontWeight: 700 }}>
                        <i className="fas fa-user-shield"></i>&nbsp; Admin
                    </span>
                    <Link to="/admin" className="nav-link"><i className="fas fa-arrow-left"></i> Dashboard</Link>
                    <Link to="/admin/login" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', textDecoration: 'none', padding: '0.4rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </Link>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div>
                        <h1>Delivery <span>Management</span></h1>
                        <p>Approve delivery partners and assign orders for delivery</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Link to="/admin/warehouse" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245,168,0,0.15)', border: '1px solid rgba(245,168,0,0.4)', color: 'var(--yellow)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600, padding: '0.6rem 1.1rem', borderRadius: '10px' }}>
                            <i className="fas fa-warehouse"></i> Manage Warehouses
                        </Link>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(245,168,0,0.15)', border: '2px solid rgba(245,168,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '1.5rem', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                            <i className="fas fa-truck" style={{ color: 'var(--yellow)', alignSelf: 'center' }}></i>
                        </div>
                    </div>
                </div>

                {pendingApprovals.length > 0 && (
                    <div className="panel" style={{ borderColor: 'rgba(245,168,0,0.4)' }}>
                        <div className="panel-header" style={{ background: 'rgba(245,168,0,0.08)' }}>
                            <div style={{ width: '34px', height: '34px', background: 'rgba(245,168,0,0.15)', border: '1px solid rgba(245,168,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)' }}>
                                <i className="fas fa-user-clock"></i>
                            </div>
                            <h3 style={{ color: 'var(--yellow)', fontSize: '0.9rem' }}>Pending Approval Requests</h3>
                            <span style={{ marginLeft: 'auto', background: 'var(--yellow)', color: '#1a1000', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '20px', animation: 'pulse 2s ease-in-out infinite' }}>
                                {pendingApprovals.length}
                            </span>
                        </div>
                        <div className="tbl-wrap">
                            <table>
                                <thead>
                                    <tr><th>Name</th><th>Email / Mobile</th><th>Code</th><th>Warehouse</th><th>Pins</th><th>Action</th></tr>
                                </thead>
                                <tbody>
                                    {pendingApprovals.map(db => (
                                        <tr key={db.id}>
                                            <td style={{ fontWeight: 600 }}>{db.name}</td>
                                            <td>{db.email}<br/><small style={{ color: 'var(--text-dim)' }}>{db.mobile}</small></td>
                                            <td><span className="badge badge-pending">{db.deliveryBoyCode}</span></td>
                                            <td>
                                                <select className="assign-select" id={`wh-approve-${db.id}`}>
                                                    <option value="">Select warehouse</option>
                                                    {warehouses.map(wh => (
                                                        <option key={wh.id} value={wh.id}>{wh.name} — {wh.city}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td><input type="text" className="assign-select" id={`pins-approve-${db.id}`} placeholder="e.g. 600001,600002" /></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn-approve" onClick={() => handleApproveDB(db.id)}><i className="fas fa-check"></i> Approve</button>
                                                    <button className="btn-reject" onClick={() => handleRejectDB(db.id)}><i className="fas fa-times"></i> Reject</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {pendingWarehouseChanges.length > 0 && (
                    <div className="panel" style={{ borderColor: 'rgba(99,179,237,0.4)' }}>
                        <div className="panel-header" style={{ background: 'rgba(99,179,237,0.08)' }}>
                            <div style={{ width: '34px', height: '34px', background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#63b3ed' }}>
                                <i className="fas fa-exchange-alt"></i>
                            </div>
                            <h3>Warehouse Transfer Requests</h3>
                        </div>
                        <div className="tbl-wrap">
                            <table>
                                <thead>
                                    <tr><th>Delivery Boy</th><th>Current</th><th>Requested</th><th>Reason</th><th>Action</th></tr>
                                </thead>
                                <tbody>
                                    {pendingWarehouseChanges.map(req => (
                                        <tr key={req.id}>
                                            <td><div style={{ fontWeight: 600 }}>{req.deliveryBoy.name}</div></td>
                                            <td>{req.deliveryBoy.warehouse?.name || 'None'}</td>
                                            <td style={{ color: '#63b3ed', fontWeight: 600 }}>{req.requestedWarehouse.name}</td>
                                            <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{req.reason || '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn-approve" onClick={() => handleApproveWarehouseChange(req.id, req.deliveryBoy.name)}>Approve</button>
                                                    <button className="btn-reject" onClick={() => handleRejectWarehouseChange(req.id, req.deliveryBoy.name)}>Reject</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="panel">
                    <div className="panel-header">
                        <div style={{ width: '34px', height: '34px', background: 'rgba(245,168,0,0.15)', border: '1px solid rgba(245,168,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)' }}>
                            <i className="fas fa-box"></i>
                        </div>
                        <h3>Packed Orders — Assign Delivery Boy</h3>
                        <span style={{ marginLeft: 'auto', background: 'var(--yellow)', color: '#1a1000', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                            {packedOrders.length}
                        </span>
                    </div>
                    <div className="tbl-wrap">
                        <table>
                            <thead>
                                <tr><th>Order</th><th>Customer</th><th>Pin</th><th>Warehouse</th><th>Amount</th><th>Assign To</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {packedOrders.length > 0 ? packedOrders.map(order => (
                                    <tr key={order.id}>
                                        <td><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>#{order.id}</span><br/><span className="badge" style={{ background: 'rgba(245,168,0,0.15)', color: 'var(--yellow)', border: '1px solid rgba(245,168,0,0.3)' }}>PACKED</span></td>
                                        <td>{order.customer.name}<br/><small style={{ color: 'var(--text-dim)' }}>{order.customer.mobile}</small></td>
                                        <td>{order.deliveryPinCode || 'N/A'}</td>
                                        <td>{order.warehouse?.name || <span style={{ color: '#ff8060' }}>Not assigned</span>}</td>
                                        <td style={{ color: '#22c55e', fontWeight: 600 }}>₹{order.amount.toFixed(2)}</td>
                                        <td>
                                            <select className="assign-select" id={`db-select-${order.id}`}>
                                                <option value="">{deliveryBoysForOrders[order.id]?.loading ? 'Loading...' : 'Select delivery boy'}</option>
                                                {deliveryBoysForOrders[order.id]?.list.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name} ({b.code}) — {b.warehouse}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td><button style={{ background: 'var(--yellow)', border: 'none', borderRadius: '8px', padding: '0.5rem 0.9rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => handleAssignDeliveryBoy(order.id)}>Assign</button></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}><i className="fas fa-check-circle" style={{ color: '#22c55e', marginRight: '0.5rem' }}></i> All packed orders assigned.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-header">
                        <div style={{ width: '34px', height: '34px', background: 'rgba(245,168,0,0.15)', border: '1px solid rgba(245,168,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)' }}>
                            <i className="fas fa-truck"></i>
                        </div>
                        <h3>In Progress</h3>
                    </div>
                    <div className="tbl-wrap">
                        <table>
                            <thead>
                                <tr><th>Order</th><th>Customer</th><th>Pin</th><th>Delivery Boy</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {shippedOrders.map(o => (
                                    <tr key={o.id}><td>#{o.id}</td><td>{o.customer.name}</td><td>{o.deliveryPinCode}</td><td>{o.deliveryBoy?.name || '—'}</td><td><span className="badge" style={{ background: 'rgba(99,179,237,0.15)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.3)' }}>SHIPPED</span></td></tr>
                                ))}
                                {outOrders.map(o => (
                                    <tr key={o.id}><td>#{o.id}</td><td>{o.customer.name}</td><td>{o.deliveryPinCode}</td><td>{o.deliveryBoy?.name || '—'}</td><td><span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>OUT FOR DELIVERY</span></td></tr>
                                ))}
                                {shippedOrders.length === 0 && outOrders.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No orders in transit.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {toast.visible && (
                <div className="toast-wrap" style={{ display: 'block' }}>
                    <div className={`toast ${toast.success ? 'success' : 'error'}`}>
                        <i className={`fas fa-${toast.success ? 'check-circle' : 'exclamation-circle'}`}></i>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            <footer style={{ background: 'rgba(0,0,0,0.5)', padding: '1.25rem 2rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: 'white' }}>Ek<span>art</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </>
    );
}