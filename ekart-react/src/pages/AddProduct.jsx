import React, { useState, useEffect, useRef } from 'react';
// Import your CSS file here (e.g., import './AddProduct.css';)
// Import PapaParse if you are using the bulk upload feature:
// import Papa from 'papaparse';

const AddProduct = ({ 
  sessionSuccess, 
  sessionFailure, 
  allSubCategories = [] 
}) => {
  // --- Alerts State ---
  const [alerts, setAlerts] = useState({
    success: sessionSuccess,
    failure: sessionFailure
  });

  // --- Pricing State ---
  const [mrp, setMrp] = useState('');
  const [price, setPrice] = useState('');
  const [discountPct, setDiscountPct] = useState('');

  // --- File Upload State ---
  const [mainImgName, setMainImgName] = useState('');
  const [extraImgsName, setExtraImgsName] = useState('');
  const [videoName, setVideoName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // --- Bulk Upload State ---
  const [bulkProgress, setBulkProgress] = useState({ visible: false, percent: 0, text: '' });
  const [bulkValidation, setBulkValidation] = useState({ type: '', html: '' });
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  // --- Pin Code State ---
  const [pinInput, setPinInput] = useState('');
  const [allowedPins, setAllowedPins] = useState([]);
  const [pinError, setPinError] = useState('');
  const [isPinBoxFocused, setIsPinBoxFocused] = useState(false);
  const pinInputRef = useRef(null);

  // --- Scroll State for Nav ---
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Auto-dismiss alerts after 2.5s
    const timer = setTimeout(() => {
      setAlerts({ success: null, failure: null });
    }, 2500);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  // --- Handlers: Pricing ---
  const handleMrpOrPriceChange = (newMrp, newPrice) => {
    setMrp(newMrp);
    setPrice(newPrice);
    const m = parseFloat(newMrp) || 0;
    const p = parseFloat(newPrice) || 0;
    if (m > 0 && p > 0 && m > p) {
      setDiscountPct(Math.round(((m - p) / m) * 100));
    } else {
      setDiscountPct('');
    }
  };

  const handleDiscountChange = (newDiscount) => {
    setDiscountPct(newDiscount);
    const m = parseFloat(mrp) || 0;
    const pct = parseFloat(newDiscount) || 0;
    if (m > 0 && pct > 0 && pct < 100) {
      setPrice(Math.round(m * (1 - pct / 100)));
    }
  };

  // --- Handlers: Files ---
  const handleFileChange = (e, setter) => {
    const files = e.target.files;
    if (!files.length) {
      setter('');
      return;
    }
    setter(files.length > 1 ? `${files.length} files selected` : files[0].name);
  };

  // --- Handlers: Pin Codes ---
  const isIndianPin = (val) => {
    if (!/^\d{6}$/.test(val)) return false;
    const prefix = val.slice(0, 2);
    const valid = new Set(['11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','30','31','32','33','34','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','56','57','58','59','60','61','62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80','81','82','83','84','85','90','91','92','93','94','95','96','97','98','99']);
    return valid.has(prefix);
  };

  const addPin = (val) => {
    const cleanVal = val.trim().replace(/\D/g, '');
    if (!isIndianPin(cleanVal)) {
      setPinError('Please enter a valid Indian pin code.');
      return;
    }
    if (allowedPins.includes(cleanVal)) {
      setPinError(`${cleanVal} already added`);
      return;
    }
    setAllowedPins([...allowedPins, cleanVal]);
    setPinInput('');
    setPinError('');
  };

  const removePin = (val) => {
    setAllowedPins(allowedPins.filter(pin => pin !== val));
  };

  const handlePinKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (pinInput.trim()) addPin(pinInput);
    } else if (e.key === 'Backspace' && !pinInput && allowedPins.length) {
      removePin(allowedPins[allowedPins.length - 1]);
    }
  };

  const handlePinInput = (e) => {
    setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6));
    setPinError('');
  };

  // --- Form Submission ---
  const handleSubmit = (e) => {
    // Note: To prevent default for standard SPA behavior, use e.preventDefault()
    setIsUploading(true);
  };

  return (
    <>
      <div className="bg-layer"></div>

      {/* Alerts */}
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

      {/* Nav */}
      <nav id="nav" className={scrolled ? 'scrolled' : ''}>
        <a href="/vendor/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
          <span>Ekart</span>
        </a>
        <div className="nav-right">
          <a href="/vendor/home" className="nav-link-btn"><i className="fas fa-th-large"></i> Dashboard</a>
          <a href="/logout" className="btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</a>
        </div>
      </nav>

      {/* Main Page */}
      <main className="page">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Add a <span>Product</span> 📦</h1>
            <p>Fill in the details below to list your product on Ekart.</p>
          </div>
          <div className="page-header-icon">🏷️</div>
        </div>

        <div className="form-card">
          <form action="/add-product" method="post" encType="multipart/form-data" onSubmit={handleSubmit}>
            
            <div className="section-label"><i className="fas fa-tag"></i> Basic Details</div>
            
            <div className="form-grid">
              <div className="form-group span-2">
                <label htmlFor="name">Product Name</label>
                <div className="input-wrapper">
                  <i className="fas fa-box input-icon"></i>
                  <input type="text" id="name" name="name" className="form-control" placeholder="e.g. Premium Wireless Headphones" required />
                </div>
              </div>

              <div className="form-group span-2">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" className="form-control no-icon" placeholder="Describe your product — features, materials, use cases…" required></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <div className="input-wrapper">
                  <i className="fas fa-th-large input-icon"></i>
                  <select id="category" name="category" className="form-control" required defaultValue="">
                    <option value="" disabled>— Select a sub-category —</option>
                    {allSubCategories.map((sub, idx) => (
                      <option key={idx} value={sub.name}>
                        {sub.parentCategory ? `${sub.parentCategory.emoji} ${sub.parentCategory.name} › ${sub.name}` : sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Pricing */}
              <div className="form-group">
                <label htmlFor="mrp">
                  M.R.P. / Original Price (₹) <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>(leave blank if no discount)</span>
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-tag input-icon"></i>
                  <input 
                    type="number" id="mrp" name="mrp" className="form-control" placeholder="e.g. 699" step="0.01" min="0"
                    value={mrp} onChange={(e) => handleMrpOrPriceChange(e.target.value, price)} 
                  />
                </div>
              </div>

              <div className="pricing-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="price">Selling Price (₹) <span className="req">*</span></label>
                  <div className="input-wrapper">
                    <i className="fas fa-rupee-sign input-icon"></i>
                    <input 
                      type="number" id="price" name="price" className="form-control" placeholder="e.g. 179" step="0.01" min="0" required
                      value={price} onChange={(e) => handleMrpOrPriceChange(mrp, e.target.value)} 
                    />
                  </div>
                </div>
                <div className="pricing-or">OR</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="discountPct">Discount %</label>
                  <div className="input-wrapper">
                    <i className="fas fa-percent input-icon"></i>
                    <input 
                      type="number" id="discountPct" className="form-control" placeholder="e.g. 74" min="1" max="99" step="1"
                      value={discountPct} onChange={(e) => handleDiscountChange(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* Live pricing preview */}
              {parseFloat(price) > 0 && (
                <div className="pricing-preview" id="pricingPreview" style={{ display: 'flex' }}>
                  {(parseFloat(mrp) > parseFloat(price)) && (
                    <span className="preview-discount" id="previewDiscount">-{discountPct}%</span>
                  )}
                  <span className="preview-price" id="previewPrice">₹{parseFloat(price).toLocaleString('en-IN')}</span>
                  {(parseFloat(mrp) > parseFloat(price)) && (
                    <span className="preview-mrp" id="previewMrp">M.R.P.: ₹{parseFloat(mrp).toLocaleString('en-IN')}</span>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="stock">Stock (Units)</label>
                <div className="input-wrapper">
                  <i className="fas fa-cubes input-icon"></i>
                  <input type="number" id="stock" name="stock" className="form-control" placeholder="e.g. 100" min="0" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="stockAlertThreshold">Stock Alert Threshold</label>
                <div className="input-wrapper">
                  <i className="fas fa-bell input-icon"></i>
                  <input type="number" id="stockAlertThreshold" name="stockAlertThreshold" className="form-control" placeholder="Default: 10" min="1" defaultValue="10" />
                </div>
                <span className="form-hint"><i className="fas fa-info-circle"></i> Get an email when stock drops below this level</span>
              </div>
            </div>

            <div className="section-label" style={{ marginTop: '2rem' }}><i className="fas fa-images"></i> Media</div>

            <div className="form-grid">
              <div className="form-group span-2">
                <label>Main Image <span style={{ color: '#ff8060' }}>*</span></label>
                <div className="file-upload-area">
                  <input type="file" name="image" id="mainImg" accept="image/*" required onChange={(e) => handleFileChange(e, setMainImgName)} />
                  <div className="file-upload-icon"><i className="fas fa-image"></i></div>
                  <div className="file-upload-text">
                    <strong>Click to upload main image</strong>
                    Primary image shown on product cards
                  </div>
                  <div className="file-name-display">{mainImgName}</div>
                </div>
              </div>

              <div className="form-group">
                <label>Extra Images <span style={{ color: 'var(--text-dim)' }}>(Optional · up to 4)</span></label>
                <div className="file-upload-area">
                  <input type="file" name="extraImages" id="extraImgs" accept="image/*" multiple onChange={(e) => handleFileChange(e, setExtraImgsName)} />
                  <div className="file-upload-icon"><i className="fas fa-photo-film"></i></div>
                  <div className="file-upload-text">
                    <strong>Click to upload extra images</strong>
                    Hold Ctrl / Cmd to select multiple
                  </div>
                  <div className="file-name-display">{extraImgsName}</div>
                </div>
              </div>

              <div className="form-group">
                <label>Product Video <span style={{ color: 'var(--text-dim)' }}>(Optional)</span></label>
                <div className="file-upload-area">
                  <input type="file" name="video" id="videoFile" accept="video/*" onChange={(e) => handleFileChange(e, setVideoName)} />
                  <div className="file-upload-icon"><i className="fas fa-video"></i></div>
                  <div className="file-upload-text">
                    <strong>Click to upload video</strong>
                    MP4, MOV or AVI · Max 100 MB
                  </div>
                  <div className="file-name-display">{videoName}</div>
                </div>
              </div>
            </div>

            <div className="section-label" style={{ marginTop: '2rem' }}>
              <i className="fas fa-map-marker-alt"></i> Delivery Restrictions <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }}>(Optional)</span>
            </div>

            <div className="form-group">
              <label htmlFor="pinInput">Allowed Delivery Pin Codes</label>
              <input type="hidden" name="allowedPinCodes" value={allowedPins.join(',')} />
              
              <div 
                id="pinTagBox" 
                onClick={() => pinInputRef.current?.focus()}
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center',
                  background: 'rgba(255,255,255,0.06)', border: `1px solid ${isPinBoxFocused ? 'var(--yellow)' : 'var(--glass-border)'}`,
                  borderRadius: '12px', padding: '0.55rem 1rem', minHeight: '48px', cursor: 'text',
                  transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
              >
                {allowedPins.map(pin => (
                  <span key={pin} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245,168,0,0.18)',
                    border: '1px solid rgba(245,168,0,0.4)', borderRadius: '6px', padding: '0.2rem 0.55rem',
                    fontSize: '0.78rem', fontWeight: 600, color: '#f5a800'
                  }}>
                    {pin}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removePin(pin); }} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,168,0,0.7)',
                      fontSize: '0.9rem', lineHeight: 1, padding: 0
                    }}>×</button>
                  </span>
                ))}
                
                <input 
                  type="text" id="pinInput" placeholder="Type a 6-digit pin code & press Enter" maxLength="6" inputMode="numeric"
                  ref={pinInputRef}
                  value={pinInput}
                  onChange={handlePinInput}
                  onKeyDown={handlePinKeyDown}
                  onBlur={() => { if (pinInput.trim()) addPin(pinInput); setIsPinBoxFocused(false); }}
                  onFocus={() => setIsPinBoxFocused(true)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontFamily: "'Poppins', sans-serif", fontSize: '0.875rem', minWidth: '200px', flex: 1 }}
                />
              </div>
              {pinError && <span style={{ fontSize: '0.7rem', color: '#ff8060', marginLeft: '0.2rem' }}>{pinError}</span>}
              <span className="form-hint"><i className="fas fa-info-circle"></i> Leave blank to allow delivery to all pin codes. Add each pin code one at a time.</span>
            </div>

            <button type="submit" className="btn-submit" id="submitBtn" disabled={isUploading}>
              <i className="fas fa-plus-circle"></i> Add Product
            </button>
          </form>

          {/* Bulk Product Induction */}
          <div className="section-label" style={{ marginTop: '2.5rem' }}><i className="fas fa-file-csv"></i> Bulk Product Induction</div>
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>Upload a CSV file to add multiple products at once. Download the <a href="/sample-product-upload.csv" style={{ color: 'var(--yellow)', textDecoration: 'underline' }}>sample CSV template</a>.</span>
          </div>
          
          <form id="bulkProductForm" encType="multipart/form-data">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label htmlFor="csvFile" style={{ fontWeight: 500 }}>CSV File *</label>
                <input type="file" id="csvFile" name="file" accept=".csv" required style={{ marginTop: '0.5rem' }} />
              </div>
              <button type="button" className="btn-submit" id="bulkUploadBtn" style={{ width: 'auto', minWidth: '180px' }} disabled={isBulkUploading}>
                <i className="fas fa-upload"></i> Upload & Import
              </button>
            </div>
            
            {bulkProgress.visible && (
              <div id="bulkProgress" style={{ marginTop: '1.2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', height: '18px', width: '100%' }}>
                  <div style={{ height: '100%', width: `${bulkProgress.percent}%`, background: 'var(--yellow)', transition: 'width 0.4s' }}></div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>{bulkProgress.text}</div>
              </div>
            )}
            
            <div dangerouslySetInnerHTML={{ __html: bulkValidation.html }} style={{ marginTop: '1.2rem' }}></div>
          </form>

          <a href="/vendor/home" className="back-link">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </a>
        </div>
      </main>

      {/* Upload Loading Overlay */}
      {isUploading && (
        <div id="uploadOverlay" style={{
          display: 'flex', position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5,8,20,0.88)',
          backdropFilter: 'blur(8px)', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', border: '4px solid rgba(245,168,0,0.2)',
            borderTopColor: '#f5a800', animation: 'spin 0.9s linear infinite'
          }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '0.4rem' }}>
              Uploading your product...
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
              Uploading images & video to Cloudinary — please wait, this can take up to 60 seconds
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>Please don't close this tab</div>
        </div>
      )}

      <footer>
        <div className="footer-brand"><span>Ekart</span></div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>
    </>
  );
};

export default AddProduct;