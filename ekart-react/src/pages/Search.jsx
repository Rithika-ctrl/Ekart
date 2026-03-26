import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Search Component
 * @param {Object} props
 * @param {string} props.query - The current search query string
 * @param {string} props.correctedQuery - Suggested corrected spelling for the query
 * @param {string} props.originalQuery - The original user search term if auto-corrected
 * @param {Array} props.products - List of product objects [{id, name, category, description, price, stock, imageLink}]
 * @param {Object} props.session - Session object for success/failure alerts
 */
export default function Search({
    query = "",
    correctedQuery = null,
    originalQuery = null,
    products = [],
    session = { success: null, failure: null }
}) {
    // --- STATE ---
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
    const [isScrolled, setIsScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    const [filterCategory, setFilterCategory] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("");
    const [inStockOnly, setInStockOnly] = useState(false);
    const [categories, setCategories] = useState([]);
    const [isListening, setIsListening] = useState(false);

    // --- REFS ---
    const searchInputRef = useRef(null);

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);

        // Auto-dismiss alerts
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        // Build category list from products
        if (products && products.length > 0) {
            const uniqueCats = [...new Set(products.map(p => p.category?.trim()).filter(Boolean))];
            setCategories(uniqueCats);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timer);
        };
    }, [session, products]);

    // --- LOGIC ---
    const clearFilters = () => {
        setFilterCategory("");
        setMinPrice("");
        setMaxPrice("");
        setSortBy("");
        setInStockOnly(false);
    };

    const handleVoiceSearch = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            if (searchInputRef.current) {
                searchInputRef.current.value = transcript;
                searchInputRef.current.form.submit();
            }
        };

        recognition.start();
    };

    // Filter and Sort Logic
    let filteredProducts = [...products];

    if (filterCategory) {
        filteredProducts = filteredProducts.filter(p => p.category?.toLowerCase() === filterCategory.toLowerCase());
    }
    if (minPrice) {
        filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
        filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
    }
    if (inStockOnly) {
        filteredProducts = filteredProducts.filter(p => p.stock > 0);
    }

    if (sortBy === 'price-asc') filteredProducts.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') filteredProducts.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name-asc') filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'name-desc') filteredProducts.sort((a, b) => b.name.localeCompare(a.name));

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
        }
            /* Analytics styles scoped */
            .ekart-analytics-hide { display:none !important; }

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
        .nav-brand span { color: var(--yellow); }
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

        /* ── PAGE ── */
        .page {
            flex:1; padding:7rem 2rem 3rem;
            display:flex; flex-direction:column; align-items:center; gap:1.75rem;
        }

        /* ── PAGE HEADER ── */
        .page-header {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:20px;
            padding:2rem 2.5rem;
            display:flex; align-items:center; justify-content:space-between; gap:1.5rem;
            width:100%; max-width:1100px;
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

        /* ── SEARCH BOX ── */
        .search-card {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:20px;
            padding:2rem 2.5rem;
            width:100%; max-width:1100px;
            animation:fadeUp 0.5s 0.05s ease both;
        }

        .section-label {
            display:flex; align-items:center; gap:0.6rem;
            font-size:0.7rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.12em; color:var(--yellow); margin-bottom:1.25rem;
        }
        .section-label::after { content:''; flex:1; height:1px; background:var(--glass-border); }

        .search-row {
            display:flex; gap:0.875rem; align-items:center;
        }

        /* ── AUTOCOMPLETE WRAPPER ── */
        .search-input-wrap {
            flex:1; position:relative;
        }
        .search-input-wrap i.search-icon {
            position:absolute; left:1rem; top:50%; transform:translateY(-50%);
            color:var(--text-dim); font-size:0.9rem; pointer-events:none;
            transition:color 0.2s; z-index: 2;
        }
        .search-input-wrap:focus-within i.search-icon { color:var(--yellow); }

        .search-input {
            width:100%;
            background:var(--input-bg); border:1px solid var(--input-border);
            border-radius:12px; padding:0.85rem 3rem 0.85rem 2.75rem;
            color:white; font-family:'Poppins',sans-serif; font-size:0.9rem;
            outline:none; transition:all 0.25s;
        }
        .search-input::placeholder { color:rgba(255,255,255,0.28); }
        .search-input:focus {
            border-color:var(--yellow); background:rgba(255,255,255,0.1);
            box-shadow:0 0 0 3px rgba(245,168,0,0.12);
        }
        /* When dropdown is open, square off bottom corners */
        .search-input.dropdown-open {
            border-radius:12px 12px 0 0;
            border-bottom-color: transparent;
        }

        .voice-btn {
            position:absolute; right:1rem; top:50%; transform:translateY(-50%);
            background:none; border:none; cursor:pointer;
            color:var(--text-dim); font-size:1rem; transition:all 0.2s; padding:0;
            z-index: 2;
        }
        .voice-btn:hover { color:var(--yellow); }
        .voice-btn.listening { color:#ff6060; animation:pulse 1s infinite; }

        /* ── AUTOCOMPLETE DROPDOWN ── */
        .autocomplete-dropdown {
            position:absolute; top:100%; left:0; right:0;
            background: rgba(8, 10, 24, 0.97);
            backdrop-filter: blur(24px);
            border: 1px solid var(--glass-border);
            border-top: 1px solid rgba(245,168,0,0.3);
            border-radius: 0 0 12px 12px;
            z-index: 9999;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            animation: dropdownOpen 0.15s ease both;
        }

        @keyframes dropdownOpen {
            from { opacity:0; transform: translateY(-6px); }
            to   { opacity:1; transform: translateY(0); }
        }

        .autocomplete-list {
            list-style: none;
            margin: 0; padding: 6px 0;
            max-height: 360px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(245,168,0,0.3) transparent;
        }

        /* ── SUGGESTION ITEM ── */
        .suggestion-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 9px 16px;
            cursor: pointer;
            transition: background 0.12s;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .suggestion-item:last-child { border-bottom: none; }

        .suggestion-item:hover,
        .suggestion-item.active {
            background: rgba(245,168,0,0.08);
        }

        /* Thumbnail */
        .suggestion-thumb {
            width: 44px; height: 44px;
            border-radius: 8px;
            object-fit: cover;
            border: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
            background: rgba(255,255,255,0.05);
        }
        .suggestion-thumb-placeholder {
            width: 44px; height: 44px;
            border-radius: 8px;
            background: rgba(245,168,0,0.1);
            border: 1px solid rgba(245,168,0,0.2);
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; flex-shrink: 0;
        }

        /* Text block */
        .suggestion-text { flex: 1; min-width: 0; }

        .suggestion-name {
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--text-white);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        /* Highlighted matching letters in yellow */
        .suggestion-name mark {
            background: none;
            color: var(--yellow);
            font-weight: 700;
            padding: 0;
        }

        .suggestion-category {
            font-size: 0.7rem;
            color: var(--yellow);
            margin-top: 2px;
            opacity: 0.8;
        }

        /* Popular badge */
        .popular-badge {
            font-size: 0.62rem;
            background: rgba(255,96,96,0.2);
            color: #ff8080;
            border: 1px solid rgba(255,96,96,0.3);
            padding: 2px 8px;
            border-radius: 20px;
            font-weight: 600;
            flex-shrink: 0;
            white-space: nowrap;
        }

        /* Trending icon beside name */
        .suggestion-search-icon {
            color: var(--text-dim);
            font-size: 0.75rem;
            flex-shrink: 0;
        }

        /* Loading / empty states */
        .dropdown-loading, .dropdown-empty {
            padding: 14px 16px;
            font-size: 0.8rem;
            color: var(--text-dim);
            display: flex; align-items: center; gap: 8px;
        }
        .dropdown-loading i { color: var(--yellow); animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .btn-search {
            background:var(--yellow); color:#1a1000;
            border:none; border-radius:12px; padding:0.85rem 1.75rem;
            font-family:'Poppins',sans-serif; font-size:0.875rem; font-weight:700;
            letter-spacing:0.06em; text-transform:uppercase; cursor:pointer;
            transition:all 0.3s; white-space:nowrap;
            display:flex; align-items:center; gap:0.5rem;
            box-shadow:0 6px 20px rgba(245,168,0,0.25);
        }
        .btn-search:hover { background:var(--yellow-d); transform:translateY(-2px); box-shadow:0 10px 28px rgba(245,168,0,0.4); }

        .voice-status {
            display:none; font-size:0.75rem; color:#ff8060;
            margin-top:0.75rem; align-items:center; gap:0.4rem;
        }
        .voice-status.show { display:flex; }


        /* ── SEARCH HISTORY ── */
        .history-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 16px 4px;
            font-size: 0.68rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(255,255,255,0.35);
        }
        .history-clear-btn {
            background: none; border: none; cursor: pointer;
            color: rgba(245,168,0,0.7); font-size: 0.68rem;
            font-family: 'Poppins', sans-serif; font-weight: 600;
            padding: 0; transition: color 0.15s;
        }
        .history-clear-btn:hover { color: var(--yellow); }
        .history-item {
            display: flex; align-items: center; gap: 12px;
            padding: 9px 16px; cursor: pointer;
            transition: background 0.12s;
            border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .history-item:last-child { border-bottom: none; }
        .history-item:hover, .history-item.active {
            background: rgba(245,168,0,0.06);
        }
        .history-icon {
            color: rgba(255,255,255,0.3);
            font-size: 0.78rem; flex-shrink: 0; width: 14px; text-align: center;
        }
        .history-text {
            flex: 1; font-size: 0.84rem; color: rgba(255,255,255,0.75);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .history-remove {
            background: none; border: none; cursor: pointer;
            color: rgba(255,255,255,0.2); font-size: 0.75rem; padding: 0 2px;
            transition: color 0.15s; flex-shrink: 0; line-height: 1;
        }
        .history-remove:hover { color: rgba(255,100,80,0.7); }
        .history-empty {
            padding: 18px 16px; font-size: 0.78rem;
            color: rgba(255,255,255,0.28);
            display: flex; align-items: center; gap: 8px;
        }

        /* ── FILTER PANEL ── */
        .filter-card {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:20px;
            padding:1.75rem 2.5rem;
            width:100%; max-width:1100px;
            animation:fadeUp 0.5s 0.08s ease both;
        }
        .filter-grid {
            display:grid;
            grid-template-columns:repeat(auto-fit, minmax(170px,1fr));
            gap:1.1rem; align-items:end;
        }
        .filter-group { display:flex; flex-direction:column; gap:0.4rem; }
        .filter-group label {
            font-size:0.68rem; font-weight:700;
            text-transform:uppercase; letter-spacing:0.1em;
            color:var(--text-dim);
        }
        .filter-select, .filter-input {
            background:var(--input-bg); border:1px solid var(--input-border);
            border-radius:10px; padding:0.6rem 0.875rem;
            color:white; font-family:'Poppins',sans-serif; font-size:0.825rem;
            outline:none; transition:all 0.25s; appearance:none;
        }
        .filter-select option { background:#0f172a; }
        .filter-select:focus, .filter-input:focus {
            border-color:var(--yellow); box-shadow:0 0 0 3px rgba(245,168,0,0.1);
        }
        .filter-input::placeholder { color:rgba(255,255,255,0.25); }
        .filter-input::-webkit-outer-spin-button,
        .filter-input::-webkit-inner-spin-button { -webkit-appearance:none; }

        .price-row { display:flex; gap:0.5rem; align-items:center; }
        .price-row .filter-input { flex:1; }
        .price-sep { color:var(--text-dim); font-size:0.8rem; flex-shrink:0; }

        .stock-toggle { display:flex; align-items:center; gap:0.5rem; padding-top:0.2rem; }
        .stock-toggle input[type=checkbox] {
            width:16px; height:16px; accent-color:var(--yellow); cursor:pointer;
        }
        .stock-toggle span { font-size:0.825rem; color:var(--text-light); font-weight:500; }

        .btn-clear {
            background:transparent; border:1px solid var(--input-border);
            border-radius:10px; padding:0.6rem 0.875rem;
            color:var(--text-dim); font-family:'Poppins',sans-serif;
            font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.2s;
            display:flex; align-items:center; justify-content:center; gap:0.4rem;
        }
        .btn-clear:hover { border-color:rgba(255,100,80,0.4); color:#ff8060; }

        /* ── RESULTS ── */
        .results-section {
            width:100%; max-width:1100px;
            animation:fadeUp 0.5s 0.1s ease both;
        }
        .result-info {
            font-size:0.8rem; color:var(--text-dim); margin-bottom:1.25rem;
            font-weight:500; display:flex; align-items:center; gap:0.4rem;
        }
        .result-info span { color:var(--yellow); font-weight:700; }

        .product-grid {
            display:grid;
            grid-template-columns:repeat(auto-fill, minmax(240px,1fr));
            gap:1.25rem;
        }

        .product-card {
            background:var(--glass-card); backdrop-filter:blur(16px);
            border:1px solid var(--glass-border); border-radius:18px;
            overflow:hidden; transition:all 0.3s cubic-bezier(0.23,1,0.32,1);
            position:relative;
        }
        .product-card:hover {
            transform:translateY(-7px);
            border-color:rgba(245,168,0,0.45);
            box-shadow:0 20px 50px rgba(0,0,0,0.4);
        }
        .product-card.product-hidden { display:none !important; }

        .product-img { width:100%; height:180px; object-fit:cover; display:block; }
        .stock-tag {
            position:absolute; top:10px; right:10px;
            font-size:0.65rem; font-weight:700; padding:3px 10px;
            border-radius:50px; letter-spacing:0.06em; text-transform:uppercase;
        }
        .in-stock  { background:rgba(34,197,94,0.18); color:#22c55e; border:1px solid rgba(34,197,94,0.3); }
        .out-stock { background:rgba(255,96,96,0.18);  color:#ff8060; border:1px solid rgba(255,96,96,0.3); }

        .product { padding:1.25rem; }
        .product-category { font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--yellow); margin-bottom:0.4rem; }
        .product-name { font-size:0.9rem; font-weight:700; color:var(--text-white); margin-bottom:0.35rem; line-height:1.35; }
        .product-desc { font-size:0.75rem; color:var(--text-dim); line-height:1.55; margin-bottom:0.875rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .product-meta { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
        .product-price { font-size:1.1rem; font-weight:800; color:var(--yellow); }
        .product-stock-text { font-size:0.72rem; color:var(--text-dim); }

        .btn-add-cart {
            display:flex; align-items:center; justify-content:center; gap:0.4rem;
            width:100%; background:var(--yellow); color:#1a1000;
            border:none; border-radius:10px; padding:0.7rem;
            font-family:'Poppins',sans-serif; font-size:0.8rem; font-weight:700;
            letter-spacing:0.06em; text-transform:uppercase;
            cursor:pointer; transition:all 0.25s; text-decoration:none;
            box-shadow:0 4px 14px rgba(245,168,0,0.2);
        }
        .btn-add-cart:hover { background:var(--yellow-d); color:#1a1000; text-decoration:none; transform:translateY(-1px); }

        /* ── EMPTY STATES ── */
        .empty-box {
            background:var(--glass-card); backdrop-filter:blur(16px);
            border:1px solid var(--glass-border); border-radius:18px;
            padding:3rem 2rem; text-align:center;
        }
        .empty-icon { font-size:2.5rem; margin-bottom:1rem; opacity:0.5; }
        .empty-box h5 { font-size:1rem; font-weight:700; margin-bottom:0.4rem; }
        .empty-box p  { font-size:0.82rem; color:var(--text-dim); }


        /* ── DID YOU MEAN BANNER ── */
        .did-you-mean {
            width:100%; max-width:1100px;
            background: rgba(245,168,0,0.08);
            border: 1px solid rgba(245,168,0,0.35);
            border-radius: 14px;
            padding: 1rem 1.5rem;
            display: flex; align-items: center; gap: 0.75rem;
            animation: fadeUp 0.4s ease both;
            font-size: 0.9rem;
            color: var(--text-light);
        }
        .did-you-mean i { color: var(--yellow); font-size: 1rem; flex-shrink: 0; }
        .did-you-mean a {
            color: var(--yellow); font-weight: 700;
            text-decoration: none; border-bottom: 1px dashed rgba(245,168,0,0.5);
            transition: border-color 0.2s;
        }
        .did-you-mean a:hover { border-color: var(--yellow); }

        /* ── FOOTER ── */
        footer {
            background:rgba(0,0,0,0.5); backdrop-filter:blur(16px);
            border-top:1px solid var(--glass-border); padding:1.25rem 3rem;
            display:flex; align-items:center; justify-content:space-between;
            flex-wrap:wrap; gap:0.75rem;
        }
        .footer-brand { font-size:1.1rem; font-weight:700; color:white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy  { font-size:0.72rem; color:var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* ── RESPONSIVE ── */
        @media(max-width:768px) {
            nav { padding:0.875rem 1.25rem; }
            .page { padding:5.5rem 1rem 2rem; }
            .search-card, .filter-card { padding:1.5rem; }
            .page-header { flex-direction:column; text-align:center; }
            .search-row { flex-direction:column; }
            .btn-search { width:100%; justify-content:center; }
            footer { padding:1.25rem; flex-direction:column; text-align:center; }
        }`;

    return (
        <div className="search-page">
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            <nav className={isScrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ek<span>art</span>
                </a>
                <div className="nav-right">
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link-btn"><i className="fas fa-th-large"></i> Dashboard</a>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Search <span>Products</span> 🔍</h1>
                        <p>Find exactly what you're looking for — search by name or category.</p>
                    </div>
                    <div className="page-header-icon">🛍️</div>
                </div>

                <div className="search-card">
                    <div className="section-label"><i className="fas fa-search"></i> Search</div>
                    <form action="/search-products" method="post">
                        <div className="search-row">
                            <div className="search-input-wrap">
                                <i className="fas fa-search search-icon-fixed"></i>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    name="query"
                                    defaultValue={query}
                                    placeholder="Enter product name or category…"
                                    className="search-input"
                                />
                                <button 
                                    type="button" 
                                    className={`voice-btn ${isListening ? 'listening' : ''}`}
                                    onClick={handleVoiceSearch}
                                >
                                    <i className="fas fa-microphone"></i>
                                </button>
                            </div>
                            <button type="submit" className="btn-search">
                                <i className="fas fa-search"></i> Search
                            </button>
                        </div>
                    </form>
                </div>

                {correctedQuery && (
                    <div className="did-you-mean">
                        <i className="fas fa-spell-check"></i>
                        <span>
                            Showing results for &nbsp;<strong style={{ color: 'var(--yellow)' }}>{correctedQuery}</strong>&nbsp;
                            &mdash; you searched for &nbsp;<em style={{ opacity: 0.6 }}>{originalQuery}</em>
                        </span>
                    </div>
                )}

                {query && (
                    <>
                        <div className="filter-card">
                            <div className="section-label"><i className="fas fa-sliders-h"></i> Advanced Filters</div>
                            <div className="filter-grid">
                                <div className="filter-group">
                                    <label>Category</label>
                                    <select 
                                        className="filter-select" 
                                        value={filterCategory} 
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Price Range (₹)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input type="number" className="filter-input" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                                        <span style={{ color: 'var(--text-dim)' }}>–</span>
                                        <input type="number" className="filter-input" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                                    </div>
                                </div>
                                <div className="filter-group">
                                    <label>Sort By</label>
                                    <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                        <option value="">Default</option>
                                        <option value="price-asc">Price: Low to High</option>
                                        <option value="price-desc">Price: High to Low</option>
                                        <option value="name-asc">Name: A → Z</option>
                                        <option value="name-desc">Name: Z → A</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Availability</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.2rem' }}>
                                        <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} style={{ accentColor: 'var(--yellow)', width: '16px', height: '16px' }} />
                                        <span style={{ fontSize: '0.825rem' }}>In Stock Only</span>
                                    </div>
                                </div>
                                <div className="filter-group">
                                    <button className="nav-link-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={clearFilters}>
                                        <i className="fas fa-times"></i> Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '100%', maxWidth: '1100px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                                Showing <span>{filteredProducts.length}</span> results
                            </div>
                            <div className="product-grid">
                                {filteredProducts.map(p => (
                                    <div className="product-card" key={p.id}>
                                        <img src={p.imageLink} alt={p.name} className="product-img" />
                                        <span className={`stock-tag ${p.stock > 0 ? 'in-stock' : 'out-stock'}`}>
                                            {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                        </span>
                                        <div className="product-body">
                                            <div className="product-category">{p.category}</div>
                                            <div className="product-name">{p.name}</div>
                                            <div className="product-price">₹{p.price}</div>
                                            <a href={`/add-cart/${p.id}`} className="btn-add-cart">
                                                <i className="fas fa-cart-plus"></i> Add to Cart
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </main>

            <footer style={{ background: 'rgba(0,0,0,0.5)', borderTop: '1px solid var(--glass-border)', padding: '1.25rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>Ek<span>art</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}