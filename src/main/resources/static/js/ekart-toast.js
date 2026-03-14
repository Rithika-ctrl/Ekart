/**
 * Ekart Global Toast Notification System
 * 
 * Usage:
 *   EkartToast.success('Operation completed!');
 *   EkartToast.error('Something went wrong');
 *   EkartToast.warning('Session about to expire');
 *   EkartToast.info('Loading your data...');
 * 
 * Also provides global error handlers for:
 *   - Fetch API failures
 *   - Social login cancellations
 *   - Re-order failures
 *   - Session timeouts
 */

window.EkartToast = (function() {
    'use strict';

    let containerId = 'ekart-toast-container';
    let toastQueue = [];
    let isProcessing = false;

    // Create container on first use
    function ensureContainer() {
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    // Toast icons by type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // Toast colors
    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.95)', border: '#10b981', icon: '#064e3b' },
        error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444', icon: '#7f1d1d' },
        warning: { bg: 'rgba(245, 168, 0, 0.95)', border: '#f5a800', icon: '#78350f' },
        info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', icon: '#1e3a5f' }
    };

    function createToast(message, type, duration) {
        const container = ensureContainer();
        const color = colors[type] || colors.info;
        
        const toast = document.createElement('div');
        toast.className = 'ekart-toast';
        toast.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 20px;
            background: ${color.bg};
            border: 1px solid ${color.border};
            border-radius: 10px;
            color: white;
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
            font-weight: 500;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            pointer-events: auto;
            transform: translateX(120%);
            transition: transform 0.3s ease, opacity 0.3s ease;
            cursor: pointer;
            max-width: 100%;
            word-wrap: break-word;
        `;

        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icons[type] || icons.info;
        iconSpan.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            background: rgba(255,255,255,0.25);
            border-radius: 50%;
            font-weight: bold;
            flex-shrink: 0;
        `;

        // Message
        const msgSpan = document.createElement('span');
        msgSpan.textContent = message;
        msgSpan.style.flex = '1';

        // Close button
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            margin-left: 8px;
            cursor: pointer;
            font-size: 1.2rem;
            opacity: 0.7;
            transition: opacity 0.2s;
            flex-shrink: 0;
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';

        toast.appendChild(iconSpan);
        toast.appendChild(msgSpan);
        toast.appendChild(closeBtn);

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Click to dismiss
        const dismiss = () => {
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        };

        closeBtn.onclick = (e) => {
            e.stopPropagation();
            dismiss();
        };
        toast.onclick = dismiss;

        // Auto-dismiss
        setTimeout(dismiss, duration || 5000);

        return toast;
    }

    // Public API
    return {
        success: function(msg, duration) {
            return createToast(msg, 'success', duration || 4000);
        },
        error: function(msg, duration) {
            return createToast(msg, 'error', duration || 6000);
        },
        warning: function(msg, duration) {
            return createToast(msg, 'warning', duration || 5000);
        },
        info: function(msg, duration) {
            return createToast(msg, 'info', duration || 4000);
        },

        // Standard error messages for common scenarios
        handleFetchError: function(error, context) {
            console.error('[Ekart]', context || 'Fetch error:', error);
            if (error.message && error.message.includes('Failed to fetch')) {
                return this.error('Network error. Please check your connection.');
            }
            return this.error(error.message || 'An unexpected error occurred.');
        },

        handleSocialLoginCancel: function(provider) {
            return this.warning(`${provider || 'Social'} login was cancelled. Please try again.`);
        },

        handleSessionExpired: function() {
            return this.warning('Your session has expired. Please login again.', 7000);
        },

        handleReorderFailed: function(reason) {
            return this.error(`Re-order failed: ${reason || 'Items may be out of stock.'}`);
        },

        handleRefundError: function(reason) {
            return this.error(`Refund request failed: ${reason || 'Please try again later.'}`);
        }
    };
})();

// ─────────────────────────────────────────────────────────────────────────────
// Global Fetch Wrapper with Error Handling
// ─────────────────────────────────────────────────────────────────────────────

window.ekartFetch = async function(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        // Handle 401 - Session expired
        if (response.status === 401) {
            EkartToast.handleSessionExpired();
            setTimeout(() => {
                window.location.href = '/customer/login';
            }, 2000);
            return null;
        }

        // Handle 403 - Forbidden (account suspended, etc.)
        if (response.status === 403) {
            const data = await response.json().catch(() => ({}));
            EkartToast.error(data.message || 'Access denied.');
            return null;
        }

        // Handle server errors
        if (response.status >= 500) {
            EkartToast.error('Server error. Please try again later.');
            return null;
        }

        return response;
    } catch (error) {
        EkartToast.handleFetchError(error);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton Utilities
// ─────────────────────────────────────────────────────────────────────────────

window.EkartSkeleton = {
    /**
     * Create a skeleton loading placeholder
     * @param {string} type - 'card', 'row', 'text', 'circle'
     * @param {number} count - Number of skeletons to create
     */
    skeleton: function(type, count = 1) {
        const skeletons = [];
        const baseStyle = `
            background: linear-gradient(90deg, 
                rgba(255,255,255,0.08) 0%, 
                rgba(255,255,255,0.15) 50%, 
                rgba(255,255,255,0.08) 100%);
            background-size: 200% 100%;
            animation: ekartShimmer 1.5s infinite;
            border-radius: 8px;
        `;

        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'ekart-skeleton';
            
            switch (type) {
                case 'card':
                    el.style.cssText = baseStyle + `
                        width: 100%;
                        height: 200px;
                        margin-bottom: 16px;
                    `;
                    break;
                case 'row':
                    el.style.cssText = baseStyle + `
                        width: 100%;
                        height: 48px;
                        margin-bottom: 8px;
                    `;
                    break;
                case 'text':
                    el.style.cssText = baseStyle + `
                        width: ${60 + Math.random() * 40}%;
                        height: 16px;
                        margin-bottom: 8px;
                    `;
                    break;
                case 'circle':
                    el.style.cssText = baseStyle + `
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                    `;
                    break;
                default:
                    el.style.cssText = baseStyle + `
                        width: 100%;
                        height: 100px;
                    `;
            }
            skeletons.push(el);
        }

        // Inject animation if not present
        if (!document.getElementById('ekart-skeleton-style')) {
            const style = document.createElement('style');
            style.id = 'ekart-skeleton-style';
            style.textContent = `
                @keyframes ekartShimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `;
            document.head.appendChild(style);
        }

        return skeletons;
    },

    /**
     * Show loading state in a container
     * @param {HTMLElement|string} container - Container element or selector
     * @param {string} type - Skeleton type
     * @param {number} count - Number of skeletons
     */
    showLoading: function(container, type = 'card', count = 3) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;
        
        el.dataset.originalContent = el.innerHTML;
        el.innerHTML = '';
        
        const skeletons = this.skeleton(type, count);
        skeletons.forEach(s => el.appendChild(s));
    },

    /**
     * Restore original content or show new content
     * @param {HTMLElement|string} container - Container element or selector
     * @param {string} newContent - Optional new HTML content
     */
    hideLoading: function(container, newContent) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;
        
        if (newContent !== undefined) {
            el.innerHTML = newContent;
        } else if (el.dataset.originalContent) {
            el.innerHTML = el.dataset.originalContent;
            delete el.dataset.originalContent;
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Auto-detect URL hash errors (for OAuth callbacks)
// ─────────────────────────────────────────────────────────────────────────────

(function() {
    // Check for OAuth error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    if (error) {
        document.addEventListener('DOMContentLoaded', function() {
            if (error === 'access_denied') {
                EkartToast.handleSocialLoginCancel('');
            } else {
                EkartToast.error(errorDescription || 'Authentication failed. Please try again.');
            }
        });
    }
})();

console.log('🎨 EkartToast system loaded');

// =============================================================================
// EKART GLOBAL PAGE LOADER
// Shows a full-screen loader on every link click, form submit, and navigation.
// Hides automatically when the new page finishes loading.
// =============================================================================

window.EkartPageLoader = (function () {
    'use strict';

    // ── Inject styles once ────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('ekart-gl-style')) return;
        const s = document.createElement('style');
        s.id = 'ekart-gl-style';
        s.textContent = `
            #ekart-global-loader {
                position: fixed; inset: 0; z-index: 999999;
                background: rgba(5, 8, 20, 0.92);
                backdrop-filter: blur(10px);
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                gap: 1.25rem;
                opacity: 0; visibility: hidden;
                transition: opacity 0.25s ease, visibility 0.25s ease;
                pointer-events: none;
            }
            #ekart-global-loader.egl-visible {
                opacity: 1; visibility: visible; pointer-events: auto;
            }
            .egl-cart {
                font-size: 2rem;
                animation: eglBounce 0.9s ease-in-out infinite;
            }
            .egl-ring {
                width: 50px; height: 50px;
                border: 3px solid rgba(245,168,0,0.15);
                border-top-color: #f5a800;
                border-radius: 50%;
                animation: eglSpin 0.7s linear infinite;
            }
            .egl-label {
                font-family: 'Poppins', sans-serif;
                font-size: 0.88rem; font-weight: 600;
                color: rgba(255,255,255,0.75);
                letter-spacing: 0.08em;
            }
            .egl-dots span {
                display: inline-block;
                animation: eglDot 1.2s infinite;
                color: #f5a800;
            }
            .egl-dots span:nth-child(2) { animation-delay: 0.2s; }
            .egl-dots span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes eglSpin   { to { transform: rotate(360deg); } }
            @keyframes eglBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
            @keyframes eglDot    { 0%,80%,100%{opacity:0} 40%{opacity:1} }
        `;
        document.head.appendChild(s);
    }

    // ── Create DOM element ────────────────────────────────────────────────────
    function createEl() {
        if (document.getElementById('ekart-global-loader')) return;
        const el = document.createElement('div');
        el.id = 'ekart-global-loader';
        el.innerHTML = `
            <div class="egl-cart">\u{1F6D2}</div>
            <div class="egl-ring"></div>
            <div class="egl-label">Please wait<span class="egl-dots"><span>.</span><span>.</span><span>.</span></span></div>
        `;
        document.body.appendChild(el);
    }

    // ── Show / hide ───────────────────────────────────────────────────────────
    function show(labelText) {
        const el = document.getElementById('ekart-global-loader');
        if (!el) return;
        if (labelText) {
            const lbl = el.querySelector('.egl-label');
            if (lbl) lbl.innerHTML = labelText + '<span class="egl-dots"><span>.</span><span>.</span><span>.</span></span>';
        }
        el.classList.add('egl-visible');
    }

    function hide() {
        const el = document.getElementById('ekart-global-loader');
        if (el) el.classList.remove('egl-visible');
    }

    // ── Bootstrap: attach to every trigger after DOM ready ───────────────────
    function bootstrap() {
        injectStyles();
        createEl();

        // 1. All <a> clicks that navigate (exclude #, mailto, tel, target=_blank, js: links)
        document.addEventListener('click', function (e) {
            const a = e.target.closest('a[href]');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            if (
                href.startsWith('#') ||
                href.startsWith('javascript') ||
                href.startsWith('mailto') ||
                href.startsWith('tel') ||
                a.target === '_blank' ||
                e.ctrlKey || e.metaKey || e.shiftKey
            ) return;
            show('Please wait');
        }, true);

        // 2. All form submissions
        document.addEventListener('submit', function (e) {
            const form = e.target;
            if (form.tagName !== 'FORM') return;
            // Tiny inline review forms can be noisy — keep them included
            show('Please wait');
        }, true);

        // 3. Hide on popstate (browser back/forward)
        window.addEventListener('popstate', hide);

        // 4. Safety net: always hide once new page has fully loaded
        window.addEventListener('load', function () {
            // Small delay so the fade-out is visible
            setTimeout(hide, 150);
        });

        // 5. Hard fallback: hide after 8 seconds no matter what
        document.addEventListener('click', function () {
            setTimeout(hide, 8000);
        }, true);
        document.addEventListener('submit', function () {
            setTimeout(hide, 8000);
        }, true);
    }

    // Run after DOM is available
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    // Public API (optional manual control)
    return { show: show, hide: hide };
})();