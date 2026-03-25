import React, { useState, useEffect, useRef } from 'react';

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

    const CSS = `
        :root {
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

        .search-page {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            position: relative;
        }

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: ''; position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
        }
        .bg-layer::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: rgba(0,0,0,0.25); backdrop-filter: blur(14px); border-bottom: 1px solid var(--glass-border);
            transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.5); }

        .nav-brand { font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-brand span { color: var(--yellow); }

        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border); transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }

        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }

        .page { flex: 1; padding: 7rem 2rem 3rem; display: flex; flex-direction: column; align-items: center; gap: 1.75rem; }

        .page-header {
            background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
            border-radius: 20px; padding: 2rem 2.5rem; display: flex; align-items: center;
            justify-content: space-between; gap: 1.5rem; width: 100%; max-width: 1100px;
        }

        .search-card, .filter-card {
            background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
            border-radius: 20px; padding: 2rem 2.5rem; width: 100%; max-width: 1100px;
        }

        .section-label {
            display: flex; align-items: center; gap: 0.6rem; font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.12em; color: var(--yellow); margin-bottom: 1.25rem;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

        .search-row { display: flex; gap: 0.875rem; align-items: center; }
        .search-input-wrap { flex: 1; position: relative; }
        .search-icon-fixed { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-dim); }

        .search-input {
            width: 100%; background: var(--input-bg); border: 1px solid var(--input-border);
            border-radius: 12px; padding: 0.85rem 3rem 0.85rem 2.75rem; color: white;
            font-family: inherit; font-size: 0.9rem; outline: none; transition: all 0.25s;
        }
        .search-input:focus { border-color: var(--yellow); box-shadow: 0 0 0 3px rgba(245,168,0,0.12); }

        .voice-btn {
            position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
            background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 1rem;
        }
        .voice-btn.listening { color: #ff6060; animation: pulse 1s infinite; }

        .btn-search {
            background: var(--yellow); color: #1a1000; border: none; border-radius: 12px;
            padding: 0.85rem 1.75rem; font-weight: 700; text-transform: uppercase; cursor: pointer;
            display: flex; align-items: center; gap: 0.5rem;
        }

        .did-you-mean {
            width: 100%; max-width: 1100px; background: rgba(245,168,0,0.08);
            border: 1px solid rgba(245,168,0,0.35); border-radius: 14px; padding: 1rem 1.5rem;
            display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem;
        }

        .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1.1rem; align-items: end; }
        .filter-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .filter-group label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); }

        .filter-select, .filter-input {
            background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 10px;
            padding: 0.6rem 0.875rem; color: white; font-size: 0.825rem; outline: none;
        }

        .product-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem;
            width: 100%; max-width: 1100px;
        }
        .product-card {
            background: var(--glass-card); backdrop-filter: blur(16px); border: 1px solid var(--glass-border);
            border-radius: 18px; overflow: hidden; transition: all 0.3s; position: relative;
        }
        .product-card:hover { transform: translateY(-7px); border-color: rgba(245,168,0,0.45); }

        .product-img { width: 100%; height: 180px; object-fit: cover; }
        .stock-tag {
            position: absolute; top: 10px; right: 10px; font-size: 0.65rem; font-weight: 700;
            padding: 3px 10px; border-radius: 50px; text-transform: uppercase;
        }
        .in-stock { background: rgba(34,197,94,0.18); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .out-stock { background: rgba(255,96,96,0.18); color: #ff8060; border: 1px solid rgba(255,96,96,0.3); }

        .product-body { padding: 1.25rem; }
        .product-category { font-size: 0.65rem; font-weight: 700; color: var(--yellow); text-transform: uppercase; }
        .product-name { font-size: 0.9rem; font-weight: 700; margin: 0.35rem 0; }
        .product-price { font-size: 1.1rem; font-weight: 800; color: var(--yellow); }

        .btn-add-cart {
            display: flex; align-items: center; justify-content: center; gap: 0.4rem;
            width: 100%; background: var(--yellow); color: #1a1000; border: none; border-radius: 10px;
            padding: 0.7rem; font-weight: 700; text-transform: uppercase; text-decoration: none; margin-top: 1rem;
        }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .search-row { flex-direction: column; }
            .btn-search { width: 100%; justify-content: center; }
        }
    `;

    return (
        <div className="search-page">
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            <nav className={isScrolled ? 'scrolled' : ''}>
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ek<span>art</span>
                </a>
                <div className="nav-right">
                    <a href="/customer/home" className="nav-link-btn"><i className="fas fa-th-large"></i> Dashboard</a>
                    <a href="/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
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