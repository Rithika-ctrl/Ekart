import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import VendorNav from '../components/vendor/VendorNav'
// import '../styles/vendor-glass.css'

const CSS = `
:root{--yellow:#f5a800;--yellow-d:#d48f00;--glass-border:rgba(255,255,255,0.22);--glass-card:rgba(255,255,255,0.13);--glass-nav:rgba(0,0,0,0.25);--text-white:#ffffff;--text-light:rgba(255,255,255,0.80);--text-dim:rgba(255,255,255,0.50);}
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
        .btn-logout{display:flex;align-items:center;gap:0.4rem;color:var(--text-light);text-decoration:none;font-size:0.82rem;padding:0.45rem 0.9rem;border-radius:6px;border:1px solid rgba(255,100,80,0.3);transition:all 0.2s;}
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

        .panel{background:var(--glass-card);backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:18px;overflow:hidden;margin-bottom:1.5rem;}
        .panel:last-child{margin-bottom:0;}
        .panel-header{padding:1rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:0.75rem;}
        .panel-header h3{font-size:0.9rem;font-weight:600;display:flex;align-items:center;gap:0.5rem;}
        .count-pill{background:var(--yellow);color:#1a1000;font-size:0.68rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:20px;margin-left:auto;}

        .tbl-wrap{overflow-x:auto;}
        table{width:100%;border-collapse:collapse;}
        thead tr{background:rgba(0,0,0,0.2);}
        th{padding:0.75rem 1rem;text-align:left;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim);border-bottom:1px solid rgba(255,255,255,0.08);}
        td{padding:0.875rem 1rem;font-size:0.82rem;color:var(--text-light);border-bottom:1px solid rgba(255,255,255,0.06);vertical-align:middle;}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:rgba(255,255,255,0.025);}
        .order-id-cell{color:var(--yellow);font-weight:700;}
        .amount-cell{color:#22c55e;font-weight:600;}
        .empty-row td{text-align:center;padding:2rem;color:var(--text-dim);}

        .badge{padding:0.25rem 0.7rem;border-radius:20px;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;}
        .badge-processing{background:rgba(255,255,255,0.08);color:var(--text-dim);border:1px solid rgba(255,255,255,0.12);}
        .badge-packed{background:rgba(245,168,0,0.15);color:var(--yellow);border:1px solid rgba(245,168,0,0.3);}
        .badge-shipped{background:rgba(99,179,237,0.15);color:#63b3ed;border:1px solid rgba(99,179,237,0.3);}
        .badge-out{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25);}
        .badge-delivered{background:rgba(34,197,94,0.2);color:#22c55e;border:1px solid rgba(34,197,94,0.4);}

        .btn-pack{background:var(--yellow);color:#1a1000;border:none;border-radius:8px;padding:0.45rem 1rem;font-family:'Poppins',sans-serif;font-size:0.78rem;font-weight:700;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:0.4rem;}
        .btn-pack:hover{background:var(--yellow-d);}

        /* Address cell */
        .addr-cell{max-width:200px;}
        .addr-pin{font-size:0.78rem;font-weight:700;color:var(--yellow);}
        .addr-full{font-size:0.72rem;color:var(--text-dim);line-height:1.5;margin-top:0.2rem;white-space:normal;word-break:break-word;}
        .addr-na{font-size:0.78rem;color:var(--text-dim);}
        .wh-name{font-size:0.72rem;color:#63b3ed;margin-top:0.2rem;}

        /* Clickable order ID */
        .order-id-btn{color:var(--yellow);font-weight:700;background:none;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:0.82rem;padding:0;text-decoration:underline dotted;text-underline-offset:3px;}
        .order-id-btn:hover{color:#ffc740;}

        /* Items list */
        .items-list{font-size:0.75rem;color:var(--text-dim);}

        /* Toast */
        .toast-wrap{position:fixed;bottom:2rem;right:2rem;z-index:9999;display:none;}
        .toast{background:rgba(10,12,30,0.95);backdrop-filter:blur(16px);border:1px solid;border-radius:12px;padding:1rem 1.25rem;font-size:0.85rem;min-width:240px;display:flex;align-items:center;gap:0.6rem;box-shadow:0 12px 40px rgba(0,0,0,0.5);}
        .toast.success{border-color:rgba(34,197,94,0.5);color:#22c55e;}
        .toast.error{border-color:rgba(255,100,80,0.5);color:#ff8060;}

        /* Order Summary Modal */
        .modal-overlay{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);align-items:center;justify-content:center;}
        .modal-overlay.open{display:flex;}
        .modal-box{background:#0d1020;border:1px solid var(--glass-border);border-radius:20px;padding:0;width:90%;max-width:540px;max-height:88vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,0.6);animation:modalIn 0.25s ease both;}
        @keyframes modalIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        .modal-head{padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:1rem;position:sticky;top:0;background:#0d1020;z-index:1;}
        .modal-head h2{font-size:1rem;font-weight:700;}
        .modal-head h2 span{color:var(--yellow);}
        .modal-close{background:none;border:none;color:var(--text-dim);font-size:1.2rem;cursor:pointer;padding:0.2rem;transition:color 0.2s;}
        .modal-close:hover{color:white;}
        .modal {padding:1.5rem;}
        .modal-section{margin-bottom:1.25rem;}
        .modal-section:last-child{margin-bottom:0;}
        .modal-section-title{font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--yellow);margin-bottom:0.6rem;display:flex;align-items:center;gap:0.4rem;}
        .modal-row{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.82rem;}
        .modal-row:last-child{border-bottom:none;}
        .modal-label{color:var(--text-dim);flex-shrink:0;}
        .modal-value{color:var(--text-white);text-align:right;font-weight:500;}
        .modal-value.yellow{color:var(--yellow);}
        .modal-value.green{color:#22c55e;}
        .modal-item-row{display:flex;justify-content:space-between;padding:0.45rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.8rem;}
        .modal-item-row:last-child{border-bottom:none;}
        .modal-item-name{color:var(--text-light);}
        .modal-item-price{color:#22c55e;font-weight:600;white-space:nowrap;}
        .modal-addr-block{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:0.875rem 1rem;font-size:0.82rem;color:var(--text-light);line-height:1.7;}
        .modal-addr-block .pin-tag{display:inline-flex;align-items:center;gap:0.3rem;background:rgba(245,168,0,0.12);border:1px solid rgba(245,168,0,0.3);color:var(--yellow);font-size:0.72rem;font-weight:700;padding:0.15rem 0.55rem;border-radius:20px;margin-top:0.4rem;}
        .modal-no-addr{color:var(--text-dim);font-size:0.82rem;font-style:italic;}

        footer{background:rgba(0,0,0,0.5);backdrop-filter:blur(16px);border-top:1px solid var(--glass-border);padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;}
        .footer-brand{font-size:1.1rem;font-weight:700;color:white;}
        .footer-brand span{color:var(--yellow);}
        .footer-copy{font-size:0.72rem;color:var(--text-dim);}

        @keyframes slideIn{from{opacity:0;transform:translateX(14px);}to{opacity:1;transform:translateX(0);}}
        @media(max-width:600px){.page{padding:6rem 1rem 2rem;}}
`;

/* ─── Status badge ─────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    PROCESSING:       ['vnd-badge vnd-badge-processing', 'Processing'],
    PACKED:           ['vnd-badge vnd-badge-packed',     'Packed'],
    SHIPPED:          ['vnd-badge vnd-badge-shipped',    'Shipped'],
    OUT_FOR_DELIVERY: ['vnd-badge vnd-badge-outfor',     'Out for Delivery'],
    DELIVERED:        ['vnd-badge vnd-badge-delivered',  'Delivered'],
    CANCELLED:        ['vnd-badge vnd-badge-processing', 'Cancelled'],
  }
  const [cls, label] = map[status] || ['vnd-badge vnd-badge-processing', status]
  return <span className={cls}>{label}</span>
}

/* ─── Address cell ─────────────────────────────────────────────────── */
function AddrCell({ order }) {
  const hasAddr = order.deliveryAddress && order.deliveryAddress.trim()
  const hasPin  = order.deliveryPinCode
  if (!hasAddr && !hasPin)
    return <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Not provided</span>
  return (
    <div>
      {hasAddr && <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5, maxWidth: 200, wordBreak: 'break-word' }}>{order.deliveryAddress}</div>}
      {hasPin  && <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--yellow)', marginTop: hasAddr ? '0.2rem' : 0 }}>PIN: {order.deliveryPinCode}</div>}
      {order.warehouseName && <div style={{ fontSize: '0.72rem', color: '#63b3ed', marginTop: '0.2rem' }}>→ {order.warehouseName}</div>}
    </div>
  )
}

/* ─── Order summary modal ──────────────────────────────────────────── */
function OrderModal({ order, onClose }) {
  if (!order) return null
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <div style={{
        background: '#0d1020', border: '1px solid var(--glass-border)',
        borderRadius: 20, padding: 0,
        width: '90%', maxWidth: 540, maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        animation: 'vnd-fadeUp 0.25s ease both',
      }}>
        {/* Head */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#0d1020', zIndex: 1,
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
            Order <span style={{ color: 'var(--yellow)' }}>#{order.id}</span> Summary
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Customer */}
          <Section title="Customer" icon="user">
            <Row label="Name"   value={order.customerName} />
            <Row label="Mobile" value={order.customerMobile} />
          </Section>

          {/* Address */}
          <Section title="Delivery Address" icon="map-marker-alt">
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.875rem 1rem', fontSize: '0.82rem', color: 'var(--text-light)', lineHeight: 1.7 }}>
              {order.deliveryAddress || 'No address recorded.'}
              {order.deliveryPinCode && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245,168,0,0.12)', border: '1px solid rgba(245,168,0,0.3)', color: 'var(--yellow)', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: 20, marginTop: '0.4rem' }}>
                  <i className="fas fa-map-pin" aria-hidden="true" /> PIN: {order.deliveryPinCode}
                </div>
              )}
            </div>
          </Section>

          {/* Order details */}
          <Section title="Order Details" icon="receipt">
            <Row label="Date"    value={order.orderDate ? new Date(order.orderDate).toLocaleString('en-IN') : '—'} />
            <Row label="Payment" value={order.paymentMode} />
            <Row label="Amount"  value={`₹${order.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}`} green />
            {order.warehouseName && <Row label="Warehouse" value={order.warehouseName} yellow />}
          </Section>

          {/* Items */}
          <Section title="Items" icon="box">
            {(order.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-light)' }}>{item.name}</span>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>× {item.quantity}</span>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--yellow)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <i className={`fas fa-${icon}`} aria-hidden="true" /> {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, green, yellow }) {
  const color = green ? '#22c55e' : yellow ? 'var(--yellow)' : 'var(--text-white)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.82rem' }}>
      <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{label}</span>
      <span style={{ color, textAlign: 'right', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}

/* ─── Shared table styles ──────────────────────────────────────────── */
const TH = ({ children }) => (
  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
    {children}
  </th>
)
const TD = ({ children, style }) => (
  <td style={{ padding: '0.875rem 1rem', fontSize: '0.82rem', color: 'var(--text-light)', borderBottom: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'middle', ...style }}>
    {children}
  </td>
)

/* ─── Main component ───────────────────────────────────────────────── */
export default function VendorOrders() {
  const { user, isAuthenticated, isVendor } = useAuth()
  const navigate = useNavigate()
  const toast    = useToast()

  const [pending,    setPending]    = useState([])
  const [inProgress, setInProgress] = useState([])
  const [delivered,  setDelivered]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [packing,    setPacking]    = useState(null) // orderId being packed
  const [modal,      setModal]      = useState(null) // order for modal

  useEffect(() => {
    if (!isAuthenticated || !isVendor) { navigate('/vendor/login', { replace: true }); return }
    fetchOrders()
  }, [isAuthenticated, isVendor]) // eslint-disable-line

  // Close modal on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setModal(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/flutter/vendor/orders', {
        headers: { 'X-Vendor-Id': user.id }
      })
      if (!data.success) return
      const orders = data.orders || []
      setPending(    orders.filter(o => o.trackingStatus === 'PROCESSING'))
      setInProgress( orders.filter(o => ['PACKED','SHIPPED','OUT_FOR_DELIVERY'].includes(o.trackingStatus)))
      setDelivered(  orders.filter(o => o.trackingStatus === 'DELIVERED'))
    } catch { toast.error('Failed to load orders.') }
    finally { setLoading(false) }
  }

  const markPacked = async (orderId) => {
    if (!window.confirm(`Confirm Order #${orderId} is packed and ready for pickup?`)) return
    setPacking(orderId)
    try {
      // Original web endpoint — returns JSON success/message
      const { data } = await axios.post(`/vendor/order/${orderId}/ready`)
      if (data.success) {
        toast.success(data.message || `Order #${orderId} marked as Packed!`)
        await fetchOrders()
      } else {
        toast.error(data.message || 'Failed to update status.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed. Try again.')
    } finally {
      setPacking(null)
    }
  }

  const Panel = ({ title, icon, iconColor, orders, children }) => (
    <div style={{ background: 'var(--glass-card)', backdropFilter: 'blur(18px)', border: '1px solid var(--glass-border)', borderRadius: 18, overflow: 'hidden', marginBottom: '1.5rem' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className={`fas fa-${icon}`} style={{ color: iconColor || 'var(--yellow)', marginRight: '0.4rem' }} aria-hidden="true" />
          {title}
        </h3>
        <span style={{ background: 'var(--yellow)', color: '#1a1000', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 20, marginLeft: 'auto' }}>
          {orders.length}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="vnd" style={{ minHeight: '100vh' }}>
      <div className="vnd-bg" aria-hidden="true" />
      <VendorNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--yellow)' }} aria-hidden="true" />
      </div>
    </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="vnd" style={{ minHeight: '100vh' }}>
      <div className="vnd-bg" aria-hidden="true" />
      <VendorNav />

      <main style={{ flex: 1, padding: '7rem 2rem 3rem' }}>

        {/* Page header */}
        <div className="vnd-page-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              My <span style={{ color: 'var(--yellow)' }}>Orders</span>
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              Pack orders and mark them ready for delivery. Click an Order ID for full details.
            </p>
          </div>
          <div className="vnd-page-header-icon">
            <i className="fas fa-boxes" style={{ color: 'var(--yellow)' }} aria-hidden="true" />
          </div>
        </div>

        {/* PENDING */}
        <Panel title="New Orders — Pack & Mark Ready" icon="box-open" orders={pending}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
              <tr>
                {['Order ID','Customer','Delivery Address','Items','Amount','Payment','Date','Action'].map(h => <TH key={h}>{h}</TH>)}
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                  <i className="fas fa-check-circle" style={{ color: '#22c55e', marginRight: '0.5rem' }} aria-hidden="true" />
                  No new orders waiting to be packed.
                </td></tr>
              )}
              {pending.map(o => (
                <tr key={o.id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <TD>
                    <button onClick={() => setModal(o)}
                      style={{ color: 'var(--yellow)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.82rem', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
                      #{o.id} <i className="fas fa-info-circle" style={{ fontSize: '0.65rem', opacity: 0.6 }} aria-hidden="true" />
                    </button>
                  </TD>
                  <TD>
                    {o.customerName}<br />
                    <small style={{ color: 'var(--text-dim)' }}>{o.customerMobile}</small>
                  </TD>
                  <TD><AddrCell order={o} /></TD>
                  <TD>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {(o.items || []).map((it, i) => <div key={i}>{it.name} × {it.quantity}</div>)}
                    </div>
                  </TD>
                  <TD style={{ color: '#22c55e', fontWeight: 600 }}>₹{o.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TD>
                  <TD style={{ color: 'var(--text-dim)' }}>{o.paymentMode}</TD>
                  <TD style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN') : '—'}
                  </TD>
                  <TD>
                    <button onClick={() => markPacked(o.id)} disabled={packing === o.id}
                      style={{
                        background: 'var(--yellow)', color: '#1a1000',
                        border: 'none', borderRadius: 8, padding: '0.45rem 1rem',
                        fontFamily: 'Poppins,sans-serif', fontSize: '0.78rem', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s',
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        opacity: packing === o.id ? 0.6 : 1,
                      }}>
                      {packing === o.id
                        ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Packing…</>
                        : <><i className="fas fa-box" aria-hidden="true" /> Mark Packed</>}
                    </button>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* IN PROGRESS */}
        <Panel title="In Progress" icon="truck" iconColor="#63b3ed" orders={inProgress}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
              <tr>{['Order','Customer','Delivery Address','Items','Amount','Status','Delivery Boy'].map(h => <TH key={h}>{h}</TH>)}</tr>
            </thead>
            <tbody>
              {inProgress.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>No orders in progress.</td></tr>
              )}
              {inProgress.map(o => (
                <tr key={o.id}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <TD>
                    <button onClick={() => setModal(o)} style={{ color: 'var(--yellow)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.82rem', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
                      #{o.id}
                    </button>
                  </TD>
                  <TD>{o.customerName}</TD>
                  <TD><AddrCell order={o} /></TD>
                  <TD><div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{(o.items || []).map((it,i) => <span key={i}>{it.name} ×{it.quantity}{i < o.items.length-1 ? ', ' : ''}</span>)}</div></TD>
                  <TD style={{ color: '#22c55e', fontWeight: 600 }}>₹{o.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TD>
                  <TD><StatusBadge status={o.trackingStatus} /></TD>
                  <TD style={{ color: 'var(--text-dim)' }}>{o.deliveryBoyName || '—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* DELIVERED */}
        <Panel title="Recently Delivered" icon="check-circle" iconColor="#22c55e" orders={delivered}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
              <tr>{['Order','Customer','Amount','Status'].map(h => <TH key={h}>{h}</TH>)}</tr>
            </thead>
            <tbody>
              {delivered.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>No delivered orders yet.</td></tr>
              )}
              {delivered.map(o => (
                <tr key={o.id}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <TD>
                    <button onClick={() => setModal(o)} style={{ color: 'var(--yellow)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '0.82rem', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
                      #{o.id}
                    </button>
                  </TD>
                  <TD>{o.customerName}</TD>
                  <TD style={{ color: '#22c55e', fontWeight: 600 }}>₹{o.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TD>
                  <TD><StatusBadge status={o.trackingStatus} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

      </main>

      {/* Modal */}
      {modal && <OrderModal order={modal} onClose={() => setModal(null)} />}

      <footer className="vnd-footer">
        <div className="vnd-footer-brand"><span>Ekart</span></div>
        <div className="vnd-footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>
    </div>
  )

    </>
  );
}