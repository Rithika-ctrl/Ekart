import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../App";
import { apiFetch } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const stars = r => "★".repeat(r) + "☆".repeat(5 - r);
const statusColor = { PLACED: "#f59e0b", CONFIRMED: "#6366f1", SHIPPED: "#3b82f6", OUT_FOR_DELIVERY: "#8b5cf6", DELIVERED: "#22c55e", CANCELLED: "#ef4444" };

/* ── Layout ── */
import AuthPage from "./AuthPage";
import RefundReportPage from "./CustomerRefundReport";
import AddressMap from "../components/AddressMap";
import VendorCsvUpload from "./VendorCsvUpload";

/* ── GuestGate ────────────────────────────────────────────────────
   Wraps any page that requires login. When auth is null or GUEST,
   renders a friendly login prompt instead of the real content.
   onShowAuth is passed from the Layout/CustomerApp root so clicking
   "Sign In" opens the auth modal inline without a page reload.
─────────────────────────────────────────────────────────────────── */
function GuestGate({ auth, onShowAuth, children, pageName = "this page" }) {
  if (!auth || auth.role === "GUEST") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: 320, textAlign: "center",
        padding: "40px 24px",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>
          Sign in to access {pageName}
        </h2>
        <p style={{ color: "#6b7280", fontSize: 15, maxWidth: 360, marginBottom: 28 }}>
          Create a free account or sign in to unlock your cart, orders, wishlist and more.
        </p>
        <button
          style={{
            background: "#6366f1", color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 32px", fontSize: 15,
            fontWeight: 600, cursor: "pointer",
          }}
          onClick={onShowAuth}
        >
          Sign In / Register
        </button>
      </div>
    );
  }
  return children;
}



function Layout({ nav, children, onShowAuth }) {
  return <div style={cs.root}><Nav nav={nav} onShowAuth={onShowAuth} /><main style={cs.main}>{children}</main></div>;
}
function Nav({ nav, onShowAuth }) {
  const { auth, logout } = useAuth();
  const tabs = [
    { key: "home", label: "🏠 Home" }, { key: "search", label: "🔍 Search" },
    { key: "products", label: "🛍️ Shop" }, { key: "cart", label: "🛒 Cart" },
    { key: "orders", label: "📦 Orders" }, { key: "track", label: "🚚 Track" },
    { key: "wishlist", label: "❤️ Wishlist" }, { key: "coupons", label: "🎟️ Coupons" },
    { key: "refunds", label: "🧾 Refunds" }, { key: "spending", label: "💰 Spending" }, { key: "profile", label: "👤 Profile" },
  ];
  // Add vendor tab dynamically for vendor role
  if (auth && auth.role === 'VENDOR') {
    tabs.push({ key: 'vendor', label: '🏬 Vendor' });
  }
  return (
    <nav style={cs.nav}>
      <span style={cs.brand}>🛒 EKART</span>
      <div style={cs.navLinks}>
        {tabs.map(t => (
          <button key={t.key} style={{ ...cs.navBtn, ...(nav.active === t.key ? cs.navBtnActive : {}) }}
            onClick={() => nav.go(t.key)}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={cs.greeting}>Hi, {auth?.name?.split(" ")[0] || "Guest"}</span>
        {auth ? (
          <button style={cs.logoutBtn} onClick={logout}>Logout</button>
        ) : (
          <button style={cs.logoutBtn} onClick={onShowAuth}>Sign in</button>
        )}
      </div>
    </nav>
  );
}

function Toast({ msg, onHide }) {
  useEffect(() => { if (msg) { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return <div style={cs.toast}>{msg}</div>;
}

/* ── Main ── */
export default function CustomerApp() {
  const { auth } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [page, setPage] = useState("home");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0, itemCount: 0, subtotal: 0, deliveryCharge: 0 });
  const [orders, setOrders] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [profile, setProfile] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [spendingData, setSpendingData] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cartLoading, setCartLoading] = useState({});
  const [paymentPage, setPaymentPage] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [reportOrder, setReportOrder] = useState(null);
  const [reorderStockCheck, setReorderStockCheck] = useState(null); // { orderId, items, hasOutOfStock }

  // recently viewed products (client + server sync)
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);

  const readLocalRecentlyViewed = () => {
    try {
      const raw = localStorage.getItem("recentlyViewed");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map(Number).filter(Boolean);
    } catch (e) {}
    return [];
  };

  const saveLocalRecentlyViewed = (ids) => {
    try { localStorage.setItem("recentlyViewed", JSON.stringify(ids)); } catch (e) {}
  };

  const fetchRecentlyViewedProducts = async (ids) => {
    if (!ids || ids.length === 0) { setRecentlyViewedProducts([]); return; }
    try {
      const q = ids.join(",");
      const res = await fetch(`/api/recently-viewed/products?ids=${q}`);
      const data = await res.json();
      if (Array.isArray(data)) setRecentlyViewedProducts(data);
      else setRecentlyViewedProducts([]);
    } catch (e) { setRecentlyViewedProducts([]); }
  };

  const syncRecentlyViewedToServer = async (ids) => {
    if (!auth || auth?.role !== "CUSTOMER") return;
    try {
      const headers = { "Content-Type": "application/json" };
      if (auth) headers["X-Customer-Id"] = auth.id;
      await fetch("/api/recently-viewed/sync", { method: "POST", headers, body: JSON.stringify({ productIds: ids }), credentials: "include" });
    } catch (e) { /* ignore */ }
  };

  const recordRecentlyViewed = async (productId) => {
    if (!productId) return;
    const cur = readLocalRecentlyViewed();
    const ids = [productId, ...cur.filter(id => id !== productId)].slice(0, 10);
    saveLocalRecentlyViewed(ids);
    fetchRecentlyViewedProducts(ids);
    syncRecentlyViewedToServer(ids);
  };

  const loadInitialRecentlyViewed = async () => {
    try {
      if (auth && auth.role === "CUSTOMER") {
        const headers = { "Content-Type": "application/json" };
        if (auth) headers["X-Customer-Id"] = auth.id;
        const res = await fetch("/api/recently-viewed/sync", { headers, credentials: "include" });
        const d = await res.json();
        const ids = (d && d.productIds) ? d.productIds : readLocalRecentlyViewed();
        saveLocalRecentlyViewed(ids);
        fetchRecentlyViewedProducts(ids);
        return;
      }
      const local = readLocalRecentlyViewed();
      fetchRecentlyViewedProducts(local);
    } catch (e) { fetchRecentlyViewedProducts(readLocalRecentlyViewed()); }
  };

  const api = useCallback((path, opts) => apiFetch(path, opts, auth), [auth]);
  const showToast = m => setToast(m);

  const loadProducts = useCallback(async (q = "", cat = "") => {
    let path = "/products";
    const params = [];
    if (q) params.push(`search=${encodeURIComponent(q)}`);
    if (cat) params.push(`category=${encodeURIComponent(cat)}`);
    if (params.length) path += "?" + params.join("&");
    const d = await api(path);
    if (d.success) setProducts(d.products || []);
  }, [api]);

  const loadCategories = useCallback(async () => {
    const d = await api("/products/categories");
    if (d.success) setCategories(d.categories || []);
  }, [api]);

  const loadCart = useCallback(async () => {
    const d = await api("/cart");
    if (d.success) setCart(d);
  }, [api]);

  const loadOrders = useCallback(async () => {
    const d = await api("/orders");
    if (d.success) setOrders(d.orders || []);
  }, [api]);

  const loadWishlist = useCallback(async () => {
    const d = await api("/wishlist/ids");
    if (d.success) setWishlistIds(d.ids || []);
  }, [api]);

  const loadProfile = useCallback(async () => {
    const d = await api("/profile");
    if (d.success) setProfile(d.profile);
  }, [api]);

  const loadCoupons = useCallback(async () => {
    const d = await api("/coupons");
    if (d.success) setCoupons(d.coupons || []);
  }, [api]);

  const loadSpending = useCallback(async () => {
    const d = await api("/spending-summary");
    if (d.success) setSpendingData(d);
  }, [api]);

  useEffect(() => { 
    loadProducts(); loadCategories();
    if (auth?.role === "CUSTOMER") {
      loadCart(); loadWishlist(); loadProfile();
    }
    // load recently viewed products (local or server)
    loadInitialRecentlyViewed();
  }, []);
  useEffect(() => { if (page === "orders" || page === "track") loadOrders(); }, [page]);
  useEffect(() => { if (page === "coupons") loadCoupons(); }, [page]);
  useEffect(() => { if (page === "spending") loadSpending(); }, [page]);

  const addToCart = async (productId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to add items to cart"); return; }
    setCartLoading(l => ({ ...l, [productId]: true }));
    const d = await api("/cart/add", { method: "POST", body: JSON.stringify({ productId }) });
    if (d.success) { showToast("Added to cart ✓"); loadCart(); }
    else showToast(d.message || "Failed to add");
    setCartLoading(l => ({ ...l, [productId]: false }));
  };

  const removeFromCart = async (productId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to manage your cart"); return; }
    const d = await api(`/cart/remove/${productId}`, { method: "DELETE" });
    if (d?.success) {
      await loadCart();
      showToast("Removed from cart");
    } else {
      showToast(d?.message || "Failed to remove item — please try again");
    }
  };

  const updateCartQty = async (productId, quantity) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to manage your cart"); return; }
    const d = await api("/cart/update", { method: "PUT", body: JSON.stringify({ productId, quantity }) });
    if (d?.success) {
      await loadCart();
    } else {
      showToast(d?.message || "Failed to update quantity");
    }
  };

  const applyCoupon = async (code) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to apply coupons"); return; }
    if (!code || !code.trim()) { showToast("Enter a coupon code"); return; }
    const d = await api("/cart/coupon", { method: "POST", body: JSON.stringify({ code: code.trim().toUpperCase() }) });
    if (d.success) {
      await loadCart(); // refresh so couponApplied / couponDiscount / total update first
      showToast(d.message || `Coupon applied! Saving ₹${Math.round(d.discount || 0)}`);
    } else {
      showToast(d.message || "Invalid coupon");
    }
  };

  const removeCoupon = async () => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to manage coupons"); return; }
    const d = await api("/cart/coupon", { method: "DELETE" });
    if (d?.success) {
      await loadCart();
      showToast("Coupon removed");
    } else {
      showToast(d?.message || "Failed to remove coupon");
    }
  };

  const toggleWishlist = async (productId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to save items to wishlist"); return; }
    const d = await api("/wishlist/toggle", { method: "POST", body: JSON.stringify({ productId }) });
    if (d.success) { loadWishlist(); showToast(d.message || "Wishlist updated"); }
  };

  const placeOrder = async (addressId, paymentMode = "COD", deliveryTime = "STANDARD") => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to place an order"); return; }
    // Pass coupon code (if applied) so the backend can cross-validate at order time
    const couponCode = cart?.couponCode || "";
    const d = await api("/orders/place", { method: "POST", body: JSON.stringify({ paymentMode, addressId, couponCode, deliveryTime }) });
    if (d.success) {
      const savedMsg = d.couponDiscount > 0 ? ` You saved ₹${Math.round(d.couponDiscount)}!` : "";
      showToast("Order placed! 🎉" + savedMsg);
      setOrderSuccess(d);
      setPaymentPage(false);
      loadCart(); loadOrders(); setPage("success");
    } else showToast(d.message || "Failed to place order");
  };

  const cancelOrder = async (orderId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to manage orders"); return; }
    const d = await api(`/orders/${orderId}/cancel`, { method: "POST" });
    if (d.success) { showToast("Order cancelled"); loadOrders(); }
    else showToast(d.message || "Cannot cancel");
  };

  const reorderItems = async (orderId) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to reorder items"); return; }
    // Step 1: pre-check stock before touching the cart
    const stock = await api(`/orders/${orderId}/check-stock`);
    if (!stock.success) { showToast(stock.message || "Could not check stock"); return; }
    if (stock.hasOutOfStock) {
      // Show modal so the customer can decide whether to proceed
      setReorderStockCheck({ orderId, items: stock.items });
      return;
    }
    // All items in stock — proceed directly
    const d = await api(`/orders/${orderId}/reorder`, { method: "POST" });
    if (d.success) { showToast("Items added to cart!"); loadCart(); setPage("cart"); }
    else showToast(d.message || "Reorder failed");
  };

  const confirmReorder = async (orderId) => {
    setReorderStockCheck(null);
    const d = await api(`/orders/${orderId}/reorder`, { method: "POST" });
    if (d.success) {
      const partial = d.outOfStockItems?.length > 0;
      showToast(partial ? `Cart updated — ${d.outOfStockItems.length} item(s) unavailable` : "Items added to cart!");
      loadCart();
      setPage("cart");
    } else showToast(d.message || "Reorder failed");
  };

  const reportIssue = async (orderId, data) => {
    if (auth?.role === "GUEST" || !auth) { showToast("Sign in to report issues"); return; }
    const d = await api(`/orders/${orderId}/report-issue`, { method: "POST", body: JSON.stringify(data) });
    if (d.success) { showToast("Issue reported successfully"); setReportOrder(null); }
    else showToast(d.message || "Failed to report");
  };

  const nav = { active: page, go: (p) => { setPage(p); setSelectedProduct(null); setSelectedOrder(null); setPaymentPage(false); } };

  return (
    <>
      <Layout nav={nav} onShowAuth={() => setShowAuth(true)}>
      <Toast msg={toast} onHide={() => setToast("")} />
      {reportOrder && <ReportIssueModal order={reportOrder} onClose={() => setReportOrder(null)} onSubmit={reportIssue} />}
      {reorderStockCheck && <ReorderStockModal stockCheck={reorderStockCheck} onClose={() => setReorderStockCheck(null)} onConfirm={confirmReorder} />}
      <AIAssistantWidget api={api} onNavigate={p => setPage(p)} showToast={showToast} />

      {page === "home" && <HomePage products={products} categories={categories} onShop={() => setPage("products")}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading}
        recentlyViewedProducts={recentlyViewedProducts} />}

      {page === "search" && <SearchPage categories={categories} api={api}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading} />}

      {page === "products" && <ProductsPage products={products} categories={categories} search={search} selectedCat={selectedCat}
        onSearch={q => { setSearch(q); loadProducts(q, selectedCat); }}
        onCat={c => { setSelectedCat(c); loadProducts(search, c); }}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading} />}

      {page === "product" && selectedProduct && <ProductDetailPage product={selectedProduct} onBack={() => setPage("products")}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} api={api} cartLoading={cartLoading}
        onView={recordRecentlyViewed} />}

      {page === "cart" && !paymentPage && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your cart">
          <CartPage cart={cart} onRemove={removeFromCart} onUpdateQty={updateCartQty}
            onApplyCoupon={applyCoupon} onRemoveCoupon={removeCoupon}
            onCheckout={() => setPaymentPage(true)} profile={profile} />
        </GuestGate>
      )}

      {page === "cart" && paymentPage && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="checkout">
          <PaymentPage cart={cart} profile={profile}
            onPlaceOrder={placeOrder} onBack={() => setPaymentPage(false)} />
        </GuestGate>
      )}

      {page === "success" && orderSuccess && <OrderSuccessPage order={orderSuccess}
        onTrack={() => { setPage("track"); setOrderSuccess(null); }}
        onHome={() => { setPage("home"); setOrderSuccess(null); }} />}

      {page === "orders" && !selectedOrder && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your orders">
          <OrdersPage orders={orders} onCancel={cancelOrder}
            onReorder={reorderItems} onReport={o => setReportOrder(o)}
            onTrack={o => { setSelectedOrder(o); setPage("track-single"); }} />
        </GuestGate>
      )}

      {page === "track" && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="order tracking">
          <TrackOrdersPage orders={orders} onSelectOrder={o => { setSelectedOrder(o); setPage("track-single"); }} />
        </GuestGate>
      )}

      {page === "track-single" && selectedOrder && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="order tracking">
          <TrackSingleOrderPage order={selectedOrder} onBack={() => { setPage("track"); setSelectedOrder(null); }} />
        </GuestGate>
      )}

      {page === "wishlist" && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your wishlist">
          <WishlistPage wishlistIds={wishlistIds} products={products} onRemove={toggleWishlist}
            onAddToCart={addToCart} onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }} />
        </GuestGate>
      )}

      {page === "coupons" && <CouponsPage coupons={coupons} showToast={showToast} />}

      {page === "spending" && (
        <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="spending analytics">
          <SpendingPage data={spendingData} orders={orders} onLoadOrders={loadOrders} />
        </GuestGate>
      )}

          {page === "profile" && (
            <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your profile">
              <ProfilePage profile={profile} api={api}
                onUpdate={() => { loadProfile(); showToast("Profile updated!"); }} showToast={showToast} />
            </GuestGate>
          )}
          {page === "refunds" && (
            <GuestGate auth={auth} onShowAuth={() => setShowAuth(true)} pageName="your refunds">
              <RefundReportPage api={api} onSelectOrder={o => { setSelectedOrder(o); setPage("track-single"); }} />
            </GuestGate>
          )}
          {page === 'vendor' && auth?.role === 'VENDOR' && (
            <VendorCsvUpload api={api} auth={auth} />
          )}
      </Layout>
      {showAuth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999 }} onClick={() => setShowAuth(false)}>
          <div onClick={e => e.stopPropagation()}>
            <AuthPage />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Home ── */
/* ── Banner Carousel ── */
function BannerCarousel({ banners }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length, paused]);

  if (!banners || banners.length === 0) return null;

  const prev = () => setIdx(i => (i - 1 + banners.length) % banners.length);
  const next = () => setIdx(i => (i + 1) % banners.length);
  const b = banners[idx];

  return (
    <div
      style={cs.carouselWrap}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide */}
      <a
        href={b.linkUrl || undefined}
        target={b.linkUrl ? "_blank" : undefined}
        rel="noopener noreferrer"
        style={{ display: "block", textDecoration: "none" }}
      >
        <img
          key={b.id}
          src={b.imageUrl}
          alt={b.title || "Banner"}
          style={cs.carouselImg}
          onError={e => { e.target.style.display = "none"; }}
        />
        {b.title && (
          <div style={cs.carouselCaption}>{b.title}</div>
        )}
      </a>

      {/* Prev / Next arrows — only show when >1 banner */}
      {banners.length > 1 && (
        <>
          <button style={{ ...cs.carouselArrow, left: 14 }} onClick={e => { e.preventDefault(); prev(); }} aria-label="Previous">‹</button>
          <button style={{ ...cs.carouselArrow, right: 14 }} onClick={e => { e.preventDefault(); next(); }} aria-label="Next">›</button>

          {/* Dot indicators */}
          <div style={cs.carouselDots}>
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                style={{ ...cs.carouselDot, ...(i === idx ? cs.carouselDotActive : {}) }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HomePage({ products, categories, onShop, onSelectProduct, onAddToCart, onToggleWishlist, wishlistIds, cartLoading, recentlyViewedProducts }) {
  const { auth } = useAuth();
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const endpoint = auth ? "/api/banners" : "/api/home-banners";
    fetch(endpoint)
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.banners)) setBanners(d.banners); })
      .catch(() => {});
  }, [auth]);

  return (
    <div>
      {/* Banner carousel — shown above the hero when banners are available */}
      {banners.length > 0
        ? <BannerCarousel banners={banners} />
        : (
          <div style={cs.hero}>
            <div>
              <h1 style={cs.heroTitle}>Shop Everything<br /><span style={cs.heroAccent}>You Love</span></h1>
              <p style={cs.heroSub}>Discover thousands of products from trusted vendors across India</p>
              <button style={cs.heroCta} onClick={onShop}>Explore Products →</button>
            </div>
            <div style={cs.heroIllus}>🛍️</div>
          </div>
        )
      }
      {recentlyViewedProducts && recentlyViewedProducts.length > 0 && (
        <section style={cs.section}>
          <h2 style={cs.secTitle}>Recently Viewed</h2>
          <div style={cs.productGrid}>
            {recentlyViewedProducts.map(p => (
              <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
                onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
                isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
            ))}
          </div>
        </section>
      )}
      {categories.length > 0 && (
        <section style={cs.section}>
          <h2 style={cs.secTitle}>Browse Categories</h2>
          <div style={cs.catGrid}>
            {categories.slice(0, 8).map(c => (
              <div key={c} style={cs.catCard} onClick={onShop}>
                <span style={cs.catIcon}>{getCatIcon(c)}</span>
                <span style={cs.catLabel}>{c}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section style={cs.section}>
        <h2 style={cs.secTitle}>Featured Products</h2>
        <div style={cs.productGrid}>
          {products.slice(0, 8).map(p => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
              onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
              isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Search Page ── */
function SearchPage({ categories, api, onSelectProduct, onAddToCart, onToggleWishlist, wishlistIds, cartLoading }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fuzzySuggestion, setFuzzySuggestion] = useState("");

  const doSearch = async (overrideQuery) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    setLoading(true); setSearched(true); setFuzzySuggestion("");
    const params = [];
    if (q) params.push(`search=${encodeURIComponent(q)}`);
    if (cat) params.push(`category=${encodeURIComponent(cat)}`);
    if (minPrice) params.push(`minPrice=${minPrice}`);
    if (maxPrice) params.push(`maxPrice=${maxPrice}`);
    const path = "/products" + (params.length ? "?" + params.join("&") : "");
    const d = await api(path);
    const found = d.success ? (d.products || []) : [];
    setResults(found);

    // If no results and there's a query, try fuzzy spelling correction
    if (found.length === 0 && q && q.trim().length >= 2) {
      try {
        const res = await fetch(`/api/search/fuzzy?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (data && data.suggestion && data.suggestion.trim().length > 0) {
          setFuzzySuggestion(data.suggestion.trim());
        }
      } catch (e) { /* ignore */ }
    }

    setLoading(false);
  };

  // Fetch autocomplete suggestions (debounced)
  useEffect(() => {
    if (!query || query.trim().length === 0) { setSuggestions([]); setShowSuggestions(false); return; }
    let active = true;
    const t = setTimeout(async () => {
      try {
        const q = encodeURIComponent(query.trim());
        const res = await fetch(`/api/search/suggestions?q=${q}`);
        const data = await res.json();
        if (!active) return;
        if (Array.isArray(data)) { setSuggestions(data.slice(0, 8)); setShowSuggestions(true); }
        else { setSuggestions([]); setShowSuggestions(false); }
      } catch (e) { setSuggestions([]); setShowSuggestions(false); }
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  const chooseSuggestion = (s) => {
    setQuery(s.productName || "");
    setShowSuggestions(false);
    setTimeout(() => doSearch(s.productName || ""), 10);
  };

  const applyFuzzySuggestion = () => {
    setQuery(fuzzySuggestion);
    setFuzzySuggestion("");
    doSearch(fuzzySuggestion);
  };

  return (
    <div>
      <h2 style={cs.pageTitle}>Search Products 🔍</h2>
      <div style={cs.searchBox}>
        <div style={{ position: "relative", flex: 2 }}>
          <input style={{ ...cs.searchInput, width: "100%" }} placeholder="Search products, brands..." value={query}
            onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()}
            onFocus={() => { if (suggestions.length) setShowSuggestions(true); }} />
          {showSuggestions && suggestions.length > 0 && (
            <div style={cs.suggestionBox}>
              {suggestions.map((s, i) => (
                <div key={i} style={cs.suggestionItem} onMouseDown={() => chooseSuggestion(s)}>
                  <img src={s.imageLink || ""} alt="" style={cs.suggestionImg} onError={e => e.target.style.display = "none"} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.productName}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{s.category}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <select style={cs.select} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input style={{ ...cs.searchInput, width: 100 }} placeholder="Min ₹" type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
        <input style={{ ...cs.searchInput, width: 100 }} placeholder="Max ₹" type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        <button style={cs.searchBtn} onClick={() => doSearch()} disabled={loading}>{loading ? "..." : "Search"}</button>
      </div>
      {searched && <p style={cs.resultCount}>{results.length} result{results.length !== 1 ? "s" : ""} found</p>}
      {results.length > 0 && (
        <div style={cs.productGrid}>
          {results.map(p => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
              onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
              isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
          ))}
        </div>
      )}
      {searched && results.length === 0 && !loading && (
        <div style={cs.empty}>
          No products found 😕<br />
          <span style={{ fontSize: 14 }}>Try different keywords or filters</span>
          {fuzzySuggestion && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 14, color: "#9ca3af" }}>Did you mean: </span>
              <button
                onClick={applyFuzzySuggestion}
                style={{ background: "none", border: "none", color: "#6366f1", fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "underline" }}
              >
                {fuzzySuggestion}
              </button>
              <span style={{ fontSize: 14, color: "#9ca3af" }}>?</span>
            </div>
          )}
        </div>
      )}
      {!searched && <div style={cs.empty}>Start typing to search 🔍</div>}
    </div>
  );
}

/* ── Products Page ── */
function ProductsPage({ products, categories, search, selectedCat, onSearch, onCat, onSelectProduct, onAddToCart, onToggleWishlist, wishlistIds, cartLoading }) {
  const [q, setQ] = useState(search);
  return (
    <div>
      <h2 style={cs.pageTitle}>All Products</h2>
      <div style={cs.filterRow}>
        <input style={cs.searchInput} placeholder="Search products..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && onSearch(q)} />
        <button style={cs.searchBtn} onClick={() => onSearch(q)}>Search</button>
        <select style={cs.select} value={selectedCat} onChange={e => onCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p style={cs.resultCount}>{products.length} products found</p>
      <div style={cs.productGrid}>
        {products.map(p => (
          <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
            onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist}
            isWishlisted={wishlistIds.includes(p.id)} loading={cartLoading[p.id]} />
        ))}
      </div>
      {products.length === 0 && <div style={cs.empty}>No products found 😕</div>}
    </div>
  );
}

/* ── Product Card ── */
function ProductCard({ product: p, onSelect, onAddToCart, onToggleWishlist, isWishlisted, loading }) {
  const discount = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  return (
    <div style={cs.productCard}>
      <div style={cs.productImgWrap} onClick={() => onSelect(p)}>
        {p.imageLink ? <img src={p.imageLink} alt={p.name} style={cs.productImg} onError={e => e.target.style.display = "none"} />
          : <div style={cs.productImgPlaceholder}>🛍️</div>}
        {discount > 0 && <div style={cs.discountBadge}>{discount}% OFF</div>}
        <button style={{ ...cs.wishBtn, color: isWishlisted ? "#ef4444" : "#9ca3af" }}
          onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}>{isWishlisted ? "❤️" : "🤍"}</button>
      </div>
      <div style={cs.productInfo}>
        <div style={cs.productName} onClick={() => onSelect(p)}>{p.name}</div>
        <div style={cs.productCat}>{p.category}</div>
        <div style={cs.priceRow}>
          <span style={cs.price}>{fmt(p.price)}</span>
          {discount > 0 && <span style={cs.mrp}>{fmt(p.mrp)}</span>}
        </div>
        {p.averageRating > 0 && <div style={cs.ratingRow}><span style={cs.stars}>{stars(Math.round(p.averageRating))}</span><span style={cs.ratingNum}>{p.averageRating?.toFixed(1)}</span></div>}
        <div style={cs.stockBadge(p.stock)}>{p.stock > 0 ? `In Stock (${p.stock})` : "Out of Stock"}</div>
        <button style={{ ...cs.addCartBtn, opacity: p.stock <= 0 || loading ? 0.5 : 1 }}
          disabled={p.stock <= 0 || loading} onClick={() => onAddToCart(p.id)}>
          {loading ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

/* ── Product Detail ── */
function ProductDetailPage({ product: p, onBack, onAddToCart, onToggleWishlist, wishlistIds, api, cartLoading, onView }) {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const isWishlisted = wishlistIds.includes(p.id);
  const discount = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;

  useEffect(() => {
    api(`/products/${p.id}/reviews`).then(d => { if (d.success) setReviews(d.reviews || []); });
  }, [p.id]);

  useEffect(() => {
    if (onView) onView(p.id);
  }, [p.id]);

  useEffect(() => {
    // check subscription status when product is out of stock
    const check = async () => {
      if (!p || p.stock > 0) return;
      try {
        const headers = {};
        if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
        else if (auth) headers["X-Customer-Id"] = auth.id;
        const res = await fetch(`/api/notify-me/${p.id}`, { headers });
        const d = await res.json();
        setSubscribed(!!d.subscribed);
      } catch (e) { setSubscribed(false); }
    };
    check();
  }, [p.id, p.stock]);

  const subscribeNotify = async () => {
    if (!p) return;
    // require login
    // the backend uses session; guests will get a message asking to login
    try {
      const headers = { "Content-Type": "application/json" };
      if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
      else if (auth) headers["X-Customer-Id"] = auth.id;
      const res = await fetch(`/api/notify-me/${p.id}`, { method: 'POST', headers });
      const d = await res.json();
      if (d.success) setSubscribed(!!d.subscribed);
      setToast(d.message || (d.subscribed ? "Subscribed" : "Please sign in"));
    } catch (e) { setToast("Failed to subscribe"); }
  };

  const unsubscribeNotify = async () => {
    if (!p) return;
    try {
      const headers = {};
      if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
      else if (auth) headers["X-Customer-Id"] = auth.id;
      const res = await fetch(`/api/notify-me/${p.id}`, { method: 'DELETE', headers });
      const d = await res.json();
      setSubscribed(!!d.subscribed);
      setToast(d.message || "Unsubscribed");
    } catch (e) { setToast("Failed to unsubscribe"); }
  };

  const submitReview = async () => {
    setSubmitting(true);
    const d = await api("/reviews/add", { method: "POST", body: JSON.stringify({ productId: p.id, rating: newReview.rating, comment: newReview.comment }) });
    if (d.success) { setToast("Review submitted!"); api(`/products/${p.id}/reviews`).then(d => { if (d.success) setReviews(d.reviews || []); }); setNewReview({ rating: 5, comment: "" }); }
    else setToast(d.message || "Failed");
    setSubmitting(false);
  };

  return (
    <div>
      <button style={cs.backBtn} onClick={onBack}>← Back to Products</button>
      <Toast msg={toast} onHide={() => setToast("")} />
      <div style={cs.detailGrid}>
        <div>
          {p.imageLink ? <img src={p.imageLink} alt={p.name} style={cs.detailImg} onError={e => e.target.style.display = "none"} />
            : <div style={{ ...cs.productImgPlaceholder, height: 300, borderRadius: 16, fontSize: 64 }}>🛍️</div>}
        </div>
        <div>
          <div style={cs.detailCat}>{p.category}</div>
          <h1 style={cs.detailTitle}>{p.name}</h1>
          {p.averageRating > 0 && <div style={{ color: "#f59e0b", marginBottom: 12 }}>{stars(Math.round(p.averageRating))} {p.averageRating?.toFixed(1)} ({reviews.length} reviews)</div>}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <span style={cs.detailPrice}>{fmt(p.price)}</span>
            {discount > 0 && <><span style={cs.mrp}>{fmt(p.mrp)}</span><span style={cs.discountBadge}>{discount}% OFF</span></>}
          </div>
          <p style={cs.detailDesc}>{p.description}</p>
          {p.vendor && <p style={cs.vendorInfo}>Sold by: <strong>{p.vendor.name}</strong></p>}
          <div style={cs.stockBadge(p.stock)}>{p.stock > 0 ? `✓ In Stock (${p.stock} units)` : "✗ Out of Stock"}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button style={{ ...cs.addCartBtn, flex: 1, padding: "14px 24px", fontSize: 16, opacity: p.stock <= 0 || cartLoading[p.id] ? 0.5 : 1 }}
              disabled={p.stock <= 0 || cartLoading[p.id]} onClick={() => onAddToCart(p.id)}>
              🛒 {cartLoading[p.id] ? "Adding..." : "Add to Cart"}
            </button>
            <button style={{ ...cs.wishBtnLarge, color: isWishlisted ? "#ef4444" : "#6b7280" }}
              onClick={() => onToggleWishlist(p.id)}>{isWishlisted ? "❤️ Wishlisted" : "🤍 Wishlist"}</button>
          </div>
          {p.stock <= 0 && (
            <div style={{ marginTop: 12 }}>
              {subscribed ? (
                <button style={{ padding: "8px 12px", background: "#10b981", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
                  onClick={unsubscribeNotify}>✅ Subscribed — cancel</button>
              ) : (
                <button style={{ padding: "8px 12px", background: "#6366f1", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
                  onClick={subscribeNotify}>🔔 Notify me when back in stock</button>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={cs.reviewSection}>
        <h3 style={cs.secTitle}>Customer Reviews</h3>
        <div style={cs.reviewForm}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: n <= newReview.rating ? "#f59e0b" : "#d1d5db" }}
                onClick={() => setNewReview(r => ({ ...r, rating: n }))}>★</button>
            ))}
          </div>
          <textarea style={cs.reviewInput} placeholder="Write your review..." value={newReview.comment}
            onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))} />
          <button style={cs.submitReviewBtn} onClick={submitReview} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
        {reviews.map((r, i) => (
          <div key={i} style={cs.reviewCard}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ color: "#e5e7eb" }}>{r.customerName || "Customer"}</strong>
              <span style={{ color: "#f59e0b" }}>{stars(r.rating)}</span>
            </div>
            <p style={{ color: "#9ca3af", marginTop: 4 }}>{r.comment}</p>
          </div>
        ))}
        {reviews.length === 0 && <p style={{ color: "#9ca3af" }}>No reviews yet. Be the first!</p>}
      </div>
    </div>
  );
}

/* ── Cart Page ── */
function CartPage({ cart, onRemove, onUpdateQty, onApplyCoupon, onRemoveCoupon, onCheckout, profile }) {
  const [couponCode, setCouponCode] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(null);

  return (
    <div>
      <h2 style={cs.pageTitle}>Your Cart 🛒</h2>
      {(!cart.items || cart.items.length === 0) ? (
        <div style={cs.empty}>🛒 Your cart is empty</div>
      ) : (
        <div style={cs.cartLayout}>
          <div>
            {cart.items.map((item, i) => (
              <div key={i} style={cs.cartItem}>
                <div style={cs.cartItemImg}>
                  {item.imageLink ? <img src={item.imageLink} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} onError={e => e.target.style.display = "none"} /> : "🛍️"}
                </div>
                <div style={cs.cartItemInfo}>
                  <div style={cs.cartItemName}>{item.name}</div>
                  <div style={{ color: "#6366f1", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{item.category}</div>
                  <div style={cs.cartItemPrice}>{fmt(item.unitPrice || item.price)} each</div>
                  <div style={cs.qtyRow}>
                    <button style={cs.qtyBtn} onClick={() => item.quantity > 1 ? onUpdateQty(item.productId, item.quantity - 1) : setRemoveConfirm(item.productId)}>−</button>
                    <span style={cs.qtyNum}>{item.quantity}</span>
                    <button style={cs.qtyBtn} onClick={() => onUpdateQty(item.productId, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <div style={cs.cartItemTotal}>
                  <div style={cs.lineTotal}>{fmt((item.unitPrice || item.price) * item.quantity)}</div>
                  <button style={cs.removeBtn} onClick={() => setRemoveConfirm(item.productId)}>🗑️ Remove</button>
                </div>
              </div>
            ))}

            {/* Coupon */}
            <div style={cs.couponBox}>
              <span style={{ color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>🎟️ Coupon Code</span>
              {cart.couponApplied ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>{cart.couponCode} applied</span>
                  <button style={{ ...cs.removeBtn, fontSize: 12 }} onClick={onRemoveCoupon}>Remove</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...cs.searchInput, flex: 1 }} placeholder="Enter coupon code" value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                  <button style={cs.searchBtn} onClick={() => { onApplyCoupon(couponCode); setCouponCode(""); }}>Apply</button>
                </div>
              )}
            </div>
          </div>

          <div style={cs.cartSummary}>
            <h3 style={{ color: "#e5e7eb", marginBottom: 16 }}>Order Summary</h3>
            <div style={cs.sumRow}><span>Items ({cart.itemCount || cart.items?.length})</span><span>{fmt(cart.subtotal)}</span></div>
            {cart.couponDiscount > 0 && <div style={{ ...cs.sumRow, color: "#22c55e" }}><span>Coupon Discount</span><span>-{fmt(cart.couponDiscount)}</span></div>}
            <div style={cs.sumRow}><span>Delivery</span><span style={{ color: !cart.deliveryCharge ? "#22c55e" : "#e5e7eb" }}>{!cart.deliveryCharge ? "FREE" : fmt(cart.deliveryCharge)}</span></div>
            {cart.subtotal < 500 && <p style={{ color: "#f59e0b", fontSize: 12, margin: "4px 0" }}>Add {fmt(500 - cart.subtotal)} more for free delivery!</p>}
            <div style={cs.totalRow}><span>Total</span><span>{fmt(cart.total)}</span></div>
            {cart.gstAmount > 0 && <div style={{ ...cs.sumRow, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}><span style={{ fontSize: 12 }}>GST Included</span><span style={{ fontSize: 12 }}>{fmt(cart.gstAmount)}</span></div>}
            <button style={{ ...cs.addCartBtn, width: "100%", padding: "14px", marginTop: 16, fontSize: 16 }} onClick={onCheckout}>
              Proceed to Checkout →
            </button>
          </div>
        </div>
      )}

      {/* Remove confirm dialog */}
      {removeConfirm && (
        <div style={cs.overlay}>
          <div style={cs.dialog}>
            <h3 style={{ color: "#e5e7eb", marginBottom: 8 }}>Remove Item?</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>Are you sure you want to remove this item from your cart?</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...cs.addCartBtn, flex: 1 }} onClick={() => { onRemove(removeConfirm); setRemoveConfirm(null); }}>Yes, Remove</button>
              <button style={cs.secondaryBtn} onClick={() => setRemoveConfirm(null)}>Keep It</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Payment Page ── */
const DELIVERY_OPTIONS = [
  {
    id: "STANDARD",
    icon: "📦",
    label: "Standard Delivery",
    sub: "3–5 business days",
    badge: "FREE",
    surcharge: 0,
    badgeColor: "#22c55e",
  },
  {
    id: "EXPRESS",
    icon: "⚡",
    label: "Express Delivery",
    sub: "Next business day by 10 AM",
    badge: "+₹50",
    surcharge: 50,
    badgeColor: "#f59e0b",
  },
];

function PaymentPage({ cart, profile, onPlaceOrder, onBack }) {
  const [payMode, setPayMode] = useState("COD");
  const [deliveryTime, setDeliveryTime] = useState("STANDARD");
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [placing, setPlacing] = useState(false);
  const addrs = profile?.addresses || [];

  const expressSurcharge = deliveryTime === "EXPRESS" ? 50 : 0;
  const subtotal = cart.subtotal || cart.total || 0;
  const couponDiscount = cart.couponDiscount || 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount) + expressSurcharge;

  const handlePlace = async () => {
    if (!selectedAddr && addrs.length > 0) { alert("Please select a delivery address"); return; }
    setPlacing(true);
    await onPlaceOrder(selectedAddr, payMode, deliveryTime);
    setPlacing(false);
  };

  return (
    <div>
      <button style={cs.backBtn} onClick={onBack}>← Back to Cart</button>
      <h2 style={cs.pageTitle}>Complete Your Payment 💳</h2>
      <div style={cs.paymentLayout}>
        <div>
          {/* Address */}
          <div style={cs.paySection}>
            <h3 style={cs.paySectionTitle}>📍 Delivery Address</h3>
            {addrs.length === 0 ? (
              <p style={{ color: "#f59e0b", fontSize: 14 }}>⚠️ No addresses saved. Add one in your Profile.</p>
            ) : (
              addrs.map(a => (
                <div key={a.id} style={{ ...cs.addrCard, borderColor: selectedAddr === a.id ? "#6366f1" : "rgba(255,255,255,0.1)" }}
                  onClick={() => setSelectedAddr(a.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: selectedAddr === a.id ? "#6366f1" : "#6b7280", background: selectedAddr === a.id ? "#6366f1" : "transparent" }} />
                    <div>
                      <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{a.recipientName}</div>
                      <div style={{ color: "#9ca3af", fontSize: 13 }}>{a.houseStreet}, {a.city}, {a.state} {a.postalCode}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Delivery speed */}
          <div style={cs.paySection}>
            <h3 style={cs.paySectionTitle}>🚚 Delivery Speed</h3>
            {DELIVERY_OPTIONS.map(opt => (
              <div key={opt.id}
                style={{ ...cs.addrCard, borderColor: deliveryTime === opt.id ? "#6366f1" : "rgba(255,255,255,0.1)", marginBottom: 10, cursor: "pointer" }}
                onClick={() => setDeliveryTime(opt.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: deliveryTime === opt.id ? "#6366f1" : "#6b7280", background: deliveryTime === opt.id ? "#6366f1" : "transparent", flexShrink: 0 }} />
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{opt.label}</div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>{opt.sub}</div>
                  </div>
                  <span style={{ background: deliveryTime === opt.id ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)", color: opt.badgeColor, fontWeight: 800, fontSize: 13, padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>
                    {opt.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Payment mode */}
          <div style={cs.paySection}>
            <h3 style={cs.paySectionTitle}>💳 Payment Method</h3>
            {[{ id: "COD", icon: "💵", label: "Cash on Delivery", sub: "Pay when your order arrives" },
              { id: "ONLINE", icon: "💳", label: "Pay Online", sub: "UPI, Cards, Net Banking via Razorpay" }].map(m => (
              <div key={m.id} style={{ ...cs.addrCard, borderColor: payMode === m.id ? "#6366f1" : "rgba(255,255,255,0.1)", marginBottom: 10 }}
                onClick={() => setPayMode(m.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: payMode === m.id ? "#6366f1" : "#6b7280", background: payMode === m.id ? "#6366f1" : "transparent" }} />
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  <div>
                    <div style={{ color: "#e5e7eb", fontWeight: 700 }}>{m.label}</div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>{m.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order items */}
          <div style={cs.paySection}>
            <h3 style={cs.paySectionTitle}>📦 Order Items</h3>
            {cart.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#e5e7eb", fontSize: 14 }}>
                <span>{item.name} <span style={{ color: "#9ca3af" }}>× {item.quantity}</span></span>
                <span>{fmt((item.unitPrice || item.price) * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={cs.cartSummary}>
          <h3 style={{ color: "#e5e7eb", marginBottom: 16 }}>Bill Summary</h3>
          <div style={cs.sumRow}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          {couponDiscount > 0 && (
            <div style={{ ...cs.sumRow, color: "#22c55e" }}><span>Coupon</span><span>-{fmt(couponDiscount)}</span></div>
          )}
          <div style={cs.sumRow}>
            <span>Delivery</span>
            <span style={{ color: expressSurcharge === 0 ? "#22c55e" : "#f59e0b" }}>
              {expressSurcharge === 0 ? "FREE" : fmt(expressSurcharge)}
            </span>
          </div>
          {cart.gstAmount > 0 && (
            <div style={cs.sumRow}><span>GST (included)</span><span>{fmt(cart.gstAmount)}</span></div>
          )}
          <div style={cs.totalRow}><span>Total</span><span>{fmt(grandTotal)}</span></div>

          {/* Selected delivery speed pill */}
          <div style={{ marginTop: 10, padding: "8px 12px", background: deliveryTime === "EXPRESS" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.1)", borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>{deliveryTime === "EXPRESS" ? "⚡" : "📦"}</span>
            <span style={{ color: deliveryTime === "EXPRESS" ? "#fbbf24" : "#4ade80", fontSize: 13, fontWeight: 600 }}>
              {deliveryTime === "EXPRESS" ? "Express — Next Day" : "Standard — 3–5 Days"}
            </span>
          </div>

          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(99,102,241,0.1)", borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>{payMode === "COD" ? "💵" : "💳"}</span>
            <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 600 }}>{payMode === "COD" ? "Cash on Delivery" : "Online Payment"}</span>
          </div>
          <button style={{ ...cs.addCartBtn, width: "100%", padding: "14px", marginTop: 16, fontSize: 16, opacity: placing ? 0.6 : 1 }}
            disabled={placing} onClick={handlePlace}>
            {placing ? "Placing..." : payMode === "COD" ? "Place Order (COD) 🚀" : "Pay & Place Order 💳"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Order Success ── */
function OrderSuccessPage({ order, onTrack, onHome }) {
  const steps = ["Confirmed", "Processing", "Shipped", "Delivered"];
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
      <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Order Placed Successfully!</h1>
      <p style={{ color: "#9ca3af", marginBottom: 32 }}>Your order is confirmed. A confirmation email has been sent to your registered address.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, maxWidth: 700, margin: "0 auto 32px", textAlign: "left" }}>
        {[
          { icon: "🔢", label: "Order ID", value: `#${order.orderId || order.id || "—"}` },
          { icon: "💰", label: "Amount Paid", value: fmt(order.amount || order.total) },
          { icon: "🚚", label: "Delivery", value: order.deliveryTime || "Standard (3–5 days)" },
          { icon: "💳", label: "Payment", value: order.paymentMode || "COD" },
        ].map(item => (
          <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
            <div style={{ color: "#fff", fontWeight: 700 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "center", gap: 0, maxWidth: 600, margin: "0 auto 32px", position: "relative" }}>
        {steps.map((step, i) => (
          <div key={step} style={{ flex: 1, textAlign: "center", position: "relative" }}>
            {i > 0 && <div style={{ position: "absolute", top: 15, left: "-50%", right: "50%", height: 2, background: i === 0 ? "#22c55e" : "rgba(255,255,255,0.15)" }} />}
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: i === 0 ? "#22c55e" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 14 }}>
              {i === 0 ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 12, color: i === 0 ? "#22c55e" : "#6b7280" }}>{step}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button style={{ ...cs.addCartBtn, padding: "12px 28px" }} onClick={onTrack}>🚚 Track Order</button>
        <button style={cs.secondaryBtn} onClick={onHome}>🏠 Back to Home</button>
      </div>
    </div>
  );
}

/* ── Orders Page ── */
function OrdersPage({ orders, onCancel, onReorder, onReport, onTrack }) {
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  return (
    <div>
      <h2 style={cs.pageTitle}>Order History 📦</h2>
      {orders.length === 0 ? <div style={cs.empty}>No orders yet 📦</div> : orders.map(o => (
        <div key={o.id} style={cs.orderCard}>
          <div style={cs.orderHeader}>
            <div>
              <span style={cs.orderId}>Order #{o.id}</span>
              <span style={{ marginLeft: 12, color: "#9ca3af", fontSize: 13 }}>
                {o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
            <span style={{ ...cs.statusBadge, background: statusColor[o.trackingStatus] || "#6b7280" }}>
              {o.trackingStatus?.replace(/_/g, " ")}
            </span>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            {(o.items || []).map((item, i) => (
              <div key={i} style={cs.orderItem}>
                <span style={{ color: "#e5e7eb" }}>{item.name}</span>
                <span style={{ color: "#9ca3af", fontSize: 13 }}> × {item.quantity} — {fmt(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, cursor: "pointer", color: "#6366f1", fontSize: 13 }} onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
            {expandedOrder === o.id ? "▲ Hide details" : "▼ Show details"}
          </div>

          {expandedOrder === o.id && (
            <div style={{ marginTop: 12, padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Amount", fmt(o.amount || o.totalPrice)],
                  ["Delivery Charge", o.deliveryCharge > 0 ? fmt(o.deliveryCharge) : "FREE"],
                  ["GST", o.gstAmount > 0 ? fmt(o.gstAmount) : "Included"],
                  ["Payment", o.paymentMode || "COD"],
                  ["Delivery By", o.deliveryTime || "Standard (3–5 days)"],
                  ...(o.razorpay_payment_id ? [["Payment ID", o.razorpay_payment_id]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>{k}: </span>
                    <span style={{ color: "#e5e7eb", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              {o.deliveryAddress && <div style={{ marginTop: 8, fontSize: 13, color: "#9ca3af" }}>📍 {o.deliveryAddress}</div>}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...cs.detailPrice, fontSize: 20 }}>{fmt(o.amount || o.totalPrice)}</span>
            <button style={cs.outlineBtn} onClick={() => onTrack(o)}>🚚 Track</button>
            {["PLACED", "CONFIRMED"].includes(o.trackingStatus) && (
              <button style={cs.cancelBtn} onClick={() => setCancelConfirm(o.id)}>Cancel Order</button>
            )}
            {o.trackingStatus === "DELIVERED" && (
              <>
                <button style={cs.outlineBtn} onClick={() => onReorder(o.id)}>🔄 Reorder</button>
                <button style={{ ...cs.cancelBtn, borderColor: "rgba(234,179,8,0.4)", color: "#fbbf24" }}
                  onClick={() => onReport(o)}>⚠️ Report Issue</button>
              </>
            )}
          </div>
        </div>
      ))}

      {cancelConfirm && (
        <div style={cs.overlay}>
          <div style={cs.dialog}>
            <h3 style={{ color: "#e5e7eb", marginBottom: 8 }}>Cancel Order?</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>Are you sure you want to cancel this order? This cannot be undone.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...cs.cancelBtn, flex: 1 }} onClick={() => { onCancel(cancelConfirm); setCancelConfirm(null); }}>Yes, Cancel</button>
              <button style={cs.secondaryBtn} onClick={() => setCancelConfirm(null)}>Go Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Track Orders Page ── */
function TrackOrdersPage({ orders, onSelectOrder }) {
  const active = orders.filter(o => !["DELIVERED", "CANCELLED"].includes(o.trackingStatus));
  const history = orders.filter(o => ["DELIVERED", "CANCELLED"].includes(o.trackingStatus));

  const TrackCard = ({ o }) => {
    const steps = ["PLACED", "CONFIRMED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
    const currentStep = steps.indexOf(o.trackingStatus);
    return (
      <div style={cs.orderCard}>
        <div style={cs.orderHeader}>
          <div>
            <span style={cs.orderId}>Order #{o.id}</span>
            <span style={{ marginLeft: 12, color: "#9ca3af", fontSize: 13 }}>
              {o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN") : ""}
            </span>
          </div>
          <span style={{ ...cs.statusBadge, background: statusColor[o.trackingStatus] || "#6b7280" }}>
            {o.trackingStatus?.replace(/_/g, " ")}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
            <div style={{ position: "absolute", top: 12, left: "10%", right: "10%", height: 2, background: "rgba(255,255,255,0.1)", zIndex: 0 }} />
            <div style={{ position: "absolute", top: 12, left: "10%", width: `${Math.max(0, currentStep / (steps.length - 1) * 80)}%`, height: 2, background: "linear-gradient(90deg,#6366f1,#22c55e)", zIndex: 1 }} />
            {steps.map((step, i) => (
              <div key={step} style={{ textAlign: "center", flex: 1, position: "relative", zIndex: 2 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: i <= currentStep ? "#22c55e" : "rgba(255,255,255,0.1)", color: i <= currentStep ? "#fff" : "#6b7280" }}>
                  {i <= currentStep ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 10, color: i <= currentStep ? "#22c55e" : "#6b7280", fontWeight: 600 }}>
                  {step.replace(/_/g, " ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {o.currentCity && <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>📍 Currently in: <strong style={{ color: "#e5e7eb" }}>{o.currentCity}</strong></div>}
        {o.deliveryTime && <div style={{ color: "#9ca3af", fontSize: 13 }}>🕐 Est. Delivery: <strong style={{ color: "#e5e7eb" }}>{o.deliveryTime}</strong></div>}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button style={{ ...cs.addCartBtn, padding: "8px 20px", fontSize: 13 }} onClick={() => onSelectOrder(o)}>Live Track →</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 style={cs.pageTitle}>Track Orders 🚚</h2>
      {active.length === 0 && history.length === 0 && <div style={cs.empty}>No orders to track 📦</div>}
      {active.length > 0 && (
        <section style={cs.section}>
          <h3 style={{ ...cs.secTitle, fontSize: 18 }}>Active Orders ({active.length})</h3>
          {active.map(o => <TrackCard key={o.id} o={o} />)}
        </section>
      )}
      {history.length > 0 && (
        <section style={cs.section}>
          <h3 style={{ ...cs.secTitle, fontSize: 18 }}>Past Orders</h3>
          {history.slice(0, 5).map(o => <TrackCard key={o.id} o={o} />)}
        </section>
      )}
    </div>
  );
}

/* ── Track Single Order ── */
function TrackSingleOrderPage({ order: o, onBack }) {
  const steps = [
    { key: "PLACED", label: "Order Placed", icon: "📋", sub: "Your order has been confirmed" },
    { key: "CONFIRMED", label: "Processing", icon: "⚙️", sub: "Vendor is packing your order" },
    { key: "SHIPPED", label: "Shipped", icon: "📦", sub: "Your order is on the way" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "🛵", sub: "Delivery partner is nearby" },
    { key: "DELIVERED", label: "Delivered", icon: "✅", sub: "Order delivered successfully" },
  ];
  const statusOrder = steps.map(s => s.key);
  const currentIdx = statusOrder.indexOf(o.trackingStatus);

  return (
    <div>
      <button style={cs.backBtn} onClick={onBack}>← Back to Track Orders</button>
      <h2 style={cs.pageTitle}>Track Your Order 🗺️</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: 13 }}>Order ID</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>#{o.id}</div>
            </div>
            <span style={{ ...cs.statusBadge, background: statusColor[o.trackingStatus] || "#6b7280", height: "fit-content" }}>
              {o.trackingStatus?.replace(/_/g, " ")}
            </span>
          </div>

          {/* Timeline */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 19, top: 24, bottom: 24, width: 2, background: "rgba(255,255,255,0.1)" }} />
            {steps.map((step, i) => {
              const done = i <= currentIdx;
              const current = i === currentIdx;
              return (
                <div key={step.key} style={{ display: "flex", gap: 16, marginBottom: 24, position: "relative" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: done ? (current ? "#6366f1" : "#22c55e") : "rgba(255,255,255,0.08)", border: `2px solid ${done ? (current ? "#6366f1" : "#22c55e") : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, zIndex: 1 }}>
                    {done && !current ? "✓" : step.icon}
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ color: done ? "#e5e7eb" : "#6b7280", fontWeight: current ? 700 : 500, fontSize: 15 }}>{step.label}</div>
                    <div style={{ color: done ? "#9ca3af" : "#4b5563", fontSize: 13 }}>{step.sub}</div>
                    {current && o.orderDate && <div style={{ color: "#6366f1", fontSize: 12, marginTop: 4 }}>{new Date(o.orderDate).toLocaleString("en-IN")}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <h3 style={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Shipment Info</h3>
            {[
              ["Amount", fmt(o.amount || o.totalPrice)],
              ["Payment", o.paymentMode || "COD"],
              ["Delivery By", o.deliveryTime || "Standard (3-5 days)"],
              ...(o.currentCity ? [["Current Location", o.currentCity]] : []),
              ...(o.deliveryAddress ? [["Delivery Address", o.deliveryAddress]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 }}>
                <span style={{ color: "#9ca3af" }}>{k}</span>
                <span style={{ color: "#e5e7eb", fontWeight: 600, textAlign: "right", maxWidth: 160 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Items Ordered</h3>
            {(o.items || []).map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#e5e7eb" }}>{item.name} × {item.quantity}</span>
                <span style={{ color: "#9ca3af" }}>{fmt(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Coupons Page ── */
function CouponsPage({ coupons, showToast }) {
  const copyCoupon = (code) => {
    navigator.clipboard.writeText(code).then(() => showToast(`Copied: ${code} ✓`));
  };

  return (
    <div>
      <h2 style={cs.pageTitle}>Available Coupons 🎟️</h2>
      {coupons.length === 0 ? (
        <div style={cs.empty}>No coupons available right now 😔<br /><span style={{ fontSize: 14 }}>Check back later for exclusive deals!</span></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {coupons.map((c, i) => (
            <div key={i} style={cs.couponCard}>
              <div style={cs.couponStripe} />
              <div style={cs.couponBody}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={cs.couponCode}>{c.code}</div>
                  <div style={cs.couponValue}>{c.typeLabel || `${c.value}% OFF`}</div>
                </div>
                <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{c.description || "Apply this coupon at checkout"}</p>
                {c.expiryDate && (
                  <div style={{ color: "#f59e0b", fontSize: 12, marginBottom: 12 }}>
                    ⏳ Expires: {new Date(c.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                )}
                <button style={{ ...cs.addCartBtn, width: "100%", padding: "10px" }} onClick={() => copyCoupon(c.code)}>
                  📋 Copy Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Spending Page ── */
function SpendingPage({ data, orders, onLoadOrders }) {
  useEffect(() => { if (!orders || orders.length === 0) onLoadOrders(); }, []);

  const totalSpent   = data?.totalSpent   || orders?.filter(o => o.trackingStatus === "DELIVERED").reduce((s, o) => s + (o.amount || 0), 0) || 0;
  const totalOrders  = data?.totalOrders  || orders?.length || 0;
  const avgOrder     = data?.averageOrderValue || (totalOrders > 0 ? totalSpent / totalOrders : 0);
  const topCategory  = data?.topCategory  || "—";

  // ── Monthly: prefer server data, fall back to client-computed from orders ──
  const months = (() => {
    if (data?.monthlySpending && Object.keys(data.monthlySpending).length > 0) {
      return Object.entries(data.monthlySpending).slice(-6);
    }
    const acc = {};
    (orders || []).forEach(o => {
      if (!o.orderDate) return;
      const d = new Date(o.orderDate);
      const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      acc[key] = (acc[key] || 0) + (o.amount || 0);
    });
    return Object.entries(acc).slice(-6);
  })();
  const maxMonthSpend = Math.max(...months.map(([, v]) => v), 1);

  // ── Category breakdown: from server data ──
  const categoryEntries = data?.categorySpending
    ? Object.entries(data.categorySpending).sort(([, a], [, b]) => b - a)
    : [];
  const maxCatSpend = Math.max(...categoryEntries.map(([, v]) => v), 1);

  const catColors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#10b981"];

  return (
    <div>
      <h2 style={cs.pageTitle}>My Spending 💰</h2>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Spent",   value: fmt(totalSpent),  icon: "💰", color: "#22c55e" },
          { label: "Total Orders",  value: totalOrders,      icon: "📦", color: "#6366f1" },
          { label: "Avg Order",     value: fmt(avgOrder),    icon: "📊", color: "#f59e0b" },
          { label: "Top Category",  value: topCategory,      icon: "🏆", color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8, width: 44, height: 44, borderRadius: 12, background: s.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: categoryEntries.length > 0 ? "1fr 1fr" : "1fr", gap: 20, marginBottom: 24 }}>

        {/* ── Monthly bar chart ── */}
        {months.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <h3 style={{ ...cs.secTitle, marginBottom: 24, fontSize: 16 }}>Monthly Spending</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140 }}>
              {months.map(([month, amount]) => (
                <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{fmt(amount)}</div>
                  <div style={{ width: "100%", background: "linear-gradient(180deg, #6366f1, #8b5cf6)", borderRadius: "4px 4px 0 0", height: `${(amount / maxMonthSpend) * 110}px`, minHeight: 4 }} />
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{month}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Category breakdown ── */}
        {categoryEntries.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <h3 style={{ ...cs.secTitle, marginBottom: 20, fontSize: 16 }}>Spending by Category</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {categoryEntries.slice(0, 6).map(([cat, amount], i) => (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 500 }}>{cat}</span>
                    <span style={{ color: "#9ca3af", fontSize: 13 }}>{fmt(amount)}</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${(amount / maxCatSpend) * 100}%`, height: "100%", background: catColors[i % catColors.length], borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Transactions ── */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
        <h3 style={{ ...cs.secTitle, marginBottom: 16 }}>Recent Transactions</h3>
        {(orders || []).slice(0, 10).map(o => (
          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <div style={{ color: "#e5e7eb", fontWeight: 600, fontSize: 14 }}>Order #{o.id}</div>
              <div style={{ color: "#9ca3af", fontSize: 12 }}>{o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#fff", fontWeight: 700 }}>{fmt(o.amount || o.totalPrice)}</div>
              <span style={{ ...cs.statusBadge, fontSize: 11, background: statusColor[o.trackingStatus] || "#6b7280" }}>{o.trackingStatus}</span>
            </div>
          </div>
        ))}
        {(!orders || orders.length === 0) && <div style={cs.empty}>No transactions yet. Start shopping!</div>}
      </div>
    </div>
  );
}

/* ── Reorder Stock Check Modal ── */
function ReorderStockModal({ stockCheck, onClose, onConfirm }) {
  const { orderId, items } = stockCheck;
  const [confirming, setConfirming] = useState(false);

  const statusMeta = {
    in_stock:    { icon: "✅", color: "#22c55e", label: "In stock" },
    partial:     { icon: "⚠️", color: "#f59e0b", label: "Partial stock" },
    out_of_stock:{ icon: "❌", color: "#ef4444", label: "Out of stock" },
    unavailable: { icon: "🚫", color: "#6b7280", label: "Unavailable" },
  };

  const canProceed = items.some(i => i.status === "in_stock" || i.status === "partial");
  const allUnavailable = items.every(i => i.status === "out_of_stock" || i.status === "unavailable");

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(orderId);
  };

  return (
    <div style={cs.overlay}>
      <div style={{ ...cs.dialog, maxWidth: 520, textAlign: "left" }}>
        <h3 style={{ color: "#fff", marginBottom: 4 }}>🔄 Reorder Stock Check</h3>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>
          Some items from this order have limited or no stock. Review before proceeding.
        </p>

        {/* Item list */}
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 110px", gap: 8, padding: "8px 14px", background: "rgba(255,255,255,0.06)", fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>Item</span><span style={{ textAlign: "center" }}>Ordered</span><span style={{ textAlign: "center" }}>Available</span><span style={{ textAlign: "center" }}>Status</span>
          </div>
          {items.map((item, i) => {
            const meta = statusMeta[item.status] || statusMeta.unavailable;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 110px", gap: 8, padding: "10px 14px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", alignItems: "center", background: item.status === "in_stock" ? "transparent" : "rgba(255,255,255,0.02)" }}>
                <span style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 500 }}>{item.name}</span>
                <span style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>{item.quantity}</span>
                <span style={{ color: item.status === "in_stock" ? "#22c55e" : item.status === "partial" ? "#f59e0b" : "#ef4444", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                  {item.status === "unavailable" ? "—" : item.currentStock}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                  <span>{meta.icon}</span>
                  <span style={{ color: meta.color, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Contextual message */}
        {allUnavailable ? (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 20 }}>
            ❌ All items are currently out of stock. Reorder is not possible right now.
          </div>
        ) : (
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fcd34d", fontSize: 13, marginBottom: 20 }}>
            ⚠️ Available items will be added at current prices. Out-of-stock items will be skipped.
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          {canProceed && (
            <button style={{ ...cs.addCartBtn, flex: 1 }} onClick={handleConfirm} disabled={confirming}>
              {confirming ? "Adding to cart…" : "Proceed with Available Items"}
            </button>
          )}
          <button style={cs.secondaryBtn} onClick={onClose}>
            {allUnavailable ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Report Issue Modal ── */
function ReportIssueModal({ order, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reasons = ["Damaged/Defective Product", "Wrong Item Delivered", "Missing Items", "Quality Not as Expected", "Delivery Issue", "Other"];

  const handleSubmit = async () => {
    if (!reason) { alert("Please select a reason"); return; }
    setSubmitting(true);
    await onSubmit(order.id, { reason, details, type: "REFUND" });
    setSubmitting(false);
  };

  return (
    <div style={cs.overlay}>
      <div style={{ ...cs.dialog, maxWidth: 500, textAlign: "left" }}>
        <h3 style={{ color: "#fff", marginBottom: 4 }}>⚠️ Report an Issue</h3>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>Order #{order.id}</p>

        <label style={cs.label}>Reason for Return / Refund *</label>
        <select style={{ ...cs.searchInput, width: "100%", marginBottom: 16 }} value={reason} onChange={e => setReason(e.target.value)}>
          <option value="">Select a reason...</option>
          {reasons.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={cs.label}>Additional Details</label>
        <textarea style={{ ...cs.reviewInput, marginBottom: 20, width: "100%", boxSizing: "border-box" }}
          placeholder="Describe the issue in detail..." value={details} onChange={e => setDetails(e.target.value)} />

        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...cs.addCartBtn, flex: 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
          <button style={cs.secondaryBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Wishlist ── */
function WishlistPage({ wishlistIds, products, onRemove, onAddToCart, onSelectProduct }) {
  const wishlisted = products.filter(p => wishlistIds.includes(p.id));
  return (
    <div>
      <h2 style={cs.pageTitle}>My Wishlist ❤️</h2>
      {wishlisted.length === 0 ? <div style={cs.empty}>No items in wishlist</div> : (
        <div style={cs.productGrid}>
          {wishlisted.map(p => (
            <ProductCard key={p.id} product={p} onSelect={onSelectProduct}
              onAddToCart={onAddToCart} onToggleWishlist={onRemove} isWishlisted={true} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Profile Page ── */
function ProfilePage({ profile, api, onUpdate, showToast }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({ name: "", mobile: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [addForm, setAddForm] = useState({ recipientName: "", houseStreet: "", city: "", state: "", postalCode: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [saving, setSaving] = useState(false);
  const { auth } = useAuth();

  useEffect(() => {
    if (profile) setForm({ name: profile.name || "", mobile: profile.mobile || "" });
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    const d = await api("/profile/update", { method: "PUT", body: JSON.stringify(form) });
    showToast(d.message || (d.success ? "Saved!" : "Error"));
    if (d.success) onUpdate();
    setSaving(false);
  };

  const addAddress = async () => {
    const d = await api("/profile/address/add", { method: "POST", body: JSON.stringify(addForm) });
    showToast(d.message || (d.success ? "Address added!" : "Error"));
    if (d.success) { onUpdate(); setAddForm({ recipientName: "", houseStreet: "", city: "", state: "", postalCode: "" }); }
  };

  const deleteAddress = async (id) => {
    await api(`/profile/address/${id}/delete`, { method: "DELETE" });
    showToast("Address removed"); onUpdate();
  };

  const changePw = async () => {
    if (pwForm.newPassword !== pwForm.confirmNewPassword) { showToast("Passwords don't match"); return; }
    const d = await api("/profile/change-password", { method: "PUT", body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
    showToast(d.message || (d.success ? "Password changed!" : "Failed"));
    if (d.success) setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  };

  if (!profile) return <div style={cs.empty}>Loading profile...</div>;

  const tabs = [
    { key: "profile", label: "👤 Profile" },
    { key: "addresses", label: "📍 Addresses" },
    { key: "security", label: "🔐 Security" },
  ];

  return (
    <div>
      <h2 style={cs.pageTitle}>My Account</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} style={{ ...cs.navBtn, ...(activeTab === t.key ? cs.navBtnActive : {}), padding: "10px 20px" }}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div style={{ maxWidth: 480 }}>
          <div style={cs.profileCard}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {profile.profileImage || photoPreview ? (
                    <img src={photoPreview || profile.profileImage} alt="avatar" style={{ width: 96, height: 96, borderRadius: 48, objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                  ) : (
                    <div style={{ width: 96, height: 96, borderRadius: 48, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#fff" }}>{(profile.name || "?")[0].toUpperCase()}</div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input id="profileImageInput" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                      onChange={e => {
                        const f = e.target.files && e.target.files[0];
                        if (!f) return; setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f));
                      }} />
                    <button style={cs.saveBtn} onClick={() => document.getElementById("profileImageInput").click()}>Change Photo</button>
                    <button style={{ ...cs.secondaryBtn, height: 40 }} onClick={async () => {
                      // remove photo
                      if (!confirm("Remove profile photo?")) return;
                      try {
                        const opts = {};
                        if (auth?.token) opts.headers = { "Authorization": `Bearer ${auth.token}` };
                        else opts.credentials = 'include';
                        const res = await fetch("/api/profile/remove-image", opts);
                        const d = await res.json();
                        showToast(d.message || (d.success ? "Removed" : "Failed"));
                        if (d.success) onUpdate();
                      } catch (e) { showToast("Failed to remove photo"); }
                    }}>Remove</button>
                  </div>
                </div>
              </div>
            <div style={cs.fieldGroup}><label style={cs.label}>Name</label>
              <input style={cs.inputField} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div style={cs.fieldGroup}><label style={cs.label}>Email</label>
              <input style={{ ...cs.inputField, opacity: 0.6 }} value={profile.email} disabled /></div>
            <div style={cs.fieldGroup}><label style={cs.label}>Mobile</label>
              <input style={cs.inputField} value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} /></div>
            <button style={cs.saveBtn} onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
            {photoFile && (
              <div style={{ marginTop: 12 }}>
                <button style={cs.saveBtn} onClick={async () => {
                  const fd = new FormData(); fd.append('profileImage', photoFile);
                  try {
                    const opts = { method: 'POST', body: fd };
                    if (auth?.token) opts.headers = { 'Authorization': `Bearer ${auth.token}` };
                    else opts.credentials = 'include';
                    const res = await fetch('/api/profile/upload-image', opts);
                    const d = await res.json();
                    showToast(d.message || (d.success ? 'Uploaded' : 'Failed'));
                    if (d.success) { setPhotoFile(null); setPhotoPreview(null); onUpdate(); }
                  } catch (e) { showToast('Upload failed'); }
                }}>Upload Photo</button>
                <button style={{ ...cs.secondaryBtn, marginLeft: 8 }} onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "addresses" && (
        <div style={{ maxWidth: 600 }}>
          <div style={cs.profileCard}>
            <h3 style={cs.secTitle}>Saved Addresses</h3>
            {(profile.addresses || []).map(a => (
              <div key={a.id} style={cs.addressCard}>
                <div style={{ color: "#e5e7eb" }}><strong>{a.recipientName}</strong></div>
                <div style={{ color: "#9ca3af", fontSize: 13 }}>{a.houseStreet}, {a.city}, {a.state} {a.postalCode}</div>
                <button style={{ ...cs.removeBtn, marginTop: 8 }} onClick={() => deleteAddress(a.id)}>🗑️ Remove</button>
              </div>
            ))}
            {profile.addresses?.length === 0 && <p style={{ color: "#6b7280", fontSize: 14 }}>No addresses saved yet.</p>}
          </div>
            <div style={cs.profileCard}>
            <h3 style={{ ...cs.secTitle, marginBottom: 16 }}>Add New Address</h3>
            <AddressMap onSelect={(r) => {
              // populate addForm fields with selected address parts
              setAddForm(f => ({
                ...f,
                houseStreet: r.display_name || f.houseStreet,
                city: (r.address && (r.address.city || r.address.town || r.address.village)) || f.city,
                state: (r.address && (r.address.state || r.address.region)) || f.state,
                postalCode: (r.address && (r.address.postcode || r.address.postal_code)) || f.postalCode
              }));
            }} />
            {[["recipientName", "Recipient Name"], ["houseStreet", "House / Street"], ["city", "City"], ["state", "State"], ["postalCode", "PIN Code"]].map(([k, label]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={cs.label}>{label}</label>
                <input style={cs.inputField} placeholder={label} value={addForm[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <button style={cs.saveBtn} onClick={addAddress}>+ Add Address</button>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div style={{ maxWidth: 520 }}>

          {/* ── Account overview card ── */}
          <div style={cs.profileCard}>
            <h3 style={{ ...cs.secTitle, marginBottom: 18 }}>🛡️ Account Security</h3>

            {/* Email row */}
            {[
              {
                icon: "📧", label: "Email Address",
                value: profile.email,
                note: null,
              },
              {
                icon: "🕐", label: "Last Sign-in",
                value: profile.lastLogin
                  ? new Date(profile.lastLogin).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "—",
                note: null,
              },
              {
                icon: "🔗", label: "Sign-in Method",
                value: profile.provider && profile.provider !== "local"
                  ? profile.provider.charAt(0).toUpperCase() + profile.provider.slice(1) + " (OAuth)"
                  : "Email & Password",
                note: profile.provider && profile.provider !== "local"
                  ? "Password change not available for OAuth accounts"
                  : null,
              },
              {
                icon: "✅", label: "Account Status",
                value: "Active",
                valueColor: "#22c55e",
              },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{row.icon}</span>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</div>
                    {row.note && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{row.note}</div>}
                  </div>
                </div>
                <span style={{ color: row.valueColor || "#e5e7eb", fontWeight: 600, fontSize: 13, textAlign: "right", maxWidth: 220 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ── Change password card — hidden for OAuth users ── */}
          {(!profile.provider || profile.provider === "local") && (
            <div style={cs.profileCard}>
              <h3 style={{ color: "#e5e7eb", fontWeight: 700, marginBottom: 4, fontSize: 15 }}>🔑 Change Password</h3>
              <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 18 }}>
                Choose a strong password you haven't used before.
              </p>
              {[
                ["currentPassword", "Current Password"],
                ["newPassword", "New Password"],
                ["confirmNewPassword", "Confirm New Password"],
              ].map(([k, label]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={cs.label}>{label}</label>
                  <input
                    style={cs.inputField}
                    type="password"
                    placeholder={label}
                    value={pwForm[k]}
                    onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                  />
                </div>
              ))}
              {/* Strength hint */}
              {pwForm.newPassword && (
                <div style={{ marginBottom: 14 }}>
                  {(() => {
                    const p = pwForm.newPassword;
                    const score = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
                    const labels = ["", "Weak", "Fair", "Good", "Strong"];
                    const colors = ["", "#ef4444", "#f59e0b", "#6366f1", "#22c55e"];
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                          <div style={{ width: `${score * 25}%`, height: "100%", background: colors[score], borderRadius: 2, transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: 11, color: colors[score], fontWeight: 700, minWidth: 40 }}>{labels[score]}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
              <button style={cs.saveBtn} onClick={changePw}>Update Password</button>
            </div>
          )}

          {/* ── Security tips card ── */}
          <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: 18 }}>
            <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>💡 Security Tips</div>
            {[
              "Use a unique password you don't use on other sites.",
              "Never share your password or OTP with anyone.",
              "Sign out from shared or public devices after use.",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, color: "#9ca3af" }}>
                <span style={{ color: "#6366f1", fontWeight: 700, flexShrink: 0 }}>→</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

/* ── AI Assistant Widget ── */
function AIAssistantWidget({ api, onNavigate, showToast }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm your Ekart assistant 🛒 How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const msgEnd = useRef(null);

  useEffect(() => { if (open) msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const quickActions = [
    { label: "📦 Track order", action: () => onNavigate("track") },
    { label: "❌ Cancel order", action: () => onNavigate("orders") },
    { label: "🎟️ View coupons", action: () => onNavigate("coupons") },
    { label: "💰 My spending", action: () => onNavigate("spending") },
    { label: "🔄 Replacement", action: () => onNavigate("orders") },
  ];

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim(); setInput("");
    // Snapshot current messages before the state update for the history payload
    const historyPayload = messages
      .filter(m => m.role === "user" || m.role === "bot")
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", text: m.text }));
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const d = await api("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, history: historyPayload }),
      });
      setMessages(m => [...m, { role: "bot", text: d.reply || d.message || "I can help you with tracking orders, coupons, and more!" }]);
    } catch {
      setMessages(m => [...m, { role: "bot", text: "I'm having trouble connecting. Try using the navigation above!" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
      {open && (
        <div style={cs.chatWidget}>
          <div style={cs.chatHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Ekart Assistant</div>
                <div style={{ fontSize: 11, color: "#86efac" }}>● Online</div>
              </div>
            </div>
            <button style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }} onClick={() => setOpen(false)}>×</button>
          </div>

          <div style={cs.chatMessages}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.08)",
                  color: "#e5e7eb", fontSize: 13, lineHeight: 1.5 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div style={{ display: "flex", gap: 4, padding: "10px 14px" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: `bounce 1s ${i*0.2}s infinite` }} />)}
            </div>}
            <div ref={msgEnd} />
          </div>

          <div style={cs.quickActions}>
            {quickActions.map(qa => (
              <button key={qa.label} style={cs.quickBtn} onClick={() => { qa.action(); setOpen(false); }}>{qa.label}</button>
            ))}
          </div>

          <div style={cs.chatInput}>
            <input style={cs.chatInputField} placeholder="Type a message..." value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} />
            <button style={cs.chatSendBtn} onClick={sendMessage} disabled={loading}>→</button>
          </div>
        </div>
      )}
      <button style={cs.chatFab} onClick={() => setOpen(o => !o)}>
        {open ? "✕" : "🤖"}
      </button>
    </div>
  );
}

/* ── Helpers ── */
function getCatIcon(cat) {
  const icons = { Electronics: "💻", Mobiles: "📱", Fashion: "👗", "Home & Kitchen": "🏠", Books: "📚", Toys: "🧸", Sports: "⚽", Beauty: "💄", Food: "🍕", Grocery: "🛒" };
  return icons[cat] || "🏷️";
}

/* ── Styles ── */
const cs = {
  root: { minHeight: "100vh", background: "#0f0f1a", fontFamily: "'Segoe UI', sans-serif", color: "#e5e7eb" },
  main: { maxWidth: 1200, margin: "0 auto", padding: "24px 20px" },
  nav: { background: "rgba(15,15,26,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px", display: "flex", alignItems: "center", gap: 8, height: 60, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)", flexWrap: "nowrap", overflowX: "auto" },
  brand: { fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: 2, marginRight: 8, whiteSpace: "nowrap" },
  navLinks: { display: "flex", gap: 2, flex: 1 },
  navBtn: { padding: "6px 10px", borderRadius: 8, border: "none", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  navBtnActive: { background: "rgba(99,102,241,0.2)", color: "#a5b4fc" },
  greeting: { color: "#9ca3af", fontSize: 13, whiteSpace: "nowrap" },
  logoutBtn: { padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" },
  toast: { position: "fixed", bottom: 90, right: 24, background: "#1f2937", border: "1px solid rgba(255,255,255,0.15)", color: "#e5e7eb", padding: "12px 20px", borderRadius: 12, zIndex: 999, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" },
  hero: { background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%)", borderRadius: 20, padding: "60px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 },
  heroTitle: { fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1.2, margin: 0 },
  heroAccent: { color: "#a5b4fc" },
  heroSub: { color: "#c7d2fe", margin: "16px 0 24px", fontSize: 16 },
  heroCta: { padding: "14px 32px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  heroIllus: { fontSize: 100 },
  carouselWrap: { position: "relative", borderRadius: 20, overflow: "hidden", marginBottom: 40, background: "rgba(255,255,255,0.04)", userSelect: "none" },
  carouselImg: { width: "100%", height: 360, objectFit: "cover", display: "block" },
  carouselCaption: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px", background: "linear-gradient(transparent, rgba(0,0,0,0.72))", color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: 0.2 },
  carouselArrow: { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", border: "none", color: "#fff", fontSize: 28, fontWeight: 700, width: 42, height: 42, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, backdropFilter: "blur(4px)", zIndex: 2 },
  carouselDots: { position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 2 },
  carouselDot: { width: 8, height: 8, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.35)", cursor: "pointer", padding: 0, transition: "background 0.2s, transform 0.2s" },
  carouselDotActive: { background: "#fff", transform: "scale(1.3)" },
  section: { marginBottom: 40 },
  secTitle: { fontSize: 20, fontWeight: 700, color: "#e5e7eb", marginBottom: 20 },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 12 },
  catCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 8px", textAlign: "center", cursor: "pointer" },
  catIcon: { fontSize: 28, display: "block", marginBottom: 6 },
  catLabel: { fontSize: 12, color: "#9ca3af", fontWeight: 600 },
  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 20 },
  productCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" },
  productImgWrap: { position: "relative", height: 180, background: "rgba(255,255,255,0.06)", cursor: "pointer", overflow: "hidden" },
  productImg: { width: "100%", height: "100%", objectFit: "cover" },
  productImgPlaceholder: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 48 },
  discountBadge: { position: "absolute", top: 8, left: 8, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 },
  wishBtn: { position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", fontSize: 18, borderRadius: 8, padding: 4 },
  wishBtnLarge: { padding: "12px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  productInfo: { padding: "14px 16px" },
  productName: { fontSize: 14, fontWeight: 600, color: "#e5e7eb", marginBottom: 4, cursor: "pointer", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  productCat: { fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" },
  priceRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 4 },
  price: { fontSize: 18, fontWeight: 800, color: "#fff" },
  mrp: { fontSize: 13, color: "#6b7280", textDecoration: "line-through" },
  ratingRow: { display: "flex", alignItems: "center", gap: 4, marginBottom: 4 },
  stars: { color: "#f59e0b", fontSize: 12 },
  ratingNum: { fontSize: 12, color: "#9ca3af" },
  stockBadge: (stock) => ({ fontSize: 11, color: stock > 0 ? "#22c55e" : "#ef4444", marginBottom: 8, fontWeight: 600 }),
  addCartBtn: { width: "100%", padding: "9px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  secondaryBtn: { padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#e5e7eb", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  outlineBtn: { padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.4)", background: "transparent", color: "#a5b4fc", cursor: "pointer", fontSize: 13 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: "#e5e7eb", marginBottom: 24 },
  backBtn: { background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 14, marginBottom: 20, padding: 0 },
  searchBox: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  filterRow: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  searchInput: { flex: 1, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, minWidth: 150 },
  suggestionBox: { position: "absolute", top: 44, left: 0, right: 0, background: "#0f1724", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.5)", zIndex: 40, overflow: "hidden" },
  suggestionItem: { display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.02)" },
  suggestionImg: { width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "rgba(255,255,255,0.03)" },
  searchBtn: { padding: "10px 20px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 700 },
  select: { padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "#1a1a2e", color: "#fff", fontSize: 14 },
  resultCount: { color: "#9ca3af", fontSize: 13, marginBottom: 16 },
  empty: { textAlign: "center", padding: "60px 0", color: "#6b7280", fontSize: 18 },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 40 },
  detailImg: { width: "100%", borderRadius: 16, maxHeight: 400, objectFit: "cover" },
  detailCat: { color: "#6366f1", fontWeight: 700, fontSize: 12, textTransform: "uppercase", marginBottom: 8 },
  detailTitle: { fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 12px" },
  detailPrice: { fontSize: 26, fontWeight: 900, color: "#fff" },
  detailDesc: { color: "#9ca3af", lineHeight: 1.7, marginBottom: 16 },
  vendorInfo: { color: "#9ca3af", fontSize: 14, marginBottom: 12 },
  reviewSection: { background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.08)" },
  reviewForm: { background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, marginBottom: 20 },
  reviewInput: { width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, minHeight: 80, resize: "vertical", boxSizing: "border-box" },
  submitReviewBtn: { marginTop: 8, padding: "9px 20px", borderRadius: 9, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 700 },
  reviewCard: { borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, marginTop: 12 },
  cartLayout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" },
  cartItem: { display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, marginBottom: 12, border: "1px solid rgba(255,255,255,0.08)" },
  cartItemImg: { width: 72, height: 72, background: "rgba(255,255,255,0.08)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, overflow: "hidden" },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontWeight: 600, color: "#e5e7eb", marginBottom: 4 },
  cartItemPrice: { color: "#9ca3af", fontSize: 13, marginBottom: 8 },
  qtyRow: { display: "flex", alignItems: "center", gap: 10 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 },
  qtyNum: { fontWeight: 700, minWidth: 20, textAlign: "center" },
  cartItemTotal: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
  lineTotal: { fontSize: 16, fontWeight: 700, color: "#fff" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444" },
  couponBox: { background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 14, padding: 16, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 },
  cartSummary: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, position: "sticky", top: 80 },
  sumRow: { display: "flex", justifyContent: "space-between", color: "#9ca3af", marginBottom: 10, fontSize: 14 },
  totalRow: { display: "flex", justifyContent: "space-between", color: "#fff", fontWeight: 800, fontSize: 18, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12, marginTop: 8 },
  paymentLayout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" },
  paySection: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 16 },
  paySectionTitle: { color: "#e5e7eb", fontWeight: 700, marginBottom: 14, fontSize: 15 },
  addrCard: { border: "2px solid", borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer" },
  orderCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 16 },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontWeight: 700, color: "#e5e7eb" },
  statusBadge: { padding: "4px 12px", borderRadius: 20, color: "#fff", fontSize: 12, fontWeight: 700 },
  orderItem: { background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 12px", fontSize: 13 },
  cancelBtn: { padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 13 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 28, maxWidth: 420, width: "100%" },
  couponCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" },
  couponStripe: { height: 6, background: "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)" },
  couponBody: { padding: 20 },
  couponCode: { fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: "#a5b4fc", letterSpacing: 2 },
  couponValue: { background: "rgba(99,102,241,0.2)", color: "#a5b4fc", padding: "4px 10px", borderRadius: 8, fontWeight: 700, fontSize: 14 },
  profileCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, marginBottom: 16 },
  profileAvatar: { width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 20 },
  fieldGroup: { marginBottom: 14 },
  label: { display: "block", color: "#9ca3af", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  inputField: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, boxSizing: "border-box" },
  saveBtn: { width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, cursor: "pointer" },
  addressCard: { background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 },
  chatWidget: { position: "absolute", bottom: 70, right: 0, width: 340, height: 480, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  chatHeader: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" },
  chatMessages: { flex: 1, overflowY: "auto", padding: 16 },
  quickActions: { display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.08)" },
  quickBtn: { padding: "5px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 11, fontWeight: 600 },
  chatInput: { display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" },
  chatInputField: { flex: 1, padding: "8px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13 },
  chatSendBtn: { width: 36, height: 36, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 16 },
  chatFab: { width: 56, height: 56, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer", fontSize: 24, boxShadow: "0 8px 24px rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center" },
};