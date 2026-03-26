import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * ShippedEmail Component
 * * @param {Object} props
 * @param {string} props.name - Customer name
 * @param {string|number} props.orderId - Unique order ID
 * @param {string} props.deliveryBoyName - Name of the assigned delivery partner
 * @param {string} props.currentCity - Current location/city of the shipment
 * @param {Array} props.items - List of items in the order [{name, quantity, unitPrice}]
 */
export default function ShippedEmail({
  name = "Customer",
  orderId = "Order",
  deliveryBoyName = "Delivery Boy",
  currentCity = "City",
  items = []
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
                      <span style={{ color: '#9ca3af', fontSize: '0.9rem', marginLeft: '12px' }}> Order Update</span>
                    </td>
                  </tr>

                  {/* Body Content */}
                  <tr>
                    <td style={{ padding: '32px' }}>
                      <p style={{ margin: '0 0 8px', color: '#374151', fontSize: '1rem' }}>
                        Hi <strong>{name}</strong>,
                      </p>
                      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '0.9rem' }}>
                        Great news! Your order <strong>#{orderId}</strong> has been picked up and is on its way to you.
                      </p>

                      {/* Shipment Status Box */}
                      <div
                        style={{
                          background: '#dbeafe',
                          borderRadius: '10px',
                          padding: '20px 24px',
                          margin: '0 0 24px'
                        }}
                      >
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                          🚚 Your order is shipped!
                        </div>
                        <div style={{ color: '#1d4ed8', fontSize: '0.88rem' }}>
                          Delivery by: <strong>{deliveryBoyName}</strong>
                        </div>
                        <div style={{ color: '#1d4ed8', fontSize: '0.88rem', marginTop: '4px' }}>
                          Current location: <strong>{currentCity}</strong>
                        </div>
                      </div>

                      {/* Items List */}
                      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151', marginBottom: '10px' }}>
                          Items in this order:
                        </div>
                        {items.map((item, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '4px 0',
                              fontSize: '0.85rem',
                              color: '#4b5563',
                              borderBottom: '1px solid #e5e7eb'
                            }}
                          >
                            <span>{item.name} × {item.quantity}</span>
                            <span>₹{(item.unitPrice * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>

                      <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
                        You will receive a delivery OTP via email when the delivery boy reaches your location. Please keep it ready.
                      </p>
                    </td>
                  </tr>

                  {/* Footer Actions */}
                  <tr>
                    <td style={{ background: '#f9fafb', padding: '20px 32px', textAlign: 'center' }}>
                      <a
                        to="/view-orders"
                        style={{
                          background: '#f5a623',
                          color: '#1a1a2e',
                          textDecoration: 'none',
                          padding: '10px 24px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          display: 'inline-block'
                        }}
                      >
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
    </div>
  );
}