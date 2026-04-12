import React, { useState } from 'react';
import CsvPreview from '../components/CsvPreview';

export default function VendorCsvUpload({ api, auth }) {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const sampleCsv = [
    'id,name,description,price,mrp,category,stock,imageLink,stockAlertThreshold,gstRate,allowedPinCodes',
    '"","Protein Bar 6-Pack","High-protein snack bar combo",449,599,"Snacks",120,"https://example.com/protein-bar.jpg",20,12,"400001,400002,400003"',
    '"","Steel Water Bottle 1L","Insulated reusable bottle",699,899,"Home & Kitchen",60,"https://example.com/bottle.jpg",15,18,"560001,560002"'
  ].join('\n');

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) { setHeaders([]); setRows([]); return; }
    const parseLine = (line) => {
      const out = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) { out.push(cur); cur = ''; }
        else cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim().replace(/^"|"$/g, ''));
    };
    const header = parseLine(lines[0]).map(h => h.trim());
    const data = lines.slice(1).map(l => {
      const vals = parseLine(l);
      const obj = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = vals[i] ?? '';
      return obj;
    });
    setHeaders(header); setRows(data);
  };

  const handleFile = (f) => {
    setFile(f); setResult(null); setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      parseCsv(e.target.result);
    };
    reader.onerror = (e) => setError('Failed to read file');
    reader.readAsText(f);
  };

  const upload = async () => {
    if (!file) { setError('Select a CSV file first'); return; }
    setUploading(true); setError(''); setResult(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const headers = {};
      if (auth?.token)              headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth?.role === 'VENDOR')  headers['X-Vendor-Id']   = auth.id;
      const res = await fetch('/api/react/vendor/products/upload-csv', { method: 'POST', body: fd, headers });
      
      if (!res.ok) {
        setError(`Upload failed: HTTP ${res.status}`);
        setUploading(false);
        return;
      }
      
      let d;
      try {
        d = await res.json();
      } catch (parseError) {
        setError('Upload response invalid (not JSON)');
        setUploading(false);
        return;
      }
      
      setResult(d);
      if (!d.success && !d.message) {
        setError('Upload failed: No response message');
      }
    } catch (e) { 
      setError(`Upload failed: ${e.message || 'Network error'}`);
    }
    setUploading(false);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ marginBottom: 12 }}>Vendor CSV Upload — Bulk Product Import</h2>
      <p style={{ color: '#6b7280', marginBottom: 8 }}>
        Upload CSV/PIM in Add Product format. Required fields: <strong>name, price, stock</strong>.
      </p>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 12, fontSize: 13 }}>
        Supported columns: id, name, description, price, mrp, category, stock, imageLink, stockAlertThreshold, gstRate, allowedPinCodes.
        {' '}<a href={'data:text/csv;charset=utf-8,' + encodeURIComponent(sampleCsv)} download="vendor-product-import-template.csv">Download sample template</a>
        {' '}or <a href="/sample-product-upload.csv" target="_blank" rel="noopener noreferrer" download="sample-product-upload.csv">view legacy sample</a>
      </p>
      <div style={{ marginBottom: 12 }}>
        <input type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files && e.target.files[0]; if (f) handleFile(f); }} />
      </div>
      {error && <div style={{ color: 'tomato', marginBottom: 8 }}>{error}</div>}
      <div style={{ marginBottom: 12 }}>
        <CsvPreview headers={headers} rows={rows.slice(0, 20)} />
        {rows.length > 20 && <div style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>Showing first 20 of {rows.length} rows</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ padding: '8px 14px' }} onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload CSV'}</button>
        <button style={{ padding: '8px 14px' }} onClick={() => { setFile(null); setHeaders([]); setRows([]); setResult(null); }}>Clear</button>
      </div>
      {result && (
        <div style={{ marginTop: 16, background: (result.success && (result.created > 0 || result.updated > 0)) ? '#f0fdf4' : '#fef2f2', padding: 12, borderRadius: 8, border: `1px solid ${(result.success && (result.created > 0 || result.updated > 0)) ? '#86efac' : '#fecaca'}` }}>
          <div><strong>{(result.success && (result.created > 0 || result.updated > 0)) ? '✓ Upload Successful' : result.success ? '⚠ Partial Upload' : '✗ Upload Failed'}</strong></div>
          {result.message && <div style={{ marginTop: 4, fontSize: 14, color: '#666' }}>{result.message}</div>}
          {(result.created > 0 || result.updated > 0) && (
            <div style={{ marginTop: 8, fontSize: 14 }}>
              {result.created > 0 && <div style={{ color: '#16a34a' }}>✓ Created: {result.created} products</div>}
              {result.updated > 0 && <div style={{ color: '#2563eb' }}>↻ Updated: {result.updated} products</div>}
            </div>
          )}
          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: 8, background: '#fff7ed', padding: 8, borderRadius: 4, borderLeft: '3px solid #f97316' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#92400e', marginBottom: 6 }}>⚠ {result.errors.length} Error{result.errors.length !== 1 ? 's' : ''}:</div>
              <div style={{ fontSize: 12, color: '#b45309', maxHeight: 150, overflowY: 'auto' }}>
                {result.errors.slice(0, 10).map((err, i) => (
                  <div key={i} style={{ marginBottom: 3 }}>• {err}</div>
                ))}
                {result.errors.length > 10 && <div style={{ marginTop: 6, fontStyle: 'italic' }}>...and {result.errors.length - 10} more errors</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}