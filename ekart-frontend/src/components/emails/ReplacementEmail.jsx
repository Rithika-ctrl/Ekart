/**
 * ReplacementEmail Component
 * Replacement request acknowledgment email
 * Props: { name, orderId, amount, items: [{name, quantity, price}] }
 */

export const ReplacementEmail = ({ 
  name = 'Customer',
  orderId = '12345',
  amount = 4999.99,
  items = [{ name: 'Product 1', quantity: 1, price: 999 }]
}) => {
  const steps = [
    'Our team reviews your replacement request within 24 hours.',
    "You'll receive a confirmation call or email from our support team.",
    'A pickup of the original item will be scheduled at your address.',
    'Your replacement product will be dispatched within 2–3 business days.',
  ];

  const styles = {
    root: {
      background: '#0f1624',
      padding: '40px 16px',
    },
    emailWrapper: {
      maxWidth: '580px',
      margin: '0 auto',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    },
    header: {
      background: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 100%)',
      borderBottom: '2px solid #f5a800',
      padding: '36px 36px 28px',
      textAlign: 'center',
    },
    brandRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '20px',
    },
    brandIcon: {
      width: '38px',
      height: '38px',
      background: '#f5a800',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
    },
    brandName: {
      fontSize: '22px',
      fontWeight: 800,
      color: '#ffffff',
      letterSpacing: '0.04em',
    },
    brandSpan: {
      color: '#f5a800',
    },
    statusBadge: {
      display: 'inline-block',
      background: 'rgba(245,168,0,0.15)',
      border: '1.5px solid rgba(245,168,0,0.4)',
      color: '#f5a800',
      padding: '6px 18px',
      borderRadius: '50px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: '14px',
    },
    headerTitle: {
      fontSize: '26px',
      fontWeight: 800,
      color: '#ffffff',
      marginBottom: '6px',
      letterSpacing: '-0.02em',
    },
    headerSub: {
      fontSize: '13px',
      color: 'rgba(255,255,255,0.55)',
    },
    body: {
      background: '#111827',
      padding: '36px',
    },
    greeting: {
      fontSize: '15px',
      color: '#cbd5e1',
      marginBottom: '10px',
      lineHeight: 1.65,
    },
    introText: {
      fontSize: '14px',
      color: '#94a3b8',
      lineHeight: 1.75,
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: '13px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: '#f5a800',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px',
    },
    infoBox: {
      background: 'rgba(245,168,0,0.06)',
      border: '1px solid rgba(245,168,0,0.25)',
      borderRadius: '14px',
      padding: '20px 24px',
      marginBottom: '24px',
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      fontSize: '13px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    infoLabel: {
      color: '#64748b',
      fontWeight: 500,
    },
    infoValue: {
      color: '#e2e8f0',
      fontWeight: 600,
      textAlign: 'right',
    },
    statusPill: {
      display: 'inline-block',
      background: 'rgba(245,168,0,0.15)',
      color: '#f5a800',
      padding: '3px 12px',
      borderRadius: '50px',
      fontSize: '11px',
      fontWeight: 700,
      border: '1px solid rgba(245,168,0,0.3)',
    },
    stepsBox: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
      padding: '20px 24px',
      marginBottom: '28px',
    },
    step: {
      display: 'flex',
      gap: '14px',
      alignItems: 'flex-start',
      marginBottom: '14px',
    },
    stepNum: {
      width: '26px',
      height: '26px',
      background: '#f5a800',
      color: '#1a1000',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: 800,
      flexShrink: 0,
      marginTop: '1px',
    },
    stepText: {
      fontSize: '13px',
      color: '#94a3b8',
      lineHeight: 1.6,
      paddingTop: '3px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '28px',
    },
    thead: {
      background: 'rgba(245,168,0,0.12)',
      borderBottom: '1px solid rgba(245,168,0,0.25)',
    },
    th: {
      padding: '12px 16px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: '#f5a800',
      textAlign: 'left',
    },
    td: {
      padding: '12px 16px',
      fontSize: '13px',
      color: '#94a3b8',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(255,255,255,0.02)',
    },
    productName: {
      color: '#cbd5e1',
      fontWeight: 500,
    },
    priceCell: {
      color: '#f5a800',
      fontWeight: 600,
    },
    totalRow: {
      background: 'rgba(245,168,0,0.08)',
      borderTop: '1px solid rgba(245,168,0,0.2)',
    },
    totalLabel: {
      color: '#e2e8f0',
      fontWeight: 700,
    },
    totalAmount: {
      color: '#f5a800',
      fontSize: '16px',
      fontWeight: 700,
    },
    supportNote: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      padding: '16px 20px',
      fontSize: '13px',
      color: '#64748b',
      lineHeight: 1.7,
      marginBottom: '20px',
    },
    signOff: {
      fontSize: '14px',
      color: '#94a3b8',
      lineHeight: 1.8,
    },
    footer: {
      background: '#0d111c',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '20px 36px',
      textAlign: 'center',
    },
    footerBrand: {
      fontSize: '16px',
      fontWeight: 800,
      color: '#ffffff',
      marginBottom: '6px',
      letterSpacing: '0.04em',
    },
    footerCopy: {
      fontSize: '11px',
      color: '#334155',
      letterSpacing: '0.04em',
    },
  };

  return (
    <div style={styles.root}>
      <div style={styles.emailWrapper}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.brandRow}>
            <div style={styles.brandIcon}>🛒</div>
            <div style={styles.brandName}>Ekart</div>
          </div>
          <div style={styles.statusBadge}>🔄 Replacement Request</div>
          <div style={styles.headerTitle}>We've Got Your Request</div>
          <div style={styles.headerSub}>Our team will review and get back to you shortly.</div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <p style={styles.greeting}>
            Hi <strong>{name}</strong>,
          </p>
          <p style={styles.introText}>
            Your replacement request has been submitted successfully. Our team will review it and get
            back to you within <strong>24–48 hours</strong>. We apologize for any inconvenience caused.
          </p>

          {/* Order Info */}
          <div style={styles.sectionTitle}>Order Details</div>
          <div style={styles.infoBox}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Order ID</span>
              <span style={styles.infoValue}>#{orderId}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Order Amount</span>
              <span style={styles.infoValue}>₹{(amount).toFixed(2)}</span>
            </div>
            <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
              <span style={styles.infoLabel}>Current Status</span>
              <span style={styles.infoValue}>
                <span style={styles.statusPill}>Replacement Under Review</span>
              </span>
            </div>
          </div>

          {/* Steps */}
          <div style={styles.sectionTitle}>What Happens Next?</div>
          <div style={styles.stepsBox}>
            {steps.map((stepText, idx) => (
              <div key={idx} style={styles.step}>
                <div style={styles.stepNum}>{idx + 1}</div>
                <div style={styles.stepText}>{stepText}</div>
              </div>
            ))}
          </div>

          {/* Items Table */}
          <div style={styles.sectionTitle}>Items in This Order</div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ ...styles.td, ...styles.productName }}>{item.name}</td>
                  <td style={styles.td}>{item.quantity}</td>
                  <td style={{ ...styles.td, ...styles.priceCell }}>₹{(item.price).toFixed(2)}</td>
                </tr>
              ))}
              <tr style={styles.totalRow}>
                <td style={{ ...styles.td, ...styles.totalRow, ...styles.totalLabel }} colSpan="2">
                  Order Total
                </td>
                <td style={{ ...styles.td, ...styles.totalRow, ...styles.totalAmount }}>
                  ₹{(amount).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Support Note */}
          <div style={styles.supportNote}>
            If you have any questions or need assistance, simply reply to this email or reach out
            to our support team. We're always happy to help.
          </div>

          <div style={styles.signOff}>
            Warm regards,<br />
            <strong>The Ekart Team</strong>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerBrand}>Ekart</div>
          <div style={styles.footerCopy}>© 2026 Ekart. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
};

export default ReplacementEmail;
