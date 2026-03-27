import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../App";
import { apiFetch } from "../api";

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const stars = r => "★".repeat(r) + "☆".repeat(5 - r);
const statusColor = { PLACED: "#f59e0b", CONFIRMED: "#6366f1", SHIPPED: "#3b82f6", OUT_FOR_DELIVERY: "#8b5cf6", DELIVERED: "#22c55e", CANCELLED: "#ef4444" };

/* ── Layout ── */
function Layout({ nav, children }) {
  return <div style={cs.root}><Nav nav={nav} /><main style={cs.main}>{children}</main></div>;
}
function Nav({ nav }) {
  const { auth, logout } = useAuth();
  const tabs = [
    { key: "home", label: "🏠 Home" }, { key: "search", label: "🔍 Search" },
    { key: "products", label: "🛍️ Shop" }, { key: "cart", label: "🛒 Cart" },
    { key: "orders", label: "📦 Orders" }, { key: "track", label: "🚚 Track" },
    { key: "wishlist", label: "❤️ Wishlist" }, { key: "coupons", label: "🎟️ Coupons" },
    { key: "spending", label: "💰 Spending" }, { key: "profile", label: "👤 Profile" },
  ];
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
        <span style={cs.greeting}>Hi, {auth.name?.split(" ")[0] || "User"}</span>
        <button style={cs.logoutBtn} onClick={logout}>Logout</button>
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
    const d = await api("/spending");
    if (d.success) setSpendingData(d);
  }, [api]);

  useEffect(() => { loadProducts(); loadCategories(); loadCart(); loadWishlist(); loadProfile(); }, []);
  useEffect(() => { if (page === "orders" || page === "track") loadOrders(); }, [page]);
  useEffect(() => { if (page === "coupons") loadCoupons(); }, [page]);
  useEffect(() => { if (page === "spending") loadSpending(); }, [page]);

  const addToCart = async (productId) => {
    setCartLoading(l => ({ ...l, [productId]: true }));
    const d = await api("/cart/add", { method: "POST", body: JSON.stringify({ productId }) });
    if (d.success) { showToast("Added to cart ✓"); loadCart(); }
    else showToast(d.message || "Failed to add");
    setCartLoading(l => ({ ...l, [productId]: false }));
  };

  const removeFromCart = async (productId) => {
    await api(`/cart/remove/${productId}`, { method: "DELETE" });
    loadCart(); showToast("Removed from cart");
  };

  const updateCartQty = async (productId, quantity) => {
    await api("/cart/update", { method: "PUT", body: JSON.stringify({ productId, quantity }) });
    loadCart();
  };

  const applyCoupon = async (code) => {
    const d = await api("/cart/coupon", { method: "POST", body: JSON.stringify({ code }) });
    if (d.success) { showToast(`Coupon applied! ${d.discount || ""}`); loadCart(); }
    else showToast(d.message || "Invalid coupon");
  };

  const removeCoupon = async () => {
    await api("/cart/coupon", { method: "DELETE" });
    loadCart(); showToast("Coupon removed");
  };

  const toggleWishlist = async (productId) => {
    const d = await api("/wishlist/toggle", { method: "POST", body: JSON.stringify({ productId }) });
    if (d.success) { loadWishlist(); showToast(d.message || "Wishlist updated"); }
  };

  const placeOrder = async (addressId, paymentMode = "COD") => {
    const d = await api("/orders/place", { method: "POST", body: JSON.stringify({ paymentMode, addressId }) });
    if (d.success) {
      showToast("Order placed! 🎉");
      setOrderSuccess(d);
      setPaymentPage(false);
      loadCart(); loadOrders(); setPage("success");
    } else showToast(d.message || "Failed to place order");
  };

  const cancelOrder = async (orderId) => {
    const d = await api(`/orders/${orderId}/cancel`, { method: "POST" });
    if (d.success) { showToast("Order cancelled"); loadOrders(); }
    else showToast(d.message || "Cannot cancel");
  };

  const reorderItems = async (orderId) => {
    const d = await api(`/orders/${orderId}/reorder`, { method: "POST" });
    if (d.success) { showToast("Items added to cart!"); loadCart(); setPage("cart"); }
    else showToast(d.message || "Reorder failed");
  };

  const reportIssue = async (orderId, data) => {
    const d = await api(`/orders/${orderId}/report-issue`, { method: "POST", body: JSON.stringify(data) });
    if (d.success) { showToast("Issue reported successfully"); setReportOrder(null); }
    else showToast(d.message || "Failed to report");
  };

  const nav = { active: page, go: (p) => { setPage(p); setSelectedProduct(null); setSelectedOrder(null); setPaymentPage(false); } };

  return (
    <Layout nav={nav}>
      <Toast msg={toast} onHide={() => setToast("")} />
      {reportOrder && <ReportIssueModal order={reportOrder} onClose={() => setReportOrder(null)} onSubmit={reportIssue} />}
      <AIAssistantWidget api={api} onNavigate={p => setPage(p)} showToast={showToast} />

      {page === "home" && <HomePage products={products} categories={categories} onShop={() => setPage("products")}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading} />}

      {page === "search" && <SearchPage categories={categories} api={api}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading} />}

      {page === "products" && <ProductsPage products={products} categories={categories} search={search} selectedCat={selectedCat}
        onSearch={q => { setSearch(q); loadProducts(q, selectedCat); }}
        onCat={c => { setSelectedCat(c); loadProducts(search, c); }}
        onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} cartLoading={cartLoading} />}

      {page === "product" && selectedProduct && <ProductDetailPage product={selectedProduct} onBack={() => setPage("products")}
        onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} api={api} cartLoading={cartLoading} />}

      {page === "cart" && !paymentPage && <CartPage cart={cart} onRemove={removeFromCart} onUpdateQty={updateCartQty}
        onApplyCoupon={applyCoupon} onRemoveCoupon={removeCoupon}
        onCheckout={() => setPaymentPage(true)} profile={profile} />}

      {page === "cart" && paymentPage && <PaymentPage cart={cart} profile={profile}
        onPlaceOrder={placeOrder} onBack={() => setPaymentPage(false)} />}

      {page === "success" && orderSuccess && <OrderSuccessPage order={orderSuccess}
        onTrack={() => { setPage("track"); setOrderSuccess(null); }}
        onHome={() => { setPage("home"); setOrderSuccess(null); }} />}

      {page === "orders" && !selectedOrder && <OrdersPage orders={orders} onCancel={cancelOrder}
        onReorder={reorderItems} onReport={o => setReportOrder(o)}
        onTrack={o => { setSelectedOrder(o); setPage("track-single"); }} />}

      {page === "track" && <TrackOrdersPage orders={orders} onSelectOrder={o => { setSelectedOrder(o); setPage("track-single"); }} />}

      {page === "track-single" && selectedOrder && <TrackSingleOrderPage order={selectedOrder} onBack={() => { setPage("track"); setSelectedOrder(null); }} />}

      {page === "wishlist" && <WishlistPage wishlistIds={wishlistIds} products={products} onRemove={toggleWishlist}
        onAddToCart={addToCart} onSelectProduct={p => { setSelectedProduct(p); setPage("product"); }} />}

      {page === "coupons" && <CouponsPage coupons={coupons} showToast={showToast} />}

      {page === "spending" && <SpendingPage data={spendingData} orders={orders} onLoadOrders={loadOrders} />}

      {page === "profile" && <ProfilePage profile={profile} api={api}
        onUpdate={() => { loadProfile(); showToast("Profile updated!"); }} showToast={showToast} />}
    </Layout>
  );
}

/* ── Home ── */
function HomePage({ products, categories, onShop, onSelectProduct, onAddToCart, onToggleWishlist, wishlistIds, cartLoading }) {
  return (
    <div>
      <div style={cs.hero}>
        <div>
          <h1 style={cs.heroTitle}>Shop Everything<br /><span style={cs.heroAccent}>You Love</span></h1>
          <p style={cs.heroSub}>Discover thousands of products from trusted vendors across India</p>
          <button style={cs.heroCta} onClick={onShop}>Explore Products →</button>
        </div>
        <div style={cs.heroIllus}>🛍️</div>
      </div>
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

  const doSearch = async () => {
    setLoading(true); setSearched(true);
    const params = [];
    if (query) params.push(`search=${encodeURIComponent(query)}`);
    if (cat) params.push(`category=${encodeURIComponent(cat)}`);
    if (minPrice) params.push(`minPrice=${minPrice}`);
    if (maxPrice) params.push(`maxPrice=${maxPrice}`);
    const path = "/products" + (params.length ? "?" + params.join("&") : "");
    const d = await api(path);
    if (d.success) setResults(d.products || []);
    setLoading(false);
  };

  return (
    <div>
      <h2 style={cs.pageTitle}>Search Products 🔍</h2>
      <div style={cs.searchBox}>
        <input style={{ ...cs.searchInput, flex: 2 }} placeholder="Search products, brands..." value={query}
          onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()} />
        <select style={cs.select} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input style={{ ...cs.searchInput, width: 100 }} placeholder="Min ₹" type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
        <input style={{ ...cs.searchInput, width: 100 }} placeholder="Max ₹" type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        <button style={cs.searchBtn} onClick={doSearch} disabled={loading}>{loading ? "..." : "Search"}</button>
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
      {searched && results.length === 0 && !loading && <div style={cs.empty}>No products found 😕<br /><span style={{ fontSize: 14 }}>Try different keywords or filters</span></div>}
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
function ProductDetailPage({ product: p, onBack, onAddToCart, onToggleWishlist, wishlistIds, api, cartLoading }) {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const isWishlisted = wishlistIds.includes(p.id);
  const discount = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;

  useEffect(() => {
    api(`/products/${p.id}/reviews`).then(d => { if (d.success) setReviews(d.reviews || []); });
  }, [p.id]);

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
function PaymentPage({ cart, profile, onPlaceOrder, onBack }) {
  const [payMode, setPayMode] = useState("COD");
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [placing, setPlacing] = useState(false);
  const addrs = profile?.addresses || [];

  const handlePlace = async () => {
    if (!selectedAddr && addrs.length > 0) { alert("Please select a delivery address"); return; }
    setPlacing(true);
    await onPlaceOrder(selectedAddr, payMode);
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
          <div style={cs.sumRow}><span>Subtotal</span><span>{fmt(cart.subtotal)}</span></div>
          {cart.couponDiscount > 0 && <div style={{ ...cs.sumRow, color: "#22c55e" }}><span>Coupon</span><span>-{fmt(cart.couponDiscount)}</span></div>}
          <div style={cs.sumRow}><span>Delivery</span><span style={{ color: !cart.deliveryCharge ? "#22c55e" : "#e5e7eb" }}>{!cart.deliveryCharge ? "FREE" : fmt(cart.deliveryCharge)}</span></div>
          {cart.gstAmount > 0 && <div style={cs.sumRow}><span>GST (included)</span><span>{fmt(cart.gstAmount)}</span></div>}
          <div style={cs.totalRow}><span>Total</span><span>{fmt(cart.total)}</span></div>
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
                  <div style={cs.couponValue}>{c.value}% OFF</div>
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

  const totalSpent = data?.totalSpent || orders?.filter(o => o.trackingStatus === "DELIVERED").reduce((s, o) => s + (o.amount || 0), 0) || 0;
  const totalOrders = data?.totalOrders || orders?.length || 0;
  const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const topCategory = data?.topCategory || "—";

  // Monthly spending from orders
  const monthlySpending = {};
  (orders || []).forEach(o => {
    if (!o.orderDate) return;
    const d = new Date(o.orderDate);
    const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    monthlySpending[key] = (monthlySpending[key] || 0) + (o.amount || 0);
  });
  const months = Object.entries(monthlySpending).slice(-6);
  const maxSpend = Math.max(...months.map(([, v]) => v), 1);

  return (
    <div>
      <h2 style={cs.pageTitle}>My Spending 💰</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total Spent", value: fmt(totalSpent), icon: "💰", color: "#22c55e" },
          { label: "Total Orders", value: totalOrders, icon: "📦", color: "#6366f1" },
          { label: "Avg Order", value: fmt(avgOrder), icon: "📊", color: "#f59e0b" },
          { label: "Top Category", value: topCategory, icon: "🏆", color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8, width: 44, height: 44, borderRadius: 12, background: s.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {months.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h3 style={{ ...cs.secTitle, marginBottom: 24 }}>Monthly Spending Trends</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160 }}>
            {months.map(([month, amount]) => (
              <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{fmt(amount)}</div>
                <div style={{ width: "100%", background: "linear-gradient(180deg, #6366f1, #8b5cf6)", borderRadius: "6px 6px 0 0", height: `${(amount / maxSpend) * 120}px`, minHeight: 4 }} />
                <div style={{ fontSize: 11, color: "#6b7280" }}>{month}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div style={cs.profileAvatar}>{(profile.name || "?")[0].toUpperCase()}</div>
            <div style={cs.fieldGroup}><label style={cs.label}>Name</label>
              <input style={cs.inputField} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div style={cs.fieldGroup}><label style={cs.label}>Email</label>
              <input style={{ ...cs.inputField, opacity: 0.6 }} value={profile.email} disabled /></div>
            <div style={cs.fieldGroup}><label style={cs.label}>Mobile</label>
              <input style={cs.inputField} value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} /></div>
            <button style={cs.saveBtn} onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
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
        <div style={{ maxWidth: 480 }}>
          <div style={cs.profileCard}>
            <h3 style={cs.secTitle}>Security Settings 🔐</h3>
            <div style={{ background: "rgba(99,102,241,0.1)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>Account</div>
              <div style={{ color: "#e5e7eb", fontWeight: 600 }}>{profile.email}</div>
              <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>Role: Customer Account</div>
            </div>
            <h4 style={{ color: "#e5e7eb", marginBottom: 12 }}>Change Password</h4>
            {[["currentPassword", "Current Password"], ["newPassword", "New Password"], ["confirmNewPassword", "Confirm New Password"]].map(([k, label]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={cs.label}>{label}</label>
                <input style={cs.inputField} type="password" placeholder={label} value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <button style={cs.saveBtn} onClick={changePw}>Change Password</button>
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
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const d = await api("/assistant/chat", { method: "POST", body: JSON.stringify({ message: userMsg }) });
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