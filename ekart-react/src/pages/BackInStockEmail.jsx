import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * BackInStockEmail Component
 * * @param {Object} props
 * @param {string} props.customerName - Name of the customer to be greeted.
 * @param {string} props.productImage - URL of the product image.
 * @param {string} props.productName - Name of the product back in stock.
 * @param {number} props.productPrice - Price of the product.
 * @param {number} props.productStock - Current available stock units.
 * @param {number|string} props.productId - ID of the product for the link.
 */
export default function BackInStockEmail({
  customerName = "Customer",
  productImage = "",
  productName = "Product Name",
  productPrice = 0.00,
  productStock = 0,
  productId = ""
}) {
  const CSS = `
    .email-#root {
      margin: 0;
      padding: 0;
      background: #0a0c1e;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .main-table {
      background: #0a0c1e;
      padding: 40px 20px;
    }
    .container-table {
      background: linear-gradient(135deg, #111327, #0d1025);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      overflow: hidden;
      max-width: 600px;
    }
    .header-td {
      background: linear-gradient(135deg, #f5a800, #d48f00);
      padding: 32px 40px;
      text-align: center;
    }
    .header-emoji {
      font-size: 2rem;
      margin-bottom: 6px;
    }
    .header-title {
      margin: 0;
      color: #1a1000;
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .header-subtitle {
      margin: 6px 0 0;
      color: rgba(26, 16, 0, 0.75);
      font-size: 0.9rem;
    }
    .body-td {
      padding: 36px 40px;
    }
    .greeting-text {
      margin: 0 0 20px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.95rem;
      line-height: 1.6;
    }
    .intro-text {
      margin: 0 0 28px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
      line-height: 1.7;
    }
    .product-card {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 28px;
    }
    .product-img {
      width: 90px;
      height: 90px;
      object-fit: cover;
      border-radius: 10px;
      display: block;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .available-badge {
      color: rgba(245, 168, 0, 0.9);
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 5px;
    }
    .product-title {
      color: #ffffff;
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .product-price-text {
      color: #f5a800;
      font-size: 1.1rem;
      font-weight: 800;
    }
    .stock-indicator {
      margin-top: 5px;
      font-size: 0.75rem;
      color: #22c55e;
      font-weight: 600;
    }
    .cta-link {
      display: inline-block;
      background: linear-gradient(135deg, #f5a800, #d48f00);
      color: #1a1000;
      text-decoration: none;
      font-weight: 800;
      font-size: 0.95rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 14px 40px;
      border-radius: 50px;
      box-shadow: 0 8px 24px rgba(245, 168, 0, 0.35);
    }
    .urgency-table {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      margin-bottom: 24px;
    }
    .urgency-text {
      margin: 0;
      color: rgba(239, 68, 68, 0.9);
      font-size: 0.82rem;
      line-height: 1.5;
    }
    .disclaimer-text {
      margin: 0;
      color: rgba(255, 255, 255, 0.4);
      font-size: 0.78rem;
      line-height: 1.6;
    }
    .footer-td {
      background: rgba(0, 0, 0, 0.3);
      padding: 20px 40px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .footer-text {
      margin: 0;
      color: rgba(255, 255, 255, 0.3);
      font-size: 0.72rem;
    }
  `;

  return (
    <div className="email-body">
      <style>{CSS}</style>
      <table width="100%" cellPadding="0" cellSpacing="0" className="main-table">
        <tbody>
          <tr>
            <td align="center">
              <table width="600" cellPadding="0" cellSpacing="0" className="container-table">
                <tbody>
                  {/* Header */}
                  <tr>
                    <td className="header-td">
                      <div className="header-emoji">🎉</div>
                      <h1 className="header-title">It's Back in Stock!</h1>
                      <p className="header-subtitle">Great news — you asked, we delivered.</p>
                    </td>
                  </tr>

                  {/* Body */}
                  <tr>
                    <td className="body-td">
                      <p className="greeting-text">
                        Hi <strong>{customerName}</strong>,
                      </p>
                      <p className="intro-text">
                        The item you subscribed to is now available again on Ekart. Grab it before it sells out again — stock is limited!
                      </p>

                      {/* Product Card */}
                      <table width="100%" cellPadding="0" cellSpacing="0" className="product-card">
                        <tbody>
                          <tr>
                            {/* Product image */}
                            <td width="110" style={{ padding: '16px 0 16px 16px', verticalAlign: 'middle' }}>
                              <img
                                src={productImage}
                                alt="Product Image"
                                width="90"
                                height="90"
                                className="product-img"
                              />
                            </td>
                            {/* Product info */}
                            <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                              <div className="available-badge">Now Available</div>
                              <div className="product-title">{productName}</div>
                              <div className="product-price-text">
                                ₹{productPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="stock-indicator">
                                ✓ <span>{productStock}</span> units available now
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* CTA Button */}
                      <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '24px' }}>
                        <tbody>
                          <tr>
                            <td align="center">
                              <a
                                href={`/product/${productId}`}
                                className="cta-link"
                              >
                                🛒 Add to Cart Now
                              </a>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Urgency note */}
                      <table width="100%" cellPadding="0" cellSpacing="0" className="urgency-table">
                        <tbody>
                          <tr>
                            <td style={{ padding: '14px 18px' }}>
                              <p className="urgency-text">
                                <strong>⚡ Act fast!</strong> Other customers who subscribed are being notified at the same time. Stock may sell out quickly.
                              </p>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <p className="disclaimer-text">
                        You're receiving this email because you clicked "Notify Me" on this product at Ekart. If you no longer wish to receive these alerts, you can unsubscribe from the product page.
                      </p>
                    </td>
                  </tr>

                  {/* Footer */}
                  <tr>
                    <td className="footer-td">
                      <p className="footer-text">
                        © 2026 <strong style={{ color: '#f5a800' }}>Ekart</strong> — Your one-stop shopping destination
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}