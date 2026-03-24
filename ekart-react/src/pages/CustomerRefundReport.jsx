import React, { useState, useEffect, useRef } from 'react';

const CustomerRefundReport = ({ 
  orderId, 
  refundId = null, 
  sessionSuccess, 
  sessionFailure 
}) => {
  // --- State ---
  const [alerts, setAlerts] = useState({
    success: sessionSuccess,
    failure: sessionFailure
  });
  
  const [scrolled, setScrolled] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  
  // Lightbox State
  const [lightbox, setLightbox] = useState({ open: false, src: '' });

  const fileInputRef = useRef(null);

  // --- Effects ---
  
  // Handle Scroll for Nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-dismiss Alerts
  useEffect(() => {
    const timer = setTimeout(() => {
      setAlerts({ success: null, failure: null });
    }, 2500);
    return () => clearTimeout(timer);
  }, [sessionSuccess, sessionFailure]);

  // Fetch Existing Images if refundId exists
  useEffect(() => {
    if (refundId) {
      fetch(`/customer/refund/${refundId}/images`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.count > 0) {
            setExistingImages(data.images);
          }
        })
        .catch(() => console.error("Failed to load existing images."));
    }
  }, [refundId]);

  // Generate and cleanup object URLs for image previews
  useEffect(() => {
    const objectUrls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(objectUrls);

    // Free memory when component unmounts or files change
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);


  // --- Handlers ---

  const handleFiles = (incomingFiles) => {
    const valid = Array.from(incomingFiles).filter(f => 
      f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
    );
    
    setSelectedFiles(prev => {
      // Limit to max 5 files total
      const combined = [...prev, ...valid].slice(0, 5);
      
      // Sync the actual hidden file input with our state using DataTransfer
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        combined.forEach(file => dataTransfer.items.add(file));
        fileInputRef.current.files = dataTransfer.files;
      }
      
      return combined;
    });
  };

  const onFileSelect = (e) => {
    handleFiles(e.target.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (indexToRemove, e) => {
    e.preventDefault(); // Prevent form submission
    setSelectedFiles(prev => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        updated.forEach(file => dataTransfer.items.add(file));
        fileInputRef.current.files = dataTransfer.files;
      }
      
      return updated;
    });
  };

  const openLightbox = (src) => setLightbox({ open: true, src });
  const closeLightbox = () => setLightbox({ open: false, src: '' });

  return (
    <>
      {/* Embedded CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255,255,255,0.18);
            --glass-card:   rgba(255,255,255,0.08);
            --glass-nav:    rgba(0,0,0,0.28);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }

        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; }
        body { font-family:'Poppins',sans-serif; min-height:100vh; color:var(--text-white); display:flex; flex-direction:column; background:#060a18; }

        .bg-layer { position:fixed; inset:0; z-index:-1; overflow:hidden; }
        .bg-layer::before {
            content:''; position:absolute; inset:-20px;
            background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter:blur(6px); transform:scale(1.08);
        }
        .bg-layer::after {
            content:''; position:absolute; inset:0;
            background:linear-gradient(180deg,rgba(5,8,20,0.85) 0%,rgba(8,12,28,0.80) 40%,rgba(5,8,20,0.92) 100%);
        }

        /* NAV */
        nav {
            position:fixed; top:0; left:0; right:0; z-index:100;
            padding:0.75rem 2rem; display:flex; align-items:center; justify-content:space-between;
            background:var(--glass-nav); backdrop-filter:blur(14px);
            border-bottom:1px solid var(--glass-border); gap:1rem; transition:background 0.3s;
        }
        nav.scrolled { background:rgba(0,0,0,0.5); }
        .nav-brand { font-size:1.5rem; font-weight:700; color:var(--text-white); text-decoration:none; letter-spacing:0.04em; display:flex; align-items:center; gap:0.45rem; }
        .nav-brand span { color:var(--yellow); }
        .nav-right { display:flex; align-items:center; gap:0.5rem; }
        .nav-link { display:flex; align-items:center; gap:0.35rem; color:var(--text-light); text-decoration:none; font-size:0.78rem; font-weight:500; padding:0.42rem 0.75rem; border-radius:6px; border:1px solid transparent; transition:all 0.2s; white-space:nowrap; }
        .nav-link:hover { color:white; background:rgba(255,255,255,0.1); border-color:var(--glass-border); }
        .nav-link.logout-link { border-color:rgba(255,100,80,0.3); }
        .nav-link.logout-link:hover { color:#ff8060; border-color:rgba(255,100,80,0.6); background:rgba(255,100,80,0.08); }
        .nav-link.back-link { border-color:var(--glass-border); }

        /* ALERTS */
        .alert-stack { position:fixed; top:5rem; right:1.5rem; z-index:200; display:flex; flex-direction:column; gap:0.5rem; }
        .alert { padding:0.875rem 1.25rem; background:rgba(10,12,30,0.88); backdrop-filter:blur(16px); border:1px solid; border-radius:10px; display:flex; align-items:center; gap:0.625rem; font-size:0.825rem; min-width:260px; animation:slideIn 0.3s ease both; }
        .alert-success { border-color:rgba(34,197,94,0.45); color:#22c55e; }
        .alert-danger  { border-color:rgba(255,100,80,0.45); color:#ff8060; }
        .alert-close   { margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; font-size:1rem; }

        /* PAGE */
        .page { flex:1; padding:7rem 1.5rem 3rem; display:flex; flex-direction:column; align-items:center; gap:1.5rem; }
        .inner { width:100%; max-width:680px; display:flex; flex-direction:column; gap:1.25rem; }

        /* PAGE HEADER */
        .page-header {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:20px;
            padding:1.75rem 2rem; display:flex; align-items:center; gap:1.25rem;
            animation:fadeUp 0.4s ease both;
        }
        .header-icon {
            width:54px; height:54px; border-radius:14px; flex-shrink:0;
            background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3);
            display:flex; align-items:center; justify-content:center;
            font-size:1.4rem; color:#ef4444;
        }
        .header-text h1 { font-size:1.3rem; font-weight:700; margin-bottom:0.2rem; }
        .header-text p { font-size:0.78rem; color:var(--text-dim); }
        .header-text p span { color:var(--yellow); font-weight:600; }

        /* STEP INDICATOR */
        .steps {
            display:flex; align-items:center; gap:0.5rem;
            animation:fadeUp 0.45s ease both;
        }
        .step {
            display:flex; align-items:center; gap:0.5rem;
            font-size:0.72rem; font-weight:600; color:var(--text-dim);
        }
        .step.active { color:var(--text-light); }
        .step.done   { color:#22c55e; }
        .step-num {
            width:22px; height:22px; border-radius:50%; border:1.5px solid;
            display:flex; align-items:center; justify-content:center;
            font-size:0.65rem; font-weight:800; flex-shrink:0;
        }
        .step.active .step-num { border-color:var(--yellow); color:var(--yellow); background:rgba(245,168,0,0.1); }
        .step.done   .step-num { border-color:#22c55e; color:#22c55e; background:rgba(34,197,94,0.1); }
        .step.pending .step-num { border-color:rgba(255,255,255,0.2); color:var(--text-dim); }
        .step-divider { flex:1; height:1px; background:var(--glass-border); min-width:20px; }

        /* CARD */
        .glass-card {
            background:var(--glass-card); backdrop-filter:blur(20px);
            border:1px solid var(--glass-border); border-radius:20px; overflow:hidden;
            animation:fadeUp 0.5s ease both;
        }
        .card-header {
            padding:1rem 1.5rem; background:rgba(255,255,255,0.05);
            border-bottom:1px solid var(--glass-border);
            display:flex; align-items:center; gap:0.6rem;
            font-size:0.85rem; font-weight:700; color:white;
        }
        .card-header i { color:var(--yellow); }
        .card-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }

        /* FORM ELEMENTS */
        .form-group { display:flex; flex-direction:column; gap:0.4rem; }
        .form-label { font-size:0.72rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; }
        .form-label span { color:#ef4444; }
        .form-select, .form-input, .form-textarea {
            background:rgba(255,255,255,0.06); border:1px solid var(--glass-border);
            border-radius:10px; color:white;
            font-family:'Poppins',sans-serif; font-size:0.82rem;
            padding:0.65rem 0.9rem; transition:all 0.25s; width:100%;
        }
        .form-select:focus, .form-input:focus, .form-textarea:focus {
            outline:none; border-color:rgba(245,168,0,0.5);
            background:rgba(255,255,255,0.09);
        }
        .form-select option { background:#0f1228; }
        .form-textarea { resize:vertical; min-height:90px; }

        /* DROPZONE */
        .dropzone {
            border:1.5px dashed rgba(245,168,0,0.3);
            border-radius:12px; padding:1.75rem 1rem;
            text-align:center; cursor:pointer;
            transition:all 0.25s;
        }
        .dropzone:hover, .dropzone.drag-over {
            background:rgba(245,168,0,0.05); border-color:rgba(245,168,0,0.55);
        }
        .dropzone-icon { font-size:2rem; color:var(--yellow); opacity:0.65; margin-bottom:0.6rem; }
        .dropzone h5 { font-size:0.82rem; font-weight:600; color:var(--text-light); margin-bottom:0.25rem; }
        .dropzone h5 span { color:var(--yellow); }
        .dropzone p { font-size:0.68rem; color:var(--text-dim); }

        /* PREVIEW */
        .preview-strip { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem; }
        .preview-item { position:relative; width:72px; height:72px; }
        .preview-item img { width:100%; height:100%; object-fit:cover; border-radius:9px; border:1px solid var(--glass-border); }
        .preview-item .rm {
            position:absolute; top:-5px; right:-5px;
            width:17px; height:17px; border-radius:50%;
            background:#ef4444; color:white; font-size:9px; border:none;
            cursor:pointer; display:flex; align-items:center; justify-content:center;
            padding:0; font-family:'Poppins',sans-serif;
        }

        /* COUNT BAR */
        .count-bar { display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; }
        .count-pill {
            display:inline-flex; align-items:center; gap:0.35rem;
            background:rgba(245,168,0,0.1); border:1px solid rgba(245,168,0,0.22);
            border-radius:20px; padding:0.2rem 0.7rem;
            font-size:0.68rem; font-weight:700; color:var(--yellow);
        }

        /* ALREADY UPLOADED */
        .existing-label { font-size:0.68rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.4rem; }
        .existing-strip { display:flex; flex-wrap:wrap; gap:0.4rem; }
        .existing-thumb { width:62px; height:62px; border-radius:8px; object-fit:cover; border:1px solid var(--glass-border); cursor:pointer; transition:all 0.2s; }
        .existing-thumb:hover { border-color:var(--yellow); transform:scale(1.06); }

        /* BUTTONS */
        .btn-primary {
            display:inline-flex; align-items:center; justify-content:center; gap:0.5rem;
            background:var(--yellow); color:#1a1000; border:none; border-radius:10px;
            padding:0.65rem 1.5rem; font-family:'Poppins',sans-serif;
            font-size:0.82rem; font-weight:700; letter-spacing:0.04em;
            cursor:pointer; transition:all 0.25s; text-decoration:none;
        }
        .btn-primary:hover { background:var(--yellow-d); transform:translateY(-1px); }
        .btn-primary:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .btn-ghost {
            display:inline-flex; align-items:center; gap:0.4rem;
            color:var(--text-dim); text-decoration:none; font-size:0.78rem; font-weight:500;
            padding:0.6rem 1rem; border-radius:9px; border:1px solid var(--glass-border);
            transition:all 0.2s; font-family:'Poppins',sans-serif; background:transparent; cursor:pointer;
        }
        .btn-ghost:hover { color:var(--text-light); background:rgba(255,255,255,0.07); }
        .btn-danger-ghost {
            display:inline-flex; align-items:center; gap:0.4rem;
            color:#ef4444; font-size:0.82rem; font-weight:700;
            padding:0.65rem 1.5rem; border-radius:10px;
            border:1px solid rgba(239,68,68,0.3);
            background:rgba(239,68,68,0.08);
            font-family:'Poppins',sans-serif; cursor:pointer; transition:all 0.25s;
            text-decoration:none;
        }
        .btn-danger-ghost:hover { background:rgba(239,68,68,0.18); border-color:rgba(239,68,68,0.5); transform:translateY(-1px); color:#ef4444; }

        /* INFO BOX */
        .info-box {
            background:rgba(255,255,255,0.04); border:1px solid var(--glass-border);
            border-radius:14px; padding:1.1rem 1.25rem;
            display:flex; flex-direction:column; gap:0.5rem;
            animation:fadeUp 0.55s ease both;
        }
        .info-box h5 { font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:0.4rem; }
        .info-box h5 i { color:var(--yellow); }
        .info-box ul { padding-left:1.2rem; }
        .info-box li { font-size:0.73rem; color:var(--text-dim); margin-bottom:0.25rem; line-height:1.5; }

        /* LIGHTBOX */
        .lightbox { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:999; align-items:center; justify-content:center; }
        .lightbox.open { display:flex; }
        .lightbox img { max-width:90vw; max-height:88vh; border-radius:12px; }
        .lightbox-close { position:absolute; top:1.5rem; right:1.5rem; background:rgba(255,255,255,0.1); border:1px solid var(--glass-border); color:white; border-radius:50%; width:36px; height:36px; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; }

        /* FOOTER */
        footer { background:rgba(0,0,0,0.5); backdrop-filter:blur(16px); border-top:1px solid var(--glass-border); padding:1.1rem 2rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
        .footer-brand { font-size:1rem; font-weight:700; color:white; }
        .footer-brand span { color:var(--yellow); }
        .footer-copy { font-size:0.7rem; color:var(--text-dim); }

        /* ANIMATIONS */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

        @media(max-width:640px) { .page { padding:6rem 1rem 3rem; } .card-body { padding:1.1rem; } nav { padding:0.7rem 1rem; } .nav-link span { display:none; } }
      `}} />

      <div className="bg-layer"></div>

      {/* ALERTS */}
      <div className="alert-stack">
        {alerts.success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            <span>{alerts.success}</span>
            <button className="alert-close" onClick={() => setAlerts({ ...alerts, success: null })}>×</button>
          </div>
        )}
        {alerts.failure && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle"></i>
            <span>{alerts.failure}</span>
            <button className="alert-close" onClick={() => setAlerts({ ...alerts, failure: null })}>×</button>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav id="nav" className={scrolled ? 'scrolled' : ''}>
        <a href="/customer/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }}></i>
          Ek<span>art</span>
        </a>
        <div className="nav-right">
          <a href="/view-orders" className="nav-link back-link">
            <i className="fas fa-arrow-left"></i> <span>My Orders</span>
          </a>
          <a href="/view-cart" className="nav-link">
            <i className="fas fa-shopping-cart"></i>
          </a>
          <a href="/logout" className="nav-link logout-link">
            <i className="fas fa-sign-out-alt"></i> <span>Logout</span>
          </a>
        </div>
      </nav>

      <div className="page">
        <div className="inner">

          {/* Page Header */}
          <div className="page-header">
            <div className="header-icon"><i className="fas fa-shield-alt"></i></div>
            <div className="header-text">
              <h1>Report an Issue</h1>
              <p>Order <span>#{orderId || 'Order'}</span> — Describe the problem and optionally upload evidence photos</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="steps">
            <div className={`step ${refundId === null ? 'active' : 'done'}`}>
              <div className="step-num">
                {refundId !== null ? <i className="fas fa-check"></i> : <span>1</span>}
              </div>
              Describe Issue
            </div>
            
            <div className="step-divider"></div>
            
            <div className={`step ${refundId !== null ? 'active' : 'pending'}`}>
              <div className="step-num">2</div>
              Upload Evidence
            </div>
          </div>

          {/* STEP 1: Describe the issue */}
          {refundId === null && (
            <div className="glass-card">
              <div className="card-header">
                <i className="fas fa-pen-to-square"></i> Step 1 — Describe the Issue
              </div>
              <div className="card-body">
                <form action="/request-refund" method="post">
                  <input type="hidden" name="orderId" value={orderId || ''} />

                  <div className="form-group">
                    <label className="form-label">Reason for Return / Refund <span>*</span></label>
                    <select name="reason" className="form-select" defaultValue="" required>
                      <option value="" disabled>Select a reason…</option>
                      <option>Item damaged on arrival</option>
                      <option>Wrong item delivered</option>
                      <option>Item not as described</option>
                      <option>Missing parts or accessories</option>
                      <option>Item stopped working</option>
                      <option>Changed my mind</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Additional Details</label>
                    <textarea 
                      name="details" 
                      className="form-textarea"
                      placeholder="Describe the problem in detail (optional)…"
                    ></textarea>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn-danger-ghost">
                      <i className="fas fa-paper-plane"></i> Submit Request
                    </button>
                    <a href="/view-orders" className="btn-ghost">Cancel</a>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* STEP 2: Upload evidence (shown when refundId is available) */}
          {refundId !== null && (
            <div className="glass-card">
              <div className="card-header">
                <i className="fas fa-camera-retro"></i> Step 2 — Upload Evidence Photos
                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  Optional
                </span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                  Photos of the damaged, incorrect, or defective item help us process your request faster.
                  Upload clear, well-lit images — up to <strong style={{ color: 'var(--text-light)' }}>5 photos</strong>, max 5MB each.
                </p>

                <form action={`/customer/refund/${refundId}/upload-image`} method="post" encType="multipart/form-data">

                  {/* Drop zone */}
                  <div 
                    className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
                    onClick={() => fileInputRef.current.click()}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <div className="dropzone-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                    <h5>Drag &amp; drop photos here or <span>click to browse</span></h5>
                    <p>JPG, PNG, WEBP only · max 5MB per image</p>
                  </div>

                  <input 
                    type="file" 
                    id="evidenceInput" 
                    name="images" 
                    multiple
                    accept="image/jpeg,image/png,image/webp" 
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={onFileSelect}
                  />

                  {/* Previews */}
                  <div className="preview-strip">
                    {previews.map((url, idx) => (
                      <div className="preview-item" key={idx}>
                        <img src={url} alt={`Preview ${idx + 1}`} />
                        <button className="rm" onClick={(e) => removeFile(idx, e)}>×</button>
                      </div>
                    ))}
                  </div>

                  <div className="count-bar">
                    <div className="count-pill">
                      <i className="fas fa-images"></i> <span>{selectedFiles.length}</span>/5 photos selected
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>JPG, PNG, WEBP only</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.75rem' }}>
                    <button type="submit" className="btn-primary" disabled={selectedFiles.length === 0}>
                      <i className="fas fa-upload"></i> Upload Evidence
                    </button>
                    <a href="/view-orders" className="btn-ghost">
                      <i className="fas fa-forward"></i> Skip for now
                    </a>
                  </div>
                </form>

                {/* Already uploaded images section */}
                {existingImages.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div className="existing-label">Already uploaded</div>
                    <div className="existing-strip">
                      {existingImages.map((img, idx) => (
                        <img 
                          key={idx}
                          src={img.imageUrl} 
                          className="existing-thumb" 
                          alt="Evidence photo"
                          onClick={() => openLightbox(img.imageUrl)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="info-box">
            <h5><i className="fas fa-info-circle"></i> What happens next?</h5>
            <ul>
              <li>Our team will review your request within <strong style={{ color: 'var(--text-light)' }}>1–2 business days</strong>.</li>
              <li>You'll receive an email confirmation once we process your refund.</li>
              <li>Refunds are credited to the original payment method within <strong style={{ color: 'var(--text-light)' }}>5–7 business days</strong>.</li>
              <li>You can upload additional evidence photos at any time from your order history.</li>
            </ul>
          </div>

        </div>
      </div>

      <footer>
        <div className="footer-brand">Ek<span>art</span></div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>

      {/* Lightbox */}
      <div className={`lightbox ${lightbox.open ? 'open' : ''}`} onClick={closeLightbox}>
        <button className="lightbox-close"><i className="fas fa-times"></i></button>
        {lightbox.src && <img src={lightbox.src} alt="Enlarged evidence" />}
      </div>
      
      {/* Optional: <ChatWidget /> component would go here */}

    </>
  );
};

export default CustomerRefundReport;