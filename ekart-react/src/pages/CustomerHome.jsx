import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { getStoredCustomer, clearToken } from '../utils/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const HISTORY_KEY  = 'ekart_search_history';
const MAX_HISTORY  = 8;
const PIN_KEY      = 'ekart_delivery_pin';
const LOC_MODAL_KEY= 'ekart_loc_modal_seen';

const EMOJI_MAP = [
  { keys: ['electronic','laptop','mobile','phone','computer','tablet','camera','tv','audio'], emoji: '💻' },
  { keys: ['cloth','fashion','shirt','dress','wear','apparel','jeans','kurta','saree'],       emoji: '👕' },
  { keys: ['food','snack','grocery','biscuit','chips','drink','beverage','juice','tea','coffee','rice','oil','spice'], emoji: '🍎' },
  { keys: ['beauty','skin','cosmetic','makeup','face','hair','cream','lotion','shampoo'],     emoji: '💄' },
  { keys: ['health','medicine','vitamin','supplement','pharma','ayurved','sanitizer'],        emoji: '💊' },
  { keys: ['book','stationery','pen','notebook','office','study'],                           emoji: '📚' },
  { keys: ['sport','fitness','gym','yoga','outdoor','cricket','football'],                   emoji: '⚽' },
  { keys: ['toy','kids','baby','child','game','puzzle'],                                     emoji: '🧸' },
  { keys: ['home','kitchen','furniture','decor','appliance','cookware','utensil'],            emoji: '🏠' },
  { keys: ['bag','luggage','wallet','purse','handbag','backpack'],                           emoji: '👜' },
  { keys: ['shoe','footwear','sandal','slipper','boot'],                                     emoji: '👟' },
  { keys: ['jewel','watch','accessory','ring','necklace','bracelet'],                        emoji: '💍' },
  { keys: ['pet','animal','dog','cat'],                                                      emoji: '🐾' },
  { keys: ['plant','garden','seed','fertilizer','pot'],                                      emoji: '🌱' },
  { keys: ['car','auto','vehicle','bike','tyre','motor'],                                    emoji: '🚗' },
  { keys: ['dairy','milk','cheese','butter','egg','paneer'],                                 emoji: '🥛' },
  { keys: ['personal','hygiene','soap','detergent','cleaning'],                              emoji: '🧴' },
];

function getEmoji(catName = '') {
  const lower = catName.toLowerCase();
  for (const { keys, emoji } of EMOJI_MAP) {
    if (keys.some(k => lower.includes(k))) return emoji;
  }
  return '📦';
}

function isIndianPin(val) {
  if (!/^\d{6}$/.test(val)) return false;
  const prefix = val.slice(0, 2);
  const valid = new Set(['11','12','13','14','15','16','17','18','19',
    '20','21','22','23','24','25','26','27','28',
    '30','31','32','33','34','36','37','38','39',
    '40','41','42','43','44','45','46','47','48','49',
    '50','51','52','53','56','57','58','59',
    '60','61','62','63','64','65','66','67','68','69',
    '70','71','72','73','74','75','76','77','78','79',
    '80','81','82','83','84','85',
    '90','91','92','93','94','95','96','97','98','99']);
  return valid.has(prefix);
}

// ─── StarRow helper ───────────────────────────────────────────────────────────
function StarRow({ avg, size = '0.62rem' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1,2,3,4,5].map(i => {
        let cls = 'far fa-star';
        if (i <= avg) cls = 'fas fa-star';
        else if (i - 0.5 <= avg) cls = 'fas fa-star-half-alt';
        return <i key={i} className={cls} style={{ color: i <= avg || i - 0.5 <= avg ? 'var(--yellow)' : 'rgba(255,255,255,0.22)', fontSize: size }} />;
      })}
    </span>
  );
}

// ─── Toast component ──────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}
          style={{ background: 'rgba(10,12,30,0.95)', backdropFilter: 'blur(16px)', border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`, borderRadius: 12, padding: '0.875rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.7rem', fontSize: '0.82rem', minWidth: 240, animation: 'slideInRight 0.3s ease both' }}>
          <i className={`fas fa-${t.type === 'success' ? 'check-circle' : 'times-circle'}`}
            style={{ color: t.type === 'success' ? '#22c55e' : '#ef4444' }} />
          <span style={{ color: 'white' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CustomerHome
// ═══════════════════════════════════════════════════════════════════════════════
export default function CustomerHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customer = getStoredCustomer();

  // ── Data ─────────────────────────────────────────────────────────────────
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]); // flat list of category strings
  const [cartCount,  setCartCount]  = useState(0);
  const [wishlistIds,setWishlistIds]= useState(new Set());
  const [loading,    setLoading]    = useState(true);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [toasts,        setToasts]        = useState([]);
  const [navScrolled,   setNavScrolled]   = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [drawerSubs,    setDrawerSubs]    = useState({}); // parentName → open
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [cartPopupShown,setCartPopupShown]= useState(false);
  const [cartPopupDismissed, setCartPopupDismissed] = useState(false);

  // ── Search / Autocomplete ─────────────────────────────────────────────────
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchFilter,    setSearchFilter]    = useState(''); // active filter applied to grid
  const [suggestions,     setSuggestions]     = useState([]);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [fuzzySuggestion, setFuzzySuggestion] = useState(null);
  const [searchHistory,   setSearchHistory]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });
  const [acActiveIdx, setAcActiveIdx] = useState(-1);
  const searchRef    = useRef(null);
  const debounceRef  = useRef(null);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortType, setSortType] = useState('default');

  // ── Budget ────────────────────────────────────────────────────────────────
  const maxPrice = useMemo(() => {
    if (!products.length) return 10000;
    return Math.ceil(Math.max(...products.map(p => p.price)) * 1.1 / 50) * 50;
  }, [products]);
  const [budget, setBudget] = useState(null); // null = no filter = all products

  // ── Category filter ───────────────────────────────────────────────────────
  const [activeParent, setActiveParent] = useState(null); // category string
  const [activeSub,    setActiveSub]    = useState(null);

  // ── Banner carousel ───────────────────────────────────────────────────────
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerTimer = useRef(null);
  // Static demo banners (no public API for banners in FlutterApiController)
  const BANNERS = [
    { title: 'Welcome to Ekart', subtitle: 'Your one-stop shopping destination', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80' },
    { title: 'New Arrivals', subtitle: 'Fresh picks from verified vendors', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80' },
    { title: 'Best Deals Today', subtitle: 'Unbeatable prices, every day', imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80' },
  ];

  // ── Location / PIN ────────────────────────────────────────────────────────
  const [pin,          setPin]          = useState(() => localStorage.getItem(PIN_KEY) || '');
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [pinInput,     setPinInput]     = useState('');
  const [pinError,     setPinError]     = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  //  Toast helpers
  // ─────────────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  Fetch data
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const sortParam     = searchParams.get('sort');

    Promise.all([
      api.get('/api/flutter/products'),
      api.get('/api/flutter/products/categories'),
      customer ? api.get('/api/flutter/cart', { headers: { 'X-Customer-Id': customer.id } }) : Promise.resolve({ data: { items: [] } }),
      customer ? api.get('/api/flutter/wishlist/ids', { headers: { 'X-Customer-Id': customer.id } }) : Promise.resolve({ data: { ids: [] } }),
    ])
      .then(([prodRes, catRes, cartRes, wishRes]) => {
        setProducts(prodRes.data.products || []);
        setCategories(catRes.data.categories || []);
        const cartItems = cartRes.data.items || cartRes.data.cart?.items || [];
        setCartCount(Array.isArray(cartItems) ? cartItems.length : 0);
        setWishlistIds(new Set(wishRes.data.ids || []));
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        if (categoryParam) {
          setSearchFilter(categoryParam);
          setSearchQuery(categoryParam);
        }
        if (sortParam) setSortType(sortParam);
      });
  }, []);

  // ── Cart popup after 1.8s if cart has items ───────────────────────────────
  useEffect(() => {
    if (cartCount > 0 && !cartPopupDismissed) {
      const t = setTimeout(() => setCartPopupShown(true), 1800);
      return () => clearTimeout(t);
    }
  }, [cartCount, cartPopupDismissed]);

  // ── Banner auto-advance ───────────────────────────────────────────────────
  useEffect(() => {
    bannerTimer.current = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 4000);
    return () => clearInterval(bannerTimer.current);
  }, []);

  // ── Nav scroll shadow ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ── Auto-show location modal on first visit ───────────────────────────────
  useEffect(() => {
    if (!pin && !sessionStorage.getItem(LOC_MODAL_KEY)) {
      sessionStorage.setItem(LOC_MODAL_KEY, '1');
      setTimeout(() => setLocModalOpen(true), 1200);
    }
  }, []);

  // ── Close profile dropdown on outside click ────────────────────────────────
  useEffect(() => {
    const handler = () => setProfileOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  Search history helpers
  // ─────────────────────────────────────────────────────────────────────────
  const saveHistory = useCallback((q) => {
    if (!q || q.trim().length < 2) return;
    q = q.trim();
    setSearchHistory(prev => {
      const filtered = prev.filter(x => x.toLowerCase() !== q.toLowerCase());
      const next = [q, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeHistory = useCallback((q) => {
    setSearchHistory(prev => {
      const next = prev.filter(x => x !== q);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  Autocomplete
  // ─────────────────────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback((q) => {
    setDropdownLoading(true);
    api.get(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
      .then(r => {
        const data = r.data || [];
        setSuggestions(data);
        if (!data.length) {
          api.get(`/api/search/fuzzy?q=${encodeURIComponent(q)}`)
            .then(fr => setFuzzySuggestion(fr.data?.suggestion || null))
            .catch(() => setFuzzySuggestion(null));
        } else {
          setFuzzySuggestion(null);
        }
      })
      .catch(() => setSuggestions([]))
      .finally(() => setDropdownLoading(false));
  }, []);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setAcActiveIdx(-1);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(searchHistory.length > 0);
      setDropdownLoading(false);
      return;
    }
    setShowDropdown(true);
    setDropdownLoading(true);
    debounceRef.current = setTimeout(() => fetchSuggestions(val.trim()), 200);
  };

  const handleSearchFocus = () => {
    if (!searchQuery.trim()) {
      if (searchHistory.length) setShowDropdown(true);
    } else {
      setShowDropdown(true);
      fetchSuggestions(searchQuery.trim());
    }
  };

  const applySearch = useCallback((q) => {
    saveHistory(q);
    setSearchFilter(q);
    setSearchQuery(q);
    setShowDropdown(false);
    setAcActiveIdx(-1);
  }, [saveHistory]);

  const clearSearch = () => {
    setSearchFilter('');
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (acActiveIdx >= 0 && suggestions[acActiveIdx]) {
        applySearch(suggestions[acActiveIdx].productName);
      } else if (searchQuery.trim()) {
        applySearch(searchQuery.trim());
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAcActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAcActiveIdx(i => Math.max(i - 1, -1));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Add to cart
  // ─────────────────────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(async (e, productId) => {
    e.stopPropagation();
    if (!customer) {
      addToast('Please log in to add to cart', 'error');
      navigate('/login');
      return;
    }
    try {
      const res = await api.post('/api/flutter/cart/add',
        { productId, quantity: 1 },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      if (res.data.success) {
        setCartCount(c => c + 1);
        addToast('Added to cart 🛒', 'success');
      } else {
        addToast(res.data.message || 'Could not add to cart', 'error');
      }
    } catch {
      addToast('Could not add to cart', 'error');
    }
  }, [customer, navigate, addToast]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Wishlist toggle
  // ─────────────────────────────────────────────────────────────────────────
  const handleWishlist = useCallback(async (e, productId) => {
    e.stopPropagation();
    if (!customer) {
      addToast('Please log in to use wishlist', 'error');
      return;
    }
    try {
      const res = await api.post('/api/flutter/wishlist/toggle',
        { productId },
        { headers: { 'X-Customer-Id': customer.id } }
      );
      if (res.data.success) {
        setWishlistIds(prev => {
          const next = new Set(prev);
          if (res.data.added) { next.add(productId); addToast('Added to Wishlist ❤️', 'success'); }
          else { next.delete(productId); addToast('Removed from Wishlist', 'error'); }
          return next;
        });
      } else {
        addToast(res.data.message || 'Please log in to use wishlist', 'error');
      }
    } catch {
      addToast('Something went wrong', 'error');
    }
  }, [customer, addToast]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Derived: filtered + sorted products
  // ─────────────────────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category filter
    if (activeSub) {
      list = list.filter(p => p.category?.toLowerCase() === activeSub.toLowerCase());
    } else if (activeParent) {
      list = list.filter(p => p.category?.toLowerCase().includes(activeParent.toLowerCase()));
    }

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    // Budget filter
    if (budget !== null && budget < maxPrice) {
      list = list.filter(p => p.price <= budget);
    }

    // Sort
    switch (sortType) {
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0)); break;
      case 'name':       list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'newest':     list.sort((a, b) => b.id - a.id); break;
      default: break;
    }
    return list;
  }, [products, activeParent, activeSub, searchFilter, budget, maxPrice, sortType]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Group categories into parent groups (using emoji map as proxy)
  // ─────────────────────────────────────────────────────────────────────────
  const parentGroups = useMemo(() => {
    // Group flat categories by their emoji bucket
    const groups = {};
    categories.forEach(cat => {
      const emoji = getEmoji(cat);
      if (!groups[emoji]) groups[emoji] = { emoji, name: cat, subs: [] };
      groups[emoji].subs.push(cat);
      // Use shortest name as group name
      if (cat.length < groups[emoji].name.length) groups[emoji].name = cat;
    });
    return Object.values(groups);
  }, [categories]);

  // ─────────────────────────────────────────────────────────────────────────
  //  Location PIN
  // ─────────────────────────────────────────────────────────────────────────
  const confirmPin = () => {
    const val = pinInput.replace(/\D/g, '');
    if (!isIndianPin(val)) { setPinError('Please enter a valid Indian pin code.'); return; }
    localStorage.setItem(PIN_KEY, val);
    setPin(val);
    setLocModalOpen(false);
    addToast(`Delivering to ${val} 📍`, 'success');
  };

  const clearPin = () => {
    localStorage.removeItem(PIN_KEY);
    setPin('');
    setLocModalOpen(false);
    addToast('Location filter cleared', 'success');
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Logout
  // ─────────────────────────────────────────────────────────────────────────
  const handleLogout = () => { clearToken(); navigate('/login'); };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Poppins', sans-serif", color: 'white' }}>
      <style>{HOME_CSS}</style>

      {/* BG */}
      <div className="bg-layer" />

      {/* Toasts */}
      <Toast toasts={toasts} />

      {/* ── LOCATION BAR ── */}
      <div className="loc-bar">
        <i className="fas fa-map-marker-alt" style={{ color: 'var(--yellow)', fontSize: '0.8rem' }} />
        <span className="loc-bar-hint">Delivering to</span>
        <span className="loc-pill" onClick={() => { setPinInput(pin); setPinError(''); setLocModalOpen(true); }}>
          <span className={`loc-dot${pin ? '' : ' unset'}`} />
          <span>{pin ? `📍 ${pin}` : 'Set your location'}</span>
        </span>
        {pin && <span className="loc-bar-hint">· Products greyed out are not available here yet</span>}
      </div>

      {/* ── NAV ── */}
      <nav className={`ekart-home-nav${navScrolled ? ' scrolled' : ''}`} id="nav">
        {/* Hamburger */}
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>

        <Link to="/home" className="nav-brand">
          <i className="fas fa-shopping-cart" style={{ fontSize: '1rem' }} />
          Ek<span>art</span>
        </Link>

        {/* Search */}
        <div className="nav-search" ref={searchRef}>
          <i className="fas fa-search nav-search-icon"
            onClick={() => searchQuery.trim() && applySearch(searchQuery.trim())}
            style={{ cursor: 'pointer' }} />
          <input
            type="text"
            placeholder="Search products…"
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={handleSearchFocus}
            onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            className={showDropdown ? 'nav-dropdown-open' : ''}
          />
          {/* Autocomplete dropdown */}
          {showDropdown && (
            <div className="nav-autocomplete-dropdown">
              <ul className="nav-ac-list">
                {!searchQuery.trim() ? (
                  // History view
                  <>
                    {searchHistory.length === 0
                      ? <div className="nav-ac-empty"><i className="fas fa-clock" /> No recent searches</div>
                      : <>
                          <div className="nav-history-header">
                            <span><i className="fas fa-clock" style={{ marginRight: 4 }} />Recent</span>
                            <button className="nav-history-clear" onMouseDown={e => { e.preventDefault(); localStorage.removeItem(HISTORY_KEY); setSearchHistory([]); setShowDropdown(false); }}>Clear all</button>
                          </div>
                          {searchHistory.map((q, idx) => (
                            <li key={q} className="nav-history-item" onMouseDown={() => applySearch(q)}>
                              <i className="fas fa-history nav-history-icon" />
                              <span className="nav-history-text">{q}</span>
                              <button className="nav-history-remove" onMouseDown={e => { e.stopPropagation(); removeHistory(q); }}>✕</button>
                            </li>
                          ))}
                        </>
                    }
                  </>
                ) : dropdownLoading ? (
                  <div className="nav-ac-loading"><i className="fas fa-circle-notch" style={{ animation: 'navSpin 1s linear infinite' }} /> Searching…</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((s, idx) => (
                    <li key={s.id || idx}
                      className={`nav-ac-item${idx === acActiveIdx ? ' active' : ''}`}
                      onMouseDown={() => applySearch(s.productName)}
                      onMouseEnter={() => setAcActiveIdx(idx)}>
                      {s.imageLink
                        ? <img className="nav-ac-thumb" src={s.imageLink} alt="" onError={e => e.target.style.display = 'none'} />
                        : <div className="nav-ac-thumb-ph">🛍</div>}
                      <div className="nav-ac-text">
                        <div className="nav-ac-name">{s.productName}</div>
                        {s.category && <div className="nav-ac-cat">in {s.category}</div>}
                      </div>
                      {idx < 3 && s.purchaseCount > 0 && <span className="nav-ac-badge">🔥 Popular</span>}
                    </li>
                  ))
                ) : fuzzySuggestion ? (
                  <div className="nav-ac-empty" style={{ cursor: 'pointer' }} onMouseDown={() => applySearch(fuzzySuggestion)}>
                    <i className="fas fa-spell-check" style={{ color: 'var(--yellow)' }} />
                    <span>Are you looking for <strong style={{ color: 'var(--yellow)', textDecoration: 'underline dotted' }}>{fuzzySuggestion}</strong>?</span>
                  </div>
                ) : (
                  <div className="nav-ac-empty"><i className="fas fa-search" /> No results for "{searchQuery}"</div>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Right links */}
        <div className="nav-right">
          <Link to="/track-orders" className="nav-link" title="Track Orders"><i className="fas fa-truck" /> <span>Track</span></Link>
          <Link to="/order-history" className="nav-link" title="Order History"><i className="fas fa-history" /> <span>Orders</span></Link>
          <Link to="/view-orders" className="nav-link" title="My Orders"><i className="fas fa-box-open" /> <span>My Orders</span></Link>
          <Link to="/wishlist" className="nav-link wishlist-link" title="Wishlist"><i className="fas fa-heart" /> <span>Wishlist</span></Link>
          <Link to="/spending" className="nav-link" title="Spending" style={{ borderColor: 'rgba(16,185,129,0.3)' }}><i className="fas fa-chart-pie" style={{ color: '#10b981' }} /> <span>Spending</span></Link>
          <Link to="/cart" className="nav-link cart-link" title="Cart" style={{ position: 'relative' }}>
            <i className="fas fa-shopping-cart" /> <span>Cart</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {/* India flag badge */}
          <div className="india-flag-badge" title="Made in India">
            <svg width="22" height="16" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: 2, flexShrink: 0 }}>
              <rect width="22" height="16" fill="#fff"/>
              <rect width="22" height="5.33" fill="#FF9933"/>
              <rect y="10.67" width="22" height="5.33" fill="#138808"/>
              <circle cx="11" cy="8" r="2.5" fill="none" stroke="#000080" strokeWidth="0.5"/>
              <circle cx="11" cy="8" r="0.5" fill="#000080"/>
              <g stroke="#000080" strokeWidth="0.35" fill="none">
                <line x1="11" y1="5.5" x2="11" y2="10.5"/>
                <line x1="8.5" y1="8" x2="13.5" y2="8"/>
                <line x1="9.23" y1="5.73" x2="12.77" y2="10.27"/>
                <line x1="12.77" y1="5.73" x2="9.23" y2="10.27"/>
                <line x1="8.5" y1="6.27" x2="13.5" y2="9.73"/>
                <line x1="13.5" y1="6.27" x2="8.5" y2="9.73"/>
              </g>
            </svg>
            <span>India</span>
          </div>

          {/* Profile dropdown */}
          <div className="profile-menu" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className="profile-icon-btn" onClick={() => setProfileOpen(v => !v)}>
              <i className="fas fa-user-circle" />
            </button>
            {profileOpen && (
              <div className="profile-dropdown open">
                <div className="profile-dropdown-name"><i className="fas fa-user" /><span>{customer?.name || 'Account'}</span></div>
                <Link to="/security-settings" className="profile-dropdown-item"><i className="fas fa-shield-alt" /> Security Settings</Link>
                <button className="profile-dropdown-item" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#ccc', fontFamily: 'inherit', fontSize: '0.88rem' }} onClick={handleLogout}><i className="fas fa-sign-out-alt" /> Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── SIDE DRAWER ── */}
      <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`side-drawer${drawerOpen ? ' open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-header-name">
            <i className="fas fa-user" />
            <span>Hello, {customer?.name || 'Guest'}</span>
          </div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <div className="drawer-body">
          <div className="drawer-section-title">Trending</div>
          <Link to="/home?sort=popular" className="drawer-item" onClick={() => setDrawerOpen(false)}><div className="drawer-item-left"><i className="fas fa-fire" /> Bestsellers</div></Link>
          <Link to="/home?sort=newest" className="drawer-item" onClick={() => setDrawerOpen(false)}><div className="drawer-item-left"><i className="fas fa-star" /> New Arrivals</div></Link>
          <Link to="/spending" className="drawer-item" onClick={() => setDrawerOpen(false)}><div className="drawer-item-left"><i className="fas fa-chart-line" /> My Spending</div></Link>

          <div className="drawer-section-title">Shop by Category</div>
          {parentGroups.map(pg => (
            <div key={pg.emoji}>
              <button className={`drawer-item${drawerSubs[pg.emoji] ? ' expanded' : ''}`}
                onClick={() => setDrawerSubs(prev => ({ ...prev, [pg.emoji]: !prev[pg.emoji] }))}>
                <div className="drawer-item-left"><i className="fas fa-tag" /><span>{pg.emoji} {pg.name}</span></div>
                <i className={`fas fa-chevron-right drawer-arrow`} style={{ transition: 'transform 0.25s', transform: drawerSubs[pg.emoji] ? 'rotate(90deg)' : 'none' }} />
              </button>
              <div className="drawer-submenu" style={{ maxHeight: drawerSubs[pg.emoji] ? 400 : 0 }}>
                {pg.subs.map(sub => (
                  <button key={sub} className="drawer-subitem" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => { setActiveSub(sub); setActiveParent(null); setDrawerOpen(false); }}>
                    <span className="drawer-subitem-emoji">{pg.emoji}</span>
                    <span>{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="drawer-section-title">My Account</div>
          {[
            ['/view-orders','fa-box-open','My Orders'],
            ['/track-orders','fa-truck','Track Orders'],
            ['/wishlist','fa-heart','Wishlist'],
            ['/cart','fa-shopping-cart','Cart'],
            ['/spending','fa-chart-pie','Spending Analytics'],
            ['/security-settings','fa-shield-alt','Security Settings'],
          ].map(([href, icon, label]) => (
            <Link key={href} to={href} className="drawer-item" onClick={() => setDrawerOpen(false)}>
              <div className="drawer-item-left"><i className={`fas ${icon}`} /> {label}</div>
              <i className="fas fa-chevron-right drawer-item-arrow" />
            </Link>
          ))}

          <div className="drawer-section-title">Help & Settings</div>
          <Link to="/policies" className="drawer-item" onClick={() => setDrawerOpen(false)}>
            <div className="drawer-item-left"><i className="fas fa-file-alt" /> Policies & Terms</div>
            <i className="fas fa-chevron-right drawer-item-arrow" />
          </Link>
        </div>
        <div className="drawer-footer">
          <button className="drawer-footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" /> Sign Out
          </button>
        </div>
      </div>

      {/* ── LOCATION MODAL ── */}
      {locModalOpen && (
        <div className="loc-modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setLocModalOpen(false); }}>
          <div className="loc-modal" style={{ position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1rem', right: '1.25rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', cursor: 'pointer' }} onClick={() => setLocModalOpen(false)}><i className="fas fa-times" /></button>
            <div className="loc-modal-title"><i className="fas fa-map-marker-alt" style={{ color: 'var(--yellow)' }} /> Set Delivery Location</div>
            <div className="loc-modal-sub">We'll show only products available at your pin code.</div>
            <div className="loc-input-row">
              <input className="loc-pin-input" type="text" placeholder="Enter Indian pin code" maxLength={6} inputMode="numeric"
                value={pinInput} onChange={e => { setPinInput(e.target.value.replace(/\D/g,'').slice(0,6)); setPinError(''); }}
                onKeyDown={e => e.key === 'Enter' && confirmPin()} autoFocus />
              <button className="loc-confirm-btn" onClick={confirmPin}>Apply</button>
            </div>
            {pinError && <div className="loc-error">{pinError}</div>}
            {pin && <span className="loc-clear-link" onClick={clearPin}><i className="fas fa-times-circle" /> Clear location filter</span>}
          </div>
        </div>
      )}

      {/* ── MAIN PAGE ── */}
      <main className="page">

        {/* ── BANNER CAROUSEL ── */}
        <div className="banner-carousel"
          onMouseEnter={() => clearInterval(bannerTimer.current)}
          onMouseLeave={() => { bannerTimer.current = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 4000); }}>
          <div className="banner-track" style={{ transform: `translateX(-${bannerIdx * 100}%)` }}>
            {BANNERS.map((b, i) => (
              <div key={i} className="banner-slide">
                <img src={b.imageUrl} alt={b.title} />
                <div className="banner-text">
                  <h2>{b.title}</h2>
                  {b.subtitle && <p>{b.subtitle}</p>}
                </div>
              </div>
            ))}
          </div>
          <button className="banner-arrow banner-prev" onClick={() => setBannerIdx(i => (i - 1 + BANNERS.length) % BANNERS.length)} aria-label="Previous"><i className="fas fa-chevron-left" /></button>
          <button className="banner-arrow banner-next" onClick={() => setBannerIdx(i => (i + 1) % BANNERS.length)} aria-label="Next"><i className="fas fa-chevron-right" /></button>
          <div className="banner-dots">
            {BANNERS.map((_, i) => (
              <button key={i} className={`banner-dot${i === bannerIdx ? ' active' : ''}`} onClick={() => setBannerIdx(i)} />
            ))}
          </div>
        </div>

        {/* ── WELCOME STRIP ── */}
        <div className="welcome-strip" style={{ animation: 'fadeUp 0.4s ease both' }}>
          <div>
            <h1>Welcome back, <span>{customer?.name || 'Shopper'}</span> 👋</h1>
            <p>Browse our full catalogue from verified vendors.</p>
          </div>
          <div style={{ fontSize: '2rem', opacity: 0.6 }}>🛍️</div>
        </div>

        {/* ── CATEGORY SECTION ── */}
        {parentGroups.length > 0 && (
          <div className="cat-section">
            <div className="cat-section-header"><i className="fas fa-th-large" /> Shop by Category</div>
            <div className="cat-scroll-wrap">
              <div className="cat-grid">
                {/* All */}
                <div className={`cat-card cat-all${!activeParent && !activeSub ? ' active-cat' : ''}`}
                  onClick={() => { setActiveParent(null); setActiveSub(null); }}>
                  <div className="cat-icon">🛍️</div>
                  <div className="cat-name">All</div>
                  <div className="cat-count">{parentGroups.length} groups</div>
                </div>
                {parentGroups.map(pg => (
                  <div key={pg.emoji}
                    className={`cat-card${activeParent === pg.name ? ' active-cat' : ''}`}
                    onClick={() => { setActiveParent(pg.name); setActiveSub(null); }}>
                    <div className="cat-icon">{pg.emoji}</div>
                    <div className="cat-name">{pg.name}</div>
                    <div className="cat-count">{pg.subs.length} types</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-category row */}
            {activeParent && (
              <div className="subcat-row">
                <div className="subcat-label">{getEmoji(activeParent)} {activeParent}</div>
                <div className="subcat-grid">
                  <div className={`subcat-chip${!activeSub ? ' active-sub' : ''}`} onClick={() => setActiveSub(null)}>
                    All {activeParent}
                  </div>
                  {(parentGroups.find(pg => pg.name === activeParent)?.subs || []).map(sub => (
                    <div key={sub}
                      className={`subcat-chip${activeSub === sub ? ' active-sub' : ''}`}
                      onClick={() => setActiveSub(sub)}>
                      {sub}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BUDGET BAR ── */}
        <div className="budget-bar">
          <span className="budget-label"><i className="fas fa-coins" /> Budget Mode</span>
          <input type="range" id="budgetSlider" min={0} max={maxPrice} step={50}
            value={budget ?? maxPrice}
            onChange={e => setBudget(Number(e.target.value))}
            style={{ flex: 1, minWidth: 140, WebkitAppearance: 'none', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, cursor: 'pointer' }} />
          <span className="budget-value">{budget !== null && budget < maxPrice ? `₹${budget.toLocaleString('en-IN')}` : 'All Products'}</span>
          <span className="budget-count">{budget !== null && budget < maxPrice ? `${filteredProducts.length} of ${products.length} products` : ''}</span>
          <button className="btn-reset" onClick={() => setBudget(null)}><i className="fas fa-redo-alt" /> Reset</button>
        </div>

        {/* ── SEARCH RESULTS BANNER ── */}
        {searchFilter && (
          <div className="search-results-banner show">
            <i className="fas fa-search" style={{ color: 'var(--yellow)', fontSize: '0.85rem' }} />
            <span className="srb-label">Showing results for</span>
            <span className="srb-query">"{searchFilter}"</span>
            <span className="srb-count">— {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found</span>
            <button className="srb-clear" onClick={clearSearch}><i className="fas fa-times" /> Clear search</button>
          </div>
        )}

        {/* ── SORT BAR ── */}
        <div className="sort-filter-bar">
          <div className="sort-filter-left">
            <span className="sort-filter-label"><i className="fas fa-sort-amount-down" style={{ color: 'var(--yellow)', marginRight: 4 }} />Sort:</span>
            {[['default','Default'],['price-asc','Price ↑'],['price-desc','Price ↓'],['rating','⭐ Rating'],['newest','Newest'],['name','A–Z']].map(([val, label]) => (
              <button key={val} className={`sort-btn${sortType === val ? ' active' : ''}`} onClick={() => setSortType(val)}>{label}</button>
            ))}
          </div>
          <div className="sort-result-count">Showing <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>{filteredProducts.length}</span> products</div>
        </div>

        {/* ── PRODUCT GRID ── */}
        {loading ? (
          <div className="product-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="product-card-wrapper">
                <div className="product-card" style={{ height: 380, background: 'rgba(255,255,255,0.05)', borderRadius: 22, animation: `shimmer 1.5s infinite ${i * 0.1}s` }} />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-box-open" />
            <h3>No Products Found</h3>
            <p>{searchFilter ? `No results for "${searchFilter}". Try a different search.` : 'Check back soon — vendors are adding new items!'}</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((p, idx) => {
              const inWishlist = wishlistIds.has(p.id);
              const isPinUnavailable = pin && p.allowedPinCodes && !p.allowedPinCodes.split(',').map(x => x.trim()).includes(pin);
              const extraImages = p.extraImageLinks ? p.extraImageLinks.split(',').filter(Boolean) : [];

              return (
                <div key={p.id}
                  className={`product-card-wrapper${isPinUnavailable ? ' pin-unavailable' : ''}`}
                  style={{ animationDelay: `${Math.min(idx, 5) * 0.05}s` }}>
                  <div className="product-card" style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/product/${p.id}`)}>

                    {isPinUnavailable && (
                      <div className="pin-unavail-overlay">
                        <div className="pin-unavail-badge"><i className="fas fa-clock" /> Available Very Soon</div>
                        <div className="pin-unavail-sub">Not delivering to your pin code yet</div>
                      </div>
                    )}

                    {/* Image */}
                    <div className="img-area">
                      <img className="card-image" src={p.imageLink} alt={p.name}
                        onError={e => { e.target.src = 'https://via.placeholder.com/320x220?text=No+Image'; }} />
                      <span className="category-pill">{p.category}</span>
                      <button className={`btn-wishlist${inWishlist ? ' active' : ''}`}
                        onClick={e => handleWishlist(e, p.id)} title="Wishlist">
                        <i className={`${inWishlist ? 'fas' : 'far'} fa-heart`} />
                      </button>
                      {budget !== null && budget < maxPrice && p.price <= budget && (
                        <span className="budget-badge"><i className="fas fa-check-double" /> In Budget</span>
                      )}
                    </div>

                    {/* Thumbnail tray */}
                    {extraImages.length > 0 && (
                      <div className="media-tray">
                        <img src={p.imageLink} alt="" style={{ width: 42, height: 42, borderRadius: 7, cursor: 'pointer', border: '2px solid transparent', objectFit: 'cover', transition: 'all 0.2s', flexShrink: 0 }} />
                        {extraImages.map((url, i) => (
                          <img key={i} src={url} alt="" style={{ width: 42, height: 42, borderRadius: 7, cursor: 'pointer', border: '2px solid transparent', objectFit: 'cover', transition: 'all 0.2s', flexShrink: 0 }} />
                        ))}
                      </div>
                    )}

                    {/* Card body */}
                    <div className="card-body">
                      <div className="product-name">
                        <span style={{ color: 'var(--yellow)', fontSize: '0.75rem', fontWeight: 600 }}>NAME &nbsp;</span>
                        <span>{p.name}</span>
                      </div>
                      <div className="product-description">
                        <span style={{ color: 'var(--yellow)', fontSize: '0.75rem', fontWeight: 600 }}>DESCRIPTION &nbsp;</span>
                        <span>{p.description}</span>
                      </div>
                      <div className="product-meta"><span className="meta-label">Category:</span><span className="meta-val">{p.category}</span></div>
                      <div className="product-meta"><span className="meta-label">Stock:</span><span className="meta-val">{p.stock} units</span></div>

                      <div className="price-tag">
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', verticalAlign: 'middle', marginRight: 4 }}>Price</span>
                        <sup>₹</sup>{p.price}
                        {p.mrp && p.mrp > p.price && (
                          <>
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', textDecoration: 'line-through', color: 'var(--text-dim)' }}>₹{p.mrp}</span>
                            <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>-{Math.round((1 - p.price/p.mrp)*100)}%</span>
                          </>
                        )}
                      </div>

                      <hr className="card-divider" />

                      {/* Rating */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem' }}>
                        {p.reviewCount > 0 ? (
                          <>
                            <span className="avg-rating-badge"><i className="fas fa-star" style={{ fontSize: '0.68rem' }} />{Number(p.avgRating || 0).toFixed(1)}</span>
                            <StarRow avg={p.avgRating || 0} />
                            <span style={{ color: 'var(--text-dim)' }}>({p.reviewCount} review{p.reviewCount !== 1 ? 's' : ''})</span>
                          </>
                        ) : (
                          <>
                            <StarRow avg={0} />
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>No reviews yet</span>
                          </>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--yellow)', opacity: 0.7 }}>
                          <i className="fas fa-chevron-right" /> View all
                        </span>
                      </div>

                      {/* Add to Cart */}
                      <button className="btn-add-cart" onClick={e => handleAddToCart(e, p.id)}>
                        <i className="fas fa-cart-plus" /> Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="home-footer">
        <div className="footer-brand">Ek<span>art</span></div>
        <div className="footer-copy">© 2026 Ekart. All rights reserved.</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/policies" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textDecoration: 'none' }}>Policies & SOPs</Link>
          <a href="#" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textDecoration: 'none' }}>Privacy</a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textDecoration: 'none' }}>Terms</a>
        </div>
      </footer>

      {/* ── CART POPUP ── */}
      {cartPopupShown && !cartPopupDismissed && cartCount > 0 && (
        <div className="cart-popup-overlay show">
          <div className="cart-popup-box">
            <button className="popup-close" onClick={() => setCartPopupDismissed(true)}>✕</button>
            <div className="popup-cart-icon">🛒</div>
            <h4>You left something behind!</h4>
            <p>You have <strong style={{ color: 'var(--yellow)' }}>{cartCount}</strong> item{cartCount > 1 ? 's' : ''} waiting in your cart.</p>
            <Link to="/cart" className="btn-popup-checkout"><i className="fas fa-shopping-cart" /> View My Cart</Link>
            <button className="btn-popup-dismiss" onClick={() => setCartPopupDismissed(true)}>No thanks, I'll shop later</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────
const HOME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  :root {
    --yellow: #f5a800; --yellow-d: #d48f00;
    --glass-border: rgba(255,255,255,0.22); --glass-card: rgba(255,255,255,0.13);
    --text-white: #fff; --text-light: rgba(255,255,255,0.80); --text-dim: rgba(255,255,255,0.50);
  }
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Poppins', sans-serif; }

  /* BG */
  .bg-layer { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
  .bg-layer::before { content:''; position:absolute; inset:-20px; background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat; filter:blur(6px); transform:scale(1.08); }
  .bg-layer::after  { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%); }

  /* NAV */
  .ekart-home-nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:0.75rem 2rem; display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.25); backdrop-filter:blur(14px); border-bottom:1px solid var(--glass-border); transition:background 0.3s; gap:1rem; }
  .ekart-home-nav.scrolled { background:rgba(0,0,0,0.5); }
  .hamburger-btn { display:flex; flex-direction:column; justify-content:center; gap:5px; width:36px; height:36px; cursor:pointer; background:none; border:none; padding:6px; flex-shrink:0; border-radius:8px; transition:background 0.2s; }
  .hamburger-btn:hover { background:rgba(255,255,255,0.1); }
  .hamburger-btn span { display:block; width:20px; height:2px; background:white; border-radius:2px; transition:all 0.3s; }
  .nav-brand { font-size:1.6rem; font-weight:700; color:white; text-decoration:none; letter-spacing:0.04em; display:flex; align-items:center; gap:0.45rem; flex-shrink:0; }
  .nav-brand span { color:var(--yellow); }
  .nav-search { flex:1; max-width:400px; position:relative; }
  .nav-search input { width:100%; background:rgba(255,255,255,0.08); border:1px solid var(--glass-border); border-radius:50px; color:white; font-family:'Poppins',sans-serif; font-size:0.82rem; padding:0.5rem 1rem 0.5rem 2.4rem; transition:all 0.25s; outline:none; }
  .nav-search input::placeholder { color:var(--text-dim); }
  .nav-search input:focus { border-color:rgba(245,168,0,0.5); background:rgba(255,255,255,0.12); }
  .nav-search input.nav-dropdown-open { border-radius:50px 50px 12px 12px; border-bottom-color:transparent; }
  .nav-search-icon { position:absolute; left:0.85rem; top:50%; transform:translateY(-50%); color:var(--text-dim); font-size:0.78rem; pointer-events:none; z-index:2; }
  .nav-autocomplete-dropdown { position:absolute; top:100%; left:0; right:0; background:rgba(8,10,24,0.98); backdrop-filter:blur(24px); border:1px solid var(--glass-border); border-top:1px solid rgba(245,168,0,0.25); border-radius:0 0 16px 16px; z-index:9999; box-shadow:0 16px 40px rgba(0,0,0,0.5); animation:navDropOpen 0.15s ease both; }
  @keyframes navDropOpen { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  .nav-ac-list { list-style:none; margin:0; padding:5px 0; max-height:320px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(245,168,0,0.3) transparent; }
  .nav-ac-item { display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; transition:background 0.1s; border-bottom:1px solid rgba(255,255,255,0.04); font-size:0.8rem; }
  .nav-ac-item:last-child { border-bottom:none; }
  .nav-ac-item:hover, .nav-ac-item.active { background:rgba(245,168,0,0.08); }
  .nav-ac-thumb { width:34px; height:34px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.1); flex-shrink:0; }
  .nav-ac-thumb-ph { width:34px; height:34px; border-radius:6px; background:rgba(245,168,0,0.1); border:1px solid rgba(245,168,0,0.2); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .nav-ac-text { flex:1; min-width:0; }
  .nav-ac-name { color:white; font-weight:500; font-size:0.8rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .nav-ac-cat { font-size:0.66rem; color:var(--yellow); opacity:0.8; margin-top:1px; }
  .nav-ac-badge { font-size:0.58rem; background:rgba(255,96,96,0.2); color:#ff8080; border:1px solid rgba(255,96,96,0.3); padding:2px 6px; border-radius:20px; font-weight:600; flex-shrink:0; }
  .nav-ac-loading, .nav-ac-empty { padding:12px 14px; font-size:0.75rem; color:var(--text-dim); display:flex; align-items:center; gap:7px; }
  @keyframes navSpin { to { transform:rotate(360deg); } }
  .nav-history-header { display:flex; align-items:center; justify-content:space-between; padding:7px 14px 3px; font-size:0.64rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:rgba(255,255,255,0.3); }
  .nav-history-clear { background:none; border:none; cursor:pointer; color:rgba(245,168,0,0.65); font-size:0.64rem; font-family:'Poppins',sans-serif; font-weight:600; padding:0; transition:color 0.15s; }
  .nav-history-clear:hover { color:var(--yellow); }
  .nav-history-item { display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; transition:background 0.1s; border-bottom:1px solid rgba(255,255,255,0.04); font-size:0.8rem; }
  .nav-history-item:hover, .nav-history-item.active { background:rgba(245,168,0,0.07); }
  .nav-history-icon { color:rgba(255,255,255,0.28); font-size:0.72rem; flex-shrink:0; width:13px; text-align:center; }
  .nav-history-text { flex:1; color:rgba(255,255,255,0.72); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .nav-history-remove { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.18); font-size:0.7rem; padding:0 2px; transition:color 0.15s; flex-shrink:0; }
  .nav-history-remove:hover { color:rgba(255,100,80,0.65); }
  .nav-right { display:flex; align-items:center; gap:0.5rem; flex-shrink:0; }
  .india-flag-badge { display:flex; align-items:center; gap:0.4rem; padding:0.3rem 0.65rem 0.3rem 0.5rem; border-radius:20px; border:1px solid rgba(255,153,51,0.45); background:rgba(255,153,51,0.08); font-size:0.72rem; font-weight:600; color:rgba(255,255,255,0.85); letter-spacing:0.03em; flex-shrink:0; user-select:none; }
  .nav-link { display:flex; align-items:center; gap:0.35rem; color:var(--text-light); text-decoration:none; font-size:0.78rem; font-weight:500; padding:0.42rem 0.75rem; border-radius:6px; border:1px solid transparent; transition:all 0.2s; white-space:nowrap; }
  .nav-link:hover { color:white; background:rgba(255,255,255,0.1); border-color:var(--glass-border); }
  .nav-link.cart-link { border-color:var(--glass-border); }
  .cart-badge { position:absolute; top:-4px; right:-4px; background:var(--yellow); color:#1a1000; font-size:0.58rem; font-weight:800; width:15px; height:15px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .nav-link.wishlist-link { border-color:rgba(239,68,68,0.3); }
  .nav-link.wishlist-link i { color:#ef4444; }
  .nav-link.wishlist-link:hover { border-color:rgba(239,68,68,0.6); background:rgba(239,68,68,0.08); }
  .profile-icon-btn { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#f5a800; font-size:1.2rem; transition:background 0.2s, border-color 0.2s; }
  .profile-icon-btn:hover { background:rgba(245,168,0,0.12); border-color:rgba(245,168,0,0.4); }
  .profile-dropdown { display:none; position:absolute; top:calc(100% + 10px); right:0; background:#1a1208; border:1px solid rgba(245,168,0,0.25); border-radius:14px; min-width:180px; box-shadow:0 16px 40px rgba(0,0,0,0.5); z-index:999; overflow:hidden; animation:dropFadeIn 0.15s ease; }
  @keyframes dropFadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  .profile-dropdown.open { display:block; }
  .profile-dropdown-name { padding:0.75rem 1rem; font-size:0.82rem; color:#aaa; border-bottom:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; gap:0.5rem; }
  .profile-dropdown-item { display:flex; align-items:center; gap:0.6rem; padding:0.7rem 1rem; color:#ccc; font-size:0.88rem; text-decoration:none; transition:background 0.15s,color 0.15s; cursor:pointer; }
  .profile-dropdown-item:hover { background:rgba(255,255,255,0.06); color:#fff; }

  /* DRAWER */
  .drawer-overlay { position:fixed; inset:0; z-index:999; background:rgba(0,0,0,0.6); opacity:0; pointer-events:none; transition:opacity 0.3s; }
  .drawer-overlay.open { opacity:1; pointer-events:all; }
  .side-drawer { position:fixed; top:0; left:0; bottom:0; width:300px; max-width:85vw; background:#131921; z-index:1000; transform:translateX(-100%); transition:transform 0.3s cubic-bezier(0.4,0,0.2,1); display:flex; flex-direction:column; overflow:hidden; }
  .side-drawer.open { transform:translateX(0); }
  .drawer-header { display:flex; align-items:center; justify-content:space-between; padding:0.9rem 1.1rem; background:#232f3e; flex-shrink:0; }
  .drawer-header-name { display:flex; align-items:center; gap:0.6rem; font-size:0.92rem; font-weight:700; color:white; }
  .drawer-close { width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.1); border:none; color:white; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s; }
  .drawer-close:hover { background:rgba(255,255,255,0.2); }
  .drawer-body { flex:1; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.15) transparent; }
  .drawer-section-title { padding:0.85rem 1.1rem 0.4rem; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.5); border-top:1px solid rgba(255,255,255,0.08); margin-top:0.2rem; }
  .drawer-item { display:flex; align-items:center; justify-content:space-between; padding:0.65rem 1.1rem; color:rgba(255,255,255,0.88); text-decoration:none; font-size:0.875rem; transition:background 0.15s; cursor:pointer; border:none; background:none; width:100%; text-align:left; }
  .drawer-item:hover { background:rgba(255,255,255,0.07); color:white; }
  .drawer-item-left { display:flex; align-items:center; gap:0.7rem; }
  .drawer-item-left i { width:18px; text-align:center; color:rgba(255,255,255,0.5); font-size:0.85rem; flex-shrink:0; }
  .drawer-item-arrow { color:rgba(255,255,255,0.3); font-size:0.75rem; }
  .drawer-submenu { background:rgba(0,0,0,0.25); overflow:hidden; transition:max-height 0.3s ease; }
  .drawer-subitem { display:flex; align-items:center; gap:0.6rem; padding:0.55rem 1.1rem 0.55rem 2.9rem; color:rgba(255,255,255,0.7); text-decoration:none; font-size:0.82rem; transition:background 0.15s; }
  .drawer-subitem:hover { background:rgba(255,255,255,0.06); color:white; }
  .drawer-subitem-emoji { font-size:0.9rem; }
  .drawer-footer { padding:0.75rem 1.1rem; border-top:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2); flex-shrink:0; }
  .drawer-footer-link { display:flex; align-items:center; gap:0.6rem; color:rgba(255,255,255,0.6); text-decoration:none; font-size:0.8rem; padding:0.4rem 0; transition:color 0.15s; }
  .drawer-footer-link:hover { color:white; }

  /* LOC BAR */
  .loc-bar { position:fixed; top:56px; left:0; right:0; z-index:99; background:rgba(8,10,24,0.96); backdrop-filter:blur(14px); border-bottom:1px solid rgba(245,168,0,0.18); display:flex; align-items:center; justify-content:center; padding:0.45rem 2rem; gap:0.6rem; font-size:0.78rem; color:var(--text-dim); }
  .loc-pill { display:inline-flex; align-items:center; gap:0.4rem; background:rgba(245,168,0,0.1); border:1px solid rgba(245,168,0,0.3); border-radius:50px; padding:0.25rem 0.85rem; cursor:pointer; color:var(--yellow); font-weight:600; font-size:0.78rem; transition:all 0.2s; white-space:nowrap; }
  .loc-pill:hover { background:rgba(245,168,0,0.2); border-color:rgba(245,168,0,0.6); }
  .loc-dot { width:7px; height:7px; border-radius:50%; background:#22c55e; flex-shrink:0; box-shadow:0 0 6px #22c55e; animation:pulseDot 2s ease-in-out infinite; }
  .loc-dot.unset { background:#f59e0b; box-shadow:0 0 6px #f59e0b; animation:none; }
  @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .loc-bar-hint { font-size:0.7rem; color:var(--text-dim); }
  .loc-modal-overlay { display:none; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); align-items:center; justify-content:center; }
  .loc-modal-overlay.open { display:flex; }
  .loc-modal { background:rgba(10,12,28,0.98); backdrop-filter:blur(20px); border:1px solid rgba(245,168,0,0.25); border-radius:22px; padding:2rem 2.25rem; width:90%; max-width:420px; box-shadow:0 30px 80px rgba(0,0,0,0.6); animation:popIn 0.3s cubic-bezier(0.23,1,0.32,1) both; }
  .loc-modal-title { font-size:1.1rem; font-weight:700; margin-bottom:0.3rem; display:flex; align-items:center; gap:0.5rem; }
  .loc-modal-sub { font-size:0.78rem; color:var(--text-dim); margin-bottom:1.5rem; }
  .loc-input-row { display:flex; gap:0.5rem; }
  .loc-pin-input { flex:1; background:rgba(255,255,255,0.07); border:1px solid var(--glass-border); border-radius:10px; color:white; font-family:'Poppins',sans-serif; font-size:0.88rem; padding:0.7rem 1rem; outline:none; transition:border-color 0.3s; letter-spacing:0.08em; }
  .loc-pin-input:focus { border-color:var(--yellow); }
  .loc-pin-input::placeholder { color:var(--text-dim); letter-spacing:0; }
  .loc-confirm-btn { background:var(--yellow); color:#1a1000; border:none; border-radius:10px; padding:0.7rem 1.25rem; font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
  .loc-confirm-btn:hover { background:var(--yellow-d); }
  .loc-error { font-size:0.72rem; color:#ff8060; margin-top:0.45rem; }
  .loc-clear-link { display:block; text-align:center; margin-top:1rem; font-size:0.72rem; color:var(--text-dim); cursor:pointer; transition:color 0.2s; }
  .loc-clear-link:hover { color:#ff8060; }

  /* PAGE */
  .page { flex:1; padding:8.5rem 2rem 3rem; max-width:1400px; margin:0 auto; width:100%; display:flex; flex-direction:column; gap:1.5rem; }

  /* BANNER */
  .banner-carousel { position:relative; width:100%; border-radius:20px; overflow:hidden; aspect-ratio:16/5; background:#0d1a3a; animation:fadeUp 0.4s ease both; box-shadow:0 8px 40px rgba(0,0,0,0.4); }
  .banner-track { display:flex; height:100%; transition:transform 0.55s cubic-bezier(0.77,0,0.18,1); will-change:transform; }
  .banner-slide { min-width:100%; height:100%; position:relative; flex-shrink:0; }
  .banner-slide img { width:100%; height:100%; object-fit:cover; display:block; }
  .banner-slide::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(5,8,20,0.72) 0%,rgba(5,8,20,0.35) 50%,rgba(5,8,20,0.10) 100%); pointer-events:none; }
  .banner-text { position:absolute; top:50%; left:5%; transform:translateY(-50%); z-index:2; max-width:55%; }
  .banner-text h2 { font-size:clamp(1rem,2.5vw,1.9rem); font-weight:800; color:#fff; line-height:1.25; margin-bottom:0.4rem; text-shadow:0 2px 12px rgba(0,0,0,0.5); }
  .banner-text p { font-size:clamp(0.65rem,1.3vw,0.9rem); color:rgba(255,255,255,0.78); line-height:1.5; }
  .banner-arrow { position:absolute; top:50%; transform:translateY(-50%); z-index:10; background:rgba(0,0,0,0.42); border:none; cursor:pointer; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.9rem; transition:background 0.2s,transform 0.2s; backdrop-filter:blur(6px); }
  .banner-arrow:hover { background:rgba(245,168,0,0.7); transform:translateY(-50%) scale(1.1); }
  .banner-prev { left:12px; } .banner-next { right:12px; }
  .banner-dots { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:10; }
  .banner-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.35); border:none; cursor:pointer; padding:0; transition:background 0.25s,transform 0.25s; }
  .banner-dot.active { background:var(--yellow); transform:scale(1.3); }

  /* WELCOME STRIP */
  .welcome-strip { background:var(--glass-card); backdrop-filter:blur(18px); border:1px solid var(--glass-border); border-radius:16px; padding:1.25rem 2rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; }
  .welcome-strip h1 { font-size:clamp(1rem,2vw,1.3rem); font-weight:700; }
  .welcome-strip h1 span { color:var(--yellow); }
  .welcome-strip p { font-size:0.78rem; color:var(--text-dim); margin-top:0.15rem; }

  /* CATEGORIES */
  .cat-section { animation:fadeUp 0.45s 0.05s ease both; }
  .cat-section-header { display:flex; align-items:center; gap:0.5rem; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--yellow); margin-bottom:1rem; }
  .cat-section-header::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.1); }
  .cat-scroll-wrap { position:relative; }
  .cat-grid { display:flex; flex-direction:row; gap:0.65rem; overflow-x:auto; scroll-behavior:smooth; padding:4px 2px 10px; scrollbar-width:none; -ms-overflow-style:none; }
  .cat-grid::-webkit-scrollbar { display:none; }
  .cat-card { background:var(--glass-card); border:1px solid var(--glass-border); border-radius:16px; padding:1rem 0.6rem 0.875rem; display:flex; flex-direction:column; align-items:center; gap:0.5rem; cursor:pointer; text-decoration:none; transition:all 0.25s cubic-bezier(0.23,1,0.32,1); position:relative; overflow:hidden; flex-shrink:0; min-width:100px; }
  .cat-card:hover { transform:translateY(-4px); border-color:rgba(245,168,0,0.5); box-shadow:0 8px 24px rgba(0,0,0,0.3); }
  .cat-card.active-cat { border-color:var(--yellow); background:rgba(245,168,0,0.1); }
  .cat-card.cat-all { border-color:rgba(245,168,0,0.3); }
  .cat-card.cat-all .cat-icon { background:rgba(245,168,0,0.12); }
  .cat-card.cat-all .cat-name { color:var(--yellow); }
  .cat-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); flex-shrink:0; }
  .cat-name { font-size:0.72rem; font-weight:600; color:var(--text-light); text-align:center; line-height:1.3; word-break:break-word; }
  .cat-count { font-size:0.62rem; color:var(--text-dim); }
  .subcat-row { background:var(--glass-card); border:1px solid var(--glass-border); border-radius:14px; padding:0.75rem 1rem; animation:fadeUp 0.25s ease both; }
  .subcat-label { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--yellow); margin-bottom:0.6rem; }
  .subcat-grid { display:flex; flex-wrap:wrap; gap:0.5rem; }
  .subcat-chip { padding:0.35rem 0.9rem; border-radius:50px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.05); font-size:0.74rem; font-weight:500; color:var(--text-light); cursor:pointer; transition:all 0.2s; white-space:nowrap; }
  .subcat-chip:hover { border-color:rgba(245,168,0,0.5); color:var(--yellow); }
  .subcat-chip.active-sub { background:rgba(245,168,0,0.15); border-color:var(--yellow); color:var(--yellow); font-weight:700; }

  /* BUDGET */
  .budget-bar { background:var(--glass-card); backdrop-filter:blur(18px); border:1px solid var(--glass-border); border-radius:16px; padding:1.1rem 2rem; display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap; }
  .budget-label { font-size:0.8rem; font-weight:600; color:var(--yellow); display:flex; align-items:center; gap:0.4rem; white-space:nowrap; }
  .budget-value { font-size:0.82rem; font-weight:700; color:white; white-space:nowrap; }
  .budget-count { font-size:0.72rem; color:var(--text-dim); white-space:nowrap; }
  .btn-reset { background:none; border:1px solid var(--glass-border); color:var(--text-dim); border-radius:6px; padding:0.35rem 0.75rem; cursor:pointer; font-family:'Poppins',sans-serif; font-size:0.72rem; transition:all 0.2s; white-space:nowrap; }
  .btn-reset:hover { color:white; border-color:rgba(255,255,255,0.4); }

  /* SEARCH BANNER */
  .search-results-banner { display:none; align-items:center; gap:0.75rem; flex-wrap:wrap; background:rgba(245,168,0,0.08); border:1px solid rgba(245,168,0,0.3); border-radius:14px; padding:0.85rem 1.4rem; animation:fadeUp 0.3s ease both; }
  .search-results-banner.show { display:flex; }
  .srb-label { font-size:0.82rem; color:var(--text-dim); }
  .srb-query { font-size:0.9rem; font-weight:700; color:var(--yellow); }
  .srb-count { font-size:0.75rem; color:var(--text-dim); }
  .srb-clear { margin-left:auto; background:none; border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:var(--text-light); font-family:'Poppins',sans-serif; font-size:0.72rem; padding:0.3rem 0.75rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
  .srb-clear:hover { border-color:rgba(255,255,255,0.4); color:white; }

  /* SORT BAR */
  .sort-filter-bar { display:flex; align-items:center; justify-content:space-between; gap:0.75rem; flex-wrap:wrap; padding:0.6rem 0.85rem; background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); border-radius:12px; }
  .sort-filter-left { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
  .sort-filter-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-dim); white-space:nowrap; }
  .sort-btn { background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:20px; color:var(--text-light); font-family:'Poppins',sans-serif; font-size:0.75rem; font-weight:500; padding:0.3rem 0.75rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
  .sort-btn:hover { border-color:rgba(245,168,0,0.4); color:var(--yellow); }
  .sort-btn.active { background:rgba(245,168,0,0.12); border-color:var(--yellow); color:var(--yellow); font-weight:600; }
  .sort-result-count { font-size:0.72rem; color:var(--text-dim); white-space:nowrap; margin-left:auto; }

  /* PRODUCT GRID */
  .product-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:1.5rem; }
  .empty-state { grid-column:1/-1; text-align:center; padding:5rem 2rem; color:var(--text-dim); }
  .empty-state i { font-size:3.5rem; margin-bottom:1rem; opacity:0.4; display:block; }
  .empty-state h3 { font-size:1.2rem; color:var(--text-light); margin-bottom:0.5rem; }

  /* PRODUCT CARD */
  .product-card-wrapper { transition:opacity 0.4s,transform 0.4s,filter 0.4s; }
  .product-card { background:var(--glass-card); backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:22px; overflow:hidden; display:flex; flex-direction:column; transition:all 0.3s cubic-bezier(0.23,1,0.32,1); animation:fadeUp 0.6s ease both; position:relative; height:100%; }
  .product-card:hover { transform:translateY(-8px); border-color:rgba(245,168,0,0.45); box-shadow:0 25px 55px rgba(0,0,0,0.35); }
  .img-area { position:relative; height:220px; overflow:hidden; flex-shrink:0; }
  .card-image { width:100%; height:100%; object-fit:cover; transition:transform 0.5s; }
  .product-card:hover .card-image { transform:scale(1.07); }
  .category-pill { position:absolute; top:12px; left:12px; background:rgba(0,0,0,0.55); backdrop-filter:blur(8px); border:1px solid var(--glass-border); color:var(--yellow); font-size:0.62rem; font-weight:700; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.06em; }
  .btn-wishlist { position:absolute; top:12px; right:55px; width:34px; height:34px; background:rgba(0,0,0,0.55); backdrop-filter:blur(8px); border:1px solid var(--glass-border); border-radius:50%; color:var(--text-dim); font-size:0.95rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.3s; z-index:15; }
  .btn-wishlist:hover { background:rgba(239,68,68,0.2); color:#ef4444; border-color:rgba(239,68,68,0.4); transform:scale(1.1); }
  .btn-wishlist.active { background:rgba(239,68,68,0.9); color:white; border-color:#ef4444; }
  .budget-badge { position:absolute; top:12px; right:12px; background:linear-gradient(135deg,#22c55e,#16a34a); color:white; font-size:0.65rem; font-weight:800; padding:4px 12px; border-radius:50px; z-index:10; box-shadow:0 4px 12px rgba(34,197,94,0.4); }
  .media-tray { background:rgba(0,0,0,0.3); padding:7px 10px; display:flex; gap:7px; overflow-x:auto; scrollbar-width:thin; scrollbar-color:var(--yellow) transparent; }
  .card-body { padding:1.25rem; display:flex; flex-direction:column; gap:0.6rem; flex:1; }
  .product-name { font-size:0.95rem; font-weight:700; color:white; line-height:1.3; }
  .product-description { font-size:0.75rem; color:var(--text-dim); line-height:1.55; }
  .product-meta { display:flex; align-items:center; gap:0.5rem; font-size:0.75rem; }
  .meta-label { font-weight:700; color:var(--yellow); }
  .meta-val { color:white; }
  .price-tag { font-size:1.55rem; font-weight:800; color:var(--yellow); margin-top:0.15rem; }
  .price-tag sup { font-size:0.85rem; font-weight:700; vertical-align:super; }
  .card-divider { border:none; border-top:1px solid var(--glass-border); margin:0.2rem 0; }
  .avg-rating-badge { display:inline-flex; align-items:center; gap:3px; background:rgba(245,168,0,0.15); border:1px solid rgba(245,168,0,0.35); color:var(--yellow); font-size:0.72rem; font-weight:700; padding:1px 6px; border-radius:20px; line-height:1.4; }
  .btn-add-cart { display:flex; align-items:center; justify-content:center; gap:0.5rem; background:var(--yellow); color:#1a1000; border:none; border-radius:13px; padding:0.8rem; font-family:'Poppins',sans-serif; font-size:0.82rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; cursor:pointer; transition:all 0.3s cubic-bezier(0.23,1,0.32,1); box-shadow:0 6px 20px rgba(245,168,0,0.25); margin-top:auto; }
  .btn-add-cart:hover { background:var(--yellow-d); transform:translateY(-2px); box-shadow:0 10px 28px rgba(245,168,0,0.42); }
  .pin-unavailable .product-card { filter:grayscale(1) brightness(0.55); pointer-events:none; }
  .pin-unavail-overlay { display:flex; position:absolute; inset:0; z-index:20; border-radius:22px; background:rgba(5,7,18,0.55); align-items:center; justify-content:center; flex-direction:column; gap:0.4rem; pointer-events:none; }
  .pin-unavail-badge { background:rgba(10,12,28,0.92); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.15); border-radius:50px; padding:0.5rem 1.25rem; font-size:0.78rem; font-weight:700; color:rgba(255,255,255,0.7); display:flex; align-items:center; gap:0.4rem; letter-spacing:0.03em; }
  .pin-unavail-badge i { color:#f59e0b; font-size:0.8rem; }
  .pin-unavail-sub { font-size:0.65rem; color:rgba(255,255,255,0.35); letter-spacing:0.04em; }

  /* CART POPUP */
  .cart-popup-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:9999; justify-content:center; align-items:center; }
  .cart-popup-overlay.show { display:flex; }
  .cart-popup-box { background:rgba(15,18,40,0.95); backdrop-filter:blur(24px); border:1px solid var(--glass-border); border-radius:24px; padding:2.5rem 2.5rem 2rem; max-width:380px; width:90%; text-align:center; box-shadow:0 30px 80px rgba(0,0,0,0.6); position:relative; animation:popIn 0.35s cubic-bezier(0.23,1,0.32,1) both; }
  .popup-close { position:absolute; top:1rem; right:1.25rem; background:none; border:none; color:var(--text-dim); font-size:1.2rem; cursor:pointer; transition:color 0.2s; }
  .popup-close:hover { color:white; }
  .popup-cart-icon { font-size:2.75rem; margin-bottom:0.9rem; animation:bounce 1.2s ease-in-out infinite; display:block; }
  .cart-popup-box h4 { font-size:1.2rem; font-weight:700; color:white; margin-bottom:0.5rem; }
  .cart-popup-box p { font-size:0.82rem; color:var(--text-dim); line-height:1.65; margin-bottom:1.5rem; }
  .btn-popup-checkout { background:var(--yellow); color:#1a1000; text-decoration:none; border:none; padding:0.75rem 1.75rem; border-radius:50px; font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.3s; display:inline-flex; align-items:center; gap:0.5rem; box-shadow:0 6px 24px rgba(245,168,0,0.35); }
  .btn-popup-checkout:hover { background:var(--yellow-d); transform:translateY(-2px); color:#1a1000; text-decoration:none; }
  .btn-popup-dismiss { display:block; width:100%; background:none; border:none; font-family:'Poppins',sans-serif; font-size:0.75rem; color:var(--text-dim); margin-top:0.75rem; cursor:pointer; transition:color 0.2s; }
  .btn-popup-dismiss:hover { color:var(--text-light); }

  /* FOOTER */
  .home-footer { background:rgba(0,0,0,0.5); backdrop-filter:blur(16px); border-top:1px solid var(--glass-border); padding:1.1rem 2rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
  .footer-brand { font-size:1rem; font-weight:700; color:white; }
  .footer-brand span { color:var(--yellow); }
  .footer-copy { font-size:0.7rem; color:var(--text-dim); }

  /* ANIMATIONS */
  @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideInRight { from{opacity:0;transform:translateX(100px)} to{opacity:1;transform:translateX(0)} }
  @keyframes popIn { from{opacity:0;transform:scale(0.85) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
  @keyframes shimmer { 0%{opacity:0.4} 50%{opacity:0.7} 100%{opacity:0.4} }

  /* RESPONSIVE */
  @media(max-width:900px) {
    .ekart-home-nav { padding:0.7rem 1rem; flex-wrap:wrap; }
    .nav-search { order:3; max-width:100%; flex-basis:100%; }
    .page { padding:10.5rem 1rem 2rem; }
    .home-footer { padding:1rem; flex-direction:column; text-align:center; }
  }
  @media(max-width:640px) {
    .product-grid { grid-template-columns:1fr; }
    .nav-link span { display:none; }
    .nav-link { padding:0.42rem 0.55rem; }
    .banner-carousel { aspect-ratio:16/7; border-radius:14px; }
  }
`;
