/**
 * ErrorPage Component
 * Generic server error page with glassmorphism design
 * Props: { errorMessage?, errorDetails?, onGoBack?, onHome? }
 */

export const ErrorPage = ({ 
  errorMessage = 'The page could not be processed',
  errorDetails = null,
  onGoBack,
  onHome 
}) => {
  const styles = {
    root: {
      fontFamily: "'Poppins', sans-serif",
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      color: '#ffffff',
      margin: 0,
      padding: 0,
      background: '#05080c',
    },
    bgLayer: {
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      overflow: 'hidden',
      background: 'linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%)',
    },
    nav: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '1rem 3rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(0, 0, 0, 0.25)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    },
    navBrand: {
      fontSize: '1.6rem',
      fontWeight: 700,
      color: '#ffffff',
      textDecoration: 'none',
      letterSpacing: '0.04em',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    navBrandSpan: {
      color: '#f5a800',
    },
    pageCenter: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '7rem 1.5rem 3rem',
    },
    errorCard: {
      background: 'rgba(255, 255, 255, 0.07)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '24px',
      padding: '3.5rem 3rem',
      width: '100%',
      maxWidth: '520px',
      textAlign: 'center',
      boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
      animation: 'fadeUp 0.6s cubic-bezier(0.23,1,0.32,1) both',
    },
    errorIconWrap: {
      width: '88px',
      height: '88px',
      margin: '0 auto 2rem',
      position: 'relative',
    },
    errorIconRing: {
      position: 'absolute',
      inset: 0,
      border: '2px solid rgba(255,100,80,0.3)',
      borderRadius: '50%',
      animation: 'pulse-ring 2s ease-out infinite',
    },
    errorIconCore: {
      position: 'absolute',
      inset: '12px',
      background: 'rgba(255,100,80,0.12)',
      border: '2px solid rgba(255,100,80,0.4)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.75rem',
      color: '#ff8060',
    },
    errorTitle: {
      fontSize: '1.45rem',
      fontWeight: 700,
      color: 'white',
      marginBottom: '0.65rem',
    },
    errorMessage: {
      fontSize: '0.845rem',
      color: 'rgba(255,255,255,0.5)',
      lineHeight: 1.7,
      marginBottom: '2rem',
    },
    debugBox: {
      background: 'rgba(255,80,60,0.07)',
      border: '1px solid rgba(255,80,60,0.25)',
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      marginBottom: '1.75rem',
      textAlign: 'left',
    },
    debugLabel: {
      fontSize: '0.65rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'rgba(255,100,80,0.7)',
      marginBottom: '0.4rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
    },
    debugText: {
      fontSize: '0.775rem',
      color: 'rgba(255,255,255,0.5)',
      fontFamily: 'monospace',
      wordBreak: 'break-all',
      lineHeight: 1.6,
    },
    divider: {
      border: 'none',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      margin: '0 0 2rem',
    },
    btnActions: {
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    btnBack: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.15)',
      color: 'rgba(255,255,255,0.8)',
      padding: '0.8rem 1.5rem',
      borderRadius: '12px',
      fontFamily: "'Poppins', sans-serif",
      fontSize: '0.875rem',
      fontWeight: 600,
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'all 0.25s',
    },
    btnHome: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: '#f5a800',
      color: '#1a1000',
      border: 'none',
      borderRadius: '12px',
      padding: '0.8rem 2rem',
      fontFamily: "'Poppins', sans-serif",
      fontSize: '0.875rem',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.23,1,0.32,1)',
      boxShadow: '0 8px 24px rgba(245,168,0,0.25)',
    },
    footer: {
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '1.25rem 3rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.75rem',
    },
    footerBrand: {
      fontSize: '1.1rem',
      fontWeight: 700,
      color: 'white',
    },
    footerBrandSpan: {
      color: '#f5a800',
    },
    footerCopy: {
      fontSize: '0.72rem',
      color: 'rgba(255,255,255,0.5)',
    },
    keyframes: `
      @keyframes pulse-ring {
        0%   { transform: scale(1);   opacity: 0.6; }
        100% { transform: scale(1.55); opacity: 0; }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `,
  };

  const handleGoBack = () => {
    if (onGoBack) onGoBack();
    else window.history.back();
  };

  const handleHome = () => {
    if (onHome) onHome();
    else window.location.href = '/';
  };

  return (
    <div style={styles.root}>
      <style>{styles.keyframes}</style>
      <div style={styles.bgLayer}></div>

      <nav style={styles.nav}>
        <a href="/" style={styles.navBrand}>
          🛒 <span style={styles.navBrandSpan}>Ekart</span>
        </a>
      </nav>

      <main style={styles.pageCenter}>
        <div style={styles.errorCard}>
          {/* Animated icon */}
          <div style={styles.errorIconWrap}>
            <div
              style={{
                ...styles.errorIconRing,
                animation: 'pulse-ring 2s ease-out infinite',
              }}
            />
            <div
              style={{
                ...styles.errorIconRing,
                animation: 'pulse-ring 2s ease-out infinite 0.5s',
              }}
            />
            <div style={styles.errorIconCore}>⚠️</div>
          </div>

          <h1 style={styles.errorTitle}>Oops! Something went wrong</h1>
          <p style={styles.errorMessage}>
            {errorMessage}
            <br />
            Please go back or return to the home page and try again.
          </p>

          {/* Debug info box */}
          {errorDetails && (
            <div style={styles.debugBox}>
              <div style={styles.debugLabel}>🐛 Debug Info</div>
              <div style={styles.debugText}>{errorDetails}</div>
            </div>
          )}

          <hr style={styles.divider} />

          <div style={styles.btnActions}>
            <button onClick={handleGoBack} style={styles.btnBack}>
              ← Go Back
            </button>
            <button onClick={handleHome} style={styles.btnHome}>
              🏠 Go to Home
            </button>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerBrand}>
          <span style={styles.footerBrandSpan}>Ekart</span>
        </div>
        <div style={styles.footerCopy}>© 2026 Ekart. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default ErrorPage;
