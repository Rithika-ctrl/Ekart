import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminRefunds({ 
    session = { admin: null, success: null, failure: null },
    initialPendingRefunds = [],
    initialProcessedRefunds = [],
    initialPendingCount = 0,
    initialTotalAmount = 0
}) {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    
    const [pendingRefunds, setPendingRefunds] = useState(initialPendingRefunds);
    const [processedRefunds, setProcessedRefunds] = useState(initialProcessedRefunds);
    const [pendingCount, setPendingCount] = useState(initialPendingCount);
    const [totalAmount, setTotalAmount] = useState(initialTotalAmount);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showEvidenceModal, setShowEvidenceModal] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);
    const [currentRefundId, setCurrentRefundId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [evidenceImages, setEvidenceImages] = useState([]);
    const [lightboxImg, setLightboxImg] = useState('');
    const [loadingImages, setLoadingImages] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleApprove = async (id) => {
        try {
            const response = await fetch(`/api/admin/refunds/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
            });
            const result = await response.json();
            if (result.success) {
                setPendingRefunds(prev => prev.filter(r => r.id !== id));
                setPendingCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) { console.error(error); }
    };

    const handleConfirmReject = async () => {
        try {
            const response = await fetch(`/api/admin/refunds/${currentRefundId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', rejectionReason })
            });
            const result = await response.json();
            if (result.success) {
                setPendingRefunds(prev => prev.filter(r => r.id !== currentRefundId));
                setPendingCount(prev => Math.max(0, prev - 1));
                setShowRejectModal(false);
            }
        } catch (error) { console.error(error); }
    };

    const loadEvidence = async (id) => {
        setCurrentRefundId(id);
        setLoadingImages(true);
        setShowEvidenceModal(true);
        try {
            const res = await fetch(`/api/admin/refunds/${id}/images`);
            const data = await res.json();
            if (data.success) setEvidenceImages(data.images);
        } catch (e) { console.error(e); } finally { setLoadingImages(false); }
    };

    const CSS = `
        :root {
            --yellow: #f5a800;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card: rgba(255, 255, 255, 0.13);
            --text-white: #ffffff;
            --text-dim: rgba(255,255,255,0.50);
        }

        .admin-page-wrapper {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            background: #050814;
            color: white;
            position: relative;
        }

        .bg-layer { position: fixed; inset: 0; z-index: 0; overflow: hidden; }
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
            background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border);
        }

        .nav-right { display: flex; align-items: center; gap: 1.5rem; }
        .nav-links { display: flex; align-items: center; gap: 1rem; }
        .nav-link { color: rgba(255,255,255,0.8); text-decoration: none; font-size: 0.85rem; padding: 0.5rem 0.8rem; border-radius: 6px; transition: 0.3s; }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.1); border: 1px solid rgba(245,168,0,0.3); }

        .page-content { position: relative; z-index: 1; padding: 8rem 3rem 3rem; max-width: 1200px; margin: 0 auto; }
        
        .page-header {
            display: flex; justify-content: space-between; align-items: center;
            background: var(--glass-card); border: 1px solid var(--glass-border);
            padding: 2rem; border-radius: 20px; margin-bottom: 2rem; backdrop-filter: blur(20px);
        }

        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: var(--glass-card); border: 1px solid var(--glass-border); padding: 1.5rem; border-radius: 16px; text-align: center; backdrop-filter: blur(10px); }
        .stat-value { font-size: 2.2rem; font-weight: 700; color: var(--yellow); }

        .table-container { background: var(--glass-card); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; backdrop-filter: blur(10px); }
        table { width: 100%; border-collapse: collapse; }
        th { background: rgba(0,0,0,0.3); padding: 1.2rem; text-align: left; font-size: 0.8rem; text-transform: uppercase; color: var(--text-dim); }
        td { padding: 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem; }
        
        .btn-approve { background: rgba(34,197,94,0.2); border: 1px solid #22c55e; color: #22c55e; padding: 0.5rem; border-radius: 6px; cursor: pointer; }
        .btn-reject { background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444; padding: 0.5rem; border-radius: 6px; cursor: pointer; }
    `;

    return (
        <div className="admin-page-wrapper">
            <style>{CSS}</style>
            <div className="bg-layer"></div>
            
            <nav>
                <Link to="/admin/home" style={{color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.5rem'}}>
                    <i className="fas fa-shopping-cart" style={{color: 'var(--yellow)'}}></i> Ekart
                </Link>
                <div className="nav-right">
                    <div className="nav-links">
                        <Link to="/admin/home" className="nav-link">Dashboard</Link>
                        <Link to="/approve-products" className="nav-link">Approvals</Link>
                        <Link to="/admin/refunds" className="nav-link active">Refunds</Link>
                        <Link to="/admin/accounts" className="nav-link">Users</Link>
                    </div>
                    <span style={{padding: '0.4rem 1rem', background: 'rgba(245,168,0,0.15)', color: 'var(--yellow)', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--yellow)'}}>
                        <i className="fas fa-shield-alt"></i> Admin
                    </span>
                    <button onClick={logout} style={{background: 'none', border: '1px solid rgba(255,100,80,0.4)', color: '#ff8060', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer'}}>
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </nav>

            <main className="page-content">
                <div className="page-header">
                    <div>
                        <h1 style={{margin: 0}}>Refund <span style={{color: 'var(--yellow)'}}>Management</span> 💸</h1>
                        <p style={{color: 'var(--text-dim)', margin: '0.5rem 0 0'}}>Review and manage platform refund requests.</p>
                    </div>
                    <div style={{fontSize: '2.5rem'}}>🔄</div>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{pendingCount}</div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem'}}>Pending Requests</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">₹{totalAmount.toLocaleString()}</div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem'}}>Total Pending Amount</div>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Reason</th>
                                <th>Evidence</th>
                                <th>Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRefunds.length > 0 ? pendingRefunds.map(refund => (
                                <tr key={refund.id}>
                                    <td style={{color: 'var(--yellow)', fontWeight: 'bold'}}>#{refund.order.id}</td>
                                    <td>{refund.customer.name}</td>
                                    <td style={{fontSize: '0.8rem', color: 'var(--text-dim)'}}>{refund.reason}</td>
                                    <td>
                                        <button onClick={() => loadEvidence(refund.id)} style={{background: 'none', border: '1px solid var(--yellow)', color: 'var(--yellow)', cursor: 'pointer', fontSize: '0.7rem', padding: '0.3rem 0.6rem', borderRadius: '4px'}}>
                                            VIEW PHOTOS
                                        </button>
                                    </td>
                                    <td style={{color: '#22c55e', fontWeight: 'bold'}}>₹{refund.amount}</td>
                                    <td>
                                        <div style={{display: 'flex', gap: '0.5rem'}}>
                                            <button className="btn-approve" onClick={() => handleApprove(refund.id)}><i className="fas fa-check"></i></button>
                                            <button className="btn-reject" onClick={() => openRejectModal(refund.id)}><i className="fas fa-times"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-dim)'}}>No pending requests</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}