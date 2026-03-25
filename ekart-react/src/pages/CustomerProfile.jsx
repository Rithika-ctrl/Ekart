import React, { useState, useEffect, useRef } from 'react';

const CSS = `
        :root {
            --yellow: #f5a800; --yellow-d: #d48f00;
            --glass-border: rgba(255,255,255,0.22);
            --glass-card:   rgba(255,255,255,0.10);
            --glass-nav:    rgba(0,0,0,0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:'Poppins',sans-serif;min-height:100vh;color:var(--text-white);display:flex;flex-direction:column;}

        .bg-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;}
        .bg-layer::before{content:'';position:absolute;inset:-20px;
            background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter:blur(6px);transform:scale(1.08);}
        .bg-layer::after{content:'';position:absolute;inset:0;
            background:linear-gradient(180deg,rgba(5,8,20,0.85) 0%,rgba(8,12,28,0.80) 100%);}

        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0.75rem 2rem;
            display:flex;align-items:center;justify-content:space-between;
            background:var(--glass-nav);backdrop-filter:blur(14px);
            border-bottom:1px solid var(--glass-border);}
        .nav-brand{font-size:1.5rem;font-weight:700;color:var(--text-white);text-decoration:none;
            display:flex;align-items:center;gap:0.45rem;}
        .nav-brand span{color:var(--yellow);}
        .nav-back{display:flex;align-items:center;gap:0.5rem;color:var(--text-light);text-decoration:none;
            font-size:0.9rem;font-weight:500;padding:0.4rem 0.9rem;
            border:1px solid var(--glass-border);border-radius:50px;
            backdrop-filter:blur(8px);transition:all 0.2s;}
        .nav-back:hover{background:rgba(255,255,255,0.1);color:white;}

        main{margin-top:70px;flex:1;padding:2.5rem 1.5rem;display:flex;justify-content:center;}
        .profile-wrapper{width:100%;max-width:680px;}

        /* ALERTS - matching exact pattern from other templates */
        .alert-stack{position:fixed;top:80px;right:1.5rem;z-index:200;display:flex;flex-direction:column;gap:0.5rem;width:320px;}
        .alert{display:flex;align-items:center;gap:0.6rem;padding:0.85rem 1.1rem;
            border-radius:12px;font-size:0.85rem;font-weight:500;
            backdrop-filter:blur(12px);border:1px solid;animation:slideIn 0.3s ease;}
        .alert-success{background:rgba(16,185,129,0.18);border-color:rgba(16,185,129,0.4);color:#6ee7b7;}
        .alert-danger{background:rgba(239,68,68,0.18);border-color:rgba(239,68,68,0.4);color:#fca5a5;}
        .alert i{flex-shrink:0;}
        .alert-close{margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;font-size:1rem;opacity:0.7;}
        .alert-close:hover{opacity:1;}
        @keyframes slideIn{from{transform:translateX(30px);opacity:0;}to{transform:translateX(0);opacity:1;}}

        .card{background:var(--glass-card);border:1px solid var(--glass-border);border-radius:20px;
            backdrop-filter:blur(16px);padding:2.5rem 2rem;margin-bottom:1.5rem;}

        .avatar-section{display:flex;flex-direction:column;align-items:center;gap:1.2rem;}
        .avatar-ring{position:relative;width:150px;height:150px;}
        .avatar-img{width:150px;height:150px;border-radius:50%;object-fit:cover;
            border:3px solid var(--yellow);box-shadow:0 0 30px rgba(245,168,0,0.35);}
        .avatar-placeholder{width:150px;height:150px;border-radius:50%;
            background:linear-gradient(135deg,rgba(245,168,0,0.25),rgba(245,168,0,0.08));
            border:3px solid var(--yellow);display:flex;align-items:center;justify-content:center;
            font-size:3.5rem;box-shadow:0 0 30px rgba(245,168,0,0.25);}
        .avatar-edit-btn{position:absolute;bottom:6px;right:6px;width:36px;height:36px;
            background:var(--yellow);border:2px solid rgba(0,0,0,0.3);border-radius:50%;
            display:flex;align-items:center;justify-content:center;cursor:pointer;
            transition:transform 0.2s,box-shadow 0.2s;}
        .avatar-edit-btn:hover{transform:scale(1.1);box-shadow:0 4px 12px rgba(245,168,0,0.5);}
        .avatar-edit-btn i{color:#000;font-size:0.75rem;}
        .avatar-name{text-align:center;}
        .avatar-name h2{font-size:1.5rem;font-weight:700;}
        .avatar-name p{color:var(--text-dim);font-size:0.85rem;margin-top:0.2rem;}

        .upload-zone{border:2px dashed var(--glass-border);border-radius:16px;
            padding:2rem 1.5rem;text-align:center;cursor:pointer;
            transition:border-color 0.2s,background 0.2s;position:relative;}
        .upload-zone:hover,.upload-zone.drag-over{border-color:var(--yellow);background:rgba(245,168,0,0.06);}
        .upload-zone input[type="file"]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
        .upload-zone .upload-icon{font-size:2.5rem;margin-bottom:0.75rem;color:var(--yellow);opacity:0.8;}
        .upload-zone h3{font-size:1rem;font-weight:600;margin-bottom:0.4rem;}
        .upload-zone p{color:var(--text-dim);font-size:0.8rem;}

        #previewBox{display:none;flex-direction:column;align-items:center;gap:0.75rem;margin-top:1.2rem;}
        #previewBox img{width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid var(--yellow);}
        #previewBox p{color:var(--text-dim);font-size:0.78rem;}

        .section-title{font-size:1.05rem;font-weight:600;margin-bottom:1.2rem;display:flex;align-items:center;gap:0.5rem;}
        .section-title i{color:var(--yellow);}
        .tips{display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1rem;}
        .tip{font-size:0.72rem;padding:0.3rem 0.7rem;background:rgba(255,255,255,0.06);
            border:1px solid rgba(255,255,255,0.12);border-radius:50px;color:var(--text-dim);}
        .tip i{color:var(--yellow);margin-right:0.25rem;}

        .btn-group{display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.2rem;}
        .btn-primary{flex:1;min-width:140px;padding:0.75rem 1.5rem;background:var(--yellow);color:#000;
            border:none;border-radius:50px;font-family:'Poppins',sans-serif;
            font-size:0.88rem;font-weight:600;cursor:pointer;
            transition:background 0.2s,transform 0.1s;display:flex;align-items:center;justify-content:center;gap:0.5rem;}
        .btn-primary:hover{background:var(--yellow-d);}
        .btn-primary:active{transform:scale(0.98);}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed;}
        .btn-danger{padding:0.75rem 1.5rem;background:rgba(239,68,68,0.15);color:#fca5a5;
            border:1px solid rgba(239,68,68,0.35);border-radius:50px;
            font-family:'Poppins',sans-serif;font-size:0.88rem;font-weight:500;cursor:pointer;
            text-decoration:none;display:flex;align-items:center;gap:0.5rem;transition:background 0.2s;}
        .btn-danger:hover{background:rgba(239,68,68,0.25);}

        .info-grid{display:grid;gap:1rem;}
        .info-row{display:flex;align-items:center;gap:1rem;padding:1rem 1.2rem;
            background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;}
        .info-icon{width:38px;height:38px;border-radius:10px;background:rgba(245,168,0,0.15);
            display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .info-icon i{color:var(--yellow);font-size:0.9rem;}
        .info-label{font-size:0.72rem;color:var(--text-dim);margin-bottom:0.1rem;}
        .info-value{font-size:0.92rem;font-weight:500;}

        .spinner{display:none;width:18px;height:18px;border:2px solid rgba(0,0,0,0.3);
            border-top-color:#000;border-radius:50%;animation:spin 0.7s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}
`;

/**
 * CustomerProfile Component
 * @param {Object} props
 * @param {string|null} props.successMessage - Success message from session
 * @param {string|null} props.failureMessage - Failure message from session
 * @param {string|null} props.csrfToken - CSRF token for secure form submission
 * @param {Object} props.customer - The customer data object
 * @param {string} props.customer.name - Full Name
 * @param {string} props.customer.email - Email Address
 * @param {string} props.customer.mobile - Mobile Number
 * @param {string} props.customer.role - Account Role
 * @param {boolean} props.customer.active - Account Status
 * @param {string} props.customer.profileImage - Profile Image URL
 */
export default function CustomerProfile({
    successMessage = null,
    failureMessage = null,
    csrfToken = null,
    customer = {
        name: '',
        email: '',
        mobile: '',
        role: '',
        active: true,
        profileImage: null
    }
}) {
    const [showSuccess, setShowSuccess] = useState(!!successMessage);
    const [showFailure, setShowFailure] = useState(!!failureMessage);
    const [fadeAlerts, setFadeAlerts] = useState(false);

    const [isDragOver, setIsDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('#');
    const [previewName, setPreviewName] = useState('');
    const [fileSelected, setFileSelected] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef(null);

    // Alert auto-dismiss
    useEffect(() => {
        if (showSuccess || showFailure) {
            const timer1 = setTimeout(() => {
                setFadeAlerts(true);
            }, 3500);
            const timer2 = setTimeout(() => {
                setShowSuccess(false);
                setShowFailure(false);
            }, 4000);
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        }
    }, [showSuccess, showFailure]);

    const alertStyle = {
        transition: 'opacity 0.5s',
        opacity: fadeAlerts ? 0 : 1
    };

    // Drag & Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (fileInputRef.current) {
                fileInputRef.current.files = e.dataTransfer.files;
            }
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image (JPG, PNG, WEBP).');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be under 5 MB.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target.result);
            setPreviewName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            setFileSelected(true);
        };
        reader.readAsDataURL(file);
    };

    const handleFormSubmit = () => {
        setIsUploading(true);
    };

    return (
        <>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Ekart - My Profile</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <style>{CSS}</style>

            <div className="bg-layer"></div>

            {/* NAV */}
            <nav>
                <a href="/customer/home" className="nav-brand">🛒 E<span>kart</span></a>
                <a href="/customer/home" className="nav-back"><i className="fas fa-arrow-left"></i> Back to Home</a>
            </nav>

            {/* ALERTS */}
            <div className="alert-stack">
                {showSuccess && (
                    <div className="alert alert-success" style={alertStyle}>
                        <i className="fas fa-check-circle"></i>
                        <span>{successMessage}</span>
                        <button type="button" className="alert-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}
                {showFailure && (
                    <div className="alert alert-danger" style={alertStyle}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failureMessage}</span>
                        <button type="button" className="alert-close" onClick={() => setShowFailure(false)}>×</button>
                    </div>
                )}
            </div>

            <main>
                <div className="profile-wrapper">

                    {/* AVATAR CARD */}
                    <div className="card">
                        <div className="avatar-section">
                            <div className="avatar-ring">
                                {customer?.profileImage ? (
                                    <img src={customer.profileImage} className="avatar-img" alt="Profile Photo" />
                                ) : (
                                    <div className="avatar-placeholder">👤</div>
                                )}
                                <label htmlFor="imageFileInput" className="avatar-edit-btn" title="Change photo">
                                    <i className="fas fa-pencil-alt"></i>
                                </label>
                            </div>
                            <div className="avatar-name">
                                <h2>{customer?.name || 'Name'}</h2>
                                <p>{customer?.email || 'email@example.com'}</p>
                            </div>
                        </div>
                    </div>

                    {/* UPLOAD CARD */}
                    <div className="card">
                        <div className="section-title"><i className="fas fa-camera"></i> Update Profile Photo</div>
                        <form 
                            id="uploadForm" 
                            action="/customer/upload-profile-image" 
                            method="post" 
                            encType="multipart/form-data"
                            onSubmit={handleFormSubmit}
                        >
                            {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                            <div 
                                className={`upload-zone ${isDragOver ? 'drag-over' : ''}`} 
                                id="dropZone"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input 
                                    type="file" 
                                    name="profileImage" 
                                    id="imageFileInput"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleFileSelect}
                                    ref={fileInputRef}
                                />
                                <div className="upload-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                                <h3>Drag &amp; drop your photo here</h3>
                                <p>or click to browse — JPG, PNG, WEBP up to 5 MB</p>
                            </div>
                            
                            <div id="previewBox" style={{ display: fileSelected ? 'flex' : 'none' }}>
                                <img id="previewImg" src={previewUrl} alt="Preview" />
                                <p id="previewName">{previewName}</p>
                            </div>

                            <div className="tips">
                                <span className="tip"><i className="fas fa-check"></i> Square photos work best</span>
                                <span className="tip"><i className="fas fa-check"></i> Max 5 MB</span>
                                <span className="tip"><i className="fas fa-check"></i> JPG / PNG / WEBP</span>
                            </div>

                            <div className="btn-group">
                                <button type="submit" className="btn-primary" id="uploadBtn" disabled={!fileSelected || isUploading}>
                                    <span className="spinner" id="uploadSpinner" style={{ display: isUploading ? 'block' : 'none' }}></span>
                                    <i className="fas fa-upload" id="uploadIcon" style={{ display: isUploading ? 'none' : 'inline-block' }}></i>
                                    <span id="uploadLabel">{isUploading ? 'Uploading…' : 'Upload Photo'}</span>
                                </button>
                                
                                {customer?.profileImage && (
                                    <a 
                                        href="/customer/remove-profile-image" 
                                        className="btn-danger"
                                        onClick={(e) => {
                                            if(!window.confirm('Remove your profile photo?')) e.preventDefault();
                                        }}
                                    >
                                        <i className="fas fa-trash-alt"></i> Remove Photo
                                    </a>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* INFO CARD */}
                    <div className="card">
                        <div className="section-title"><i className="fas fa-user-circle"></i> Account Details</div>
                        <div className="info-grid">
                            <div className="info-row">
                                <div className="info-icon"><i className="fas fa-user"></i></div>
                                <div>
                                    <div className="info-label">Full Name</div>
                                    <div className="info-value">{customer?.name || '—'}</div>
                                </div>
                            </div>
                            <div className="info-row">
                                <div className="info-icon"><i className="fas fa-envelope"></i></div>
                                <div>
                                    <div className="info-label">Email Address</div>
                                    <div className="info-value">{customer?.email || '—'}</div>
                                </div>
                            </div>
                            <div className="info-row">
                                <div className="info-icon"><i className="fas fa-phone"></i></div>
                                <div>
                                    <div className="info-label">Mobile Number</div>
                                    <div className="info-value">{customer?.mobile || '—'}</div>
                                </div>
                            </div>
                            <div className="info-row">
                                <div className="info-icon"><i className="fas fa-shield-alt"></i></div>
                                <div>
                                    <div className="info-label">Account Role</div>
                                    <div className="info-value">{customer?.role || '—'}</div>
                                </div>
                            </div>
                            <div className="info-row">
                                <div className="info-icon"><i className="fas fa-check-circle"></i></div>
                                <div>
                                    <div className="info-label">Account Status</div>
                                    <div className="info-value">{customer?.active ? 'Active ✅' : 'Suspended ❌'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </>
    );
}