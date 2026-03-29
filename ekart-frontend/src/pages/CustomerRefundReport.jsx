import { useState, useEffect, useRef } from "react";

const statusColor = {
  PENDING:  { text: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
  APPROVED: { text: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.3)"   },
  REJECTED: { text: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)"   },
};

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN");

function btnStyle(bg, color) {
  return {
    padding: "6px 12px", borderRadius: 7, border: "none",
    background: bg, color, fontWeight: 600, fontSize: 12, cursor: "pointer",
  };
}

/* ── single refund card with inline image section ── */
function RefundCard({ entry, api, onSelectOrder }) {
  const [images, setImages]       = useState(null);
  const [expanded, setExpanded]   = useState(false);
  const [files, setFiles]         = useState([]);
  const [previews, setPreviews]   = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef              = useRef(null);

  const sc = statusColor[entry.status] || statusColor.PENDING;

  /* lazy-load existing images on first expand */
  useEffect(() => {
    if (!expanded || images !== null || !entry.refundId) return;
    api(`/refund/${entry.refundId}/images`)
      .then(d => setImages(d.success ? (d.images || []) : []))
      .catch(() => setImages([]));
  }, [expanded, entry.refundId]);

  const onFilesChange = (e) => {
    const slotsLeft = 5 - (images ? images.length : 0);
    const picked = Array.from(e.target.files).slice(0, slotsLeft);
    setFiles(picked);
    setPreviews(picked.map(f => URL.createObjectURL(f)));
    setUploadMsg("");
  };

  const doUpload = async () => {
    if (!files.length || !entry.refundId) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const form = new FormData();
      files.forEach(f => form.append("images", f));
      const d = await api(`/refund/${entry.refundId}/upload-image`, {
        method: "POST",
        body: form,
        headers: {},   // let browser set multipart boundary
      });
      if (d.success) {
        setUploadMsg(`\u2713 ${d.uploaded} photo${d.uploaded !== 1 ? "s" : ""} uploaded`);
        setFiles([]);
        setPreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        const r = await api(`/refund/${entry.refundId}/images`);
        if (r.success) setImages(r.images || []);
      } else {
        setUploadMsg(`\u2717 ${d.message || "Upload failed"}`);
      }
    } catch {
      setUploadMsg("\u2717 Upload failed \u2014 please try again");
    }
    setUploading(false);
  };

  const slotsLeft = 5 - (images ? images.length : 0);

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${sc.border}`, background: sc.bg, overflow: "hidden" }}>

      {/* header */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#e5e7eb" }}>Order #{entry.orderId}</span>
            {entry.orderDate && (
              <span style={{ marginLeft: 10, fontSize: 12, color: "#6b7280" }}>
                {new Date(entry.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}>
            {entry.status}
          </span>
        </div>

        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>
          <span style={{ color: "#a5b4fc", fontWeight: 600 }}>{entry.type}</span>
          {entry.reason && <span> \u2014 {entry.reason}</span>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#d1d5db", fontWeight: 600 }}>{fmt(entry.amount)}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {entry.refundId && (
              <button
                style={btnStyle(expanded ? "#374151" : "#1f2937", "#9ca3af")}
                onClick={() => setExpanded(v => !v)}
              >
                {expanded ? "\u25b2 Hide photos" : `\ud83d\udcf7 Photos${images ? ` (${images.length})` : ""}`}
              </button>
            )}
            <button
              style={btnStyle("#4f46e5", "#fff")}
              onClick={() => onSelectOrder && onSelectOrder({ id: entry.orderId })}
            >
              View Order
            </button>
          </div>
        </div>
      </div>

      {/* expanded image section */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px", background: "rgba(0,0,0,0.2)" }}>

          {images === null && (
            <p style={{ color: "#6b7280", fontSize: 13 }}>Loading photos\u2026</p>
          )}

          {images !== null && images.length === 0 && entry.status !== "PENDING" && (
            <p style={{ color: "#6b7280", fontSize: 13 }}>No evidence photos on this refund.</p>
          )}

          {images !== null && images.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: 8 }}>
                Evidence photos ({images.length}/5)
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {images.map(img => (
                  <a key={img.id} href={img.imageUrl} target="_blank" rel="noreferrer">
                    <img src={img.imageUrl} alt="evidence"
                      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "2px solid rgba(99,102,241,0.4)", cursor: "pointer", display: "block" }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* upload — PENDING only, slots remaining */}
          {entry.status === "PENDING" && slotsLeft > 0 && (
            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 10 }}>
                \ud83d\udcce Add evidence photos ({slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} remaining)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ fontSize: 12, color: "#d1d5db", display: "block", marginBottom: 10 }}
                onChange={onFilesChange}
              />
              {previews.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt={`preview ${i + 1}`}
                      style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 8, border: "2px solid rgba(99,102,241,0.5)" }}
                    />
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  style={{ ...btnStyle(files.length === 0 || uploading ? "#374151" : "#4f46e5", "#fff"), opacity: files.length === 0 || uploading ? 0.6 : 1, cursor: files.length === 0 || uploading ? "not-allowed" : "pointer" }}
                  onClick={doUpload}
                  disabled={files.length === 0 || uploading}
                >
                  {uploading ? "Uploading\u2026" : files.length > 0 ? `Upload ${files.length} photo${files.length !== 1 ? "s" : ""}` : "Upload photos"}
                </button>
                {files.length > 0 && !uploading && (
                  <button
                    style={{ ...btnStyle("transparent", "#6b7280"), border: "1px solid rgba(255,255,255,0.12)" }}
                    onClick={() => { setFiles([]); setPreviews([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  >
                    Clear
                  </button>
                )}
                {uploadMsg && (
                  <span style={{ fontSize: 12, color: uploadMsg.startsWith("\u2713") ? "#22c55e" : "#ef4444" }}>
                    {uploadMsg}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: "#4b5563", marginTop: 8 }}>
                JPG, PNG or WEBP \u00b7 max 5\u00a0MB each \u00b7 up to 5 photos per refund
              </p>
            </div>
          )}

          {entry.status === "PENDING" && slotsLeft === 0 && (
            <p style={{ fontSize: 12, color: "#6b7280" }}>Maximum 5 evidence photos already uploaded.</p>
          )}

          {entry.status !== "PENDING" && (
            <p style={{ fontSize: 12, color: "#4b5563", marginTop: images && images.length > 0 ? 10 : 0 }}>
              Photo uploads are only available while a refund is pending review.
            </p>
          )}

        </div>
      )}
    </div>
  );
}

/* ── main component ── */
export default function CustomerRefundReport({ api, onSelectOrder }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [filter, setFilter]   = useState("ALL");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const d = await api("/orders");
        if (!d.success) { setEntries([]); setLoading(false); return; }
        const orders = d.orders || [];
        const results = await Promise.all(orders.map(async (o) => {
          const r = await api(`/refund/status/${o.id}`);
          if (r && r.success && r.hasRefund) {
            return {
              orderId:   o.id,
              orderDate: o.orderDate,
              amount:    o.totalPrice || o.amount || 0,
              status:    r.status,
              type:      r.type,
              reason:    r.reason || "",
              refundId:  r.refundId || null,
            };
          }
          return null;
        }));
        setEntries(
          results.filter(Boolean).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        );
      } catch { setEntries([]); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = entries.filter(e => filter === "ALL" || e.status === filter);
  const counts   = {
    ALL: entries.length,
    PENDING:  entries.filter(e => e.status === "PENDING").length,
    APPROVED: entries.filter(e => e.status === "APPROVED").length,
    REJECTED: entries.filter(e => e.status === "REJECTED").length,
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "#e5e7eb" }}>Refund History</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${filter === f ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)"}`,
              background: filter === f ? "rgba(99,102,241,0.2)" : "transparent",
              color: filter === f ? "#a5b4fc" : "#9ca3af",
            }}
          >
            {f}{counts[f] > 0 && <span style={{ opacity: 0.7 }}> ({counts[f]})</span>}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>Loading refund history\u2026</div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>
          {filter === "ALL" ? "No refund requests found." : `No ${filter.toLowerCase()} refunds.`}
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map(e => (
          <RefundCard key={e.orderId} entry={e} api={api} onSelectOrder={onSelectOrder} />
        ))}
      </div>
    </div>
  );
}