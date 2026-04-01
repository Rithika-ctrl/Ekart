/**
 * GeoBlocked Component
 * India-only geo-blocking page
 * Props: { onContactSupport? }
 */

export const GeoBlocked = ({ onContactSupport }) => {
  const styles = {
    root: {
      fontFamily: "'Poppins', sans-serif",
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a3a 50%, #080c18 100%)',
      color: '#ffffff',
      margin: 0,
      padding: '2rem',
    },
    card: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '24px',
      padding: '3rem 2.5rem',
      textAlign: 'center',
      maxWidth: '480px',
      width: '100%',
      backdropFilter: 'blur(16px)',
    },
    flag: {
      fontSize: '4rem',
      marginBottom: '1rem',
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: 800,
      marginBottom: '0.5rem',
    },
    titleSpan: {
      color: '#f5a800',
    },
    divider: {
      width: '60px',
      height: '3px',
      background: 'linear-gradient(90deg, #f5a800, #ff6b35)',
      borderRadius: '2px',
      margin: '1.5rem auto',
    },
    subtitle: {
      fontSize: '0.9rem',
      color: 'rgba(255,255,255,0.6)',
      lineHeight: 1.7,
      marginBottom: '2rem',
    },
    infoBox: {
      background: 'rgba(245,168,0,0.08)',
      border: '1px solid rgba(245,168,0,0.25)',
      borderRadius: '12px',
      padding: '1.25rem',
      fontSize: '0.82rem',
      color: 'rgba(255,255,255,0.65)',
      lineHeight: 1.7,
      marginBottom: '2rem',
    },
    infoBoxStrong: {
      color: '#f5a800',
      fontWeight: 600,
    },
    btnGroup: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: '1.5rem',
    },
    btn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.8rem 1.5rem',
      borderRadius: '12px',
      fontSize: '0.9rem',
      fontWeight: 600,
      textDecoration: 'none',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s',
    },
    btnPrimary: {
      background: '#f5a800',
      color: '#1a1000',
    },
    btnSecondary: {
      background: 'rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(255,255,255,0.15)',
    },
    footer: {
      marginTop: '2.5rem',
      fontSize: '0.75rem',
      color: 'rgba(255,255,255,0.3)',
    },
  };

  const handleContactSupport = () => {
    if (onContactSupport) onContactSupport();
    else window.location.href = '/support';
  };

  const handleHome = () => {
    window.location.href = '/';
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.flag}>🇮🇳</div>
        <h1 style={styles.title}>
          Ekart is <span style={styles.titleSpan}>India Only</span>
        </h1>
        <div style={styles.divider}></div>
        <p style={styles.subtitle}>
          We currently serve customers within India only.
          <br />
          Your location appears to be outside India.
        </p>

        <div style={styles.infoBox}>
          <strong style={styles.infoBoxStrong}>Why am I seeing this?</strong>
          <br />
          Ekart delivers exclusively within India. Access from other countries is restricted.
          If you are in India and seeing this page, please check your VPN settings or contact
          support.
        </div>

        <div style={styles.btnGroup}>
          <button onClick={handleHome} style={{ ...styles.btn, ...styles.btnPrimary }}>
            🏠 Return to Home
          </button>
          <button onClick={handleContactSupport} style={{ ...styles.btn, ...styles.btnSecondary }}>
            💬 Contact Support
          </button>
        </div>

        <div style={styles.footer}>
          © 2026 Ekart. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default GeoBlocked;
