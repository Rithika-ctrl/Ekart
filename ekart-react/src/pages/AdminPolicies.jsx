import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - Admin Policy Management Component
 * @param {Object} props
 * @param {Object} props.session - Session object for notifications
 */
export default function AdminPolicies({ 
    session = { success: null, failure: null } 
}) {
    // --- STATE ---
    const [policies, setPolicies] = useState([]);
    const [scrolled, setScrolled] = useState(false);
    const [formData, setFormData] = useState({
        slug: '',
        title: '',
        category: '',
        content: '',
        authorAdminId: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');

    // --- EFFECTS ---
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        
        fetchPolicies();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Update preview when content changes
    useEffect(() => {
        if (window.marked) {
            setPreviewHtml(window.marked.parse(formData.content || ''));
        }
    }, [formData.content]);

    // --- ACTIONS ---
    const fetchPolicies = async () => {
        try {
            const res = await authFetch('/api/policies');
            const data = await res.json();
            setPolicies(data);
        } catch (error) {
            console.error("Failed to fetch policies:", error);
        }
    };

    const editPolicy = async (slug) => {
        try {
            const res = await authFetch(`/api/policies/${slug}`);
            const policy = await res.json();
            setFormData({
                slug: policy.slug,
                title: policy.title,
                category: policy.category || '',
                content: policy.content,
                authorAdminId: policy.authorAdminId || ''
            });
            setIsEditing(true);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } catch (error) {
            console.error("Failed to fetch policy details:", error);
        }
    };

    const deletePolicy = async (slug) => {
        if (window.confirm('Delete this policy?')) {
            try {
                await authFetch(`/api/policies/${slug}`, { method: 'DELETE' });
                fetchPolicies();
            } catch (error) {
                console.error("Failed to delete policy:", error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let slug = formData.slug;
        if (!slug) {
            slug = formData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `/api/policies/${slug}` : '/api/policies';
        
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, slug })
            });
            fetchPolicies();
            resetForm();
        } catch (error) {
            console.error("Failed to save policy:", error);
        }
    };

    const resetForm = () => {
        setFormData({ slug: '', title: '', category: '', content: '', authorAdminId: '' });
        setIsEditing(false);
        setPreviewHtml('');
    };

    const CSS = `:root {
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
        #root {
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
            letter-spacing: 0.04em;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-brand span { color: var(--yellow); }
        .nav-links {
            display: flex; align-items: center; gap: 0.5rem;
        }
        .nav-link {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .nav-link:hover { color: var(--yellow); border-color: rgba(245,168,0,0.3); background: rgba(245,168,0,0.08); }
        .nav-link.active {
            color: var(--yellow);
            background: rgba(245,168,0,0.12);
            border-color: rgba(245,168,0,0.4);
        }
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            max-width: 900px;
            margin: 0 auto;
        }
        .glass-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.5rem 3rem;
            margin-bottom: 2rem;
            box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        .policy-list h2, .policy-editor h2, .policy-editor h3 {
            margin-bottom: 1rem;
        }
        .policy-item {
            border-bottom: 1px solid rgba(255,255,255,0.08);
            padding: 0.7em 0;
            color: var(--text-light);
        }
        .policy-item:last-child { border-bottom: none; }
        .editor { width: 100%; min-height: 120px; border-radius: 10px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.07); color: #222; font-family: inherit; font-size: 1rem; padding: 0.7em; }
        .markdown-preview { border: 1px solid var(--glass-border); padding: 1em; background: rgba(255,255,255,0.10); min-height: 100px; border-radius: 10px; color: #222; }
        .btn-yellow {
            background: var(--yellow); color: #1a1000;
            text-decoration: none; font-weight: 700;
            font-size: 0.9rem; letter-spacing: 0.08em; text-transform: uppercase;
            padding: 0.55rem 1.5rem; border-radius: 50px;
            transition: all 0.25s; border: none; cursor: pointer;
            display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .btn-yellow:hover { background: var(--yellow-d); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(245,168,0,0.45); }
        .btn-secondary {
            background: transparent;
            border: 1px solid var(--glass-border);
            color: var(--text-light); text-decoration: none;
            font-weight: 600; font-size: 0.9rem; letter-spacing: 0.06em;
            padding: 0.55rem 1.5rem; border-radius: 50px;
            transition: all 0.25s; cursor: pointer;
            margin-left: 0.5rem;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.12); color: var(--yellow); }
        @media(max-width: 700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1.25rem 2rem; }
            .glass-card { padding: 1.5rem 1rem; }
        }`;

    return (
        <>
            <style>{CSS}</style>
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <div className="bg-layer"></div>
            
            <nav id="nav" className={scrolled ? 'scrolled' : ''}>
                <Link to="/admin" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize: '1.1rem'}}></i>
                    Ekart
                </Link>
                <div className="nav-links">
                    <Link to="/admin" className="nav-link"><i className="fas fa-home"></i> Dashboard</Link>
                    <Link to="/admin/policies" className="nav-link active"><i className="fas fa-book"></i> Policies & SOPs</Link>
                </div>
            </nav>

            <main className="page">
                {/* List Section */}
                <div className="glass-card">
                    <h2 style={{marginBottom: '1.5rem'}}>Existing Policies</h2>
                    <div id="policies" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {policies.map(policy => (
                            <div key={policy.slug} className="glass-card policy-item" style={{margin: '0'}}>
                                <b>{policy.title}</b> [{policy.category || ''}] <br /> 
                                <small style={{color: 'var(--text-dim)'}}>Last updated: {policy.lastUpdated || 'N/A'}</small><br />
                                <div style={{marginTop: '0.8rem', display: 'flex', gap: '0.5rem'}}>
                                    <button className="btn-yellow" style={{padding: '0.3em 1em', fontSize: '0.85em'}} onClick={() => editPolicy(policy.slug)}>
                                        <i className="fas fa-edit"></i> Edit
                                    </button>
                                    <button className="btn-secondary" style={{padding: '0.3em 1em', fontSize: '0.85em', marginLeft: '0'}} onClick={() => deletePolicy(policy.slug)}>
                                        <i className="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Section */}
                <div className="glass-card">
                    <h2 id="editor-title">{isEditing ? 'Edit Policy' : 'Create New Policy'}</h2>
                    <form id="policyForm" onSubmit={handleSubmit}>
                        <label style={{fontSize: '0.8rem', color: 'var(--text-dim)'}}>Title:</label>
                        <input 
                            type="text" 
                            className="form-input"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required 
                        />
                        
                        <label style={{fontSize: '0.8rem', color: 'var(--text-dim)'}}>Category:</label>
                        <input 
                            type="text" 
                            className="form-input"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                        />
                        
                        <label style={{fontSize: '0.8rem', color: 'var(--text-dim)'}}>Content (Markdown):</label>
                        <textarea 
                            className="editor" 
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                            required 
                        />
                        
                        <label style={{fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.7rem', display: 'block'}}>Author Admin ID:</label>
                        <input 
                            type="text" 
                            className="form-input"
                            value={formData.authorAdminId}
                            onChange={(e) => setFormData({...formData, authorAdminId: e.target.value})}
                        />
                        
                        <div style={{marginTop: '1rem'}}>
                            <button type="submit" className="btn-yellow"><i className="fas fa-save"></i> Save Policy</button>
                            {isEditing && (
                                <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
                            )}
                        </div>
                    </form>
                    
                    <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>Preview</h3>
                    <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
                </div>
            </main>
        </>
    );
}