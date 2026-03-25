import React, { useState, useEffect } from 'react';

/**
 * AdminReviewManagement Component
 * * @param {Object} props
 * @param {Array} props.products - List of products with their associated reviews [{id, name, imageLink, reviews: [{id, customerName, rating, comment, createdAt}]}]
 * @param {Object} props.session - Session object containing notification messages {success: string, failure: string}
 * @param {string} props.csrfToken - CSRF token for secure form submissions
 */
export default function AdminReviewManagement({
    products = [],
    session = { success: null, failure: null },
    csrfToken = ""
}) {
    // --- STATE ---
    const [scrolled, setScrolled] = useState(false);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
    const [bulkModal, setBulkModal] = useState({ show: false, productName: '', productId: null });

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);

        const timer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timer);
        };
    }, []);

    // --- HANDLERS ---
    const confirmDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmBulkDelete = (productName, productId) => {
        setBulkModal({ show: true, productName, productId });
    };

    const closeModal = () => setDeleteModal({ show: false, id: null });
    const closeBulkModal = () => setBulkModal({ show: false, productName: '', productId: null });

    const CSS = `
        :root {
            --yellow: #f5a800; --yellow-d: #d48f00;
            --glass-border: rgba(255,255,255,0.18);
            --glass-card: rgba(255,255,255,0.07);
            --glass-nav: rgba(0,0,0,0.30);
            --text-white: #ffffff; --text-light: rgba(255,255,255,0.80); --text-dim: rgba(255,255,255,0.45);
            --green: #10b981; --red: #ef4444; --orange: #f97316;
        }

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: ''; position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px); transform: scale(1.08);
        }
        .bg-layer::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.85) 0%, rgba(8,12,28,0.80) 40%, rgba(5,8,20,0.90) 100%);
        }

        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav); backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border); transition: background 0.3s;
        }
        nav.scrolled { background: rgba(0,0,0,0.45); }
        .nav-brand { font-size: 1.6rem; font-weight: 700; color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
        .nav-brand span { color: var(--yellow); }

        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert { padding: 0.875rem 1.25rem; background: rgba(10,12,30,0.88); backdrop-filter: blur(16px); border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.625rem; font-size: 0.825rem; min-width: 260px; animation: slideIn 0.3s ease both; }
        .alert-success { border-color: rgba(16,185,129,0.45); color: var(--green); }
        .alert-danger  { border-color: rgba(239,68,68,0.45); color: var(--red); }

        .page { flex: 1; padding: 7rem 3rem 3rem; display: flex; flex-direction: column; gap: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; font-family: 'Poppins', sans-serif; }
        .page-header { background: var(--glass-card); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2.5rem 3rem; display: flex; align-items: center; justify-content: space-between; gap: 2rem; animation: fadeUp 0.5s ease both; }
        .page-header h1 span { color: var(--yellow); }

        .product-section { background: var(--glass-card); border: 1px solid var(--glass-border); border-radius: 20px; padding: 1.5rem; margin-bottom: 2rem; animation: fadeUp 0.6s ease both; }
        .product-meta { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--glass-border); flex-wrap: wrap; }
        .prod-img { width: 60px; height: 60px; border-radius: 10px; object-fit: cover; border: 1px solid var(--glass-border); }
        .prod-info h2 { font-size: 1.2rem; font-weight: 700; color: white; margin-bottom: 0.25rem; }
        .prod-info p { font-size: 0.8rem; color: var(--text-dim); }

        .reviews-table { width: 100%; border-collapse: collapse; }
        .reviews-table th { text-align: left; padding: 1rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--glass-border); }
        .reviews-table td { padding: 1.25rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: var(--text-light); }

        .rating-stars { color: var(--yellow); font-size: 0.75rem; }
        .customer-name { font-weight: 600; color: white; display: block; margin-bottom: 0.2rem; }
        .review-date { font-size: 0.7rem; color: var(--text-dim); }
        .review-comment { font-size: 0.82rem; line-height: 1.6; color: var(--text-light); }

        .btn-delete { background: rgba(239,68,68,0.1); color: var(--red); border: 1px solid rgba(239,68,68,0.3); padding: 0.5rem 0.8rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; }
        .btn-delete:hover { background: var(--red); color: white; }

        .btn-bulk-del { background: none; border: 1.5px solid rgba(239,68,68,0.3); color: var(--red); padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.75rem; font-weight: 700; cursor: pointer; margin-left: auto; transition: 0.2s; }
        .btn-bulk-del:hover { background: rgba(239,68,68,0.1); border-color: var(--red); }

        .modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; }
        .modal-overlay.show { display: flex; }
        .modal-box { background: #0a0c1a; border: 1px solid var(--glass-border); border-radius: 24px; padding: 2.5rem; width: 90%; max-width: 400px; text-align: center; }
        .modal-icon { font-size: 3rem; color: var(--red); margin-bottom: 1rem; }
        .modal-box h3 { font-size: 1.25rem; font-weight: 700; color: white; margin-bottom: 0.75rem; }
        .modal-box p { font-size: 0.85rem; color: var(--text-dim); line-height: 1.6; margin-bottom: 2rem; }
        
        .modal-actions { display: flex; gap: 1rem; }
        .btn-modal { flex: 1; padding: 0.8rem; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; border: none; transition: 0.2s; font-family: 'Poppins', sans-serif; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
        .btn-cancel { background: rgba(255,255,255,0.08); color: white; }
        .btn-confirm-del { background: var(--red); color: white; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        @media(max-width: 800px) {
            nav { padding: 1rem 1.5rem; }
            .page { padding: 6rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; padding: 2rem; }
            .product-meta { flex-direction: column; text-align: center; }
            .btn-bulk-del { margin: 1rem 0 0; width: 100%; }
            .reviews-table thead { display: none; }
            .reviews-table td { display: block; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
        }
    `;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{CSS}</style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            <div className="bg-layer"></div>

            {/* Alert Stack */}
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

            {/* Navbar */}
            <nav className={scrolled ? 'scrolled' : ''}>
                <a href="/admin/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ color: 'var(--yellow)', fontSize: '1.1rem' }}></i>
                    Ek<span>art</span>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="/admin/home" style={{ color: 'var(--text-light)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500 }}>
                        <i className="fas fa-arrow-left"></i> Dashboard
                    </a>
                    <a href="/admin/logout" style={{ background: 'rgba(255,100,80,0.1)', color: '#ff8060', border: '1px solid rgba(255,100,80,0.3)', padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>

            <main className="page">
                <div className="page-header">
                    <div>
                        <h1>Review <span>Management</span> ⭐</h1>
                        <p>Monitor and moderate customer feedback across your product catalog.</p>
                    </div>
                    <div style={{ width: '60px', height: '60px', background: 'rgba(245,168,0,0.15)', border: '2px solid rgba(245,168,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--yellow)' }}>
                        <i className="fas fa-star-half-alt"></i>
                    </div>
                </div>

                {products.map((product) => (
                    <div key={product.id} className="product-section">
                        <div className="product-meta">
                            <img src={product.imageLink} alt={product.name} className="prod-img" />
                            <div className="prod-info">
                                <h2>{product.name}</h2>
                                <p>Product ID: #{product.id} • {product.reviews.length} total reviews</p>
                            </div>
                            
                            <button 
                                className="btn-bulk-del" 
                                onClick={() => confirmBulkDelete(product.name, product.id)}
                            >
                                <i className="fas fa-dumpster"></i> Delete All Reviews
                            </button>
                            
                            <form id={`bulk-form-${product.id}`} action={`/admin/bulk-delete-reviews/${product.id}`} method="post" style={{ display: 'none' }}>
                                {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                            </form>
                        </div>

                        {product.reviews.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="reviews-table">
                                    <thead>
                                        <tr>
                                            <th>Customer</th>
                                            <th>Rating</th>
                                            <th>Comment</th>
                                            <th>Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {product.reviews.map((review) => (
                                            <tr key={review.id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <span className="customer-name">{review.customerName}</span>
                                                    <span className="review-date">Verified Buyer</span>
                                                </td>
                                                <td>
                                                    <div className="rating-stars">
                                                        {[...Array(5)].map((_, i) => (
                                                            <i key={i} className={`${i < review.rating ? 'fas' : 'far'} fa-star`}></i>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    <p className="review-comment">"{review.comment}"</p>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                                    {review.createdAt}
                                                </td>
                                                <td>
                                                    <button 
                                                        className="btn-delete" 
                                                        onClick={() => confirmDelete(review.id)}
                                                    >
                                                        <i className="fas fa-trash-alt"></i> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                <i className="far fa-comment-dots" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}></i>
                                No reviews for this product yet.
                            </div>
                        )}
                    </div>
                ))}
            </main>

            {/* Individual Delete Modal */}
            <div className={`modal-overlay ${deleteModal.show ? 'show' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}>
                <div className="modal-box">
                    <div className="modal-icon"><i className="fas fa-exclamation-circle"></i></div>
                    <h3>Delete Review?</h3>
                    <p>This action will permanently remove this customer's feedback. This cannot be undone.</p>
                    <div className="modal-actions">
                        <button className="btn-modal btn-cancel" onClick={closeModal}>Cancel</button>
                        <a id="confirmDeleteBtn" href={`/admin/delete-review/${deleteModal.id}`} className="btn-modal btn-confirm-del">
                            Confirm Delete
                        </a>
                    </div>
                </div>
            </div>

            {/* Bulk Delete Modal */}
            <div className={`modal-overlay ${bulkModal.show ? 'show' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && closeBulkModal()}>
                <div className="modal-box">
                    <div className="modal-icon"><i className="fas fa-trash-alt"></i></div>
                    <h3>Bulk Deletion</h3>
                    <p id="bulkModalText">
                        This will permanently delete ALL reviews for "{bulkModal.productName}". Cannot be undone.
                    </p>
                    <div className="modal-actions">
                        <button className="btn-modal btn-cancel" onClick={closeBulkModal}>Cancel</button>
                        <button 
                            className="btn-modal btn-confirm-del" 
                            onClick={() => document.getElementById(`bulk-form-${bulkModal.productId}`).submit()}
                        >
                            Delete All
                        </button>
                    </div>
                </div>
            </div>

            <footer style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.5)', padding: '1.25rem 3rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Ekart</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>© 2026 Admin Moderator Panel. All rights reserved.</div>
            </footer>
        </div>
    );
}