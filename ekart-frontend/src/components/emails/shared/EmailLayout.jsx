/**
 * Shared Email Layout Component
 * Provides consistent structure and styling for all email templates
 */

export const EmailLayout = ({ children, darkMode = true, type = 'default' }) => {
  const styles = {
    body: {
      margin: 0,
      padding: darkMode ? '32px 16px' : '20px 16px',
      fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
      backgroundColor: darkMode ? '#0d1020' : '#f1f3f6',
      color: darkMode ? '#e2e8f0' : '#212121',
      lineHeight: 1.6,
    },
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: darkMode ? '#13162b' : '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: darkMode
        ? '0 24px 60px rgba(0,0,0,0.5)'
        : '0 2px 4px rgba(0, 0, 0, 0.08)',
      border: darkMode ? '1px solid rgba(255,255,255,0.1)' : 'none',
    },
  };

  return (
    <div style={styles.body}>
      <div style={styles.container}>{children}</div>
    </div>
  );
};

/**
 * Email Header Component
 */
export const EmailHeader = ({ 
  title, 
  subtitle, 
  statusBadgeText, 
  statusBadgeColor = '#4ade80',
  gradient = 'linear-gradient(135deg, #0f1a0a 0%, #1a2e0f 100%)',
}) => {
  const styles = {
    header: {
      background: gradient,
      borderBottom: `1px solid rgba(${statusBadgeColor === '#4ade80' ? '34,197,94' : statusBadgeColor === '#ff6b5b' ? '255,80,60' : '245,168,0'},0.2)`,
      padding: '36px 36px 28px',
      position: 'relative',
      overflow: 'hidden',
    },
    headerTop: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
    },
    brand: {
      fontSize: '22px',
      fontWeight: 800,
      color: '#ffffff',
      letterSpacing: '0.04em',
    },
    brandSpan: {
      color: '#f5a800',
    },
    statusChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: `rgba(${statusBadgeColor === '#4ade80' ? '34,197,94' : statusBadgeColor === '#ff6b5b' ? '255,80,60' : '245,168,0'},0.15)`,
      border: `1px solid rgba(${statusBadgeColor === '#4ade80' ? '34,197,94' : statusBadgeColor === '#ff6b5b' ? '255,80,60' : '245,168,0'},0.35)`,
      color: statusBadgeColor,
      fontSize: '11px',
      fontWeight: 700,
      padding: '5px 14px',
      borderRadius: '50px',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    statusDot: {
      width: '7px',
      height: '7px',
      background: statusBadgeColor,
      borderRadius: '50%',
    },
    title: {
      fontSize: '26px',
      fontWeight: 800,
      color: '#ffffff',
      marginBottom: '6px',
      letterSpacing: '-0.01em',
    },
    subtitle: {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.45)',
    },
  };

  return (
    <div style={styles.header}>
      <div style={styles.headerTop}>
        <div style={styles.brand}>
          Ek<span style={styles.brandSpan}>art</span>
        </div>
        {statusBadgeText && (
          <div style={styles.statusChip}>
            <div style={styles.statusDot}></div>
            {statusBadgeText}
          </div>
        )}
      </div>
      <h1 style={styles.title}>{title}</h1>
      {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
    </div>
  );
};

/**
 * Email Body Component
 */
export const EmailBody = ({ children }) => {
  const styles = {
    body: {
      padding: '32px 36px',
    },
  };

  return <div style={styles.body}>{children}</div>;
};

/**
 * Email Footer Component
 */
export const EmailFooter = ({ children, darkMode = true, centered = false }) => {
  const styles = {
    footer: {
      backgroundColor: darkMode ? '#0d1220' : '#f9fafb',
      padding: '20px 32px',
      textAlign: centered ? 'center' : 'left',
      borderTop: darkMode
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid #e5e7eb',
    },
    text: {
      margin: 0,
      color: darkMode ? 'rgba(255,255,255,0.3)' : '#9ca3af',
      fontSize: '0.78rem',
    },
  };

  return (
    <div style={styles.footer}>
      {typeof children === 'string' ? (
        <p style={styles.text}>{children}</p>
      ) : (
        children
      )}
    </div>
  );
};
