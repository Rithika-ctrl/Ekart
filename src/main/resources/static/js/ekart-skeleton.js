/**
 * ekart-skeleton.js  —  Shimmer skeleton placeholders for Ekart
 * ─────────────────────────────────────────────────────────────
 * ARCHITECTURE (Thymeleaf / SSR):
 *   Ekart pages are fully server-side rendered — real cards are already
 *   in the DOM when the browser parses the HTML.  MutationObserver
 *   (waiting for added nodes) doesn't work here.
 *
 *   Correct SSR skeleton pattern used here:
 *     1. On DOMContentLoaded, detect which grid containers exist.
 *     2. Place an absolutely-positioned skeleton OVERLAY on top of the
 *        real content, matching the same grid layout.
 *     3. After 450 ms fade the overlay out, revealing the real cards
 *        with their existing stagger CSS animations underneath.
 *
 *   This gives instant shimmer feedback while the real content renders,
 *   with zero flicker and no content-hiding side effects.
 *
 * Pages covered:
 *   customer-home.html      → #productRow         (product cards)
 *   customer-view-products  → .product-grid        (product cards)
 *   vendor-home.html        → .dashboard-grid      (dash cards)
 *   admin-home.html         → .dash-grid           (dash cards)
 *   vendor-view-products    → .products-grid       (product cards)
 *   view-cart.html          → .cart-grid           (cart cards)
 *
 * Usage: <script src="/js/ekart-skeleton.js"></script>
 */
(function () {
  'use strict';

  /* ── CSS ─────────────────────────────────────────── */
  var CSS = [
    /* shimmer block */
    '.sk{background:rgba(255,255,255,0.07);border-radius:6px;position:relative;overflow:hidden;}',
    '.sk::after{content:"";position:absolute;inset:0;',
    'background:linear-gradient(105deg,transparent 0%,transparent 28%,rgba(245,168,0,0.10) 46%,rgba(255,255,255,0.07) 52%,transparent 68%,transparent 100%);',
    'background-size:280% 100%;animation:sk-sweep 1.7s ease-in-out infinite;}',
    '@keyframes sk-sweep{0%{background-position:220% center}100%{background-position:-60% center}}',

    /* stagger shimmer across cards */
    '.sk-card:nth-child(1) .sk::after{animation-delay:0s}',
    '.sk-card:nth-child(2) .sk::after{animation-delay:.11s}',
    '.sk-card:nth-child(3) .sk::after{animation-delay:.22s}',
    '.sk-card:nth-child(4) .sk::after{animation-delay:.33s}',
    '.sk-card:nth-child(5) .sk::after{animation-delay:.44s}',
    '.sk-card:nth-child(6) .sk::after{animation-delay:.55s}',
    '.sk-card:nth-child(n+7) .sk::after{animation-delay:.66s}',

    /* fade-in skeleton cards */
    '.sk-card{animation:sk-in .3s ease both;}',
    '@keyframes sk-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
    '.sk-card:nth-child(1){animation-delay:.00s}',
    '.sk-card:nth-child(2){animation-delay:.04s}',
    '.sk-card:nth-child(3){animation-delay:.08s}',
    '.sk-card:nth-child(4){animation-delay:.12s}',
    '.sk-card:nth-child(5){animation-delay:.16s}',
    '.sk-card:nth-child(n+6){animation-delay:.20s}',

    /* ── PRODUCT card ── */
    '.sk-product-card{background:rgba(255,255,255,0.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.09);border-radius:22px;overflow:hidden;display:flex;flex-direction:column;}',
    '.sk-product-img{width:100%;height:220px;}',
    '.sk-product-body{padding:1.1rem 1.3rem;display:flex;flex-direction:column;gap:.6rem;flex:1;}',
    '.sk-product-badge{height:17px;width:58px;border-radius:20px;}',
    '.sk-product-title{height:15px;width:78%;}',
    '.sk-product-desc1{height:11px;width:93%;}',
    '.sk-product-desc2{height:11px;width:62%;}',
    '.sk-product-price{height:21px;width:42%;margin-top:.2rem;border-radius:8px;}',
    '.sk-product-footer{padding:0 1.3rem 1.2rem;display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:auto;}',
    '.sk-product-btn1{height:36px;flex:1;border-radius:10px;}',
    '.sk-product-btn2{height:36px;width:36px;flex-shrink:0;border-radius:10px;}',

    /* ── DASH card ── */
    '.sk-dash-card{background:rgba(255,255,255,0.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.09);border-radius:18px;padding:1.4rem 1.65rem;display:flex;align-items:center;gap:1.1rem;min-height:88px;}',
    '.sk-dash-icon{width:44px;height:44px;border-radius:12px;flex-shrink:0;}',
    '.sk-dash-text{flex:1;display:flex;flex-direction:column;gap:.5rem;}',
    '.sk-dash-title{height:14px;width:52%;}',
    '.sk-dash-desc{height:11px;width:78%;}',
    '.sk-dash-desc2{height:11px;width:48%;}',
    '.sk-dash-arrow{width:20px;height:20px;border-radius:50%;flex-shrink:0;opacity:.4;}',

    /* ── CART card ── */
    '.sk-cart-card{background:rgba(255,255,255,0.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.09);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;}',
    '.sk-cart-img{width:100%;height:180px;}',
    '.sk-cart-body{padding:1.2rem 1.4rem;display:flex;flex-direction:column;gap:.55rem;flex:1;}',
    '.sk-cart-badge{height:15px;width:52px;border-radius:20px;}',
    '.sk-cart-name{height:14px;width:72%;}',
    '.sk-cart-desc1{height:11px;width:88%;}',
    '.sk-cart-desc2{height:11px;width:52%;}',
    '.sk-cart-price{height:19px;width:38%;margin-top:.2rem;border-radius:8px;}',
    '.sk-cart-actions{padding:0 1.4rem 1.4rem;display:flex;align-items:center;justify-content:space-between;gap:.75rem;}',
    '.sk-cart-qty{height:34px;width:108px;border-radius:10px;}',
    '.sk-cart-remove{height:34px;width:88px;border-radius:10px;}',

    /* ── STAT card ── */
    '.sk-stat-card{background:rgba(255,255,255,0.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:.6rem;min-height:98px;}',
    '.sk-stat-label{height:11px;width:48%;border-radius:4px;}',
    '.sk-stat-number{height:30px;width:62%;border-radius:8px;margin-top:.1rem;}',
    '.sk-stat-sub{height:10px;width:38%;border-radius:4px;}',
  ].join('');

  /* ── HTML builders ───────────────────────────────── */
  function productCard() {
    return '<div class="sk-card sk-product-card">'
      + '<div class="sk sk-product-img"></div>'
      + '<div class="sk-product-body">'
      +   '<div class="sk sk-product-badge"></div>'
      +   '<div class="sk sk-product-title"></div>'
      +   '<div class="sk sk-product-desc1"></div>'
      +   '<div class="sk sk-product-desc2"></div>'
      +   '<div class="sk sk-product-price"></div>'
      + '</div>'
      + '<div class="sk-product-footer">'
      +   '<div class="sk sk-product-btn1"></div>'
      +   '<div class="sk sk-product-btn2"></div>'
      + '</div></div>';
  }

  function dashCard() {
    return '<div class="sk-card sk-dash-card">'
      + '<div class="sk sk-dash-icon"></div>'
      + '<div class="sk-dash-text">'
      +   '<div class="sk sk-dash-title"></div>'
      +   '<div class="sk sk-dash-desc"></div>'
      +   '<div class="sk sk-dash-desc2"></div>'
      + '</div>'
      + '<div class="sk sk-dash-arrow"></div></div>';
  }

  function cartCard() {
    return '<div class="sk-card sk-cart-card">'
      + '<div class="sk sk-cart-img"></div>'
      + '<div class="sk-cart-body">'
      +   '<div class="sk sk-cart-badge"></div>'
      +   '<div class="sk sk-cart-name"></div>'
      +   '<div class="sk sk-cart-desc1"></div>'
      +   '<div class="sk sk-cart-desc2"></div>'
      +   '<div class="sk sk-cart-price"></div>'
      + '</div>'
      + '<div class="sk-cart-actions">'
      +   '<div class="sk sk-cart-qty"></div>'
      +   '<div class="sk sk-cart-remove"></div>'
      + '</div></div>';
  }

  function statCard() {
    return '<div class="sk-card sk-stat-card">'
      + '<div class="sk sk-stat-label"></div>'
      + '<div class="sk sk-stat-number"></div>'
      + '<div class="sk sk-stat-sub"></div></div>';
  }

  /* ── Page config: selector → builder + count ─────── */
  var CONFIGS = [
    { sel: '#productRow',      builder: productCard, count: 8 },
    { sel: '.product-grid',    builder: productCard, count: 8 },
    { sel: '.products-grid',   builder: productCard, count: 6 },
    { sel: '.cart-grid',       builder: cartCard,    count: 4 },
    { sel: '.dashboard-grid',  builder: dashCard,    count: 6 },
    { sel: '.dash-grid',       builder: dashCard,    count: 8 },
    { sel: '.stat-row',        builder: statCard,    count: 6 },
    { sel: '.stats-grid',      builder: statCard,    count: 6 },
    { sel: '.analytics-stats', builder: statCard,    count: 6 },
  ];

  /* ── Core: overlay-based SSR skeleton ───────────────
   *
   *  Real cards are ALREADY in the DOM (Thymeleaf SSR).
   *  We DO NOT hide them. Instead we place an absolutely-
   *  positioned overlay div ON TOP with matching grid layout.
   *  After REVEAL_DELAY ms we fade the overlay out, the real
   *  cards' existing CSS stagger animations play underneath.
   *
   *  Result: shimmer while page "feels" like it's loading,
   *  then a clean reveal — with zero content-hiding risk.
   * ──────────────────────────────────────────────────── */
  var REVEAL_DELAY = 450; // ms before overlay fades out

  function initOverlays() {
    CONFIGS.forEach(function (cfg) {
      var containers = document.querySelectorAll(cfg.sel);
      containers.forEach(function (container) {
        if (!container || container.children.length === 0) return;
        if (container.dataset.skDone) return;
        container.dataset.skDone = '1';

        /* Ensure container can hold absolute child */
        var pos = window.getComputedStyle(container).position;
        if (pos === 'static') container.style.position = 'relative';

        /* Build overlay matching container's grid */
        var cs  = window.getComputedStyle(container);
        var overlay = document.createElement('div');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = [
          'position:absolute',
          'inset:0',
          'z-index:20',
          'display:grid',
          'grid-template-columns:' + cs.gridTemplateColumns,
          'gap:' + cs.gap,
          'pointer-events:none',
          'border-radius:inherit',
        ].join(';');

        /* Clamp card count to actual real cards */
        var n = Math.min(container.children.length, cfg.count);
        var html = '';
        for (var i = 0; i < n; i++) html += cfg.builder();
        overlay.innerHTML = html;
        container.appendChild(overlay);

        /* Fade out after delay, then remove */
        setTimeout(function () {
          overlay.style.transition = 'opacity 0.4s ease';
          overlay.style.opacity    = '0';
          setTimeout(function () {
            if (overlay.parentNode) overlay.remove();
            /* Clean up position override if we set it */
            if (pos === 'static') container.style.position = '';
          }, 420);
        }, REVEAL_DELAY);
      });
    });
  }

  /* ── Bootstrap ───────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('ekart-skeleton-css')) return;
    var s = document.createElement('style');
    s.id = 'ekart-skeleton-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function run() {
    injectCSS();
    initOverlays();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  /* ── Public API ──────────────────────────────────── */
  window.EkartSkeleton = {
    productCard:  productCard,
    dashCard:     dashCard,
    cartCard:     cartCard,
    statCard:     statCard,
    REVEAL_DELAY: REVEAL_DELAY
  };

})();