import { useEffect } from 'react';

/**
 * Toast alert — auto-dismisses after `duration` ms.
 *
 * Props:
 *   type    — 'success' | 'danger'
 *   message — string
 *   onClose — () => void
 *   duration — ms (default 3000)
 */
export default function Toast({ type = 'success', message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      <i className={`fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
      <span>{message}</span>
      <button className="alert-close" onClick={onClose}>×</button>
    </div>
  );
}