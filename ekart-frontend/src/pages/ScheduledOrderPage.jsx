import { useState, useEffect } from "react";

export default function ScheduledOrderPage({ api, products, profile, showToast }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    quantity: 1,
    frequencyType: "DAILY",
    frequencyValue: 1,
    durationDays: null,
    addressId: null,
    paymentMode: "COD",
    startDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await api("/api/flutter/scheduled-orders");
      setSchedules(data || []);
    } catch (err) {
      showToast("Failed to load scheduled orders");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedProduct || !formData.addressId) {
      showToast("Please select a product and address");
      return;
    }

    try {
      const result = await api("/api/flutter/scheduled-orders", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: formData.quantity,
          frequencyType: formData.frequencyType,
          frequencyValue: formData.frequencyValue,
          durationDays: formData.durationDays,
          addressId: formData.addressId,
          paymentMode: formData.paymentMode,
          startDate: formData.startDate,
        }),
      });

      if (result.success) {
        showToast("Scheduled order created successfully!");
        loadSchedules();
        setShowForm(false);
        setSelectedProduct(null);
      }
    } catch (err) {
      showToast("Error creating scheduled order");
    }
  };

  const handleUpdateSchedule = async (id, updates) => {
    try {
      const url = "/api/flutter/scheduled-orders/" + id;
      const result = await api(url, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      if (result.success) {
        showToast("Schedule updated successfully!");
        loadSchedules();
      }
    } catch (err) {
      showToast("Error updating schedule");
    }
  };

  const handleCancelSchedule = async (id) => {
    if (!window.confirm("Cancel this scheduled order?")) return;

    try {
      const url = "/api/flutter/scheduled-orders/" + id + "/cancel";
      const result = await api(url, {
        method: "DELETE",
      });

      if (result.success) {
        showToast("Schedule cancelled");
        loadSchedules();
      }
    } catch (err) {
      showToast("Error cancelling schedule");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px", color: "#e5e7eb" }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30 }}>📅 Scheduled Orders</h2>

      {!showForm ? (
        <button
          style={{
            padding: "10px 20px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            marginBottom: 24,
            fontWeight: 600,
          }}
          onClick={() => setShowForm(true)}
        >
          + Create New Schedule
        </button>
      ) : (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(51, 65, 85, 0.4), rgba(30, 41, 59, 0.4))",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h3 style={{ marginBottom: 20 }}>Create Scheduled Order</h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Product</label>
            <select
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                color: "#f3f4f6",
                boxSizing: "border-box",
              }}
              value={selectedProduct?.id || ""}
              onChange={(e) => {
                const prod = products.find((p) => p.id === parseInt(e.target.value));
                setSelectedProduct(prod);
              }}
            >
              <option value="">-- Choose Product --</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Quantity</label>
            <input
              type="number"
              min="1"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                color: "#f3f4f6",
                boxSizing: "border-box",
              }}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
              }
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Frequency</label>
            <select
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                color: "#f3f4f6",
                boxSizing: "border-box",
              }}
              value={formData.frequencyType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  frequencyType: e.target.value,
                  frequencyValue: e.target.value === "DAILY" ? 1 : formData.frequencyValue,
                })
              }
            >
              <option value="DAILY">Daily</option>
              <option value="EVERY_N_DAYS">Every N Days</option>
            </select>
          </div>

          {formData.frequencyType === "EVERY_N_DAYS" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Days</label>
              <input
                type="number"
                min="2"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  borderRadius: 8,
                  color: "#f3f4f6",
                  boxSizing: "border-box",
                }}
                value={formData.frequencyValue}
                onChange={(e) =>
                  setFormData({ ...formData, frequencyValue: parseInt(e.target.value) || 2 })
                }
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              Duration (days)
            </label>
            <input
              type="number"
              min="1"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                color: "#f3f4f6",
                boxSizing: "border-box",
              }}
              value={formData.durationDays || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  durationDays: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Address</label>
            <select
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                color: "#f3f4f6",
                boxSizing: "border-box",
              }}
              value={formData.addressId || ""}
              onChange={(e) => setFormData({ ...formData, addressId: parseInt(e.target.value) })}
            >
              <option value="">-- Select Address --</option>
              {profile?.addresses?.map((addr) => (
                <option key={addr.id} value={addr.id}>
                  {addr.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Payment</label>
            <select
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                color: "#f3f4f6",
                boxSizing: "border-box",
              }}
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
            >
              <option value="COD">Cash on Delivery</option>
              <option value="ONLINE_AUTOPAY">Auto Pay</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              style={{
                padding: "10px 20px",
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={handleCreateSchedule}
            >
              Create
            </button>
            <button
              style={{
                padding: "10px 20px",
                background: "rgba(148, 163, 184, 0.2)",
                color: "#cbd5e1",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          Loading...
        </div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          No scheduled orders. Create one to set up recurring deliveries!
        </div>
      ) : (
        schedules.map((schedule) => (
          <div
            key={schedule.id}
            style={{
              background: "linear-gradient(135deg, rgba(51, 65, 85, 0.4), rgba(30, 41, 59, 0.4))",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                {schedule.productName}
              </div>
              <div style={{ fontSize: 13, marginBottom: 6, color: "#d1d5db" }}>
                <span style={{ color: "#9ca3af" }}>Price:</span> ₹{schedule.productPrice}
              </div>
              <div style={{ fontSize: 13, marginBottom: 6, color: "#d1d5db" }}>
                <span style={{ color: "#9ca3af" }}>Quantity:</span> {schedule.quantity}
              </div>
              <div style={{ fontSize: 13, marginBottom: 6, color: "#d1d5db" }}>
                <span style={{ color: "#9ca3af" }}>Frequency:</span>{" "}
                {schedule.frequencyType === "DAILY"
                  ? "Daily"
                  : "Every " + schedule.frequencyValue + " days"}
              </div>
              <div style={{ fontSize: 13, marginBottom: 6, color: "#d1d5db" }}>
                <span style={{ color: "#9ca3af" }}>Status:</span>{" "}
                <span style={{ fontWeight: 600 }}>{schedule.status}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexDirection: "column", minWidth: 120 }}>
              {schedule.status === "ACTIVE" ? (
                <button
                  style={{
                    padding: "8px 12px",
                    background: "rgba(148, 163, 184, 0.2)",
                    color: "#cbd5e1",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  onClick={() => handleUpdateSchedule(schedule.id, { status: "PAUSED" })}
                >
                  Pause
                </button>
              ) : (
                <button
                  style={{
                    padding: "8px 12px",
                    background: "#6366f1",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  onClick={() => handleUpdateSchedule(schedule.id, { status: "ACTIVE" })}
                >
                  Resume
                </button>
              )}
              <button
                style={{
                  padding: "8px 12px",
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#fca5a5",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
                onClick={() => handleCancelSchedule(schedule.id)}
              >
                Cancel
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
