import React from 'react';

/**
 * DeliveredEmail Component
 * * @param {Object} props
 * @param {string} props.name - Name of the customer
 * @param {string|number} props.orderId - Unique order identifier
 * @param {number} props.amount - Total amount paid for the order
 * @param {Array} props.items - List of items delivered in this order
 * @param {string} props.items[].name - Name of the individual product
 * @param {number} props.items[].quantity - Quantity of the individual product
 * @param {number} props.items[].unitPrice - Unit price of the individual product
 */
export default function DeliveredEmail({
  name = "Customer",
  orderId = "Order",
  amount = 0,
  items = []
}) {
  const CSS = `
    .email-body {
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
              <table width="520" cellPadding="0" cellSpacing="0" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <tbody>
                  {/* Header */}
                  <tr>
                    <td style={{ background: '#1a1a2e', padding: '28px 32px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f5a623' }}>Ekart</span>
                      <span style={{ color: '#9ca3af', fontSize: 0.9 + 'rem', marginLeft: '12px' }}>Delivery Confirmed</span>
                    </td>
                  </tr>

                  {/* Body Content */}
                  <tr>
                    <td style={{ padding: '32px' }}>
                      <p style={{ margin: '0 0 8px', color: '#374151', fontSize: '1rem' }}>
                        Hi <strong>{name}</strong>,
                      </p>
                      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 0.9 + 'rem' }}>
                        Your order <strong>#{orderId}</strong> has been delivered successfully. We hope you love your purchase!
                      </p>

                      {/* Delivered Status Box */}
                      <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '20px 24px', textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '2.5rem' }}>✅</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#15803d', marginTop: '8px' }}>Delivered!</div>
                        <div style={{ color: '#166534', fontSize: 0.88 + 'rem', marginTop: '4px' }}>
                          Order #{orderId}
                        </div>
                        <div style={{ color: '#166534', fontSize: 0.88 + 'rem' }}>
                          Total paid: ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Delivered Items List */}
                      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                        <div style={{ fontWeight: 600, fontSize: 0.88 + 'rem', color: '#374151', marginBottom: '10px' }}>Items delivered:</div>
                        {items.map((item, index) => (
                          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 0.85 + 'rem', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>
                            <span>{item.name} × {item.quantity}</span>
                            <span>₹{(item.unitPrice * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>

                      <p style={{ color: '#6b7280', fontSize: 0.85 + 'rem', margin: '0 0 8px' }}>
                        Something wrong? You can request a replacement or refund within <strong>7 days</strong> from your order history page.
                      </p>
                      <p style={{ color: '#6b7280', fontSize: 0.85 + 'rem', margin: 0 }}>
                        Love your purchase? Leave a review to help other shoppers!
                      </p>
                    </td>
                  </tr>

                  {/* Footer Actions */}
                  <tr>
                    <td style={{ background: '#f9fafb', padding: '20px 32px', textAlign: 'center' }}>
                      <a href="/customer/view-products" style={{ background: '#f5a623', color: '#1a1a2e', textDecoration: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, fontSize: 0.88 + 'rem', marginRight: '12px', display: 'inline-block' }}>
                        Shop Again
                      </a>
                      <a href="/view-orders" style={{ background: '#1a1a2e', color: 'white', textDecoration: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, fontSize: 0.88 + 'rem', display: 'inline-block' }}>
                        My Orders
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