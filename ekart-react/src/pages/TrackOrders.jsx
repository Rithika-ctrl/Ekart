import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';

const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255,255,255,0.18);
            --glass-card:   rgba(255,255,255,0.08);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.45);
            --green:        #22c55e;
            --red:          #ef4444;
        }

        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; }
        #root {
            font-family:'Poppins', sans-serif;
            min-height:100vh; color:var(--text-white);
            display:flex; flex-direction:column;
        }

        /* ── BACKGROUND ── */
        .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
        .bg-layer::before {
            content:''; position:absolute; inset:-20px;
            background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter:blur(6px); transform:scale(1.08);
        }
        .bg-layer::after {
            content:''; position:absolute; inset:0;
            background:linear-gradient(180deg,rgba(5,8,20,0.88) 0%,rgba(8,12,28,0.82) 40%,rgba(5,8,20,0.92) 100%);
        }

        /* ── NAV ── */
        nav {
            position:fixed; top:0; left:0; right:0; z-index:100;
            padding:0.75rem 2rem;
            display:flex; align-items:center; justify-content:space-between;
            background:rgba(0,0,0,0.25); backdrop-filter:blur(14px);
            border-bottom:1px solid var(--glass-border); transition:background 0.3s; gap:1rem;
        }
        nav.scrolled { background:rgba(0,0,0,0.55); }
        .nav-brand {
            font-size:1.6rem; font-weight:700; color:var(--text-white);
            text-decoration:none; letter-spacing:0.04em;
            display:flex; align-items:center; gap:0.45rem; flex-shrink:0;
        }
        .nav-brand span { color:var(--yellow); }
        .nav-right { display:flex; align-items:center; gap:0.5rem; flex-shrink:0; }
        .nav-link {
            display:flex; align-items:center; gap:0.35rem;
            color:var(--text-light); text-decoration:none;
            font-size:0.78rem; font-weight:500;
            padding:0.42rem 0.75rem; border-radius:6px;
            border:1px solid transparent; transition:all 0.2s; white-space:nowrap;
        }
        .nav-link:hover { color:white; background:rgba(255,255,255,0.1); border-color:var(--glass-border); }
        .nav-link.active {
            color:var(--yellow); border-color:rgba(245,168,0,0.35);
            background:rgba(245,168,0,0.08);
        }
        .nav-link.cart-link { border-color:var(--glass-border); position:relative; }
        .cart-badge {
            position:absolute; top:-4px; right:-4px;
            background:var(--yellow); color:#1a1000;
            font-size:0.56rem; font-weight:800;
            width:15px; height:15px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
        }
        .nav-link.logout-link { border-color:rgba(255,100,80,0.3); }
        .nav-link.logout-link:hover { color:#ff8060; border-color:rgba(255,100,80,0.6); background:rgba(255,100,80,0.08); }
        @media(max-width:800px) { .nav-link span { display:none; } .nav-link { padding:0.42rem 0.6rem; } }

        /* ── ALERTS ── */
        .alert-stack { position:fixed; top:5rem; right:1.5rem; z-index:200; display:flex; flex-direction:column; gap:0.5rem; }
        .alert {
            padding:0.875rem 1.25rem; background:rgba(10,12,30,0.92); backdrop-filter:blur(16px);
            border:1px solid; border-radius:10px;
            display:flex; align-items:center; gap:0.625rem;
            font-size:0.825rem; min-width:260px; animation:slideIn 0.3s ease both;
        }
        .alert-success { border-color:rgba(245,168,0,0.45); color:var(--yellow); }
        .alert-danger  { border-color:rgba(255,100,80,0.45); color:#ff8060; }
        .alert-close { margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; opacity:0.6; }

        /* ── PAGE ── */
        .page {
            flex:1; padding:7rem 1.5rem 3rem;
            display:flex; flex-direction:column; align-items:center; gap:1.75rem;
        }

        /* ── PAGE HEADER ── */
        .page-header {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:20px;
            padding:2rem 2.5rem;
            display:flex; align-items:center; justify-content:space-between; gap:1.5rem;
            width:100%; max-width:900px;
            animation:fadeUp 0.5s ease both; position:relative; overflow:hidden;
        }
        .page-header::before {
            content:''; position:absolute; top:-50px; right:-50px;
            width:180px; height:180px;
            background:radial-gradient(circle,rgba(245,168,0,0.1),transparent 70%);
            border-radius:50%;
        }
        .page-header-left h1 { font-size:clamp(1.2rem,2.5vw,1.75rem); font-weight:700; margin-bottom:0.25rem; }
        .page-header-left h1 span { color:var(--yellow); }
        .page-header-left p { font-size:0.825rem; color:var(--text-dim); }
        .page-header-icon {
            width:62px; height:62px;
            background:rgba(245,168,0,0.12); border:2px solid rgba(245,168,0,0.3);
            border-radius:50%; display:flex; align-items:center; justify-content:center;
            font-size:1.6rem; flex-shrink:0;
        }

        /* ── SECTION LABEL ── */
        .section-label {
            display:flex; align-items:center; gap:0.6rem;
            font-size:0.7rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.12em; color:var(--yellow);
            width:100%; max-width:900px;
        }
        .section-label::after { content:''; flex:1; height:1px; background:var(--glass-border); }

        /* ── TRACK CARD ── */
        .track-card {
            background:var(--glass-card); backdrop-filter:blur(22px);
            border:1px solid var(--glass-border); border-radius:22px;
            overflow:hidden; width:100%; max-width:900px;
            animation:fadeUp 0.5s ease both;
            transition:transform 0.25s, box-shadow 0.25s;
            position:relative;
        }
        .track-card:hover { transform:translateY(-3px); box-shadow:0 28px 72px rgba(0,0,0,0.4); }

        /* Left accent bar — colour by status */
        .track-card::before {
            content:''; position:absolute; left:0; top:0; bottom:0; width:4px;
            border-radius:4px 0 0 4px;
        }
        .status-processing::before  { background:linear-gradient(180deg,var(--yellow),rgba(245,168,0,0.2)); }
        .status-packed::before       { background:linear-gradient(180deg,#fb923c,rgba(251,146,60,0.2)); }
        .status-shipped::before      { background:linear-gradient(180deg,#60a5fa,rgba(96,165,250,0.2)); }
        .status-ofd::before          { background:linear-gradient(180deg,#34d399,rgba(52,211,153,0.2)); }
        .status-delivered::before    { background:linear-gradient(180deg,var(--green),rgba(34,197,94,0.2)); }
        .status-cancelled::before    { background:linear-gradient(180deg,#f87171,rgba(248,113,113,0.2)); }
        .status-refunded::before     { background:linear-gradient(180deg,#a78bfa,rgba(167,139,250,0.2)); }

        .card-inner { padding:1.75rem 2rem 2rem; }

        /* ── CARD TOP ROW ── */
        .order-top {
            display:flex; justify-content:space-between; align-items:flex-start;
            flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem;
        }
        .order-id-row {
            display:flex; align-items:center; gap:0.6rem;
            font-size:1rem; font-weight:700; color:var(--text-white); margin-bottom:0.3rem;
        }
        .order-id-row i { color:var(--yellow); font-size:0.9rem; }
        .order-date { font-size:0.72rem; color:var(--text-dim); display:flex; align-items:center; gap:0.35rem; }

        /* Status badge */
        .status-badge {
            display:inline-flex; align-items:center; gap:0.4rem;
            padding:0.3rem 0.9rem; border-radius:50px;
            font-size:0.72rem; font-weight:700; letter-spacing:0.05em;
            border:1px solid; white-space:nowrap;
        }
        .badge-dot {
            width:7px; height:7px; border-radius:50%; flex-shrink:0;
        }
        .badge-dot.pulsing { animation:badgePulse 1.6s ease-in-out infinite; }
        @keyframes badgePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }

        .badge-processing { background:rgba(245,168,0,0.1); border-color:rgba(245,168,0,0.35); color:var(--yellow); }
        .badge-processing .badge-dot { background:var(--yellow); }
        .badge-packed      { background:rgba(251,146,60,0.1); border-color:rgba(251,146,60,0.35); color:#fb923c; }
        .badge-packed .badge-dot { background:#fb923c; }
        .badge-shipped     { background:rgba(96,165,250,0.1); border-color:rgba(96,165,250,0.35); color:#60a5fa; }
        .badge-shipped .badge-dot { background:#60a5fa; }
        .badge-ofd         { background:rgba(52,211,153,0.1); border-color:rgba(52,211,153,0.35); color:#34d399; }
        .badge-ofd .badge-dot { background:#34d399; }
        .badge-delivered   { background:rgba(34,197,94,0.1);  border-color:rgba(34,197,94,0.35);  color:var(--green); }
        .badge-delivered .badge-dot { background:var(--green); }
        .badge-cancelled   { background:rgba(248,113,113,0.1); border-color:rgba(248,113,113,0.35); color:#f87171; }
        .badge-cancelled .badge-dot { background:#f87171; }
        .badge-refunded    { background:rgba(167,139,250,0.1); border-color:rgba(167,139,250,0.35); color:#a78bfa; }
        .badge-refunded .badge-dot { background:#a78bfa; }

        /* ── AMOUNT + ITEMS ── */
        .order-right { text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:0.45rem; }
        .order-amount { font-size:1.15rem; font-weight:800; color:var(--yellow); }
        .item-chips { display:flex; flex-wrap:wrap; gap:0.3rem; justify-content:flex-end; }
        .item-chip {
            display:inline-block; padding:0.18rem 0.65rem; border-radius:100px;
            background:rgba(255,255,255,0.07); border:1px solid var(--glass-border);
            color:var(--text-dim); font-size:0.68rem; font-weight:500;
        }

        /* ── DIVIDER ── */
        .card-divider { height:1px; background:var(--glass-border); margin:0 0 1.75rem; }

        /* ── STEPPER ── */
        .stepper-wrap {
            position:relative; padding:0 1.5rem; margin-bottom:1.5rem;
        }
        /* Background track */
        .step-track-bg {
            position:absolute; top:18px; left:calc(1.5rem + 20px); right:calc(1.5rem + 20px);
            height:3px; background:rgba(255,255,255,0.08); border-radius:2px; z-index:0;
        }
        /* Filled track */
        .step-track-fill {
            position:absolute; top:18px; left:calc(1.5rem + 20px);
            height:3px; border-radius:2px; z-index:1;
            background:linear-gradient(90deg,var(--yellow),var(--yellow-d));
            transition:width 1s cubic-bezier(0.4,0,0.2,1);
        }
        .steps-row {
            display:flex; justify-content:space-between; position:relative; z-index:2;
        }
        .step { display:flex; flex-direction:column; align-items:center; flex:1; }
        .step-dot {
            width:38px; height:38px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:0.85rem; font-weight:700; transition:all 0.3s;
            position:relative; z-index:2;
        }
        /* Done state */
        .dot-done {
            background:var(--yellow); color:#1a1000;
            border:2px solid var(--yellow);
            box-shadow:0 0 0 4px rgba(245,168,0,0.15);
        }
        /* Active state */
        .dot-active {
            background:rgba(245,168,0,0.12); color:var(--yellow);
            border:2px solid var(--yellow);
            box-shadow:0 0 0 6px rgba(245,168,0,0.12);
            animation:dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse {
            0%,100% { box-shadow:0 0 0 6px rgba(245,168,0,0.12); }
            50%      { box-shadow:0 0 0 10px rgba(245,168,0,0.04); }
        }
        /* Pending state */
        .dot-pending {
            background:rgba(255,255,255,0.04); color:var(--text-dim);
            border:2px solid rgba(255,255,255,0.12);
        }
        /* Delivered done — green */
        .dot-done-green {
            background:var(--green); color:#fff;
            border:2px solid var(--green);
            box-shadow:0 0 0 4px rgba(34,197,94,0.15);
        }
        /* OFD active — teal */
        .dot-active-ofd {
            background:rgba(52,211,153,0.12); color:#34d399;
            border:2px solid #34d399;
            box-shadow:0 0 0 6px rgba(52,211,153,0.12);
            animation:dotPulseOfd 2s ease-in-out infinite;
        }
        @keyframes dotPulseOfd {
            0%,100% { box-shadow:0 0 0 6px rgba(52,211,153,0.12); }
            50%      { box-shadow:0 0 0 10px rgba(52,211,153,0.04); }
        }

        .step-name {
            font-size:0.62rem; font-weight:600; text-align:center;
            margin-top:0.55rem; color:var(--text-dim);
            max-width:72px; line-height:1.3;
        }
        .step-name.s-done   { color:var(--text-light); }
        .step-name.s-active { color:var(--yellow); font-weight:700; }
        .step-name.s-active-ofd { color:#34d399; font-weight:700; }
        .step-name.s-delivered  { color:var(--green); font-weight:700; }

        /* ── DELIVERY SLOT + ADDRESS ── */
        .info-strip {
            display:grid; gap:0.75rem; margin-top:0.5rem;
        }
        .info-row {
            display:flex; align-items:flex-start; gap:0.65rem;
            background:rgba(255,255,255,0.04); border:1px solid var(--glass-border);
            border-radius:10px; padding:0.75rem 1rem; font-size:0.78rem; color:var(--text-light);
        }
        .info-row i { color:var(--yellow); flex-shrink:0; margin-top:0.1rem; font-size:0.85rem; }
        .info-row.slot-row { background:rgba(245,168,0,0.06); border-color:rgba(245,168,0,0.22); }
        .info-row.addr-row { background:rgba(255,255,255,0.03); }
        .info-row.city-row { background:rgba(96,165,250,0.06); border-color:rgba(96,165,250,0.22); }
        .info-row.city-row i { color:#60a5fa; }
        .info-label { font-weight:700; color:var(--text-white); margin-bottom:0.1rem; font-size:0.73rem; }
        .info-val   { color:var(--text-light); font-size:0.78rem; }

        /* Delivered checkmark banner */
        .delivered-banner {
            display:flex; align-items:center; gap:0.75rem;
            background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.3);
            border-radius:12px; padding:0.85rem 1.2rem;
            margin-top:0; font-size:0.82rem; color:#22c55e;
        }
        .delivered-banner i { font-size:1.1rem; flex-shrink:0; }

        /* Cancelled/Refunded banner */
        .inactive-banner {
            display:flex; align-items:center; gap:0.75rem;
            border-radius:12px; padding:0.85rem 1.2rem;
            font-size:0.82rem; margin-top:0;
        }
        .inactive-banner.cancelled { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.3); color:#f87171; }
        .inactive-banner.refunded  { background:rgba(167,139,250,0.08); border:1px solid rgba(167,139,250,0.3); color:#a78bfa; }
        .inactive-banner i { font-size:1rem; flex-shrink:0; }

        /* ── ACTIONS ── */
        .card-actions {
            display:flex; flex-wrap:wrap; gap:0.65rem;
            padding:1.25rem 2rem 1.5rem;
            border-top:1px solid rgba(255,255,255,0.06);
        }
        .btn-action {
            display:inline-flex; align-items:center; gap:0.4rem;
            font-family:'Poppins',sans-serif; font-size:0.75rem; font-weight:600;
            letter-spacing:0.04em; text-transform:uppercase;
            padding:0.5rem 1.1rem; border-radius:8px;
            text-decoration:none; border:1px solid; cursor:pointer; transition:all 0.2s;
        }
        .btn-track-single {
            background:rgba(34,197,94,0.1); border-color:rgba(34,197,94,0.3); color:var(--green);
        }
        .btn-track-single:hover { background:rgba(34,197,94,0.2); border-color:rgba(34,197,94,0.55); color:var(--green); transform:translateY(-1px); }
        .btn-report {
            background:rgba(248,113,113,0.08); border-color:rgba(248,113,113,0.25); color:#f87171;
        }
        .btn-report:hover { background:rgba(248,113,113,0.18); border-color:rgba(248,113,113,0.5); color:#f87171; transform:translateY(-1px); }
        .btn-reorder {
            background:rgba(245,168,0,0.1); border-color:rgba(245,168,0,0.3); color:var(--yellow);
        }
        .btn-reorder:hover { background:rgba(245,168,0,0.2); border-color:rgba(245,168,0,0.55); color:var(--yellow); transform:translateY(-1px); }

        /* ── EMPTY STATE ── */
        .empty-state {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:22px;
            padding:4.5rem 2.5rem; text-align:center;
            width:100%; max-width:900px;
            animation:fadeUp 0.5s ease both;
        }
        .empty-icon { font-size:3.5rem; display:block; margin-bottom:1.25rem; opacity:0.5; }
        .empty-state h3 { font-size:1.2rem; font-weight:700; margin-bottom:0.5rem; }
        .empty-state p  { font-size:0.82rem; color:var(--text-dim); margin-bottom:1.75rem; }
        .btn-shop {
            display:inline-flex; align-items:center; gap:0.5rem;
            background:var(--yellow); color:#1a1000;
            border:none; border-radius:10px; padding:0.7rem 1.75rem;
            font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:700;
            letter-spacing:0.05em; text-transform:uppercase;
            text-decoration:none; cursor:pointer;
            box-shadow:0 4px 16px rgba(245,168,0,0.3); transition:all 0.3s;
        }
        .btn-shop:hover { background:var(--yellow-d); color:#1a1000; transform:translateY(-2px); }
        .back-link {
            display:inline-flex; align-items:center; justify-content:center; gap:0.4rem;
            color:var(--text-dim); text-decoration:none; font-size:0.78rem; transition:color 0.2s;
            width:100%; max-width:900px; margin-top:0.25rem;
        }
        .back-link:hover { color:white; }

        /* ── FOOTER ── */
        footer {
            background:rgba(0,0,0,0.5); backdrop-filter:blur(16px);
            border-top:1px solid var(--glass-border); padding:1.25rem 3rem;
            display:flex; align-items:center; justify-content:space-between;
            flex-wrap:wrap; gap:0.75rem;
        }
        .footer-brand { font-size:1.1rem; font-weight:700; color:white; }
        .footer-brand span { color:var(--yellow); }
        .footer-copy { font-size:0.72rem; color:var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

        .track-card:nth-child(1) { animation-delay:0.05s; }
        .track-card:nth-child(2) { animation-delay:0.10s; }
        .track-card:nth-child(3) { animation-delay:0.15s; }

        /* ── RESPONSIVE ── */
        @media(max-width:700px) {
            nav { padding:0.875rem 1.25rem; }
            .page { padding:5.5rem 1rem 2rem; }
            .page-header { flex-direction:column; text-align:center; }
            .card-inner  { padding:1.25rem 1.25rem 1.5rem; }
            .card-actions { padding:1rem 1.25rem 1.25rem; }
            .stepper-wrap { padding:0 0.5rem; }
            .step-track-bg  { left:calc(0.5rem + 18px); right:calc(0.5rem + 18px); }
            .step-track-fill { left:calc(0.5rem + 18px); }
            .step-dot { width:32px; height:32px; font-size:0.75rem; }
            .step-track-bg, .step-track-fill { top:15px; }
            .step-name { font-size:0.55rem; max-width:52px; }
            .order-right { text-align:left; }
            .item-chips  { justify-content:flex-start; }
            footer { padding:1.25rem; flex-direction:column; text-align:center; }
        }`;

/**
 * TrackOrders Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {Array} props.orders - List of orders
 * @param {Object} props.trackingStepMap - Map of order ID to tracking step (0-6)
 * @param {Object} props.progressWidthMap - Map of order ID to progress width percentage
 */
export default function TrackOrders({
    successMessage = null,
    failureMessage = null,
    orders = [],
    trackingStepMap = {},
    progressWidthMap = {}
}) {
    const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    const [reorderState, setReorderState] = useState({});
    const [animateBars, setAnimateBars] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        
        // Trigger animation of progress bars after a slight delay
        const animTimer = setTimeout(() => {
            setAnimateBars(true);
        }, 200);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(animTimer);
        };
    }, []);

    // Alerts timeout
    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => setFadeAlerts(true), 2500);
            const timer2 = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 3000);
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        }
    }, [showSuccess, showFailure]);

    const handleQuickReorder = (orderId) => {
        setReorderState(prev => ({ ...prev, [orderId]: 'loading' }));

        authFetch(`/api/orders/${orderId}/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                setReorderState(prev => ({ ...prev, [orderId]: 'success' }));
                setTimeout(() => { navigate('/cart'); }, 1200);
            } else {
                setReorderState(prev => ({ ...prev, [orderId]: null }));
                alert(data.message || 'Reorder failed');
            }
        })
        .catch(() => {
            setReorderState(prev => ({ ...prev, [orderId]: null }));
            alert('Network error. Please try again.');
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Date unavailable';
        const d = new Date(dateString);
        if (isNaN(d)) return dateString;
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    const getStatusText = (step) => {
        switch(step) {
            case 0: return 'Processing';
            case 1: return 'Packed';
            case 2: return 'Shipped';
            case 3: return 'Out for Delivery';
            case 4: return 'Delivered ✓';
            case 5: return 'Refunded';
            case 6: return 'Cancelled';
            default: return 'Processing';
        }
    };

    const getCardStatusClass = (step) => {
        if (step === 6) return 'status-cancelled';
        if (step === 5) return 'status-refunded';
        if (step === 4) return 'status-delivered';
        if (step === 3) return 'status-ofd';
        if (step === 2) return 'status-shipped';
        if (step === 1) return 'status-packed';
        return 'status-processing';
    };

    const getBadgeClass = (step) => {
        if (step === 6) return 'badge-cancelled';
        if (step === 5) return 'badge-refunded';
        if (step === 4) return 'badge-delivered';
        if (step === 3) return 'badge-ofd';
        if (step === 2) return 'badge-shipped';
        if (step === 1) return 'badge-packed';
        return 'badge-processing';
    };

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Track Orders</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={alertStyle}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }}></i>
                    Ek<span>art</span>
                </a>
                <div className="nav-right">
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link"><i className="fas fa-th-large"></i><span> Home</span></a>
                    <Link to="/search" className="nav-link"><i className="fas fa-search"></i><span> Search</span></Link>
                    <Link to="/view-orders" className="nav-link"><i className="fas fa-box-open"></i><span> Orders</span></Link>
                    <Link to="/track" className="nav-link active"><i className="fas fa-truck"></i><span> Track</span></Link>
                    <Link to="/wishlist" className="nav-link" style={{ borderColor: 'rgba(239,68,68,0.3)' }}><i className="fas fa-heart" style={{ color: '#ef4444' }}></i><span> Wishlist</span></Link>
                    <Link to="/cart" className="nav-link cart-link"><i className="fas fa-shopping-cart"></i><span> Cart</span></Link>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link logout-link"><i className="fas fa-sign-out-alt"></i><span> Logout</span></a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1><span>Track</span> Orders</h1>
                        <p>Real-time delivery status for all your orders.</p>
                    </div>
                    <div className="page-header-icon">🚚</div>
                </div>

                {orders && orders.length > 0 ? (
                    <>
                        <div className="section-label"><i className="fas fa-truck"></i> Your Orders</div>

                        {orders.map(o => {
                            const step = trackingStepMap[o.id] || 0;
                            const progress = progressWidthMap[o.id] || 0;
                            const isPulsing = step < 4 && step !== 5 && step !== 6;

                            return (
                                <div key={o.id} className={`track-card ${getCardStatusClass(step)}`}>
                                    <div className="card-inner">
                                        <div className="order-top">
                                            <div>
                                                <div className="order-id-row">
                                                    <i className="fas fa-receipt"></i>
                                                    Order&nbsp;<strong>#{o.id}</strong>
                                                </div>
                                                <div className="order-date">
                                                    <i className="fas fa-calendar-alt" style={{ fontSize: '0.65rem' }}></i>
                                                    <span>{formatDate(o.orderDate)}</span>
                                                </div>
                                            </div>
                                            <div className="order-right">
                                                <span className={`status-badge ${getBadgeClass(step)}`}>
                                                    <span className={`badge-dot ${isPulsing ? 'pulsing' : ''}`}></span>
                                                    <span>{getStatusText(step)}</span>
                                                </span>

                                                <div className="order-amount">₹{o.amount}</div>
                                                <div className="item-chips">
                                                    {o.items && o.items.map((it, idx) => (
                                                        <span key={idx} className="item-chip">
                                                            {it.name} × {it.quantity}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card-divider"></div>

                                        {step < 5 && (
                                            <div className="stepper-wrap">
                                                <div className="step-track-bg"></div>
                                                <div 
                                                    className="step-track-fill" 
                                                    style={{ width: animateBars ? `calc((${progress}% / 100) * (100% - 40px))` : '0%' }}
                                                ></div>

                                                <div className="steps-row">
                                                    {/* 1. Placed */}
                                                    <div className="step">
                                                        <div className="step-dot dot-done"><i className="fas fa-check"></i></div>
                                                        <div className="step-name s-done">Placed</div>
                                                    </div>

                                                    {/* 2. Processing */}
                                                    <div className="step">
                                                        <div className={`step-dot ${step > 0 ? 'dot-done' : 'dot-active'}`}>
                                                            <i className={`fas ${step > 0 ? 'fa-check' : 'fa-cog'}`}></i>
                                                        </div>
                                                        <div className={`step-name ${step > 0 ? 's-done' : 's-active'}`}>Processing</div>
                                                    </div>

                                                    {/* 3. Packed */}
                                                    <div className="step">
                                                        <div className={`step-dot ${step > 1 ? 'dot-done' : step === 1 ? 'dot-active' : 'dot-pending'}`}>
                                                            <i className={`fas ${step > 1 ? 'fa-check' : 'fa-box'}`}></i>
                                                        </div>
                                                        <div className={`step-name ${step > 1 ? 's-done' : step === 1 ? 's-active' : ''}`}>Packed</div>
                                                    </div>

                                                    {/* 4. Shipped */}
                                                    <div className="step">
                                                        <div className={`step-dot ${step > 2 ? 'dot-done' : step === 2 ? 'dot-active' : 'dot-pending'}`}>
                                                            <i className={`fas ${step > 2 ? 'fa-check' : 'fa-shipping-fast'}`}></i>
                                                        </div>
                                                        <div className={`step-name ${step > 2 ? 's-done' : step === 2 ? 's-active' : ''}`}>Shipped</div>
                                                    </div>

                                                    {/* 5. Out for Delivery */}
                                                    <div className="step">
                                                        <div className={`step-dot ${step > 3 ? 'dot-done' : step === 3 ? 'dot-active-ofd' : 'dot-pending'}`}>
                                                            <i className={`fas ${step > 3 ? 'fa-check' : 'fa-truck'}`}></i>
                                                        </div>
                                                        <div className={`step-name ${step > 3 ? 's-done' : step === 3 ? 's-active-ofd' : ''}`}>Out for Delivery</div>
                                                    </div>

                                                    {/* 6. Delivered */}
                                                    <div className="step">
                                                        <div className={`step-dot ${step >= 4 ? 'dot-done-green' : 'dot-pending'}`}>
                                                            <i className={`fas ${step >= 4 ? 'fa-check' : 'fa-house'}`}></i>
                                                        </div>
                                                        <div className={`step-name ${step >= 4 ? 's-delivered' : ''}`}>Delivered</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="info-strip">
                                            {step === 4 && (
                                                <div className="delivered-banner">
                                                    <i className="fas fa-circle-check"></i>
                                                    <span>Your order has been delivered! We hope you enjoy it. 🎉</span>
                                                </div>
                                            )}

                                            {step === 6 && (
                                                <div className="inactive-banner cancelled">
                                                    <i className="fas fa-times-circle"></i>
                                                    <span>This order was cancelled. Stock has been restocked. Contact support if you need help.</span>
                                                </div>
                                            )}

                                            {step === 5 && (
                                                <div className="inactive-banner refunded">
                                                    <i className="fas fa-rotate-left"></i>
                                                    <span>Refund processed for this order. Please allow 5–7 business days for the amount to reflect.</span>
                                                </div>
                                            )}

                                            {o.currentCity && step > 0 && step < 4 && (
                                                <div className="info-row city-row">
                                                    <i className="fas fa-map-pin"></i>
                                                    <div>
                                                        <div className="info-label">Current Location</div>
                                                        <div className="info-val">{o.currentCity}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {o.deliveryTime ? (
                                                <div className="info-row slot-row">
                                                    <i className="fas fa-calendar-check"></i>
                                                    <div>
                                                        <div className="info-label">Expected Delivery Slot</div>
                                                        <div className="info-val">{o.deliveryTime}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="info-row">
                                                    <i className="fas fa-info-circle" style={{ color: 'var(--text-dim)' }}></i>
                                                    <div>
                                                        <div className="info-label" style={{ color: 'var(--text-dim)' }}>Delivery Slot</div>
                                                        <div className="info-val" style={{ color: 'var(--text-dim)' }}>No delivery slot selected for this order.</div>
                                                    </div>
                                                </div>
                                            )}

                                            {o.deliveryAddress && (
                                                <div className="info-row addr-row">
                                                    <i className="fas fa-location-dot"></i>
                                                    <div>
                                                        <div className="info-label">Delivering To</div>
                                                        <div className="info-val">{o.deliveryAddress}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-actions">
                                        {step < 4 && step !== 6 && (
                                            <a href={`/track/${o.id}`} className="btn-action btn-track-single">
                                                <i className="fas fa-location-dot"></i> Live Track
                                            </a>
                                        )}
                                        {step !== 5 && step !== 6 && (
                                            <a href={`/customer/refund/report/${o.id}`} className="btn-action btn-report">
                                                <i className="fas fa-shield-halved"></i> Report Issue
                                            </a>
                                        )}
                                        {step === 4 && (
                                            <button 
                                                type="button" 
                                                className="btn-action btn-reorder" 
                                                onClick={() => handleQuickReorder(o.id)}
                                                disabled={reorderState[o.id] === 'loading'}
                                                style={reorderState[o.id] === 'success' ? { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' } : {}}
                                            >
                                                {reorderState[o.id] === 'loading' ? (
                                                    <><i className="fas fa-circle-notch fa-spin"></i> Adding...</>
                                                ) : reorderState[o.id] === 'success' ? (
                                                    <><i className="fas fa-check"></i> Added!</>
                                                ) : (
                                                    <><i className="fas fa-rotate-right"></i> Reorder</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="back-link">
                            <i className="fas fa-arrow-left"></i>&nbsp;Back to Home
                        </a>
                    </>
                ) : (
                    <div className="empty-state">
                        <span className="empty-icon">🚚</span>
                        <h3>No Orders to Track</h3>
                        <p>Once you place an order, you can follow its journey here in real time.</p>
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-shop"><i className="fas fa-shopping-bag"></i> Browse Products</a>
                        <br />
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="back-link" style={{ marginTop: '1.25rem' }}>
                            <i className="fas fa-arrow-left"></i>&nbsp;Back to Home
                        </a>
                    </div>
                )}
            </main>

            <footer>
                <div className="footer-brand">Ek<span>art</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
        </>
    );
}