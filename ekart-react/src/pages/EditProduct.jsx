import React, { useState, useEffect, useRef } from 'react';

const CSS = `
        :root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card:   rgba(255, 255, 255, 0.13);
            --glass-nav:    rgba(0, 0, 0, 0.25);
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

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: '';
            position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
        }
        .bg-layer::after {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav);
            backdrop-filter: blur(14px);
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
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        /* ── ALERTS ── */
        .alert-stack {
            position: fixed; top: 5rem; right: 1.5rem;
            z-index: 200; display: flex; flex-direction: column; gap: 0.5rem;
        }
        .alert {
            padding: 0.875rem 1.25rem;
            background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px;
            display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px;
            animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 2rem;
        }

        /* ── PAGE HEADER ── */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; width: 100%; max-width: 760px;
            animation: fadeUp 0.5s ease both;
        }
        .page-header-left h1 { font-size: clamp(1.2rem, 2.5vw, 1.75rem); font-weight: 700; margin-bottom: 0.25rem; }
        .page-header-left h1 span { color: var(--yellow); }
        .page-header-left p { font-size: 0.825rem; color: var(--text-dim); }
        .page-header-icon {
            width: 60px; height: 60px;
            background: rgba(245,168,0,0.15);
            border: 2px solid rgba(245,168,0,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; flex-shrink: 0;
        }

        /* ── FORM CARD ── */
        .form-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.5rem;
            width: 100%; max-width: 760px;
            box-shadow: 0 40px 100px rgba(0,0,0,0.4);
            animation: fadeUp 0.5s ease 0.05s both;
        }

        /* ── SECTION LABEL ── */
        .section-label {
            display: flex; align-items: center; gap: 0.6rem;
            font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.12em;
            color: var(--yellow); margin-bottom: 1.25rem; margin-top: 0.5rem;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

        /* ── FORM GRID ── */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .form-grid .span-2 { grid-column: span 2; }

        /* ── FORM GROUP ── */
        .form-group { display: flex; flex-direction: column; gap: 0.45rem; }
        .form-group label {
            font-size: 0.72rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.1em;
            color: var(--text-dim); margin-left: 0.15rem;
        }

        .input-wrapper { position: relative; }
        .input-wrapper .input-icon {
            position: absolute; left: 1rem; top: 50%;
            transform: translateY(-50%);
            color: var(--text-dim); font-size: 0.875rem;
            transition: color 0.3s; pointer-events: none; z-index: 1;
        }
        .input-wrapper:focus-within .input-icon { color: var(--yellow); }

        .form-control {
            width: 100%;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 0.8rem 1rem 0.8rem 2.75rem;
            color: white; font-family: 'Poppins', sans-serif;
            font-size: 0.875rem; transition: all 0.3s;
        }
        .form-control.no-icon { padding-left: 1rem; }
        .form-control::placeholder { color: var(--text-dim); }
        .form-control:focus {
            outline: none; background: rgba(255,255,255,0.10);
            border-color: var(--yellow);
            box-shadow: 0 0 0 3px rgba(245,168,0,0.12);
        }
        textarea.form-control { resize: vertical; min-height: 90px; padding-top: 0.8rem; }
        .form-control[type=number]::-webkit-outer-spin-button,
        .form-control[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .form-control[type=number] { -moz-appearance: textfield; }
        /* ── SELECT DROPDOWN STYLING ── */
        select.form-control {
            appearance: none;
            -webkit-appearance: none;
            background: rgba(255,255,255,0.06) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23f5a800' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 1rem center;
            cursor: pointer;
            color: white;
        }
        select.form-control:focus {
            background-color: rgba(255,255,255,0.10);
        }
        select.form-control option {
            background: #1a1a2e;
            color: white;
            padding: 8px 12px;
            font-size: 0.875rem;
        }
        select.form-control option:checked,
        select.form-control option:hover {
            background: #f5a800;
            color: #1a1a2e;
        }
        select.form-control option[disabled] {
            color: rgba(255,255,255,0.35);
        }


        /* ── HINT ── */
        .form-hint {
            display: flex; align-items: center; gap: 0.35rem;
            font-size: 0.7rem; color: var(--text-dim); margin-left: 0.15rem;
        }
        .form-hint i { color: var(--yellow); font-size: 0.65rem; }

        /* ── CURRENT MEDIA PREVIEW ── */
        .media-preview {
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 0.75rem;
        }
        .media-preview-label {
            font-size: 0.65rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.1em;
            color: var(--text-dim); margin-bottom: 0.65rem;
        }
        .preview-img {
            width: 90px; height: 90px;
            object-fit: cover; border-radius: 10px;
            border: 1px solid var(--glass-border);
        }
        .preview-imgs-row {
            display: flex; flex-wrap: wrap; gap: 0.5rem;
        }
        .preview-img-sm {
            width: 72px; height: 72px;
            object-fit: cover; border-radius: 8px;
            border: 1px solid var(--glass-border);
        }
        .preview-empty {
            font-size: 0.75rem; color: var(--text-dim); font-style: italic;
        }
        .preview-video {
            width: 100%; max-width: 260px;
            border-radius: 10px;
            border: 1px solid var(--glass-border);
        }

        /* ── FILE UPLOAD ── */
        .file-upload-area {
            background: rgba(255,255,255,0.04);
            border: 2px dashed rgba(255,255,255,0.2);
            border-radius: 12px; padding: 1.1rem 1rem;
            text-align: center; cursor: pointer;
            transition: all 0.3s; position: relative;
        }
        .file-upload-area:hover, .file-upload-area.drag-over {
            border-color: var(--yellow); background: rgba(245,168,0,0.06);
        }
        .file-upload-area input[type=file] {
            position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
        .file-upload-icon { font-size: 1.25rem; color: var(--yellow); margin-bottom: 0.4rem; opacity: 0.7; }
        .file-upload-text { font-size: 0.75rem; color: var(--text-dim); line-height: 1.5; }
        .file-upload-text strong { color: var(--text-light); display: block; margin-bottom: 0.15rem; }
        .file-name-display { margin-top: 0.4rem; font-size: 0.7rem; color: var(--yellow); font-weight: 600; word-break: break-all; }

        /* ── SUBMIT ── */
        .btn-submit {
            width: 100%; background: var(--yellow); color: #1a1000;
            border: none; border-radius: 12px; padding: 0.95rem;
            font-family: 'Poppins', sans-serif; font-size: 0.9rem; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow: 0 8px 24px rgba(245,168,0,0.25);
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            margin-top: 2rem;
        }
        .btn-submit:hover { background: var(--yellow-d); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(245,168,0,0.42); }
        .btn-submit:active { transform: translateY(0); }

        .back-link {
            display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
            margin-top: 1.25rem; color: var(--text-dim); text-decoration: none;
            font-size: 0.78rem; transition: color 0.2s; width: 100%;
        }
        .back-link:hover { color: var(--text-white); }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width: 700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .form-card { padding: 1.75rem 1.25rem; }
            .form-grid { grid-template-columns: 1fr; }
            .form-grid .span-2 { grid-column: span 1; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }

        .pricing-row { display:flex; align-items:flex-end; gap:0.75rem; margin-bottom:0; }
        .pricing-or  { font-size:0.7rem; font-weight:800; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.1em; padding-bottom:0.9rem; flex-shrink:0; }
        .pricing-preview { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; background:rgba(245,168,0,0.07); border:1px solid rgba(245,168,0,0.25); border-radius:10px; padding:0.75rem 1rem; margin-top:0.25rem; }
        .preview-discount { background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); font-size:0.78rem; font-weight:800; padding:0.2rem 0.6rem; border-radius:6px; }
        .preview-price { font-size:1.4rem; font-weight:800; color:#f5a800; }
        .preview-mrp   { font-size:0.85rem; color:var(--text-dim); text-decoration:line-through; }
        .req { color:#ef4444; }
        
        /* Pin Input Tags */
        .pin-tag-box {
            display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center;
            background:rgba(255,255,255,0.06); border:1px solid var(--glass-border);
            border-radius:12px; padding:0.55rem 1rem; min-height:48px; cursor:text;
            transition: border-color 0.3s, box-shadow 0.3s;
        }
        .pin-tag-box.focus { border-color: var(--yellow); }
        .pin-chip {
            display:inline-flex;align-items:center;gap:0.3rem;background:rgba(245,168,0,0.18);
            border:1px solid rgba(245,168,0,0.4);border-radius:6px;padding:0.2rem 0.55rem;
            font-size:0.78rem;font-weight:600;color:#f5a800;
        }
        .pin-chip button {
            background:none;border:none;cursor:pointer;color:rgba(245,168,0,0.7);
            font-size:0.9rem;line-height:1;padding:0;
        }
`;

/**
 * EditProduct Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {string|null} props.csrfToken - CSRF token
 * @param {Array} props.allSubCategories - List of categories {name, parentCategory: {name, emoji}}
 * @param {Object} props.product - The product object to edit
 */
export default function EditProduct({
    successMessage = null,
    failureMessage = null,
    csrfToken = null,
    allSubCategories = [],
    product = {
        id: '',
        name: '',
        description: '',
        category: '',
        mrp: 0,
        price: 0,
        discountPercent: 0,
        discounted: false,
        stock: 0,
        stockAlertThreshold: 10,
        imageLink: '',
        extraImageList: [],
        videoLink: '',
        allowedPinCodes: ''
    }
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);
    
    // File names state
    const [mainImgName, setMainImgName] = useState('');
    const [extraImgsName, setExtraImgsName] = useState('');
    const [videoName, setVideoName] = useState('');
    
    // Pricing state
    const [mrp, setMrp] = useState(product.mrp > 0 ? product.mrp.toString() : '');
    const [price, setPrice] = useState(product.price ? product.price.toString() : '');
    const [discountPct, setDiscountPct] = useState(product.discountPercent > 0 ? product.discountPercent.toString() : '');
    const [preview, setPreview] = useState({ 
        show: product.price > 0, 
        discount: product.discounted ? `-${product.discountPercent}%` : '', 
        price: product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : '', 
        mrp: product.discounted ? `M.R.P.: ₹${product.mrp.toLocaleString('en-IN')}` : '' 
    });
    
    // Pin codes state
    const initialPins = product.allowedPinCodes 
        ? product.allowedPinCodes.split(',').map(p => p.trim()).filter(Boolean) 
        : [];
    const [pins, setPins] = useState(initialPins);
    const [pinInputValue, setPinInputValue] = useState('');
    const [pinBoxFocus, setPinBoxFocus] = useState(false);
    const [pinError, setPinError] = useState('');
    const pinInputRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        // Initialize pricing preview on load
        if (product.price > 0) {
            updatePricingPreview(product.mrp, product.price);
        }
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => setFadeAlerts(true), 2500);
            const timer2 = setTimeout(() => { setShowSuccess(false); setShowFailure(false); }, 3000);
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        }
    }, [showSuccess, showFailure]);

    const handleFileChange = (e, setName) => {
        if (!e.target.files.length) { setName(''); return; }
        setName(e.target.files.length > 1 ? `${e.target.files.length} files selected` : e.target.files[0].name);
    };

    // Pricing Logic
    const updatePricingPreview = (currentMrp, currentPrice) => {
        const m = parseFloat(currentMrp) || 0;
        const p = parseFloat(currentPrice) || 0;
        
        if (m > 0 && p > 0 && m > p) {
            const pct = Math.round(((m - p) / m) * 100);
            setPreview({
                show: true,
                discount: `-${pct}%`,
                price: `₹${p.toLocaleString('en-IN')}`,
                mrp: `M.R.P.: ₹${m.toLocaleString('en-IN')}`
            });
            setDiscountPct(pct.toString());
        } else if (p > 0) {
            setPreview({
                show: true,
                discount: '',
                price: `₹${p.toLocaleString('en-IN')}`,
                mrp: ''
            });
            setDiscountPct('');
        } else {
            setPreview({ show: false, discount: '', price: '', mrp: '' });
            setDiscountPct('');
        }
    };

    const handleMrpChange = (e) => {
        const newMrp = e.target.value;
        setMrp(newMrp);
        updatePricingPreview(newMrp, price);
    };

    const handlePriceChange = (e) => {
        const newPrice = e.target.value;
        setPrice(newPrice);
        updatePricingPreview(mrp, newPrice);
    };

    const handleDiscountChange = (e) => {
        const pct = e.target.value;
        setDiscountPct(pct);
        
        const m = parseFloat(mrp) || 0;
        const pNum = parseFloat(pct) || 0;
        
        if (m > 0 && pNum > 0 && pNum < 100) {
            const newPrice = Math.round(m * (1 - pNum / 100));
            setPrice(newPrice.toString());
            
            setPreview({
                show: true,
                discount: `-${Math.round(pNum)}%`,
                price: `₹${newPrice.toLocaleString('en-IN')}`,
                mrp: `M.R.P.: ₹${m.toLocaleString('en-IN')}`
            });
        }
    };

    // Pin Code Logic
    const isIndianPin = (val) => {
        if (!/^\d{6}$/.test(val)) return false;
        const prefix = val.slice(0, 2);
        const valid = new Set(['11','12','13','14','15','16','17','18','19',
            '20','21','22','23','24','25','26','27','28',
            '30','31','32','33','34','36','37','38','39',
            '40','41','42','43','44','45','46','47','48','49',
            '50','51','52','53','56','57','58','59',
            '60','61','62','63','64','65','66','67','68','69',
            '70','71','72','73','74','75','76','77','78','79',
            '80','81','82','83','84','85',
            '90','91','92','93','94','95','96','97','98','99']);
        return valid.has(prefix);
    };

    const addPin = (val) => {
        const cleanVal = val.trim().replace(/\D/g,'');
        if (!isIndianPin(cleanVal)) { setPinError('Please enter a valid Indian pin code.'); return; }
        if (pins.includes(cleanVal)) { setPinError(cleanVal + ' already added'); return; }
        
        setPins([...pins, cleanVal]);
        setPinInputValue('');
        setPinError('');
    };

    const handlePinKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (pinInputValue.trim()) addPin(pinInputValue);
        } else if (e.key === 'Backspace' && !pinInputValue && pins.length) {
            const newPins = [...pins];
            newPins.pop();
            setPins(newPins);
        }
    };

    const handlePinBlur = () => {
        if (pinInputValue.trim()) addPin(pinInputValue);
        setPinBoxFocus(false);
    };

    const handlePinInput = (e) => {
        setPinInputValue(e.target.value.replace(/\D/g,'').slice(0,6));
        setPinError('');
    };

    const removePin = (pinToRemove) => {
        setPins(pins.filter(p => p !== pinToRemove));
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - Edit Product</title>
            <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3Cpath fill='%23f5a800' d='M528.12 301.319l47.273-208C578.806 78.301 567.391 64 551.99 64H159.208l-9.166-44.81C147.758 8.021 137.93 0 126.529 0H24C10.745 0 0 10.745 0 24v16c0 13.255 10.745 24 24 24h69.883l70.248 343.435C147.325 417.1 136 435.222 136 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-15.674-6.447-29.835-16.824-40h209.647C430.447 426.165 424 440.326 424 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-22.172-12.888-41.332-31.579-50.405l5.517-24.276c3.413-15.018-8.002-29.319-23.403-29.319H218.117l-6.545-32h293.145c11.206 0 20.92-7.754 23.403-18.681z'/%3E%3C/svg%3E" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={{ transition: 'opacity 0.5s', opacity: fadeAlerts ? 0 : 1 }}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button type="button" className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={{ transition: 'opacity 0.5s', opacity: fadeAlerts ? 0 : 1 }}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button type="button" className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <a href="/vendor/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </a>
                <div className="nav-right">
                    <a href="/manage-products" className="nav-link-btn"><i className="fas fa-boxes"></i> My Products</a>
                    <a href="/vendor/home" className="nav-link-btn"><i className="fas fa-th-large"></i> Dashboard</a>
                    <a href="/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Edit <span>Product</span> ✏️</h1>
                        <p>Update your product details — changes go live after saving.</p>
                    </div>
                    <div className="page-header-icon">🏷️</div>
                </div>

                <div className="form-card">
                    <form action="/update-product" method="post" encType="multipart/form-data">
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        <input type="hidden" name="id" value={product.id} />

                        {/* ── BASIC DETAILS ── */}
                        <div className="section-label"><i className="fas fa-tag"></i> Basic Details</div>

                        <div className="form-grid">
                            <div className="form-group span-2">
                                <label htmlFor="name">Product Name</label>
                                <div className="input-wrapper">
                                    <i className="fas fa-box input-icon"></i>
                                    <input type="text" id="name" name="name" className="form-control"
                                           defaultValue={product.name} required />
                                </div>
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="description">Description</label>
                                <textarea id="description" name="description" className="form-control no-icon"
                                          rows="3" required defaultValue={product.description}></textarea>
                            </div>

                            <div className="form-group">
                                <label htmlFor="category">Category</label>
                                <div className="input-wrapper">
                                    <i className="fas fa-th-large input-icon"></i>
                                    <select id="category" name="category" className="form-control" required defaultValue={product.category || ""}>
                                        <option value="" disabled>— Select a sub-category —</option>
                                        {allSubCategories.map((sub, idx) => (
                                            <option key={idx} value={sub.name}>
                                                {sub.parentCategory ? `${sub.parentCategory.emoji} ${sub.parentCategory.name} › ${sub.name}` : sub.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* ── Dynamic Pricing ── */}
                            <div className="form-group">
                                <label htmlFor="mrp">M.R.P. / Original Price (₹) <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>(leave blank if no discount)</span></label>
                                <div className="input-wrapper">
                                    <i className="fas fa-tag input-icon"></i>
                                    <input type="number" id="mrp" name="mrp" className="form-control"
                                           placeholder="e.g. 699" step="0.01" min="0"
                                           value={mrp} onChange={handleMrpChange} />
                                </div>
                            </div>

                            <div className="pricing-row span-2">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label htmlFor="price">Selling Price (₹) <span className="req">*</span></label>
                                    <div className="input-wrapper">
                                        <i className="fas fa-rupee-sign input-icon"></i>
                                        <input type="number" id="price" name="price" className="form-control"
                                               step="0.01" min="0" required
                                               value={price} onChange={handlePriceChange} />
                                    </div>
                                </div>
                                <div className="pricing-or">OR</div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label htmlFor="discountPct">Discount %</label>
                                    <div className="input-wrapper">
                                        <i className="fas fa-percent input-icon"></i>
                                        <input type="number" id="discountPct" className="form-control"
                                               placeholder="e.g. 74" min="1" max="99" step="1"
                                               value={discountPct} onChange={handleDiscountChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Live pricing preview */}
                            <div className="pricing-preview span-2" style={{ display: preview.show ? 'flex' : 'none' }}>
                                <span className="preview-discount">{preview.discount}</span>
                                <span className="preview-price">{preview.price}</span>
                                <span className="preview-mrp">{preview.mrp}</span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="stock">Stock (Units)</label>
                                <div className="input-wrapper">
                                    <i className="fas fa-cubes input-icon"></i>
                                    <input type="number" id="stock" name="stock" className="form-control"
                                           defaultValue={product.stock} min="0" required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="stockAlertThreshold">Stock Alert Threshold</label>
                                <div className="input-wrapper">
                                    <i className="fas fa-bell input-icon"></i>
                                    <input type="number" id="stockAlertThreshold" name="stockAlertThreshold"
                                           className="form-control" defaultValue={product.stockAlertThreshold}
                                           placeholder="Default: 10" min="1" />
                                </div>
                                <span className="form-hint"><i className="fas fa-info-circle"></i> Get an email when stock drops below this level</span>
                            </div>
                        </div>

                        {/* ── MEDIA ── */}
                        <div className="section-label" style={{ marginTop: '2rem' }}><i className="fas fa-images"></i> Media</div>

                        <div className="form-grid">
                            {/* Main Image */}
                            <div className="form-group span-2">
                                <label>Main Image</label>
                                <div className="media-preview">
                                    <div className="media-preview-label">Current main image</div>
                                    <img className="preview-img" src={product.imageLink} alt="Main product image" />
                                </div>
                                <div className="file-upload-area">
                                    <input type="file" name="image" id="mainImg" accept="image/*"
                                           onChange={(e) => handleFileChange(e, setMainImgName)} />
                                    <div className="file-upload-icon"><i className="fas fa-image"></i></div>
                                    <div className="file-upload-text">
                                        <strong>Click to replace main image</strong>
                                        Leave empty to keep current
                                    </div>
                                    <div className="file-name-display">{mainImgName}</div>
                                </div>
                            </div>

                            {/* Extra Images */}
                            <div className="form-group">
                                <label>Extra Images</label>
                                <div className="media-preview">
                                    <div className="media-preview-label">Current extra images</div>
                                    {product.extraImageList && product.extraImageList.length > 0 ? (
                                        <div className="preview-imgs-row">
                                            {product.extraImageList.map((url, i) => (
                                                <img key={i} className="preview-img-sm" src={url} alt="" />
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="preview-empty">No extra images yet.</span>
                                    )}
                                </div>
                                <div className="file-upload-area">
                                    <input type="file" name="extraImages" id="extraImgs" accept="image/*" multiple
                                           onChange={(e) => handleFileChange(e, setExtraImgsName)} />
                                    <div className="file-upload-icon"><i className="fas fa-photo-film"></i></div>
                                    <div className="file-upload-text">
                                        <strong>Click to replace extra images</strong>
                                        Hold Ctrl / Cmd for multiple
                                    </div>
                                    <div className="file-name-display">{extraImgsName}</div>
                                </div>
                            </div>

                            {/* Video */}
                            <div className="form-group">
                                <label>Product Video</label>
                                <div className="media-preview">
                                    <div className="media-preview-label">Current video</div>
                                    {product.videoLink ? (
                                        <video className="preview-video" controls>
                                            <source src={product.videoLink} type="video/mp4" />
                                        </video>
                                    ) : (
                                        <span className="preview-empty">No video uploaded yet.</span>
                                    )}
                                </div>
                                <div className="file-upload-area">
                                    <input type="file" name="video" id="videoFile" accept="video/*"
                                           onChange={(e) => handleFileChange(e, setVideoName)} />
                                    <div className="file-upload-icon"><i className="fas fa-video"></i></div>
                                    <div className="file-upload-text">
                                        <strong>Click to replace video</strong>
                                        MP4, MOV or AVI · Max 100 MB
                                    </div>
                                    <div className="file-name-display">{videoName}</div>
                                </div>
                            </div>
                        </div>

                        {/* ── PIN CODE DELIVERY RESTRICTION ── */}
                        <div className="section-label" style={{ marginTop: '2rem' }}>
                            <i className="fas fa-map-marker-alt"></i> Delivery Restrictions <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }}>(Optional)</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="pinInput">Allowed Delivery Pin Codes</label>
                            <input type="hidden" name="allowedPinCodes" value={pins.join(',')} />
                            <div 
                                className={`pin-tag-box ${pinBoxFocus ? 'focus' : ''}`}
                                onClick={() => pinInputRef.current?.focus()}
                            >
                                {pins.map((pin) => (
                                    <span key={pin} className="pin-chip">
                                        {pin} 
                                        <button type="button" onClick={(e) => { e.stopPropagation(); removePin(pin); }}>×</button>
                                    </span>
                                ))}
                                <input 
                                    type="text" 
                                    id="pinInput" 
                                    ref={pinInputRef}
                                    placeholder="Type a 6-digit pin code & press Enter" 
                                    maxLength="6" 
                                    inputMode="numeric"
                                    value={pinInputValue}
                                    onChange={handlePinInput}
                                    onKeyDown={handlePinKeyDown}
                                    onBlur={handlePinBlur}
                                    onFocus={() => setPinBoxFocus(true)}
                                    style={{
                                        background: 'none', border: 'none', outline: 'none', color: 'white',
                                        fontFamily: "'Poppins', sans-serif", fontSize: '0.875rem', minWidth: '200px', flex: 1
                                    }}
                                />
                            </div>
                            {pinError && <span style={{ fontSize: '0.7rem', color: '#ff8060', marginLeft: '0.2rem' }}>{pinError}</span>}
                            <span className="form-hint"><i className="fas fa-info-circle"></i> Leave blank to allow delivery everywhere. Remove all chips to lift all restrictions.</span>
                        </div>

                        <button type="submit" className="btn-submit">
                            <i className="fas fa-save"></i> Save Changes
                        </button>
                    </form>

                    <a href="/manage-products" className="back-link">
                        <i className="fas fa-arrow-left"></i> Back to My Products
                    </a>
                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>
            
            
        </>
    );
}