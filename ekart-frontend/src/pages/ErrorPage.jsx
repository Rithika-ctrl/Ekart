import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ErrorPage() {
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
        <div style={{ fontSize: '120px', marginBottom: '20px' }}>⚠️</div>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#0d0d0d', margin: '0 0 10px 0' }}>
          500
        </h1>
        <p style={{ fontSize: '24px', color: '#555', margin: '0 0 20px 0' }}>
          Server Error
        </p>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '30px', lineHeight: '1.6' }}>
          Something went wrong on our end. Our team has been notified and is working to fix the issue.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.location.reload()}
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
            🔄 Try Again
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#0d0d0d',
              border: '1px solid #ccc',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.background = '#f2f0eb'; e.target.style.borderColor = '#999'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = '#ccc'; }}
          >
            ← Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
