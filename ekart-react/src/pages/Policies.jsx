import React, { useState, useEffect } from 'react';

const CSS = `
    :root {
        --yellow:       #f5a800;
        --yellow-d:     #d48f00;
        --glass-border: rgba(255, 255, 255, 0.22);
        --glass-card:   rgba(255, 255, 255, 0.13);
        --glass-nav:    rgba(0, 0, 0, 0.25);
        --text-white:   #ffffff;
        --text-light:   rgba(255,255,255,0.80);
        --text-dim:     rgba(255,255,255,0.55);
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    .policies-body {
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
    }

    .nav-brand {
        font-size: 1.6rem; font-weight: 700;
        color: var(--text-white); text-decoration: none;
        display: flex; align-items: center; gap: 0.5rem;
    }

    .page {
        flex: 1;
        padding: 7rem 3rem 3rem;
        max-width: 1000px;
        margin: 0 auto;
        width: 100%;
    }

    .glass-card {
        background: var(--glass-card);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: 20px;
        padding: 2.5rem;
        margin-bottom: 2rem;
    }

    .policy-item { transition: transform 0.3s ease; }
    .policy-item:hover { transform: translateY(-5px); }

    .policy-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--yellow);
        margin-bottom: 0.5rem;
    }

    .policy-meta {
        font-size: 0.75rem;
        color: var(--text-dim);
        margin-bottom: 1.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .policy-content {
        line-height: 1.8;
        color: var(--text-light);
        font-size: 0.95rem;
    }

    .policy-content h1, .policy-content h2, .policy-content h3 {
        color: white;
        margin: 1.5rem 0 1rem;
    }

    .policy-content p { margin-bottom: 1rem; }
    
    .policy-content ul, .policy-content ol {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
    }

    @media(max-width: 768px) {
        nav { padding: 1rem 1.5rem; }
        .page { padding: 6rem 1rem 2rem; }
        .glass-card { padding: 1.5rem; }
    }
`;

/**
 * Policies Component
 * * @param {Object} props
 * @param {Array} props.initialPolicies - Initial list of policies [{title, category, lastUpdated, content}]
 */
export default function Policies({
    initialPolicies = []
}) {
    const [policies, setPolicies] = useState(initialPolicies);
    const [loading, setLoading] = useState(initialPolicies.length === 0);

    useEffect(() => {
        // If no initial policies, fetch from API
        if (initialPolicies.length === 0) {
            fetch('/api/policies')
                .then(res => res.json())
                .then(data => {
                    setPolicies(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch policies:", err);
                    setLoading(false);
                });
        }
    }, [initialPolicies]);

    // Function to handle rendering content (supports Markdown-like parsing if marked is available on window)
    const renderContent = (content) => {
        if (window.marked) {
            return { __html: window.marked.parse(content || '') };
        }
        return { __html: content || '' };
    };

    return (
        <div className="policies-body">
            <style>{CSS}</style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            {/* marked.js for parsing markdown content in policies */}
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

            <div className="bg-layer"></div>

            <nav id="nav">
                <a href="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    Ekart
                </a>
            </nav>

            <main className="page">
                <h1 style={{ textAlign: 'center', marginBottom: '0.5em', fontSize: '2.5rem', fontWeight: 800 }}>
                    Policies & <span style={{ color: 'var(--yellow)' }}>SOP</span> Documentation
                </h1>

                <div id="policies" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {loading && (
                        <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>Loading documentation...</p>
                    )}

                    {!loading && policies.length === 0 && (
                        <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>No policies or SOPs published yet.</p>
                    )}

                    {policies.map((policy, index) => (
                        <div key={index} className="glass-card policy-item" style={{ margin: 0 }}>
                            <div className="policy-title">{policy.title}</div>
                            <div className="policy-meta">
                                {policy.category ? `${policy.category} | ` : ''}
                                Last updated: {policy.lastUpdated ? policy.lastUpdated.substring(0, 16).replace('T', ' ') : 'N/A'}
                            </div>
                            <div 
                                className="policy-content"
                                dangerouslySetInnerHTML={renderContent(policy.content)}
                            />
                        </div>
                    ))}
                </div>
            </main>

            <footer style={{ background: 'rgba(0,0,0,0.5)', padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', marginTop: 'auto' }}>
                <div style={{ fontWeight: 700 }}>Ekart</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>© 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}