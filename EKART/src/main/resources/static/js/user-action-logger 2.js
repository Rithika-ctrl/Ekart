// Ekart User Action Logger (Global)
(function() {
    const BUFFER_KEY = 'ekart_user_action_buffer';
    const FLUSH_INTERVAL = 30000; // 30 seconds
    let buffer = [];
    let flushTimer = null;

    function getUserId() {
        // Try to get userId from a global JS variable, cookie, or meta tag
        return window.currentUserId || null;
    }

    function saveBuffer() {
        localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
    }
    function loadBuffer() {
        try {
            buffer = JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]');
        } catch (e) { buffer = []; }
    }

    function flushBuffer() {
        if (!buffer.length) return;
        const toSend = buffer.slice();
        buffer = [];
        saveBuffer();
        fetch('/api/user-activity/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toSend)
        }).catch(() => {
            // On failure, re-buffer
            buffer = toSend.concat(buffer);
            saveBuffer();
        });
    }

    function scheduleFlush() {
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL);
    }

    function logUserAction(actionType, metadata) {
        const userId = getUserId();
        if (!userId) return;
        const payload = {
            userId,
            actionType,
            metadata: JSON.stringify(metadata || {}),
            timestamp: new Date().toISOString()
        };
        buffer.push(payload);
        saveBuffer();
        scheduleFlush();
    }

    window.logUserAction = logUserAction;

    // Flush on page hide
    window.addEventListener('pagehide', flushBuffer);
    // Load buffer on page load
    loadBuffer();
})();
