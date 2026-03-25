import React, { useState, useEffect } from 'react';

/**
 * Ekart - My Wishlist Component
 * * @param {Object} props
 * @param {Array} props.products - List of products in the wishlist
 * @param {number} props.wishlistCount - Total number of items in the wishlist
 * @param {Object} props.session - Session object for success/failure alerts
 */
export default function Wishlist({ 
    products = [], 
    wishlistCount = 0, 
    session = { success: null, failure: null } 
}) {
    // --- STATE ---
    const [wishlistItems, setWishlistItems] = useState(products);
    const [scrolled, setScrolled] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentCartProductId, setCurrentCartProductId] = useState(null);

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- HELPERS ---
    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const removeFromWishlist = async (productId) => {
        try {
            const response = await fetch(`/api/wishlist/${productId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            
            if (data.success) {
                setWishlistItems(prev => prev.filter(p => p.id !== productId));
                showToast('Removed from wishlist', 'success');
            } else {
                showToast(data.message || 'Failed to remove', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        }
    };

    const addToCartFromWishlist = async (productId) => {
        setCurrentCartProductId(productId);
        try {
            const response = await fetch(`/add-cart/${productId}`);
            if (response.ok) {
                setShowModal(true);
            } else {
                showToast('Failed to add to cart', 'error');
            }
        } catch (error) {
            showToast('Something went wrong', 'error');
        }
    };

    const handleCartChoice = async (keepInWishlist) => {
        setShowModal(false);
        if (!keepInWishlist && currentCartProductId) {
            await removeFromWishlist(currentCartProductId);
            showToast('Moved to cart', 'success');
        } else {
            showToast('Added to cart (kept in wishlist)', 'success');
        }
        setCurrentCartProductId(null);
    };

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
            --red:          #ef4444;
            --green:        #22c55e;
        }

        .wishlist-container {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
            position: relative;
        }

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
            background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

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
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }

        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border);
            transition: all 0.2s;
        }
        .nav-link-btn.active { color: var(--yellow); border-color: rgba(245,168,0,0.4); }

        .page {
            flex: 1; padding: 7rem 3rem 3rem;
            max-width: 1400px; margin: 0 auto; width: 100%;
            display: flex; flex-direction: column; gap: 2rem;
        }

        .page-header {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 20px;
            padding: 2rem 2.5rem; display: flex; align-items: center; justify-content: space-between;
        }

        .product-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.75rem;
        }

        .product-card {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 22px;
            overflow: hidden; display: flex; flex-direction: column;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
        }

        .img-area { position: relative; height: 200px; overflow: hidden; }
        .card-image { width: 100%; height: 100%; object-fit: cover; }

        .btn-remove-wishlist {
            position: absolute; top: 12px; right: 12px;
            width: 36px; height: 36px; background: rgba(239,68,68,0.9);
            border: none; border-radius: 50%; color: white; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }

        .price-tag { font-size: 1.4rem; font-weight: 800; color: var(--yellow); }

        .btn-add-cart {
            flex: 1; background: var(--yellow); color: #1a1000;
            padding: 0.7rem 1rem; border-radius: 10px; font-weight: 700;
            border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
        }

        .toast-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.75rem; }
        .toast { background: rgba(10,12,30,0.95); border-radius: 12px; padding: 1rem 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
        
        .modal-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
        }
    `;

    return (
        <div className="wishlist-container">
            <style>{CSS}</style>
            <div className="bg-layer"></div>

            {/* --- NAV --- */}
            <nav className={scrolled ? 'scrolled' : ''}>
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart"></i> Ekart
                </a>
                <div className="nav-right">
                    <a href="/account/wishlist" className="nav-link-btn active">
                        <i className="fas fa-heart"></i> Wishlist
                    </a>
                    <a href="/view-cart" className="nav-link-btn">
                        <i className="fas fa-shopping-cart"></i> Cart
                    </a>
                    <a href="/logout" className="btn-logout">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            {/* --- PAGE --- */}
            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>My <span>Wishlist</span></h1>
                        <p>{wishlistCount} items saved for later</p>
                    </div>
                    <div className="page-header-icon"><i className="fas fa-heart"></i></div>
                </div>

                {wishlistItems.length === 0 ? (
                    <div className="empty-state">
                        <i className="far fa-heart"></i>
                        <h2>Your wishlist is empty</h2>
                        <a href="/customer/view-products" className="btn-browse">Browse Products</a>
                    </div>
                ) : (
                    <div className="product-grid">
                        {wishlistItems.map(p => (
                            <div key={p.id} className="product-card">
                                <div className="img-area">
                                    <img className="card-image" src={p.imageLink} alt={p.name} />
                                    <span className="category-pill">{p.category}</span>
                                    <button className="btn-remove-wishlist" onClick={() => removeFromWishlist(p.id)}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="card-body" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <div className="product-name" style={{ fontWeight: 700 }}>{p.name}</div>
                                    <div className="product-description" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{p.description}</div>
                                    <div className="price-row" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
                                        <div className="price-tag"><sup>₹</sup>{p.price}</div>
                                        <span className={`stock-badge ${p.stock > 0 ? 'in-stock' : 'out-of-stock'}`} style={{ fontSize: '0.7rem', color: p.stock > 0 ? 'var(--green)' : 'var(--red)' }}>
                                            {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-actions" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
                                    <button 
                                        className="btn-add-cart" 
                                        disabled={p.stock <= 0}
                                        onClick={() => addToCartFromWishlist(p.id)}
                                    >
                                        <i className={p.stock > 0 ? "fas fa-cart-plus" : "fas fa-ban"}></i>
                                        {p.stock > 0 ? "Add to Cart" : "Out of Stock"}
                                    </button>
                                    <button className="btn-remove" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.7rem 1rem', borderRadius: '10px', cursor: 'pointer' }} onClick={() => removeFromWishlist(p.id)}>
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* --- TOASTS --- */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <i className={`fas fa-${t.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>

            {/* --- MODAL --- */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'rgba(15, 18, 40, 0.95)', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                        <h3>Added to Cart!</h3>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>Keep item in wishlist?</p>
                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="modal-btn secondary" style={{ padding: '0.7rem 1.5rem', borderRadius: '10px', cursor: 'pointer' }} onClick={() => handleCartChoice(true)}>Keep</button>
                            <button className="modal-btn primary" style={{ background: 'var(--yellow)', padding: '0.7rem 1.5rem', borderRadius: '10px', cursor: 'pointer' }} onClick={() => handleCartChoice(false)}>Move to Cart</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}