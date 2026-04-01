/**
 * ShippedEmail Component
 * Notification sent when order is picked up and out for delivery
 * Props: { name, orderId, deliveryBoyName, currentCity, items: [{name, quantity, unitPrice}] }
 */

export const ShippedEmail = ({ 
  name = 'Customer', 
  orderId = '12345', 
  deliveryBoyName = 'John Doe',
  currentCity = 'Mumbai',
  items = [{ name: 'Product 1', quantity: 1, unitPrice: 999 }]
}) => {
  const styles = {
    root: {
      margin: 0,
      padding: 0,
      background: '#f4f6f8',
      fontFamily: 'Arial, sans-serif',
    },
    table: {
      width: '100%',
      cellPadding: 0,
      cellSpacing: 0,
    },
    outerTd: {
      textAlign: 'center',
      padding: '40px 20px',
    },
    mainTable: {
      width: '520px',
      backgroundColor: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      margin: '0 auto',
    },
    header: {
      background: '#1a1a2e',
      padding: '28px 32px',
    },
    headerBrand: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: '#f5a623',
    },
    headerSubtitle: {
      color: '#9ca3af',
      fontSize: '0.9rem',
      marginLeft: '12px',
    },
    body: {
      padding: '32px',
    },
    paragraph: {
      margin: '0 0 8px',
      color: '#374151',
      fontSize: '1rem',
    },
    subtext: {
      margin: '0 0 24px',
      color: '#6b7280',
      fontSize: '0.9rem',
    },
    infoBox: {
      background: '#dbeafe',
      borderRadius: '10px',
      padding: '20px 24px',
      marginBottom: '24px',
    },
    infoTitle: {
      fontSize: '1.1rem',
      fontWeight: 700,
      color: '#1e40af',
      marginBottom: '4px',
    },
    infoText: {
      color: '#1d4ed8',
      fontSize: '0.88rem',
      marginTop: '4px',
    },
    itemsBox: {
      background: '#f9fafb',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px',
    },
    itemsTitle: {
      fontWeight: 600,
      fontSize: '0.88rem',
      color: '#374151',
      marginBottom: '10px',
    },
    itemRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 0',
      fontSize: '0.85rem',
      color: '#4b5563',
      borderBottom: '1px solid #e5e7eb',
    },
    footer: {
      background: '#f9fafb',
      padding: '20px 32px',
      textAlign: 'center',
    },
    button: {
      background: '#f5a623',
      color: '#1a1a2e',
      textDecoration: 'none',
      padding: '10px 24px',
      borderRadius: '8px',
      fontWeight: 700,
      fontSize: '0.88rem',
      display: 'inline-block',
    },
  };

  const formatPrice = (price) => `₹${(price).toFixed(2)}`;

  return (
    <div style={styles.root}>
      <html>
        <body style={styles.root}>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.outerTd}>
                  <table style={styles.mainTable}>
                    <tbody>
                      {/* Header */}
                      <tr>
                        <td style={styles.header}>
                          <span style={styles.headerBrand}>Ekart</span>
                          <span style={styles.headerSubtitle}>Order Update</span>
                        </td>
                      </tr>

                      {/* Body */}
                      <tr>
                        <td style={styles.body}>
                          <p style={styles.paragraph}>
                            Hi <strong>{name}</strong>,
                          </p>
                          <p style={styles.subtext}>
                            Great news! Your order <strong>#{orderId}</strong> has been picked up and is
                            on its way to you.
                          </p>

                          {/* Info Box */}
                          <div style={styles.infoBox}>
                            <div style={styles.infoTitle}>🚚 Your order is shipped!</div>
                            <div style={styles.infoText}>Delivery by: <strong>{deliveryBoyName}</strong></div>
                            <div style={styles.infoText}>Current location: <strong>{currentCity}</strong></div>
                          </div>

                          {/* Items */}
                          <div style={styles.itemsBox}>
                            <div style={styles.itemsTitle}>Items in this order:</div>
                            {items.map((item, idx) => (
                              <div key={idx} style={styles.itemRow}>
                                <span>{item.name} × {item.quantity}</span>
                                <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                              </div>
                            ))}
                          </div>

                          <p style={{ ...styles.subtext, marginBottom: 0 }}>
                            You will receive a delivery OTP via email when the delivery boy reaches your
                            location. Please keep it ready.
                          </p>
                        </td>
                      </tr>

                      {/* Footer */}
                      <tr>
                        <td style={styles.footer}>
                          <a href="/view-orders" style={styles.button}>
                            Track My Order
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    </div>
  );
};

export default ShippedEmail;
