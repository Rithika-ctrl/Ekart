import React, { useState, useEffect } from 'react';

const CSS = `
        :root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255,255,255,0.22);
            --glass-card:   rgba(255,255,255,0.13);
            --glass-nav:    rgba(0,0,0,0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
        }

        /* blurred bg */
        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: '';
            position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px);
            transform: scale(1.08);
        }
        .bg-layer::after {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(180deg,
                rgba(5,8,20,0.82) 0%,
                rgba(8,12,28,0.78) 40%,
                rgba(5,8,20,0.88) 100%);
        }

        /* ── NAVBAR ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border);
            transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }

        .nav-brand {
            font-size: 1.6rem; font-weight: 700;
            color: var(--text-white); text-decoration: none;
            letter-spacing: 0.04em;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }

        .nav-right { display: flex; align-items: center; gap: 0.75rem; }

        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border); transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); text-decoration: none; }
        .nav-link-btn.active { color: var(--yellow); border-color: rgba(245,168,0,0.4); background: rgba(245,168,0,0.08); }

        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); text-decoration: none; }

        /* ── ALERTS ── */
        .alert-stack {
            position: fixed; top: 5rem; right: 1.5rem;
            z-index: 200; display: flex; flex-direction: column; gap: 0.5rem;
        }
        .ek-alert {
            padding: 0.875rem 1.25rem;
            background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px;
            display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px;
            animation: slideIn 0.3s ease both;
        }
        .ek-alert-success { border-color: rgba(245,168,0,0.4); color: var(--yellow); }
        .ek-alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 1.5rem;
        }

        /* ── PAGE HEADER ── */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; width: 100%; max-width: 820px;
            animation: fadeUp 0.5s ease both;
            position: relative; overflow: hidden;
        }
        .page-header::before {
            content: '';
            position: absolute; top: -50px; right: -50px;
            width: 180px; height: 180px;
            background: radial-gradient(circle, rgba(245,168,0,0.1), transparent 70%);
            border-radius: 50%;
        }
        .page-header-left h1 {
            font-size: clamp(1.2rem, 2.5vw, 1.75rem); font-weight: 700; margin-bottom: 0.25rem;
        }
        .page-header-left h1 span { color: var(--yellow); }
        .page-header-left p { font-size: 0.825rem; color: var(--text-dim); }
        .page-header-icon {
            width: 60px; height: 60px;
            background: rgba(245,168,0,0.12);
            border: 2px solid rgba(245,168,0,0.28);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; flex-shrink: 0;
        }

        /* ── SUMMARY BAR ── */
        .summary-bar {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            width: 100%; max-width: 820px;
            animation: fadeUp 0.5s ease 0.05s both;
        }
        @media(max-width:500px) { .summary-bar { grid-template-columns: 1fr 1fr; } }

        .summary-stat {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 18px 20px;
            position: relative; overflow: hidden;
            transition: border-color 0.2s, transform 0.2s;
        }
        .summary-stat::after {
            content: '';
            position: absolute; top: -24px; right: -24px;
            width: 80px; height: 80px;
            background: radial-gradient(circle, rgba(245,168,0,0.1), transparent 70%);
            border-radius: 50%;
        }
        .summary-stat:hover { border-color: rgba(245,168,0,0.35); transform: translateY(-2px); }
        .summary-num {
            font-size: 26px; font-weight: 800;
            color: var(--yellow); line-height: 1.1;
        }
        .summary-label {
            font-size: 10px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.1em;
            color: var(--text-dim); margin-top: 4px;
        }

        /* ── SECTION TITLE ── */
        .section-title {
            display: flex; align-items: center; gap: 0.6rem;
            font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.12em;
            color: var(--yellow);
            width: 100%; max-width: 820px;
        }
        .section-title::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

        /* ── ORDER CARD ── */
        .order-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 22px 26px;
            width: 100%; max-width: 820px;
            position: relative; overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.25);
            transition: border-color 0.25s, transform 0.25s;
            animation: fadeUp 0.5s ease both;
        }
        .order-card::before {
            content: '';
            position: absolute; left: 0; top: 0; bottom: 0;
            width: 3px;
            background: linear-gradient(180deg, var(--yellow), rgba(245,168,0,0.2));
            border-radius: 3px 0 0 3px;
        }
        .order-card:hover {
            border-color: rgba(245,168,0,0.35);
            transform: translateY(-2px);
        }

        /* card top */
        .card-top {
            display: flex; justify-content: space-between;
            align-items: flex-start; flex-wrap: wrap;
            gap: 8px; margin-bottom: 14px;
        }
        .order-id {
            font-size: 15px; font-weight: 700;
            color: var(--text-white);
            display: flex; align-items: center; gap: 8px;
        }
        .id-chip {
            background: rgba(245,168,0,0.12);
            border: 1px solid rgba(245,168,0,0.28);
            color: var(--yellow);
            font-size: 11px; font-weight: 700;
            padding: 3px 10px; border-radius: 50px;
        }
        .order-date {
            font-size: 12px; color: var(--text-dim);
            display: flex; align-items: center; gap: 6px;
        }

        /* badges */
        .badge-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px; }
        .badge {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 4px 12px; border-radius: 50px;
            font-size: 11px; font-weight: 700;
            border: 1px solid;
        }
        /* only gold and white — no other colours */
        .badge-placed {
            background: rgba(245,168,0,0.1);
            border-color: rgba(245,168,0,0.28);
            color: var(--yellow);
        }
        .badge-amount {
            background: rgba(255,255,255,0.07);
            border-color: var(--glass-border);
            color: var(--text-light);
            font-size: 12px;
        }
        .badge-delivery {
            background: rgba(255,255,255,0.06);
            border-color: var(--glass-border);
            color: var(--text-dim);
        }
        .badge-free {
            background: rgba(245,168,0,0.08);
            border-color: rgba(245,168,0,0.22);
            color: var(--yellow);
        }
        .badge-cod {
            background: rgba(245,168,0,0.08);
            border-color: rgba(245,168,0,0.22);
            color: var(--yellow);
        }

        /* divider */
        .card-divider { height: 1px; background: var(--glass-border); margin: 14px 0; }

        /* detail rows */
        .detail-row {
            display: flex; align-items: baseline; gap: 10px;
            font-size: 13px; color: var(--text-dim);
            margin-bottom: 8px;
        }
        .detail-row:last-child { margin-bottom: 0; }
        .detail-key {
            font-size: 10px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.08em;
            color: rgba(255,255,255,0.28);
            min-width: 62px; flex-shrink: 0;
        }

        /* item chips */
        .item-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .item-chip {
            display: inline-flex; align-items: center; gap: 4px;
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--glass-border);
            color: var(--text-dim);
            padding: 3px 10px; border-radius: 50px;
            font-size: 11.5px; font-weight: 500;
        }

        /* payment code */
        .pay-code {
            font-family: 'Courier New', monospace; font-size: 11.5px;
            color: var(--yellow);
            background: rgba(245,168,0,0.08);
            border: 1px solid rgba(245,168,0,0.2);
            padding: 2px 8px; border-radius: 6px;
        }

        /* card actions */
        .card-actions {
            margin-top: 16px;
            padding-top: 14px;
            border-top: 1px solid var(--glass-border);
            display: flex;
            gap: 10px;
        }
        .btn-track {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 8px;
            font-size: 12px; font-weight: 600;
            background: rgba(34, 197, 94, 0.12);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #22c55e;
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn-track:hover {
            background: rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.5);
            color: #22c55e;
            text-decoration: none;
            transform: translateY(-1px);
        }

        /* ── REORDER BUTTON ── */
        .btn-reorder {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 8px;
            font-size: 12px; font-weight: 600;
            background: rgba(245, 168, 0, 0.12);
            border: 1px solid rgba(245, 168, 0, 0.3);
            color: var(--yellow);
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
        }
        .btn-reorder:hover {
            background: rgba(245, 168, 0, 0.2);
            border-color: rgba(245, 168, 0, 0.5);
            transform: translateY(-1px);
        }
        .btn-reorder:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .btn-reorder .spinner {
            width: 14px; height: 14px;
            border: 2px solid rgba(245, 168, 0, 0.3);
            border-top-color: var(--yellow);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* ── TOAST NOTIFICATIONS ── */
        .toast-container {
            position: fixed;
            bottom: 2rem;
            right: 1.5rem;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .toast {
            padding: 0.875rem 1.25rem;
            background: rgba(10,12,30,0.95);
            backdrop-filter: blur(16px);
            border: 1px solid;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 0.625rem;
            font-size: 0.825rem;
            min-width: 280px;
            max-width: 400px;
            animation: toastIn 0.3s ease both;
        }
        .toast-success {
            border-color: rgba(34, 197, 94, 0.45);
            color: #22c55e;
        }
        .toast-warning {
            border-color: rgba(245, 168, 0, 0.45);
            color: var(--yellow);
        }
        .toast-error {
            border-color: rgba(255, 100, 80, 0.45);
            color: #ff8060;
        }
        .toast-close {
            margin-left: auto;
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            opacity: 0.6;
            font-size: 1rem;
        }
        @keyframes toastIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }

        /* ── REORDER MODAL ── */
        .modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            z-index: 500;
            align-items: center;
            justify-content: center;
        }
        .modal-overlay.active { display: flex; }
        .modal {
            background: rgba(20,20,40,0.95);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem;
            max-width: 450px;
            width: 90%;
            animation: modalIn 0.3s ease;
        }
        @keyframes modalIn {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-icon {
            width: 60px; height: 60px;
            margin: 0 auto 1.5rem;
            background: rgba(245, 168, 0, 0.15);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.75rem;
            color: var(--yellow);
        }
        .modal h3 {
            font-size: 1.25rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.75rem;
        }
        .modal p {
            font-size: 0.9rem;
            color: var(--text-dim);
            text-align: center;
            line-height: 1.6;
            margin-bottom: 1rem;
        }
        .modal-items {
            background: rgba(0,0,0,0.2);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            max-height: 150px;
            overflow-y: auto;
        }
        .modal-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            font-size: 0.85rem;
        }
        .modal-item:last-child { border-bottom: none; }
        .modal-item-name { color: var(--text-light); }
        .modal-item-status {
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 20px;
        }
        .modal-item-status.in-stock {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
        }
        .modal-item-status.out-of-stock {
            background: rgba(255, 100, 80, 0.15);
            color: #ff8060;
        }
        .modal-item-status.partial {
            background: rgba(245, 168, 0, 0.15);
            color: var(--yellow);
        }
        .modal-warning {
            font-size: 0.8rem;
            color: var(--yellow);
            background: rgba(245, 168, 0, 0.1);
            border: 1px solid rgba(245, 168, 0, 0.3);
            border-radius: 8px;
            padding: 0.75rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
        }
        .modal-btns {
            display: flex;
            gap: 1rem;
        }
        .modal-btn {
            flex: 1;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
        }
        .modal-btn.cancel {
            background: rgba(255,255,255,0.1);
            border: 1px solid var(--glass-border);
            color: var(--text-light);
        }
        .modal-btn.cancel:hover { background: rgba(255,255,255,0.15); }
        .modal-btn.confirm {
            background: var(--yellow);
            border: none;
            color: #1a1000;
        }
        .modal-btn.confirm:hover { background: var(--yellow-d); }
        .modal-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* ── EMPTY STATE ── */
        .empty-state {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 52px 32px; text-align: center;
            width: 100%; max-width: 820px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.25);
            animation: fadeUp 0.5s ease both;
        }
        .empty-icon {
            width: 72px; height: 72px;
            background: rgba(245,168,0,0.1);
            border: 2px solid rgba(245,168,0,0.25);
            border-radius: 18px;
            display: inline-flex; align-items: center; justify-content: center;
            font-size: 28px; color: var(--yellow);
            margin-bottom: 18px;
        }
        .empty-state h3 { font-size: 18px; font-weight: 700; color: var(--text-white); margin-bottom: 8px; }
        .empty-state p  { font-size: 13.5px; color: var(--text-dim); margin-bottom: 22px; }

        /* ── BUTTONS ── */
        .btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            padding: 11px 22px; border-radius: 12px;
            font-family: 'Poppins', sans-serif;
            font-size: 13px; font-weight: 700;
            text-decoration: none; transition: all 0.25s;
            border: none; cursor: pointer; letter-spacing: 0.03em;
        }
        .btn-primary {
            background: var(--yellow); color: #1a1000;
            box-shadow: 0 8px 24px rgba(245,168,0,0.25);
        }
        .btn-primary:hover {
            background: var(--yellow-d); transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(245,168,0,0.42);
            color: #1a1000; text-decoration: none;
        }
        .btn-ghost {
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            color: var(--text-light);
        }
        .btn-ghost:hover {
            background: rgba(255,255,255,0.11);
            border-color: rgba(255,255,255,0.35);
            color: var(--text-white); text-decoration: none;
        }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: var(--text-white); }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp  { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:translateX(0); } }

        @media(max-width:700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }
`;

/**
 * OrderHistory Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {Array} props.orders - List of past orders for the customer
 */
export default function OrderHistory({
    successMessage = null,
    failureMessage = null,
    orders = []
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    
    // Toast and Reorder State
    const [toasts, setToasts] = useState([]);
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState(null);
    const [processingOrderId, setProcessingOrderId] = useState(null);
    const [isConfirmingReorder, setIsConfirmingReorder] = useState(false);
    const [reorderData, setReorderData] = useState({ items: [], hasOutOfStock: false });

    // Totals calculation
    const totalSpent = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
    const totalItems = orders.reduce((sum, o) => sum + (o.items ? o.items.length : 0), 0);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Initial alert auto-dismiss
    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => {
                setFadeAlerts(true);
            }, 2500);
            const timer2 = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 3000);
            
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, [showSuccess, showFailure]);

    // Toast auto-remove
    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts(prev => prev.slice(1));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    const addToast = (message, type = 'success') => {
        setToasts(prev => [...prev, { id: Date.now(), message, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Date unavailable';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleString('en-IN', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
    };

    const handleInitiateReorder = async (orderId) => {
        setCurrentOrderId(orderId);
        setProcessingOrderId(orderId);

        try {
            const response = await fetch(`/api/orders/${orderId}/check-stock`);
            const data = await response.json();

            if (!response.ok) {
                addToast(data.message || 'Failed to check stock', 'error');
                setProcessingOrderId(null);
                return;
            }

            setReorderData({
                items: data.items || [],
                hasOutOfStock: !!data.hasOutOfStock
            });
            setIsReorderModalOpen(true);
        } catch (error) {
            addToast('Network error. Please try again.', 'error');
        } finally {
            setProcessingOrderId(null);
        }
    };

    const handleCloseReorderModal = () => {
        setIsReorderModalOpen(false);
        setCurrentOrderId(null);
    };

    const handleConfirmReorder = async () => {
        if (!currentOrderId) return;
        setIsConfirmingReorder(true);

        try {
            const response = await fetch(`/api/orders/${currentOrderId}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            handleCloseReorderModal();

            if (data.success) {
                if (data.outOfStockItems && data.outOfStockItems.length > 0) {
                    addToast(`${data.totalItemsAdded} items added to cart. Some items were unavailable.`, 'warning');
                    data.outOfStockItems.forEach((item, index) => {
                        setTimeout(() => addToast(item, 'warning'), (index + 1) * 500);
                    });
                } else {
                    addToast(data.message, 'success');
                }

                setTimeout(() => {
                    window.location.href = '/customer/view-cart';
                }, 1500);
            } else {
                addToast(data.message || 'Failed to reorder', 'error');
            }

        } catch (error) {
            handleCloseReorderModal();
            addToast('Network error. Please try again.', 'error');
        } finally {
            setIsConfirmingReorder(false);
        }
    };

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Order History - Ekart</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {showSuccess && (
                    <div className="ek-alert ek-alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="ek-alert ek-alert-danger" style={alertStyle}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            {/* NAVBAR */}
            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </a>
                <div className="nav-right">
                    <a href="/customer/view-products" className="nav-link-btn"><i className="fas fa-store"></i> Shop</a>
                    <a href="/customer/view-cart"     className="nav-link-btn"><i class="fas fa-shopping-cart"></i> Cart</a>
                    <a href="/customer/order-history" className="nav-link-btn active"><i className="fas fa-history"></i> Orders</a>
                    <a href="/customer/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            {/* PAGE */}
            <main className="page">

                {/* Page Header */}
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Order <span>History</span> 📦</h1>
                        <p>A complete record of all your past purchases.</p>
                    </div>
                    <div className="page-header-icon">🧾</div>
                </div>

                {/* Summary Bar */}
                {orders && orders.length > 0 && (
                    <div className="summary-bar">
                        <div className="summary-stat">
                            <div className="summary-num">{orders.length}</div>
                            <div className="summary-label">Total Orders</div>
                        </div>
                        <div className="summary-stat">
                            <div className="summary-num">₹{totalSpent.toFixed(2)}</div>
                            <div className="summary-label">Total Spent</div>
                        </div>
                        <div className="summary-stat">
                            <div className="summary-num">{totalItems}</div>
                            <div className="summary-label">Items Bought</div>
                        </div>
                    </div>
                )}

                {/* Section label */}
                {orders && orders.length > 0 && (
                    <div className="section-title">
                        <i className="fas fa-truck"></i> Your Orders
                    </div>
                )}

                {/* ORDER CARDS */}
                {orders && orders.length > 0 ? (
                    orders.map(o => (
                        <div key={o.id} className="order-card">
                            <div className="card-top">
                                <div className="order-id">
                                    <i className="fas fa-receipt" style={{ color: 'var(--yellow)', fontSize: '14px' }}></i>
                                    Order <span className="id-chip">#{o.id}</span>
                                </div>
                                <div className="order-date">
                                    <i className="fas fa-calendar-alt"></i>
                                    <span>{formatDate(o.orderDate)}</span>
                                </div>
                            </div>

                            <div className="badge-row">
                                <span className="badge badge-placed"><i className="fas fa-check-circle"></i> Placed</span>
                                <span className="badge badge-amount">₹<span>{o.amount}</span></span>
                                {o.deliveryTime && (
                                    <span className="badge badge-delivery">
                                        <i className="fas fa-clock"></i><span>{o.deliveryTime}</span>
                                    </span>
                                )}
                                {o.deliveryCharge === 0 && (
                                    <span className="badge badge-free">
                                        <i className="fas fa-gift"></i> Free Delivery
                                    </span>
                                )}
                            </div>

                            <div className="card-divider"></div>

                            {o.totalPrice > 0 && (
                                <div className="detail-row">
                                    <span className="detail-key">Subtotal</span>
                                    <span>
                                        ₹<span>{o.totalPrice}</span>
                                        {o.deliveryCharge > 0 && (
                                            <span style={{ color: 'rgba(255,255,255,0.28)', marginLeft: '6px' }}>
                                                + ₹<span>{o.deliveryCharge}</span> delivery
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}

                            {/* GST breakdown line */}
                            {o.gstAmount > 0 && (
                                <div className="detail-row">
                                    <span className="detail-key" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <i className="fas fa-file-invoice" style={{ fontSize: '0.65rem', color: 'var(--yellow)' }}></i>
                                        GST
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
                                        ₹<span>{parseFloat(o.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginLeft: '4px' }}>(incl. in price)</span>
                                    </span>
                                </div>
                            )}

                            {o.items && o.items.length > 0 && (
                                <div className="detail-row">
                                    <span className="detail-key">Items</span>
                                    <div className="item-chips">
                                        {o.items.map((it, idx) => (
                                            <span key={idx} className="item-chip">
                                                <i className="fas fa-box" style={{ fontSize: '9px', opacity: 0.45 }}></i>
                                                <span>{it.name} × {it.quantity}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {o.razorpay_payment_id && o.razorpay_payment_id !== 'COD_NA' && (
                                <div className="detail-row">
                                    <span className="detail-key">Pay ID</span>
                                    <span className="pay-code">{o.razorpay_payment_id}</span>
                                </div>
                            )}
                            {o.razorpay_payment_id === 'COD_NA' && (
                                <div className="detail-row">
                                    <span className="detail-key">Payment</span>
                                    <span className="badge badge-cod"><i className="fas fa-money-bill-wave"></i> Cash on Delivery</span>
                                </div>
                            )}

                            {/* Track Order Button */}
                            {(!o.trackingStatus || o.trackingStatus !== 'DELIVERED') && (
                                <div className="card-actions">
                                    <a href={`/track/${o.id}`} className="btn btn-track">
                                        <i className="fas fa-truck"></i> Track Order
                                    </a>
                                </div>
                            )}

                            {/* Re-Order Button */}
                            {o.trackingStatus === 'DELIVERED' && (
                                <div className="card-actions">
                                    <button 
                                        type="button" 
                                        className="btn-reorder" 
                                        disabled={processingOrderId === o.id}
                                        onClick={() => handleInitiateReorder(o.id)}
                                    >
                                        {processingOrderId === o.id ? (
                                            <><span className="spinner"></span> Checking...</>
                                        ) : (
                                            <><i className="fas fa-redo"></i> Re-Order</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Report Issue */}
                            <div className="card-actions">
                                <a href={`/customer/refund/report/${o.id}`}
                                   style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)' }}
                                   className="btn btn-track">
                                    <i className="fas fa-shield-alt"></i> Report Issue
                                </a>
                            </div>

                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon"><i className="fas fa-box-open"></i></div>
                        <h3>No Orders Yet</h3>
                        <p>Your past purchases will show up here once you start shopping.</p>
                        <a href="/customer/view-products" className="btn btn-primary">
                            <i className="fas fa-store"></i> Browse Products
                        </a>
                    </div>
                )}

                {/* Back */}
                <a href="/customer/home" className="btn btn-ghost">
                    <i className="fas fa-arrow-left"></i> Back to Home
                </a>

            </main>

            {/* FOOTER */}
            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">&#169; 2026 Ekart. All rights reserved.</div>
            </footer>

            {/* TOAST CONTAINER */}
            <div className="toast-container" id="toastContainer">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : toast.type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle'}`}></i>
                        <span>{toast.message}</span>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>×</button>
                    </div>
                ))}
            </div>

            {/* REORDER CONFIRMATION MODAL */}
            {isReorderModalOpen && (
                <div className="modal-overlay active" onClick={(e) => { if(e.target === e.currentTarget) handleCloseReorderModal(); }}>
                    <div className="modal">
                        <div className="modal-icon">
                            <i className="fas fa-redo"></i>
                        </div>
                        <h3>Re-Order Items</h3>
                        <p>This will replace your current cart with items from this order:</p>
                        <div className="modal-items">
                            {reorderData.items.map((item, idx) => {
                                const statusClass = item.status === 'in_stock' ? 'in-stock' : 
                                                  item.status === 'out_of_stock' ? 'out-of-stock' : 'partial';
                                const statusText = item.status === 'in_stock' ? 'In Stock' : 
                                                 item.status === 'out_of_stock' ? 'Out of Stock' : 
                                                 `Only ${item.currentStock} left`;
                                return (
                                    <div key={idx} className="modal-item">
                                        <span className="modal-item-name">{item.name} × {item.quantity}</span>
                                        <span className={`modal-item-status ${statusClass}`}>{statusText}</span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {reorderData.hasOutOfStock && (
                            <div className="modal-warning">
                                <i className="fas fa-exclamation-triangle"></i>
                                <span>Some items are out of stock or have limited availability. Available items will still be added to your cart.</span>
                            </div>
                        )}
                        
                        <div className="modal-btns">
                            <button className="modal-btn cancel" onClick={handleCloseReorderModal}>Cancel</button>
                            <button 
                                className="modal-btn confirm" 
                                disabled={isConfirmingReorder}
                                onClick={handleConfirmReorder}
                            >
                                {isConfirmingReorder ? (
                                    <><span className="spinner"></span> Processing...</>
                                ) : (
                                    <><i className="fas fa-check"></i> Confirm</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}