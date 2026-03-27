import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from "react";
import { backendUrl } from '../utils/backendUrl';

const CSS = `:root {
            --yellow:       #f5a800;
            --yellow-d:     #d48f00;
            --glass-border: rgba(255, 255, 255, 0.22);
            --glass-card:   rgba(255, 255, 255, 0.13);
            --glass-nav:    rgba(0, 0, 0, 0.25);
            --text-white:   #ffffff;
            --text-light:   rgba(255,255,255,0.80);
            --text-dim:     rgba(255,255,255,0.50);
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        #root {
            font-family: 'Poppins', sans-serif;
            min-height: 100vh;
            color: var(--text-white);
            display: flex;
            flex-direction: column;
        }

        .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
        .bg-layer::before {
            content: '';
            position: absolute; inset: -20px;
            background: url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;
            filter: blur(6px);
            transform: scale(1.08);
        }
        .bg-layer::after {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(5,8,20,0.82) 0%, rgba(8,12,28,0.78) 40%, rgba(5,8,20,0.88) 100%);
        }

        /* ── NAV ── */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            padding: 1rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
            background: var(--glass-nav);
            backdrop-filter: blur(14px);
            border-bottom: 1px solid var(--glass-border);
        }

        .nav-brand {
            font-size: 1.6rem; font-weight: 700;
            color: var(--text-white); text-decoration: none;
            display: flex; align-items: center; gap: 0.5rem;
        }

        .nav-right { display: flex; align-items: center; gap: 1rem; }
        .nav-links { display: flex; align-items: center; gap: 0.5rem; }

        .nav-link {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .nav-link:hover { color: var(--yellow); border-color: rgba(245,168,0,0.3); background: rgba(245,168,0,0.08); }
        .nav-link.active { color: var(--yellow); background: rgba(245,168,0,0.12); border-color: rgba(245,168,0,0.4); }

        .nav-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.15); margin: 0 0.5rem; }

        .nav-badge {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.72rem; font-weight: 700;
            padding: 0.3rem 0.8rem; border-radius: 50px;
            background: rgba(245,168,0,0.15);
            border: 1px solid rgba(245,168,0,0.3);
            color: var(--yellow);
        }

        .btn-logout {
            display: flex; align-items: center; gap: 0.4rem;
            color: var(--text-light); text-decoration: none;
            font-size: 0.82rem; font-weight: 500;
            padding: 0.45rem 0.9rem; border-radius: 6px;
            border: 1px solid rgba(255,100,80,0.3);
            background: none; cursor: pointer;
            transition: all 0.2s;
        }
        .btn-logout:hover { color: #ff8060; border-color: rgba(255,100,80,0.6); background: rgba(255,100,80,0.08); }

        /* ── ALERTS ── */
        .alert-stack {
            position: fixed; top: 5rem; right: 1.5rem;
            z-index: 200; display: flex; flex-direction: column; gap: 0.5rem;
        }
        .alert {
            padding: 0.875rem 1.25rem;
            background: rgba(10,12,30,0.88); backdrop-filter: blur(16px);
            border: 1px solid; border-radius: 10px;
            display: flex; align-items: center; gap: 0.625rem;
            font-size: 0.825rem; min-width: 260px;
            animation: slideIn 0.3s ease both;
        }
        .alert-success { border-color: rgba(34,197,94,0.45); color: #22c55e; }
        .alert-danger  { border-color: rgba(255,100,80,0.45); color: #ff8060; }
        .alert-close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; }

        /* ── PAGE ── */
        .page {
            flex: 1;
            padding: 7rem 3rem 3rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        /* ── PAGE HEADER ── */
        .page-header {
            display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
            background: var(--glass-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2rem 2.5rem;
        }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; }
        .page-header h1 span { color: var(--yellow); }
        .page-header p { font-size: 0.9rem; color: var(--text-dim); margin-top: 0.3rem; }

        /* ── STATS ROW ── */
        .stats-row {
            display: flex;
            gap: 1.25rem;
        }
        .stat-card {
            flex: 1;
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
        }
        .stat-card-icon {
            width: 48px; height: 48px;
            margin: 0 auto 0.75rem;
            background: rgba(245,168,0,0.15);
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.25rem;
            color: var(--yellow);
        }
        .stat-card-value {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-white);
        }
        .stat-card-label {
            font-size: 0.75rem;
            color: var(--text-dim);
            margin-top: 0.25rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* ── SECTION CARD ── */
        .section-card {
            background: var(--glass-card);
            backdrop-filter: blur(18px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 2rem;
        }
        .section-card h2 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .section-card h2 i { color: var(--yellow); }

        /* ── FORM ── */
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr auto;
            gap: 1rem;
            align-items: end;
        }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group label {
            font-size: 0.75rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .form-group input {
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            font-size: 0.9rem;
            color: var(--text-white);
            font-family: inherit;
            transition: all 0.2s;
        }
        .form-group input:focus {
            outline: none;
            border-color: var(--yellow);
            background: rgba(0,0,0,0.4);
        }
        .form-group input::placeholder { color: var(--text-dim); }

        .btn-primary {
            background: var(--yellow);
            color: #1a1000;
            font-weight: 600;
            font-size: 0.85rem;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            transition: all 0.2s;
            white-space: nowrap;
            font-family: inherit;
        }
        .btn-primary:hover { background: var(--yellow-d); transform: translateY(-2px); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* ── TAB SWITCHER ── */
        .tab-switcher {
            display: flex;
            gap: 0;
            margin-bottom: 1.5rem;
            border: 1px solid var(--glass-border);
            border-radius: 10px;
            overflow: hidden;
            width: fit-content;
        }
        .tab-btn {
            padding: 0.55rem 1.25rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.82rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            background: transparent;
            color: rgba(255,255,255,0.5);
        }
        .tab-btn.active { background: var(--yellow); color: #1a1000; }

        /* ── TABLE ── */
        .banner-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        .banner-table th, .banner-table td {
            text-align: left;
            padding: 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .banner-table th {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .banner-table td {
            font-size: 0.9rem;
            color: var(--text-light);
        }
        .banner-table tr:last-child td { border-bottom: none; }
        .banner-table tr:hover td { background: rgba(255,255,255,0.03); }

        .banner-preview {
            width: 120px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid var(--glass-border);
        }

        .banner-title {
            font-weight: 500;
            color: var(--text-white);
        }
        .banner-link {
            font-size: 0.8rem;
            color: var(--text-dim);
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* ── TOGGLE SWITCH ── */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 26px;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
            position: absolute;
            inset: 0;
            background: rgba(255,255,255,0.1);
            border-radius: 26px;
            cursor: pointer;
            transition: 0.3s;
        }
        .toggle-slider::before {
            content: '';
            position: absolute;
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 3px;
            background: white;
            border-radius: 50%;
            transition: 0.3s;
        }
        .toggle-switch input:checked + .toggle-slider { background: #22c55e; }
        .toggle-switch input:checked + .toggle-slider::before { transform: translateX(24px); }

        /* ── ACTION BUTTONS ── */
        .action-btns {
            display: flex;
            gap: 0.5rem;
        }
        .btn-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            border: 1px solid var(--glass-border);
            background: rgba(0,0,0,0.2);
            color: var(--text-light);
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-icon:hover { background: rgba(255,255,255,0.1); color: white; }
        .btn-icon.danger:hover { background: rgba(255,80,80,0.15); border-color: rgba(255,80,80,0.4); color: #ff6060; }

        /* ── STATUS BADGE ── */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 0.3rem 0.7rem;
            border-radius: 50px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .status-badge.active   { background: rgba(34,197,94,0.15);  color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .status-badge.inactive { background: rgba(255,100,80,0.15); color: #ff8060; border: 1px solid rgba(255,100,80,0.3); }

        /* ── EMPTY STATE ── */
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-dim);
        }
        .empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; display: block; }
        .empty-state p { font-size: 0.95rem; }

        /* ── BULK CSV INPUT ── */
        .bulk-file-label { font-weight: 500; color: var(--text-light); font-size: 0.9rem; }
        .bulk-file-input {
            display: block;
            margin-top: 0.5rem;
            color: var(--text-light);
        }

        /* ── FOOTER ── */
        footer {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex; align-items: center; justify-content: space-between;
        }
        .footer-brand { font-size: 1.1rem; font-weight: 700; color: white; }
        .footer-copy  { font-size: 0.72rem; color: var(--text-dim); }

        @keyframes slideIn {
            from { opacity: 0; transform: translateX(14px); }
            to   { opacity: 1; transform: translateX(0); }
        }

        @media(max-width: 1024px) {
            .nav-links  { display: none; }
            .nav-divider { display: none; }
            .form-row   { grid-template-columns: 1fr 1fr; }
            .stats-row  { flex-wrap: wrap; }
        }
        @media(max-width: 768px) {
            nav         { padding: 0.875rem 1.25rem; }
            .page       { padding: 5.5rem 1.25rem 2rem; }
            .page-header { flex-direction: column; text-align: center; }
            .form-row   { grid-template-columns: 1fr; }
            .banner-table { display: block; overflow-x: auto; }
            footer      { flex-direction: column; text-align: center; gap: 0.5rem; }
        }`;

/**
 * AdminContent — Banner Management page for the Ekart admin panel.
 *
 * @prop {string}  successMessage    - Flash success message (session.success)
 * @prop {string}  failureMessage    - Flash failure message (session.failure)
 * @prop {number}  totalBannerCount  - Total number of banners
 * @prop {number}  activeBannerCount - Number of active banners
 * @prop {Array}   banners           - Array of banner objects:
 *                                     { id, title, imageUrl, linkUrl, active, showOnHome, showOnCustomerHome }
 * @prop {string}  csrfToken         - CSRF token for form submissions
 */
export default function AdminContent({
  successMessage = "",
  failureMessage = "",
  totalBannerCount = 0,
  activeBannerCount = 0,
  banners = [],
  csrfToken = "",
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("upload");

  // ── Image preview ─────────────────────────────────────────────────────────
  const [imagePreviewSrc, setImagePreviewSrc] = useState(null);

  // ── Upload-form spinner ───────────────────────────────────────────────────
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // ── Alerts ────────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState(() => {
    const list = [];
    if (successMessage) list.push({ id: 1, type: "success", text: successMessage });
    if (failureMessage) list.push({ id: 2, type: "danger",  text: failureMessage });
    return list;
  });

  useEffect(() => {
    if (alerts.length === 0) return;
    const t = setTimeout(() => setAlerts([]), 3000);
    return () => clearTimeout(t);
  }, [alerts]);

  function dismissAlert(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  // ── Bulk-upload state ─────────────────────────────────────────────────────
  const csvInputRef              = useRef(null);
  const [bulkProgressText,    setBulkProgressText]    = useState("");
  const [bulkProgressPct,     setBulkProgressPct]     = useState(0);
  const [bulkProgressShow,    setBulkProgressShow]    = useState(false);
  const [bulkValidationHtml,  setBulkValidationHtml]  = useState(null);
  const [bulkUploading,       setBulkUploading]       = useState(false);

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout(e) {
    e.preventDefault();
    try {
      await logout();
    } catch (_) {}
    navigate("/admin/login");
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handlePreviewImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreviewSrc(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleUploadSubmit() {
    setUploadSubmitting(true);
  }

  function handleBulkSubmit(e) {
    e.preventDefault();
    setBulkValidationHtml(null);
    setBulkProgressShow(true);
    setBulkProgressPct(0);
    setBulkProgressText("Parsing CSV...");

    const file = csvInputRef.current?.files?.[0];
    if (!file) {
      setBulkValidationHtml({ type: "error", message: "Please select a CSV file." });
      setBulkProgressShow(false);
      return;
    }

    if (typeof window.Papa === "undefined") {
      setBulkValidationHtml({ type: "error", message: "CSV parser not loaded. Please refresh the page." });
      setBulkProgressShow(false);
      return;
    }

    window.Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const data           = results.data;
        const errors         = [];
        const requiredFields = ["name", "sku", "price", "quantity"];
        let   validCount     = 0;
        const seenSKUs       = new Set();

        data.forEach((row, idx) => {
          const rowErrors = [];
          requiredFields.forEach((f) => {
            if (!row[f] || row[f].trim() === "") rowErrors.push(`${f} is required`);
          });
          if (row["sku"]) {
            if (seenSKUs.has(row["sku"])) rowErrors.push("Duplicate SKU in file");
            seenSKUs.add(row["sku"]);
          }
          if (rowErrors.length > 0) {
            errors.push(`Row ${idx + 2}: ${rowErrors.join(", ")}`);
          } else {
            validCount++;
          }
        });

        if (errors.length > 0) {
          setBulkProgressPct(0);
          setBulkProgressText("Validation failed.");
          setBulkValidationHtml({ type: "error", errors });
          return;
        }

        setBulkProgressPct(100);
        setBulkProgressText(`Validated ${validCount} products. Uploading…`);
        setBulkUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        fetch(backendUrl("/add-product/bulk-upload"), { method: "POST", body: formData })
          .then((r) => r.json())
          .then((res) => {
            setBulkUploading(false);
            if (res.success) {
              setBulkProgressText("Upload successful!");
              setBulkProgressPct(100);
              setBulkValidationHtml({ type: "success", message: res.message });
              if (csvInputRef.current) csvInputRef.current.value = "";
            } else {
              setBulkProgressText("Upload failed.");
              setBulkProgressPct(0);
              setBulkValidationHtml({ type: "error", message: res.message || "Upload failed." });
            }
          })
          .catch(() => {
            setBulkUploading(false);
            setBulkProgressText("Upload failed.");
            setBulkProgressPct(0);
            setBulkValidationHtml({ type: "error", message: "Upload failed. Please try again." });
          });
      },
    });
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const inactiveBannerCount = totalBannerCount - activeBannerCount;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      {/* External assets */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      {/* PapaParse for CSV validation */}
      <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js" />

      {/* Background */}
      <div className="bg-layer"></div>

      {/* ── Floating Alerts ── */}
      <div className="alert-stack">
        {alerts.map((alert) => (
          <div key={alert.id} className={`alert alert-${alert.type}`}>
            <i className={`fas ${alert.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
            <span>{alert.text}</span>
            <button className="alert-close" onClick={() => dismissAlert(alert.id)}>×</button>
          </div>
        ))}
      </div>

      {/* ── Nav ── */}
      <nav>
        <a href="/admin/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: "1.1rem" }}></i>
          Ekart
        </a>
        <div className="nav-right">
          <div className="nav-links">
            <a href="/admin/home" className="nav-link"><i className="fas fa-home"></i> Dashboard</a>
            <Link to="/admin/products" className="nav-link"><i className="fas fa-tasks"></i> Approvals</Link>
            <Link to="/admin/users"    className="nav-link"><i className="fas fa-users"></i> Users</Link>
            <Link to="/admin/content"  className="nav-link active"><i className="fas fa-images"></i> Banners</Link>
          </div>
          <div className="nav-divider"></div>
          <span className="nav-badge"><i className="fas fa-shield-alt"></i> Admin</span>
          <button className="btn-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>

      {/* ── Page ── */}
      <main className="page">

        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1><span>Banner</span> Management</h1>
            <p>Manage promotional banners displayed on the home page carousel.</p>
          </div>
          <i className="fas fa-images" style={{ fontSize: "2.5rem", color: "var(--yellow)" }}></i>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card-icon"><i className="fas fa-images"></i></div>
            <div className="stat-card-value">{totalBannerCount}</div>
            <div className="stat-card-label">Total Banners</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon"><i className="fas fa-eye"></i></div>
            <div className="stat-card-value">{activeBannerCount}</div>
            <div className="stat-card-label">Active Banners</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon"><i className="fas fa-eye-slash"></i></div>
            <div className="stat-card-value">{inactiveBannerCount}</div>
            <div className="stat-card-label">Inactive Banners</div>
          </div>
        </div>

        {/* ── Add Banner Form ── */}
        <div className="section-card">
          <h2><i className="fas fa-plus-circle"></i> Add New Banner</h2>

          {/* Tab switcher */}
          <div className="tab-switcher">
            <button
              type="button"
              className={`tab-btn${activeTab === "upload" ? " active" : ""}`}
              onClick={() => setActiveTab("upload")}
            >
              <i className="fas fa-upload"></i> Upload Image
            </button>
            <button
              type="button"
              className={`tab-btn${activeTab === "url" ? " active" : ""}`}
              onClick={() => setActiveTab("url")}
            >
              <i className="fas fa-link"></i> Paste URL
            </button>
          </div>

          {/* FORM: Upload file to Cloudinary */}
          <form
            action="/admin/content/add-upload"
            method="post"
            encType="multipart/form-data"
            style={{ display: activeTab === "upload" ? "" : "none" }}
            onSubmit={handleUploadSubmit}
          >
            {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
            <div className="form-row">
              <div className="form-group">
                <label>Banner Title *</label>
                <input type="text" name="title" placeholder="e.g., Summer Sale 50% Off" required />
              </div>
              <div className="form-group">
                <label>Banner Image *</label>
                <input
                  type="file"
                  name="imageFile"
                  accept="image/*"
                  required
                  style={{
                    color: "var(--text-light)",
                    background: "var(--glass-card)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "8px",
                    padding: "0.5rem",
                    width: "100%",
                    cursor: "pointer",
                  }}
                  onChange={handlePreviewImage}
                />
                {imagePreviewSrc && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <img
                      src={imagePreviewSrc}
                      alt="Preview"
                      style={{
                        height: "80px", borderRadius: "8px",
                        border: "1px solid var(--glass-border)", objectFit: "cover",
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Link URL (Optional)</label>
                <input type="url" name="linkUrl" placeholder="http://localhost:8080/view-products" />
              </div>
              <button type="submit" className="btn-primary" disabled={uploadSubmitting}>
                {uploadSubmitting
                  ? <><i className="fas fa-spinner fa-spin"></i> Uploading to Cloudinary…</>
                  : <><i className="fas fa-cloud-upload-alt"></i> Upload &amp; Add Banner</>
                }
              </button>
            </div>
          </form>

          {/* FORM: Paste URL */}
          <form
            action="/admin/content/add"
            method="post"
            style={{ display: activeTab === "url" ? "" : "none" }}
          >
            {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
            <div className="form-row">
              <div className="form-group">
                <label>Banner Title *</label>
                <input type="text" name="title" placeholder="e.g., Summer Sale 50% Off" required />
              </div>
              <div className="form-group">
                <label>Image URL *</label>
                <input type="url" name="imageUrl" placeholder="https://res.cloudinary.com/..." required />
                <small style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
                  Use Cloudinary URLs for best results
                </small>
              </div>
              <div className="form-group">
                <label>Link URL (Optional)</label>
                <input type="url" name="linkUrl" placeholder="http://localhost:8080/view-products" />
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-plus"></i> Add Banner
              </button>
            </div>
          </form>
        </div>

        {/* ── Bulk Product Induction ── */}
        <div className="section-card" id="bulk-induction-section">
          <h2><i className="fas fa-file-csv"></i> Bulk Product Induction</h2>
          <p style={{ marginBottom: "1rem", color: "var(--text-dim)", fontSize: "0.95rem" }}>
            Upload a CSV file to add multiple products at once. Download the{" "}
            <Link to="/sample-product-upload.csv" style={{ color: "var(--yellow)", textDecoration: "underline" }}>
              sample CSV template
            </Link>.
          </p>
          <form encType="multipart/form-data" method="post" action="/add-product/bulk-upload" onSubmit={handleBulkSubmit}>
            {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "220px" }}>
                <label htmlFor="csvFile" className="bulk-file-label">CSV File *</label>
                <input
                  type="file"
                  id="csvFile"
                  name="file"
                  accept=".csv"
                  required
                  ref={csvInputRef}
                  className="bulk-file-input"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={bulkUploading}>
                <i className={`fas ${bulkUploading ? "fa-spinner fa-spin" : "fa-upload"}`}></i>{" "}
                {bulkUploading ? "Uploading…" : "Upload & Import"}
              </button>
            </div>

            {/* Progress bar */}
            {bulkProgressShow && (
              <div style={{ marginTop: "1.2rem" }}>
                <div style={{
                  background: "rgba(255,255,255,0.08)", borderRadius: "8px",
                  overflow: "hidden", height: "18px", width: "100%",
                }}>
                  <div style={{
                    height: "100%", width: `${bulkProgressPct}%`,
                    background: "var(--yellow)", transition: "width 0.4s",
                  }}></div>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
                  {bulkProgressText}
                </div>
              </div>
            )}

            {/* Validation output */}
            {bulkValidationHtml && (
              <div style={{ marginTop: "1.2rem" }}>
                {bulkValidationHtml.type === "success" && (
                  <span style={{ color: "#22c55e" }}>{bulkValidationHtml.message}</span>
                )}
                {bulkValidationHtml.type === "error" && (
                  <div style={{ color: "#ff6060", fontSize: "0.95rem" }}>
                    {bulkValidationHtml.errors ? (
                      <>
                        <b>Errors:</b>
                        <ul style={{ margin: "0.5em 0 0 1.2em" }}>
                          {bulkValidationHtml.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </>
                    ) : (
                      bulkValidationHtml.message
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* ── Banner List ── */}
        <div className="section-card">
          <h2><i className="fas fa-list"></i> All Banners</h2>

          {banners.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-images"></i>
              <p>No banners yet. Add your first promotional banner above.</p>
            </div>
          )}

          {banners.length > 0 && (
            <table className="banner-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Link URL</th>
                  <th>Status</th>
                  <th>Home Page</th>
                  <th>Customer Home</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    {/* Preview */}
                    <td>
                      <img
                        src={banner.imageUrl}
                        alt="Banner"
                        className="banner-preview"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/120x60?text=No+Image";
                        }}
                      />
                    </td>

                    {/* Title */}
                    <td>
                      <div className="banner-title">{banner.title}</div>
                    </td>

                    {/* Link URL */}
                    <td>
                      <div className="banner-link">{banner.linkUrl || "No link"}</div>
                    </td>

                    {/* Status */}
                    <td>
                      {banner.active ? (
                        <span className="status-badge active">
                          <i className="fas fa-check-circle"></i> Active
                        </span>
                      ) : (
                        <span className="status-badge inactive">
                          <i className="fas fa-times-circle"></i> Inactive
                        </span>
                      )}
                    </td>

                    {/* Toggle: show on home.html */}
                    <td style={{ textAlign: "center" }}>
                      <form
                        action={`/admin/content/toggle-home/${banner.id}`}
                        method="post"
                        style={{ margin: 0, display: "inline" }}
                      >
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        <label className="toggle-switch" title="Show on Home Page">
                          <input
                            type="checkbox"
                            defaultChecked={banner.showOnHome}
                            onChange={(e) => e.target.form.submit()}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </form>
                      <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>
                        Home
                      </div>
                    </td>

                    {/* Toggle: show on customer-home.html */}
                    <td style={{ textAlign: "center" }}>
                      <form
                        action={`/admin/content/toggle-customer-home/${banner.id}`}
                        method="post"
                        style={{ margin: 0, display: "inline" }}
                      >
                        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                        <label className="toggle-switch" title="Show on Customer Home">
                          <input
                            type="checkbox"
                            defaultChecked={banner.showOnCustomerHome}
                            onChange={(e) => e.target.form.submit()}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </form>
                      <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>
                        After Login
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="action-btns">
                        <form
                          action={`/admin/content/delete/${banner.id}`}
                          method="post"
                          style={{ margin: 0 }}
                          onSubmit={(e) => {
                            if (!window.confirm("Delete this banner?")) e.preventDefault();
                          }}
                        >
                          {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
                          <button type="submit" className="btn-icon danger" title="Delete">
                            <i className="fas fa-trash"></i>
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer>
        <div className="footer-brand">Ekart</div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
      </footer>
    </>
  );
}