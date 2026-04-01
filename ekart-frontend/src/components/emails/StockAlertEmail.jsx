/**
 * StockAlertEmail Component
 * Low stock alert for vendors
 * Props: { vendorName, productName, productId, currentStock, threshold }
 */

export const StockAlertEmail = ({ 
  vendorName = 'Vendor',
  productName = 'Awesome Product',
  productId = '12345',
  currentStock = 5,
  threshold = 10
}) => {
  const styles = {
    root: {
      background: '#090c1e',
      backgroundImage: `
        radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,168,0,0.13) 0%, transparent 70%),
        radial-gradient(ellipse 60% 40% at 80% 110%, rgba(245,168,0,0.07) 0%, transparent 60%)
      `,
      minHeight: '100vh',
      padding: '48px 16px',
      fontFamily: "'Poppins', Arial, sans-serif",
    },
    wrapper: {
      maxWidth: '620px',
      margin: '0 auto',
    },
    logoBar: {
      textAlign: 'center',
      marginBottom: '28px',
    },
    brand: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '1.55rem',
      fontWeight: 800,
      color: '#ffffff',
      letterSpacing: '0.04em',
      textDecoration: 'none',
    },
    brandSpan: {
      color: '#f5a800',
    },
    card: {
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.13)',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: '0 40px 100px rgba(0,0,0,0.55)',
    },
    cardHero: {
      background: 'linear-gradient(135deg, rgba(220,38,38,0.22) 0%, rgba(153,27,27,0.18) 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: '40px 40px 36px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    heroBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(220,38,38,0.20)',
      border: '1px solid rgba(239,68,68,0.35)',
      borderRadius: '100px',
      padding: '5px 14px',
      fontSize: '0.68rem',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#fca5a5',
      marginBottom: '18px',
    },
    heroIcon: {
      fontSize: '3.5rem',
      lineHeight: 1,
      marginBottom: '16px',
      display: 'block',
    },
    heroTitle: {
      fontSize: '1.6rem',
      fontWeight: 800,
      color: '#ffffff',
      letterSpacing: '-0.01em',
      marginBottom: '6px',
    },
    heroAccent: {
      color: '#f5a800',
    },
    subtitle: {
      fontSize: '0.8rem',
      color: 'rgba(255,255,255,0.5)',
      fontWeight: 400,
    },
    cardBody: {
      padding: '36px 40px',
    },
    greeting: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#ffffff',
      marginBottom: '6px',
    },
    greetingName: {
      color: '#f5a800',
    },
    introText: {
      fontSize: '0.82rem',
      color: 'rgba(255,255,255,0.55)',
      lineHeight: 1.7,
      marginBottom: '28px',
    },
    alertStrip: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      background: 'rgba(220,38,38,0.12)',
      border: '1px solid rgba(239,68,68,0.28)',
      borderLeft: '4px solid #ef4444',
      borderRadius: '12px',
      padding: '16px 18px',
      marginBottom: '28px',
    },
    stripIcon: {
      fontSize: '1.25rem',
      lineHeight: 1,
      flexShrink: 0,
      marginTop: '2px',
    },
    stripContent: {
      fontSize: '0.82rem',
    },
    sectionLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '0.65rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: '#f5a800',
      marginBottom: '14px',
    },
    productGrid: {
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '28px',
    },
    productRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '13px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    rowLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '0.75rem',
      color: 'rgba(255,255,255,0.45)',
      fontWeight: 500,
    },
    dot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: 'rgba(245,168,0,0.5)',
      flexShrink: 0,
    },
    rowValue: {
      fontSize: '0.82rem',
      fontWeight: 600,
      color: '#ffffff',
      textAlign: 'right',
    },
    rowValueDanger: {
      color: '#fca5a5',
      background: 'rgba(220,38,38,0.18)',
      border: '1px solid rgba(239,68,68,0.25)',
      padding: '3px 10px',
      borderRadius: '100px',
      fontSize: '0.75rem',
    },
    rowValueWarn: {
      color: '#fde68a',
    },
    ctaWrap: {
      textAlign: 'center',
      marginBottom: '10px',
    },
    btnCta: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: '#f5a800',
      color: '#1a1000',
      textDecoration: 'none',
      fontFamily: "'Poppins', Arial, sans-serif",
      fontSize: '0.82rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '13px 32px',
      borderRadius: '10px',
      boxShadow: '0 8px 28px rgba(245,168,0,0.28)',
    },
    note: {
      fontSize: '0.75rem',
      color: 'rgba(255,255,255,0.38)',
      textAlign: 'center',
      lineHeight: 1.7,
      marginTop: '20px',
    },
    cardFooter: {
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '22px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      flexWrap: 'wrap',
    },
    footerBrand: {
      fontSize: '1rem',
      fontWeight: 800,
      color: '#ffffff',
      letterSpacing: '0.04em',
    },
    footerCopy: {
      fontSize: '0.68rem',
      color: 'rgba(255,255,255,0.3)',
      textAlign: 'right',
      lineHeight: 1.6,
    },
  };

  const stripContentStrong = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#fca5a5', letterSpacing: '0.02em', marginBottom: '4px' };
  const stripContentP = { fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 };

  return (
    <div style={styles.root}>
      <div style={styles.wrapper}>
        {/* Logo bar */}
        <div style={styles.logoBar}>
          <span style={styles.brand}>
            🛒 <span style={styles.brandSpan}>Ekart</span>
          </span>
        </div>

        {/* Main card */}
        <div style={styles.card}>
          {/* Hero */}
          <div style={styles.cardHero}>
            <div style={styles.heroBadge}>⚠️ &nbsp;Automated Alert</div>
            <span style={styles.heroIcon}>📦</span>
            <h1 style={styles.heroTitle}>
              Low <span style={styles.heroAccent}>Stock</span> Alert
            </h1>
            <p style={styles.subtitle}>Action required — your inventory is running low</p>
          </div>

          {/* Body */}
          <div style={styles.cardBody}>
            <p style={styles.greeting}>
              Hello, <span style={styles.greetingName}>{vendorName}</span> 👋
            </p>
            <p style={styles.introText}>
              One of your listed products has crossed the low-stock threshold you configured. Please
              restock soon to keep your customers happy and avoid missed sales.
            </p>

            {/* Alert strip */}
            <div style={styles.alertStrip}>
              <span style={styles.stripIcon}>🔔</span>
              <div style={styles.stripContent}>
                <strong style={stripContentStrong}>Low Stock Alert Triggered</strong>
                <p style={stripContentP}>
                  Current inventory has dropped to or below your configured alert threshold. Immediate
                  restocking is recommended.
                </p>
              </div>
            </div>

            {/* Product details */}
            <div style={styles.sectionLabel}>🏷️ &nbsp;Product Details</div>
            <div style={styles.productGrid}>
              <div style={styles.productRow}>
                <span style={styles.rowLabel}>
                  <span style={styles.dot}></span>Product Name
                </span>
                <span style={styles.rowValue}>{productName}</span>
              </div>
              <div style={styles.productRow}>
                <span style={styles.rowLabel}>
                  <span style={styles.dot}></span>Product ID
                </span>
                <span style={styles.rowValue}>#{productId}</span>
              </div>
              <div style={styles.productRow}>
                <span style={styles.rowLabel}>
                  <span style={styles.dot}></span>Current Stock
                </span>
                <span style={{ ...styles.rowValue, ...styles.rowValueDanger }}>
                  {currentStock} units
                </span>
              </div>
              <div style={{ ...styles.productRow, borderBottom: 'none' }}>
                <span style={styles.rowLabel}>
                  <span style={styles.dot}></span>Alert Threshold
                </span>
                <span style={{ ...styles.rowValue, ...styles.rowValueWarn }}>
                  {threshold} units
                </span>
              </div>
            </div>

            {/* CTA */}
            <div style={styles.ctaWrap}>
              <a href="http://localhost:8080/manage-products" style={styles.btnCta}>
                🛒 &nbsp;Manage Products
              </a>
            </div>

            <p style={styles.note}>
              Log in to your Ekart vendor dashboard to update stock levels.
              <br />
              This is an automated notification — please do not reply to this email.
            </p>
          </div>

          {/* Footer */}
          <div style={styles.cardFooter}>
            <div style={styles.footerBrand}>
              <span style={styles.brandSpan}>Ekart</span>
            </div>
            <div style={styles.footerCopy}>
              © 2026 Ekart. All rights reserved.
              <br />
              Automated inventory notification system.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAlertEmail;
