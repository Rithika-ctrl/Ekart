import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/common/Toast'
import VendorNav from '../../components/vendor/VendorNav'
import '../styles/vendor-glass.css'

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
    <div className="vnd" style={{ minHeight: '100vh' }}>
      <div className="vnd-bg" aria-hidden="true" />
      <VendorNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--yellow)' }} aria-hidden="true" />
      </div>
    </div>
  )

  return (
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
}