import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CSS = `:root {
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

        #root {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            overflow-x: hidden;
            color: var(--text-white);
        }

        /* ── FULL PAGE BACKGROUND ── */
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
        /* strong dark overlay so text is never obscured */
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

        /* ── NAV ── */
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

        /* Dropdown */
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
        .dropdown-menu hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 0.3rem 0; }

        .btn-yellow {
            background: var(--yellow); color: #1a1000;
            text-decoration: none; font-weight: 700;
            font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase;
            padding: 0.55rem 1.5rem; border-radius: 50px;
            transition: all 0.25s; border: none; cursor: pointer;
            display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .btn-yellow:hover { background: var(--yellow-d); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(245,168,0,0.45); }


        /* ── BUTTONS ── */
        .btn-hero-primary {
            background: var(--yellow); color: #1a1000;
            text-decoration: none; font-weight: 700;
            font-size: 0.9rem; letter-spacing: 0.08em; text-transform: uppercase;
            padding: 0.9rem 2.5rem; border-radius: 50px;
            transition: all 0.3s;
            display: inline-flex; align-items: center; gap: 0.5rem;
            box-shadow: 0 6px 30px rgba(245,168,0,0.4);
        }
        .btn-hero-primary:hover { background: var(--yellow-d); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(245,168,0,0.55); color: #1a1000; text-decoration: none; }

        .btn-hero-ghost {
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            color: white; text-decoration: none;
            font-weight: 600; font-size: 0.9rem; letter-spacing: 0.06em;
            padding: 0.9rem 2.5rem; border-radius: 50px;
            transition: all 0.3s;
            display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .btn-hero-ghost:hover { background: rgba(255,255,255,0.22); transform: translateY(-3px); color: white; text-decoration: none; }

        /* ── HERO: banner top, text+buttons bottom, all in one screen ── */
        .hero {
            height: 100vh;
            display: flex;
            flex-direction: column;
            padding-top: 65px;
            overflow: hidden;
        }

        /* TOP: banner ~52% */
        .hero-banner {
            flex: 0 0 52vh;
            position: relative;
            overflow: hidden;
        }
        .hero-banner .promo-carousel { border-radius: 0; max-width: 100%; height: 100%; }
        .hero-banner .promo-slides   { height: 100%; }
        .hero-banner .promo-slide    { height: 100%; }
        .hero-banner .promo-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hero-banner .promo-slide-overlay {
            background: linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
            padding: 1.5rem 3rem;
        }
        .hero-banner .promo-slide-title { font-size: 1.8rem; }

        /* BOTTOM: ~48% — headline + buttons + stats all visible */
        .hero-bottom {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            padding: 1rem 2rem 0.5rem;
            text-align: center;
            animation: fadeUp 0.6s 0.1s ease both;
        }
        .hero-bottom .hero-label { margin-bottom: 0; font-size: 0.68rem; padding: 0.28rem 0.85rem; }
        .hero-bottom h1 {
            font-size: clamp(1.5rem, 2.8vw, 2.2rem);
            font-weight: 800; line-height: 1.15;
            letter-spacing: -0.02em; margin: 0;
        }
        .hero-bottom h1 span { color: var(--yellow); }
        .hero-bottom p { font-size: 0.88rem; color: var(--text-light); margin: 0; }
        .hero-ctas {
            display: flex; flex-wrap: wrap;
            gap: 0.6rem; justify-content: center;
        }
        .hero-ctas .btn-hero-primary  { padding: 0.7rem 1.8rem; font-size: 0.82rem; }
        .hero-ctas .btn-hero-ghost    { padding: 0.7rem 1.8rem; font-size: 0.82rem; }

        .stats-strip {
            display: flex; justify-content: center; gap: 0;
            width: 100%; max-width: 680px;
            animation: fadeUp 0.6s 0.25s ease both;
        }
        .stat-item { padding: 0.8rem 1rem; }
        .stat-n { font-size: 1.3rem; }
        .stat-l { font-size: 0.6rem; }

        @media(max-width: 900px) {
            .hero { padding-top: 60px; }
            .hero-banner { flex: 0 0 42vh; }
            .hero-banner .promo-slide-title { font-size: 1.3rem; }
            .hero-banner .promo-slide-overlay { padding: 1rem 1.5rem; }
        }
        @media(max-width: 600px) {
            .hero-banner { flex: 0 0 35vh; }
            .hero-bottom h1 { font-size: 1.3rem; }
            .hero-bottom p  { font-size: 0.76rem; }
            .hero-ctas .btn-hero-primary,
            .hero-ctas .btn-hero-ghost { padding: 0.6rem 1.2rem; font-size: 0.75rem; }
        }


        /* ── SECTION BASE ── */
        section {
            padding: 6rem 4rem;
            position: relative;
        }

        .section-label {
            display: inline-flex; align-items: center; gap: 0.6rem;
            font-size: 0.7rem; font-weight: 600; letter-spacing: 0.18em;
            text-transform: uppercase; color: var(--yellow);
            margin-bottom: 1rem;
        }
        .section-label::before { content:''; width: 28px; height: 1.5px; background: var(--yellow); }

        .section-h {
            font-size: clamp(2rem, 3.5vw, 3rem); font-weight: 700;
            color: white; line-height: 1.2; margin-bottom: 1rem;
        }
        .section-sub { font-size: 0.95rem; color: var(--text-light); line-height: 1.75; max-width: 500px; }

        /* ── FEATURES ── */
        .features-section {
            display: grid; grid-template-columns: 1fr 1fr;
            align-items: center; gap: 5rem;
        }

        .feat-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

        .feat-card {
            background: var(--glass-card);
            backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            border-radius: 16px; padding: 2rem;
            transition: all 0.3s; cursor: default;
        }
        .feat-card:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-6px);
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            border-color: rgba(245,168,0,0.5);
        }
        .feat-icon {
            width: 46px; height: 46px; border-radius: 12px;
            background: rgba(245,168,0,0.2); border: 1px solid rgba(245,168,0,0.35);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; color: var(--yellow);
            margin-bottom: 1.25rem; transition: all 0.3s;
        }
        .feat-card:hover .feat-icon { background: var(--yellow); color: #1a1000; }

        .feat-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: white; }
        .feat-card p  { font-size: 0.8rem; color: var(--text-dim); line-height: 1.7; }

        /* ── CATEGORIES ── */
        .categories-section { text-align: center; }
        .cats-grid {
            display: grid; grid-template-columns: repeat(4, 1fr);
            gap: 1.25rem; margin-top: 3rem;
        }
        .cat-card {
            background: var(--glass-card);
            backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            border-radius: 16px; padding: 2.5rem 1.5rem;
            text-decoration: none; transition: all 0.3s;
            position: relative; overflow: hidden;
        }
        .cat-card::before {
            content: ''; position: absolute; inset: 0; border-radius: 16px;
            background: linear-gradient(135deg, rgba(245,168,0,0.15), transparent);
            opacity: 0; transition: opacity 0.3s;
        }
        .cat-card:hover { transform: translateY(-8px); border-color: rgba(245,168,0,0.5); box-shadow: 0 20px 50px rgba(0,0,0,0.35); }
        .cat-card:hover::before { opacity: 1; }

        .cat-icon-w { font-size: 2.25rem; margin-bottom: 1rem; display: block; }
        .cat-name { font-size: 1rem; font-weight: 600; color: white; display: block; margin-bottom: 0.35rem; }
        .cat-count { font-size: 0.72rem; color: var(--text-dim); letter-spacing: 0.06em; }

        /* ── CTA SECTION ── */
        .cta-section {
            display: flex; flex-direction: column;
            align-items: center; text-align: center;
            padding: 5rem 2rem;
        }

        .cta-glass {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 4rem 3rem; max-width: 680px; width: 100%;
        }
        .cta-glass h2 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem; line-height: 1.25; }
        .cta-glass h2 span { color: var(--yellow); }
        .cta-glass p { font-size: 0.925rem; color: var(--text-light); line-height: 1.7; margin-bottom: 2.5rem; }

        .cta-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

        .btn-cta-secondary {
            background: transparent;
            border: 1px solid var(--glass-border);
            color: white; text-decoration: none;
            font-weight: 600; font-size: 0.85rem;
            letter-spacing: 0.06em; text-transform: uppercase;
            padding: 0.8rem 2rem; border-radius: 50px;
            transition: all 0.3s;
            display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .btn-cta-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.5); }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--glass-border);
            padding: 2rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 1rem;
        }
        .footer-brand {
            font-size: 1.3rem; font-weight: 700; color: white; letter-spacing: 0.04em;
        }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.75rem; color: var(--text-dim); }
        .footer-links { display: flex; gap: 1.5rem; }
        .footer-links a { font-size: 0.75rem; color: var(--text-dim); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: white; }

        /* ── ALERTS ── */
        .alert-stack { position: fixed; top: 5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; }
        .alert {
            padding: 0.875rem 1.25rem;
            background: rgba(10,30,10,0.85); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px;
            display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px;
            animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(245,168,0,0.5); color: var(--yellow); }
        .alert-danger  { border-color: rgba(255,100,80,0.5); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

        .reveal { opacity:0; transform:translateY(22px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }

        /* ── RESPONSIVE ── */
        /* ── PROMO BANNER CAROUSEL ── */
        .promo-section {
            padding: 3rem 4rem;
            background: transparent;
        }
        .promo-carousel {
            position: relative;
            max-width: 1200px;
            margin: 0 auto;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .promo-slides {
            display: flex;
            transition: transform 0.5s ease;
        }
        .promo-slide {
            min-width: 100%;
            position: relative;
        }
        .promo-slide img {
            width: 100%;
            height: 350px;
            object-fit: cover;
            display: block;
        }
        .promo-slide-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3rem;
        }
        .promo-slide-title {
            font-size: 2rem;
            font-weight: 700;
            color: white;
            margin-bottom: 1rem;
            max-width: 400px;
        }
        .promo-slide-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--yellow);
            color: #1a1000;
            font-weight: 600;
            font-size: 0.85rem;
            padding: 0.75rem 1.5rem;
            border-radius: 50px;
            text-decoration: none;
            width: fit-content;
            transition: all 0.3s;
        }
        .promo-slide-btn:hover {
            background: var(--yellow-d);
            transform: translateY(-2px);
        }
        .promo-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 46px;
            height: 46px;
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            transition: all 0.3s;
            z-index: 10;
        }
        .promo-nav:hover {
            background: rgba(255,255,255,0.25);
        }
        .promo-nav.prev { left: 1.5rem; }
        .promo-nav.next { right: 1.5rem; }
        .promo-dots {
            position: absolute;
            bottom: 1.5rem;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 0.5rem;
            z-index: 10;
        }
        .promo-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            cursor: pointer;
            transition: all 0.3s;
        }
        .promo-dot.active {
            background: var(--yellow);
            transform: scale(1.2);
        }


        @media(max-width: 900px) {
            nav { padding: 0.875rem 1.5rem; }
            .top-banner .promo-slide img { height: 300px; }
            .top-banner .promo-slide-overlay { padding: 2rem 2.5rem; }
            .top-banner .promo-slide-title { font-size: 1.7rem; }
            section { padding: 4rem 1.5rem; }
            .features-section { grid-template-columns: 1fr; gap: 3rem; }
            .feat-cards { grid-template-columns: 1fr 1fr; }
            .cats-grid { grid-template-columns: 1fr 1fr; }
            footer { padding: 1.5rem; flex-direction: column; text-align: center; }
            .promo-section { padding: 2rem 1.5rem; }
            .promo-slide img { height: 250px; }
            .promo-slide-overlay { padding: 1.5rem; }
            .promo-slide-title { font-size: 1.4rem; }
            .promo-nav { width: 38px; height: 38px; }
        }
        
        /* Additional mobile breakpoints for better responsiveness */
        @media(max-width: 600px) {
            .promo-carousel { border-radius: 0; }
            .top-banner .promo-slide img { height: 220px; }
            .top-banner .promo-slide-title { font-size: 1.2rem; }
            .top-banner .promo-slide-overlay { padding: 1.5rem; }
            .promo-slide img { height: 200px; }
            .promo-slide-overlay { padding: 1rem; }
            .promo-slide-title { font-size: 1.1rem; max-width: 70%; }
            .promo-slide-btn { padding: 0.6rem 1.2rem; font-size: 0.8rem; }
            .promo-nav { width: 32px; height: 32px; }
            .promo-nav.prev { left: 0.75rem; }
            .promo-nav.next { right: 0.75rem; }
            .promo-dots { bottom: 1rem; gap: 0.4rem; }
            .promo-dot { width: 8px; height: 8px; }
            .feat-cards { grid-template-columns: 1fr; }
            .cats-grid { grid-template-columns: 1fr; }
        }
        
        @media(max-width: 400px) {
            .promo-slide img { height: 160px; }
            .promo-slide-title { font-size: 1rem; }
            .promo-nav { display: none; } /* Hide arrows on very small screens */
        }`;

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
                <Link to="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{fontSize:'1.2rem'}}></i>
                    Ekart
                </Link>

                <ul className="nav-links">
                    <li className="dropdown">
                        <a href="#" style={{display:'flex',alignItems:'center',gap:'.35rem'}}>
                            <i className="fas fa-user-circle"></i> Account
                            <i className="fas fa-angle-down" style={{fontSize:'.65rem'}}></i>
                        </a>
                        <div className="dropdown-menu">
                            <Link to="/login"><i className="fas fa-sign-in-alt" style={{color:'var(--yellow)',width:'14px'}}></i> Customer Login</Link>
                            <Link to="/register"><i className="fas fa-user-plus" style={{color:'#7dc97d',width:'14px'}}></i> Customer Register</Link>
                            <hr style={{border:'none', borderTop:'1px solid rgba(255,255,255,0.1)', margin:'0.3rem 0'}} />
                            <Link to="/vendor/login"><i className="fas fa-store" style={{color:'var(--yellow)',width:'14px'}}></i> Vendor Login</Link>
                            <Link to="/vendor/register"><i className="fas fa-store" style={{color:'#7dc97d',width:'14px'}}></i> Vendor Register</Link>
                            <hr style={{border:'none', borderTop:'1px solid rgba(255,255,255,0.1)', margin:'0.3rem 0'}} />
                            <Link to="/admin/login"><i className="fas fa-shield-alt" style={{color:'rgba(255,255,255,0.45)',width:'14px'}}></i> Admin Login</Link>
                        </div>
                    </li>
                    <li><Link to="/register" className="btn-yellow">Get Started</Link></li>
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
                        <Link to="/register" className="btn-yellow" style={{padding:'0.9rem 2.5rem', borderRadius:'50px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', boxShadow:'0 6px 30px rgba(245,168,0,0.4)'}}>
                            Start Shopping <i className="fas fa-arrow-right" style={{fontSize: '0.8rem'}}></i>
                        </Link>
                        <Link to="/browse" className="btn-hero-ghost" style={{background:'var(--glass-bg)', backdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', color:'white', padding:'0.9rem 2.5rem', borderRadius:'50px', fontWeight:600, letterSpacing:'0.06em', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'0.5rem'}}>
                            <i className="fas fa-eye"></i> Browse as Guest
                        </Link>
                        <Link to="/vendor/register" className="btn-hero-ghost" style={{background:'var(--glass-bg)', backdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', color:'white', padding:'0.9rem 2.5rem', borderRadius:'50px', fontWeight:600, letterSpacing:'0.06em', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'0.5rem'}}>
                            <i className="fas fa-store" style={{fontSize:'0.85rem'}}></i> Sell on Ekart
                        </Link>
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
                        <Link to="/register" className="btn-yellow" style={{marginTop:'2rem', padding:'0.9rem 2.5rem', borderRadius:'50px'}}>
                            Get Started <i className="fas fa-arrow-right" style={{fontSize:'0.8rem'}}></i>
                        </Link>
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
                    <Link to="/products?cat=electronics" className="cat-card">
                        <span style={{fontSize:'2.25rem', marginBottom:'1rem', display:'block'}}>📱</span>
                        <span style={{fontSize:'1rem', fontWeight:600, color:'white', display:'block', marginBottom:'0.35rem'}}>Electronics</span>
                        <span style={{fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em'}}>12,400+ products</span>
                    </Link>
                    <Link to="/products?cat=fashion" className="cat-card">
                        <span style={{fontSize:'2.25rem', marginBottom:'1rem', display:'block'}}>👗</span>
                        <span style={{fontSize:'1rem', fontWeight:600, color:'white', display:'block', marginBottom:'0.35rem'}}>Fashion</span>
                        <span style={{fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em'}}>9,800+ products</span>
                    </Link>
                    <Link to="/products?cat=home" className="cat-card">
                        <span style={{fontSize:'2.25rem', marginBottom:'1rem', display:'block'}}>🏡</span>
                        <span style={{fontSize:'1rem', fontWeight:600, color:'white', display:'block', marginBottom:'0.35rem'}}>Home & Living</span>
                        <span style={{fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em'}}>7,200+ products</span>
                    </Link>
                    <Link to="/products?cat=beauty" className="cat-card">
                        <span style={{fontSize:'2.25rem', marginBottom:'1rem', display:'block'}}>🌿</span>
                        <span style={{fontSize:'1rem', fontWeight:600, color:'white', display:'block', marginBottom:'0.35rem'}}>Beauty & Care</span>
                        <span style={{fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em'}}>5,600+ products</span>
                    </Link>
                </div>
            </section>

            <section className="cta-section reveal" ref={el => revealRefs.current[2] = el}>
                <div className="cta-glass">
                    <h2 style={{fontSize:'2.25rem',fontWeight:700,marginBottom:'1rem',lineHeight:1.25}}>Ready to join<br /><span style={{color:'var(--yellow)'}}>1 million+</span> happy shoppers?</h2>
                    <p>Create your free account today and get access to exclusive deals, fast delivery, and a marketplace you can trust.</p>
                    <div className="cta-btns">
                        <Link to="/register" className="btn-yellow" style={{padding:'0.8rem 2rem', borderRadius:'50px'}}>
                            Create Free Account <i className="fas fa-arrow-right" style={{fontSize:'0.8rem'}}></i>
                        </Link>
                        <Link to="/vendor/register" className="btn-hero-ghost" style={{padding:'0.8rem 2rem', borderRadius:'50px'}}>
                            <i className="fas fa-store"></i> Become a Vendor
                        </Link>
                    </div>
                </div>
            </section>

            <footer>
                <div className="footer-brand">Ekart</div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
                <div className="footer-links">
                    <Link to="/policies" style={{fontSize:'0.75rem', color:'var(--text-dim)', textDecoration:'none'}}>Policies & SOPs</Link>
                    <a href="#" style={{fontSize:'0.75rem', color:'var(--text-dim)', textDecoration:'none'}}>Privacy</a>
                    <a href="#" style={{fontSize:'0.75rem', color:'var(--text-dim)', textDecoration:'none'}}>Terms</a>
                    <a href="#" style={{fontSize:'0.75rem', color:'var(--text-dim)', textDecoration:'none'}}>Contact</a>
                </div>
            </footer>
        </div>
    );
}