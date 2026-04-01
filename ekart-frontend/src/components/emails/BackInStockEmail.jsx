/**
 * BackInStockEmail Component
 * Product back in stock notification email
 * Props: { customerName, productName, productImage, productPrice, productStock, productId }
 */

export const BackInStockEmail = ({ 
  customerName = 'Customer',
  productName = 'Awesome Product',
  productImage = '/product.jpg',
  productPrice = 999.99,
  productStock = 5,
  productId = '12345'
}) => {
  const styles = {
    root: {
      margin: 0,
      padding: 0,
      background: '#0a0c1e',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    },
    table: {
      width: '100%',
      cellPadding: 0,
      cellSpacing: 0,
      background: '#0a0c1e',
      padding: '40px 20px',
    },
    outerTd: {
      textAlign: 'center',
    },
    mainTable: {
      width: '600px',
      maxWidth: '600px',
      background: 'linear-gradient(135deg, #111327, #0d1025)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '20px',
      overflow: 'hidden',
      margin: '0 auto',
    },
    header: {
      background: 'linear-gradient(135deg, #f5a800, #d48f00)',
      padding: '32px 40px',
      textAlign: 'center',
    },
    headerEmoji: {
      fontSize: '2rem',
      marginBottom: '6px',
    },
    headerTitle: {
      margin: 0,
      color: '#1a1000',
      fontSize: '1.5rem',
      fontWeight: 800,
      letterSpacing: '0.04em',
    },
    headerSubtitle: {
      margin: '6px 0 0',
      color: 'rgba(26,16,0,0.75)',
      fontSize: '0.9rem',
    },
    body: {
      padding: '36px 40px',
    },
    greeting: {
      margin: '0 0 20px',
      color: 'rgba(255,255,255,0.85)',
      fontSize: '0.95rem',
      lineHeight: 1.6,
    },
    introText: {
      margin: '0 0 28px',
      color: 'rgba(255,255,255,0.7)',
      fontSize: '0.9rem',
      lineHeight: 1.7,
    },
    productCard: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '28px',
      display: 'flex',
    },
    productImage: {
      width: '110px',
      padding: '16px 0 16px 16px',
      verticalAlign: 'middle',
    },
    productImg: {
      width: '90px',
      height: '90px',
      objectFit: 'cover',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'block',
    },
    productInfo: {
      padding: '16px 20px',
      verticalAlign: 'middle',
      flex: 1,
    },
    badge: {
      color: 'rgba(245,168,0,0.9)',
      fontSize: '0.65rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: '5px',
    },
    productTitle: {
      color: '#ffffff',
      fontSize: '1rem',
      fontWeight: 700,
      marginBottom: '6px',
    },
    productPrice: {
      color: '#f5a800',
      fontSize: '1.1rem',
      fontWeight: 800,
    },
    stockInfo: {
      marginTop: '5px',
      fontSize: '0.75rem',
      color: '#22c55e',
      fontWeight: 600,
    },
    ctaButton: {
      display: 'inline-block',
      background: 'linear-gradient(135deg, #f5a800, #d48f00)',
      color: '#1a1000',
      textDecoration: 'none',
      fontWeight: 800,
      fontSize: '0.95rem',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      padding: '14px 40px',
      borderRadius: '50px',
      boxShadow: '0 8px 24px rgba(245,168,0,0.35)',
    },
    urgencyBox: {
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '10px',
      marginBottom: '24px',
      padding: '14px 18px',
    },
    urgencyText: {
      margin: 0,
      color: 'rgba(239,68,68,0.9)',
      fontSize: '0.82rem',
      lineHeight: 1.5,
    },
    footer: {
      background: 'rgba(0,0,0,0.3)',
      padding: '20px 40px',
      textAlign: 'center',
      borderTop: '1px solid rgba(255,255,255,0.08)',
    },
    footerText: {
      margin: 0,
      color: 'rgba(255,255,255,0.3)',
      fontSize: '0.72rem',
    },
    ctaParagraph: {
      marginBottom: '24px',
      textAlign: 'center',
    },
    disclaimerText: {
      margin: 0,
      color: 'rgba(255,255,255,0.4)',
      fontSize: '0.78rem',
      lineHeight: 1.6,
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
                    <tbody>
                      {/* Header */}
                      <tr>
                        <td style={styles.header}>
                          <div style={styles.headerEmoji}>🎉</div>
                          <h1 style={styles.headerTitle}>It's Back in Stock!</h1>
                          <p style={styles.headerSubtitle}>Great news — you asked, we delivered.</p>
                        </td>
                      </tr>

                      {/* Body */}
                      <tr>
                        <td style={styles.body}>
                          <p style={styles.greeting}>
                            Hi <strong>{customerName}</strong>,
                          </p>
                          <p style={styles.introText}>
                            The item you subscribed to is now available again on Ekart. Grab it before
                            it sells out again — stock is limited!
                          </p>

                          {/* Product Card */}
                          <div style={{ ...styles.productCard, display: 'table', width: '100%' }}>
                            <div style={{ ...styles.productImage, display: 'table-cell' }}>
                              <img
                                src={productImage}
                                alt="Product"
                                style={styles.productImg}
                              />
                            </div>
                            <div style={{ ...styles.productInfo, display: 'table-cell' }}>
                              <div style={styles.badge}>Now Available</div>
                              <div style={styles.productTitle}>{productName}</div>
                              <div style={styles.productPrice}>
                                ₹{(productPrice).toFixed(2)}
                              </div>
                              <div style={styles.stockInfo}>
                                ✓ {productStock} units available now
                              </div>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <div style={styles.ctaParagraph}>
                            <a
                              href={`/product/${productId}`}
                              style={styles.ctaButton}
                            >
                              🛒 Add to Cart Now
                            </a>
                          </div>

                          {/* Urgency Note */}
                          <div style={styles.urgencyBox}>
                            <p style={styles.urgencyText}>
                              <strong>⚡ Act fast!</strong> Other customers who subscribed are being
                              notified at the same time. Stock may sell out quickly.
                            </p>
                          </div>

                          <p style={styles.disclaimerText}>
                            You're receiving this email because you clicked "Notify Me" on this product
                            at Ekart. If you no longer wish to receive these alerts, you can unsubscribe
                            from the product page.
                          </p>
                        </td>
                      </tr>

                      {/* Footer */}
                      <tr>
                        <td style={styles.footer}>
                          <p style={styles.footerText}>
                            © 2026 <strong style={{ color: '#f5a800' }}>Ekart</strong> — Your one-stop
                            shopping destination
                          </p>
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

export default BackInStockEmail;
