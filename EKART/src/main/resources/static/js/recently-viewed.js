/**
 * Recently Viewed Products Tracking Utility
 * 
 * Tracks product views in localStorage and provides a horizontal scrolling
 * component to display recently viewed products.
 * 
 * Usage:
 *   RecentlyViewed.trackProduct(productId);
 *   RecentlyViewed.getProductIds();
 *   RecentlyViewed.render('#containerId');
 *   RecentlyViewed.syncToServer(); // For logged-in users
 */

window.RecentlyViewed = (function() {
    'use strict';

    const STORAGE_KEY = 'ekart_recently_viewed';
    const MAX_ITEMS = 10;
    const API_ENDPOINT = '/api/recently-viewed';

    // ─────────────────────────────────────────────────────────────────────────
    // CORE TRACKING FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get the list of recently viewed product IDs from localStorage
     * @returns {number[]} Array of product IDs (newest first)
     */
    function getProductIds() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('[RecentlyViewed] Failed to read localStorage:', e);
            return [];
        }
    }

    /**
     * Save product IDs to localStorage
     * @param {number[]} ids Array of product IDs
     */
    function saveProductIds(ids) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        } catch (e) {
            // localStorage full or disabled
        }
    }

    /**
     * Track a product view (call this on product detail page)
     * @param {number} productId The product ID being viewed
     */
    function trackProduct(productId) {
        if (!productId || isNaN(productId)) return;
        
        productId = parseInt(productId, 10);
        let ids = getProductIds();

        // Remove if already exists (to move to front)
        ids = ids.filter(id => id !== productId);

        // Add to front (unshift)
        ids.unshift(productId);

        // Keep only MAX_ITEMS
        if (ids.length > MAX_ITEMS) {
            ids = ids.slice(0, MAX_ITEMS);
        }

        saveProductIds(ids);
        console.log('[RecentlyViewed] Tracked product:', productId, 'Total:', ids.length);
    }

    /**
     * Clear all recently viewed products
     */
    function clearAll() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI RENDERING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render the recently viewed products bar
     * @param {string} containerId CSS selector for the container
     * @param {object} options Render options: { excludeProductId, showHeading }
     */
    async function render(containerId, options = {}) {
        const container = document.querySelector(containerId);
        if (!container) {

            return;
        }

        let ids = getProductIds();

        // Exclude current product if on product detail page
        if (options.excludeProductId) {
            ids = ids.filter(id => id !== parseInt(options.excludeProductId, 10));
        }

        // Hide if empty
        if (ids.length === 0) {
            container.style.display = 'none';
            return;
        }

        // Show loading skeleton
        container.innerHTML = getLoadingHTML(options.showHeading !== false);
        container.style.display = '';

        try {
            // Fetch product data from server
            const response = await fetch(`${API_ENDPOINT}/products?ids=${ids.join(',')}`);
            if (!response.ok) throw new Error('Failed to fetch products');
            
            const products = await response.json();

            if (!products || products.length === 0) {
                container.style.display = 'none';
                return;
            }

            // Sort products to match IDs order
            const productMap = new Map(products.map(p => [p.id, p]));
            const sortedProducts = ids
                .map(id => productMap.get(id))
                .filter(p => p != null);

            container.innerHTML = getProductsHTML(sortedProducts, options.showHeading !== false);
            initScrollBehavior(container);

        } catch (error) {
            console.error('[RecentlyViewed] Failed to load products:', error);
            container.style.display = 'none';
        }
    }

    /**
     * Generate loading skeleton HTML
     */
    function getLoadingHTML(showHeading) {
        return `
            ${showHeading ? '<h3 class="rv-section-title"><i class="fas fa-history"></i> Recently Viewed</h3>' : ''}
            <div class="rv-scroll-container">
                <div class="rv-products">
                    ${Array(4).fill(`
                        <div class="rv-card skeleton">
                            <div class="rv-img skeleton-img"></div>
                            <div class="rv-info">
                                <div class="skeleton-text" style="width:80%;height:14px;margin-bottom:6px;"></div>
                                <div class="skeleton-text" style="width:50%;height:12px;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Generate products HTML
     */
    function getProductsHTML(products, showHeading) {
        return `
            ${showHeading ? '<h3 class="rv-section-title"><i class="fas fa-history"></i> Recently Viewed</h3>' : ''}
            <div class="rv-scroll-container">
                <button class="rv-nav rv-prev" onclick="RecentlyViewed.scrollLeft(this)" aria-label="Scroll left">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="rv-products">
                    ${products.map(p => `
                        <a href="/product/${p.id}" class="rv-card" data-product-id="${p.id}">
                            <div class="rv-img-wrap">
                                <img src="${p.imageLink || 'https://via.placeholder.com/200x200?text=No+Image'}" 
                                     alt="${escapeHtml(p.name)}"
                                     loading="lazy"
                                     onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">
                                ${p.stock <= 0 ? '<span class="rv-badge oos">Out of Stock</span>' : ''}
                            </div>
                            <div class="rv-info">
                                <span class="rv-name">${escapeHtml(truncate(p.name, 30))}</span>
                                <span class="rv-price">₹${numberFormat(p.price)}</span>
                            </div>
                        </a>
                    `).join('')}
                </div>
                <button class="rv-nav rv-next" onclick="RecentlyViewed.scrollRight(this)" aria-label="Scroll right">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    /**
     * Initialize horizontal scroll behavior
     */
    function initScrollBehavior(container) {
        const scrollContainer = container.querySelector('.rv-products');
        const prevBtn = container.querySelector('.rv-prev');
        const nextBtn = container.querySelector('.rv-next');

        if (!scrollContainer) return;

        function updateNavVisibility() {
            if (prevBtn) {
                prevBtn.style.opacity = scrollContainer.scrollLeft > 0 ? '1' : '0.3';
            }
            if (nextBtn) {
                const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
                nextBtn.style.opacity = scrollContainer.scrollLeft < maxScroll - 5 ? '1' : '0.3';
            }
        }

        scrollContainer.addEventListener('scroll', updateNavVisibility);
        updateNavVisibility();
    }

    function scrollLeft(btn) {
        const container = btn.parentElement.querySelector('.rv-products');
        if (container) {
            container.scrollBy({ left: -200, behavior: 'smooth' });
        }
    }

    function scrollRight(btn) {
        const container = btn.parentElement.querySelector('.rv-products');
        if (container) {
            container.scrollBy({ left: 200, behavior: 'smooth' });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SERVER SYNC (FOR LOGGED-IN USERS)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sync recently viewed products to server (for logged-in users)
     */
    async function syncToServer() {
        const ids = getProductIds();
        if (ids.length === 0) return;

        try {
            await fetch(`${API_ENDPOINT}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: ids })
            });
        } catch (e) {
            // Sync failed silently
        }
    }

    /**
     * Load recently viewed products from server (for logged-in users)
     */
    async function loadFromServer() {
        try {
            const response = await fetch(`${API_ENDPOINT}/sync`);
            if (response.ok) {
                const data = await response.json();
                if (data.productIds && data.productIds.length > 0) {
                    // Merge with local (local takes precedence for newest)
                    const localIds = getProductIds();
                    const merged = [...new Set([...localIds, ...data.productIds])].slice(0, MAX_ITEMS);
                    saveProductIds(merged);
                    console.log('[RecentlyViewed] Loaded from server, merged:', merged.length);
                }
            }
        } catch (e) {
            console.error('[RecentlyViewed] Load from server failed:', e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function truncate(str, len) {
        return str && str.length > len ? str.substring(0, len) + '…' : str;
    }

    function numberFormat(num) {
        return num ? num.toLocaleString('en-IN') : '0';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTO-INJECT CSS
    // ─────────────────────────────────────────────────────────────────────────

    function injectStyles() {
        if (document.getElementById('rv-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'rv-styles';
        styles.textContent = `
            /* Recently Viewed Section */
            .rv-section {
                margin-top: 3rem;
                padding: 0 0.5rem;
            }

            .rv-section-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: rgba(255,255,255,0.9);
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.6rem;
            }

            .rv-section-title i {
                color: #f5a800;
                font-size: 0.95rem;
            }

            .rv-scroll-container {
                position: relative;
                display: flex;
                align-items: center;
            }

            .rv-products {
                display: flex;
                gap: 1rem;
                overflow-x: auto;
                scroll-behavior: smooth;
                padding: 0.5rem 0.25rem;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }

            .rv-products::-webkit-scrollbar {
                display: none;
            }

            .rv-nav {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255,255,255,0.15);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                transition: all 0.2s;
            }

            .rv-nav:hover {
                background: rgba(245,168,0,0.8);
                border-color: #f5a800;
            }

            .rv-prev { left: -10px; }
            .rv-next { right: -10px; }

            @media (max-width: 768px) {
                .rv-nav { display: none; }
            }

            /* Product Card */
            .rv-card {
                flex: 0 0 auto;
                width: 160px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                overflow: hidden;
                text-decoration: none;
                color: inherit;
                transition: all 0.25s ease;
                display: flex;
                flex-direction: column;
            }

            .rv-card:hover {
                transform: translateY(-4px);
                border-color: rgba(245,168,0,0.4);
                box-shadow: 0 8px 24px rgba(0,0,0,0.25);
                background: rgba(255,255,255,0.1);
            }

            .rv-img-wrap {
                position: relative;
                width: 100%;
                height: 130px;
                overflow: hidden;
                background: rgba(0,0,0,0.3);
            }

            .rv-img-wrap img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s;
            }

            .rv-card:hover .rv-img-wrap img {
                transform: scale(1.05);
            }

            .rv-badge {
                position: absolute;
                top: 8px;
                right: 8px;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 0.65rem;
                font-weight: 600;
                text-transform: uppercase;
            }

            .rv-badge.oos {
                background: rgba(239,68,68,0.9);
                color: white;
            }

            .rv-info {
                padding: 10px 12px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .rv-name {
                font-size: 0.8rem;
                font-weight: 500;
                color: rgba(255,255,255,0.9);
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .rv-price {
                font-size: 0.85rem;
                font-weight: 700;
                color: #f5a800;
            }

            /* Skeleton Loading */
            .rv-card.skeleton {
                pointer-events: none;
            }

            .rv-card.skeleton .rv-img,
            .rv-card.skeleton .skeleton-img {
                width: 100%;
                height: 130px;
                background: linear-gradient(90deg, 
                    rgba(255,255,255,0.05) 0%, 
                    rgba(255,255,255,0.12) 50%, 
                    rgba(255,255,255,0.05) 100%);
                background-size: 200% 100%;
                animation: rvShimmer 1.5s infinite;
            }

            .rv-card.skeleton .skeleton-text {
                background: linear-gradient(90deg, 
                    rgba(255,255,255,0.05) 0%, 
                    rgba(255,255,255,0.12) 50%, 
                    rgba(255,255,255,0.05) 100%);
                background-size: 200% 100%;
                animation: rvShimmer 1.5s infinite;
                border-radius: 4px;
            }

            @keyframes rvShimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            /* Responsive */
            @media (max-width: 600px) {
                .rv-card {
                    width: 140px;
                }
                .rv-img-wrap {
                    height: 110px;
                }
                .rv-info {
                    padding: 8px 10px;
                }
                .rv-name {
                    font-size: 0.75rem;
                }
                .rv-price {
                    font-size: 0.8rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    // Auto-inject styles when loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStyles);
    } else {
        injectStyles();
    }

    console.log('[RecentlyViewed] Module loaded');

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    return {
        trackProduct: trackProduct,
        getProductIds: getProductIds,
        clearAll: clearAll,
        render: render,
        syncToServer: syncToServer,
        loadFromServer: loadFromServer,
        scrollLeft: scrollLeft,
        scrollRight: scrollRight
    };
})();
