import React, { useState, useEffect } from 'react';

/**
 * GuestBrowse Component
 * * @param {Object} props
 * @param {Array} props.products - List of product objects [{id, name, description, price, mrp, category, imageLink, discounted, discountPercent, reviews: [{rating}]}]
 * @param {string} props.query - Current search query string
 * @param {Object} props.session - Session object for notifications {success: string, failure: string}
 */
export default function GuestBrowse({
    products = [],
    query = "",
    session = { success: null, failure: null }
}) {
    // --- STATE ---
    const [budgetValue, setBudgetValue] = useState(10000);
    const [budgetStats, setBudgetStats] = useState({ display: "All Products", count: "" });
    const [isScrolled, setIsScrolled] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 40);
        };
        window.addEventListener('scroll', handleScroll);
        
        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 3000);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsModalOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
        };
    }, [session]);

    // --- LOGIC ---
    const handleBudgetChange = (val) => {
        const num = parseFloat(val);
        setBudgetValue(num);
        
        if (num >= 10000) {
            setBudgetStats({ display: "All Products", count: "" });
        } else {
            const visibleCount = products.filter(p => p.price <= num).length;
            setBudgetStats({
                display: `₹${num.toLocaleString('en-IN')}`,
                count: `${visibleCount} item${visibleCount !== 1 ? 's' : ''} in budget`
            });
        }
    };

    const isProductVisible = (price) => {
        return budgetValue >= 10000 || price <= budgetValue;
    };

    const CSS = `
        :root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255,255,255,0.22);
            --glass-card:   rgba(255,255,255,0.10);
            --glass-nav:    rgba(0,0,0,0.28);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }

        .guest-browse-body {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex; flex-direction: column;
            position: relative;
        }

        .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
        .bg-layer::before {
            content:''; position:absolute; inset:-20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
        }
        .bg-layer::after {
            content:''; position:absolute; inset:0;
            background: linear-gradient(180deg,rgba(5,8,20,0.85) 0%,rgba(8,12,28,0.80) 40%,rgba(5,8,20,0.90) 100%);
        }

        nav {
            position:fixed; top:0; left:0; right:0; z-index:100;
            padding:1rem 3rem;
            display:flex; align-items:center; justify-content:space-between;
            background: var(--glass-nav);
            backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border);
            transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.5); }

        .nav-brand {
            font-size:1.6rem; font-weight:700;
            color:var(--text-white); text-decoration:none;
            letter-spacing:0.04em;
            display:flex; align-items:center; gap:0.5rem;
        }
        .nav-brand span { color:var(--yellow); }

        .nav-links { display:flex; align-items:center; gap:0.5rem; list-style:none; }
        .nav-links a {
            color:var(--text-light); text-decoration:none;
            font-size:0.82rem; font-weight:500;
            padding:0.45rem 0.9rem; border-radius:6px;
            transition: all 0.2s;
        }
        .nav-links a:hover { color:white; background:rgba(255,255,255,0.1); }

        .btn-nav-login {
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.4);
            color: var(--yellow) !important;
            border-radius: 50px !important;
            font-weight: 700 !important;
        }
        .btn-nav-register {
            background: var(--yellow);
            color: #1a1000 !important;
            border-radius: 50px !important;
            font-weight: 700 !important;
        }

        .guest-banner {
            margin-top: 72px;
            background: linear-gradient(135deg, rgba(245,168,0,0.18), rgba(245,100,0,0.10));
            border-bottom: 1px solid rgba(245,168,0,0.3);
            padding: 0.85rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1rem; flex-wrap: wrap;
        }
        .btn-banner {
            font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em;
            padding: 0.45rem 1.1rem; border-radius: 50px;
            text-decoration: none; transition: all 0.2s;
            border: 1px solid;
        }
        .btn-banner-login { background: var(--yellow); color: #1a1000; border-color: var(--yellow); }

        .alert-stack { position:fixed; top:5.5rem; right:1.5rem; z-index:200; display:flex; flex-direction:column; gap:0.5rem; }
        .alert { padding:0.875rem 1.25rem; background:rgba(10,12,30,0.88); backdrop-filter:blur(16px); border:1px solid; border-radius:10px; display:flex; align-items:center; gap:0.625rem; font-size:0.825rem; min-width:260px; animation:slideIn 0.3s ease both; }
        .alert-success { border-color:rgba(34,197,94,0.45); color:#22c55e; }
        .alert-danger  { border-color:rgba(255,100,80,0.45); color:#ff8060; }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

        main { flex:1; padding: 2rem 3rem 3rem; max-width:1400px; margin:0 auto; width:100%; }

        .search-input-wrap {
            flex: 1; position: relative;
            background: rgba(255,255,255,0.08);
            border: 1px solid var(--glass-border);
            border-radius: 50px;
            display: flex; align-items: center;
        }
        .search-input-wrap input {
            width: 100%; background: transparent; border: none; outline: none;
            padding: 0.8rem 1rem 0.8rem 2.8rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem; color: white;
        }

        .budget-bar {
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            border-radius: 14px;
            padding: 1rem 1.5rem;
            margin-bottom: 1.75rem;
            display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
        }

        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 1.5rem;
        }

        .product-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 18px;
            overflow: hidden;
            transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
            position: relative;
            height: 100%;
        }
        .product-card-wrapper.product-over-budget { opacity: 0.2; pointer-events: none; transform: scale(0.97); }

        .budget-badge {
            display: none;
            position: absolute; top: 0.6rem; right: 0.6rem;
            background: rgba(34,197,94,0.9); color: #fff;
            font-size: 0.6rem; font-weight: 700;
            padding: 0.2rem 0.55rem; border-radius: 50px;
            z-index: 2;
        }
        .within-budget .budget-badge { display: block; }

        .modal-overlay {
            display: none; position: fixed; inset: 0; z-index: 500;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
            align-items: center; justify-content: center;
        }
        .modal-overlay.show { display: flex; }
        .modal-box {
            background: rgba(10,12,30,0.96);
            border: 1px solid rgba(245,168,0,0.4);
            border-radius: 22px;
            padding: 2.5rem 2rem;
            max-width: 400px; width: 90%;
            text-align: center;
        }

        @media(max-width: 768px) {
            nav { padding: 0.875rem 1.25rem; }
            main { padding: 1.5rem 1.25rem 2.5rem; }
            .products-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        }
    `;

    return (
        <div className="guest-browse-body">
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts({...alerts, success: null})}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts({...alerts, failure: null})}>×</button>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav className={isScrolled ? "scrolled" : ""}>
                <a href="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize:'1.1rem'}}></i>
                    E<span>kart</span>
                </a>
                <ul className="nav-links">
                    <li><a href="/guest/browse">Browse</a></li>
                    <li><a href="/customer/login" className="btn-nav-login"><i className="fas fa-sign-in-alt"></i> Login</a></li>
                    <li><a href="/customer/register" className="btn-nav-register"><i className="fas fa-user-plus"></i> Register</a></li>
                </ul>
            </nav>

            {/* GUEST BANNER */}
            <div className="guest-banner">
                <div className="guest-banner-left">
                    <div className="icon" style={{width:'32px', height:'32px', background:'rgba(245,168,0,0.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--yellow)', fontSize:'0.9rem'}}><i className="fas fa-eye"></i></div>
                    <div>
                        <strong>You're browsing as a Guest</strong> —
                        You can explore all products. <strong>Login</strong> to add items to cart &amp; checkout.
                    </div>
                </div>
                <div className="guest-banner-actions" style={{display:'flex', gap:'0.5rem'}}>
                    <a href="/customer/login" className="btn-banner btn-banner-login">Login</a>
                    <a href="/customer/register" className="btn-banner" style={{background:'transparent', color:'var(--text-light)', borderColor:'rgba(255,255,255,0.3)'}}>Register Free</a>
                </div>
            </div>

            <main>
                <div className="page-header" style={{marginBottom:'1.75rem'}}>
                    <h1 style={{fontSize:'2rem', fontWeight:800}}>Browse <span style={{color:'var(--yellow)'}}>Products</span></h1>
                    {query ? (
                        <p style={{fontSize:'0.85rem', color:'var(--text-dim)', marginTop:'0.3rem'}}>Showing results for "{query}"</p>
                    ) : (
                        <p style={{fontSize:'0.85rem', color:'var(--text-dim)', marginTop:'0.3rem'}}>Explore our full catalogue. Login to purchase any item.</p>
                    )}
                </div>

                <form action="/guest/search" method="get" className="search-wrap" style={{display:'flex', gap:'0.75rem', marginBottom:'2rem', alignItems:'center'}}>
                    <div className="search-input-wrap">
                        <i className="fas fa-search" style={{position:'absolute', left:'1.1rem', color:'var(--text-dim)', fontSize:'0.9rem'}}></i>
                        <input type="text" name="query" placeholder="Search products by name, category..." defaultValue={query} autoComplete="off" />
                    </div>
                    <button type="submit" className="btn-search" style={{background:'var(--yellow)', color:'#1a1000', border:'none', borderRadius:'50px', padding:'0.8rem 1.6rem', fontWeight:700, cursor:'pointer'}}>Search</button>
                </form>

                <div className="budget-bar">
                    <span className="budget-label" style={{fontSize:'0.78rem', fontWeight:600, color:'var(--text-dim)'}}><i className="fas fa-coins" style={{color:'var(--yellow)', marginRight:'0.4rem'}}></i> Budget Mode</span>
                    <input type="range" min="0" max="10000" step="50" value={budgetValue} onChange={(e) => handleBudgetChange(e.target.value)} style={{flex:1, accentColor:'var(--yellow)', cursor:'pointer'}} />
                    <span className="budget-value" style={{fontSize:'0.82rem', fontWeight:700, color:'var(--yellow)', minWidth:'90px', textAlign:'right'}}>{budgetStats.display}</span>
                    <span className="budget-count" style={{fontSize:'0.72rem', color:'var(--text-dim)'}}>{budgetStats.count}</span>
                </div>

                <div className="products-grid">
                    {(!products || products.length === 0) ? (
                        <div className="empty-state">
                            <i className="fas fa-box-open"></i>
                            <h2 style={{fontSize:'1.3rem', color:'var(--text-light)', marginBottom:'0.5rem'}}>No Products Found</h2>
                            <p style={{fontSize:'0.85rem', color:'var(--text-dim)'}}>{query ? `No results for "${query}". Try a different keyword.` : 'No approved products available right now. Check back soon!'}</p>
                        </div>
                    ) : (
                        products.map(p => {
                            const avgRating = p.reviews && p.reviews.length > 0 
                                ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length 
                                : 0;
                            const isWithinBudget = p.price <= budgetValue;

                            return (
                                <div key={p.id} className={`product-card-wrapper ${!isProductVisible(p.price) ? "product-over-budget" : ""}`}>
                                    <div className={`product-card ${isWithinBudget && budgetValue < 10000 ? "within-budget" : ""}`}>
                                        <span className="budget-badge"><i className="fas fa-check-double"></i> In Budget</span>
                                        <div className="product-img-wrap" style={{width:'100%', height:'200px', overflow:'hidden', position:'relative'}}>
                                            <span className="category-pill" style={{position:'absolute', top:'0.6rem', left:'0.6rem', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)', fontSize:'0.6rem', fontWeight:700, color:'var(--yellow)', padding:'0.2rem 0.6rem', borderRadius:'50px', border:'1px solid rgba(245,168,0,0.35)', zIndex:1}}>{p.category}</span>
                                            <img src={p.imageLink} alt={p.name} style={{width:'100%', height:'100%', objectFit:'cover'}} onError={(e) => e.target.src='https://via.placeholder.com/400x300?text=No+Image'} />
                                        </div>
                                        <div className="product-info" style={{padding:'1rem'}}>
                                            <div className="product-name" style={{fontSize:'0.9rem', fontWeight:700, color:'white', marginBottom:'0.3rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.name}</div>
                                            <div className="product-desc" style={{fontSize:'0.73rem', color:'var(--text-dim)', lineHeight:1.5, marginBottom:'0.75rem', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>{p.description}</div>
                                            <div className="stars" style={{color:'var(--yellow)', fontSize:'0.65rem', marginBottom:'0.5rem'}}>
                                                {[1,2,3,4,5].map(s => (
                                                    <i key={s} className={s <= Math.round(avgRating) ? "fas fa-star" : "far fa-star"}></i>
                                                ))}
                                                <span style={{fontSize:'0.65rem', color:'var(--text-dim)', marginLeft:'0.3rem'}}>{p.reviews && p.reviews.length > 0 ? `(${p.reviews.length})` : '(No reviews yet)'}</span>
                                            </div>
                                        </div>
                                        <div className="product-footer" style={{display:'flex', alignItems:'center', justifyBetween:'space-between', padding:'0.5rem 1rem 1rem'}}>
                                            <div className="price-tag" style={{fontSize:'1.15rem', fontWeight:800, color:'white'}}>
                                                <sup>₹</sup><span>{p.price}</span>
                                                {p.discounted && (
                                                    <>
                                                        <span style={{fontSize:'0.7rem', textDecoration:'line-through', color:'rgba(255,255,255,0.4)', marginLeft:'0.4rem'}}>₹{p.mrp}</span>
                                                        <span style={{fontSize:'0.68rem', fontWeight:800, color:'#ef4444', marginLeft:'0.2rem'}}>-{p.discountPercent}%</span>
                                                    </>
                                                )}
                                            </div>
                                            <button className="btn-login-prompt" onClick={() => setIsModalOpen(true)} style={{display:'inline-flex', alignItems:'center', gap:'0.4rem', background:'rgba(245,168,0,0.12)', border:'1px solid rgba(245,168,0,0.35)', color:'var(--yellow)', borderRadius:'50px', padding:'0.5rem 1rem', fontSize:'0.73rem', fontWeight:700, cursor:'pointer'}}><i className="fas fa-cart-plus"></i> Add</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* LOGIN MODAL */}
            <div className={`modal-overlay ${isModalOpen ? 'show' : ''}`} onClick={(e) => e.target.id === "loginModal" && setIsModalOpen(false)} id="loginModal">
                <div className="modal-box">
                    <div className="modal-icon"><i className="fas fa-shopping-cart"></i></div>
                    <h2>Login to Add to Cart</h2>
                    <p>You're browsing as a <strong>Guest</strong>.<br />Create a free account or login to add items to your cart and checkout.</p>
                    <div className="modal-actions" style={{display:'flex', gap:'0.75rem', justifyContent:'center', flexWrap:'wrap'}}>
                        <a href="/customer/login" className="btn-modal btn-modal-login" style={{padding:'0.7rem 1.5rem', borderRadius:'50px', background:'var(--yellow)', color:'#1a1000', fontWeight:700, textDecoration:'none'}}>Login</a>
                        <a href="/customer/register" className="btn-modal" style={{padding:'0.7rem 1.5rem', borderRadius:'50px', background:'transparent', color:'var(--text-light)', border:'1px solid rgba(255,255,255,0.3)', fontWeight:700, textDecoration:'none'}}>Register Free</a>
                    </div>
                    <br />
                    <button className="btn-modal" onClick={() => setIsModalOpen(false)} style={{background:'transparent', color:'var(--text-dim)', border:'none', cursor:'pointer', fontSize:'0.78rem'}}>No thanks, keep browsing</button>
                </div>
            </div>

            <footer style={{background:'rgba(0,0,0,0.5)', backdropFilter:'blur(16px)', borderTop:'1px solid var(--glass-border)', padding:'1.25rem 3rem', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <div style={{fontSize:'1.1rem', fontWeight:700}}><span>Ekart</span></div>
                <div style={{fontSize:'0.72rem', color:'var(--text-dim)'}}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}