// src/services/analyticsService.ts
import axios from 'axios';

interface UserAction {
  actionType: string;
  metadata: Record<string, any>;
  timestamp: number;
}

const actionBuffer: UserAction[] = [];
const BATCH_INTERVAL = 30000; // 30 seconds

// Flush logs on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (actionBuffer.length > 0) {
      try {
        // Use navigator.sendBeacon for reliability on unload
        navigator.sendBeacon && navigator.sendBeacon('/api/analytics/batch', JSON.stringify(actionBuffer));
      } catch {}
      actionBuffer.length = 0;
    }
  });
}

// Flush immediately if buffer exceeds 20
function flushIfNeeded() {
  if (actionBuffer.length >= 20) {
    const batch = actionBuffer.splice(0, actionBuffer.length);
    axios.post('/api/analytics/batch', batch).catch(() => {});
  }
}

function logUserAction(actionType: string, metadata: Record<string, any>) {
  try {
    actionBuffer.push({
      actionType,
      metadata,
      timestamp: Date.now(),
    });
  } catch (err) {
    // Fail silently, app must continue
  }
}

setInterval(async () => {
  if (actionBuffer.length === 0) return;
  const batch = actionBuffer.splice(0, actionBuffer.length);
  try {
    await axios.post('/api/analytics/batch', batch);
  } catch (err) {
    // Fail silently, app must continue
  }
}, BATCH_INTERVAL);

// Patch logUserAction to flush if needed
const originalLogUserAction = logUserAction;
function enhancedLogUserAction(actionType: string, metadata: Record<string, any>) {
  originalLogUserAction(actionType, metadata);
  flushIfNeeded();
}

export { enhancedLogUserAction as logUserAction };