/**
 * Forbidden403 Component
 * 403 Access Denied error page
 * Props: { onAdminLogin?, onHome? }
 */

export const Forbidden403 = ({ onAdminLogin, onHome }) => {
  const styles = {
    root: {
      fontFamily: "'Segoe UI', sans-serif",
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f4f6fb',
      color: '#1a1a2e',
      margin: 0,
      padding: 0,
    },
    card: {
      background: '#fff',
      borderRadius: '20px',
      padding: '3rem 2.5rem',
      textAlign: 'center',
      maxWidth: '420px',
      width: '90%',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    },
    iconWrap: {
      width: '80px',
      height: '80px',
      background: '#fff0f0',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.5rem',
      fontSize: '2rem',
    },
    code: {
      fontSize: '3rem',
      fontWeight: 800,
      color: '#e24b4a',
      marginBottom: '0.25rem',
    },
    title: {
      fontSize: '1.6rem',
      fontWeight: 700,
      marginBottom: '0.5rem',
    },
    message: {
      color: '#666',
      fontSize: '0.95rem',
      lineHeight: 1.6,
      marginBottom: '2rem',
    },
    btnGroup: {
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    btn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.65rem 1.4rem',
      borderRadius: '10px',
      fontSize: '0.9rem',
      fontWeight: 600,
      textDecoration: 'none',
      cursor: 'pointer',
      border: 'none',
      transition: 'opacity 0.2s, transform 0.15s',
    },
    btnPrimary: {
      background: '#e24b4a',
      color: '#fff',
    },
    btnGhost: {
      background: '#f0f0f0',
      color: '#333',
    },
  };

  const handleAdminLogin = () => {
    if (onAdminLogin) onAdminLogin();
    else window.location.href = '/admin/login';
  };

  const handleHome = () => {
    if (onHome) onHome();
    else window.location.href = '/';
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>🛡️</div>
        <div style={styles.code}>403</div>
        <h1 style={styles.title}>Access Denied</h1>
        <p style={styles.message}>
          You don't have permission to view this page. Please login with an account that has the required access level.
        </p>
        <div style={styles.btnGroup}>
          <button
            onClick={handleAdminLogin}
            style={{ ...styles.btn, ...styles.btnPrimary }}
          >
            🔐 Admin Login
          </button>
          <button
            onClick={handleHome}
            style={{ ...styles.btn, ...styles.btnGhost }}
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden403;
