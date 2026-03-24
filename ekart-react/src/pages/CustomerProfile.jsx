import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getStoredCustomer, clearToken, saveToken } from '../utils/api';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const customer = getStoredCustomer();
  const fileRef  = useRef();

  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewName, setPreviewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState({ name: '', mobile: '' });
  const [toast, setToast]           = useState({ type: 'success', message: '' });
  const [dragOver, setDragOver]     = useState(false);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast(p => ({ ...p, message: '' })), 3500);
    return () => clearTimeout(t);
  }, [toast.message]);

  // GET /api/flutter/profile
  useEffect(() => {
    if (!customer) { navigate('/login'); return; }
    api.get('/api/flutter/profile', { headers: { 'X-Customer-Id': customer.id } })
      .then(({ data }) => {
        if (data.success) {
          setProfile(data.profile);
          setEditForm({ name: data.profile.name || '', mobile: data.profile.mobile || '' });
        }
      })
      .catch(() => setToast({ type: 'danger', message: 'Failed to load profile.' }))
      .finally(() => setLoading(false));
  }, [customer, navigate]);

  const handleLogout = () => { clearToken(); navigate('/login'); };

  // File select / drag-drop
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setToast({ type: 'danger', message: 'Please select a valid image (JPG, PNG, WEBP).' }); return; }
    if (file.size > 5 * 1024 * 1024)    { setToast({ type: 'danger', message: 'Image must be under 5 MB.' }); return; }
    setSelectedFile(file);
    setPreviewName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  // POST /customer/upload-profile-image  (multipart — uses Spring MVC endpoint)
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('profileImage', selectedFile);
    try {
      await api.post('/customer/upload-profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setToast({ type: 'success', message: 'Profile photo updated!' });
      setPreviewSrc(null); setSelectedFile(null); setPreviewName('');
      // Refresh profile
      const { data } = await api.get('/api/flutter/profile', { headers: { 'X-Customer-Id': customer.id } });
      if (data.success) setProfile(data.profile);
    } catch {
      setToast({ type: 'danger', message: 'Upload failed. Try again.' });
    } finally {
      setUploading(false);
    }
  };

  // PUT /api/flutter/profile/update
  const handleSaveProfile = async () => {
    try {
      const { data } = await api.put('/api/flutter/profile/update',
        { name: editForm.name, mobile: editForm.mobile },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      if (data.success) {
        setProfile(p => ({ ...p, name: editForm.name, mobile: editForm.mobile }));
        // Update localStorage
        const updated = { ...customer, name: editForm.name };
        saveToken(localStorage.getItem('ekart_token'), updated);
        setEditing(false);
        setToast({ type: 'success', message: 'Profile updated successfully!' });
      } else {
        setToast({ type: 'danger', message: data.message || 'Update failed.' });
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Update failed.' });
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,20,1)', color: '#fff', fontFamily: 'Poppins,sans-serif' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#f5a800' }} />
    </div>
  );

  const avatarSrc = previewSrc || profile?.profileImage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Poppins,sans-serif', color: '#fff' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: -20, background: "url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat", filter: 'blur(6px)', transform: 'scale(1.08)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(5,8,20,.85) 0%,rgba(8,12,28,.80) 100%)' }} />
      </div>

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.22)' }}>
        <Link to="/home" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          🛒 E<span style={{ color: '#f5a800' }}>kart</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, padding: '0.4rem 0.9rem', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '50px', backdropFilter: 'blur(8px)' }}>
            <i className="fas fa-arrow-left" /> Back to Home
          </Link>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid rgba(255,100,80,0.3)', color: 'rgba(255,100,80,0.8)', padding: '0.4rem 0.9rem', borderRadius: '50px', fontFamily: 'Poppins,sans-serif', fontSize: '0.9rem', cursor: 'pointer' }}>
            <i className="fas fa-sign-out-alt" /> Logout
          </button>
        </div>
      </nav>

      {/* Toast */}
      {toast.message && (
        <div style={{ position: 'fixed', top: '80px', right: '1.5rem', zIndex: 200, width: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1.1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 500, backdropFilter: 'blur(12px)', border: '1px solid', background: toast.type === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)', borderColor: toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)', color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5' }}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            <span>{toast.message}</span>
            <button onClick={() => setToast(p => ({ ...p, message: '' }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, fontSize: '1rem' }}>×</button>
          </div>
        </div>
      )}

      <main style={{ marginTop: 70, flex: 1, padding: '2.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Avatar Card */}
          <div style={card}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
              <div style={{ position: 'relative', width: 150, height: 150 }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', border: '3px solid #f5a800', boxShadow: '0 0 30px rgba(245,168,0,0.35)' }} />
                ) : (
                  <div style={{ width: 150, height: 150, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(245,168,0,0.25),rgba(245,168,0,0.08))', border: '3px solid #f5a800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', boxShadow: '0 0 30px rgba(245,168,0,0.25)' }}>👤</div>
                )}
                <label htmlFor="imageFileInput" style={{ position: 'absolute', bottom: 6, right: 6, width: 36, height: 36, background: '#f5a800', border: '2px solid rgba(0,0,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <i className="fas fa-pencil-alt" style={{ color: '#000', fontSize: '0.75rem' }} />
                </label>
                <input id="imageFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" ref={fileRef} style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile?.name}</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Upload Card */}
          <div style={card}>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fas fa-camera" style={{ color: '#f5a800' }} /> Update Profile Photo
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? '#f5a800' : 'rgba(255,255,255,0.22)'}`, borderRadius: 16, padding: '2rem 1.5rem', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(245,168,0,0.06)' : 'transparent', transition: 'all 0.2s' }}
            >
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2.5rem', color: '#f5a800', opacity: 0.8, marginBottom: '0.75rem', display: 'block' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Drag &amp; drop your photo here</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>or click to browse — JPG, PNG, WEBP up to 5 MB</p>
            </div>

            {/* Preview */}
            {previewSrc && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1.2rem' }}>
                <img src={previewSrc} alt="Preview" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f5a800' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{previewName}</p>
              </div>
            )}

            {/* Tips */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {['Square photos work best', 'Max 5 MB', 'JPG / PNG / WEBP'].map(t => (
                <span key={t} style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50px', color: 'rgba(255,255,255,0.5)' }}>
                  <i className="fas fa-check" style={{ color: '#f5a800', marginRight: '0.25rem' }} />{t}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
              <button onClick={handleUpload} disabled={!selectedFile || uploading} style={{ flex: 1, minWidth: 140, padding: '0.75rem 1.5rem', background: '#f5a800', color: '#000', border: 'none', borderRadius: '50px', fontFamily: 'Poppins,sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed', opacity: !selectedFile || uploading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {uploading ? <><i className="fas fa-spinner fa-spin" /> Uploading…</> : <><i className="fas fa-upload" /> Upload Photo</>}
              </button>
              {profile?.profileImage && (
                <button onClick={async () => {
                  try {
                    await api.get('/customer/remove-profile-image');
                    setProfile(p => ({ ...p, profileImage: null }));
                    setToast({ type: 'success', message: 'Profile photo removed.' });
                  } catch { setToast({ type: 'danger', message: 'Could not remove photo.' }); }
                }} style={{ padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '50px', fontFamily: 'Poppins,sans-serif', fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-trash-alt" /> Remove Photo
                </button>
              )}
            </div>
          </div>

          {/* Account Details Card */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fas fa-user-circle" style={{ color: '#f5a800' }} /> Account Details
              </div>
              <button onClick={() => setEditing(e => !e)} style={{ background: 'rgba(245,168,0,0.12)', border: '1px solid rgba(245,168,0,0.3)', color: '#f5a800', padding: '0.4rem 1rem', borderRadius: '50px', fontFamily: 'Poppins,sans-serif', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                <i className={`fas ${editing ? 'fa-times' : 'fa-pen'}`} /> {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: 'Full Name', key: 'name', icon: 'fa-user', type: 'text' },
                  { label: 'Mobile Number', key: 'mobile', icon: 'fa-phone', type: 'tel' },
                ].map(({ label, key, icon, type }) => (
                  <div key={key}>
                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <i className={`fas ${icon}`} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#f5a800', fontSize: '0.85rem' }} />
                      <input type={type} value={editForm[key]} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,168,0,0.4)', borderRadius: '10px', padding: '0.75rem 0.875rem 0.75rem 2.5rem', fontFamily: 'Poppins,sans-serif', fontSize: '0.875rem', color: '#fff', outline: 'none' }} />
                    </div>
                  </div>
                ))}
                <button onClick={handleSaveProfile} style={{ background: '#f5a800', color: '#000', border: 'none', borderRadius: '50px', padding: '0.75rem', fontFamily: 'Poppins,sans-serif', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-save" /> Save Changes
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {[
                  { label: 'Full Name',      value: profile?.name,   icon: 'fa-user'        },
                  { label: 'Email Address',  value: profile?.email,  icon: 'fa-envelope'    },
                  { label: 'Mobile Number',  value: profile?.mobile, icon: 'fa-phone'       },
                  { label: 'Account Status', value: profile?.active !== false ? 'Active ✅' : 'Suspended ❌', icon: 'fa-check-circle' },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(245,168,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fas ${icon}`} style={{ color: '#f5a800', fontSize: '0.9rem' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.1rem' }}>{label}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 500 }}>{value || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { to: '/orders',       icon: 'fa-box',       label: 'My Orders'  },
              { to: '/wishlist',     icon: 'fa-heart',     label: 'Wishlist'   },
              { to: '/order-history',icon: 'fa-history',   label: 'History'    },
            ].map(({ to, icon, label }) => (
              <Link key={to} to={to} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>
                <i className={`fas ${icon}`} style={{ color: '#f5a800' }} /> {label}
              </Link>
            ))}
          </div>

        </div>
      </main>

      <footer style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.22)', padding: '1.25rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Ek<span style={{ color: '#f5a800' }}>art</span></div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>© 2026 Ekart. All rights reserved.</div>
      </footer>
    </div>
  );
}

const card = { background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '20px', backdropFilter: 'blur(16px)', padding: '2.5rem 2rem' };