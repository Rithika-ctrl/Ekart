/**
 * NotFound404 Component
 * 404 Page Not Found error page
 * Props: { requestedPath?, onHome? }
 */

export const NotFound404 = ({ requestedPath = '/unknown', onHome }) => {
  const styles = {
    root: {
      fontFamily: "'Poppins', sans-serif",
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a3a 50%, #080c18 100%)',
      color: '#ffffff',
      margin: 0,
      padding: '2rem',
    },
    container: {
      textAlign: 'center',
      maxWidth: '600px',
    },
    icon: {
      fontSize: '5rem',
      marginBottom: '1rem',
      animation: 'bounce 2s infinite',
    },
    code: {
      fontSize: '4.5rem',
      fontWeight: 800,
      background: 'linear-gradient(135deg, #f5a800, #ff6b35)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: '0 0 1rem',
    },
    title: {
      fontSize: '2rem',
      fontWeight: 800,
      marginBottom: '0.75rem',
      letterSpacing: '-0.02em',
    },
    subtitle: {
      fontSize: '1rem',
      fontWeight: 600,
      color: 'rgba(255,255,255,0.6)',
      marginBottom: '1.5rem',
      lineHeight: 1.6,
    },
    message: {
      fontSize: '0.95rem',
      color: 'rgba(255,255,255,0.5)',
      marginBottom: '2.5rem',
      lineHeight: 1.8,
    },
    pathBox: {
      background: 'rgba(255,100,80,0.1)',
      border: '1px solid rgba(255,100,80,0.2)',
      borderRadius: '10px',
      padding: '1rem',
      marginBottom: '2rem',
      fontSize: '0.85rem',
      color: 'rgba(255,100,80,0.8)',
      wordBreak: 'break-all',
      fontFamily: 'monospace',
    },
    divider: {
      width: '60px',
      height: '2px',
      background: 'linear-gradient(90deg, #f5a800, #ff6b35)',
      margin: '2rem auto',
      borderRadius: '1px',
    },
    btnGroup: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    btn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.875rem 1.75rem',
      borderRadius: '12px',
      fontSize: '0.95rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textDecoration: 'none',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s cubic-bezier(0.23,1,0.32,1)',
      textTransform: 'uppercase',
    },
    btnHome: {
      background: 'linear-gradient(135deg, #f5a800, #d48f00)',
      color: '#1a1000',
      boxShadow: '0 8px 24px rgba(245,168,0,0.25)',
    },
    btnBack: {
      background: 'rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(255,255,255,0.15)',
    },
    footer: {
      marginTop: '3rem',
      fontSize: '0.75rem',
      color: 'rgba(255,255,255,0.3)',
    },
    style: `
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }
    `,
  };

  const handleHome = () => {
    if (onHome) onHome();
    else window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div style={styles.root}>
      <style>{styles.style}</style>
      <div style={styles.container}>
        <div style={styles.icon}>🔍</div>
        <div style={styles.code}>404</div>
        <h1 style={styles.title}>Page Not Found</h1>
        <p style={styles.subtitle}>The page you're looking for doesn't exist</p>
        <p style={styles.message}>
          We couldn't find what you were looking for. It might have been moved, deleted,
          or the URL might be incorrect.
        </p>

        {requestedPath && (
          <div style={styles.pathBox}>
            Requested: {requestedPath}
          </div>
        )}

        <div style={styles.divider}></div>

        <div style={styles.btnGroup}>
          <button
            onClick={handleHome}
            style={{ ...styles.btn, ...styles.btnHome }}
          >
            🏠 Go Home
          </button>
          <button
            onClick={handleGoBack}
            style={{ ...styles.btn, ...styles.btnBack }}
          >
            ← Go Back
          </button>
        </div>

        <div style={styles.footer}>
          © 2026 Ekart. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default NotFound404;
