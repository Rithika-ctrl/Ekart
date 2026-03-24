import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import VendorNav from '../components/vendor/VendorNav'
import '../styles/vendor-glass.css'

const PIE_COLORS = ['#f5a800','#3b82f6','#10b981','#a855f7','#f43f5e','#06b6d4','#84cc16','#f97316']

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(10,12,30,0.92)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.8)',
  fontFamily: 'Poppins, sans-serif',
  fontSize: 12,
}

/* ─── Filter orders by period ───────────────────────────────────────── */
function filterByPeriod(orders, period) {
  const now = Date.now()
  const days = period === 'daily' ? 7 : period === 'weekly' ? 56 : 180
  const cutoff = now - days * 86400000
  return orders.filter(o => new Date(o.orderDate).getTime() >= cutoff)
}

/* ─── Build revenue chart labels & data ─────────────────────────────── */
function buildRevenueData(orders, period) {
  const now = new Date()
  const data = []
  if (period === 'daily') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = key.substring(5)
      const rev = orders.filter(o => o.orderDate.startsWith(key)).reduce((s, o) => s + o.amount, 0)
      data.push({ label, rev })
    }
  } else if (period === 'weekly') {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i * 7)
      const wk = `W${getWeekNum(d)}`
      const weekStart = new Date(d); weekStart.setHours(0,0,0,0)
      const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)
      const rev = orders.filter(o => {
        const t = new Date(o.orderDate).getTime()
        return t >= weekStart.getTime() && t < weekEnd.getTime()
      }).reduce((s, o) => s + o.amount, 0)
      data.push({ label: wk, rev })
    }
  } else {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = `${months[d.getMonth()]} ${d.getFullYear()}`
      const rev = orders.filter(o => {
        const od = new Date(o.orderDate)
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
      }).reduce((s, o) => s + o.amount, 0)
      data.push({ label, rev })
    }
  }
  return data
}

function getWeekNum(d) {
  const onejan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7)
}

/* ─── Main component ────────────────────────────────────────────────── */
export default function VendorSalesReport() {
  const { user, isAuthenticated, isVendor } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [allOrders,  setAllOrders]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [syncing,    setSyncing]    = useState(false)
  const [tab,        setTab]        = useState('daily')
  const [vendorInfo, setVendorInfo] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated || !isVendor) { navigate('/vendor/login', { replace: true }); return }
    fetchData()
    timerRef.current = setInterval(fetchData, 10000)
    return () => clearInterval(timerRef.current)
  }, [isAuthenticated, isVendor]) // eslint-disable-line

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/flutter/vendor/sales-report', {
        headers: { 'X-Vendor-Id': user?.id }
      })
      if (data.success) {
        const raw = data.ordersJson || data.orders || []
        setAllOrders(raw.map(o => ({
          id:          o.id,
          amount:      o.amount || 0,
          orderDate:   o.orderDate || '',
          productName: o.productName || '',
          category:    o.category || 'Other',
          quantity:    o.quantity || o.itemCount || 1,
        })))
        setVendorInfo({ name: data.vendorName, id: data.vendorId, code: data.vendorCode })
      }
    } catch { /* silent — data stays stale */ }
    finally { setLoading(false) }
  }, [user?.id])

  const syncOrders = async () => {
    setSyncing(true)
    try {
      const { data } = await axios.post('/vendor/sync-reporting')
      toast.success(`Synced ${data.synced || 0} of ${data.total || 0} orders.`)
      await fetchData()
    } catch { toast.error('Sync failed.') }
    finally { setSyncing(false) }
  }

  /* Derive stats from filtered orders */
  const filtered    = filterByPeriod(allOrders, tab)
  const totalRevenue = filtered.reduce((s, o) => s + o.amount, 0)
  const totalItems   = filtered.reduce((s, o) => s + o.quantity, 0)
  const uniqueOrders = new Set(filtered.map(o => o.id)).size
  const avgOrder     = uniqueOrders ? totalRevenue / uniqueOrders : 0

  /* Revenue chart */
  const revenueData = buildRevenueData(filtered, tab)

  /* Category pie */
  const catMap = {}
  filtered.forEach(o => { catMap[o.category] = (catMap[o.category] || 0) + o.amount })
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }))

  /* Top products */
  const productMap = {}
  filtered.forEach(o => {
    if (!o.productName) return
    if (!productMap[o.productName]) productMap[o.productName] = { sold: 0, revenue: 0 }
    productMap[o.productName].sold    += o.quantity
    productMap[o.productName].revenue += o.amount
  })
  const topProducts = Object.entries(productMap).sort((a,b) => b[1].revenue - a[1].revenue).slice(0, 6)
  const productBarData = topProducts.map(([name, v]) => ({
    name: name.length > 12 ? name.substring(0,12) + '…' : name,
    sold: v.sold,
  }))

  /* Sorted orders table */
  const sortedOrders = [...filtered].sort((a,b) => new Date(b.orderDate) - new Date(a.orderDate))

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

      <main className="vnd-page-col" style={{ flex: 1 }}>
        <div className="vnd-inner" style={{ maxWidth: 1200 }}>

          {/* Header */}
          <div className="vnd-page-header">
            <div>
              <h1><span>Sales</span> Report 📊</h1>
              <p>Daily, Weekly & Monthly breakdown of your store performance.</p>
              {vendorInfo && (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
                  <strong>{vendorInfo.name}</strong> &nbsp;|&nbsp; ID: {vendorInfo.id}
                  &nbsp;|&nbsp; Code: {vendorInfo.code}&nbsp;&nbsp;
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginRight: 4, verticalAlign: 'middle', animation: 'pulse 1.5s ease infinite' }} />
                  <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>Live</span>
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
              <div className="vnd-page-header-icon">📈</div>
              <button onClick={syncOrders} disabled={syncing}
                style={{ padding: '0.45rem 1rem', background: 'rgba(245,168,0,0.15)', border: '1px solid rgba(245,168,0,0.4)', color: 'var(--yellow)', borderRadius: 8, fontFamily: 'Poppins,sans-serif', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', opacity: syncing ? 0.6 : 1 }}>
                <i className={`fas ${syncing ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} aria-hidden="true" /> {syncing ? 'Syncing…' : 'Sync Orders'}
              </button>
            </div>
          </div>

          {/* Period tabs */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', animation: 'vnd-fadeUp 0.45s ease 0.05s both' }}>
            {['daily','weekly','monthly'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.55rem 1.25rem', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'Poppins,sans-serif', fontSize: '0.82rem', fontWeight: 600,
                  border: '1px solid var(--glass-border)',
                  background: tab === t ? 'var(--yellow)' : 'rgba(255,255,255,0.05)',
                  color: tab === t ? '#1a1000' : 'var(--text-dim)',
                  boxShadow: tab === t ? '0 4px 16px rgba(245,168,0,0.3)' : 'none',
                  transition: 'all 0.2s', textTransform: 'capitalize',
                }}>
                <i className={`fas fa-calendar-${t === 'daily' ? 'day' : t === 'weekly' ? 'week' : 'alt'}`} aria-hidden="true" /> {t}
              </button>
            ))}
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', animation: 'vnd-fadeUp 0.45s ease 0.1s both' }}>
            {[
              { label: 'Total Orders', value: uniqueOrders, icon: 'shopping-bag', cls: 'blue' },
              { label: 'Revenue',      value: `₹${totalRevenue.toFixed(0)}`, icon: 'rupee-sign', cls: 'green' },
              { label: 'Items Sold',   value: totalItems,   icon: 'boxes',   cls: 'orange' },
              { label: 'Avg Order',    value: `₹${avgOrder.toFixed(0)}`, icon: 'chart-line', cls: 'purple' },
            ].map(s => (
              <div key={s.label} className={`vnd-stat-card ${s.cls}`}>
                <div className="vnd-stat-icon"><i className={`fas fa-${s.icon}`} aria-hidden="true" /></div>
                <div className="vnd-stat-body">
                  <div className="vnd-stat-label">{s.label}</div>
                  <div className="vnd-stat-val">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.75rem' }}>

            {/* Revenue bar chart */}
            <div className="vnd-glass-card">
              <div className="vnd-section-label"><i className="fas fa-chart-bar" aria-hidden="true" /> Revenue Over Time</div>
              {revenueData.some(d => d.rev > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Poppins' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Poppins' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`₹${v.toFixed(0)}`, 'Revenue']} />
                    <Bar dataKey="rev" fill="#f5a800" fillOpacity={0.8} radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                  <i className="fas fa-chart-bar" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem', color: 'rgba(245,168,0,0.35)' }} aria-hidden="true" />
                  <p style={{ fontSize: '0.85rem' }}>No sales data yet for this period</p>
                </div>
              )}
            </div>

            {/* Category pie */}
            <div className="vnd-glass-card">
              <div className="vnd-section-label"><i className="fas fa-chart-pie" aria-hidden="true" /> Category Breakdown</div>
              {catData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`₹${v.toFixed(0)}`]} />
                    <Legend iconSize={10} wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Poppins' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                  <i className="fas fa-chart-pie" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem', color: 'rgba(245,168,0,0.35)' }} aria-hidden="true" />
                  <p style={{ fontSize: '0.85rem' }}>No category data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top products + product bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.75rem' }}>

            <div className="vnd-glass-card">
              <div className="vnd-section-label"><i className="fas fa-trophy" aria-hidden="true" /> Top Products</div>
              {topProducts.length > 0
                ? topProducts.map(([name, v], i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: i < topProducts.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(245,168,0,0.15)', color: 'var(--yellow)', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, fontSize: '0.83rem', color: 'var(--text-light)' }}>{name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginRight: '0.5rem' }}>{v.sold} sold</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#22c55e' }}>₹{v.revenue.toFixed(0)}</div>
                    </div>
                  ))
                : <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                    <i className="fas fa-box-open" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem', color: 'rgba(245,168,0,0.35)' }} aria-hidden="true" />
                    <p style={{ fontSize: '0.85rem' }}>No product data yet</p>
                  </div>
              }
            </div>

            <div className="vnd-glass-card">
              <div className="vnd-section-label"><i className="fas fa-boxes" aria-hidden="true" /> Units Sold</div>
              {productBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={productBarData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Poppins' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Poppins' }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v + ' units', 'Sold']} />
                    <Bar dataKey="sold" fill="#3b82f6" fillOpacity={0.8} radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                  <i className="fas fa-boxes" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem', color: 'rgba(245,168,0,0.35)' }} aria-hidden="true" />
                  <p style={{ fontSize: '0.85rem' }}>No product data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Orders table */}
          <div className="vnd-glass-card">
            <div className="vnd-section-label" style={{ marginBottom: '1rem' }}>
              <i className="fas fa-list-ul" aria-hidden="true" /> Order Details
              <span style={{ background: 'rgba(245,168,0,0.15)', color: 'var(--yellow)', border: '1px solid rgba(245,168,0,0.3)', padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                {filtered.length} records
              </span>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    {['Order #','Date','Product','Category','Qty','Amount'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2.5rem' }}>No orders in this period</td></tr>
                  )}
                  {sortedOrders.map((o, i) => (
                    <tr key={`${o.id}-${i}`} style={{ borderBottom: i < sortedOrders.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-white)' }}><strong>#{o.id}</strong></td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-light)' }}>{o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-light)' }}>{o.productName || '—'}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                          {o.category || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-light)' }}>{o.quantity}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                          ₹{o.amount.toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      <footer className="vnd-footer">
        <div className="vnd-footer-brand"><span>Ekart</span></div>
        <div className="vnd-footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.5;transform:scale(1.3);} }
      `}</style>
    </div>
  )
}