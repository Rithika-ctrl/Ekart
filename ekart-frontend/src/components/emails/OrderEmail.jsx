/**
 * OrderEmail Component
 * Order confirmation email with items list
 * Props: { name, orderId, paymentMode, deliveryTime, items: [{name, quantity, price}], amount }
 */

export const OrderEmail = ({ 
  name = 'Customer',
  orderId = '12345',
  paymentMode = 'Online',
  deliveryTime = '',
  items = [{ name: 'Product 1', quantity: 1, price: 999 }],
  amount = 4999.99
}) => {
  const styles = {
    wrapper: {
      maxWidth: '600px',
      margin: 'auto',
      background: '#13162b',
      borderRadius: '20px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    },
    header: {
      background: 'linear-gradient(135deg, #0f1a0a 0%, #1a2e0f 100%)',
      borderBottom: '1px solid rgba(245,168,0,0.2)',
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
      background: 'rgba(34,197,94,0.15)',
      border: '1px solid rgba(34,197,94,0.35)',
      color: '#4ade80',
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
      background: '#4ade80',
      borderRadius: '50%',
    },
    headerTitle: {
      fontSize: '26px',
      fontWeight: 800,
      color: '#ffffff',
      marginBottom: '6px',
      letterSpacing: '-0.01em',
    },
    headerSubtitle: {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.45)',
    },
    body: {
      padding: '32px 36px',
    },
    greeting: {
      fontSize: '15px',
      color: 'rgba(255,255,255,0.75)',
      marginBottom: '6px',
      lineHeight: 1.6,
    },
    subText: {
      fontSize: '13.5px',
      color: 'rgba(255,255,255,0.4)',
      marginBottom: '28px',
      lineHeight: 1.65,
    },
    infoBox: {
      background: 'rgba(245,168,0,0.06)',
      border: '1px solid rgba(245,168,0,0.18)',
      borderRadius: '14px',
      padding: '18px 22px',
      marginBottom: '28px',
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap',
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '120px',
    },
    infoLabel: {
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'rgba(255,255,255,0.3)',
    },
    infoValue: {
      fontSize: '15px',
      fontWeight: 700,
      color: '#ffffff',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 12px',
      borderRadius: '50px',
      fontSize: '12px',
      fontWeight: 700,
    },
    badgeOnline: {
      background: 'rgba(34,197,94,0.15)',
      border: '1px solid rgba(34,197,94,0.3)',
      color: '#4ade80',
    },
    badgeCod: {
      background: 'rgba(245,168,0,0.15)',
      border: '1px solid rgba(245,168,0,0.3)',
      color: '#f5a800',
    },
    sectionTitle: {
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'rgba(255,255,255,0.3)',
      marginBottom: '12px',
      paddingBottom: '10px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '28px',
    },
    thead: {
      background: 'rgba(255,255,255,0.04)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    },
    th: {
      padding: '11px 14px',
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'rgba(255,255,255,0.35)',
    },
    td: {
      padding: '12px 14px',
      fontSize: '13.5px',
      color: 'rgba(255,255,255,0.65)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    totalRow: {
      background: 'rgba(245,168,0,0.08)',
      color: '#f5a800',
      fontWeight: 700,
      fontSize: '14px',
      borderTop: '1px solid rgba(245,168,0,0.2)',
    },
    noticeBox: {
      background: 'rgba(59,130,246,0.07)',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: '12px',
      padding: '14px 18px',
      marginBottom: '24px',
      fontSize: '13px',
      color: 'rgba(255,255,255,0.45)',
      lineHeight: 1.6,
    },
    signOff: {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.45)',
      lineHeight: 1.7,
    },
    footer: {
      background: 'rgba(0,0,0,0.3)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '18px 36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '8px',
    },
    footerBrand: {
      fontSize: '13px',
      fontWeight: 700,
      color: 'rgba(255,255,255,0.35)',
    },
    footerCopy: {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.2)',
    },
  };

  return (
    <div style={{ background: '#0d1020', padding: '32px 16px' }}>
      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.brand}>E<span style={styles.brandSpan}>kart</span></div>
            <div style={styles.statusChip}>
              <div style={styles.statusDot}></div>
              Confirmed
            </div>
          </div>
          <h1 style={styles.headerTitle}>Order Confirmed! 🎉</h1>
          <p style={styles.headerSubtitle}>Thank you for shopping with Ekart.</p>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <p style={styles.greeting}>
            Hi <strong>{name}</strong>,
          </p>
          <p style={styles.subText}>Your order has been placed successfully. Here's a summary of what you ordered.</p>

          {/* Info Box */}
          <div style={styles.infoBox}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Order ID</span>
              <span style={styles.infoValue}>#{orderId}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Payment</span>
              <span style={styles.infoValue}>
                {paymentMode === 'Online' ? (
                  <span style={{ ...styles.badge, ...styles.badgeOnline }}>✅ Online</span>
                ) : (
                  <span style={{ ...styles.badge, ...styles.badgeCod }}>💵 Cash on Delivery</span>
                )}
              </span>
            </div>
            {deliveryTime && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Delivery Slot</span>
                <span style={styles.infoValue}>{deliveryTime}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div style={styles.sectionTitle}>🚚 Items Ordered</div>
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
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.quantity}</td>
                  <td style={styles.td}>₹{(item.price).toFixed(2)}</td>
                </tr>
              ))}
              <tr style={styles.totalRow}>
                <td style={styles.td} colSpan="2">Total Amount</td>
                <td style={{ ...styles.td, ...styles.totalRow }}>₹{(amount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Notice */}
          <div style={styles.noticeBox}>
            <strong>✓ Your order is confirmed.</strong> You will receive shipping details once your order is picked up by our delivery partner.
          </div>

          {/* Sign off */}
          <div style={styles.signOff}>
            Regards,<br />
            <strong>The Ekart Team</strong>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerBrand}>E<span style={styles.brandSpan}>kart</span></div>
          <div style={styles.footerCopy}>© 2026 Ekart. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
};

export default OrderEmail;
