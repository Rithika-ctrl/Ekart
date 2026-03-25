import React, { useState, useEffect } from 'react';

/**
 * Ekart - My Wishlist Component (Empty State)
 * * @param {Object} props
 * @param {Array} props.products - List of products in the wishlist
 * @param {number} props.wishlistCount - Total number of items saved
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
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        const alertTimer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 5000);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(alertTimer);
        };
    }, []);

    // --- HANDLERS ---
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
                if (wishlistItems.length <= 1) {
                    window.location.reload();
                }
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

        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border); transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }

        .nav-brand {
            font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none;
            display: flex; align-items: center; gap: 0.5rem; letter-spacing: 0.04em;
        }
        .nav-brand span { color: var(--yellow); }

        .nav-right { display: flex; align-items: center; gap: 0.75rem; }

        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border); transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .nav-link-btn.active { background: rgba(245, 168, 0, 0.15); color: var(--yellow); border-color: rgba(245,168,0,0.4); }

        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem; color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500; padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.22); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        .page {
            flex: 1; padding: 7rem 3rem 3rem; max-width: 1400px; margin: 0 auto; width: 100%;
            display: flex; flex-direction: column; gap: 2rem;
        }

        .page-header {
            background: var(--glass-card); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 20px;
            padding: 2.5rem 3rem; display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem; flex-wrap: wrap; animation: fadeUp 0.5s ease both;
        }
        .page-header-left h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; }
        .page-header-left h1 span { color: var(--yellow); }
        .page-header-left p { font-size: 0.85rem; color: var(--text-dim); }

        .page-header-icon {
            width: 50px; height: 50px; background: rgba(239,68,68,0.15); border: 2px solid rgba(239,68,68,0.3);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 1.2rem; flex-shrink: 0; color: var(--red);
        }

        .empty-state {
            text-align: center; padding: 6rem 2rem; background: var(--glass-card);
            backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
            border-radius: 20px; animation: fadeUp 0.5s ease both;
            display: flex; flex-direction: column; align-items: center;
        }
        .empty-state i { font-size: 4rem; color: var(--text-dim); margin-bottom: 1.5rem; opacity: 0.4; }
        .empty-state h2 { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.75rem; letter-spacing: -0.01em; }
        .empty-state p { color: var(--text-dim); margin-bottom: 2.5rem; font-size: 0.95rem; max-width: 300px; line-height: 1.6; }

        .btn-browse {
            display: inline-flex; align-items: center; gap: 0.75rem; background: var(--yellow);
            color: #1a1000; text-decoration: none; padding: 1rem 2.5rem; border-radius: 12px;
            font-weight: 700; font-size: 0.95rem; transition: all 0.3s;
            box-shadow: 0 10px 20px rgba(245, 168, 0, 0.2);
        }
        .btn-browse:hover { background: var(--yellow-d); transform: translateY(-3px); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        @media(max-width: 900px) { nav { padding: 0.875rem 1.25rem; } .page { padding: 5.5rem 1.25rem 2rem; } .page-header { flex-direction: column; text-align: center; } }
    `;

    return (
        <div className="wishlist-body">
            <style>{CSS}</style>
            <div className="bg-layer"></div>
            
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            {/* --- NAV --- */}
            <nav id="nav" className={scrolled ? 'scrolled' : ''}>
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize: '1.2rem', marginRight: '8px'}}></i>
                    Ekart
                </a>
                <div className="nav-right">
                    <a href="/account/wishlist" className="nav-link-btn active">
                        <i className="fas fa-heart"></i> Wishlist
                    </a>
                    <a href="/view-cart" className="nav-link-btn">
                        <i className="fas fa-shopping-cart"></i> Cart
                    </a>
                    <a href="/customer/home" className="nav-link-btn">
                        <i className="fas fa-th-large"></i> Dashboard
                    </a>
                    <a href="/logout" className="btn-logout">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            {/* --- MAIN PAGE --- */}
            <main className="page">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>My <span>Wishlist</span></h1>
                        <p>{wishlistCount} items saved for later</p>
                    </div>
                    <div className="page-header-icon">
                        <i className="fas fa-heart"></i>
                    </div>
                </div>

                {/* --- EMPTY STATE UI (Matches Uploaded Screenshot) --- */}
                <div className="empty-state">
                    <i className="far fa-heart"></i>
                    <h2>Your wishlist is empty</h2>
                    <p>Start adding items you love by clicking the heart icon on products</p>
                    <a href="/customer/view-products" className="btn-browse">
                        <i className="fas fa-shopping-bag" style={{opacity: 0.3}}></i> Browse Products
                    </a>
                </div>
            </main>
        </div>
    );
}