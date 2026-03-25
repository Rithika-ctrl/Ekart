import React, { useState, useEffect, useRef } from 'react';

const CSS = `
        :root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255,255,255,0.18);
            --glass-card:   rgba(255,255,255,0.08);
            --glass-nav:    rgba(0,0,0,0.28);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }
            /* Analytics styles scoped */
            .ekart-analytics-hide { display:none !important; }
            .ekart-analytics-timeline { background:rgba(255,255,255,0.04); border-radius:12px; padding:1.2rem; margin:2rem 0; }
            .ekart-analytics-step { border-left:3px solid var(--yellow); padding-left:1rem; margin-bottom:1rem; }
            .ekart-analytics-step time { color:var(--text-dim); font-size:0.78rem; margin-left:0.5rem; }
            .ekart-analytics-insights { background:rgba(245,168,0,0.08); border-radius:10px; padding:0.8rem 1rem; margin-bottom:1.5rem; color:var(--yellow); font-weight:600; }

        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; }
        body { font-family:'Poppins',sans-serif; min-height:100vh; color:var(--text-white); display:flex; flex-direction:column; }
        main.page { flex: 1 0 auto; margin-bottom: 0; }

        .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
        .bg-layer::before {
            content:''; position:absolute; inset:-20px;
            background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=75&auto=format') center/cover no-repeat;
            filter:blur(6px); transform:scale(1.08);
        }
        .bg-layer::after {
            content:''; position:absolute; inset:0;
            background:linear-gradient(180deg,rgba(5,8,20,0.85) 0%,rgba(8,12,28,0.80) 40%,rgba(5,8,20,0.92) 100%);
        }

        /* NAV */
        nav {
            position:fixed; top:0; left:0; right:0; z-index:100;
            padding:0.75rem 2rem;
            display:flex; align-items:center; justify-content:space-between;
            background:var(--glass-nav); backdrop-filter:blur(14px);
            border-bottom:1px solid var(--glass-border); gap:1rem;
            transition:background 0.3s;
        }
        nav.scrolled { background:rgba(0,0,0,0.5); }
        .nav-brand { font-size: 1.6rem; font-weight:700; color:var(--text-white); text-decoration:none; letter-spacing:0.04em; display:flex; align-items:center; gap:0.45rem; flex-shrink:0; }
        .nav-brand span { color:var(--yellow); }
        .nav-right { display:flex; align-items:center; gap:0.5rem; flex-shrink:0; }
        .nav-link { display:flex; align-items:center; gap:0.35rem; color:var(--text-light); text-decoration:none; font-size:0.78rem; font-weight:500; padding:0.42rem 0.75rem; border-radius:6px; border:1px solid transparent; transition:all 0.2s; white-space:nowrap; }
        .nav-link:hover { color:white; background:rgba(255,255,255,0.1); border-color:var(--glass-border); }
        .nav-link.cart-link { border-color:var(--glass-border); position:relative; }
        .cart-badge { position:absolute; top:-4px; right:-4px; background:var(--yellow); color:#1a1000; font-size:0.58rem; font-weight:800; width:15px; height:15px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
        .nav-link.wishlist-link { border-color:rgba(239,68,68,0.3); }
        .nav-link.wishlist-link i { color:#ef4444; }
        .nav-link.logout-link { border-color:rgba(255,100,80,0.3); }
        .nav-link.logout-link:hover { color:#ff8060; border-color:rgba(255,100,80,0.6); background:rgba(255,100,80,0.08); }

        /* ALERTS */
        .alert-stack { position:fixed; top:5rem; right:1.5rem; z-index:200; display:flex; flex-direction:column; gap:0.5rem; }
        .alert { padding:0.875rem 1.25rem; background:rgba(10,12,30,0.88); backdrop-filter:blur(16px); border:1px solid; border-radius:10px; display:flex; align-items:center; gap:0.625rem; font-size:0.825rem; min-width:260px; animation:slideIn 0.3s ease both; }
        .alert-success { border-color:rgba(34,197,94,0.45); color:#22c55e; }
        .alert-danger  { border-color:rgba(255,100,80,0.45); color:#ff8060; }
        .alert-close   { margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; font-size:1rem; }

        /* PAGE */
        .page { flex:1; padding:7.5rem 2rem 4rem; max-width:1300px; margin:0 auto; width:100%; display:flex; flex-direction:column; gap:3rem; }

        /* BREADCRUMB */
        .breadcrumb {
            margin-top: 1rem;
            display:flex; align-items:center; gap:0.4rem;
            font-size:0.78rem; color:var(--text-dim);
            animation:fadeUp 0.4s ease both;
            background:rgba(255,255,255,0.04);
            border:1px solid var(--glass-border);
            border-radius:50px;
            padding:0.45rem 1.1rem;
            width:fit-content;
            flex-wrap:wrap;
        }
        .breadcrumb a {
            color:var(--text-dim); text-decoration:none;
            transition:color 0.2s;
            display:inline-flex; align-items:center; gap:0.35rem;
        }
        .breadcrumb a:hover { color:var(--yellow); }
        .breadcrumb a:hover i.bc-icon { color:var(--yellow); }
        .breadcrumb i.bc-sep { font-size:0.55rem; opacity:0.4; flex-shrink:0; }
        .breadcrumb i.bc-icon { font-size:0.72rem; color:var(--text-dim); transition:color 0.2s; }
        .breadcrumb .bc-current {
            color:var(--text-light); font-weight:600;
            max-width:220px;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .breadcrumb .bc-category {
            display:inline-flex; align-items:center; gap:0.3rem;
            color:var(--yellow); opacity:0.8;
            font-weight:500; transition:opacity 0.2s;
        }
        .breadcrumb .bc-category:hover { opacity:1; }

        /* PRODUCT MAIN */
        .product-main { display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; animation:fadeUp 0.5s ease both; }

        /* MEDIA */
        .media-col { display:flex; flex-direction:column; gap:1rem; }
        .main-image-wrap { position:relative; border-radius:24px; overflow:hidden; border:1px solid var(--glass-border); background:rgba(0,0,0,0.3); aspect-ratio:4/3; }
        .main-image-wrap img { width:100%; height:100%; object-fit:cover; transition:transform 0.5s; }
        .main-image-wrap:hover img { transform:scale(1.04); }
        .category-badge { position:absolute; top:14px; left:14px; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); border:1px solid var(--glass-border); color:var(--yellow); font-size:0.65rem; font-weight:700; padding:5px 12px; border-radius:20px; text-transform:uppercase; letter-spacing:0.07em; }
        .thumbnail-row { display:flex; gap:0.6rem; flex-wrap:wrap; }
        .thumb { width:72px; height:72px; border-radius:12px; cursor:pointer; border:2px solid transparent; object-fit:cover; transition:all 0.25s; flex-shrink:0; background:rgba(0,0,0,0.3); }
        .thumb:hover, .thumb.active { border-color:var(--yellow); transform:scale(1.08); }
        .video-wrap { border-radius:16px; overflow:hidden; border:1px solid var(--glass-border); background:rgba(0,0,0,0.4); }
        .video-wrap video { width:100%; max-height:220px; display:block; }

        /* INFO */
        .info-col { display:flex; flex-direction:column; gap:1.4rem; }
        .product-title { font-size:clamp(1.5rem,3vw,2.2rem); font-weight:800; line-height:1.2; }
        .product-title span { color:var(--yellow); }
        .info-row { display:flex; align-items:flex-start; gap:0.75rem; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); border-radius:12px; padding:0.9rem 1.1rem; }
        .info-row-icon { color:var(--yellow); font-size:1rem; margin-top:2px; flex-shrink:0; }
        .info-row-label { font-size:0.68rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.2rem; }
        .info-row-value { font-size:0.92rem; font-weight:500; color:white; line-height:1.5; }
        .price-block { background:linear-gradient(135deg,rgba(245,168,0,0.12),rgba(245,168,0,0.04)); border:1px solid rgba(245,168,0,0.3); border-radius:16px; padding:1.25rem 1.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; }
        .price-big { font-size:2.4rem; font-weight:800; color:var(--yellow); line-height:1; }
        .price-big sup { font-size:1rem; font-weight:700; vertical-align:super; }
        .stock-pill { display:inline-flex; align-items:center; gap:0.4rem; font-size:0.75rem; font-weight:700; padding:0.35rem 0.9rem; border-radius:50px; }
        .stock-pill.in-stock  { background:rgba(34,197,94,0.15);  border:1px solid rgba(34,197,94,0.35);  color:#22c55e; }
        .stock-pill.low-stock { background:rgba(245,168,0,0.15);  border:1px solid rgba(245,168,0,0.35);  color:var(--yellow); }
        .stock-pill.out-stock { background:rgba(239,68,68,0.12);  border:1px solid rgba(239,68,68,0.3);   color:#ef4444; }
        .btn-add-cart { display:flex; align-items:center; justify-content:center; gap:0.6rem; background:var(--yellow); color:#1a1000; border:none; border-radius:16px; padding:1rem 2rem; font-family:'Poppins',sans-serif; font-size:1rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; text-decoration:none; cursor:pointer; transition:all 0.3s cubic-bezier(0.23,1,0.32,1); box-shadow:0 8px 28px rgba(245,168,0,0.3); }
        .btn-add-cart:hover { background:var(--yellow-d); transform:translateY(-3px); box-shadow:0 14px 36px rgba(245,168,0,0.45); color:#1a1000; text-decoration:none; }
        /* ── NOTIFY ME BUTTON ── */
        .btn-notify-me {
            display:flex; align-items:center; justify-content:center; gap:0.6rem;
            background:rgba(99,102,241,0.12);
            border:1.5px solid rgba(99,102,241,0.45);
            color:#a5b4fc;
            border-radius:16px; padding:1rem 2rem;
            font-family:'Poppins',sans-serif; font-size:1rem; font-weight:700;
            letter-spacing:0.06em; text-transform:uppercase;
            cursor:pointer; transition:all 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        .btn-notify-me:hover {
            background:rgba(99,102,241,0.22);
            border-color:rgba(99,102,241,0.7);
            transform:translateY(-2px);
            box-shadow:0 8px 24px rgba(99,102,241,0.25);
        }
        .btn-notify-me.subscribed {
            background:rgba(34,197,94,0.12);
            border-color:rgba(34,197,94,0.45);
            color:#4ade80;
        }
        .btn-notify-me.subscribed:hover {
            background:rgba(34,197,94,0.22);
            border-color:rgba(34,197,94,0.7);
            box-shadow:0 8px 24px rgba(34,197,94,0.2);
        }
        .btn-notify-me:disabled { opacity:0.6; cursor:not-allowed; pointer-events:none; }
        /* Notify Me toast-style confirmation banner (shown under the button) */
        .notify-confirm {
            display:none; margin-top:0.75rem;
            background:rgba(34,197,94,0.1);
            border:1px solid rgba(34,197,94,0.3);
            border-radius:10px; padding:0.75rem 1rem;
            font-size:0.8rem; color:#4ade80;
            animation:sk-in 0.3s ease both;
        }
        .notify-confirm.show { display:flex; align-items:center; gap:0.5rem; }
        .btn-wishlist-lg { display:flex; align-items:center; justify-content:center; gap:0.5rem; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.35); color:#ef4444; border-radius:16px; padding:1rem; font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.3s; flex-shrink:0; }
        .btn-wishlist-lg:hover { background:rgba(239,68,68,0.2); transform:translateY(-2px); }
        .action-row { display:flex; gap:0.75rem; }
        .vendor-badge { display:inline-flex; align-items:center; gap:0.5rem; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); border-radius:50px; padding:0.4rem 0.9rem; font-size:0.72rem; color:var(--text-dim); }
        .vendor-badge i { color:var(--yellow); }


        /* ── DELIVERY ESTIMATE ── */
        .delivery-box {
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--glass-border);
            border-radius: 14px;
            padding: 1rem 1.2rem;
            display: flex;
            flex-direction: column;
            gap: 0.55rem;
        }
        .delivery-box-header {
            font-size: 0.68rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-dim);
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .delivery-box-header i { color: var(--yellow); font-size: 0.72rem; }
        .delivery-options {
            display: flex;
            gap: 0.6rem;
            flex-wrap: wrap;
        }
        .delivery-option {
            flex: 1;
            min-width: 120px;
            background: rgba(255,255,255,0.04);
            border: 2px solid var(--glass-border);
            border-radius: 10px;
            padding: 0.65rem 0.85rem;
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            transition: all 0.2s;
            cursor: pointer;
        }
        .delivery-option.express { border-color: rgba(34,197,94,0.3); }
        .delivery-option-label {
            font-size: 0.62rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-dim);
            display: flex;
            align-items: center;
            gap: 0.3rem;
        }
        .delivery-option-label i { font-size: 0.65rem; }
        .delivery-option.express .delivery-option-label { color: #22c55e; }
        .delivery-option-date {
            font-size: 0.9rem;
            font-weight: 700;
            color: white;
        }
        .delivery-option-price {
            font-size: 0.68rem;
            color: var(--text-dim);
        }
        .delivery-option.express .delivery-option-price { color: #4ade80; }
        .delivery-pincode-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.1rem;
        }
        .delivery-pin-input {
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            color: white;
            font-family: 'Poppins', sans-serif;
            font-size: 0.78rem;
            padding: 0.38rem 0.7rem;
            width: 130px;
            outline: none;
            transition: border-color 0.2s;
            letter-spacing: 0.06em;
        }
        .delivery-pin-input:focus { border-color: rgba(245,168,0,0.5); }
        .delivery-pin-input::placeholder { color: var(--text-dim); letter-spacing: 0; }
        .btn-check-pin {
            background: none;
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            color: var(--yellow);
            font-family: 'Poppins', sans-serif;
            font-size: 0.72rem;
            font-weight: 600;
            padding: 0.38rem 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .btn-check-pin:hover { border-color: rgba(245,168,0,0.5); background: rgba(245,168,0,0.06); }
        .delivery-pin-result {
            font-size: 0.72rem;
            margin-left: 0.2rem;
            display: none;
        }
        .delivery-pin-result.ok    { color: #22c55e; display: inline; }
        .delivery-pin-result.fail  { color: #f87171; display: inline; }

        /* SECTION TITLE */
        .section-title { font-size:1.2rem; font-weight:700; color:white; display:flex; align-items:center; gap:0.6rem; padding-bottom:0.75rem; border-bottom:1px solid var(--glass-border); margin-bottom:1rem; }
        .section-title i { color:var(--yellow); }

        /* REVIEWS */
        .reviews-grid { display:flex; flex-direction:column; gap:0.75rem; }
        .review-card { background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); border-radius:14px; padding:1rem 1.25rem; border-left:3px solid var(--yellow); animation:fadeUp 0.4s ease both; }
        .review-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; }
        .review-author { font-size:0.8rem; font-weight:700; color:white; }
        .review-stars { color:var(--yellow); font-size:0.7rem; }
        .review-text { font-size:0.78rem; color:var(--text-dim); line-height:1.55; }

        /* ── REVIEW PHOTOS (new) ── */
        .review-photos { margin-top:0.6rem; display:flex; flex-direction:column; gap:0.5rem; }
        .photo-strip { display:flex; flex-wrap:wrap; gap:0.4rem; }
        .photo-thumb {
            width:58px; height:58px; border-radius:8px; object-fit:cover;
            border:1px solid var(--glass-border); cursor:pointer;
            transition:all 0.25s;
        }
        .photo-thumb:hover { border-color:var(--yellow); transform:scale(1.08); }
        .btn-add-photos {
            display:inline-flex; align-items:center; gap:0.3rem;
            font-size:0.68rem; font-weight:600; color:var(--yellow);
            background:rgba(245,168,0,0.08); border:1px solid rgba(245,168,0,0.22);
            border-radius:6px; padding:0.25rem 0.6rem;
            text-decoration:none; cursor:pointer; transition:all 0.2s;
            font-family:'Poppins',sans-serif;
        }
        .btn-add-photos:hover { background:rgba(245,168,0,0.18); color:var(--yellow); }

        /* REVIEW FORM */
        .review-form-wrap { background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); border-radius:14px; padding:1.25rem; margin-top:1rem; }
        .review-form-wrap h4 { font-size:0.85rem; font-weight:700; color:white; margin-bottom:0.75rem; }
        .review-form { display:flex; gap:0.5rem; flex-wrap:wrap; }
        .review-form select,
        .review-form input { background:rgba(255,255,255,0.07); border:1px solid var(--glass-border); border-radius:9px; color:white; font-family:'Poppins',sans-serif; font-size:0.78rem; padding:0.55rem 0.75rem; transition:all 0.25s; }
        .review-form select { flex-shrink:0; width:75px; }
        .review-form input { flex:1; min-width:160px; }
        .review-form select:focus, .review-form input:focus { outline:none; border-color:var(--yellow); background:rgba(255,255,255,0.1); }
        .review-form select option { background:#0f1228; }
        .btn-post { background:var(--yellow); color:#1a1000; border:none; border-radius:9px; padding:0.55rem 1.1rem; font-family:'Poppins',sans-serif; font-size:0.78rem; font-weight:700; cursor:pointer; transition:all 0.25s; white-space:nowrap; flex-shrink:0; }
        .btn-post:hover { background:var(--yellow-d); }

        /* ── PHOTO UPLOAD PANEL (new) ── */
        .upload-panel {
            background:rgba(255,255,255,0.04);
            border:1px solid var(--glass-border);
            border-radius:14px; padding:1.25rem;
            margin-top:1rem;
        }
        .upload-panel h4 { font-size:0.85rem; font-weight:700; color:white; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem; }
        .upload-panel h4 i { color:var(--yellow); }
        .dropzone {
            border:1.5px dashed rgba(245,168,0,0.35);
            border-radius:10px; padding:1.5rem 1rem;
            text-align:center; cursor:pointer;
            transition:all 0.25s; margin-bottom:0.75rem;
        }
        .dropzone:hover, .dropzone.drag-over { background:rgba(245,168,0,0.06); border-color:rgba(245,168,0,0.6); }
        .dropzone i { font-size:1.6rem; color:var(--yellow); opacity:0.7; margin-bottom:0.35rem; display:block; }
        .dropzone p { font-size:0.75rem; color:var(--text-dim); margin:0; }
        .dropzone p span { color:var(--yellow); font-weight:600; }
        .dropzone small { font-size:0.65rem; color:var(--text-dim); opacity:0.7; }
        .preview-strip { display:flex; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.75rem; }
        .preview-item { position:relative; width:62px; height:62px; }
        .preview-item img { width:100%; height:100%; object-fit:cover; border-radius:8px; border:1px solid var(--glass-border); }
        .preview-item .remove { position:absolute; top:-5px; right:-5px; width:16px; height:16px; border-radius:50%; background:#ef4444; color:white; font-size:9px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; font-family:'Poppins',sans-serif; }
        .upload-meta { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; }
        .upload-count { font-size:0.7rem; color:var(--text-dim); }
        .upload-count span { color:var(--yellow); font-weight:700; }
        .btn-upload {
            display:inline-flex; align-items:center; gap:0.4rem;
            background:var(--yellow); color:#1a1000;
            border:none; border-radius:9px; padding:0.5rem 1.1rem;
            font-family:'Poppins',sans-serif; font-size:0.75rem; font-weight:700;
            cursor:pointer; transition:all 0.25s; letter-spacing:0.04em;
        }
        .btn-upload:hover { background:var(--yellow-d); }
        .btn-upload:disabled { opacity:0.4; cursor:not-allowed; }

        /* LIGHTBOX */
        .lightbox { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:999; align-items:center; justify-content:center; }
        .lightbox.open { display:flex; }
        .lightbox img { max-width:90vw; max-height:88vh; border-radius:12px; box-shadow:0 0 60px rgba(0,0,0,0.8); }
        .lightbox-close { position:absolute; top:1.5rem; right:1.5rem; background:rgba(255,255,255,0.1); border:1px solid var(--glass-border); color:white; border-radius:50%; width:36px; height:36px; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
        .lightbox-close:hover { background:rgba(255,255,255,0.2); }

        /* SIMILAR */
        .similar-section { animation:fadeUp 0.6s ease both; }
        .similar-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1.25rem; margin-top:1.25rem; }
        .sim-card { background:var(--glass-card); backdrop-filter:blur(18px); border:1px solid var(--glass-border); border-radius:18px; overflow:hidden; text-decoration:none; color:var(--text-white); transition:all 0.3s cubic-bezier(0.23,1,0.32,1); display:flex; flex-direction:column; animation:fadeUp 0.5s ease both; }
        .sim-card:hover { transform:translateY(-6px); border-color:rgba(245,168,0,0.4); box-shadow:0 20px 45px rgba(0,0,0,0.35); color:white; text-decoration:none; }
        .sim-img-wrap { position:relative; height:170px; overflow:hidden; flex-shrink:0; }
        .sim-img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s; }
        .sim-card:hover .sim-img { transform:scale(1.07); }
        .sim-cat { position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.6); backdrop-filter:blur(6px); border:1px solid var(--glass-border); color:var(--yellow); font-size:0.6rem; font-weight:700; padding:3px 9px; border-radius:20px; text-transform:uppercase; }
        .sim-body { padding:1rem; display:flex; flex-direction:column; gap:0.4rem; flex:1; }
        .sim-name { font-size:0.9rem; font-weight:700; color:white; }
        .sim-desc { font-size:0.72rem; color:var(--text-dim); line-height:1.45; }
        .sim-price { font-size:1.3rem; font-weight:800; color:var(--yellow); margin-top:auto; padding-top:0.4rem; }
        .sim-price sup { font-size:0.7rem; vertical-align:super; font-weight:700; }
        .btn-sim-cart { display:flex; align-items:center; justify-content:center; gap:0.4rem; background:var(--yellow); color:#1a1000; border:none; border-top:1px solid rgba(0,0,0,0.1); padding:0.6rem 1rem; font-family:'Poppins',sans-serif; font-size:0.75rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; text-decoration:none; cursor:pointer; transition:all 0.25s; flex-shrink:0; }
        .btn-sim-cart:hover { background:var(--yellow-d); color:#1a1000; text-decoration:none; }
        .no-similar { text-align:center; padding:3rem; color:var(--text-dim); font-size:0.85rem; }
        .no-similar i { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.3; display:block; }

        /* FOOTER */
        footer { background:rgba(0,0,0,0.5); backdrop-filter:blur(16px); border-top:1px solid var(--glass-border); padding:1.1rem 2rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
        .footer-brand { font-size:1rem; font-weight:700; color:white; }
        .footer-brand span { color:var(--yellow); }
        .footer-copy { font-size:0.7rem; color:var(--text-dim); }

        /* ANIMATIONS */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }


        /* ── QUANTITY SELECTOR ── */
        .qty-wrap {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--glass-border);
            border-radius: 14px;
            padding: 0.9rem 1.1rem;
        }
        .qty-label {
            font-size: 0.68rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-dim);
            flex-shrink: 0;
        }
        .qty-controls {
            display: flex;
            align-items: center;
            gap: 0;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border);
            border-radius: 10px;
            overflow: hidden;
        }
        .qty-btn {
            width: 38px;
            height: 38px;
            border: none;
            background: transparent;
            color: var(--text-light);
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.18s;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Poppins', sans-serif;
            flex-shrink: 0;
        }
        .qty-btn:hover:not(:disabled) {
            background: rgba(245,168,0,0.15);
            color: var(--yellow);
        }
        .qty-btn:active:not(:disabled) { transform: scale(0.9); }
        .qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .qty-input {
            width: 48px;
            text-align: center;
            background: transparent;
            border: none;
            border-left: 1px solid var(--glass-border);
            border-right: 1px solid var(--glass-border);
            color: white;
            font-family: 'Poppins', sans-serif;
            font-size: 0.95rem;
            font-weight: 700;
            padding: 0;
            height: 38px;
            outline: none;
            -moz-appearance: textfield;
        }
        .qty-input::-webkit-inner-spin-button,
        .qty-input::-webkit-outer-spin-button { -webkit-appearance: none; }
        .qty-stock-info {
            font-size: 0.72rem;
            color: var(--text-dim);
            margin-left: auto;
        }
        .qty-stock-info span { color: var(--yellow); font-weight: 600; }

        /* RESPONSIVE */
        @media(max-width:900px) { .product-main { grid-template-columns:1fr; } nav { padding:0.7rem 1rem; } .page { padding:5.5rem 1rem 3rem; } }
        @media(max-width:560px) { .similar-grid { grid-template-columns:1fr 1fr; } .nav-link span { display:none; } .nav-link { padding:0.42rem 0.55rem; } }
        @media(max-width:380px) { .similar-grid { grid-template-columns:1fr; } }

        /* ── Share Button ── */
        .btn-share-lg {
            display: flex; align-items: center; justify-content: center;
            background: rgba(59,130,246,0.1);
            border: 1px solid rgba(59,130,246,0.35);
            color: #60a5fa;
            border-radius: 16px;
            width: 52px; height: 52px;
            font-size: 1rem; cursor: pointer;
            transition: all 0.25s;
            flex-shrink: 0;
        }
        .btn-share-lg:hover {
            background: #3b82f6; color: white;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(59,130,246,0.35);
        }
        .btn-share-lg:active { transform: scale(0.93); }

        /* ── Share Toast Notification ── */
        .share-toast {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: rgba(10,13,32,0.95);
            border: 1px solid rgba(34,197,94,0.4);
            color: #22c55e;
            font-size: 0.8rem; font-weight: 600;
            padding: 0.6rem 1.1rem;
            border-radius: 50px;
            margin-top: 0.75rem;
            backdrop-filter: blur(12px);
            opacity: 0;
            transform: translateY(6px);
            transition: opacity 0.25s ease, transform 0.25s ease;
            pointer-events: none;
        }
        .share-toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        /* ── Shared modal base ── */
        .ekart-modal-overlay {
            position: fixed; inset: 0; z-index: 999;
            background: rgba(0,0,0,0.70); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; pointer-events: none;
            transition: opacity 0.25s ease;
        }
        .ekart-modal-overlay.active { opacity: 1; pointer-events: all; }
        .ekart-modal-box {
            background: rgba(10,13,32,0.97);
            border: 1px solid rgba(255,255,255,0.18);
            border-radius: 22px;
            padding: 2.25rem 2.5rem;
            max-width: 400px; width: 92%;
            text-align: center;
            box-shadow: 0 50px 120px rgba(0,0,0,0.75);
            transform: scale(0.90) translateY(20px);
            transition: transform 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        .ekart-modal-overlay.active .ekart-modal-box { transform: scale(1) translateY(0); }
        .ekart-modal-icon  { font-size: 2.5rem; margin-bottom: 0.75rem; }
        .ekart-modal-title { font-size: 1.1rem; font-weight: 700; color: white; margin-bottom: 0.5rem; }
        .ekart-modal-msg   { font-size: 0.82rem; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 1.5rem; }
        .ekart-modal-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .ekart-modal-btn-primary {
            display: inline-flex; align-items: center; gap: 0.4rem;
            background: #f5a800; color: #1a1000;
            padding: 0.75rem 1.75rem; border-radius: 11px;
            font-family: 'Poppins', sans-serif; font-size: 0.85rem; font-weight: 700;
            text-decoration: none; transition: all 0.2s; width: 100%; justify-content: center;
        }
        .ekart-modal-btn-primary:hover { background: #d48f00; text-decoration: none; transform: translateY(-1px); color: #1a1000; }
        .ekart-modal-btn-secondary {
            display: inline-flex; align-items: center; gap: 0.4rem;
            background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8);
            border: 1px solid rgba(255,255,255,0.18);
            padding: 0.75rem 1.75rem; border-radius: 11px;
            font-family: 'Poppins', sans-serif; font-size: 0.85rem; font-weight: 600;
            text-decoration: none; transition: all 0.2s; width: 100%; justify-content: center;
        }
        .ekart-modal-btn-secondary:hover { background: rgba(255,255,255,0.13); color: white; text-decoration: none; }
        .ekart-modal-btn-ghost {
            background: none; border: none; color: rgba(255,255,255,0.35);
            font-family: 'Poppins', sans-serif; font-size: 0.78rem;
            cursor: pointer; transition: color 0.2s; width: 100%; text-align: center;
            padding: 0.5rem;
        }
        .ekart-modal-btn-ghost:hover { color: rgba(255,255,255,0.65); }

        /* ── Share modal specifics ── */
        .share-link-box {
            display: flex; align-items: center; gap: 0.5rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 10px; padding: 0.6rem 0.75rem;
            margin-bottom: 1.25rem; text-align: left;
        }
        .share-link-text {
            flex: 1; font-size: 0.72rem; color: rgba(255,255,255,0.55);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            font-family: monospace;
        }
        .share-copy-btn {
            display: inline-flex; align-items: center; gap: 0.35rem;
            background: rgba(245,168,0,0.15); border: 1px solid rgba(245,168,0,0.35);
            color: #f5a800; border-radius: 7px;
            padding: 0.4rem 0.75rem; font-family: 'Poppins', sans-serif;
            font-size: 0.72rem; font-weight: 700; cursor: pointer;
            transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
        }
        .share-copy-btn:hover { background: #f5a800; color: #1a1000; }
        .share-copy-btn.copied { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.4); color: #22c55e; }

        .share-via-row {
            display: flex; gap: 0.75rem; justify-content: center;
            margin-bottom: 1rem;
        }
        .share-via-btn {
            width: 46px; height: 46px; border-radius: 50%;
            display: inline-flex; align-items: center; justify-content: center;
            font-size: 1.1rem; text-decoration: none; cursor: pointer;
            border: none; transition: all 0.2s;
        }
        .share-via-btn:hover { transform: translateY(-3px) scale(1.1); text-decoration: none; }
        .share-whatsapp  { background: rgba(37,211,102,0.15);  color: #25d366; border: 1px solid rgba(37,211,102,0.3);  }
        .share-whatsapp:hover  { background: #25d366; color: white; }
        .share-telegram  { background: rgba(0,136,204,0.15);   color: #0088cc; border: 1px solid rgba(0,136,204,0.3);   }
        .share-telegram:hover  { background: #0088cc; color: white; }
        .share-email     { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.15); }
        .share-email:hover     { background: rgba(255,255,255,0.15); color: white; }
        .share-native    { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.15); }
        .share-native:hover    { background: rgba(255,255,255,0.15); color: white; }
`;

/**
 * ProductDetail Component
 * @param {Object} props
 * @param {Object} props.product - Current product details
 * @param {boolean} props.isGuestView - Indicates if the user is a guest
 * @param {Object} props.customer - Information about the logged-in customer, if any
 * @param {Array} props.similar - Array of similar products
 * @param {number} props.cartCount - Items in the user's cart
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 */
export default function ProductDetail({
    product = {},
    isGuestView = false,
    customer = null,
    similar = [],
    cartCount = 0,
    successMessage = null,
    failureMessage = null,
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [mainImage, setMainImage] = useState(product.imageLink);
    const [qty, setQty] = useState(1);
    const [activeLightbox, setActiveLightbox] = useState(false);
    const [lightboxImage, setLightboxImage] = useState('');
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [pinInputValue, setPinInputValue] = useState('');
    const [pinResult, setPinResult] = useState(null);
    const [isNotified, setIsNotified] = useState(false);
    
    // UI state for Modals
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

    // Delivery estimate states
    const [stdDateText, setStdDateText] = useState('Calculating...');
    const [expDateText, setExpDateText] = useState('Calculating...');
    const [expCountdown, setExpCountdown] = useState('');
    
    const [toasts, setToasts] = useState([]);
    
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        
        // Calculate delivery dates
        const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const fmt = d => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
        
        const addBusinessDays = (from, n) => {
            let d = new Date(from);
            let added = 0;
            while (added < n) {
                d.setDate(d.getDate() + 1);
                if (d.getDay() !== 0 && d.getDay() !== 6) added++;
            }
            return d;
        };

        const now = new Date();
        const cutoff = new Date(now); 
        cutoff.setHours(14, 0, 0, 0);

        setStdDateText(fmt(addBusinessDays(now, 5)));
        const expDays = now < cutoff ? 1 : 2;
        setExpDateText(fmt(addBusinessDays(now, expDays)));
        
        const tick = () => {
            const n = new Date();
            const c = new Date(n); c.setHours(14, 0, 0, 0);
            if (n >= c) {
                setExpCountdown('tomorrow');
            } else {
                const diff = c - n;
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                setExpCountdown(`${h}h ${m}m`);
            }
        };
        tick();
        const timer = setInterval(tick, 60000);

        const savedPin = localStorage.getItem('ekart_delivery_pin');
        if (savedPin) {
            setPinInputValue(savedPin);
            handleCheckPin(savedPin);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 3000);
            return () => clearTimeout(timer1);
        }
    }, [showSuccess, showFailure]);
    
    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts(prev => prev.slice(1));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    const addToast = (msg, type) => {
        setToasts(prev => [...prev, { id: Date.now(), msg, type }]);
    };

    const handleCheckPin = (pin = pinInputValue) => {
        if (!/^\d{6}$/.test(pin)) {
            setPinResult({ type: 'fail', msg: 'Enter a valid 6-digit pin code' });
            return;
        }
        setPinResult({ type: 'ok', msg: 'Checking...' });

        // Simulating fetch
        fetch('/api/check-pincode?pinCode=' + pin)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setPinResult({ type: 'ok', msg: `✓ Delivery available to ${pin}` });
                } else {
                    setPinResult({ type: 'fail', msg: `✗ ${data.message || 'Not serviceable yet'}` });
                }
            })
            .catch(() => {
                setPinResult({ type: 'ok', msg: '✓ Delivery available' });
            });
    };

    const handleQtyChange = (delta) => {
        const maxQty = product.stock > 10 ? 10 : product.stock;
        setQty(prev => Math.min(maxQty, Math.max(1, prev + delta)));
    };

    const handleAddToCart = () => {
        if (isGuestView) {
            setIsGuestModalOpen(true);
            return;
        }

        // Simulate Add to Cart
        fetch('/api/cart/add-web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product.id, quantity: qty })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                addToast('Added to cart!', 'success');
            } else {
                addToast(data.message || 'Something went wrong', 'error');
            }
        })
        .catch(() => addToast('Network error', 'error'));
    };

    const handleWishlistToggle = () => {
        setIsWishlisted(!isWishlisted);
        addToast(isWishlisted ? 'Removed from Wishlist' : 'Added to Wishlist ❤️', isWishlisted ? 'error' : 'success');
    };

    const copyShareLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            addToast('Link copied to clipboard!', 'success');
        });
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart — {product.name}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* ALERTS */}
            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            {/* NAV */}
            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <a href="/customer/home" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }}></i>
                    Ek<span>art</span>
                </a>
                <div className="nav-right">
                    <a href="/track-orders" className="nav-link"><i className="fas fa-truck"></i> <span>Track</span></a>
                    <a href="/order-history" className="nav-link"><i className="fas fa-history"></i> <span>Orders</span></a>
                    <a href="/view-orders" className="nav-link"><i className="fas fa-box-open"></i> <span>My Orders</span></a>
                    <a href="/account/wishlist" className="nav-link wishlist-link"><i className="fas fa-heart"></i> <span>Wishlist</span></a>
                    <a href="/view-cart" className="nav-link cart-link"><i className="fas fa-shopping-cart"></i> <span>Cart</span>
                        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                    </a>
                    <a href="/logout" className="nav-link logout-link"><i className="fas fa-sign-out-alt"></i> <span>Logout</span></a>
                </div>
            </nav>

            <main className="page">
                {/* Breadcrumb */}
                <nav className="breadcrumb">
                    <a href="/customer/home" title="Back to Home">
                        <i className="fas fa-home bc-icon"></i> <span>Home</span>
                    </a>
                    <i className="fas fa-chevron-right bc-sep"></i>
                    <a href={`/customer/home?category=${encodeURIComponent(product.category)}`} className="bc-category">
                        <i className="fas fa-tag bc-icon"></i> <span>{product.category}</span>
                    </a>
                    <i className="fas fa-chevron-right bc-sep"></i>
                    <span className="bc-current">{product.name}</span>
                </nav>

                {/* MAIN PRODUCT */}
                <div className="product-main">
                    {/* LEFT: Media */}
                    <div className="media-col">
                        <div className="main-image-wrap">
                            <img src={mainImage} id="heroImg" alt="" onClick={() => { setLightboxImage(mainImage); setActiveLightbox(true); }} style={{ cursor: 'pointer' }} />
                            <span className="category-badge">{product.category}</span>
                        </div>
                        {product.extraImageList?.length > 0 && (
                            <div className="thumbnail-row">
                                <img className={`thumb ${mainImage === product.imageLink ? 'active' : ''}`} src={product.imageLink} onClick={() => setMainImage(product.imageLink)} alt="" />
                                {product.extraImageList.map((url, i) => (
                                    <img key={i} className={`thumb ${mainImage === url ? 'active' : ''}`} src={url} onClick={() => setMainImage(url)} alt="" />
                                ))}
                            </div>
                        )}
                        {product.videoLink && (
                            <div className="video-wrap">
                                <video controls><source src={product.videoLink} type="video/mp4" /></video>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Info */}
                    <div className="info-col">
                        <div>
                            <h1 className="product-title">{product.name}</h1>
                            {product.vendor && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <span className="vendor-badge">
                                        <i className="fas fa-store"></i> Sold by {product.vendor.name}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="info-row">
                            <i className="fas fa-align-left info-row-icon"></i>
                            <div>
                                <div className="info-row-label">Description</div>
                                <div className="info-row-value">{product.description}</div>
                            </div>
                        </div>
                        
                        <div className="price-block">
                            {product.discounted ? (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                        <span style={{ background: 'rgba(239,68,68,0.18)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)', fontSize: '0.9rem', fontWeight: 800, padding: '0.25rem 0.7rem', borderRadius: '8px' }}>
                                            -{product.discountPercent}%
                                        </span>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>You save ₹{(product.mrp - product.price).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="price-big"><sup>₹</sup><span>{product.price}</span></div>
                                    <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                        M.R.P.: <span style={{ textDecoration: 'line-through' }}>₹{product.mrp}</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: '0.35rem' }}>Incl. of all taxes</span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="price-big"><sup>₹</sup><span>{product.price}</span></div>
                                    <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>Incl. of all taxes</div>
                                </div>
                            )}
                            <div>
                                {product.stock > 10 && <span className="stock-pill in-stock"><i className="fas fa-circle" style={{ fontSize: '0.5rem' }}></i> {product.stock} in stock</span>}
                                {product.stock > 0 && product.stock <= 10 && <span className="stock-pill low-stock"><i className="fas fa-exclamation-circle" style={{ fontSize: '0.65rem' }}></i> Only {product.stock} left!</span>}
                                {product.stock === 0 && <span className="stock-pill out-stock"><i className="fas fa-times-circle" style={{ fontSize: '0.65rem' }}></i> Out of Stock</span>}
                            </div>
                        </div>

                        {/* QUANTITY SELECTOR */}
                        {product.stock > 0 && !isGuestView && (
                            <div className="qty-wrap">
                                <span className="qty-label"><i className="fas fa-layer-group" style={{ color: 'var(--yellow)', marginRight: '0.3rem' }}></i>Qty</span>
                                <div className="qty-controls">
                                    <button className="qty-btn" onClick={() => handleQtyChange(-1)} disabled={qty <= 1}>−</button>
                                    <input className="qty-input" type="number" value={qty} readOnly />
                                    <button className="qty-btn" onClick={() => handleQtyChange(1)} disabled={qty >= (product.stock > 10 ? 10 : product.stock)}>+</button>
                                </div>
                                <span className="qty-stock-info">
                                    {product.stock > 10 ? <span>Max 10 per order</span> : <span>Only <span>{product.stock}</span> left</span>}
                                </span>
                            </div>
                        )}

                        {/* DELIVERY ESTIMATE */}
                        {product.stock > 0 && (
                            <div className="delivery-box">
                                <div className="delivery-box-header"><i className="fas fa-truck"></i> Estimated Delivery</div>
                                <div className="delivery-options">
                                    <div className="delivery-option">
                                        <div className="delivery-option-label"><i className="fas fa-box"></i> Standard</div>
                                        <div className="delivery-option-date">{stdDateText}</div>
                                        <div className="delivery-option-price">FREE delivery</div>
                                    </div>
                                    <div className="delivery-option express">
                                        <div className="delivery-option-label"><i className="fas fa-bolt"></i> Express</div>
                                        <div className="delivery-option-date">{expDateText}</div>
                                        <div className="delivery-option-price">+₹129 · Order within <span>{expCountdown}</span></div>
                                    </div>
                                </div>
                                <div className="delivery-pincode-row">
                                    <i className="fas fa-map-marker-alt" style={{ color: 'var(--yellow)', fontSize: '0.72rem' }}></i>
                                    <input type="text" className="delivery-pin-input" placeholder="Enter pin code" maxLength="6" value={pinInputValue} onChange={(e) => setPinInputValue(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={(e) => e.key === 'Enter' && handleCheckPin()} />
                                    <button className="btn-check-pin" onClick={() => handleCheckPin()}>Check</button>
                                    {pinResult && <span className={`delivery-pin-result ${pinResult.type}`} style={{ display: 'inline' }}>{pinResult.msg}</span>}
                                </div>
                            </div>
                        )}

                        <div className="action-row">
                            {product.stock > 0 ? (
                                <button className="btn-add-cart" style={{ flex: 1 }} onClick={handleAddToCart}>
                                    <i className="fas fa-cart-plus"></i> <span>Add to Cart</span>
                                </button>
                            ) : (
                                <button className={`btn-notify-me ${isNotified ? 'subscribed' : ''}`} style={{ flex: 1 }} onClick={() => setIsNotified(!isNotified)}>
                                    <i className={isNotified ? "fas fa-bell-slash" : "fas fa-bell"}></i> 
                                    <span>{isNotified ? 'Unsubscribe' : 'Notify Me When Back'}</span>
                                </button>
                            )}
                            
                            <button className="btn-wishlist-lg" onClick={handleWishlistToggle} style={{ background: isWishlisted ? 'rgba(239,68,68,0.25)' : '' }}>
                                <i className={isWishlisted ? "fas fa-heart" : "far fa-heart"}></i>
                            </button>
                            <button className="btn-share-lg" onClick={() => setIsShareModalOpen(true)} title="Share this product">
                                <i className="fas fa-share-nodes"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* REVIEWS */}
                <div>
                    <div className="section-title">
                        <i className="fas fa-star"></i> Customer Reviews
                        <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-dim)' }}> ({product.reviews?.length || 0} reviews)</span>
                    </div>

                    <div className="reviews-grid">
                        {product.reviews?.map((review, i) => (
                            <div key={i} className="review-card">
                                <div className="review-top">
                                    <span className="review-author">{review.customerName}</span>
                                    <span className="review-stars">
                                        {[...Array(review.rating)].map((_, idx) => <i key={idx} className="fas fa-star"></i>)}
                                    </span>
                                </div>
                                <p className="review-text">{review.comment}</p>
                            </div>
                        ))}
                        {(!product.reviews || product.reviews.length === 0) && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', padding: '1rem 0' }}>
                                No reviews yet — be the first to review this product!
                            </div>
                        )}
                    </div>
                </div>

                {/* SIMILAR PRODUCTS */}
                <div className="similar-section">
                    <div className="section-title">
                        <i className="fas fa-layer-group"></i> Similar Products
                        <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-dim)' }}> in {product.category}</span>
                    </div>
                    {similar?.length > 0 ? (
                        <div className="similar-grid">
                            {similar.map((s, i) => (
                                <div key={i} className="sim-card">
                                    <a href={`/product/${s.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <div className="sim-img-wrap">
                                            <img className="sim-img" src={s.imageLink} alt="" />
                                            <span className="sim-cat">{s.category}</span>
                                        </div>
                                        <div className="sim-body">
                                            <div className="sim-name">{s.name}</div>
                                            <div className="sim-desc">{s.description}</div>
                                            <div className="sim-price"><sup>₹</sup><span>{s.price}</span></div>
                                        </div>
                                    </a>
                                    <a href={`/add-cart/${s.id}`} className="btn-sim-cart"><i className="fas fa-cart-plus"></i> Add to Cart</a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-similar">
                            <i className="fas fa-box-open"></i> No similar products found in this category yet.
                        </div>
                    )}
                </div>
            </main>

            <footer>
                <div className="footer-brand">Ek<span>art</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>

            {/* LIGHTBOX */}
            <div className={`lightbox ${activeLightbox ? 'open' : ''}`} onClick={() => setActiveLightbox(false)}>
                <button className="lightbox-close"><i className="fas fa-times"></i></button>
                <img src={lightboxImage} alt="" onClick={e => e.stopPropagation()} />
            </div>

            {/* TOAST CONTAINER */}
            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{
                        background: 'rgba(10,12,30,0.95)', backdropFilter: 'blur(16px)', border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
                        borderRadius: '12px', padding: '0.875rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.7rem', fontSize: '0.82rem', minWidth: '220px', color: 'white'
                    }}>
                        <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : 'times-circle'}`} style={{ color: toast.type === 'success' ? '#22c55e' : '#ef4444' }}></i>
                        <span>{toast.msg}</span>
                    </div>
                ))}
            </div>

            {/* GUEST PROMPT MODAL */}
            <div className={`ekart-modal-overlay ${isGuestModalOpen ? 'active' : ''}`} onClick={() => setIsGuestModalOpen(false)}>
                <div className="ekart-modal-box" onClick={e => e.stopPropagation()}>
                    <div className="ekart-modal-icon" style={{ fontSize: '2.5rem' }}>🛒</div>
                    <h3 className="ekart-modal-title">Sign In to Add to Cart</h3>
                    <p className="ekart-modal-msg">You need an account to add products to your cart and place orders.</p>
                    <div className="ekart-modal-actions" style={{ flexDirection: 'column', gap: '0.6rem' }}>
                        <a href="/customer/login" className="ekart-modal-btn-primary"><i className="fas fa-sign-in-alt"></i> Sign In</a>
                        <a href="/customer/register" className="ekart-modal-btn-secondary"><i className="fas fa-user-plus"></i> Create Account</a>
                        <button className="ekart-modal-btn-ghost" onClick={() => setIsGuestModalOpen(false)}>Continue Browsing</button>
                    </div>
                </div>
            </div>

            {/* SHARE MODAL */}
            <div className={`ekart-modal-overlay ${isShareModalOpen ? 'active' : ''}`} onClick={() => setIsShareModalOpen(false)}>
                <div className="ekart-modal-box" onClick={e => e.stopPropagation()}>
                    <div className="ekart-modal-icon">🔗</div>
                    <h3 className="ekart-modal-title">Share this Product</h3>
                    <p className="ekart-modal-msg" style={{ color: 'white', fontWeight: 600 }}>{product.name}</p>
                    <div className="share-link-box">
                        <span className="share-link-text">{window.location.href}</span>
                        <button className="share-copy-btn" onClick={copyShareLink}><i className="fas fa-copy"></i> Copy</button>
                    </div>
                    <button className="ekart-modal-btn-ghost" onClick={() => setIsShareModalOpen(false)} style={{ marginTop: '0.5rem' }}>Close</button>
                </div>
            </div>
        </>
    );
}