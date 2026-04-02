import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      background: 'linear-gradient(135deg, #f2f0eb 0%, #e8e6df 100%)',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '500px' }}>
        <div style={{ fontSize: '120px', marginBottom: '20px' }}>🔒</div>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#0d0d0d', margin: '0 0 10px 0' }}>
          403
        </h1>
        <p style={{ fontSize: '24px', color: '#555', margin: '0 0 20px 0' }}>
          Access Forbidden
        </p>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '30px', lineHeight: '1.6' }}>
          You don't have permission to access this page. If you believe this is an error, please contact support.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              padding: '12px 24px',
              background: '#f5a800',
              color: '#1a1000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#d48f00'}
            onMouseLeave={(e) => e.target.style.background = '#f5a800'}
          >
            ← Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
