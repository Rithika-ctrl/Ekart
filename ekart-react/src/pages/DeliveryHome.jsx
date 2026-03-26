import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * DeliveryHome Component
 * * @param {Object} props
 * @param {Object} props.deliveryBoy - Delivery person details {name, deliveryBoyCode, assignedPinCodes, warehouse: {name, city, state, warehouseCode}}
 * @param {Array} props.toPickUp - List of orders ready for pickup
 * @param {Array} props.outNow - List of orders currently out for delivery
 * @param {Array} props.delivered - List of successfully delivered orders
 * @param {Array} props.allWarehouses - List of all warehouses for transfer requests
 * @param {Object} props.pendingChangeRequest - Current pending warehouse transfer request
 * @param {Object} props.session - Session notification object {success: string, failure: string}
 * @param {string} props.csrfToken - CSRF token value for security
 */
export default function DeliveryHome({
    deliveryBoy = { name: "Delivery Boy", deliveryBoyCode: "", assignedPinCodes: "", warehouse: null },
    toPickUp = [],
    outNow = [],
    delivered = [],
    allWarehouses = [],
    pendingChangeRequest = null,
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    const [toast, setToast] = useState({ show: false, msg: '', success: true });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [warehouseSelect, setWarehouseSelect] = useState('');
    const [changeReason, setChangeReason] = useState('');
    const [otpValues, setOtpValues] = useState({});

    // --- EFFECTS ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);
        return () => clearTimeout(timer);
    }, [session]);

    // --- LOGIC ---
    const showToast = (msg, success) => {
        setToast({ show: true, msg, success });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
    };

    const confirmPickup = async (orderId) => {
        if (!window.confirm(`Confirm you have picked up Order #${orderId} from the warehouse?`)) return;
        try {
            const response = await fetch(`/delivery/order/${orderId}/pickup`, { 
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken }
            });
            const data = await response.json();
            showToast(data.message, data.success);
            if (data.success) setTimeout(() => window.location.reload(), 1800);
        } catch (err) {
            showToast('Request failed. Try again.', false);
        }
    };

    const confirmDelivery = async (orderId) => {
        const otp = (otpValues[orderId] || '').trim();
        if (!otp || otp.length !== 6) { showToast('Enter the 6-digit OTP from customer.', false); return; }
        if (!window.confirm(`Confirm delivery of Order #${orderId} with OTP ${otp}?`)) return;

        const fd = new FormData();
        fd.append('otp', otp);
        if (csrfToken) fd.append('_csrf', csrfToken);

        try {
            const response = await fetch(`/delivery/order/${orderId}/deliver`, { method: 'POST', body: fd });
            const data = await response.json();
            showToast(data.message, data.success);
            if (data.success) setTimeout(() => window.location.reload(), 1800);
        } catch (err) {
            showToast('Request failed. Try again.', false);
        }
    };

    const submitChangeRequest = async () => {
        if (!warehouseSelect) { showToast('Please select a warehouse.', false); return; }

        const fd = new FormData();
        fd.append('warehouseId', warehouseSelect);
        fd.append('reason', changeReason);
        if (csrfToken) fd.append('_csrf', csrfToken);

        try {
            const response = await fetch('/delivery/warehouse-change/request', { method: 'POST', body: fd });
            const data = await response.json();
            showToast(data.message, data.success);
            if (data.success) {
                setIsModalOpen(false);
                setTimeout(() => window.location.reload(), 1800);
            }
        } catch (err) {
            showToast('Request failed. Try again.', false);
        }
    };

    const CSS = `:root{--yellow:#f5a800;--yellow-d:#d48f00;--glass-border:rgba(255,255,255,0.22);--glass-card:rgba(255,255,255,0.13);--glass-nav:rgba(0,0,0,0.25);--text-white:#ffffff;--text-light:rgba(255,255,255,0.80);--text-dim:rgba(255,255,255,0.50);}
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        #root {font-family:'Poppins',sans-serif;min-height:100vh;color:var(--text-white);display:flex;flex-direction:column;}
        .bg-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;}
        .bg-layer::before{content:'';position:absolute;inset:-20px;background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;filter:blur(6px);transform:scale(1.08);}
        .bg-layer::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%);}

        /* NAV */
        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;background:var(--glass-nav);backdrop-filter:blur(14px);border-bottom:1px solid var(--glass-border);gap:1rem;}
        .nav-brand{font-size:1.4rem;font-weight:700;color:var(--text-white);text-decoration:none;display:flex;align-items:center;gap:0.5rem;flex-shrink:0;}
        .nav-brand span{color:var(--yellow);}
        .nav-badge{display:flex;align-items:center;gap:0.4rem;font-size:0.72rem;font-weight:700;padding:0.3rem 0.8rem;border-radius:50px;background:rgba(245,168,0,0.15);border:1px solid rgba(245,168,0,0.3);color:var(--yellow);letter-spacing:0.06em;text-transform:uppercase;}
        .nav-right{display:flex;align-items:center;gap:0.75rem;}
        .nav-info{font-size:0.78rem;color:var(--text-dim);}
        .btn-logout{display:flex;align-items:center;gap:0.4rem;color:var(--text-light);text-decoration:none;font-size:0.82rem;font-weight:500;padding:0.45rem 0.9rem;border-radius:6px;border:1px solid rgba(255,100,80,0.3);transition:all 0.2s;}
        .btn-logout:hover{color:#ff8060;border-color:rgba(255,100,80,0.6);background:rgba(255,100,80,0.08);}

        /* ALERTS */
        .alert-stack{position:fixed;top:5rem;right:1.5rem;z-index:200;display:flex;flex-direction:column;gap:0.5rem;}
        .alert{padding:0.875rem 1.25rem;background:rgba(10,12,30,0.88);backdrop-filter:blur(16px);border:1px solid;border-radius:10px;display:flex;align-items:center;gap:0.625rem;font-size:0.825rem;min-width:260px;animation:slideIn 0.3s ease both;}
        .alert-success{border-color:rgba(34,197,94,0.45);color:#22c55e;}
        .alert-danger{border-color:rgba(255,100,80,0.45);color:#ff8060;}
        .alert-close{margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;opacity:0.6;font-size:1rem;}

        /* PAGE */
        .page{flex:1;padding:7rem 2rem 3rem;display:flex;flex-direction:column;gap:1.5rem;}

        /* WELCOME BANNER */
        .welcome-banner{background:var(--glass-card);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:20px;padding:1.75rem 2rem;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;}
        .welcome-text h1{font-size:1.5rem;font-weight:700;margin-bottom:0.2rem;}
        .welcome-text h1 span{color:var(--yellow);}
        .welcome-text p{font-size:0.8rem;color:var(--text-dim);}
        .welcome-icon{width:56px;height:56px;background:rgba(245,168,0,0.15);border:2px solid rgba(245,168,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;}

        /* WAREHOUSE INFO CARD */
        .warehouse-card{background:var(--glass-card);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:18px;padding:1.4rem 1.75rem;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;}
        .wh-info{display:flex;align-items:center;gap:1rem;}
        .wh-icon{width:48px;height:48px;background:rgba(99,179,237,0.15);border:2px solid rgba(99,179,237,0.3);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#63b3ed;flex-shrink:0;}
        .wh-details h3{font-size:1rem;font-weight:600;margin-bottom:0.15rem;}
        .wh-details p{font-size:0.78rem;color:var(--text-dim);}
        .wh-details .wh-code{font-size:0.7rem;color:var(--yellow);font-weight:600;margin-top:0.1rem;}
        .wh-right{display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;}

        /* Pending badge for warehouse request */
        .badge-pending-req{display:inline-flex;align-items:center;gap:0.4rem;font-size:0.72rem;font-weight:600;padding:0.3rem 0.8rem;border-radius:50px;background:rgba(245,168,0,0.15);border:1px solid rgba(245,168,0,0.4);color:var(--yellow);}

        /* Change warehouse button */
        .btn-change-wh{display:flex;align-items:center;gap:0.4rem;background:rgba(99,179,237,0.12);border:1px solid rgba(99,179,237,0.35);color:#63b3ed;border-radius:8px;padding:0.45rem 1rem;font-size:0.78rem;font-weight:600;font-family:'Poppins',sans-serif;cursor:pointer;transition:all 0.2s;}
        .btn-change-wh:hover{background:rgba(99,179,237,0.22);border-color:rgba(99,179,237,0.6);}
        .btn-change-wh:disabled{opacity:0.5;cursor:not-allowed;}

        /* STATS */
        .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;}
        .stat-card{background:var(--glass-card);backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:16px;padding:1.25rem 1.5rem;text-align:center;}
        .stat-value{font-size:2rem;font-weight:700;color:var(--yellow);}
        .stat-label{font-size:0.78rem;color:var(--text-dim);margin-top:0.2rem;}

        /* COLUMNS */
        .col-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;align-items:start;}

        /* SECTION PANEL */
        .section-panel{background:var(--glass-card);backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:18px;overflow:hidden;}
        .section-header{padding:1rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:0.75rem;}
        .section-header h3{font-size:0.9rem;font-weight:600;display:flex;align-items:center;gap:0.5rem;}
        .section-header .count-badge{background:var(--yellow);color:#1a1000;font-size:0.68rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:20px;}
        .section {padding:1rem;}

        /* ORDER CARD */
        .order-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.1rem;margin-bottom:0.75rem;transition:border-color 0.2s;}
        .order-card:last-child{margin-bottom:0;}
        .order-card:hover{border-color:rgba(245,168,0,0.3);}
        .order-id{font-weight:700;color:var(--yellow);font-size:0.9rem;}
        .order-customer{font-size:0.8rem;color:var(--text-light);margin-top:0.15rem;}
        .order-pin{font-size:0.75rem;color:var(--text-dim);}
        .order-items{font-size:0.75rem;color:var(--text-dim);margin-top:0.4rem;padding-top:0.4rem;border-top:1px solid rgba(255,255,255,0.06);}
        .order-amount{font-weight:700;color:#22c55e;font-size:0.88rem;margin-top:0.5rem;}
        .order-actions{margin-top:0.75rem;display:flex;gap:0.5rem;align-items:center;}

        /* BUTTONS */
        .btn-pickup{background:var(--yellow);color:#1a1000;border:none;border-radius:8px;padding:0.5rem 1rem;font-size:0.78rem;font-weight:700;font-family:'Poppins',sans-serif;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:0.4rem;}
        .btn-pickup:hover{background:var(--yellow-d);}
        .btn-deliver{background:rgba(34,197,94,0.2);color:#22c55e;border:1px solid rgba(34,197,94,0.4);border-radius:8px;padding:0.5rem 1rem;font-size:0.78rem;font-weight:700;font-family:'Poppins',sans-serif;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:0.4rem;}
        .btn-deliver:hover{background:rgba(34,197,94,0.3);border-color:rgba(34,197,94,0.6);}

        /* OTP INPUT */
        .otp-section{background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:0.75rem;margin-top:0.75rem;}
        .otp-label{font-size:0.72rem;color:#22c55e;font-weight:600;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.35rem;}
        .otp-row{display:flex;gap:0.5rem;}
        .otp-input{flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:0.5rem 0.75rem;color:white;font-family:'Poppins',sans-serif;font-size:1rem;letter-spacing:0.2em;text-align:center;outline:none;transition:border-color 0.2s;}
        .otp-input:focus{border-color:#22c55e;background:rgba(255,255,255,0.09);}
        .otp-input::-webkit-outer-spin-button,.otp-input::-webkit-inner-spin-button{-webkit-appearance:none;}
        .otp-input[type=number]{-moz-appearance:textfield;}

        /* EMPTY STATE */
        .empty-state{text-align:center;padding:2.5rem 1rem;color:var(--text-dim);}
        .empty-state i{font-size:2rem;margin-bottom:0.75rem;display:block;opacity:0.4;}
        .empty-state p{font-size:0.82rem;}

        /* DELIVERED CARD */
        .order-card.delivered{opacity:0.6;}

        /* TOAST */
        .toast-wrap{position:fixed;bottom:2rem;right:2rem;z-index:9999;}
        .toast{background:rgba(10,12,30,0.95);backdrop-filter:blur(16px);border:1px solid;border-radius:12px;padding:1rem 1.25rem;font-size:0.85rem;min-width:240px;display:flex;align-items:center;gap:0.6rem;box-shadow:0 12px 40px rgba(0,0,0,0.5);animation:slideIn 0.3s ease;}
        .toast.success{border-color:rgba(34,197,94,0.5);color:#22c55e;}
        .toast.error{border-color:rgba(255,100,80,0.5);color:#ff8060;}

        /* MODAL OVERLAY */
        .modal-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem;}
        .modal-box{background:rgba(12,16,36,0.97);border:1px solid var(--glass-border);border-radius:20px;padding:2rem;width:100%;max-width:480px;box-shadow:0 24px 60px rgba(0,0,0,0.6);}
        .modal-title{font-size:1.1rem;font-weight:700;margin-bottom:0.3rem;display:flex;align-items:center;gap:0.5rem;}
        .modal-title i{color:#63b3ed;}
        .modal-subtitle{font-size:0.78rem;color:var(--text-dim);margin-bottom:1.5rem;}
        .form-group{margin-bottom:1rem;}
        .form-label{font-size:0.78rem;font-weight:600;color:var(--text-light);margin-bottom:0.4rem;display:block;}
        .form-select,.form-textarea{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:0.65rem 0.9rem;color:white;font-family:'Poppins',sans-serif;font-size:0.85rem;outline:none;transition:border-color 0.2s;}
        .form-select option{background:#0e1230;color:white;}
        .form-select:focus,.form-textarea:focus{border-color:#63b3ed;background:rgba(255,255,255,0.09);}
        .form-textarea{resize:vertical;min-height:80px;}
        .modal-actions{display:flex;gap:0.75rem;margin-top:1.5rem;}
        .btn-submit-req{flex:1;background:#63b3ed;color:#0a0e20;border:none;border-radius:10px;padding:0.7rem 1rem;font-size:0.85rem;font-weight:700;font-family:'Poppins',sans-serif;cursor:pointer;transition:all 0.2s;}
        .btn-submit-req:hover{background:#4299d9;}
        .btn-cancel-modal{flex:1;background:rgba(255,255,255,0.06);color:var(--text-light);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:0.7rem 1rem;font-size:0.85rem;font-weight:600;font-family:'Poppins',sans-serif;cursor:pointer;transition:all 0.2s;}
        .btn-cancel-modal:hover{background:rgba(255,255,255,0.1);}

        footer{background:rgba(0,0,0,0.5);backdrop-filter:blur(16px);border-top:1px solid var(--glass-border);padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;}
        .footer-brand{font-size:1.1rem;font-weight:700;color:white;}
        .footer-brand span{color:var(--yellow);}
        .footer-copy{font-size:0.72rem;color:var(--text-dim);}

        @keyframes fadeUp{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px);}to{opacity:1;transform:translateX(0);}}

        @media(max-width:900px){.col-grid{grid-template-columns:1fr;}.stats-row{grid-template-columns:repeat(3,1fr);}}
        @media(max-width:500px){.stats-row{grid-template-columns:1fr;}.page{padding:6rem 1rem 2rem;}}`;

    return (
        <div className="delivery-body">
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i><span>{alerts.success}</span>
                        <button style={{marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} onClick={() => setAlerts(p => ({...p, success: null}))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i><span>{alerts.failure}</span>
                        <button style={{marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} onClick={() => setAlerts(p => ({...p, failure: null}))}>×</button>
                    </div>
                )}
            </div>

            <nav>
                <Link className="nav-brand" to="/delivery">
                    <i className="fas fa-shopping-cart" style={{fontSize: '1.1rem'}}></i><span>Ekart</span>
                </Link>
                <div className="nav-right">
                    <span className="nav-badge"><i className="fas fa-motorcycle"></i>&nbsp; Delivery</span>
                    <span className="nav-info">{deliveryBoy.name}</span>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="welcome-banner">
                    <div className="welcome-text">
                        <h1>Hello, <span>{deliveryBoy.name}</span>!</h1>
                        <p>{deliveryBoy.deliveryBoyCode}  ·  Pins: {deliveryBoy.assignedPinCodes || 'All'}</p>
                    </div>
                    <div className="welcome-icon"><i className="fas fa-motorcycle" style={{color: 'var(--yellow)'}}></i></div>
                </div>

                <div className="warehouse-card">
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                        <div className="wh-icon"><i className="fas fa-warehouse"></i></div>
                        <div className="wh-details">
                            {deliveryBoy.warehouse ? (
                                <>
                                    <h3>{deliveryBoy.warehouse.name}</h3>
                                    <p><i className="fas fa-map-marker-alt" style={{color: 'var(--yellow)', marginRight: '0.3rem', fontSize: '0.7rem'}}></i>
                                       {deliveryBoy.warehouse.city}, {deliveryBoy.warehouse.state}
                                    </p>
                                    <div style={{fontSize: '0.7rem', color: 'var(--yellow)', fontWeight: 600}}>{deliveryBoy.warehouse.warehouseCode}</div>
                                </>
                            ) : (
                                <>
                                    <h3 style={{color: 'var(--text-dim)'}}>No Warehouse Assigned</h3>
                                    <p>Contact admin to get a warehouse assigned.</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="wh-right">
                        {pendingChangeRequest ? (
                            <span className="nav-badge" style={{background: 'rgba(245,168,0,0.15)', color: 'var(--yellow)'}}>
                                <i className="fas fa-clock"></i> Transfer to <strong>{pendingChangeRequest.requestedWarehouse.name}</strong> — Pending
                            </span>
                        ) : (
                            <button className="btn-change-wh" onClick={() => setIsModalOpen(true)}>
                                <i className="fas fa-exchange-alt"></i> Request Transfer
                            </button>
                        )}
                    </div>
                </div>

                <div className="stats-row">
                    <div className="stat-card">
                        <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--yellow)'}}>{toPickUp.length}</div>
                        <div style={{fontSize: '0.78rem', color: 'var(--text-dim)'}}>To Pick Up</div>
                    </div>
                    <div className="stat-card">
                        <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--yellow)'}}>{outNow.length}</div>
                        <div style={{fontSize: '0.78rem', color: 'var(--text-dim)'}}>Out for Delivery</div>
                    </div>
                    <div className="stat-card">
                        <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--yellow)'}}>{delivered.length}</div>
                        <div style={{fontSize: '0.78rem', color: 'var(--text-dim)'}}>Delivered</div>
                    </div>
                </div>

                <div className="col-grid">
                    <div className="section-panel">
                        <div className="section-header">
                            <h3><i className="fas fa-box" style={{color: 'var(--yellow)'}}></i> Warehouse Pickup</h3>
                            <span className="count-badge">{toPickUp.length}</span>
                        </div>
                        <div style={{padding: '1rem'}}>
                            {toPickUp.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)'}}><i className="fas fa-box-open" style={{fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4}}></i><p>No orders for pickup</p></div>
                            ) : toPickUp.map(order => (
                                <div className="order-card" key={order.id}>
                                    <div className="order-id">Order #{order.id}</div>
                                    <div style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{order.customer.name}</div>
                                    <div style={{fontSize: '0.75rem', color: 'var(--text-dim)'}}>{order.customer.mobile}</div>
                                    {order.deliveryPinCode && <div style={{fontSize: '0.75rem', color: 'var(--text-dim)'}}>PIN: {order.deliveryPinCode}</div>}
                                    <div style={{fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)'}}>
                                        {order.items.map((item, i) => <span key={i}>{item.name} ×{item.quantity}{i < order.items.length - 1 ? ', ' : ''}</span>)}
                                    </div>
                                    <div style={{fontWeight: 700, color: '#22c55e', marginTop: '0.5rem'}}>₹{order.amount.toFixed(2)}</div>
                                    <button className="btn-pickup" style={{marginTop: '0.75rem'}} onClick={() => confirmPickup(order.id)}><i className="fas fa-truck-loading"></i> Picked Up</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="section-panel">
                        <div className="section-header">
                            <h3><i className="fas fa-motorcycle" style={{color: '#22c55e'}}></i> Out for Delivery</h3>
                            <span className="count-badge">{outNow.length}</span>
                        </div>
                        <div style={{padding: '1rem'}}>
                            {outNow.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)'}}><i className="fas fa-road" style={{fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4}}></i><p>No active deliveries</p></div>
                            ) : outNow.map(order => (
                                <div className="order-card" key={order.id}>
                                    <div className="order-id">Order #{order.id}</div>
                                    <div style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{order.customer.name}</div>
                                    <div style={{fontSize: '0.75rem', color: 'var(--text-dim)'}}>{order.customer.mobile}</div>
                                    {order.deliveryPinCode && <div style={{fontSize: '0.75rem', color: 'var(--yellow)'}}>PIN: {order.deliveryPinCode}</div>}
                                    <div style={{fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)'}}>
                                        {order.items.map((item, i) => <span key={i}>{item.name} ×{item.quantity}{i < order.items.length - 1 ? ', ' : ''}</span>)}
                                    </div>
                                    <div style={{fontWeight: 700, color: '#22c55e', marginTop: '0.5rem'}}>₹{order.amount.toFixed(2)}</div>
                                    <div style={{background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '0.75rem', marginTop: '0.75rem'}}>
                                        <div style={{fontSize: '0.72rem', color: '#22c55e', fontWeight: 600, marginBottom: '0.5rem'}}><i className="fas fa-key"></i> Customer OTP</div>
                                        <div style={{display: 'flex', gap: '0.5rem'}}>
                                            <input type="number" className="otp-input" value={otpValues[order.id] || ''} onChange={(e) => setOtpValues({...otpValues, [order.id]: e.target.value})} placeholder="000000" />
                                            <button style={{background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer'}} onClick={() => confirmDelivery(order.id)}><i className="fas fa-check"></i></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="section-panel">
                        <div className="section-header">
                            <h3><i className="fas fa-check-circle" style={{color: '#22c55e'}}></i> Delivered</h3>
                            <span className="count-badge">{delivered.length}</span>
                        </div>
                        <div style={{padding: '1rem'}}>
                            {delivered.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)'}}><i className="fas fa-clipboard-check" style={{fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4}}></i><p>No completed deliveries</p></div>
                            ) : delivered.map(order => (
                                <div className="order-card" style={{opacity: 0.6}} key={order.id}>
                                    <div className="order-id">Order #{order.id}</div>
                                    <div style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{order.customer.name}</div>
                                    <div style={{fontWeight: 700, color: '#22c55e', marginTop: '0.5rem'}}>₹{order.amount.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsModalOpen(false)}>
                    <div className="modal-box">
                        <div style={{fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.3rem'}}><i className="fas fa-exchange-alt" style={{color: '#63b3ed'}}></i> Request Transfer</div>
                        <div style={{fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '1.5rem'}}>Review process by admin. Notified by email on status.</div>
                        <div style={{marginBottom: '1rem'}}>
                            <label style={{fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.4rem', display: 'block'}}>Target Warehouse</label>
                            <select className="otp-input" style={{textAlign: 'left', letterSpacing: 'normal'}} value={warehouseSelect} onChange={(e) => setWarehouseSelect(e.target.value)}>
                                <option value="">— Select warehouse —</option>
                                {allWarehouses.filter(wh => !deliveryBoy.warehouse || wh.id !== deliveryBoy.warehouse.id).map(wh => (
                                    <option key={wh.id} value={wh.id} style={{background: '#0e1230'}}>{wh.name} — {wh.city}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{marginBottom: '1rem'}}>
                            <label style={{fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.4rem', display: 'block'}}>Reason</label>
                            <textarea className="otp-input" style={{textAlign: 'left', letterSpacing: 'normal', height: '80px', resize: 'vertical'}} value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="Optional..."></textarea>
                        </div>
                        <div style={{display: 'flex', gap: '0.75rem', marginTop: '1.5rem'}}>
                            <button style={{flex: 1, background: 'rgba(255,255,255,0.06)', color: 'var(--text-light)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.7rem'}} onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button style={{flex: 1, background: '#63b3ed', color: '#0a0e20', border: 'none', borderRadius: '10px', padding: '0.7rem', fontWeight: 700}} onClick={submitChangeRequest}>Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {toast.show && (
                <div className={`toast ${toast.success ? 'success' : 'error'}`} style={{position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999}}>
                    <i className={toast.success ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
                    <span>{toast.msg}</span>
                </div>
            )}

            <footer style={{background: 'rgba(0,0,0,0.5)', borderTop: '1px solid var(--glass-border)', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{fontSize: '1.1rem', fontWeight: 700}}><span>Ekart</span></div>
                <div style={{fontSize: '0.72rem', color: 'var(--text-dim)'}}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}