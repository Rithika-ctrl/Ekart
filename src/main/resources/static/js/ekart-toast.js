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

window.EkartLoader = {
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
