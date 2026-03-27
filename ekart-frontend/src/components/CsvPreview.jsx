import React from 'react';

export default function CsvPreview({ headers = [], rows = [] }) {
  if (!rows || rows.length === 0) return <div style={{ color: '#6b7280' }}>No rows to preview</div>;
  return (
    <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, padding: 8, border: '1px solid #e6e6e6' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr>
            {headers.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #eee', background: '#f8fafc' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {headers.map((h, ci) => <td key={ci} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{r[h] ?? ''}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
