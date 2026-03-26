import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/admin/login'); };
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

    const CSS = `:root {
            --yellow: #f5a800; --yellow-d: #d48f00;
            --glass-border: rgba(255,255,255,0.18);
            --glass-card: rgba(255,255,255,0.07);
            --glass-nav: rgba(0,0,0,0.30);
            --text-white: #ffffff; --text-light: rgba(255,255,255,0.80); --text-dim: rgba(255,255,255,0.45);
            --green: #10b981; --red: #ef4444; --orange: #f59e0b;
        }
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        #root { font-family:'Poppins',sans-serif; min-height:100vh; color:var(--text-white); display:flex; flex-direction:column; }

        .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
        .bg-layer::before {
            content:''; position:absolute; inset:-20px;
            background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter:blur(6px); transform:scale(1.08);
        }
        .bg-layer::after {
            content:''; position:absolute; inset:0;
            background:linear-gradient(180deg,rgba(5,8,20,0.88) 0%,rgba(8,12,28,0.84) 100%);
        }

        nav {
            position:fixed; top:0; left:0; right:0; z-index:100;
            padding:0.75rem 2rem; display:flex; align-items:center; justify-content:space-between;
            background:var(--glass-nav); backdrop-filter:blur(14px);
            border-bottom:1px solid var(--glass-border);
        }
        .nav-brand { font-size:1.4rem; font-weight:700; color:white; text-decoration:none; display:flex; align-items:center; gap:0.4rem; }
        .nav-brand span { color:var(--yellow); }
        .nav-links { display:flex; align-items:center; gap:0.4rem; }
        .nav-link {
            color:var(--text-light); text-decoration:none; font-size:0.8rem; font-weight:500;
            padding:0.4rem 0.85rem; border-radius:6px; border:1px solid var(--glass-border);
            transition:all 0.2s;
        }
        .nav-link:hover { background:rgba(255,255,255,0.1); color:white; }
        .nav-link.danger { border-color:rgba(239,68,68,0.35); color:rgba(239,68,68,0.8); }
        .nav-link.danger:hover { background:rgba(239,68,68,0.12); color:#ef4444; }

        .page { flex:1; padding:6rem 1.5rem 3rem; max-width:1200px; margin:0 auto; width:100%; }

        /* Alert */
        .alert { padding:0.9rem 1.2rem; border-radius:10px; margin-bottom:1.5rem; font-size:0.85rem; font-weight:500; }
        .alert-success { background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.35); color:#10b981; }
        .alert-danger  { background:rgba(239,68,68,0.15);  border:1px solid rgba(239,68,68,0.35);  color:#ef4444; }

        /* Page header */
        .page-header { margin-bottom:2rem; }
        .page-header h1 { font-size:1.8rem; font-weight:800; }
        .page-header h1 span { color:var(--yellow); }
        .page-header p { color:var(--text-dim); font-size:0.85rem; margin-top:0.3rem; }

        /* Stats row */
        .stats-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; margin-bottom:2rem; }
        .stat-card {
            background:var(--glass-card); border:1px solid var(--glass-border);
            border-radius:14px; padding:1.2rem 1.4rem; text-align:center;
            backdrop-filter:blur(12px); transition:transform 0.2s;
        }
        .stat-card:hover { transform:translateY(-3px); }
        .stat-num { font-size:2rem; font-weight:800; color:var(--yellow); }
        .stat-label { font-size:0.72rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin-top:0.25rem; }

        /* Star distribution */
        .dist-card {
            background:var(--glass-card); border:1px solid var(--glass-border);
            border-radius:16px; padding:1.5rem 2rem; margin-bottom:2rem;
            backdrop-filter:blur(12px);
        }
        .dist-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--yellow); margin-bottom:1rem; }
        .dist-row { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.6rem; }
        .dist-stars { font-size:0.8rem; color:var(--yellow); width:55px; flex-shrink:0; }
        .dist-bar-wrap { flex:1; background:rgba(255,255,255,0.08); border-radius:20px; height:8px; }
        .dist-bar { height:8px; border-radius:20px; background:var(--yellow); transition:width 0.5s ease; }
        .dist-count { font-size:0.75rem; color:var(--text-dim); width:28px; text-align:right; flex-shrink:0; }

        /* Filter + Search */
        .controls {
            display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:1.5rem;
        }
        .filter-btn {
            padding:0.4rem 0.9rem; border-radius:20px; border:1px solid var(--glass-border);
            background:transparent; color:var(--text-dim); font-family:'Poppins',sans-serif;
            font-size:0.78rem; font-weight:600; cursor:pointer; transition:all 0.2s;
        }
        .filter-btn:hover { color:var(--text-light); background:rgba(255,255,255,0.08); }
        .filter-btn.active { background:var(--yellow); color:#1a1000; border-color:var(--yellow); }
        .search-wrap { display:flex; align-items:center; gap:0.5rem; margin-left:auto; }
        .search-input {
            background:var(--glass-card); border:1px solid var(--glass-border);
            border-radius:8px; padding:0.45rem 0.9rem; color:white;
            font-family:'Poppins',sans-serif; font-size:0.82rem; outline:none;
            min-width:200px;
        }
        .search-input::placeholder { color:var(--text-dim); }
        .search-input:focus { border-color:rgba(245,168,0,0.5); }
        .btn-search {
            padding:0.45rem 1rem; background:var(--yellow); color:#1a1000;
            border:none; border-radius:8px; font-family:'Poppins',sans-serif;
            font-size:0.8rem; font-weight:700; cursor:pointer; transition:background 0.2s;
        }
        .btn-search:hover { background:var(--yellow-d); }

        /* Review cards */
        .reviews-grid { display:flex; flex-direction:column; gap:1rem; margin-bottom:2.5rem; }
        .review-card {
            background:var(--glass-card); border:1px solid var(--glass-border);
            border-radius:14px; padding:1.25rem 1.5rem;
            backdrop-filter:blur(12px); transition:transform 0.2s, box-shadow 0.2s;
            display:flex; gap:1rem; align-items:flex-start;
        }
        .review-card:hover { transform:translateX(3px); box-shadow:0 8px 30px rgba(0,0,0,0.3); }
        .review-avatar {
            width:42px; height:42px; border-radius:50%;
            background:rgba(245,168,0,0.15); border:2px solid rgba(245,168,0,0.3);
            display:flex; align-items:center; justify-content:center;
            font-size:1rem; font-weight:700; color:var(--yellow); flex-shrink:0;
        }
        .review-#root { flex:1; }
        .review-top { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.5rem; }
        .review-name { font-weight:700; font-size:0.9rem; }
        .review-product { font-size:0.75rem; color:var(--text-dim); background:rgba(255,255,255,0.06); padding:0.15rem 0.6rem; border-radius:10px; }
        .review-stars { color:var(--yellow); font-size:0.85rem; }
        .review-date { font-size:0.72rem; color:var(--text-dim); margin-left:auto; }
        .review-comment { font-size:0.85rem; color:var(--text-light); line-height:1.6; }
        .review-actions { display:flex; gap:0.5rem; margin-top:0.75rem; }
        .btn-delete {
            padding:0.3rem 0.75rem; background:rgba(239,68,68,0.15);
            color:#ef4444; border:1px solid rgba(239,68,68,0.3);
            border-radius:6px; font-family:'Poppins',sans-serif; font-size:0.75rem;
            font-weight:600; cursor:pointer; text-decoration:none;
            transition:all 0.2s; display:inline-flex; align-items:center; gap:0.35rem;
        }
        .btn-delete:hover { background:rgba(239,68,68,0.25); border-color:rgba(239,68,68,0.5); }

        /* Empty state */
        .empty-state {
            text-align:center; padding:4rem 1rem;
            background:var(--glass-card); border:1px solid var(--glass-border);
            border-radius:16px; backdrop-filter:blur(12px);
        }
        .empty-state i { font-size:2.5rem; color:rgba(245,168,0,0.3); display:block; margin-bottom:0.75rem; }
        .empty-state p { color:var(--text-dim); font-size:0.9rem; }

        /* Product stats table */
        .prod-table-card {
            background:var(--glass-card); border:1px solid var(--glass-border);
            border-radius:16px; padding:1.5rem 2rem; margin-bottom:2rem;
            backdrop-filter:blur(12px);
        }
        .section-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--yellow); margin-bottom:1.25rem; }
        table { width:100%; border-collapse:collapse; font-size:0.85rem; }
        thead th {
            padding:0.6rem 1rem; font-size:0.68rem; font-weight:700;
            text-transform:uppercase; letter-spacing:0.08em; color:var(--text-dim);
            border-bottom:1px solid var(--glass-border); text-align:left;
        }
        tbody tr { border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.15s; }
        tbody tr:last-child { border-bottom:none; }
        tbody tr:hover { background:rgba(255,255,255,0.04); }
        tbody td { padding:0.75rem 1rem; color:var(--text-light); }
        tbody td strong { color:white; }
        .stars-yellow { color:var(--yellow); }

        /* Modal */
        .modal-bg {
            display:none; position:fixed; inset:0; z-index:200;
            background:rgba(0,0,0,0.7); backdrop-filter:blur(4px);
            align-items:center; justify-content:center;
        }
        .modal-bg.show { display:flex; }
        .modal {
            background:#0e1225; border:1px solid var(--glass-border);
            border-radius:16px; padding:2rem; max-width:400px; width:90%; text-align:center;
        }
        .modal h3 { font-size:1.1rem; margin-bottom:0.75rem; }
        .modal p { color:var(--text-dim); font-size:0.85rem; margin-bottom:1.5rem; }
        .modal-actions { display:flex; gap:0.75rem; justify-content:center; }
        .btn-cancel { padding:0.55rem 1.5rem; background:transparent; border:1px solid var(--glass-border); color:var(--text-light); border-radius:8px; cursor:pointer; font-family:'Poppins',sans-serif; font-weight:600; }
        .btn-confirm-del { padding:0.55rem 1.5rem; background:#ef4444; border:none; color:white; border-radius:8px; cursor:pointer; font-family:'Poppins',sans-serif; font-weight:700; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .page { animation:fadeUp 0.4s ease both; }

        @media(max-width:600px) {
            nav { padding:0.75rem 1rem; }
            .page { padding:5.5rem 1rem 2rem; }
            .search-wrap { margin-left:0; width:100%; }
            .search-input { flex:1; min-width:0; }
        }`;

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
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ color: 'var(--yellow)', fontSize: '1.1rem' }}></i>
                    Ek<span>art</span>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} style={{ color: 'var(--text-light)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500 }}>
                        <i className="fas fa-arrow-left"></i> Dashboard
                    </a>
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} style={{ background: 'rgba(255,100,80,0.1)', color: '#ff8060', border: '1px solid rgba(255,100,80,0.3)', padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
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