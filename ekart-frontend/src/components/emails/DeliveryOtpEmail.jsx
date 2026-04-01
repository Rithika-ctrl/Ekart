/**
 * DeliveryOtpEmail Component
 * OTP notification sent when delivery is out for delivery
 * Props: { name: string, orderId: string|number, otp: string }
 */

export const DeliveryOtpEmail = ({ 
  name = 'Customer', 
  orderId = '12345', 
  otp = '123456' 
}) => {
  const styles = {
    root: {
      margin: 0,
      padding: 0,
      backgroundColor: '#f4f6f8',
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
    headerText: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    headerBrand: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: '#f5a623',
    },
    headerSubtitle: {
      color: '#9ca3af',
      fontSize: '0.9rem',
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
    otpBox: {
      background: '#fef9c3',
      border: '2px dashed #f5a623',
      borderRadius: '12px',
      padding: '28px',
      textAlign: 'center',
      margin: '0 0 24px',
    },
    otpLabel: {
      color: '#854d0e',
      fontSize: '0.85rem',
      fontWeight: 600,
      marginBottom: '8px',
    },
    otpValue: {
      fontSize: '3rem',
      fontWeight: 900,
      letterSpacing: '0.3em',
      color: '#1a1a2e',
    },
    otpWarning: {
      color: '#92400e',
      fontSize: '0.78rem',
      marginTop: '8px',
    },
    smallText: {
      margin: '0 0 8px',
      color: '#374151',
      fontSize: '0.88rem',
    },
    footer: {
      background: '#f9fafb',
      padding: '20px 32px',
      textAlign: 'center',
    },
    footerText: {
      color: '#9ca3af',
      fontSize: '0.78rem',
    },
  };

  return (
    <div style={styles.root}>
      <html>
        <body style={styles.root}>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.outerTd}>
                  <table style={styles.mainTable}>
                    {/* Header */}
                    <tbody>
                      <tr>
                        <td style={styles.header}>
                          <div style={styles.headerText}>
                            <span style={styles.headerBrand}>Ekart</span>
                            <span style={styles.headerSubtitle}>Delivery Notification</span>
                          </div>
                        </td>
                      </tr>

                      {/* Body */}
                      <tr>
                        <td style={styles.body}>
                          <p style={styles.paragraph}>
                            Hi <strong>{name}</strong>,
                          </p>
                          <p style={styles.subtext}>
                            Your order <strong>#{orderId}</strong> is{' '}
                            <span style={{ color: '#f5a623', fontWeight: 700 }}>
                              Out for Delivery
                            </span>{' '}
                            right now! Your delivery boy is on the way.
                          </p>

                          {/* OTP Box */}
                          <div style={styles.otpBox}>
                            <div style={styles.otpLabel}>
                              DELIVERY OTP — Share this with delivery boy only
                            </div>
                            <div style={styles.otpValue}>{otp}</div>
                            <div style={styles.otpWarning}>Do NOT share this OTP with anyone else</div>
                          </div>

                          <p style={styles.smallText}>
                            The delivery boy will enter this OTP on their device to confirm successful
                            delivery. If you did not place an order or don't expect a delivery, ignore
                            this email.
                          </p>
                        </td>
                      </tr>

                      {/* Footer */}
                      <tr>
                        <td style={styles.footer}>
                          <span style={styles.footerText}>Ekart — Your trusted shopping partner in India</span>
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

export default DeliveryOtpEmail;
