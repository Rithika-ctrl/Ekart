import React from 'react';

export default function BlockedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      background: 'linear-gradient(135deg, #fee 0%, #fdd 100%)',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '500px' }}>
        <div style={{ fontSize: '120px', marginBottom: '20px' }}>⛔</div>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#8b0000', margin: '0 0 10px 0' }}>
          Account Blocked
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px', lineHeight: '1.8' }}>
          Your account has been temporarily blocked. This may be due to:
        </p>
        <ul style={{ fontSize: '13px', color: '#666', textAlign: 'left', marginBottom: '30px', lineHeight: '1.8' }}>
          <li>Suspicious activity detected</li>
          <li>Multiple failed login attempts</li>
          <li>Policy violation</li>
          <li>Administrative action</li>
        </ul>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
          Please contact our support team for assistance.
        </p>
        <a
          href="mailto:support@ekart.com"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#f5a800',
            color: '#1a1000',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#d48f00'}
          onMouseLeave={(e) => e.target.style.background = '#f5a800'}
        >
          📧 Contact Support
        </a>
      </div>
    </div>
  );
}
