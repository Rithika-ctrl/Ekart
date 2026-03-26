import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';

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
            /* Analytics styles scoped */
            .ekart-analytics-hide { display:none !important; }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        #root {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex; flex-direction: column;
        }

        /* ── Background ── */
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

        /* ── Navbar ── */
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
        .nav-right { display: flex; align-items: center; gap: 0.75rem; }
        .nav-link-btn {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid var(--glass-border); transition: all 0.2s;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3); transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        /* ── Alert Stack ── */
        .alert-stack {
            position: fixed; top: 5rem; right: 1.5rem;
            z-index: 200; display: flex; flex-direction: column; gap: 0.5rem;
        }
        .alert {
            padding: 0.875rem 1.25rem;
            background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px;
            display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px;
            animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(34,197,94,0.45);  color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; }

        /* ── Page ── */
        .page {
            flex: 1;
            padding: 7rem 1.5rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            gap: 2rem;
        }
        .inner { width: 100%; max-width: 1100px; display: flex; flex-direction: column; gap: 1.75rem; }

        /* ── Page Header ── */
        .page-header {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1.5rem;
            animation: fadeUp 0.45s ease both;
        }
        .page-header-left h1 { font-size: clamp(1.2rem, 2.5vw, 1.75rem); font-weight: 700; margin-bottom: 0.25rem; }
        .page-header-left h1 span { color: var(--yellow); }
        .page-header-left p { font-size: 0.825rem; color: var(--text-dim); }
        .page-header-icon {
            width: 60px; height: 60px;
            background: rgba(245,168,0,0.15);
            border: 2px solid rgba(245,168,0,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; flex-shrink: 0;
        }

        /* ── Section Label ── */
        .section-label {
            display: flex; align-items: center; gap: 0.6rem;
            font-size: 0.7rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.12em;
            color: var(--yellow); margin-bottom: 1.25rem;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); }

        /* ── Free Delivery Progress Banner ── */
        .delivery-banner {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.4rem 1.75rem;
            animation: fadeUp 0.45s ease 0.05s both;
        }
        .delivery-banner .milestone-text {
            font-size: 0.875rem; font-weight: 600;
            color: var(--text-light); margin-bottom: 0.75rem;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .delivery-banner .milestone-text strong { color: var(--yellow); }
        .delivery-banner .unlocked-text {
            font-size: 0.875rem; font-weight: 700;
            color: #22c55e; margin-bottom: 0.75rem;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .progress-track {
            height: 10px; border-radius: 99px;
            background: rgba(255,255,255,0.1); overflow: hidden;
        }
        .progress-fill {
            height: 100%; border-radius: 99px;
            background: linear-gradient(90deg, var(--yellow), #ff8c00);
            transition: width 0.6s ease;
        }
        .progress-fill.full { background: linear-gradient(90deg, #22c55e, #16a34a); }
        .progress-meta {
            font-size: 0.72rem; color: var(--text-dim);
            margin-top: 0.4rem;
        }

        /* ── Cart Grid ── */
        .cart-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            animation: fadeUp 0.5s ease 0.08s both;
        }

        /* ── Cart Item Card ── */
        .cart-card {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            overflow: hidden;
            display: flex; flex-direction: column;
            transition: transform 0.25s, box-shadow 0.25s;
        }
        .cart-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 24px 60px rgba(0,0,0,0.4);
            border-color: rgba(245,168,0,0.3);
        }

        /* Image */
        .cart-img-wrap {
            position: relative; width: 100%; height: 180px; overflow: hidden;
        }
        .cart-img-wrap img {
            width: 100%; height: 100%; object-fit: cover;
            transition: transform 0.4s ease;
        }
        .cart-card:hover .cart-img-wrap img { transform: scale(1.05); }
        .cart-img-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(180deg, transparent 50%, rgba(5,8,20,0.65) 100%);
        }
        .cart-category-badge {
            position: absolute; top: 0.75rem; right: 0.75rem;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.35);
            backdrop-filter: blur(8px);
            color: var(--yellow); font-size: 0.65rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.08em;
            padding: 0.25rem 0.65rem; border-radius: 20px;
        }

        /* Body */
        .cart-#root { padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
        .cart-name { font-size: 0.975rem; font-weight: 700; color: var(--text-white); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cart-desc { font-size: 0.74rem; color: var(--text-dim); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; }
        .cart-price { font-size: 1.1rem; font-weight: 800; color: var(--yellow); margin-top: 0.25rem; }
        .cart-line-total {
            font-size: 0.75rem; color: var(--text-dim); margin-top: 0.2rem;
        }
        .cart-line-total strong { color: var(--text-light); font-weight: 700; }

        /* Quantity + Remove row */
        .cart-actions {
            padding: 0 1.4rem 1.4rem;
            display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
        }
        .qty-control {
            display: flex; align-items: center; gap: 0;
            background: rgba(255,255,255,0.07);
            border: 1px solid var(--glass-border);
            border-radius: 10px; overflow: hidden;
        }
        .qty-btn {
            width: 34px; height: 34px;
            display: flex; align-items: center; justify-content: center;
            color: var(--yellow); text-decoration: none;
            font-size: 1rem; font-weight: 800;
            background: none; border: none; cursor: pointer;
            transition: background 0.15s;
        }
        .qty-btn:hover { background: rgba(245,168,0,0.2); color: var(--yellow); text-decoration: none; }
        .qty-val {
            min-width: 34px; text-align: center;
            font-size: 0.95rem; font-weight: 700; color: var(--text-white);
            border-left: 1px solid var(--glass-border);
            border-right: 1px solid var(--glass-border);
            padding: 0 0.5rem; line-height: 34px;
        }
        .btn-remove {
            display: inline-flex; align-items: center; gap: 0.35rem;
            background: rgba(239,68,68,0.1); color: #ef4444;
            border: 1px solid rgba(239,68,68,0.25);
            border-radius: 10px; padding: 0.45rem 0.85rem;
            font-family: 'Poppins', sans-serif; font-size: 0.75rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.04em;
            text-decoration: none; cursor: pointer; transition: all 0.2s;
        }
        .btn-remove:hover { background: #ef4444; color: white; text-decoration: none; transform: translateY(-1px); }


        /* ── COUPON / PROMO CODE ── */
        .coupon-box {
            margin-bottom: 0.875rem;
            padding: 0.75rem 0.9rem;
            background: rgba(255,255,255,0.03);
            border: 1px dashed rgba(245,168,0,0.3);
            border-radius: 10px;
        }
        .coupon-label {
            font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.08em; color: var(--yellow);
            display: flex; align-items: center; gap: 0.35rem;
            margin-bottom: 0.5rem;
        }
        .coupon-row {
            display: flex; gap: 0.4rem;
        }
        .coupon-input {
            flex: 1; background: rgba(255,255,255,0.06);
            border: 1px solid var(--glass-border); border-radius: 8px;
            color: white; font-family: 'Poppins', sans-serif;
            font-size: 0.82rem; padding: 0.45rem 0.75rem;
            outline: none; text-transform: uppercase; letter-spacing: 0.05em;
            transition: border-color 0.2s;
        }
        .coupon-input::placeholder { text-transform: none; letter-spacing: 0; color: var(--text-dim); }
        .coupon-input:focus { border-color: rgba(245,168,0,0.5); }
        .coupon-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-apply-coupon {
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 8px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.78rem; font-weight: 700;
            padding: 0.45rem 0.85rem; cursor: pointer;
            transition: all 0.2s; white-space: nowrap;
        }
        .btn-apply-coupon:hover { background: #d48f00; }
        .btn-apply-coupon:disabled { opacity: 0.5; cursor: not-allowed; }
        .coupon-msg {
            font-size: 0.72rem; margin-top: 0.4rem;
            display: none; align-items: center; gap: 0.3rem;
        }
        .coupon-msg.success { display: flex; color: #22c55e; }
        .coupon-msg.error   { display: flex; color: #f87171; }
        .coupon-discount-row {
            display: none; justify-content: space-between; align-items: center;
            padding: 0.4rem 0; font-size: 0.82rem;
            border-top: 1px solid rgba(255,255,255,0.06); margin-top: 0.3rem;
        }
        .coupon-discount-row.show { display: flex; }
        .coupon-discount-label { color: #22c55e; display: flex; align-items: center; gap: 0.3rem; }
        .coupon-discount-val { color: #22c55e; font-weight: 700; }
        .btn-remove-coupon {
            background: none; border: none; color: rgba(255,255,255,0.3);
            cursor: pointer; font-size: 0.7rem; padding: 0;
            transition: color 0.2s; margin-left: 0.4rem;
        }
        .btn-remove-coupon:hover { color: #f87171; }

        /* ── Checkout Panel ── */
        .checkout-panel {
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
            animation: fadeUp 0.5s ease 0.12s both;
        }
        .total-row {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 1.5rem; padding-bottom: 1.25rem;
            border-bottom: 1px solid var(--glass-border);
        }
        .total-label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); }
        .total-value { font-size: 1.75rem; font-weight: 800; color: var(--yellow); }

        /* Express checkout box */
        .express-box {
            background: rgba(245,168,0,0.08);
            border: 1px solid rgba(245,168,0,0.25);
            border-radius: 14px;
            padding: 1.1rem 1.4rem;
            display: flex; align-items: center; justify-content: space-between;
            gap: 1rem; flex-wrap: wrap;
            margin-bottom: 1rem;
        }
        .express-left { display: flex; align-items: center; gap: 0.75rem; }
        .express-icon { font-size: 2rem; line-height: 1; }
        .express-title { font-size: 0.875rem; font-weight: 700; color: var(--text-white); margin-bottom: 0.1rem; }
        .express-sub   { font-size: 0.72rem; color: var(--text-dim); }

        .btn-express {
            display: inline-flex; align-items: center; gap: 0.4rem;
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 10px; padding: 0.65rem 1.5rem;
            font-family: 'Poppins', sans-serif; font-size: 0.82rem; font-weight: 700;
            letter-spacing: 0.05em; text-transform: uppercase;
            text-decoration: none; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
            box-shadow: 0 4px 16px rgba(245,168,0,0.25);
            white-space: nowrap;
        }
        .btn-express:hover { background: var(--yellow-d); color: #1a1000; text-decoration: none; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(245,168,0,0.4); }

        .btn-checkout {
            width: 100%; background: rgba(255,255,255,0.08);
            border: 1px solid var(--glass-border); border-radius: 12px;
            padding: 0.9rem; color: var(--text-light);
            font-family: 'Poppins', sans-serif; font-size: 0.875rem; font-weight: 600;
            letter-spacing: 0.05em; text-transform: uppercase;
            text-decoration: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            transition: all 0.25s;
        }
        .btn-checkout:hover { background: rgba(255,255,255,0.14); color: white; text-decoration: none; }

        /* Empty cart state */
        .empty-cart {
            text-align: center; padding: 4rem 2rem;
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            animation: fadeUp 0.5s ease both;
        }
        .empty-cart-icon { font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.4; }
        .empty-cart h3  { font-size: 1.1rem; font-weight: 700; color: var(--text-light); margin-bottom: 0.5rem; }
        .empty-cart p   { font-size: 0.82rem; color: var(--text-dim); margin-bottom: 1.5rem; }
        .btn-shop {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: var(--yellow); color: #1a1000;
            border: none; border-radius: 10px; padding: 0.7rem 1.75rem;
            font-family: 'Poppins', sans-serif; font-size: 0.85rem; font-weight: 700;
            letter-spacing: 0.05em; text-transform: uppercase;
            text-decoration: none; cursor: pointer;
            box-shadow: 0 4px 16px rgba(245,168,0,0.3);
            transition: all 0.3s;
        }
        .btn-shop:hover { background: var(--yellow-d); color: #1a1000; text-decoration: none; transform: translateY(-2px); }

        /* ── Back link ── */
        .back-wrap { display: flex; justify-content: center; }
        .back-link {
            display: inline-flex; align-items: center; gap: 0.4rem;
            color: var(--text-dim); text-decoration: none;
            font-size: 0.78rem; transition: color 0.2s;
        }
        .back-link:hover { color: var(--text-white); text-decoration: none; }

        /* ── Footer ── */
        footer {
            background: rgba(0,0,0,0.5); backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            flex-wrap: wrap; gap: 0.75rem;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-brand span { color: var(--yellow); }
        .footer-copy { font-size: 0.72rem; color: var(--text-dim); }

        /* ── Animations ── */
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

        .cart-card:nth-child(1)  { animation: fadeUp 0.4s ease 0.05s both; }
        .cart-card:nth-child(2)  { animation: fadeUp 0.4s ease 0.10s both; }
        .cart-card:nth-child(3)  { animation: fadeUp 0.4s ease 0.15s both; }
        .cart-card:nth-child(4)  { animation: fadeUp 0.4s ease 0.20s both; }
        .cart-card:nth-child(n+5){ animation: fadeUp 0.4s ease 0.25s both; }

        /* ── Responsive ── */
        @media(max-width: 700px) {
            nav { padding: 0.875rem 1.25rem; }
            .page { padding: 5.5rem 1rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .checkout-panel { padding: 1.5rem 1.25rem; }
            .express-box { flex-direction: column; text-align: center; }
            .express-left { justify-content: center; }
            .btn-express { width: 100%; justify-content: center; }
            footer { padding: 1.25rem; flex-direction: column; text-align: center; }
        }

        /* ── Full Nav Links ── */
        .nav-link-btn {
            display: flex; align-items: center; gap: 0.35rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.78rem; font-weight: 500;
            padding: 0.4rem 0.75rem; border-radius: 7px;
            border: 1px solid var(--glass-border);
            transition: all 0.2s; white-space: nowrap;
        }
        .nav-link-btn:hover { color: white; background: rgba(255,255,255,0.1); text-decoration: none; }
        .nav-link-active {
            background: rgba(245,168,0,0.15) !important;
            border-color: rgba(245,168,0,0.4) !important;
            color: var(--yellow) !important;
        }
        .nav-cart-badge {
            background: var(--yellow); color: #1a1000;
            font-size: 0.6rem; font-weight: 800;
            min-width: 16px; height: 16px; border-radius: 99px;
            display: inline-flex; align-items: center; justify-content: center;
            padding: 0 4px; margin-left: 1px;
        }

        /* ── Profile Dropdown ── */
        .nav-profile-menu { position: relative; }
        .nav-profile-btn {
            background: none; border: 1px solid var(--glass-border);
            color: var(--text-light); border-radius: 7px;
            width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 1rem; transition: all 0.2s;
        }
        .nav-profile-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        .nav-profile-dropdown {
            position: absolute; top: calc(100% + 8px); right: 0;
            background: rgba(10,13,32,0.97); backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border); border-radius: 14px;
            padding: 0.5rem; min-width: 180px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            display: none; z-index: 200;
        }
        .nav-profile-dropdown.open { display: block; animation: fadeUp 0.2s ease both; }
        .nav-profile-name {
            display: flex; align-items: center; gap: 0.5rem;
            font-size: 0.78rem; font-weight: 700; color: white;
            padding: 0.5rem 0.75rem 0.75rem;
            border-bottom: 1px solid var(--glass-border); margin-bottom: 0.3rem;
        }
        .nav-profile-item {
            display: flex; align-items: center; gap: 0.5rem;
            color: var(--text-light); text-decoration: none; font-size: 0.78rem;
            padding: 0.55rem 0.75rem; border-radius: 8px; transition: all 0.15s;
        }
        .nav-profile-item:hover { background: rgba(255,255,255,0.08); color: white; text-decoration: none; }
        .nav-profile-item i { width: 14px; opacity: 0.7; }
        .nav-profile-divider { border-top: 1px solid var(--glass-border); margin: 0.3rem 0; }
        .nav-profile-logout { color: #ff8060 !important; }
        .nav-profile-logout:hover { background: rgba(255,100,80,0.1) !important; }

        /* ── Responsive: hide text labels on small screens ── */
        @media(max-width: 800px) {
            .nav-link-btn span:not(.nav-cart-badge) { display: none; }
            .nav-link-btn { padding: 0.4rem 0.6rem; }
        }
        @media(max-width: 500px) {
            .nav-right { gap: 0.4rem; }
        }`;

/**
 * ViewCart Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {Object} props.customer - Information about the logged-in customer
 * @param {Array} props.items - List of items in the cart
 * @param {number} props.totalPrice - Total price of the cart items
 */
export default function ViewCart({
    successMessage = null,
    failureMessage = null,
    customer = null,
    items = [],
    totalPrice = 0
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [cartItems, setCartItems] = useState(items);
    const [cartTotal, setCartTotal] = useState(totalPrice);
    const [deliveryType, setDeliveryType] = useState('standard');
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponMessage, setCouponMessage] = useState(null);
    
    // Modal states
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingRemoveId, setPendingRemoveId] = useState(null);
    const [pendingRemoveName, setPendingRemoveName] = useState('');

    const [stdDateText, setStdDateText] = useState('');
    const [expDateText, setExpDateText] = useState('');
    const [gstAmount, setGstAmount] = useState(0);
    const [gstLabel, setGstLabel] = useState('GST (incl.)');

    const profileMenuRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        
        // Calculate delivery dates
        const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const fmtDate = d => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
        
        const addBusinessDays = (from, n) => {
            let d = new Date(from);
            let added = 0;
            while (added < n) {
                d.setDate(d.getDate() + 1);
                if (d.getDay() !== 0 && d.getDay() !== 6) added++;
            }
            return d;
        };

        const today = new Date();
        setStdDateText(`By ${fmtDate(addBusinessDays(today, 5))}`);
        
        const cutoff = new Date(today); 
        cutoff.setHours(14, 0, 0, 0);
        const expDays = today < cutoff ? 1 : 2;
        setExpDateText(`By ${fmtDate(addBusinessDays(today, expDays))}`);

        // Restore delivery type
        const savedDelType = sessionStorage.getItem('ekart_delivery_type');
        if (savedDelType) setDeliveryType(savedDelType);

        // Click outside profile menu
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess, showFailure]);

    // Recalculate GST whenever cart items change
    useEffect(() => {
        const GST_RATES = [
            {keys:['book','newspaper','grain','rice','pulse','salt','fresh','vegetable','fruit'], rate:0},
            {keys:['food','beverage','drink','juice','tea','coffee','grocery','dairy','milk','butter','cheese','paneer','egg','bread','bakery','snack','chip','biscuit','wafer','chocolate','sweet','ice cream','icecream','medicine','pharma','supplement','vitamin','ayurved','first aid','sanitizer','baby','infant','oil','spice','masala','staple','daily product'], rate:5},
            {keys:['sport','fitness','gym','outdoor','toy','game','board game','puzzle','footwear','shoe','sandal','slipper','boot','stationery','stationary','office','pen','notebook','kitchen','cookware','utensil','cloth','fashion','apparel','shirt','dress','wear','jeans','kurta','saree','bag','luggage','wallet','handbag','backpack','accessory','accessories','jewel','watch','ring','necklace','bracelet','decor','home good','household','cleaning','bedding','furniture'], rate:12},
            {keys:['electronic','mobile','phone','laptop','computer','tablet','camera','audio','headphone','speaker','tv','appliance','beauty','cosmetic','makeup','skincare','haircare','shampoo','cream','lotion','perfume','fragrance','soap','detergent','hygiene','personal care','pet','plant','garden','car','auto','tyre'], rate:18},
        ];
        const DEFAULT_RATE = 18;

        const getRateForCategory = (cat) => {
            if (!cat) return DEFAULT_RATE;
            const lower = cat.toLowerCase().trim();
            for (let i = 0; i < GST_RATES.length; i++) {
                const group = GST_RATES[i];
                for (let j = 0; j < group.keys.length; j++) {
                    if (lower.indexOf(group.keys[j]) !== -1) return group.rate;
                }
            }
            return DEFAULT_RATE;
        };

        const calcGstFromInclusive = (inclPrice, ratePercent) => {
            if (!ratePercent) return 0;
            const r = ratePercent / 100;
            return Math.round(inclPrice * r / (1 + r) * 100) / 100;
        };

        let totalGst = 0;
        const rateSet = new Set();

        cartItems.forEach(item => {
            const cat = item.category || '';
            const rate = getRateForCategory(cat);
            const lineTotal = (item.unitPrice > 0 ? item.unitPrice : (item.price / item.quantity)) * item.quantity;
            totalGst += calcGstFromInclusive(lineTotal, rate);
            if (rate > 0) rateSet.add(rate);
        });

        totalGst = Math.round(totalGst * 100) / 100;
        setGstAmount(totalGst);

        if (totalGst <= 0) {
            setGstLabel('GST (0%)');
        } else {
            const rates = Array.from(rateSet).sort((a,b) => a-b);
            if (rates.length === 0) {
                setGstLabel('GST (incl.)');
            } else if (rates.length === 1) {
                setGstLabel(`GST (${rates[0]}%, incl.)`);
            } else {
                setGstLabel(`GST (${rates[0]}–${rates[rates.length-1]}%, incl.)`);
            }
        }
    }, [cartItems]);

    // Helpers
    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const deliveryCost = cartTotal >= 500 ? 0 : 40;
    const expressCost = deliveryType === 'express' ? 129 : 0;
    const grandTotal = Math.max(cartTotal + deliveryCost + expressCost - couponDiscount, 0);

    // Handlers
    const handleSelectDelivery = (type) => {
        setDeliveryType(type);
        sessionStorage.setItem('ekart_delivery_type', type);
        sessionStorage.setItem('ekart_express_charge', type === 'express' ? '129' : '0');
    };

    const handleApplyCoupon = () => {
        if (!couponCode.trim()) {
            setCouponMessage({ type: 'error', text: 'Please enter a promo code' });
            return;
        }

        // Simulate API call
        authFetch(`/api/coupon/validate?code=${encodeURIComponent(couponCode)}&amount=${cartTotal}`)
            .then(r => r.json())
            .then(data => {
                if (!data.success) {
                    setCouponMessage({ type: 'error', text: `✗ ${data.message}` });
                    return;
                }
                setCouponDiscount(Math.round(data.discount));
                setCouponMessage({ type: 'success', text: `✓ ${data.message}` });
                sessionStorage.setItem('ekart_coupon_code', data.code);
                sessionStorage.setItem('ekart_coupon_discount', Math.round(data.discount));
            })
            .catch(() => {
                setCouponMessage({ type: 'error', text: '✗ Could not validate coupon. Try again.' });
            });
    };

    const handleRemoveCoupon = () => {
        setCouponCode('');
        setCouponDiscount(0);
        setCouponMessage(null);
        sessionStorage.removeItem('ekart_coupon_code');
        sessionStorage.removeItem('ekart_coupon_discount');
    };

    const handleIncreaseQty = (itemId) => {
        // Simulate API call
        fetch(`/ajax/cart/increase/${itemId}`, { method: 'POST' })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    // In a real app we'd update the specific item, but we'll just mock it
                    const newItems = cartItems.map(item => {
                        if (item.id === itemId) return { ...item, quantity: item.quantity + 1 };
                        return item;
                    });
                    setCartItems(newItems);
                    setCartTotal(data.cartTotal);
                }
            });
    };

    const handleDecreaseQty = (itemId) => {
        // Simulate API call
        fetch(`/ajax/cart/decrease/${itemId}`, { method: 'POST' })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    if (data.removed) {
                        setCartItems(cartItems.filter(item => item.id !== itemId));
                    } else {
                        const newItems = cartItems.map(item => {
                            if (item.id === itemId) return { ...item, quantity: item.quantity - 1 };
                            return item;
                        });
                        setCartItems(newItems);
                    }
                    setCartTotal(data.cartTotal);
                }
            });
    };

    const confirmRemove = (itemId, itemName) => {
        setPendingRemoveId(itemId);
        setPendingRemoveName(itemName);
        setIsConfirmModalOpen(true);
    };

    const doRemove = () => {
        if (!pendingRemoveId) return;
        setIsConfirmModalOpen(false);

        // Simulate API call
        fetch(`/ajax/cart/remove/${pendingRemoveId}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setCartItems(cartItems.filter(item => item.id !== pendingRemoveId));
                    setCartTotal(data.cartTotal);
                    if (data.cartEmpty) setCartTotal(0);
                }
                setPendingRemoveId(null);
            });
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - View Cart</title>
            <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3Cpath fill='%23f5a800' d='M528.12 301.319l47.273-208C578.806 78.301 567.391 64 551.99 64H159.208l-9.166-44.81C147.758 8.021 137.93 0 126.529 0H24C10.745 0 0 10.745 0 24v16c0 13.255 10.745 24 24 24h69.883l70.248 343.435C147.325 417.1 136 435.222 136 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-15.674-6.447-29.835-16.824-40h209.647C430.447 426.165 424 440.326 424 456c0 30.928 25.072 56 56 56s56-25.072 56-56c0-22.172-12.888-41.332-31.579-50.405l5.517-24.276c3.413-15.018-8.002-29.319-23.403-29.319H218.117l-6.545-32h293.145c11.206 0 20.92-7.754 23.403-18.681z'/%3E%3C/svg%3E" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* Alert Stack */}
            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={{ transition: 'opacity 0.5s', opacity: 1 }}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={{ transition: 'opacity 0.5s', opacity: 1 }}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            {/* Navbar */}
            <nav id="nav" className={isScrolled ? 'scrolled' : ''}>
                <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }}></i>
                    Ek<span>art</span>
                </a>

                <div className="nav-right">
                    <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-link-btn" title="Shop">
                        <i className="fas fa-th-large"></i> <span>Shop</span>
                    </a>
                    <Link to="/track" className="nav-link-btn" title="Track Orders">
                        <i className="fas fa-truck"></i> <span>Track</span>
                    </Link>
                    <Link to="/view-orders" className="nav-link-btn" title="My Orders">
                        <i className="fas fa-box-open"></i> <span>Orders</span>
                    </Link>
                    <Link to="/wishlist" className="nav-link-btn" title="Wishlist">
                        <i className="fas fa-heart"></i> <span>Wishlist</span>
                    </Link>
                    <Link to="/spending" className="nav-link-btn" title="Spending">
                        <i className="fas fa-chart-pie"></i> <span>Spending</span>
                    </Link>
                    <Link to="/cart" className="nav-link-btn nav-link-active" title="Cart">
                        <i className="fas fa-shopping-cart"></i> <span>Cart</span>
                        {cartItems.length > 0 && <span className="nav-cart-badge">{cartItems.length}</span>}
                    </Link>

                    {/* Profile dropdown */}
                    <div className="nav-profile-menu" id="navProfileMenu" ref={profileMenuRef}>
                        <button className="nav-profile-btn" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} title="Account">
                            <i className="fas fa-user-circle"></i>
                        </button>
                        <div className={`nav-profile-dropdown ${isProfileDropdownOpen ? 'open' : ''}`} id="navProfileDropdown">
                            <div className="nav-profile-name">
                                <i className="fas fa-user"></i>
                                <span>{customer ? customer.name : 'Account'}</span>
                            </div>
                            <Link to="/profile" className="nav-profile-item">
                                <i className="fas fa-id-card"></i> My Profile
                            </Link>
                            <Link to="/address" className="nav-profile-item">
                                <i className="fas fa-map-marker-alt"></i> Addresses
                            </Link>
                            <Link to="/customer/security" className="nav-profile-item">
                                <i className="fas fa-shield-alt"></i> Security
                            </Link>
                            <div className="nav-profile-divider"></div>
                            <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="nav-profile-item nav-profile-logout">
                                <i className="fas fa-sign-out-alt"></i> Logout
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="page">
                <div className="inner">

                    {/* Page Header */}
                    <div className="page-header">
                        <div className="page-header-left">
                            <h1>Your <span>Cart</span> 🛒</h1>
                            <p>Review your items, adjust quantities and proceed to checkout.</p>
                        </div>
                        <div className="page-header-icon">🛍️</div>
                    </div>

                    {/* ── Free Delivery Progress Banner ── */}
                    {cartItems.length > 0 && (
                        <div className="delivery-banner">
                            {cartTotal < 500 ? (
                                <div>
                                    <div className="milestone-text">
                                        🚚 Spend <strong>₹{formatPrice(500 - cartTotal)}</strong> more to unlock <strong>FREE Delivery!</strong>
                                    </div>
                                    <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${(cartTotal / 500) * 100}%` }}></div>
                                    </div>
                                    <div className="progress-meta">
                                        ₹{formatPrice(cartTotal)} / ₹500
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="unlocked-text">
                                        🎉 You've unlocked <strong>FREE Delivery!</strong>
                                    </div>
                                    <div className="progress-track">
                                        <div className="progress-fill full" style={{ width: '100%' }}></div>
                                    </div>
                                    <div className="progress-meta" style={{ color: '#22c55e' }}>FREE DELIVERY UNLOCKED ✓</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Cart Items Grid ── */}
                    {cartItems.length > 0 && (
                        <div className="cart-grid">
                            {cartItems.map((p) => {
                                const unitPrice = p.unitPrice > 0 ? p.unitPrice : (p.price / p.quantity);
                                const itemLineTotal = p.unitPrice > 0 ? p.unitPrice * p.quantity : p.price;
                                
                                return (
                                    <div className="cart-card" key={p.id}>
                                        <div className="cart-img-wrap">
                                            <img src={p.imageLink} alt="Product" />
                                            <div className="cart-img-overlay"></div>
                                            <span className="cart-category-badge">{p.category}</span>
                                        </div>

                                        <div className="cart-body">
                                            <div className="cart-name">{p.name}</div>
                                            <div className="cart-desc">{p.description}</div>
                                            <div className="cart-price">₹{formatPrice(unitPrice)}</div>
                                            {p.quantity > 1 && (
                                                <div className="cart-line-total">
                                                    <span>{p.quantity}</span> × ₹{formatPrice(unitPrice)} = <strong>₹{formatPrice(itemLineTotal)}</strong>
                                                </div>
                                            )}
                                        </div>

                                        <div className="cart-actions" data-item-id={p.id}>
                                            <div className="qty-control">
                                                <button className="qty-btn" type="button" onClick={() => handleDecreaseQty(p.id)} title="Decrease">−</button>
                                                <span className="qty-val">{p.quantity}</span>
                                                <button className="qty-btn" type="button" onClick={() => handleIncreaseQty(p.id)} title="Increase">+</button>
                                            </div>
                                            <button className="btn-remove" type="button" onClick={() => confirmRemove(p.id, p.name)}>
                                                <i className="fas fa-trash-alt"></i> Remove
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Checkout Panel ── */}
                    {cartItems.length > 0 && (
                        <div className="checkout-panel">
                            <div className="section-label"><i className="fas fa-receipt"></i> Order Summary</div>

                            <div className="total-row">
                                <div className="total-label">Cart Subtotal</div>
                                <div className="total-value" id="cart-subtotal">₹{formatPrice(cartTotal)}</div>
                            </div>
                            <div className="total-row" id="delivery-charge-row" style={{ fontSize: '0.82rem' }}>
                                <div className="total-label">Delivery</div>
                                <div className="total-value" id="cart-delivery-val" style={{ color: (deliveryCost + expressCost) === 0 ? '#22c55e' : '#f5a800' }}>
                                    {(deliveryCost + expressCost) === 0 ? 'FREE' : `₹${deliveryCost + expressCost} ${deliveryType === 'express' ? '(Express)' : ''}`}
                                </div>
                            </div>
                            <div className="total-row" id="gst-row" style={{ fontSize: '0.78rem' }}>
                                <div className="total-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <i className="fas fa-file-invoice" style={{ color: 'var(--yellow)', fontSize: '0.65rem' }}></i>
                                    <span id="gst-label-text">{gstLabel}</span>
                                </div>
                                <div className="total-value" id="cart-gst-val" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
                                    {gstAmount > 0 ? `₹${formatPrice(gstAmount)}` : '₹0.00'}
                                </div>
                            </div>
                            <div className="total-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                                <div className="total-label" style={{ fontWeight: 700, color: 'white' }}>Grand Total</div>
                                <div className="total-value" id="cart-grand-total" style={{ color: 'var(--yellow)', fontSize: '1.1rem' }}>
                                    ₹{formatPrice(grandTotal)}
                                </div>
                            </div>

                            {/* ── Coupon / Promo Code ── */}
                            <div className="coupon-box">
                                <div className="coupon-label">
                                    <i className="fas fa-tag"></i> Promo Code
                                    <Link to="/coupons" target="_blank" style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--yellow)', textDecoration: 'none', fontWeight: 600, opacity: 0.8 }}>
                                        View all coupons <i className="fas fa-external-link-alt" style={{ fontSize: '0.55rem' }}></i>
                                    </Link>
                                </div>
                                <div className="coupon-row">
                                    <input type="text" className="coupon-input" id="couponInput"
                                           placeholder="Enter promo code" maxLength="20"
                                           value={couponCode}
                                           onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                           onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                                           disabled={couponDiscount > 0} />
                                    <button className="btn-apply-coupon" onClick={handleApplyCoupon} disabled={couponDiscount > 0}>
                                        Apply
                                    </button>
                                </div>
                                {couponMessage && (
                                    <div className={`coupon-msg ${couponMessage.type}`} style={{ display: 'flex' }}>
                                        {couponMessage.text}
                                    </div>
                                )}
                                {couponDiscount > 0 && (
                                    <div className="coupon-discount-row show">
                                        <span className="coupon-discount-label">
                                            <i className="fas fa-check-circle"></i>
                                            Promo <strong>{sessionStorage.getItem('ekart_coupon_code')}</strong> applied
                                        </span>
                                        <span>
                                            <span className="coupon-discount-val">-₹{couponDiscount}</span>
                                            <button className="btn-remove-coupon" onClick={handleRemoveCoupon} title="Remove coupon">✕</button>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* ── Delivery Type Selector ── */}
                            <div style={{ marginBottom: '0.875rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                                    Delivery Type
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <div onClick={() => handleSelectDelivery('standard')}
                                         style={{ flex: 1, border: `2px solid ${deliveryType === 'standard' ? 'var(--yellow)' : 'var(--glass-border)'}`, borderRadius: '10px', padding: '0.6rem 0.8rem', cursor: 'pointer', background: deliveryType === 'standard' ? 'rgba(245,168,0,0.08)' : 'transparent', transition: 'all 0.2s' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: deliveryType === 'standard' ? 'var(--yellow)' : '#22c55e' }}>📦 Standard</div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.15rem' }}>{stdDateText}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 600 }}>FREE</div>
                                    </div>
                                    <div onClick={() => handleSelectDelivery('express')}
                                         style={{ flex: 1, border: `2px solid ${deliveryType === 'express' ? '#22c55e' : 'var(--glass-border)'}`, borderRadius: '10px', padding: '0.6rem 0.8rem', cursor: 'pointer', background: deliveryType === 'express' ? 'rgba(34,197,94,0.08)' : 'transparent', transition: 'all 0.2s' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: deliveryType === 'express' ? '#22c55e' : 'var(--yellow)' }}>⚡ Express</div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.15rem' }}>{expDateText}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#f5a800', fontWeight: 600 }}>+₹129</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>
                                    ⚠️ One delivery type applies to all items in your cart
                                </div>
                            </div>

                            {/* Express Checkout */}
                            <div className="express-box">
                                <div className="express-left">
                                    <div className="express-icon">⚡</div>
                                    <div>
                                        <div className="express-title">Express Checkout</div>
                                        <div className="express-sub">Skip the steps — pay instantly with your saved address</div>
                                    </div>
                                </div>
                                <Link to="/payment" className="btn-express">
                                    <i className="fas fa-bolt"></i> Buy Now
                                </Link>
                            </div>

                            {/* Normal Checkout */}
                            <Link to="/address" className="btn-checkout">
                                Proceed to Checkout <i className="fas fa-arrow-right"></i>
                            </Link>
                        </div>
                    )}

                    {/* ── Empty State ── */}
                    {cartItems.length === 0 && (
                        <div className="empty-cart">
                            <div className="empty-cart-icon">🛒</div>
                            <h3>Your Cart is Empty</h3>
                            <p>Looks like you haven't added anything yet. Start shopping!</p>
                            <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="btn-shop"><i className="fas fa-store"></i> Browse Products</a>
                        </div>
                    )}

                    {/* Back */}
                    <div className="back-wrap">
                        <a href="#" onClick={(e)=>{e.preventDefault();if(typeof handleLogout==="function")handleLogout();}} className="back-link">
                            <i className="fas fa-arrow-left"></i> Back to Shop
                        </a>
                    </div>

                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
            </footer>

            {/* Confirm Remove Modal */}
            <div id="confirmModal" className={`confirm-overlay ${isConfirmModalOpen ? 'active' : ''}`} onClick={() => setIsConfirmModalOpen(false)}>
                <div className="confirm-box" onClick={e => e.stopPropagation()}>
                    <div className="confirm-icon">🗑️</div>
                    <h3 className="confirm-title">Remove Item?</h3>
                    <p className="confirm-msg">Are you sure you want to remove "{pendingRemoveName}" from your cart?</p>
                    <div className="confirm-actions">
                        <button className="confirm-btn-cancel" onClick={() => setIsConfirmModalOpen(false)}>
                            <i className="fas fa-times"></i> Keep It
                        </button>
                        <button className="confirm-btn-ok" type="button" onClick={doRemove}>
                            <i className="fas fa-trash-alt"></i> Yes, Remove
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}