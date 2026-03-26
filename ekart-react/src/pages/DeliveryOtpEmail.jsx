import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * DeliveryOtpEmail Component
 * * @param {Object} props
 * @param {string} props.name - The name of the customer to be greeted.
 * @param {string|number} props.orderId - The unique order identifier.
 * @param {string|number} props.otp - The 6-digit delivery verification code.
 */
export default function DeliveryOtpEmail({
  name = "Customer",
  orderId = "Order",
  otp = "123456"
}) {
  const CSS = `
    .email-#root {
      margin: 0;
      padding: 0;
      background: #f4f6f8;
      font-family: Arial, sans-serif;
    }
  `;

  return (
    <div className="email-body">
      <style>{CSS}</style>
      <table width="100%" cellPadding="0" cellSpacing="0">
        <tbody>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table
                width="520"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                <tbody>
                  {/* Header */}
                  <tr>
                    <td style={{ background: '#1a1a2e', padding: '28px 32px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f5a623' }}>Ekart</span>
                      <span style={{ color: '#9ca3af', fontSize: '0.9rem', marginLeft: '12px' }}>
                        Delivery Notification
                      </span>
                    </td>
                  </tr>

                  {/* Body */}
                  <tr>
                    <td style={{ padding: '32px' }}>
                      <p style={{ margin: '0 0 8px', color: '#374151', fontSize: '1rem' }}>
                        Hi <strong>{name}</strong>,
                      </p>
                      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '0.9rem' }}>
                        Your order <strong>#{orderId}</strong> is{' '}
                        <span style={{ color: '#f5a623', fontWeight: 700 }}>Out for Delivery</span> right now! 
                        Your delivery boy is on the way.
                      </p>

                      {/* OTP Box */}
                      <div
                        style={{
                          background: '#fef9c3',
                          border: '2px dashed #f5a623',
                          borderRadius: '12px',
                          padding: '28px',
                          textAlign: 'center',
                          margin: '0 0 24px'
                        }}
                      >
                        <div style={{ color: '#854d0e', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                          DELIVERY OTP — Share this with delivery boy only
                        </div>
                        <div
                          style={{
                            fontSize: '3rem',
                            fontWeight: 900,
                            letterSpacing: '0.3em',
                            color: '#1a1a2e'
                          }}
                        >
                          {otp}
                        </div>
                        <div style={{ color: '#92400e', fontSize: '0.78rem', marginTop: '8px' }}>
                          Do NOT share this OTP with anyone else
                        </div>
                      </div>

                      <p style={{ margin: '0 0 8px', color: '#374151', fontSize: '0.88rem' }}>
                        The delivery boy will enter this OTP on their device to confirm successful delivery. 
                        If you did not place an order or don't expect a delivery, ignore this email.
                      </p>
                    </td>
                  </tr>

                  {/* Footer */}
                  <tr>
                    <td style={{ background: '#f9fafb', padding: '20px 32px', textAlign: 'center' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>
                        Ekart — Your trusted shopping partner in India
                      </span>
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