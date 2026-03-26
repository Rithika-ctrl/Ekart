import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';

const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255,255,255,0.22);
            --glass-card:   rgba(255,255,255,0.13);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
            --input-bg:     rgba(255,255,255,0.07);
            --input-border: rgba(255,255,255,0.18);
            --success:      #22c55e;
            --danger:       #ff6060;
        }

        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; }

        #root {
            font-family:'Poppins', sans-serif;
            min-height:100vh;
            color:var(--text-white);
            display:flex; flex-direction:column;
        }

        /* ── BACKGROUND ── */
        .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
        .bg-layer::before {
            content:'';
            position:absolute; inset:-20px;
            background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter:blur(6px); transform:scale(1.08);
        }
        .bg-layer::after {
            content:''; position:absolute; inset:0;
            background:linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

        /* ── NAV ── */
        nav {
            position:fixed; top:0; left:0; right:0; z-index:100;
            padding:1rem 3rem;
            display:flex; align-items:center; justify-content:space-between;
            background:rgba(0,0,0,0.25); backdrop-filter:blur(14px);
            border-bottom:1px solid var(--glass-border); transition:background 0.3s;
        }
        nav.scrolled { background:rgba(0,0,0,0.5); }
        .nav-brand {
            font-size:1.6rem; font-weight:700; color:var(--text-white);
            text-decoration:none; letter-spacing:0.04em;
            display:flex; align-items:center; gap:0.5rem;
        }
        .nav-brand span { color:var(--yellow); }
        .nav-right { display:flex; align-items:center; gap:0.75rem; }
        .nav-link-btn {
            display:flex; align-items:center; gap:0.4rem;
            color:var(--text-light); text-decoration:none;
            font-size:0.82rem; font-weight:500;
            padding:0.45rem 0.9rem; border-radius:6px;
            border:1px solid var(--glass-border); transition:all 0.2s;
        }
        .nav-link-btn:hover { color:white; background:rgba(255,255,255,0.1); }
        .btn-logout {
            display:flex; align-items:center; gap:0.4rem;
            color:var(--text-light); text-decoration:none;
            font-size:0.82rem; font-weight:500;
            padding:0.45rem 0.9rem; border-radius:6px;
            border:1px solid rgba(255,100,80,0.3); transition:all 0.2s;
        }
        .btn-logout:hover { color:#ff8060; border-color:rgba(255,100,80,0.6); background:rgba(255,100,80,0.08); }

        /* ── ALERTS ── */
        .alert-stack { position:fixed; top:5rem; right:1.5rem; z-index:200; display:flex; flex-direction:column; gap:0.5rem; }
        .alert {
            padding:0.875rem 1.25rem; background:rgba(10,12,30,0.88); backdrop-filter:blur(16px);
            border:1px solid; border-radius:10px; display:flex; align-items:center; gap:0.625rem;
            font-size:0.825rem; min-width:260px; animation:slideIn 0.3s ease both;
        }
        .alert-success { border-color:rgba(34,197,94,0.45); color:#22c55e; }
        .alert-danger  { border-color:rgba(255,100,80,0.45); color:#ff8060; }
        .alert-close { margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; opacity:0.6; font-size:1rem; }

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
            width:100%; max-width:580px;
            animation:fadeUp 0.5s ease both;
        }
        .page-header-left h1 { font-size:clamp(1.2rem,2.5vw,1.75rem); font-weight:700; margin-bottom:0.25rem; }
        .page-header-left h1 span { color:var(--yellow); }
        .page-header-left p { font-size:0.825rem; color:var(--text-dim); }
        .page-header-icon {
            width:60px; height:60px;
            background:rgba(245,168,0,0.15); border:2px solid rgba(245,168,0,0.3);
            border-radius:50%; display:flex; align-items:center; justify-content:center;
            font-size:1.5rem; flex-shrink:0;
        }

        /* ── EXPRESS BADGE ── */
        .express-badge {
            display:inline-flex; align-items:center; gap:0.4rem;
            background:rgba(245,168,0,0.18); border:1px solid rgba(245,168,0,0.4);
            color:var(--yellow); padding:0.3rem 1rem; border-radius:50px;
            font-size:0.75rem; font-weight:700; letter-spacing:0.06em;
            animation:fadeUp 0.4s ease both;
        }

        /* ── MAIN GRID ── */
        .payment-grid {
            display:flex; flex-direction:column; gap:1.25rem;
            width:100%; max-width:580px;
            animation:fadeUp 0.5s 0.05s ease both;
        }

        /* ── GLASS CARD ── */
        .glass-card {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:20px;
            padding:2rem;
        }

        /* section label same as add-product */
        .section-label {
            display:flex; align-items:center; gap:0.6rem;
            font-size:0.7rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.12em; color:var(--yellow);
            margin-bottom:1.25rem;
        }
        .section-label::after { content:''; flex:1; height:1px; background:var(--glass-border); }

        /* ── SHIPPING ADDRESS ── */
        .address-box {
            background:rgba(255,255,255,0.05); border:1px solid var(--input-border);
            border-radius:12px; padding:1rem 1.25rem;
            display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;
        }
        .address-text { font-size:0.875rem; color:var(--text-light); line-height:1.6; }
        .address-warn { font-size:0.825rem; color:#ff8060; display:flex; align-items:center; gap:0.4rem; }
        .change-link {
            font-size:0.75rem; color:var(--yellow); text-decoration:none;
            white-space:nowrap; transition:opacity 0.2s; flex-shrink:0;
            display:flex; align-items:center; gap:0.3rem;
        }
        .change-link:hover { opacity:0.75; text-decoration:underline; }

        /* ── PRICE BREAKDOWN ── */
        .price-row {
            display:flex; justify-content:space-between; align-items:center;
            padding:0.55rem 0; font-size:0.875rem;
        }
        .price-row + .price-row { border-top:1px solid rgba(255,255,255,0.07); }
        .price-row .label { color:var(--text-dim); }
        .price-row .value { font-weight:600; }
        .price-row.total { border-top:1px solid var(--glass-border); margin-top:0.5rem; padding-top:0.75rem; }
        .price-row.total .label { color:var(--text-light); font-weight:600; }
        .price-row.total .value { font-size:1.4rem; font-weight:800; color:var(--yellow); }
        .tag-free { color:var(--success); font-weight:700; }
        .tag-charge { color:#ff8060; font-weight:700; }


        /* ── CART ITEMS ON PAYMENT PAGE ── */
        .items-table { width:100%; border-collapse:collapse; }
        .items-table th {
            font-size:0.65rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.08em; color:var(--text-dim);
            padding:0 0 0.6rem; border-bottom:1px solid var(--glass-border);
            text-align:left;
        }
        .items-table th:last-child { text-align:right; }
        .items-table td {
            padding:0.65rem 0; font-size:0.825rem; color:var(--text-light);
            border-bottom:1px solid rgba(255,255,255,0.05); vertical-align:middle;
        }
        .items-table td:last-child { text-align:right; font-weight:700; color:white; }
        .item-name { font-weight:600; color:white; max-width:200px; }
        .item-cat  { font-size:0.7rem; color:var(--text-dim); margin-top:0.1rem; }
        .item-qty  { display:inline-flex; align-items:center; justify-content:center;
                     background:rgba(255,255,255,0.08); border-radius:6px;
                     padding:0.15rem 0.55rem; font-size:0.78rem; font-weight:600; }
        .items-total-row td { border-bottom:none; padding-top:0.75rem;
                              border-top:1px solid var(--glass-border); font-size:0.875rem; }

        /* ── DELIVERY OPTIONS ── */
        .delivery-option {
            background:rgba(255,255,255,0.05);
            border:1.5px solid var(--input-border);
            border-radius:14px; padding:1.1rem 1.25rem;
            margin-bottom:0.875rem; cursor:pointer;
            transition:all 0.25s;
        }
        .delivery-option:hover { border-color:rgba(245,168,0,0.4); background:rgba(245,168,0,0.05); }
        .delivery-option.selected {
            border-color:var(--yellow);
            background:rgba(245,168,0,0.08);
            box-shadow:0 0 0 3px rgba(245,168,0,0.12);
        }
        .delivery-top { display:flex; justify-content:space-between; align-items:center; }
        .delivery-badge {
            display:inline-block; padding:0.2rem 0.75rem; border-radius:50px;
            font-size:0.7rem; font-weight:700; margin-bottom:0.3rem;
        }
        .badge-standard { background:rgba(34,197,94,0.15); color:var(--success); border:1px solid rgba(34,197,94,0.3); }
        .badge-tomorrow { background:rgba(255,96,96,0.15); color:#ff8060; border:1px solid rgba(255,96,96,0.3); }
        .delivery-date { font-size:0.875rem; font-weight:600; color:var(--text-light); margin:0.2rem 0; }
        .delivery-sub  { font-size:0.72rem; color:var(--text-dim); }
        .delivery-price { font-size:1rem; font-weight:800; white-space:nowrap; }

        /* slot dropdown */
        .slot-section { display:none; margin-top:1rem; padding-top:0.875rem; border-top:1px dashed rgba(255,255,255,0.12); }
        .delivery-option.selected .slot-section { display:block; }
        .slot-label { font-size:0.7rem; color:var(--text-dim); margin-bottom:0.45rem; display:flex; align-items:center; gap:0.35rem; }
        .slot-select {
            width:100%; background:var(--input-bg); border:1px solid var(--input-border);
            border-radius:10px; padding:0.65rem 1rem;
            color:white; font-family:'Poppins',sans-serif; font-size:0.825rem;
            outline:none; cursor:pointer; transition:border-color 0.2s;
            appearance:none;
        }
        .slot-select option { background:#0f172a; color:white; }
        .slot-select:focus { border-color:var(--yellow); box-shadow:0 0 0 3px rgba(245,168,0,0.12); }

        .final-box {
            background:rgba(245,168,0,0.08); border:1.5px solid rgba(245,168,0,0.3);
            border-radius:14px; padding:1.25rem 1.5rem;
        }
        .final-box .final-label { font-size:0.72rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.4rem; }
        .final-box .final-amount { font-size:2rem; font-weight:800; color:var(--yellow); line-height:1; }
        .final-box .final-sub { font-size:0.72rem; color:var(--text-dim); margin-top:0.35rem; }

        /* ── PAY BUTTONS ── */
        .btn-pay {
            width:100%; border:none; border-radius:12px;
            padding:0.95rem 1rem;
            font-family:'Poppins',sans-serif; font-size:0.875rem; font-weight:700;
            letter-spacing:0.06em; text-transform:uppercase; cursor:pointer;
            display:flex; align-items:center; justify-content:center; gap:0.5rem;
            transition:all 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        .btn-online {
            background:var(--yellow); color:#1a1000;
            box-shadow:0 8px 24px rgba(245,168,0,0.3);
        }
        .btn-online:hover { background:var(--yellow-d); transform:translateY(-2px); box-shadow:0 12px 32px rgba(245,168,0,0.45); }

        .btn-cod {
            background:rgba(34,197,94,0.12); color:var(--success);
            border:1.5px solid rgba(34,197,94,0.35) !important;
        }
        .btn-cod:hover { background:rgba(34,197,94,0.2); transform:translateY(-2px); box-shadow:0 8px 24px rgba(34,197,94,0.2); }

        .cancel-link {
            display:flex; align-items:center; justify-content:center; gap:0.4rem;
            color:var(--text-dim); text-decoration:none; font-size:0.78rem;
            transition:color 0.2s; margin-top:0.25rem;
        }
        .cancel-link:hover { color:var(--text-white); }

        /* ── RECOMMENDED PRODUCTS ── */
        .rec-section {
            width:100%; max-width:580px;
            animation:fadeUp 0.5s 0.1s ease both;
        }
        .rec-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:1rem; margin-top:1.25rem; }
        .rec-card {
            background:var(--glass-card); backdrop-filter:blur(16px);
            border:1px solid var(--glass-border); border-radius:16px;
            overflow:hidden; transition:all 0.3s;
        }
        .rec-card:hover { transform:translateY(-5px); border-color:rgba(245,168,0,0.4); }
        .rec-img { width:100%; height:110px; object-fit:cover; }
        .rec { padding:0.875rem; }
        .rec-name { font-size:0.78rem; font-weight:600; color:var(--text-light); margin-bottom:0.35rem; line-height:1.4; }
        .rec-price { font-size:0.9rem; font-weight:800; color:var(--yellow); margin-bottom:0.75rem; }
        .btn-add-cart {
            display:block; width:100%; text-align:center;
            background:rgba(245,168,0,0.15); border:1px solid rgba(245,168,0,0.35);
            color:var(--yellow); text-decoration:none;
            font-size:0.72rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;
            padding:0.5rem; border-radius:8px; transition:all 0.25s;
        }
        .btn-add-cart:hover { background:var(--yellow); color:#1a1000; }

        /* ── FOOTER ── */
        footer {
            background:rgba(0,0,0,0.5); backdrop-filter:blur(16px);
            border-top:1px solid var(--glass-border); padding:1.25rem 3rem;
            display:flex; align-items:center; justify-content:space-between;
            flex-wrap:wrap; gap:0.75rem;
        }
        .footer-brand { font-size:1.1rem; font-weight:700; color:white; }
        .footer-copy { font-size:0.72rem; color:var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

        /* ── RESPONSIVE ── */
        @media(max-width:780px) {
            nav { padding:0.875rem 1.25rem; }
            .page { padding:5.5rem 1rem 2rem; }
            .page-header { flex-direction:column; text-align:center; }
            .payment-grid { grid-template-columns:1fr; }
            footer { padding:1.25rem; flex-direction:column; text-align:center; }
        }`;

/**
 * Payment Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message
 * @param {string|null} props.failureMessage - Failure message
 * @param {string|null} props.csrfToken - CSRF token
 * @param {Object} props.customer - Customer details including addresses
 * @param {Array} props.cartItems - Items in the cart
 * @param {number} props.cartTotal - Total price of cart items
 * @param {number} props.gstAmount - GST calculated amount
 * @param {string} props.gstLabel - GST label string
 * @param {number} props.taxableBase - Base amount before tax
 * @param {number} props.deliveryCharge - Standard delivery charge
 * @param {number} props.amount - Base final amount before dynamic calculation
 * @param {string} props.razorpayKeyId - Razorpay Key
 * @param {Array} props.recommendedProducts - Recommended products array
 * @param {string} props.cartItemCategory - Main category of cart items
 */
export default function Payment({
    successMessage = null,
    failureMessage = null,
    csrfToken = null,
    customer = { name: 'Customer', email: 'email@example.com', addresses: [] },
    cartItems = [],
    cartTotal = 0,
    gstAmount = 0,
    gstLabel = 'GST (18%)',
    taxableBase = 0,
    deliveryCharge = 0,
    amount = 0,
    razorpayKeyId = '',
    recommendedProducts = [],
    cartItemCategory = ''
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);

    const [delivType, setDelivType] = useState('standard');
    const [delivDate, setDelivDate] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [couponDisc, setCouponDisc] = useState(0);
    const [savedPin, setSavedPin] = useState('');
    const [expressBadge, setExpressBadge] = useState(false);

    // Helper functions for dates
    const addBusinessDays = (date, n) => {
        let d = new Date(date), added = 0;
        while (added < n) { 
            d.setDate(d.getDate() + 1); 
            if (d.getDay() !== 0 && d.getDay() !== 6) added++; 
        }
        return d;
    };

    const formatDate = (d) => {
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    };

    // Load Razorpay script dynamically
    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    // Initialize session data & scroll handling
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);

        // Check for express badge
        if (document.referrer.includes('/view-cart') || sessionStorage.getItem('expressCheckout')) {
            sessionStorage.setItem('expressCheckout', 'true');
            setExpressBadge(true);
            setTimeout(() => setDelivType('standard'), 300);
        } else {
            sessionStorage.removeItem('expressCheckout');
        }

        const today = new Date();
        const storedDelivType = sessionStorage.getItem('ekart_delivery_type') || 'standard';
        const storedDelivDate = sessionStorage.getItem('ekart_delivery_date') || formatDate(addBusinessDays(today, 5));
        const storedCouponCode = sessionStorage.getItem('ekart_coupon_code') || '';
        const storedCouponDisc = parseFloat(sessionStorage.getItem('ekart_coupon_discount')) || 0;
        const storedPin = localStorage.getItem('ekart_delivery_pin') || '';

        setDelivType(storedDelivType);
        setDelivDate(storedDelivDate);
        setCouponCode(storedCouponCode);
        setCouponDisc(storedCouponDisc);
        setSavedPin(storedPin);

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Alerts fade
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

    // Derived calculations
    const expressCharge = 129;
    const expressExtra = delivType === 'express' ? expressCharge : 0;
    
    // Amount prop seems to be the base amount.
    const totalWithDel = parseFloat(amount) + expressExtra;
    const finalAmt = Math.max(totalWithDel - couponDisc, 0);
    const computedDeliveryCharge = (parseFloat(deliveryCharge) + expressExtra).toFixed(0);

    const deliveryLabelForInput = delivType === 'express'
        ? `Express | Expected by ${delivDate}`
        : `Standard | Expected by ${formatDate(addBusinessDays(new Date(), 5))}`;

    const lastAddr = customer?.addresses?.[customer.addresses.length - 1];

    const handleOnlinePay = (e) => {
        e.preventDefault();
        const payAmount = finalAmt;
        
        if (!window.Razorpay) {
            alert("Razorpay SDK not loaded. Please check your internet connection.");
            return;
        }

        const options = {
            key: razorpayKeyId,
            amount: payAmount * 100,
            currency: "INR",
            name: "Ekart Shop",
            description: "Order Payment",
            handler: function(response) {
                const form = document.createElement('form');
                form.method = 'POST'; 
                form.action = '/success';
                const fields = {
                    amount: payAmount,
                    paymentMode: 'Online',
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    deliveryTime: deliveryLabelForInput,
                    deliveryPinCode: savedPin
                };
                if (csrfToken) {
                    fields['_csrf'] = csrfToken;
                }
                for (const key in fields) {
                    const inp = document.createElement('input');
                    inp.type = 'hidden'; 
                    inp.name = key; 
                    inp.value = fields[key];
                    form.appendChild(inp);
                }
                document.body.appendChild(form); 
                form.submit();
            },
            prefill: { name: customer.name, email: customer.email },
            theme: { color: "#f5a800" }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    const handleCODSubmit = (e) => {
        // Will just let the form submit normally
        return true;
    };

    // Unused original pin check / delivery select functions preserved internally for syntax refactoring completeness
    const [pinCheckState, setPinCheckState] = useState({ passed: false, hasRestrictions: false, resultHtml: null, checking: false });
    const [pinInput, setPinInput] = useState('');
    
    const checkPinCode = () => {
        if (pinInput.length !== 6) {
            setPinCheckState({ ...pinCheckState, resultHtml: <span style={{color: '#ff8060'}}><i className="fas fa-exclamation-circle"></i> Please enter a valid 6-digit pin code.</span> });
            return;
        }
        setPinCheckState({ ...pinCheckState, checking: true, resultHtml: null });
        authFetch('/api/check-pincode?pinCode=' + encodeURIComponent(pinInput))
            .then(r => r.json())
            .then(data => {
                if (!data.hasRestrictions) {
                    setSavedPin(pinInput);
                    setPinCheckState({ passed: true, hasRestrictions: false, checking: false, resultHtml: <div style={{color: '#22c55e'}}><i className="fas fa-check-circle"></i> All items deliver to <strong>{pinInput}</strong>. You're good to go!</div> });
                } else {
                    const blocked = data.blockedItems || [];
                    if (blocked.length === 0) {
                        setSavedPin(pinInput);
                        setPinCheckState({ passed: true, hasRestrictions: true, checking: false, resultHtml: <div style={{color: '#22c55e'}}><i className="fas fa-check-circle"></i> All items deliver to <strong>{pinInput}</strong>. You're good to go!</div> });
                    } else {
                        setSavedPin('');
                        setPinCheckState({ passed: false, hasRestrictions: true, checking: false, resultHtml: (
                            <>
                                <div style={{color: '#ff8060', marginBottom: '0.4rem'}}><i className="fas fa-times-circle"></i> <strong>{blocked.length} item(s)</strong> cannot be delivered to <strong>{pinInput}</strong>:</div>
                                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem'}}>
                                    {blocked.map((name, idx) => <li key={idx} style={{fontSize: '0.78rem', color: 'rgba(255,100,80,0.85)', paddingLeft: '1rem'}}><i className="fas fa-ban" style={{fontSize: '0.65rem', marginRight: '0.3rem'}}></i>{name}</li>)}
                                </ul>
                                <div style={{marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)'}}>Please remove those items from your cart or try a different pin code.</div>
                            </>
                        )});
                    }
                }
            })
            .catch(() => {
                setSavedPin(pinInput);
                setPinCheckState({ passed: true, hasRestrictions: false, checking: false, resultHtml: <span style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem'}}><i className="fas fa-info-circle"></i> Could not verify — proceeding with checkout.</span> });
            });
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Payment Options</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* NAV */}
            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    Ekart
                </a>
                <div className="nav-right">
                    <Link to="/cart" className="nav-link-btn"><i className="fas fa-arrow-left"></i> Back to Cart</Link>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            {/* ALERTS */}
            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={{ transition: 'opacity 0.5s', opacity: fadeAlerts ? 0 : 1 }}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={{ transition: 'opacity 0.5s', opacity: fadeAlerts ? 0 : 1 }}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            {/* PAGE */}
            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Complete Your <span>Payment</span> 💳</h1>
                        <p>Choose your delivery speed and preferred payment method below.</p>
                    </div>
                    <div className="page-header-icon">🛒</div>
                </div>

                {expressBadge && (
                    <div id="express-badge-wrap">
                        <div className="express-badge">⚡ Express Checkout — Almost done!</div>
                    </div>
                )}

                <div id="delivery-type-banner" style={{ display: delivType ? 'block' : 'none', marginBottom: '0.75rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
                        background: delivType === 'express' ? 'rgba(34,197,94,0.1)' : 'rgba(245,168,0,0.12)', 
                        borderColor: delivType === 'express' ? 'rgba(34,197,94,0.35)' : 'rgba(245,168,0,0.35)',
                        borderWidth: '1px', borderStyle: 'solid',
                        borderRadius: '50px', padding: '0.4rem 1.1rem', fontSize: '0.78rem', fontWeight: 600, 
                        color: delivType === 'express' ? '#22c55e' : 'var(--yellow)'
                    }}>
                        <i id="delivery-type-icon" className={delivType === 'express' ? 'fas fa-bolt' : 'fas fa-box'}></i>
                        <span id="delivery-type-text">
                            {delivType === 'express' 
                                ? `Express Delivery — ${delivDate} (+₹129)` 
                                : `Standard Delivery — ${delivDate}`}
                        </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: '0.75rem' }}>
                        Selected on product page · <a href="#!" onClick={(e) => { e.preventDefault(); window.history.back(); }} style={{ color: 'var(--yellow)', textDecoration: 'none' }}>Change</a>
                    </span>
                </div>

                <div className="payment-grid">
                    <div style={{ display: 'contents' }}>
                        
                        {/* SHIPPING ADDRESS */}
                        <div className="glass-card">
                            <div className="section-label"><i className="fas fa-truck"></i> Shipping Address</div>
                            <div className="address-box">
                                {customer?.addresses?.length > 0 ? (
                                    <div>
                                        {lastAddr?.recipientName ? (
                                            <>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white', marginBottom: '0.2rem' }}>
                                                    {lastAddr.recipientName}
                                                </div>
                                                {lastAddr.houseStreet && <div className="address-text">{lastAddr.houseStreet}</div>}
                                                <div className="address-text">
                                                    {lastAddr.city || ''}{lastAddr.state ? ', ' + lastAddr.state : ''}
                                                </div>
                                                {lastAddr.postalCode && (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--yellow)' }}>
                                                        <i className="fas fa-location-dot" style={{ fontSize: '0.6rem' }}></i>
                                                        <span>{lastAddr.postalCode}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="address-text">{lastAddr?.details}</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="address-warn">
                                        <i className="fas fa-exclamation-triangle"></i> No shipping address. Please add one.
                                    </div>
                                )}
                                <Link to="/address" className="change-link">
                                    <i className="fas fa-pen" style={{ fontSize: '.65rem' }}></i> Change
                                </Link>
                            </div>
                        </div>

                        {/* CART ITEMS BREAKDOWN */}
                        {cartItems?.length > 0 && (
                            <div className="glass-card">
                                <div className="section-label"><i className="fas fa-shopping-bag"></i> Your Items</div>
                                <table className="items-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th style={{ textAlign: 'center' }}>Qty</th>
                                            <th style={{ textAlign: 'right' }}>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cartItems.map((item, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <div className="item-name">{item.name}</div>
                                                    <div className="item-cat">{item.category}</div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="item-qty">{item.quantity}</span>
                                                </td>
                                                <td>
                                                    <span>₹{item.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="items-total-row">
                                            <td colSpan="2" style={{ color: 'var(--text-dim)' }}>
                                                <span>{cartItems.length} item(s)</span>
                                            </td>
                                            <td style={{ color: 'var(--yellow)', fontSize: '1rem', fontWeight: 800 }}>
                                                ₹<span>{cartTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* PRICE BREAKDOWN */}
                        <div className="glass-card">
                            <div className="section-label"><i className="fas fa-receipt"></i> Price Breakdown</div>
                            
                            <div className="price-row">
                                <span className="label">Cart Subtotal</span>
                                <span className="value">₹{cartTotal?.toFixed(2) || '0.00'}</span>
                            </div>
                            
                            {gstAmount > 0 && (
                                <div className="price-row" style={{ fontSize: '0.82rem' }}>
                                    <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <i className="fas fa-file-invoice" style={{ fontSize: '0.7rem', color: 'var(--yellow)' }}></i>
                                        <span>{gstLabel || 'GST (18%)'}</span>
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>(incl.)</span>
                                    </span>
                                    <span className="value" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                        ₹{gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            {taxableBase > 0 && gstAmount > 0 && (
                                <div className="price-row" style={{ fontSize: '0.78rem' }}>
                                    <span className="label" style={{ color: 'rgba(255,255,255,0.3)' }}>Taxable value</span>
                                    <span className="value" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                                        ₹{taxableBase?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            <div className="price-row">
                                <span className="label">
                                    {delivType === 'express' ? 'Delivery (Express +₹129)' : 'Delivery Charge'}
                                </span>
                                {computedDeliveryCharge == 0 ? (
                                    <span className="value tag-free">FREE</span>
                                ) : (
                                    <span className="value tag-charge" style={{ color: delivType === 'express' ? '#f5a800' : '#ff8060' }}>
                                        ₹{computedDeliveryCharge}
                                    </span>
                                )}
                            </div>

                            {couponDisc > 0 && couponCode && (
                                <div className="price-row">
                                    <span className="label" style={{ color: '#22c55e' }}>
                                        <i className="fas fa-tag" style={{ fontSize: '0.7rem', marginRight: '3px' }}></i> Coupon Discount
                                    </span>
                                    <span className="value" style={{ color: '#22c55e' }}>-₹{couponDisc?.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="price-row total">
                                <span className="label">Grand Total</span>
                                <span className="value">₹{finalAmt?.toFixed(2)}</span>
                            </div>
                        </div>

                    </div>

                    <div style={{ display: 'contents' }}>
                        
                        {/* FINAL TOTAL */}
                        <div className="glass-card">
                            <div className="section-label"><i className="fas fa-wallet"></i> Order Total</div>
                            <div className="final-box">
                                <div className="final-label">Amount to Pay</div>
                                <div className="final-amount">₹{finalAmt?.toFixed(2)}</div>
                                
                                {couponDisc > 0 && couponCode && (
                                    <div className="final-sub" style={{ color: '#22c55e', fontSize: '0.72rem', marginTop: '0.3rem' }}>
                                        <i className="fas fa-tag" style={{ marginRight: '4px' }}></i>
                                        Coupon <strong>{couponCode}</strong> applied — saving ₹{couponDisc?.toFixed(2)}
                                    </div>
                                )}
                                
                                <div className="final-sub">All taxes included · Secure checkout</div>
                            </div>
                        </div>

                        {/* PAY BUTTONS */}
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <div className="section-label"><i className="fas fa-credit-card"></i> Payment Method</div>

                            <button className="btn-pay btn-online" onClick={handleOnlinePay}>
                                <i className="fas fa-globe"></i> Pay Online
                            </button>

                            <form action="/success" method="post" onSubmit={handleCODSubmit}>
                                {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                                <input type="hidden" name="amount" value={finalAmt?.toFixed(2)} />
                                <input type="hidden" name="paymentMode" value="Cash on Delivery" />
                                <input type="hidden" name="razorpay_payment_id" value="COD_NA" />
                                <input type="hidden" name="razorpay_order_id" value="COD_ORDER" />
                                <input type="hidden" name="deliveryTime" value={deliveryLabelForInput} />
                                <input type="hidden" name="deliveryPinCode" value={savedPin} />
                                
                                <button type="submit" className="btn-pay btn-cod">
                                    <i className="fas fa-hand-holding-usd"></i> Cash on Delivery
                                </button>
                            </form>

                            <Link to="/cart" className="cancel-link">
                                <i className="fas fa-arrow-left" style={{ fontSize: '.7rem' }}></i> Cancel & Go Back
                            </Link>
                        </div>

                        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <i className="fas fa-lock" style={{ color: 'var(--yellow)', fontSize: '.65rem' }}></i>
                            Secured by 256-bit SSL encryption
                        </div>
                    </div>
                </div>

                {/* RECOMMENDED PRODUCTS */}
                {recommendedProducts?.length > 0 && (
                    <div className="rec-section">
                        <div className="glass-card">
                            <div className="section-label">
                                <i className="fas fa-lightbulb"></i>
                                You might also like these {cartItemCategory} items
                            </div>
                            <div className="rec-grid">
                                {recommendedProducts.map((rp, index) => (
                                    <div key={index} className="rec-card">
                                        <img src={rp.imageLink} className="rec-img" alt="product" />
                                        <div className="rec-body">
                                            <div className="rec-name">{rp.name}</div>
                                            <div className="rec-price">₹{rp.price}</div>
                                            <a href={`/add-cart/${rp.id}`} className="btn-add-cart">
                                                <i className="fas fa-cart-plus"></i> Add to Cart
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* FOOTER */}
            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
            
            
        </>
    );
}