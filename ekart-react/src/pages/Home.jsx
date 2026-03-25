import React, { useState, useEffect, useRef } from 'react';

const CSS = `
    :root {
        --yellow:     #f5a800;
        --yellow-d:   #d48f00;
        --glass-bg:   rgba(255, 255, 255, 0.12);
        --glass-border: rgba(255, 255, 255, 0.25);
        --glass-card: rgba(255, 255, 255, 0.15);
        --text-white: #ffffff;
        --text-light: rgba(255,255,255,0.82);
        --text-dim:   rgba(255,255,255,0.55);
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }

    .home-body {
        font-family: 'Poppins', sans-serif;
        min-height: 100vh;
        overflow-x: hidden;
        color: var(--text-white);
        position: relative;
    }

    .bg-layer {
        position: fixed; inset: 0; z-index: -1;
        overflow: hidden;
    }
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
        background: linear-gradient(
            180deg,
            rgba(5, 8, 20, 0.82) 0%,
            rgba(8, 12, 28, 0.78) 40%,
            rgba(5, 8, 20, 0.88) 100%
        );
    }

    nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 100;
        padding: 1rem 3rem;
        display: flex; align-items: center; justify-content: space-between;
        background: rgba(0,0,0,0.2);
        backdrop-filter: blur(12px);
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
        display: flex; align-items: center; gap: 0.25rem; list-style: none;
    }
    .nav-links a {
        color: var(--text-light); text-decoration: none;
        font-size: 0.82rem; font-weight: 500; letter-spacing: 0.04em;
        padding: 0.45rem 0.9rem; border-radius: 6px;
        transition: all 0.2s;
    }
    .nav-links a:hover { color: var(--text-white); background: rgba(255,255,255,0.1); }

    .dropdown { position: relative; }
    .dropdown-menu {
        position: absolute; top: calc(100% + 0.75rem); right: 0;
        background: rgba(10, 30, 10, 0.85);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: 10px; padding: 0.5rem; min-width: 210px;
        opacity: 0; visibility: hidden; transform: translateY(-6px);
        transition: all 0.22s;
    }
    .dropdown:hover .dropdown-menu { opacity: 1; visibility: visible; transform: translateY(0); }
    .dropdown-menu a {
        display: flex; align-items: center; gap: 0.625rem;
        padding: 0.6rem 1rem; border-radius: 7px;
        color: var(--text-light); text-decoration: none; font-size: 0.82rem;
        transition: background 0.15s;
    }
    .dropdown-menu a:hover { background: rgba(255,255,255,0.1); color: white; }

    .btn-yellow {
        background: var(--yellow); color: #1a1000;
        text-decoration: none; font-weight: 700;
        font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase;
        padding: 0.55rem 1.5rem; border-radius: 50px;
        transition: all 0.25s; border: none; cursor: pointer;
        display: inline-flex; align-items: center; gap: 0.4rem;
    }

    .hero {
        height: 100vh;
        display: flex;
        flex-direction: column;
        padding-top: 65px;
        overflow: hidden;
    }

    .hero-banner {
        flex: 0 0 52vh;
        position: relative;
        overflow: hidden;
    }
    .promo-carousel { border-radius: 0; max-width: 100%; height: 100%; position: relative; overflow: hidden; }
    .promo-slides { display: flex; transition: transform 0.5s ease; height: 100%; }
    .promo-slide { min-width: 100%; position: relative; height: 100%; }
    .promo-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .promo-slide-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
        display: flex; flex-direction: column; justify-content: center;
        padding: 1.5rem 3rem;
    }

    .hero-bottom {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 1rem 2rem 0.5rem;
        text-align: center;
    }

    .stats-strip { display: flex; justify-content: center; width: 100%; max-width: 680px; }
    .stat-item { padding: 0.8rem 1rem; }

    section { padding: 6rem 4rem; position: relative; }
    .reveal { opacity:0; transform:translateY(22px); transition: opacity 0.65s ease, transform 0.65s ease; }
    .reveal.visible { opacity:1; transform:translateY(0); }

    .feat-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .feat-card {
        background: var(--glass-card); backdrop-filter: blur(16px);
        border: 1px solid var(--glass-border); border-radius: 16px; padding: 2rem;
    }

    .cats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-top: 3rem; }
    .cat-card {
        background: var(--glass-card); backdrop-filter: blur(16px);
        border: 1px solid var(--glass-border); border-radius: 16px; padding: 2.5rem 1.5rem;
        text-decoration: none; position: relative; overflow: hidden;
    }

    .cta-glass {
        background: var(--glass-card); backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border); border-radius: 24px;
        padding: 4rem 3rem; max-width: 680px; width: 100%;
    }

    footer {
        background: rgba(0,0,0,0.55); backdrop-filter: blur(20px);
        border-top: 1px solid var(--glass-border); padding: 2rem 3rem;
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 1rem;
    }

    .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
    .alert { padding: 0.875rem 1.25rem; background: rgba(10,30,10,0.85); backdrop-filter: blur(16px); border: 1px solid; border-radius: 10px; display: flex; align-items: center; gap: 0.625rem; font-size: 0.825rem; min-width: 260px; }

    @media(max-width: 900px) {
        section { padding: 4rem 1.5rem; }
        .feat-cards, .cats-grid { grid-template-columns: 1fr 1fr; }
    }
    @media(max-width: 600px) {
        .feat-cards, .cats-grid { grid-template-columns: 1fr; }
    }
`;

/**
 * Ekart - Home Component
 * @param {Object} props
 * @param {Array} props.banners - Array of banner objects [{imageUrl, title, linkUrl}]
 * @param {Object} props.session - Session object for notifications {success, failure}
 */
export default function Home({
    banners = [],
    session = { success: null, failure: null }
}) {
    const [scrolled, setScrolled] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [alerts, setAlerts] = useState({ success: session.success, failure: session.failure });
    
    const revealRefs = useRef([]);
    const slidesRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        revealRefs.current.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        const alertTimer = setTimeout(() => {
            setAlerts({ success: null, failure: null });
        }, 2500);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
            clearTimeout(alertTimer);
        };
    }, [session]);

    useEffect(() => {
        if (banners.length > 1) {
            const timer = setInterval(() => {
                setCurrentSlide(prev => (prev + 1) % banners.length);
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [banners]);

    const moveSlide = (dir) => {
        setCurrentSlide(prev => (prev + dir + banners.length) % banners.length);
    };

    const goToSlide = (index) => {
        setCurrentSlide(index);
    };

    return (
        <div className="home-body">
            <style>{CSS}</style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <div className="bg-layer"></div>

            <div className="alert-stack">
                {alerts.success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{alerts.success}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({...p, success: null}))}>×</button>
                    </div>
                )}
                {alerts.failure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{alerts.failure}</span>
                        <button className="alert-close" onClick={() => setAlerts(p => ({...p, failure: null}))}>×</button>
                    </div>
                )}
            </div>

            <nav className={scrolled ? 'scrolled' : ''}>
                <a href="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize:'1.2rem'}}></i>
                    Ekart
                </a>

                <ul className="nav-links">
                    <li className="dropdown">
                        <a href="#" style={{display:'flex',alignItems:'center',gap:'.35rem'}}>
                            <i className="fas fa-user-circle"></i> Account
                            <i className="fas fa-angle-down" style={{fontSize:'.65rem'}}></i>
                        </a>
                        <div className="dropdown-menu">
                            <a href="/customer/login"><i className="fas fa-sign-in-alt" style={{color:'var(--yellow)',width:'14px'}}></i> Customer Login</a>
                            <a href="/customer/register"><i className="fas fa-user-plus" style={{color:'#7dc97d',width:'14px'}}></i> Customer Register</a>
                            <hr style={{border:'none', borderTop:'1px solid rgba(255,255,255,0.1)', margin:'0.3rem 0'}} />
                            <a href="/vendor/login"><i className="fas fa-store" style={{color:'var(--yellow)',width:'14px'}}></i> Vendor Login</a>
                            <a href="/vendor/register"><i className="fas fa-store" style={{color:'#7dc97d',width:'14px'}}></i> Vendor Register</a>
                            <hr style={{border:'none', borderTop:'1px solid rgba(255,255,255,0.1)', margin:'0.3rem 0'}} />
                            <a href="/admin/login"><i className="fas fa-shield-alt" style={{color:'rgba(255,255,255,0.45)',width:'14px'}}></i> Admin Login</a>
                        </div>
                    </li>
                    <li><a href="/customer/register" className="btn-yellow">Get Started</a></li>
                </ul>
            </nav>

            <section className="hero">
                {banners.length > 0 && (
                    <div className="hero-banner">
                        <div className="promo-carousel">
                            <div className="promo-slides" style={{transform: `translateX(-${currentSlide * 100}%)`}}>
                                {banners.map((banner, idx) => (
                                    <div className="promo-slide" key={idx}>
                                        <img src={banner.imageUrl} alt={banner.title} 
                                             onError={(e) => e.target.src='https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80'} />
                                        <div className="promo-slide-overlay">
                                            <h3 className="promo-slide-title" style={{fontSize:'2rem', fontWeight:700, color:'white', marginBottom:'1rem', maxWidth:'400px'}}>{banner.title}</h3>
                                            <a href={banner.linkUrl || '/customer/register'} className="btn-yellow" style={{padding:'0.75rem 1.5rem', borderRadius:'50px', width:'fit-content'}}>
                                                Shop Now <i className="fas fa-arrow-right"></i>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="promo-nav prev" style={{position:'absolute', top:'50%', left:'1.5rem', transform:'translateY(-50%)', width:'46px', height:'46px', background:'rgba(255,255,255,0.15)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'50%', color:'white', cursor:'pointer', zIndex:10}} onClick={() => moveSlide(-1)}><i className="fas fa-chevron-left"></i></button>
                            <button className="promo-nav next" style={{position:'absolute', top:'50%', right:'1.5rem', transform:'translateY(-50%)', width:'46px', height:'46px', background:'rgba(255,255,255,0.15)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'50%', color:'white', cursor:'pointer', zIndex:10}} onClick={() => moveSlide(1)}><i className="fas fa-chevron-right"></i></button>
                            <div className="promo-dots" style={{position:'absolute', bottom:'1.5rem', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'0.5rem', zIndex:10}}>
                                {banners.map((_, idx) => (
                                    <span key={idx} className={`promo-dot ${idx === currentSlide ? 'active' : ''}`} style={{width:'10px', height:'10px', borderRadius:'50%', background: idx === currentSlide ? 'var(--yellow)' : 'rgba(255,255,255,0.3)', cursor:'pointer', transition:'all 0.3s', transform: idx === currentSlide ? 'scale(1.2)' : 'none'}} onClick={() => goToSlide(idx)}></span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="hero-bottom">
                    <div className="hero-label" style={{display:'inline-flex', alignItems:'center', gap:'0.6rem', fontSize:'0.68rem', fontWeight:600, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--yellow)', background:'rgba(245,168,0,0.1)', padding:'0.28rem 0.85rem', borderRadius:'50px'}}><span style={{width:'6px', height:'6px', background:'var(--yellow)', borderRadius:'50%'}}></span> Your trusted marketplace</div>
                    <h1 style={{fontSize:'clamp(1.5rem, 2.8vw, 2.2rem)', fontWeight:800, lineHeight:1.15, letterSpacing:'-0.02em'}}>Your Cart. <span style={{color:'var(--yellow)'}}>Your Rules.</span></h1>
                    <p style={{fontSize:'0.88rem', color:'var(--text-light)'}}>Everything you love, delivered fast.</p>
                    <div className="hero-ctas" style={{display:'flex', flexWrap:'wrap', gap:'0.6rem', justifyContent:'center'}}>
                        <a href="/customer/register" className="btn-yellow" style={{padding:'0.9rem 2.5rem', borderRadius:'50px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', boxShadow:'0 6px 30px rgba(245,168,0,0.4)'}}>
                            Start Shopping <i className="fas fa-arrow-right" style={{fontSize: '0.8rem'}}></i>
                        </a>
                        <a href="/guest/start" className="btn-hero-ghost" style={{background:'var(--glass-bg)', backdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', color:'white', padding:'0.9rem 2.5rem', borderRadius:'50px', fontWeight:600, letterSpacing:'0.06em', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'0.5rem'}}>
                            <i className="fas fa-eye"></i> Browse as Guest
                        </a>
                        <a href="/vendor/register" className="btn-hero-ghost" style={{background:'var(--glass-bg)', backdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', color:'white', padding:'0.9rem 2.5rem', borderRadius:'50px', fontWeight:600, letterSpacing:'0.06em', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'0.5rem'}}>
                            <i className="fas fa-store" style={{fontSize:'0.85rem'}}></i> Sell on Ekart
                        </a>
                    </div>
                    <div className="stats-strip">
                        <div className="stat-item"><div style={{fontSize:'1.3rem', fontWeight:800}}>50K+</div><div style={{fontSize:'0.6rem', color:'var(--text-dim)', textTransform:'uppercase'}}>Products</div></div>
                        <div className="stat-item"><div style={{fontSize:'1.3rem', fontWeight:800}}>1M+</div><div style={{fontSize:'0.6rem', color:'var(--text-dim)', textTransform:'uppercase'}}>Customers</div></div>
                        <div className="stat-item"><div style={{fontSize:'1.3rem', fontWeight:800}}>8K+</div><div style={{fontSize:'0.6rem', color:'var(--text-dim)', textTransform:'uppercase'}}>Vendors</div></div>
                        <div className="stat-item"><div style={{fontSize:'1.3rem', fontWeight:800}}>4.9★</div><div style={{fontSize:'0.6rem', color:'var(--text-dim)', textTransform:'uppercase'}}>Rating</div></div>
                    </div>
                </div>
            </section>

            <section className="reveal" ref={el => revealRefs.current[0] = el}>
                <div className="features-section">
                    <div>
                        <div className="section-label">Why Ekart</div>
                        <h2 className="section-h">Everything you need<br />in one platform.</h2>
                        <p className="section-sub">We built Ekart around one simple idea — shopping should be fast, safe, and enjoyable for everyone.</p>
                        <a href="/customer/register" className="btn-yellow" style={{marginTop:'2rem', padding:'0.9rem 2.5rem', borderRadius:'50px'}}>
                            Get Started <i className="fas fa-arrow-right" style={{fontSize:'0.8rem'}}></i>
                        </a>
                    </div>

                    <div className="feat-cards">
                        <div className="feat-card">
                            <div className="feat-icon" style={{width:'46px',height:'46px',borderRadius:'12px',background:'rgba(245,168,0,0.2)',border:'1px solid rgba(245,168,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',color:'var(--yellow)',marginBottom:'1.25rem'}}><i className="fas fa-bolt"></i></div>
                            <h3>Fast Delivery</h3>
                            <p>Doorstep delivery with live GPS tracking every step of the way.</p>
                        </div>
                        <div className="feat-card">
                            <div className="feat-icon" style={{width:'46px',height:'46px',borderRadius:'12px',background:'rgba(245,168,0,0.2)',border:'1px solid rgba(245,168,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',color:'var(--yellow)',marginBottom:'1.25rem'}}><i className="fas fa-shield-alt"></i></div>
                            <h3>Secure Payments</h3>
                            <p>Bank-grade encryption on every single transaction.</p>
                        </div>
                        <div className="feat-card">
                            <div className="feat-icon" style={{width:'46px',height:'46px',borderRadius:'12px',background:'rgba(245,168,0,0.2)',border:'1px solid rgba(245,168,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',color:'var(--yellow)',marginBottom:'1.25rem'}}><i className="fas fa-tag"></i></div>
                            <h3>Best Prices</h3>
                            <p>Direct from vendors — no middlemen, no hidden fees.</p>
                        </div>
                        <div className="feat-card">
                            <div className="feat-icon" style={{width:'46px',height:'46px',borderRadius:'12px',background:'rgba(245,168,0,0.2)',border:'1px solid rgba(245,168,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',color:'var(--yellow)',marginBottom:'1.25rem'}}><i className="fas fa-headset"></i></div>
                            <h3>24/7 Support</h3>
                            <p>Real humans available around the clock for any issue.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="categories-section reveal" ref={el => revealRefs.current[1] = el}>
                <div className="section-label" style={{justifyContent:'center'}}>Browse</div>
                <h2 className="section-h" style={{textAlign:'center'}}>Shop by Category</h2>

                <div className="cats-grid">
                    <a href="/products?cat=electronics" className="cat-card">
                        <span style={{fontSize:'2.25rem', marginBottom:'1rem', display:'block'}}>📱</span>
                        <span style={{fontSize:'1rem', fontWeight:600, color:'white', display:'block', marginBottom:'0.35rem'}}>Electronics</span>
                        <span style={{fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em'}}>12,400+ products</span>
                    </a>
                    <a href="/products?cat=fashion" className="cat-card">
                        <span style={{fontSize:'2.25rem', marginBottom:'1rem', display:'block'}}>👗</span>
                        <span style={{fontSize:'1rem', fontWeight:600, color:'white', display:'block', marginBottom:'0.35rem'}}>Fashion</span>
                        <span style={{fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em'}}>9,800+ products</span>
                    </a>
                    <a href="/products?cat=home" className="cat-card">
                        <span style={{fontSize:'2.25rem', marginBottom:'1rem', display:'block'}}>🏡</span>
                        <span style={{fontSize:'1rem', fontWeight:600, color:'white', display:'block', marginBottom:'0.35rem'}}>Home & Living</span>
                        <span style={{fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em'}}>7,200+ products</span>
                    </a>
                    <a href="/products?cat=beauty" className="cat-card">
                        <span style={{fontSize:'2.25rem', marginBottom:'1rem', display:'block'}}>🌿</span>
                        <span style={{fontSize:'1rem', fontWeight:600, color:'white', display:'block', marginBottom:'0.35rem'}}>Beauty & Care</span>
                        <span style={{fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em'}}>5,600+ products</span>
                    </a>
                </div>
            </section>

            <section className="cta-section reveal" ref={el => revealRefs.current[2] = el}>
                <div className="cta-glass">
                    <h2 style={{fontSize:'2.25rem',fontWeight:700,marginBottom:'1rem',lineHeight:1.25}}>Ready to join<br /><span style={{color:'var(--yellow)'}}>1 million+</span> happy shoppers?</h2>
                    <p>Create your free account today and get access to exclusive deals, fast delivery, and a marketplace you can trust.</p>
                    <div className="cta-btns">
                        <a href="/customer/register" className="btn-yellow" style={{padding:'0.8rem 2rem', borderRadius:'50px'}}>
                            Create Free Account <i className="fas fa-arrow-right" style={{fontSize:'0.8rem'}}></i>
                        </a>
                        <a href="/vendor/register" className="btn-hero-ghost" style={{padding:'0.8rem 2rem', borderRadius:'50px'}}>
                            <i className="fas fa-store"></i> Become a Vendor
                        </a>
                    </div>
                </div>
            </section>

            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
                <div className="footer-links">
                    <a href="/policies" style={{fontSize:'0.75rem', color:'var(--text-dim)', textDecoration:'none'}}>Policies & SOPs</a>
                    <a href="#" style={{fontSize:'0.75rem', color:'var(--text-dim)', textDecoration:'none'}}>Privacy</a>
                    <a href="#" style={{fontSize:'0.75rem', color:'var(--text-dim)', textDecoration:'none'}}>Terms</a>
                    <a href="#" style={{fontSize:'0.75rem', color:'var(--text-dim)', textDecoration:'none'}}>Contact</a>
                </div>
            </footer>
        </div>
    );
}