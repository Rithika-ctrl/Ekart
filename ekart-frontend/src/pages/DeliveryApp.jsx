import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { apiFetch } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const S = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @keyframes dkSlideIn { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:translateX(0); } }
  body { font-family: 'DM Sans', sans-serif; }
  .dk-animation { animation: dkSlideIn 0.3s ease; }
`;

export default function DeliveryApp() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [toPickUp, setToPickUp] = useState([]);
  const [outNow, setOutNow] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [togglingAvailable, setTogglingAvailable] = useState(false);

  // Toast
  const [toast, setToast] = useState(null); // { msg, success }
  const toastTimer = useRef(null);
  const showToast = (msg, success = true) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, success });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // Alerts (flash messages)
  const [alerts, setAlerts] = useState([]);

  // Transfer modal
  const [transferModal, setTransferModal] = useState(false);
  const [warehouseList, setWarehouseList] = useState([]);
  const [selectedWh, setSelectedWh] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Per-order OTP state map: { [orderId]: string }
  const [otpMap, setOtpMap] = useState({});
  const setOtp = (id, val) => setOtpMap(prev => ({ ...prev, [id]: val }));

  // Photo capture states
  const [pickupPhotos, setPickupPhotos] = useState({}); // { [orderId]: base64 }
  const [deliveryPhotos, setDeliveryPhotos] = useState({}); // { [orderId]: base64 }
  const [photoModal, setPhotoModal] = useState(null); // { orderId, type: 'pickup' | 'delivery' }
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const api = useCallback((path, opts) => apiFetch(path, opts, auth), [auth]);

  const sanitizePhone = (p) => (p || "").toString().replace(/\D/g, "");
  const telHref = (p) => {
    const s = sanitizePhone(p);
    return s ? `tel:${s}` : "#";
  };
  const waHref = (p, orderId) => {
    const s = sanitizePhone(p);
    if (!s) return "#";
    const txt = `Hi, I'm the Ekart delivery partner for Order #${orderId}.`;
    return `https://wa.me/${s}?text=${encodeURIComponent(txt)}`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Use allSettled to prevent one failure from blocking all data loads
      const results = await Promise.allSettled([
        api("/delivery/profile"),
        api("/delivery/orders"),
        api("/delivery/warehouse-change/pending"),
      ]);

      // Extract results: each can now be { status: 'fulfilled', value } or { status: 'rejected', reason }
      const [profileResult, ordersResult, transferResult] = results;

      // Process profile — critical
      if (profileResult.status === "fulfilled" && profileResult.value?.success) {
        const profileData = profileResult.value.deliveryBoy;
        if (profileData) {
          setProfile(profileData);
          setIsAvailable(profileData?.isAvailable || false);
        } else {
          console.warn("Profile data empty");
          showToast("Profile data incomplete", false);
        }
      } else if (profileResult.status === "rejected") {
        console.error("Profile load error:", profileResult.reason);
        showToast("❌ Failed to load profile - " + (profileResult.reason?.message || "Unknown error"), false);
      } else {
        console.error("Profile error:", profileResult.value?.message);
        showToast("❌ " + (profileResult.value?.message || "Failed to load profile"), false);
      }

      // Process orders — critical
      if (ordersResult.status === "fulfilled" && ordersResult.value?.success) {
        setToPickUp(ordersResult.value.toPickUp || []);
        setOutNow(ordersResult.value.outForDelivery || []);
        setDelivered(ordersResult.value.delivered || []);
      } else if (ordersResult.status === "rejected") {
        console.error("Orders load error:", ordersResult.reason);
        showToast("Failed to load orders", false);
      }

      // Process transfer request — non-critical, graceful degradation
      if (transferResult.status === "fulfilled" && transferResult.value?.success) {
        setPendingTransfer(transferResult.value.request || null);
      } else {
        setPendingTransfer(null);
      }
    } catch (err) {
      // Fallback for unexpected errors
      console.error("Unexpected error in load():", err);
      showToast("An unexpected error occurred", false);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const markPickedUp = async (orderId) => {
    try {
      const d = await api(`/delivery/orders/${orderId}/pickup`, { method: "POST" });
      showToast(d?.message || "Marked as picked up", d?.success);
      if (d?.success) setTimeout(load, 1800);
    } catch { showToast("Request failed. Try again.", false); }
  };

  const toggleAvailability = async () => {
    setTogglingAvailable(true);
    try {
      const newStatus = !isAvailable;
      const d = await api("/delivery/availability/toggle", { 
        method: "POST", 
        body: JSON.stringify({ isAvailable: newStatus })
      });
      if (d?.success) {
        // Prefer server-returned value to stay in sync
        const serverStatus = d.isAvailable !== undefined ? d.isAvailable : newStatus;
        setIsAvailable(serverStatus);
        showToast(serverStatus ? "🟢 You are now ONLINE — Available for deliveries" : "⚫ You are now OFFLINE — Not available for deliveries", true);
        setTimeout(load, 500);
      } else {
        showToast("❌ " + (d?.message || "Failed to update status"), false);
      }
    } catch (err) {
      console.error("Toggle error:", err);
      showToast("❌ Request failed. Check connection and try again.", false);
    } finally {
      setTogglingAvailable(false);
    }
  };

  const confirmDelivery = async (orderId) => {
    const otp = (otpMap[orderId] || "").trim();
    if (!otp || otp.length !== 6) { showToast("Enter the 6-digit OTP from customer.", false); return; }
    if (!window.confirm(`Confirm delivery of Order #${orderId} with OTP ${otp}?`)) return;
    try {
      const d = await api(`/delivery/orders/${orderId}/deliver`, { 
        method: "POST", 
        body: JSON.stringify({ otp: otp })
      });
      showToast(d?.message || "Delivery confirmed", d?.success);
      if (d?.success) setTimeout(load, 1800);
    } catch { showToast("Request failed. Try again.", false); }
  };

  const loadWarehouses = async () => {
    const d = await api("/delivery/warehouses").catch(() => null);
    if (d?.success) setWarehouseList(d.warehouses || []);
  };

  const openTransferModal = async () => {
    setTransferModal(true);
    setSelectedWh("");
    setTransferReason("");
    await loadWarehouses();
  };

  const submitTransfer = async () => {
    if (!selectedWh || selectedWh === "") { 
      showToast("❌ Please select a warehouse.", false); 
      return; 
    }
    if (!profile?.warehouse) {
      showToast("❌ No current warehouse assigned. Contact admin.", false);
      return;
    }
    try {
      const d = await api("/delivery/warehouse-change/request", {
        method: "POST",
        body: JSON.stringify({ 
          warehouseId: parseInt(selectedWh), 
          reason: transferReason.trim() || "Warehouse change requested"
        })
      });
      if (d?.success) {
        showToast("✅ Transfer request submitted successfully", true);
        setTransferModal(false);
        setTimeout(load, 1500);
      } else {
        showToast(d?.message || "❌ Failed to submit request", false);
      }
    } catch (err) {
      console.error("Transfer error:", err);
      showToast("❌ Request failed. Try again.", false);
    }
  };

  // Photo handling functions
  const openPhotoModal = (orderId, photoType) => {
    setPhotoModal({ orderId, type: photoType });
    setTimeout(() => {
      if (photoType === 'pickup') cameraInputRef.current?.click();
      else photoInputRef.current?.click();
    }, 100);
  };

  const handlePhotoCapture = (e, photoType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (photoModal) {
        if (photoType === 'pickup') {
          setPickupPhotos(prev => ({ ...prev, [photoModal.orderId]: base64 }));
        } else {
          setDeliveryPhotos(prev => ({ ...prev, [photoModal.orderId]: base64 }));
        }
        setPhotoModal(null);
        showToast(`📸 Photo captured successfully`, true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePickupWithPhoto = async (orderId) => {
    if (!pickupPhotos[orderId]) {
      showToast("📸 Please capture a photo of the parcel before marking as picked up", false);
      openPhotoModal(orderId, 'pickup');
      return;
    }
    try {
      const d = await api(`/delivery/orders/${orderId}/pickup`, {
        method: "POST",
        body: JSON.stringify({ photo: pickupPhotos[orderId] })
      });
      showToast(d?.message || "✓ Marked as picked up with photo", d?.success);
      if (d?.success) setTimeout(load, 1800);
    } catch { showToast("Request failed. Try again.", false); }
  };

  const resendOtp = async (orderId) => {
    try {
      const d = await api(`/delivery/orders/${orderId}/resend-otp`, { method: "POST" });
      showToast(d?.message || "OTP resent to customer", d?.success);
    } catch {
      showToast("Failed to resend OTP. Try again.", false);
    }
  };

  const handleDeliveryWithPhoto = async (orderId) => {
    if (!deliveryPhotos[orderId]) {
      showToast("📸 Please capture a photo before confirming delivery", false);
      openPhotoModal(orderId, 'delivery');
      return;
    }
    const otp = (otpMap[orderId] || "").trim();
    if (!otp || otp.length !== 6) { showToast("Enter the 6-digit OTP from customer.", false); return; }
    if (!window.confirm(`Confirm delivery of Order #${orderId} with OTP ${otp}?`)) return;
    try {
      const d = await api(`/delivery/orders/${orderId}/deliver`, {
        method: "POST",
        body: JSON.stringify({ otp, photo: deliveryPhotos[orderId] })
      });
      showToast(d?.message || "✓ Delivery confirmed with photo", d?.success);
      if (d?.success) setTimeout(load, 1800);
    } catch { showToast("Request failed. Try again.", false); }
  };

  const dismissAlert = (i) => setAlerts(prev => prev.filter((_, idx) => idx !== i));

  // ── Pending approval guard
  if (!loading && profile && !profile.approved) {
    return (
      <>
        <style>{S}</style>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-shopping-cart text-lg" />
              <span>Ekart</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-100 text-indigo-600 uppercase">
                <i className="fas fa-motorcycle" /> Delivery
              </span>
              <button 
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-gray-300 rounded-lg hover:bg-red-50 transition"
                onClick={() => { logout(); navigate("/auth", { replace: true }); }}
              >
                <i className="fas fa-sign-out-alt" /> Logout
              </button>
            </div>
          </nav>
          <main className="flex-1 flex items-center justify-center px-4 pt-24">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">⏳</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Admin Approval</h1>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Your account has been verified but is awaiting admin review.
                You'll receive an email at <strong>{profile.email}</strong> once approved.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left text-sm text-gray-700 mb-6">
                <strong>What happens next?</strong><br />
                1. Admin reviews your application 🔍<br />
                2. Admin assigns your warehouse & pin codes 📦<br />
                3. You receive an approval email ✉️<br />
                4. You can then start accepting deliveries 🛵
              </div>
              <button 
                className="w-full px-4 py-3 font-semibold text-red-600 border border-gray-300 rounded-lg hover:bg-red-50 transition"
                onClick={() => { logout(); navigate("/auth", { replace: true }); }}
              >
                <i className="fas fa-sign-out-alt" /> Logout
              </button>
            </div>
          </main>
          <footer className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between text-sm">
            <div className="font-bold text-gray-900">Ekart</div>
            <div className="text-gray-500">© 2026 Ekart. All rights reserved.</div>
          </footer>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{S}</style>
      <div className="min-h-screen flex flex-col bg-gray-50">
        
        {/* Alerts */}
        <div className="fixed top-20 right-6 z-50 flex flex-col gap-2">
          {alerts.map((a, i) => (
            <div key={i} className={`dk-animation p-4 rounded-xl border flex items-center gap-3 min-w-72 shadow-lg ${
              a.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <i className={`fas ${a.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`} />
              <span className="text-sm font-medium flex-1">{a.msg}</span>
              <button className="opacity-60 hover:opacity-100" onClick={() => dismissAlert(i)}>×</button>
            </div>
          ))}
        </div>

        {/* Header */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-shopping-cart text-lg" />
            <span>Ekart Delivery</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-100 text-indigo-600 uppercase">
              <i className="fas fa-motorcycle" /> Delivery Partner
            </span>
            <span className="text-sm text-gray-600 font-medium">
              {profile?.name || auth?.email || "Delivery Partner"}
            </span>
            <button 
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition ${
                togglingAvailable
                  ? "bg-gray-100 border-gray-300 text-gray-500 cursor-wait"
                  : isAvailable 
                    ? "bg-green-50 border-green-300 text-green-600 hover:bg-green-100" 
                    : "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
              }`}
              onClick={toggleAvailability}
              disabled={togglingAvailable}
              title={togglingAvailable ? "Updating status..." : isAvailable ? "Click to go Offline" : "Click to go Online"}
            >
              {togglingAvailable
                ? <><i className="fas fa-spinner fa-spin text-xs" /> Updating…</>
                : isAvailable
                  ? <><i className="fas fa-circle text-xs animate-pulse" /> 🟢 Online</>
                  : <><i className="fas fa-circle text-xs" /> ⚫ Offline</>
              }
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-gray-300 rounded-lg hover:bg-red-50 transition"
              onClick={() => { logout(); navigate("/auth", { replace: true }); }}
            >
              <i className="fas fa-sign-out-alt" /> Logout
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-6 pt-24 pb-8 px-6 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <i className="fas fa-spinner fa-spin text-4xl mb-4" />
              <p className="text-lg">Loading…</p>
            </div>
          ) : (
            <>
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome, <span className="text-indigo-600">{profile?.name ? profile.name.split(' ')[0] : (auth?.email ? auth.email.split('@')[0] : "Delivery Partner")}</span>! 👋
                  </h1>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="text-xs text-gray-600 font-bold">DELIVERY ID</div>
                      <div className="text-lg font-bold text-indigo-600">
                        {profile?.deliveryBoyCode || (profile?.id ? `DEL-${profile.id}` : "N/A")}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="text-xs text-gray-600 font-bold">EMAIL</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">{profile?.email || auth?.email || "N/A"}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="text-xs text-gray-600 font-bold">PHONE</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {profile?.mobile
                          ? <a href={`tel:${profile.mobile}`} className="text-indigo-600 hover:underline">+91 {profile.mobile}</a>
                          : <span className="text-gray-400 italic">Not set</span>
                        }
                      </div>
                    </div>
                    <div className={`rounded-lg p-3 border font-bold text-center ${
                      isAvailable 
                        ? "bg-green-50 border-green-300 text-green-700" 
                        : "bg-red-50 border-red-300 text-red-700"
                    }`}>
                      <div className="text-xs text-gray-600 font-bold mb-1">STATUS</div>
                      {isAvailable ? "🟢 ONLINE" : "⚫ OFFLINE"}
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <i className="fas fa-motorcycle text-4xl text-indigo-600" />
                </div>
              </div>

              {/* Warehouse Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4 hover:shadow-md transition">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-warehouse text-xl text-indigo-600" />
                  </div>
                  {profile?.warehouse ? (
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{profile.warehouse.name || "Warehouse"}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <i className="fas fa-map-marker-alt text-xs" />
                        {profile.warehouse.city || "N/A"}, {profile.warehouse.state || "N/A"}
                      </div>
                      <div className="text-xs text-indigo-600 font-bold mt-1">Code: {profile.warehouse.warehouseCode || "N/A"}</div>
                      {profile.assignedPinCodes ? (
                        <div className="text-xs text-gray-700 mt-2 bg-blue-50 p-2 rounded">
                          <strong>📍 PIN Codes:</strong> {profile.assignedPinCodes}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                          <strong>📍 PIN Codes:</strong> <span className="italic">Not assigned yet — contact admin</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="font-semibold text-red-600">⚠️ No Warehouse Assigned</div>
                      <div className="text-sm text-gray-600">Contact admin to get a warehouse assigned.</div>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {pendingTransfer ? (
                    <div className="inline-block bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-xs font-bold p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fas fa-clock" />
                        <strong>Transfer Pending</strong>
                      </div>
                      <div>To: {pendingTransfer.requestedWarehouse?.name || "Unknown"}</div>
                      <div className="text-xs mt-1">Status: {pendingTransfer.status || "Awaiting Review"}</div>
                    </div>
                  ) : (
                    <button 
                      className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-200 transition flex items-center gap-2 whitespace-nowrap"
                      onClick={openTransferModal}
                    >
                      <i className="fas fa-exchange-alt" /> Request Transfer
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">{toPickUp.length}</div>
                  <div className="text-sm text-gray-600">To Pick Up</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">{outNow.length}</div>
                  <div className="text-sm text-gray-600">Out for Delivery</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition">
                  <div className="text-3xl font-bold text-green-600 mb-2">{delivered.length}</div>
                  <div className="text-sm text-gray-600">Delivered</div>
                </div>
              </div>

              {/* 3-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* TO PICK UP */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-box text-indigo-600" /> 📦 Waiting Pickup
                    </h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold">{toPickUp.length}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {toPickUp.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <i className="fas fa-box-open text-4xl mb-3 block opacity-50" />
                        <p className="text-sm font-medium">No orders waiting for pickup</p>
                      </div>
                    ) : toPickUp.map(order => (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-white hover:border-indigo-300 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-indigo-600 text-sm">Order #{order.id}</span>
                          <span className="text-sm font-bold text-green-600">{fmt(order.amount || order.totalPrice)}</span>
                        </div>
                        <div className="text-sm text-gray-900 font-medium mb-1">{order.customer?.name || order.customerName}</div>
                        <div className="text-xs text-gray-500 mb-2">{order.customer?.mobile || order.mobile}</div>
                        {order.deliveryPinCode && (
                          <div className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold mb-2">
                            📍 PIN: {order.deliveryPinCode}
                          </div>
                        )}
                        {(order.deliveryAddress || order.address) && (
                          <div className="text-xs text-gray-600 mb-2 flex items-start gap-2">
                            <i className="fas fa-map-marker-alt text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div>
                              {order.deliveryAddress || order.address}
                              {order.landmark && <div className="text-gray-500 italic mt-1">📍 {order.landmark}</div>}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <a className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold hover:bg-indigo-100 transition" href={telHref(order.customer?.mobile || order.mobile)}>
                            <i className="fas fa-phone text-xs" /> Call
                          </a>
                          <a className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 text-green-600 rounded text-xs font-semibold hover:bg-green-100 transition" href={waHref(order.customer?.mobile || order.mobile, order.id)} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-whatsapp text-xs" /> Chat
                          </a>
                          <button className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-bold transition ${
                            pickupPhotos[order.id]
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-yellow-500 text-white hover:bg-yellow-600'
                          }`} onClick={() => pickupPhotos[order.id] ? handlePickupWithPhoto(order.id) : openPhotoModal(order.id, 'pickup')}>
                            <i className={`fas ${pickupPhotos[order.id] ? 'fa-check' : 'fa-camera'} text-xs`} /> {pickupPhotos[order.id] ? 'Picked' : 'Photo'}
                          </button>
                        </div>
                        {pickupPhotos[order.id] && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
                            <i className="fas fa-check-circle" /> Photo captured - Ready to mark picked
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* OUT FOR DELIVERY */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-motorcycle text-yellow-600" /> 🛵 Active
                    </h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-600 text-white rounded-full text-xs font-bold">{outNow.length}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {outNow.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <i className="fas fa-road text-4xl mb-3 block opacity-50" />
                        <p className="text-sm font-medium">No active deliveries</p>
                      </div>
                    ) : outNow.map(order => (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-white hover:border-yellow-300 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-indigo-600 text-sm">Order #{order.id}</span>
                          <span className="text-sm font-bold text-green-600">{fmt(order.amount || order.totalPrice)}</span>
                        </div>
                        <div className="text-sm text-gray-900 font-medium mb-1">{order.customer?.name || order.customerName}</div>
                        <div className="text-xs text-gray-500 mb-2">{order.customer?.mobile || order.mobile}</div>
                        {order.deliveryPinCode && (
                          <div className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold mb-2">
                            📍 PIN: {order.deliveryPinCode}
                          </div>
                        )}
                        {(order.deliveryAddress || order.address) && (
                          <div className="text-xs text-gray-600 mb-3 flex items-start gap-2">
                            <i className="fas fa-map-marker-alt text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div>
                              {order.deliveryAddress || order.address}
                              {order.landmark && <div className="text-gray-500 italic mt-1">📍 {order.landmark}</div>}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mb-3">
                          <a className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold hover:bg-indigo-100 transition" href={telHref(order.customer?.mobile || order.mobile)}>
                            <i className="fas fa-phone text-xs" /> Call
                          </a>
                          <a className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 text-green-600 rounded text-xs font-semibold hover:bg-green-100 transition" href={waHref(order.customer?.mobile || order.mobile, order.id)} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-whatsapp text-xs" /> Chat
                          </a>
                        </div>
                        
                        {/* Photo Capture Section */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 mb-2">
                          <label className="text-xs font-bold text-orange-700 flex items-center gap-2 mb-2">
                            <i className="fas fa-camera text-xs" /> 📸 Take Photo Before Delivery
                          </label>
                          <button 
                            className={`w-full py-2 rounded text-xs font-bold transition flex items-center justify-center gap-2 ${
                              deliveryPhotos[order.id]
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200'
                            }`}
                            onClick={() => openPhotoModal(order.id, 'delivery')}
                          >
                            <i className={`fas ${deliveryPhotos[order.id] ? 'fa-check-circle' : 'fa-camera'} text-sm`} /> 
                            {deliveryPhotos[order.id] ? '✓ Photo Captured' : '📸 Capture Photo'}
                          </button>
                          {!deliveryPhotos[order.id] && (
                            <div className="p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-800 mt-2 flex items-start gap-2">
                              <i className="fas fa-exclamation-circle flex-shrink-0 mt-0.5" />
                              <span><strong>MANDATORY:</strong> Photo required before delivery</span>
                            </div>
                          )}
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-green-700 flex items-center gap-2">
                              <i className="fas fa-key text-xs" /> OTP
                            </label>
                            <button
                              className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                              onClick={() => resendOtp(order.id)}
                            >
                              <i className="fas fa-paper-plane text-xs" /> Resend OTP
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              className="flex-1 bg-white border border-green-300 rounded px-2 py-1.5 text-center text-sm font-mono focus:border-green-600 focus:ring-1 focus:ring-green-300 outline-none"
                              placeholder="000000"
                              maxLength={6}
                              min={100000}
                              max={999999}
                              value={otpMap[order.id] || ""}
                              onChange={e => setOtp(order.id, e.target.value)}
                            />
                            <button 
                              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                                deliveryPhotos[order.id]
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-400 text-white cursor-not-allowed'
                              }`}
                              onClick={() => handleDeliveryWithPhoto(order.id)}
                              disabled={!deliveryPhotos[order.id]}
                            >
                              <i className="fas fa-check text-xs" /> Deliver
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DELIVERED */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-check-circle text-green-600" /> ✅ Completed
                    </h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-xs font-bold">{delivered.length}</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {delivered.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <i className="fas fa-clipboard-check text-4xl mb-3 block opacity-50" />
                        <p className="text-sm font-medium">No completed deliveries yet</p>
                      </div>
                    ) : delivered.map(order => (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-75 hover:opacity-100 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-indigo-600 text-sm">Order #{order.id}</span>
                          <span className="text-sm font-bold text-green-600">{fmt(order.amount || order.totalPrice)}</span>
                        </div>
                        <div className="text-sm text-gray-900 font-medium mb-1">{order.customer?.name || order.customerName}</div>
                        <div className="text-xs text-gray-500">
                          {(order.items || []).map((item, i) => (
                            <span key={i}>{item.name} ×{item.quantity}{i < order.items.length - 1 ? ", " : ""}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between text-sm">
          <div className="font-bold text-gray-900">Ekart</div>
          <div className="text-gray-500">© 2026 Ekart. All rights reserved.</div>
        </footer>

        {/* Warehouse Transfer Modal */}
        {transferModal && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setTransferModal(false); }}>
            <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <i className="fas fa-exchange-alt text-indigo-600" /> Request Warehouse Transfer
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Your request will be reviewed by admin. You will be notified by email once approved or rejected.
              </p>
              {profile?.warehouse && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <strong>Current Warehouse:</strong> {profile.warehouse.name} ({profile.warehouse.city})
                </div>
              )}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-900 uppercase mb-2 tracking-wider">Transfer to Warehouse *</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:border-indigo-600 focus:bg-white outline-none transition"
                  value={selectedWh} 
                  onChange={e => setSelectedWh(e.target.value)}
                >
                  <option value="">— Select a warehouse —</option>
                  {warehouseList
                    .filter(w => !profile?.warehouse || w.id !== profile.warehouse.id)
                    .map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} • {w.city}, {w.state} {w.warehouseCode ? `(${w.warehouseCode})` : ""}
                      </option>
                    ))}
                </select>
                {warehouseList.length === 0 && (
                  <div className="text-xs text-red-600 mt-1">No other warehouses available</div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-900 uppercase mb-2 tracking-wider">
                  Reason <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:border-indigo-600 focus:bg-white outline-none transition resize-none"
                  placeholder="e.g. Relocating, closer to new address, traffic reasons..."
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  maxLength={500}
                  rows="3"
                />
                <div className="text-xs text-gray-500 mt-1">{transferReason.length}/500</div>
              </div>
              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                  onClick={() => setTransferModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                    selectedWh && warehouseList.length > 0
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-400 text-white cursor-not-allowed"
                  }`}
                  onClick={submitTransfer}
                  disabled={!selectedWh || warehouseList.length === 0}
                >
                  <i className="fas fa-paper-plane" /> Submit Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden File Inputs for Photo Capture */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePhotoCapture(e, 'pickup')}
          style={{ display: 'none' }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePhotoCapture(e, 'delivery')}
          style={{ display: 'none' }}
        />

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className={`p-4 rounded-xl border flex items-center gap-3 min-w-64 shadow-lg dk-animation ${
              toast.success 
                ? "bg-green-50 border-green-200 text-green-700" 
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <i className={`fas ${toast.success ? "fa-check-circle" : "fa-exclamation-circle"}`} />
              <span className="text-sm font-medium">{toast.msg}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}