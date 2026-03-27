import { useState } from 'react';

// Lightweight map/address picker using OpenStreetMap Nominatim (no external libs)
// Props:
// - onSelect({ display_name, lat, lon, address }) called when user selects an address
// - placeholder: optional input placeholder
export default function AddressMap({ onSelect, placeholder = 'Search for an address or place' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const search = async () => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true); setErr('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setResults(data || []);
    } catch (e) {
      setErr('Search failed');
    } finally { setLoading(false); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setErr('Geolocation not supported'); return; }
    setErr('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude; const lon = pos.coords.longitude;
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data) {
          setResults([{ display_name: data.display_name, lat: data.lat, lon: data.lon, address: data.address }]);
        }
      } catch (e) { setErr('Reverse geocode failed'); }
    }, (err) => { setErr('Location permission denied'); });
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} style={{ flex: 1, padding: 8 }} />
        <button onClick={search} style={{ padding: '8px 12px' }}>{loading ? 'Searching...' : 'Search'}</button>
        <button onClick={useMyLocation} style={{ padding: '8px 12px' }}>Use my location</button>
      </div>
      {err && <div style={{ color: 'tomato', marginBottom: 8 }}>{err}</div>}
      <div style={{ maxHeight: 180, overflow: 'auto', borderRadius: 6 }}>
        {results.map(r => (
          <div key={`${r.lat}-${r.lon}`} onClick={() => onSelect && onSelect(r)}
            style={{ padding: 8, borderBottom: '1px solid #eee', cursor: 'pointer', background: '#fff' }}>
            <div style={{ fontSize: 14, color: '#111' }}>{r.display_name}</div>
            {r.address && <div style={{ fontSize: 12, color: '#666' }}>{r.address.city || r.address.town || r.address.village || r.address.county || ''} {r.address.postcode ? `• ${r.address.postcode}` : ''}</div>}
          </div>
        ))}
        {results.length === 0 && <div style={{ color: '#666', fontSize: 13, padding: 8 }}>No results</div>}
      </div>
    </div>
  );
}
