// src/services/analyticsService.ts
import axios from 'axios';

interface UserAction {
  actionType: string;
  metadata: Record<string, any>;
  timestamp: number;
}

const actionBuffer: UserAction[] = [];
const BATCH_INTERVAL = 30000; // 30 seconds

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

export { logUserAction };