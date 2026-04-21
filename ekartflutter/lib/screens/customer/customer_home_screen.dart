// import 'dart:async';
// import 'package:flutter/material.dart';
// import '../../models/product_model.dart';
// import '../../services/services.dart';
// import '../../services/auth_service.dart';
// import '../../widgets/pin_detector_bar.dart';
// import '../login_screen.dart';
// import 'cart_screen.dart';
// import 'orders_screen.dart';
// import 'product_detail_screen.dart';
// import 'wishlist_screen.dart';
// import 'profile_screen.dart';
// import 'spending_screen.dart';

// class CustomerHomeScreen extends StatefulWidget {
//   const CustomerHomeScreen({super.key});
//   @override
//   State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
// }

// class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
//   List<Product>              products          = [];
//   List<String>               categories        = [];
//   List<Map<String, dynamic>> banners           = [];
//   String                     selectedCategory  = '';
//   String                     searchQuery       = '';
//   bool                       loading           = true;

//   // ── Budget / Sort filter ────────────────────────────────────────────────────
//   double?  _minPrice;
//   double?  _maxPrice;
//   String   _sortBy     = 'default';   // 'default' | 'price_asc' | 'price_desc' | 'name'
//   bool     _filterActive = false;     // true when any price/sort filter is applied
//   int                        cartCount         = 0;
//   int                        _currentIndex     = 0;
//   Set<int>                   wishlistIds       = {};
//   final Set<int>             _togglingWishlist = {};
//   final List<int>            _recentIds        = [];

//   // ── Location / PIN ─────────────────────────────────────────────────────────
//   // Mirrors the website's "user PIN" stored in localStorage / page state.
//   // Null = no PIN set yet (auto-detection in progress or user hasn't set it).
//   String? _userPin;

//   // Search
//   final searchCtrl              = TextEditingController();
//   final FocusNode  _searchFocus = FocusNode();
//   List<String>     _suggestions      = [];
//   String           _fuzzySuggestion  = '';
//   bool             _showSuggestions  = false;
//   Timer?           _debounce;
//   bool             _loadingSuggestions = false;
//   final Map<String, List<String>> _suggestionCache = {};
//   final Map<String, String>       _fuzzyCache      = {};

//   // Overlay for suggestions (floats above all widgets — no overlap)
//   OverlayEntry? _overlayEntry;
//   final LayerLink _layerLink = LayerLink();
//   final GlobalKey _searchKey = GlobalKey();

//   // Banner
//   late PageController _bannerCtrl;
//   int    _bannerPage = 0;
//   Timer? _bannerTimer;

//   // Scroll-to-top
//   final ScrollController _homeScroll = ScrollController();

//   @override
//   void initState() {
//     super.initState();
//     _bannerCtrl = PageController();
//     _loadData(showSkeleton: true);
//     _searchFocus.addListener(_onFocusChange);
//   }

//   @override
//   void dispose() {
//     _removeOverlay();
//     searchCtrl.dispose();
//     _searchFocus.dispose();
//     _bannerCtrl.dispose();
//     _homeScroll.dispose();
//     _bannerTimer?.cancel();
//     _debounce?.cancel();
//     super.dispose();
//   }

//   void _onFocusChange() {
//     if (!_searchFocus.hasFocus) {
//       _removeOverlay();
//       setState(() => _showSuggestions = false);
//     }
//   }

//   // ── Overlay management ───────────────────────────────────────────────────
//   void _removeOverlay() {
//     _overlayEntry?.remove();
//     _overlayEntry = null;
//   }

//   void _buildAndShowOverlay() {
//     _removeOverlay();
//     if (_suggestions.isEmpty) return;

//     _overlayEntry = OverlayEntry(
//       builder: (context) => Positioned(
//         width: _getSearchBarWidth(),
//         child: CompositedTransformFollower(
//           link: _layerLink,
//           showWhenUnlinked: false,
//           offset: const Offset(0, 58),
//           child: Material(
//             elevation: 8,
//             borderRadius: BorderRadius.circular(8),
//             shadowColor: Colors.black26,
//             child: Container(
//               constraints: const BoxConstraints(maxHeight: 220),
//               decoration: BoxDecoration(
//                 color: Colors.white,
//                 borderRadius: BorderRadius.circular(8),
//                 border: Border.all(color: Colors.grey.shade200),
//               ),
//               child: ListView.separated(
//                 shrinkWrap: true,
//                 padding: EdgeInsets.zero,
//                 itemCount: _suggestions.length,
//                 separatorBuilder: (_, __) =>
//                     Divider(height: 1, color: Colors.grey.shade100),
//                 itemBuilder: (_, i) {
//                   final s = _suggestions[i];
//                   return ListTile(
//                     dense: true,
//                     leading: Icon(Icons.search, size: 18, color: Colors.grey.shade500),
//                     title: _highlightMatch(s, searchCtrl.text),
//                     trailing: IconButton(
//                       icon: Icon(Icons.north_west, size: 14, color: Colors.grey.shade400),
//                       onPressed: () {
//                         searchCtrl.text = s;
//                         searchCtrl.selection = TextSelection.fromPosition(
//                             TextPosition(offset: s.length));
//                         _removeOverlay();
//                         setState(() => _showSuggestions = false);
//                       },
//                     ),
//                     onTap: () => _submitSearch(s),
//                   );
//                 },
//               ),
//             ),
//           ),
//         ),
//       ),
//     );

//     Overlay.of(context).insert(_overlayEntry!);
//   }

//   double _getSearchBarWidth() {
//     final RenderBox? box =
//         _searchKey.currentContext?.findRenderObject() as RenderBox?;
//     return box?.size.width ?? (MediaQuery.of(context).size.width - 24);
//   }

//   void _startBannerAutoScroll() {
//     _bannerTimer?.cancel();
//     if (banners.length <= 1) return;
//     _bannerTimer = Timer.periodic(const Duration(seconds: 4), (_) {
//       if (!_bannerCtrl.hasClients) return;
//       final next = (_bannerPage + 1) % banners.length;
//       _bannerCtrl.animateToPage(next,
//           duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
//     });
//   }

//   Future<void> _loadData({bool showSkeleton = false}) async {
//     if (showSkeleton) setState(() => loading = true);
//     final results = await Future.wait([
//       ProductService.getProducts(
//         search:    searchQuery.isNotEmpty      ? searchQuery      : null,
//         category:  selectedCategory.isNotEmpty ? selectedCategory : null,
//         minPrice:  _minPrice,
//         maxPrice:  _maxPrice,
//         sortBy:    _sortBy != 'default'        ? _sortBy          : null,
//       ),
//       ProductService.getCategories(),
//       CartService.getCart(),
//       WishlistService.getWishlistIds(),
//       BannerService.getBanners(),
//     ]);
//     if (!mounted) return;
//     setState(() {
//       products    = results[0] as List<Product>;
//       final cats  = results[1] as List<String>;
//       if (cats.isNotEmpty) categories = ['All', ...cats];
//       cartCount   = ((results[2] as Map)['count'] ?? 0) as int;
//       wishlistIds = results[3] as Set<int>;
//       banners     = results[4] as List<Map<String, dynamic>>;
//       loading     = false;
//     });
//     _startBannerAutoScroll();
//   }

//   // ── Smart search ─────────────────────────────────────────────────────────
//   void _onSearchChanged(String value) {
//     _debounce?.cancel();
//     if (value.trim().isEmpty) {
//       _removeOverlay();
//       setState(() {
//         _suggestions     = [];
//         _fuzzySuggestion = '';
//         _showSuggestions = false;
//         _loadingSuggestions = false;
//       });
//       return;
//     }
//     final query = value.trim();
//     if (_suggestionCache.containsKey(query)) {
//       setState(() {
//         _suggestions     = _suggestionCache[query]!;
//         _fuzzySuggestion = _fuzzyCache[query] ?? '';
//         _showSuggestions = _searchFocus.hasFocus && _suggestions.isNotEmpty;
//         _loadingSuggestions = false;
//       });
//       if (_showSuggestions) {
//         WidgetsBinding.instance.addPostFrameCallback((_) => _buildAndShowOverlay());
//       } else {
//         _removeOverlay();
//       }
//       return;
//     }
//     setState(() => _loadingSuggestions = true);
//     _debounce = Timer(const Duration(milliseconds: 200), () async {
//       final results = await Future.wait([
//         SearchService.getSuggestions(query),
//         SearchService.getFuzzySuggestion(query),
//       ]);
//       if (!mounted) return;
//       final sugs  = results[0] as List<String>;
//       final fuzzy = results[1] as String;
//       _suggestionCache[query] = sugs;
//       _fuzzyCache[query]      = fuzzy;
//       setState(() {
//         _suggestions        = sugs;
//         _fuzzySuggestion    = fuzzy;
//         _showSuggestions    = _searchFocus.hasFocus && sugs.isNotEmpty;
//         _loadingSuggestions = false;
//       });
//       if (_showSuggestions) {
//         WidgetsBinding.instance.addPostFrameCallback((_) => _buildAndShowOverlay());
//       } else {
//         _removeOverlay();
//       }
//     });
//   }

//   void _submitSearch(String query) {
//     _removeOverlay();
//     _searchFocus.unfocus();
//     setState(() {
//       searchQuery      = query.trim();
//       _showSuggestions = false;
//       _suggestions     = [];
//       _fuzzySuggestion = '';
//     });
//     searchCtrl.text = query.trim();
//     _scrollToTop();
//     _loadData();
//   }

//   void _scrollToTop() {
//     if (_homeScroll.hasClients) {
//       _homeScroll.animateTo(0,
//           duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
//     }
//   }

//   void _selectCategory(String cat) {
//     final next = cat == 'All' ? '' : cat;
//     if (next == selectedCategory) return;
//     setState(() => selectedCategory = next);
//     _scrollToTop();
//     _loadData();
//   }

//   Future<void> _toggleWishlist(Product p) async {
//     if (_togglingWishlist.contains(p.id)) return;
//     final was = wishlistIds.contains(p.id);
//     setState(() {
//       _togglingWishlist.add(p.id);
//       was ? wishlistIds.remove(p.id) : wishlistIds.add(p.id);
//     });
//     final res = await WishlistService.toggle(p.id);
//     if (!mounted) return;
//     if (res['success'] != true) {
//       setState(() => was ? wishlistIds.add(p.id) : wishlistIds.remove(p.id));
//       _snack(res['message'] ?? 'Wishlist update failed', Colors.red);
//     }
//     setState(() => _togglingWishlist.remove(p.id));
//   }

//   void _recordView(int id) {
//     _recentIds.remove(id);
//     _recentIds.insert(0, id);
//     if (_recentIds.length > 10) _recentIds.removeLast();
//   }

//   List<Product> get _recentProducts => _recentIds
//       .take(6)
//       .map((id) {
//         final match = products.where((p) => p.id == id).toList();
//         return match.isNotEmpty ? match.first : null;
//       })
//       .whereType<Product>()
//       .toList();

//   Future<void> _addToCart(Product p) async {
//     final res = await CartService.addToCart(p.id, 1);
//     if (!mounted) return;
//     _snack(
//       res['success'] == true ? '${p.name} added to cart!' : res['message'] ?? 'Failed',
//       res['success'] == true ? Colors.green : Colors.red,
//     );
//     if (res['success'] == true) setState(() => cartCount++);
//   }

//   Future<void> _openProduct(Product p) async {
//     _recordView(p.id);
//     await Navigator.push(context,
//         MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)));
//     final ids = await WishlistService.getWishlistIds();
//     if (mounted) setState(() => wishlistIds = ids);
//   }

//   void _snack(String msg, Color color) {
//     ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//         content: Text(msg),
//         backgroundColor: color,
//         behavior: SnackBarBehavior.floating,
//         duration: const Duration(seconds: 2)));
//   }

//   // ── Open Cart as a full page (via header icon) ────────────────────────────
//   Future<void> _openCartPage() async {
//     await Navigator.push(
//       context,
//       MaterialPageRoute(
//         builder: (_) => Scaffold(
//           appBar: AppBar(
//             title: const Text('My Cart',
//                 style: TextStyle(fontWeight: FontWeight.bold)),
//             backgroundColor: Colors.blue.shade700,
//             foregroundColor: Colors.white,
//           ),
//           // UniqueKey forces CartScreen to rebuild fresh every time
//           body: CartScreen(
//             key: UniqueKey(),
//             onCartChanged: (c) {
//               if (mounted) setState(() => cartCount = c);
//             },
//           ),
//         ),
//       ),
//     );
//     // Refresh cart count after returning from cart page
//     if (mounted) {
//       final res = await CartService.getCart();
//       if (mounted) setState(() => cartCount = (res['count'] ?? 0) as int);
//     }
//   }

//   // ── BUILD ─────────────────────────────────────────────────────────────────
//   @override
//   Widget build(BuildContext context) {
//     final user = AuthService.currentUser;

//     // Tabs: Home | Categories | Orders | Wishlist | Profile
//     // Cart is REMOVED from bottom nav — accessible via header icon only
//     final tabs = [
//       _buildHomeTab(),
//       _buildCategoriesTab(),
//       const OrdersScreen(),
//       const WishlistScreen(),
//       _buildProfileTab(user?.name ?? 'User', user?.email ?? ''),
//     ];

//     return Scaffold(
//       appBar: AppBar(
//         title: const Row(children: [
//           Icon(Icons.shopping_bag, color: Colors.white),
//           SizedBox(width: 8),
//           Text('Ekart', style: TextStyle(fontWeight: FontWeight.bold)),
//         ]),
//         backgroundColor: Colors.blue.shade700,
//         foregroundColor: Colors.white,
//         actions: [
//           // Cart icon in header with badge
//           Stack(children: [
//             IconButton(
//               icon: const Icon(Icons.shopping_cart),
//               onPressed: _openCartPage,
//               tooltip: 'Cart',
//             ),
//             if (cartCount > 0)
//               Positioned(
//                 right: 6, top: 6,
//                 child: Container(
//                   padding: const EdgeInsets.all(3),
//                   decoration: const BoxDecoration(
//                       color: Colors.red, shape: BoxShape.circle),
//                   child: Text('$cartCount',
//                       style: const TextStyle(color: Colors.white, fontSize: 10)),
//                 ),
//               ),
//           ]),
//         ],
//       ),
//       body: IndexedStack(
//         index: _currentIndex,
//         children: tabs,
//       ),
//       bottomNavigationBar: BottomNavigationBar(
//         currentIndex: _currentIndex,
//         onTap: (i) {
//           if (i == 0 && _currentIndex == 0) {
//             _scrollToTop();
//             _loadData();
//           } else {
//             setState(() => _currentIndex = i);
//           }
//         },
//         type: BottomNavigationBarType.fixed,
//         selectedItemColor: Colors.blue.shade700,
//         unselectedItemColor: Colors.grey,
//         items: const [
//           BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
//           BottomNavigationBarItem(icon: Icon(Icons.category), label: 'Categories'),
//           BottomNavigationBarItem(icon: Icon(Icons.receipt_long), label: 'Orders'),
//           BottomNavigationBarItem(icon: Icon(Icons.favorite_border), label: 'Wishlist'),
//           BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
//         ],
//       ),
//     );
//   }

//   // ── Home Tab ──────────────────────────────────────────────────────────────
//   Widget _buildHomeTab() {
//     return Column(children: [
//       // Search bar using CompositedTransformTarget + Overlay
//       Padding(
//         padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
//         child: CompositedTransformTarget(
//           link: _layerLink,
//           child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
//             TextField(
//               key: _searchKey,
//               controller: searchCtrl,
//               focusNode: _searchFocus,
//               decoration: InputDecoration(
//                 hintText: 'Search products...',
//                 prefixIcon: const Icon(Icons.search),
//                 suffixIcon: searchQuery.isNotEmpty
//                     ? IconButton(
//                         icon: const Icon(Icons.clear),
//                         onPressed: () {
//                           searchCtrl.clear();
//                           _removeOverlay();
//                           setState(() {
//                             searchQuery      = '';
//                             _suggestions     = [];
//                             _fuzzySuggestion = '';
//                             _showSuggestions = false;
//                           });
//                           _scrollToTop();
//                           _loadData();
//                         })
//                     : _loadingSuggestions
//                         ? const Padding(
//                             padding: EdgeInsets.all(12),
//                             child: SizedBox(
//                                 width: 16, height: 16,
//                                 child: CircularProgressIndicator(strokeWidth: 2)))
//                         : null,
//                 border: OutlineInputBorder(borderRadius: BorderRadius.circular(30)),
//                 filled: true,
//                 fillColor: Colors.white,
//               ),
//               onChanged: _onSearchChanged,
//               onSubmitted: _submitSearch,
//               textInputAction: TextInputAction.search,
//             ),

//             // Fuzzy suggestion banner — inline, never overlaps anything
//             if (_fuzzySuggestion.isNotEmpty && searchCtrl.text.isNotEmpty)
//               GestureDetector(
//                 onTap: () => _submitSearch(_fuzzySuggestion),
//                 child: Container(
//                   width: double.infinity,
//                   margin: const EdgeInsets.only(top: 4),
//                   padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
//                   decoration: BoxDecoration(
//                     color: Colors.orange.shade50,
//                     border: Border.all(color: Colors.orange.shade200),
//                     borderRadius: BorderRadius.circular(8),
//                   ),
//                   child: Row(children: [
//                     Icon(Icons.spellcheck, size: 16, color: Colors.orange.shade700),
//                     const SizedBox(width: 6),
//                     Text('Did you mean: ',
//                         style: TextStyle(color: Colors.orange.shade800, fontSize: 13)),
//                     Text(_fuzzySuggestion,
//                         style: TextStyle(
//                             color: Colors.orange.shade900, fontSize: 13,
//                             fontWeight: FontWeight.bold,
//                             decoration: TextDecoration.underline)),
//                     const Spacer(),
//                     Icon(Icons.arrow_forward_ios, size: 12, color: Colors.orange.shade600),
//                   ]),
//                 ),
//               ),
//           ]),
//         ),
//       ),

//       // ── Location / PIN bar ───────────────────────────────────────────────
//       // Mirrors the website's auto-detection + manual PIN entry banner.
//       // Calls /api/geocode/auto on first load (IP-based, silent — no permission needed).
//       // User can tap to enter PIN manually or use GPS.
//       // When PIN changes → _userPin updates → product grid re-renders with
//       // "Not delivering to your area" overlay on restricted products (matches website).
//       PinDetectorBar(
//         autoDetectOnInit: true,
//         onPinChanged: (pin) {
//           if (mounted) setState(() => _userPin = pin);
//         },
//       ),

//       // Category chips
//       if (categories.isNotEmpty)
//         SizedBox(
//           height: 50,
//           child: ListView.builder(
//             scrollDirection: Axis.horizontal,
//             padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//             itemCount: categories.length,
//             itemBuilder: (_, i) {
//               final cat      = categories[i];
//               final selected = cat == 'All'
//                   ? selectedCategory.isEmpty
//                   : selectedCategory == cat;
//               return Padding(
//                 padding: const EdgeInsets.only(right: 8),
//                 child: InkWell(
//                   onTap: () => _selectCategory(cat),
//                   borderRadius: BorderRadius.circular(20),
//                   child: AnimatedContainer(
//                     duration: const Duration(milliseconds: 150),
//                     padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
//                     decoration: BoxDecoration(
//                       color: selected ? Colors.blue.shade700 : Colors.grey.shade100,
//                       borderRadius: BorderRadius.circular(20),
//                       border: Border.all(
//                           color: selected ? Colors.blue.shade700 : Colors.grey.shade300),
//                     ),
//                     child: Text(cat,
//                         style: TextStyle(
//                             color: selected ? Colors.white : Colors.black87,
//                             fontWeight: selected ? FontWeight.bold : FontWeight.normal,
//                             fontSize: 13)),
//                   ),
//                 ),
//               );
//             },
//           ),
//         ),

//       // ── Budget & Sort filter bar ────────────────────────────────────────
//       Padding(
//         padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
//         child: Row(children: [
//           Expanded(
//             child: GestureDetector(
//               onTap: _showBudgetFilterSheet,
//               child: AnimatedContainer(
//                 duration: const Duration(milliseconds: 200),
//                 padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
//                 decoration: BoxDecoration(
//                   color: _filterActive ? Colors.blue.shade700 : Colors.white,
//                   border: Border.all(color: _filterActive ? Colors.blue.shade700 : Colors.grey.shade300),
//                   borderRadius: BorderRadius.circular(8),
//                   boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.08), blurRadius: 4)]),
//                 child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
//                   Icon(Icons.tune, size: 16,
//                       color: _filterActive ? Colors.white : Colors.grey.shade700),
//                   const SizedBox(width: 6),
//                   Text(_filterActive ? _activeFilterLabel() : 'Filter & Sort',
//                       style: TextStyle(
//                           color: _filterActive ? Colors.white : Colors.grey.shade700,
//                           fontWeight: FontWeight.w600, fontSize: 13)),
//                   if (_filterActive) ...[
//                     const SizedBox(width: 6),
//                     GestureDetector(
//                       onTap: _clearFilters,
//                       child: const Icon(Icons.close, size: 14, color: Colors.white)),
//                   ],
//                 ]),
//               ),
//             ),
//           ),
//         ]),
//       ),

//       Expanded(child: _buildProductGrid()),
//     ]);
//   }

//   // ── Budget / Sort helpers ─────────────────────────────────────────────────

//   String _activeFilterLabel() {
//     final parts = <String>[];
//     if (_minPrice != null || _maxPrice != null) {
//       final lo = _minPrice != null ? '\u20b9${_minPrice!.toInt()}' : '';
//       final hi = _maxPrice != null ? '\u20b9${_maxPrice!.toInt()}' : '';
//       parts.add(lo.isNotEmpty && hi.isNotEmpty ? '$lo–$hi' : (lo.isNotEmpty ? '>$lo' : '<$hi'));
//     }
//     if (_sortBy != 'default') {
//       switch (_sortBy) {
//         case 'price_asc':  parts.add('Price \u2191'); break;
//         case 'price_desc': parts.add('Price \u2193'); break;
//         case 'name':       parts.add('A–Z');          break;
//       }
//     }
//     return parts.join(' · ');
//   }

//   void _clearFilters() {
//     setState(() { _minPrice = null; _maxPrice = null; _sortBy = 'default'; _filterActive = false; });
//     _loadData();
//   }

//   void _showBudgetFilterSheet() async {
//     double? tmpMin  = _minPrice;
//     double? tmpMax  = _maxPrice;
//     String  tmpSort = _sortBy;

//     await showModalBottomSheet(
//       context: context, isScrollControlled: true,
//       backgroundColor: Colors.transparent,
//       builder: (_) => _BudgetFilterSheet(
//         initialMin:  tmpMin,
//         initialMax:  tmpMax,
//         initialSort: tmpSort,
//         onApply: (min, max, sort) {
//           setState(() {
//             _minPrice     = min;
//             _maxPrice     = max;
//             _sortBy       = sort;
//             _filterActive = (min != null || max != null || sort != 'default');
//           });
//           _loadData();
//         },
//         onClear: _clearFilters,
//       ),
//     );
//   }

//   // ── Categories Tab ────────────────────────────────────────────────────────
//   Widget _buildCategoriesTab() {
//     if (loading) {
//       return const Center(child: CircularProgressIndicator());
//     }

//     final displayCats = categories.where((c) => c != 'All').toList();

//     if (displayCats.isEmpty) {
//       return Center(
//         child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
//           Icon(Icons.category_outlined, size: 64, color: Colors.grey[300]),
//           const SizedBox(height: 12),
//           Text('No categories available',
//               style: TextStyle(color: Colors.grey[500], fontSize: 16)),
//         ]),
//       );
//     }

//     final List<Color> catColors = [
//       Colors.blue.shade100,
//       Colors.green.shade100,
//       Colors.orange.shade100,
//       Colors.purple.shade100,
//       Colors.red.shade100,
//       Colors.teal.shade100,
//       Colors.pink.shade100,
//       Colors.amber.shade100,
//       Colors.indigo.shade100,
//       Colors.cyan.shade100,
//     ];
//     final List<Color> catTextColors = [
//       Colors.blue.shade700,
//       Colors.green.shade700,
//       Colors.orange.shade700,
//       Colors.purple.shade700,
//       Colors.red.shade700,
//       Colors.teal.shade700,
//       Colors.pink.shade700,
//       Colors.amber.shade800,
//       Colors.indigo.shade700,
//       Colors.cyan.shade800,
//     ];
//     final List<IconData> catIcons = [
//       Icons.phone_android,
//       Icons.checkroom,
//       Icons.home,
//       Icons.sports_esports,
//       Icons.book,
//       Icons.kitchen,
//       Icons.fitness_center,
//       Icons.face,
//       Icons.toys,
//       Icons.more_horiz,
//     ];

//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         Padding(
//           padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
//           child: Text(
//             'Shop by Category',
//             style: TextStyle(
//               fontSize: 18,
//               fontWeight: FontWeight.bold,
//               color: Colors.grey.shade800,
//             ),
//           ),
//         ),
//         Expanded(
//           child: RefreshIndicator(
//             onRefresh: _loadData,
//             child: GridView.builder(
//               padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
//               gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
//                 crossAxisCount: 2,
//                 childAspectRatio: 1.35,
//                 crossAxisSpacing: 12,
//                 mainAxisSpacing: 12,
//               ),
//               itemCount: displayCats.length,
//               itemBuilder: (_, i) {
//                 final cat       = displayCats[i];
//                 final color     = catColors[i % catColors.length];
//                 final textColor = catTextColors[i % catTextColors.length];
//                 final icon      = catIcons[i % catIcons.length];

//                 return GestureDetector(
//                   onTap: () {
//                     setState(() {
//                       selectedCategory = cat;
//                       _currentIndex    = 0; // switch to Home tab filtered by category
//                     });
//                     _scrollToTop();
//                     _loadData();
//                   },
//                   child: Container(
//                     decoration: BoxDecoration(
//                       color: color,
//                       borderRadius: BorderRadius.circular(14),
//                       boxShadow: [
//                         BoxShadow(
//                           color: Colors.black.withValues(alpha: 0.06),
//                           blurRadius: 6,
//                           offset: const Offset(0, 2),
//                         ),
//                       ],
//                     ),
//                     child: Column(
//                       mainAxisAlignment: MainAxisAlignment.center,
//                       children: [
//                         Container(
//                           padding: const EdgeInsets.all(12),
//                           decoration: BoxDecoration(
//                             color: Colors.white.withValues(alpha: 0.6),
//                             shape: BoxShape.circle,
//                           ),
//                           child: Icon(icon, color: textColor, size: 28),
//                         ),
//                         const SizedBox(height: 8),
//                         Padding(
//                           padding: const EdgeInsets.symmetric(horizontal: 8),
//                           child: Text(
//                             cat,
//                             textAlign: TextAlign.center,
//                             maxLines: 2,
//                             overflow: TextOverflow.ellipsis,
//                             style: TextStyle(
//                               fontWeight: FontWeight.bold,
//                               fontSize: 13,
//                               color: textColor,
//                             ),
//                           ),
//                         ),
//                       ],
//                     ),
//                   ),
//                 );
//               },
//             ),
//           ),
//         ),
//       ],
//     );
//   }

//   Widget _highlightMatch(String suggestion, String query) {
//     final lower  = suggestion.toLowerCase();
//     final qLower = query.toLowerCase().trim();
//     final idx    = lower.indexOf(qLower);
//     if (idx == -1 || qLower.isEmpty) {
//       return Text(suggestion, style: const TextStyle(fontSize: 14));
//     }
//     return RichText(
//       text: TextSpan(
//         style: const TextStyle(fontSize: 14, color: Colors.black87),
//         children: [
//           TextSpan(text: suggestion.substring(0, idx)),
//           TextSpan(
//               text: suggestion.substring(idx, idx + qLower.length),
//               style: const TextStyle(fontWeight: FontWeight.bold)),
//           TextSpan(text: suggestion.substring(idx + qLower.length)),
//         ],
//       ),
//     );
//   }

//   Widget _buildProductGrid() {
//     if (loading) return _buildSkeleton();

//     if (products.isEmpty && banners.isEmpty) {
//       return Center(
//         child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
//           Icon(Icons.search_off, size: 80, color: Colors.grey[400]),
//           const SizedBox(height: 16),
//           Text('No products found',
//               style: TextStyle(fontSize: 18, color: Colors.grey[600])),
//           if (searchQuery.isNotEmpty || selectedCategory.isNotEmpty) ...[
//             const SizedBox(height: 12),
//             TextButton(
//               onPressed: () {
//                 searchCtrl.clear();
//                 setState(() { searchQuery = ''; selectedCategory = ''; });
//                 _scrollToTop();
//                 _loadData();
//               },
//               child: const Text('Clear filters'),
//             ),
//           ],
//         ]),
//       );
//     }

//     return RefreshIndicator(
//       onRefresh: _loadData,
//       child: CustomScrollView(
//         controller: _homeScroll,
//         slivers: [
//           if (banners.isNotEmpty && searchQuery.isEmpty && selectedCategory.isEmpty)
//             SliverToBoxAdapter(child: _buildBannerCarousel()),

//           if (_recentProducts.isNotEmpty && searchQuery.isEmpty)
//             SliverToBoxAdapter(child: _buildRecentlyViewed()),

//           if (products.isEmpty)
//             SliverToBoxAdapter(
//               child: Center(
//                 child: Padding(
//                   padding: const EdgeInsets.all(40),
//                   child: Column(children: [
//                     Icon(Icons.search_off, size: 64, color: Colors.grey[400]),
//                     const SizedBox(height: 12),
//                     Text('No products found',
//                         style: TextStyle(fontSize: 16, color: Colors.grey[600])),
//                     TextButton(
//                       onPressed: () {
//                         searchCtrl.clear();
//                         setState(() { searchQuery = ''; selectedCategory = ''; });
//                         _loadData();
//                       },
//                       child: const Text('Clear filters'),
//                     ),
//                   ]),
//                 ),
//               ),
//             )
//           else
//             SliverPadding(
//               padding: const EdgeInsets.all(12),
//               sliver: SliverGrid(
//                 gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
//                   crossAxisCount: 2, childAspectRatio: 0.60,
//                   crossAxisSpacing: 12, mainAxisSpacing: 12,
//                 ),
//                 delegate: SliverChildBuilderDelegate(
//                   (_, i) => _buildProductCard(products[i]),
//                   childCount: products.length,
//                 ),
//               ),
//             ),
//         ],
//       ),
//     );
//   }

//   Widget _buildBannerCarousel() {
//     return Column(children: [
//       SizedBox(
//         height: 180,
//         child: PageView.builder(
//           controller: _bannerCtrl,
//           itemCount: banners.length,
//           physics: const BouncingScrollPhysics(),
//           onPageChanged: (i) {
//             _bannerTimer?.cancel();
//             setState(() => _bannerPage = i);
//             _startBannerAutoScroll();
//           },
//           itemBuilder: (_, i) {
//             final b      = banners[i];
//             final imgUrl = (b['imageUrl'] ?? '') as String;
//             final title  = (b['title']    ?? '') as String;
//             return Container(
//               margin: const EdgeInsets.symmetric(horizontal: 12),
//               decoration: BoxDecoration(
//                 borderRadius: BorderRadius.circular(14),
//                 boxShadow: [
//                   BoxShadow(
//                       color: Colors.black.withValues(alpha: 0.10),
//                       blurRadius: 8, offset: const Offset(0, 3)),
//                 ],
//               ),
//               child: ClipRRect(
//                 borderRadius: BorderRadius.circular(14),
//                 child: Stack(fit: StackFit.expand, children: [
//                   imgUrl.isNotEmpty
//                       ? Image.network(imgUrl, fit: BoxFit.cover,
//                           errorBuilder: (_, __, ___) => _bannerPlaceholder(title))
//                       : _bannerPlaceholder(title),
//                   if (title.isNotEmpty)
//                     Positioned(
//                       bottom: 0, left: 0, right: 0,
//                       child: Container(
//                         padding: const EdgeInsets.fromLTRB(12, 24, 12, 12),
//                         decoration: BoxDecoration(
//                           gradient: LinearGradient(
//                             begin: Alignment.bottomCenter,
//                             end: Alignment.topCenter,
//                             colors: [
//                               Colors.black.withValues(alpha: 0.55),
//                               Colors.transparent,
//                             ],
//                           ),
//                         ),
//                         child: Text(title,
//                             style: const TextStyle(
//                                 color: Colors.white, fontWeight: FontWeight.bold,
//                                 fontSize: 15,
//                                 shadows: [Shadow(blurRadius: 4, color: Colors.black45)])),
//                       ),
//                     ),
//                   if (banners.length > 1) ...[
//                     if (_bannerPage > 0)
//                       Positioned(
//                         left: 6, top: 0, bottom: 0,
//                         child: Center(child: Container(
//                           width: 28, height: 28,
//                           decoration: BoxDecoration(
//                               color: Colors.black.withValues(alpha: 0.28),
//                               shape: BoxShape.circle),
//                           child: const Icon(Icons.chevron_left, color: Colors.white, size: 20),
//                         )),
//                       ),
//                     if (_bannerPage < banners.length - 1)
//                       Positioned(
//                         right: 6, top: 0, bottom: 0,
//                         child: Center(child: Container(
//                           width: 28, height: 28,
//                           decoration: BoxDecoration(
//                               color: Colors.black.withValues(alpha: 0.28),
//                               shape: BoxShape.circle),
//                           child: const Icon(Icons.chevron_right, color: Colors.white, size: 20),
//                         )),
//                       ),
//                   ],
//                 ]),
//               ),
//             );
//           },
//         ),
//       ),
//       if (banners.length > 1)
//         Padding(
//           padding: const EdgeInsets.only(top: 8, bottom: 2),
//           child: Row(
//             mainAxisAlignment: MainAxisAlignment.center,
//             children: List.generate(banners.length, (i) => GestureDetector(
//               onTap: () => _bannerCtrl.animateToPage(i,
//                   duration: const Duration(milliseconds: 300), curve: Curves.easeInOut),
//               child: AnimatedContainer(
//                 duration: const Duration(milliseconds: 250),
//                 margin: const EdgeInsets.symmetric(horizontal: 3),
//                 width: _bannerPage == i ? 18 : 7,
//                 height: 7,
//                 decoration: BoxDecoration(
//                   color: _bannerPage == i ? Colors.blue.shade700 : Colors.grey.shade300,
//                   borderRadius: BorderRadius.circular(4),
//                 ),
//               ),
//             )),
//           ),
//         ),
//     ]);
//   }

//   Widget _bannerPlaceholder(String title) => Container(
//     color: Colors.blue.shade100,
//     child: Center(child: Text(title.isNotEmpty ? title : 'Ekart Offer',
//         style: TextStyle(color: Colors.blue.shade700,
//             fontWeight: FontWeight.bold, fontSize: 18))),
//   );

//   Widget _buildRecentlyViewed() {
//     return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//       const Padding(
//         padding: EdgeInsets.fromLTRB(14, 12, 14, 6),
//         child: Text('Recently Viewed',
//             style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
//       ),
//       SizedBox(
//         height: 110,
//         child: ListView.builder(
//           scrollDirection: Axis.horizontal,
//           padding: const EdgeInsets.symmetric(horizontal: 12),
//           itemCount: _recentProducts.length,
//           itemBuilder: (_, i) {
//             final p = _recentProducts[i];
//             return GestureDetector(
//               onTap: () => _openProduct(p),
//               child: Container(
//                 width: 80,
//                 margin: const EdgeInsets.only(right: 10),
//                 child: Column(children: [
//                   ClipRRect(
//                     borderRadius: BorderRadius.circular(8),
//                     child: p.imageLink.isNotEmpty
//                         ? Image.network(p.imageLink,
//                             width: 80, height: 80, fit: BoxFit.cover,
//                             errorBuilder: (_, __, ___) => Container(
//                                 width: 80, height: 80, color: Colors.grey[200],
//                                 child: const Icon(Icons.image)))
//                         : Container(width: 80, height: 80, color: Colors.grey[200],
//                             child: const Icon(Icons.image)),
//                   ),
//                   const SizedBox(height: 4),
//                   Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis,
//                       style: const TextStyle(fontSize: 10)),
//                 ]),
//               ),
//             );
//           },
//         ),
//       ),
//       const Divider(height: 1),
//     ]);
//   }

//   Widget _buildProductCard(Product p) {
//     final wishlisted   = wishlistIds.contains(p.id);
//     final isToggling   = _togglingWishlist.contains(p.id);
//     final isOutOfStock = p.stock <= 0;

//     // ── PIN deliverability check ──────────────────────────────────────────────
//     // Mirrors the website's JS applyPinFilter() which shows a "pin-unavail-overlay"
//     // on cards where product.allowedPinCodes doesn't include the user's PIN.
//     // Logic: if product has no restriction → always deliverable.
//     //        if user has no PIN yet → don't block (give benefit of the doubt).
//     //        otherwise → check if userPin is in allowedPinCodes.
//     final bool isPinUnavailable = _userPin != null &&
//         _userPin!.isNotEmpty &&
//         p.isRestrictedByPinCode &&
//         !p.isDeliverableTo(_userPin);

//     return GestureDetector(
//       onTap: () => _openProduct(p),
//       child: Card(
//         elevation: 2,
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
//         child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//           Stack(children: [
//             ClipRRect(
//               borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
//               child: p.imageLink.isNotEmpty
//                   ? Image.network(p.imageLink,
//                       height: 130, width: double.infinity, fit: BoxFit.cover,
//                       frameBuilder: (ctx, child, frame, _) => AnimatedOpacity(
//                         opacity: frame == null ? 0 : 1,
//                         duration: const Duration(milliseconds: 200),
//                         child: child,
//                       ),
//                       errorBuilder: (_, __, ___) => Container(
//                           height: 130, color: Colors.grey[200],
//                           child: const Icon(Icons.image_not_supported, size: 40)))
//                   : Container(height: 130, color: Colors.grey[200],
//                       child: const Icon(Icons.image, size: 40)),
//             ),
//             if (isOutOfStock)
//               Positioned.fill(
//                 child: ClipRRect(
//                   borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
//                   child: Container(
//                     color: Colors.black.withValues(alpha: 0.38),
//                     alignment: Alignment.center,
//                     child: Container(
//                       padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
//                       decoration: BoxDecoration(
//                           color: Colors.red.shade700,
//                           borderRadius: BorderRadius.circular(6)),
//                       child: const Text('OUT OF STOCK',
//                           style: TextStyle(color: Colors.white, fontSize: 10,
//                               fontWeight: FontWeight.bold, letterSpacing: 0.5)),
//                     ),
//                   ),
//                 ),
//               ),

//             // ── PIN unavailability overlay ──────────────────────────────────
//             // Mirrors the website's .pin-unavail-overlay on customer-home.html.
//             // Shown when user's PIN is set and this product doesn't ship there.
//             if (isPinUnavailable)
//               Positioned.fill(
//                 child: ClipRRect(
//                   borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
//                   child: Container(
//                     color: Colors.black.withValues(alpha: 0.55),
//                     alignment: Alignment.center,
//                     child: Column(
//                       mainAxisAlignment: MainAxisAlignment.center,
//                       children: [
//                         Container(
//                           padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
//                           decoration: BoxDecoration(
//                               color: Colors.orange.shade700,
//                               borderRadius: BorderRadius.circular(6)),
//                           child: const Row(mainAxisSize: MainAxisSize.min, children: [
//                             Icon(Icons.schedule, color: Colors.white, size: 12),
//                             SizedBox(width: 4),
//                             Text('Available Very Soon',
//                                 style: TextStyle(color: Colors.white, fontSize: 10,
//                                     fontWeight: FontWeight.bold)),
//                           ]),
//                         ),
//                         const SizedBox(height: 4),
//                         const Text('Not delivering to your\nPIN code yet',
//                             textAlign: TextAlign.center,
//                             style: TextStyle(color: Colors.white70, fontSize: 9)),
//                       ],
//                     ),
//                   ),
//                 ),
//               ),
//             Positioned(
//               top: 4, right: 4,
//               child: GestureDetector(
//                 onTap: () => _toggleWishlist(p),
//                 child: Container(
//                   width: 32, height: 32,
//                   decoration: const BoxDecoration(
//                     color: Colors.white, shape: BoxShape.circle,
//                     boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
//                   ),
//                   child: isToggling
//                       ? const Center(child: SizedBox(width: 14, height: 14,
//                           child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red)))
//                       : Icon(wishlisted ? Icons.favorite : Icons.favorite_border,
//                           size: 18, color: wishlisted ? Colors.red : Colors.grey[500]),
//                 ),
//               ),
//             ),
//             if (p.isDiscounted)
//               Positioned(
//                 top: 4, left: 4,
//                 child: Container(
//                   padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
//                   decoration: BoxDecoration(
//                       color: Colors.red, borderRadius: BorderRadius.circular(8)),
//                   child: Text('${p.discountPercent}% OFF',
//                       style: const TextStyle(color: Colors.white, fontSize: 10,
//                           fontWeight: FontWeight.bold)),
//                 ),
//               ),
//           ]),

//           Padding(
//             padding: const EdgeInsets.fromLTRB(8, 8, 8, 2),
//             child: Text(p.name, maxLines: 2, overflow: TextOverflow.ellipsis,
//                 style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
//           ),
//           Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 8),
//             child: Row(children: [
//               Text('₹${p.price.toStringAsFixed(2)}',
//                   style: TextStyle(color: Colors.blue.shade700,
//                       fontWeight: FontWeight.bold, fontSize: 14)),
//               if (p.isDiscounted) ...[
//                 const SizedBox(width: 6),
//                 Text('₹${p.mrp.toStringAsFixed(0)}',
//                     style: const TextStyle(
//                         decoration: TextDecoration.lineThrough,
//                         color: Colors.grey, fontSize: 11)),
//               ],
//             ]),
//           ),
//           const Spacer(),
//           Padding(
//             padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
//             child: SizedBox(
//               width: double.infinity,
//               child: isOutOfStock
//                   ? _NotifyMeButton(productId: p.id)
//                   : isPinUnavailable
//                       // PIN unavailable: show a muted "Not in your area" button
//                       ? OutlinedButton.icon(
//                           onPressed: () => _openProduct(p), // let them see detail anyway
//                           icon: Icon(Icons.location_off, size: 13,
//                               color: Colors.orange.shade700),
//                           label: Text('Not in your area',
//                               style: TextStyle(fontSize: 11,
//                                   color: Colors.orange.shade700)),
//                           style: OutlinedButton.styleFrom(
//                             side: BorderSide(color: Colors.orange.shade300),
//                             padding: const EdgeInsets.symmetric(vertical: 6),
//                             shape: RoundedRectangleBorder(
//                                 borderRadius: BorderRadius.circular(8)),
//                           ),
//                         )
//                       : ElevatedButton.icon(
//                           onPressed: () => _addToCart(p),
//                           icon: const Icon(Icons.add_shopping_cart, size: 15),
//                           label: const Text('Add to Cart', style: TextStyle(fontSize: 12)),
//                           style: ElevatedButton.styleFrom(
//                             backgroundColor: Colors.blue.shade700,
//                             foregroundColor: Colors.white,
//                             padding: const EdgeInsets.symmetric(vertical: 6),
//                             shape: RoundedRectangleBorder(
//                                 borderRadius: BorderRadius.circular(8)),
//                           ),
//                         ),
//             ),
//           ),
//         ]),
//       ),
//     );
//   }

//   Widget _buildProfileTab(String name, String email) {
//     return ListView(padding: const EdgeInsets.all(20), children: [
//       CircleAvatar(
//         radius: 48,
//         backgroundColor: Colors.blue.shade100,
//         child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
//             style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold,
//                 color: Colors.blue.shade700)),
//       ),
//       const SizedBox(height: 16),
//       Text(name, textAlign: TextAlign.center,
//           style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
//       Text(email, textAlign: TextAlign.center,
//           style: TextStyle(color: Colors.grey[600])),
//       const SizedBox(height: 28),
//       _profileTile(Icons.person_outline, 'Edit Profile',
//           () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()))),
//       _profileTile(Icons.receipt_long, 'My Orders', () => setState(() => _currentIndex = 2)),
//       _profileTile(Icons.shopping_cart, 'My Cart', _openCartPage),
//       _profileTile(Icons.favorite_border, 'Wishlist', () => setState(() => _currentIndex = 3)),
//       _profileTile(Icons.analytics_outlined, 'My Spending',
//           () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SpendingScreen()))),
//       const Divider(),
//       _profileTile(Icons.logout, 'Logout', () {
//         AuthService.logout();
//         Navigator.pushAndRemoveUntil(context,
//             MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
//       }, color: Colors.red),
//     ]);
//   }

//   Widget _profileTile(IconData icon, String title, VoidCallback onTap, {Color? color}) {
//     return ListTile(
//       leading: Icon(icon, color: color ?? Colors.blue.shade700),
//       title: Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
//       trailing: const Icon(Icons.chevron_right),
//       onTap: onTap,
//     );
//   }

//   Widget _buildSkeleton() {
//     return GridView.builder(
//       padding: const EdgeInsets.all(12),
//       gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
//         crossAxisCount: 2, childAspectRatio: 0.62,
//         crossAxisSpacing: 12, mainAxisSpacing: 12,
//       ),
//       itemCount: 6,
//       itemBuilder: (_, __) => _SkeletonCard(),
//     );
//   }
// }

// // ── Notify Me Button ──────────────────────────────────────────────────────────
// class _NotifyMeButton extends StatefulWidget {
//   final int productId;
//   const _NotifyMeButton({required this.productId});
//   @override
//   State<_NotifyMeButton> createState() => _NotifyMeButtonState();
// }

// class _NotifyMeButtonState extends State<_NotifyMeButton> {
//   bool _subscribed = false;
//   bool _loading    = true;
//   bool _inFlight   = false;

//   @override
//   void initState() { super.initState(); _checkStatus(); }

//   Future<void> _checkStatus() async {
//     final sub = await NotifyMeService.isSubscribed(widget.productId);
//     if (mounted) setState(() { _subscribed = sub; _loading = false; });
//   }

//   Future<void> _toggle() async {
//     if (_inFlight) return;
//     final wasSubscribed = _subscribed;
//     setState(() => _inFlight = true);
//     final res = wasSubscribed
//         ? await NotifyMeService.unsubscribe(widget.productId)
//         : await NotifyMeService.subscribe(widget.productId);
//     if (mounted) {
//       setState(() {
//         _inFlight = false;
//         if (res['success'] == true) _subscribed = !wasSubscribed;
//       });
//       ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//         content: Text(res['message'] ??
//             (!wasSubscribed ? 'You will be notified!' : 'Notification removed')),
//         backgroundColor: res['success'] == true ? Colors.green : Colors.red,
//         behavior: SnackBarBehavior.floating,
//         duration: const Duration(seconds: 2),
//       ));
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     if (_loading) {
//       return SizedBox(
//         height: 32,
//         child: ElevatedButton(
//           onPressed: null,
//           style: ElevatedButton.styleFrom(
//               backgroundColor: Colors.grey.shade200,
//               padding: const EdgeInsets.symmetric(vertical: 6),
//               shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
//           child: const SizedBox(height: 14, width: 14,
//               child: CircularProgressIndicator(strokeWidth: 2)),
//         ),
//       );
//     }
//     return ElevatedButton.icon(
//       onPressed: _inFlight ? null : _toggle,
//       icon: _inFlight
//           ? const SizedBox(width: 14, height: 14,
//               child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
//           : Icon(_subscribed ? Icons.notifications_active : Icons.notifications_none, size: 15),
//       label: Text(_subscribed ? 'Notified' : 'Notify Me',
//           style: const TextStyle(fontSize: 12)),
//       style: ElevatedButton.styleFrom(
//         backgroundColor: _subscribed ? Colors.green.shade600 : Colors.orange.shade700,
//         foregroundColor: Colors.white,
//         padding: const EdgeInsets.symmetric(vertical: 6),
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
//       ),
//     );
//   }
// }

// // ── Skeleton Card ─────────────────────────────────────────────────────────────
// class _SkeletonCard extends StatefulWidget {
//   @override
//   State<_SkeletonCard> createState() => _SkeletonCardState();
// }

// class _SkeletonCardState extends State<_SkeletonCard>
//     with SingleTickerProviderStateMixin {
//   late AnimationController _ctrl;
//   late Animation<double>   _anim;

//   @override
//   void initState() {
//     super.initState();
//     _ctrl = AnimationController(
//         vsync: this, duration: const Duration(milliseconds: 900))
//       ..repeat(reverse: true);
//     _anim = Tween<double>(begin: 0.3, end: 0.7).animate(_ctrl);
//   }

//   @override
//   void dispose() { _ctrl.dispose(); super.dispose(); }

//   @override
//   Widget build(BuildContext context) {
//     return AnimatedBuilder(
//       animation: _anim,
//       builder: (_, __) => Card(
//         elevation: 2,
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
//         child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//           ClipRRect(
//             borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
//             child: Container(height: 130,
//                 color: Colors.grey.withValues(alpha: _anim.value)),
//           ),
//           const SizedBox(height: 8),
//           Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 8),
//             child: Container(
//                 height: 12, width: double.infinity,
//                 decoration: BoxDecoration(
//                     color: Colors.grey.withValues(alpha: _anim.value),
//                     borderRadius: BorderRadius.circular(6))),
//           ),
//           const SizedBox(height: 6),
//           Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 8),
//             child: Container(
//                 height: 12, width: 80,
//                 decoration: BoxDecoration(
//                     color: Colors.grey.withValues(alpha: _anim.value * 0.7),
//                     borderRadius: BorderRadius.circular(6))),
//           ),
//           const Spacer(),
//           Padding(
//             padding: const EdgeInsets.all(8),
//             child: Container(
//                 height: 32,
//                 decoration: BoxDecoration(
//                     color: Colors.grey.withValues(alpha: _anim.value),
//                     borderRadius: BorderRadius.circular(8))),
//           ),
//         ]),
//       ),
//     );
//   }
// }

// // ── Budget Filter Bottom Sheet ────────────────────────────────────────────────

// class _BudgetFilterSheet extends StatefulWidget {
//   final double?    initialMin;
//   final double?    initialMax;
//   final String     initialSort;
//   final void Function(double? min, double? max, String sort) onApply;
//   final VoidCallback onClear;

//   const _BudgetFilterSheet({
//     required this.initialMin,
//     required this.initialMax,
//     required this.initialSort,
//     required this.onApply,
//     required this.onClear,
//   });

//   @override
//   State<_BudgetFilterSheet> createState() => _BudgetFilterSheetState();
// }

// class _BudgetFilterSheetState extends State<_BudgetFilterSheet> {
//   late final TextEditingController _minCtrl;
//   late final TextEditingController _maxCtrl;
//   late String _sort;

//   static const _sortOptions = [
//     ('default',    'Relevance'),
//     ('price_asc',  'Price: Low to High'),
//     ('price_desc', 'Price: High to Low'),
//     ('name',       'Name: A to Z'),
//   ];

//   @override
//   void initState() {
//     super.initState();
//     _minCtrl = TextEditingController(text: widget.initialMin?.toInt().toString() ?? '');
//     _maxCtrl = TextEditingController(text: widget.initialMax?.toInt().toString() ?? '');
//     _sort    = widget.initialSort;
//   }

//   @override
//   void dispose() { _minCtrl.dispose(); _maxCtrl.dispose(); super.dispose(); }

//   void _apply() {
//     final min = double.tryParse(_minCtrl.text.trim());
//     final max = double.tryParse(_maxCtrl.text.trim());
//     Navigator.pop(context);
//     widget.onApply(min, max, _sort);
//   }

//   void _clear() {
//     Navigator.pop(context);
//     widget.onClear();
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Container(
//       decoration: const BoxDecoration(
//         color: Colors.white,
//         borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
//       padding: EdgeInsets.only(
//           left: 20, right: 20, top: 20,
//           bottom: MediaQuery.of(context).viewInsets.bottom + 24),
//       child: SingleChildScrollView(
//         child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
//           // Handle
//           Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
//               decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)))),

//           Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
//             const Text('Filter & Sort', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
//             TextButton(onPressed: _clear, child: const Text('Clear all', style: TextStyle(color: Colors.red))),
//           ]),

//           // ── Budget / Price range ────────────────────────────────────────
//           const SizedBox(height: 16),
//           Row(children: [
//             Icon(Icons.account_balance_wallet_outlined, color: Colors.blue.shade700, size: 18),
//             const SizedBox(width: 6),
//             const Text('Budget (Price Range)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
//           ]),
//           const SizedBox(height: 12),
//           Row(children: [
//             Expanded(child: TextField(
//               controller: _minCtrl,
//               keyboardType: TextInputType.number,
//               decoration: InputDecoration(
//                 labelText: 'Min price (\u20b9)',
//                 prefixText: '\u20b9',
//                 border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//                 contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
//             )),
//             const SizedBox(width: 12),
//             Expanded(child: TextField(
//               controller: _maxCtrl,
//               keyboardType: TextInputType.number,
//               decoration: InputDecoration(
//                 labelText: 'Max price (\u20b9)',
//                 prefixText: '\u20b9',
//                 border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//                 contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
//             )),
//           ]),

//           // Quick budget presets
//           const SizedBox(height: 10),
//           Wrap(spacing: 8, children: [
//             _budgetChip('Under \u20b9500',    null, 500),
//             _budgetChip('\u20b9500–\u20b91000', 500, 1000),
//             _budgetChip('\u20b91000–\u20b95000', 1000, 5000),
//             _budgetChip('Over \u20b95000',    5000, null),
//           ]),

//           // ── Sort ──────────────────────────────────────────────────────────
//           const SizedBox(height: 20),
//           Row(children: [
//             Icon(Icons.sort, color: Colors.blue.shade700, size: 18),
//             const SizedBox(width: 6),
//             const Text('Sort By', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
//           ]),
//           const SizedBox(height: 10),
//           ...(_sortOptions.map((opt) => RadioListTile<String>(
//             value: opt.$1,
//             groupValue: _sort,   // ignore: deprecated_member_use
//             title: Text(opt.$2),
//             onChanged: (v) => setState(() => _sort = v!),   // ignore: deprecated_member_use
//             activeColor: Colors.blue.shade700,
//             dense: true,
//             contentPadding: EdgeInsets.zero,
//           ))),

//           // ── Apply button ─────────────────────────────────────────────────
//           const SizedBox(height: 16),
//           SizedBox(
//             width: double.infinity, height: 50,
//             child: ElevatedButton(
//               onPressed: _apply,
//               style: ElevatedButton.styleFrom(
//                 backgroundColor: Colors.blue.shade700, foregroundColor: Colors.white,
//                 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
//               child: const Text('Apply Filters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
//             ),
//           ),
//         ]),
//       ),
//     );
//   }

//   Widget _budgetChip(String label, double? min, double? max) {
//     final selected = (_minCtrl.text == (min?.toInt().toString() ?? '') &&
//                      _maxCtrl.text == (max?.toInt().toString() ?? ''));
//     return GestureDetector(
//       onTap: () => setState(() {
//         _minCtrl.text = min?.toInt().toString() ?? '';
//         _maxCtrl.text = max?.toInt().toString() ?? '';
//       }),
//       child: Chip(
//         label: Text(label, style: TextStyle(
//             color: selected ? Colors.white : Colors.grey[700], fontSize: 12)),
//         backgroundColor: selected ? Colors.blue.shade700 : Colors.grey.shade100,
//         side: BorderSide(color: selected ? Colors.blue.shade700 : Colors.grey.shade300),
//         padding: const EdgeInsets.symmetric(horizontal: 4),
//         materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
//       ),
//     );
//   }
// }


import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../models/product_model.dart';
import '../../services/services.dart';
import '../../services/auth_service.dart';
import '../../services/activity_service.dart';
import '../../widgets/pin_detector_bar.dart';
import '../login_screen.dart';
import 'cart_screen.dart';
import 'orders_screen.dart';
import 'product_detail_screen.dart';
import 'refunds_screen.dart';
import 'wishlist_screen.dart';
import 'profile_screen.dart';
import 'spending_screen.dart';

class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({super.key});
  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  List<Product>              products          = [];
  List<String>               categories        = [];
  List<Map<String, dynamic>> banners           = [];
  String                     selectedCategory  = '';
  String                     searchQuery       = '';
  bool                       loading           = true;

  // ── Budget / Sort filter ────────────────────────────────────────────────────
  double?  _minPrice;
  double?  _maxPrice;
  String   _sortBy     = 'default';   // 'default' | 'price_asc' | 'price_desc' | 'name'
  bool     _filterActive = false;     // true when any price/sort filter is applied
  int                        cartCount         = 0;
  int                        _currentIndex     = 0;
  Set<int>                   wishlistIds       = {};
  final Set<int>             _togglingWishlist = {};
  final List<int>            _recentIds        = [];

  // ── Location / PIN ─────────────────────────────────────────────────────────
  // Mirrors the website's "user PIN" stored in localStorage / page state.
  // Null = no PIN set yet (auto-detection in progress or user hasn't set it).
  String? _userPin;

  // Search
  final searchCtrl              = TextEditingController();
  final FocusNode  _searchFocus = FocusNode();
  List<String>     _suggestions      = [];
  String           _fuzzySuggestion  = '';
  bool             _showSuggestions  = false;
  Timer?           _debounce;
  bool             _loadingSuggestions = false;
  final Map<String, List<String>> _suggestionCache = {};
  final Map<String, String>       _fuzzyCache      = {};

  // Overlay for suggestions (floats above all widgets — no overlap)
  OverlayEntry? _overlayEntry;
  final LayerLink _layerLink = LayerLink();
  final GlobalKey _searchKey = GlobalKey();

  // Banner
  late PageController _bannerCtrl;
  int    _bannerPage = 0;
  Timer? _bannerTimer;

  // Scroll-to-top
  final ScrollController _homeScroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _bannerCtrl = PageController();
    _loadData(showSkeleton: true);
    _searchFocus.addListener(_onFocusChange);
    ActivityService.pageView('home');
  }

  @override
  void dispose() {
    _removeOverlay();
    searchCtrl.dispose();
    _searchFocus.dispose();
    _bannerCtrl.dispose();
    _homeScroll.dispose();
    _bannerTimer?.cancel();
    _debounce?.cancel();
    ActivityService.flushNow(); // flush buffered events on screen exit
    super.dispose();
  }

  void _onFocusChange() {
    if (!_searchFocus.hasFocus) {
      _removeOverlay();
      setState(() => _showSuggestions = false);
    }
  }

  // ── Overlay management ───────────────────────────────────────────────────
  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _buildAndShowOverlay() {
    _removeOverlay();
    if (_suggestions.isEmpty) return;

    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        width: _getSearchBarWidth(),
        child: CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: const Offset(0, 58),
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(8),
            shadowColor: Colors.black26,
            child: Container(
              constraints: const BoxConstraints(maxHeight: 220),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: _suggestions.length,
                separatorBuilder: (_, __) =>
                    Divider(height: 1, color: Colors.grey.shade100),
                itemBuilder: (_, i) {
                  final s = _suggestions[i];
                  return ListTile(
                    dense: true,
                    leading: Icon(Icons.search, size: 18, color: Colors.grey.shade500),
                    title: _highlightMatch(s, searchCtrl.text),
                    trailing: IconButton(
                      icon: Icon(Icons.north_west, size: 14, color: Colors.grey.shade400),
                      onPressed: () {
                        searchCtrl.text = s;
                        searchCtrl.selection = TextSelection.fromPosition(
                            TextPosition(offset: s.length));
                        _removeOverlay();
                        setState(() => _showSuggestions = false);
                      },
                    ),
                    onTap: () => _submitSearch(s),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );

    Overlay.of(context).insert(_overlayEntry!);
  }

  double _getSearchBarWidth() {
    final RenderBox? box =
        _searchKey.currentContext?.findRenderObject() as RenderBox?;
    return box?.size.width ?? (MediaQuery.of(context).size.width - 24);
  }

  void _startBannerAutoScroll() {
    _bannerTimer?.cancel();
    if (banners.length <= 1) return;
    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!_bannerCtrl.hasClients) return;
      final next = (_bannerPage + 1) % banners.length;
      _bannerCtrl.animateToPage(next,
          duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
    });
  }

  Future<void> _loadData({bool showSkeleton = false}) async {
    if (showSkeleton) setState(() => loading = true);
    final results = await Future.wait([
      ProductService.getProducts(
        search:    searchQuery.isNotEmpty      ? searchQuery      : null,
        category:  selectedCategory.isNotEmpty ? selectedCategory : null,
        minPrice:  _minPrice,
        maxPrice:  _maxPrice,
        sortBy:    _sortBy != 'default'        ? _sortBy          : null,
      ),
      ProductService.getCategories(),
      CartService.getCart(),
      WishlistService.getWishlistIds(),
      BannerService.getBanners(),
    ]);
    if (!mounted) return;
    setState(() {
      products    = results[0] as List<Product>;
      final cats  = results[1] as List<String>;
      if (cats.isNotEmpty) categories = ['All', ...cats];
      cartCount   = ((results[2] as Map)['count'] ?? 0) as int;
      wishlistIds = results[3] as Set<int>;
      banners     = results[4] as List<Map<String, dynamic>>;
      loading     = false;
    });
    _startBannerAutoScroll();
  }

  // ── Smart search ─────────────────────────────────────────────────────────
  void _onSearchChanged(String value) {
    _debounce?.cancel();
    if (value.trim().isEmpty) {
      _removeOverlay();
      setState(() {
        _suggestions     = [];
        _fuzzySuggestion = '';
        _showSuggestions = false;
        _loadingSuggestions = false;
      });
      return;
    }
    final query = value.trim();
    if (_suggestionCache.containsKey(query)) {
      setState(() {
        _suggestions     = _suggestionCache[query]!;
        _fuzzySuggestion = _fuzzyCache[query] ?? '';
        _showSuggestions = _searchFocus.hasFocus && _suggestions.isNotEmpty;
        _loadingSuggestions = false;
      });
      if (_showSuggestions) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _buildAndShowOverlay());
      } else {
        _removeOverlay();
      }
      return;
    }
    setState(() => _loadingSuggestions = true);
    _debounce = Timer(const Duration(milliseconds: 200), () async {
      final results = await Future.wait([
        SearchService.getSuggestions(query),
        SearchService.getFuzzySuggestion(query),
      ]);
      if (!mounted) return;
      final sugs  = results[0] as List<String>;
      final fuzzy = results[1] as String;
      _suggestionCache[query] = sugs;
      _fuzzyCache[query]      = fuzzy;
      setState(() {
        _suggestions        = sugs;
        _fuzzySuggestion    = fuzzy;
        _showSuggestions    = _searchFocus.hasFocus && sugs.isNotEmpty;
        _loadingSuggestions = false;
      });
      if (_showSuggestions) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _buildAndShowOverlay());
      } else {
        _removeOverlay();
      }
    });
  }

  void _submitSearch(String query) {
    _removeOverlay();
    _searchFocus.unfocus();
    final trimmed = query.trim();
    setState(() {
      searchQuery      = trimmed;
      _showSuggestions = false;
      _suggestions     = [];
      _fuzzySuggestion = '';
    });
    searchCtrl.text = trimmed;
    if (trimmed.isNotEmpty) ActivityService.search(trimmed);
    _scrollToTop();
    _loadData();
  }

  void _scrollToTop() {
    if (_homeScroll.hasClients) {
      _homeScroll.animateTo(0,
          duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    }
  }

  void _selectCategory(String cat) {
    final next = cat == 'All' ? '' : cat;
    if (next == selectedCategory) return;
    setState(() => selectedCategory = next);
    _scrollToTop();
    _loadData();
  }

  Future<void> _toggleWishlist(Product p) async {
    if (_togglingWishlist.contains(p.id)) return;
    final was = wishlistIds.contains(p.id);
    setState(() {
      _togglingWishlist.add(p.id);
      was ? wishlistIds.remove(p.id) : wishlistIds.add(p.id);
    });
    final res = await WishlistService.toggle(p.id);
    if (!mounted) return;
    if (res['success'] != true) {
      setState(() => was ? wishlistIds.add(p.id) : wishlistIds.remove(p.id));
      _snack(res['message'] ?? 'Wishlist update failed', Colors.red);
    }
    setState(() => _togglingWishlist.remove(p.id));
  }

  void _recordView(int id) {
    _recentIds.remove(id);
    _recentIds.insert(0, id);
    if (_recentIds.length > 10) _recentIds.removeLast();
  }

  List<Product> get _recentProducts => _recentIds
      .take(6)
      .map((id) {
        final match = products.where((p) => p.id == id).toList();
        return match.isNotEmpty ? match.first : null;
      })
      .whereType<Product>()
      .toList();

  Future<void> _addToCart(Product p) async {
    final res = await CartService.addToCart(p.id, 1);
    if (!mounted) return;
    _snack(
      res['success'] == true ? '${p.name} added to cart!' : res['message'] ?? 'Failed',
      res['success'] == true ? Colors.green : Colors.red,
    );
    if (res['success'] == true) setState(() => cartCount++);
  }

  Future<void> _openProduct(Product p) async {
    _recordView(p.id);
    await Navigator.push(context,
        MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)));
    final ids = await WishlistService.getWishlistIds();
    if (mounted) setState(() => wishlistIds = ids);
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2)));
  }

  // ── Open Cart as a full page (via header icon) ────────────────────────────
  Future<void> _openCartPage() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(
            title: const Text('My Cart',
                style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: Colors.blue.shade700,
            foregroundColor: Colors.white,
          ),
          // UniqueKey forces CartScreen to rebuild fresh every time
          body: CartScreen(
            key: UniqueKey(),
            onCartChanged: (c) {
              if (mounted) setState(() => cartCount = c);
            },
          ),
        ),
      ),
    );
    // Refresh cart count after returning from cart page
    if (mounted) {
      final res = await CartService.getCart();
      if (mounted) setState(() => cartCount = (res['count'] ?? 0) as int);
    }
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser;

    // Tabs: Home | Categories | Orders | Wishlist | Profile
    // Cart is REMOVED from bottom nav — accessible via header icon only
    final tabs = [
      _buildHomeTab(),
      _buildCategoriesTab(),
      const OrdersScreen(),
      WishlistScreen(key: ValueKey('wishlist_${_currentIndex == 3}')),
      _buildProfileTab(user?.name ?? 'User', user?.email ?? ''),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Row(children: [
          Icon(Icons.shopping_bag, color: Colors.white),
          SizedBox(width: 8),
          Text('Ekart', style: TextStyle(fontWeight: FontWeight.bold)),
        ]),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        actions: [
          // ── Indian Flag Badge (matches website navbar) ──────────────────
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0x14FF9933),          // saffron @ 8% opacity
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: const Color(0x73FF9933), width: 1), // saffron @ 45%
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                // ── SVG Indian flag (22×16, matches website exactly) ──────
                SizedBox(
                  width: 22, height: 16,
                  child: CustomPaint(painter: _IndiaFlagPainter()),
                ),
                const SizedBox(width: 5),
                const Text('India',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                        letterSpacing: 0.4)),
              ]),
            ),
          ),
          // Cart icon in header with badge
          Stack(children: [
            IconButton(
              icon: const Icon(Icons.shopping_cart),
              onPressed: _openCartPage,
              tooltip: 'Cart',
            ),
            if (cartCount > 0)
              Positioned(
                right: 6, top: 6,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                      color: Colors.red, shape: BoxShape.circle),
                  child: Text('$cartCount',
                      style: const TextStyle(color: Colors.white, fontSize: 10)),
                ),
              ),
          ]),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: tabs,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) {
          if (i == 0 && _currentIndex == 0) {
            _scrollToTop();
            _loadData();
          } else {
            setState(() => _currentIndex = i);
          }
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.blue.shade700,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.category), label: 'Categories'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long), label: 'Orders'),
          BottomNavigationBarItem(icon: Icon(Icons.favorite_border), label: 'Wishlist'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  // ── Home Tab ──────────────────────────────────────────────────────────────
  Widget _buildHomeTab() {
    return Column(children: [
      // Search bar using CompositedTransformTarget + Overlay
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
        child: CompositedTransformTarget(
          link: _layerLink,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextField(
              key: _searchKey,
              controller: searchCtrl,
              focusNode: _searchFocus,
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          searchCtrl.clear();
                          _removeOverlay();
                          setState(() {
                            searchQuery      = '';
                            _suggestions     = [];
                            _fuzzySuggestion = '';
                            _showSuggestions = false;
                          });
                          _scrollToTop();
                          _loadData();
                        })
                    : _loadingSuggestions
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: SizedBox(
                                width: 16, height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2)))
                        : null,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(30)),
                filled: true,
                fillColor: Colors.white,
              ),
              onChanged: _onSearchChanged,
              onSubmitted: _submitSearch,
              textInputAction: TextInputAction.search,
            ),

            // Fuzzy suggestion banner — inline, never overlaps anything
            if (_fuzzySuggestion.isNotEmpty && searchCtrl.text.isNotEmpty)
              GestureDetector(
                onTap: () => _submitSearch(_fuzzySuggestion),
                child: Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    border: Border.all(color: Colors.orange.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(children: [
                    Icon(Icons.spellcheck, size: 16, color: Colors.orange.shade700),
                    const SizedBox(width: 6),
                    Text('Did you mean: ',
                        style: TextStyle(color: Colors.orange.shade800, fontSize: 13)),
                    Text(_fuzzySuggestion,
                        style: TextStyle(
                            color: Colors.orange.shade900, fontSize: 13,
                            fontWeight: FontWeight.bold,
                            decoration: TextDecoration.underline)),
                    const Spacer(),
                    Icon(Icons.arrow_forward_ios, size: 12, color: Colors.orange.shade600),
                  ]),
                ),
              ),
          ]),
        ),
      ),

      // ── Location / PIN bar ───────────────────────────────────────────────
      // Mirrors the website's auto-detection + manual PIN entry banner.
      // Calls /api/geocode/auto on first load (IP-based, silent — no permission needed).
      // User can tap to enter PIN manually or use GPS.
      // When PIN changes → _userPin updates → product grid re-renders with
      // "Not delivering to your area" overlay on restricted products (matches website).
      PinDetectorBar(
        autoDetectOnInit: true,
        onPinChanged: (pin) {
          if (mounted) setState(() => _userPin = pin);
        },
      ),

      // Category chips
      if (categories.isNotEmpty)
        SizedBox(
          height: 50,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            itemCount: categories.length,
            itemBuilder: (_, i) {
              final cat      = categories[i];
              final selected = cat == 'All'
                  ? selectedCategory.isEmpty
                  : selectedCategory == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: InkWell(
                  onTap: () => _selectCategory(cat),
                  borderRadius: BorderRadius.circular(20),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected ? Colors.blue.shade700 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: selected ? Colors.blue.shade700 : Colors.grey.shade300),
                    ),
                    child: Text(cat,
                        style: TextStyle(
                            color: selected ? Colors.white : Colors.black87,
                            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                            fontSize: 13)),
                  ),
                ),
              );
            },
          ),
        ),

      // ── Budget & Sort filter bar ────────────────────────────────────────
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
        child: Row(children: [
          Expanded(
            child: GestureDetector(
              onTap: _showBudgetFilterSheet,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _filterActive ? Colors.blue.shade700 : Colors.white,
                  border: Border.all(color: _filterActive ? Colors.blue.shade700 : Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.08), blurRadius: 4)]),
                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.tune, size: 16,
                      color: _filterActive ? Colors.white : Colors.grey.shade700),
                  const SizedBox(width: 6),
                  Text(_filterActive ? _activeFilterLabel() : 'Filter & Sort',
                      style: TextStyle(
                          color: _filterActive ? Colors.white : Colors.grey.shade700,
                          fontWeight: FontWeight.w600, fontSize: 13)),
                  if (_filterActive) ...[
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: _clearFilters,
                      child: const Icon(Icons.close, size: 14, color: Colors.white)),
                  ],
                ]),
              ),
            ),
          ),
        ]),
      ),

      Expanded(child: _buildProductGrid()),
    ]);
  }

  // ── Budget / Sort helpers ─────────────────────────────────────────────────

  String _activeFilterLabel() {
    final parts = <String>[];
    if (_minPrice != null || _maxPrice != null) {
      final lo = _minPrice != null ? '\u20b9${_minPrice!.toInt()}' : '';
      final hi = _maxPrice != null ? '\u20b9${_maxPrice!.toInt()}' : '';
      parts.add(lo.isNotEmpty && hi.isNotEmpty ? '$lo–$hi' : (lo.isNotEmpty ? '>$lo' : '<$hi'));
    }
    if (_sortBy != 'default') {
      switch (_sortBy) {
        case 'price_asc':  parts.add('Price \u2191'); break;
        case 'price_desc': parts.add('Price \u2193'); break;
        case 'name':       parts.add('A–Z');          break;
      }
    }
    return parts.join(' · ');
  }

  void _clearFilters() {
    setState(() { _minPrice = null; _maxPrice = null; _sortBy = 'default'; _filterActive = false; });
    _loadData();
  }

  void _showBudgetFilterSheet() async {
    double? tmpMin  = _minPrice;
    double? tmpMax  = _maxPrice;
    String  tmpSort = _sortBy;

    await showModalBottomSheet(
      context: context, isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BudgetFilterSheet(
        initialMin:  tmpMin,
        initialMax:  tmpMax,
        initialSort: tmpSort,
        onApply: (min, max, sort) {
          setState(() {
            _minPrice     = min;
            _maxPrice     = max;
            _sortBy       = sort;
            _filterActive = (min != null || max != null || sort != 'default');
          });
          _loadData();
        },
        onClear: _clearFilters,
      ),
    );
  }

  // ── Categories Tab ────────────────────────────────────────────────────────
  Widget _buildCategoriesTab() {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final displayCats = categories.where((c) => c != 'All').toList();

    if (displayCats.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.category_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 12),
          Text('No categories available',
              style: TextStyle(color: Colors.grey[500], fontSize: 16)),
        ]),
      );
    }

    final List<Color> catColors = [
      Colors.blue.shade100,
      Colors.green.shade100,
      Colors.orange.shade100,
      Colors.purple.shade100,
      Colors.red.shade100,
      Colors.teal.shade100,
      Colors.pink.shade100,
      Colors.amber.shade100,
      Colors.indigo.shade100,
      Colors.cyan.shade100,
    ];
    final List<Color> catTextColors = [
      Colors.blue.shade700,
      Colors.green.shade700,
      Colors.orange.shade700,
      Colors.purple.shade700,
      Colors.red.shade700,
      Colors.teal.shade700,
      Colors.pink.shade700,
      Colors.amber.shade800,
      Colors.indigo.shade700,
      Colors.cyan.shade800,
    ];
    final List<IconData> catIcons = [
      Icons.phone_android,
      Icons.checkroom,
      Icons.home,
      Icons.sports_esports,
      Icons.book,
      Icons.kitchen,
      Icons.fitness_center,
      Icons.face,
      Icons.toys,
      Icons.more_horiz,
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            'Shop by Category',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade800,
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadData,
            child: GridView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.35,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: displayCats.length,
              itemBuilder: (_, i) {
                final cat       = displayCats[i];
                final color     = catColors[i % catColors.length];
                final textColor = catTextColors[i % catTextColors.length];
                final icon      = catIcons[i % catIcons.length];

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      selectedCategory = cat;
                      _currentIndex    = 0; // switch to Home tab filtered by category
                    });
                    _scrollToTop();
                    _loadData();
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.6),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(icon, color: textColor, size: 28),
                        ),
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            cat,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: textColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _highlightMatch(String suggestion, String query) {
    final lower  = suggestion.toLowerCase();
    final qLower = query.toLowerCase().trim();
    final idx    = lower.indexOf(qLower);
    if (idx == -1 || qLower.isEmpty) {
      return Text(suggestion, style: const TextStyle(fontSize: 14));
    }
    return RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 14, color: Colors.black87),
        children: [
          TextSpan(text: suggestion.substring(0, idx)),
          TextSpan(
              text: suggestion.substring(idx, idx + qLower.length),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          TextSpan(text: suggestion.substring(idx + qLower.length)),
        ],
      ),
    );
  }

  Widget _buildProductGrid() {
    if (loading) return _buildSkeleton();

    if (products.isEmpty && banners.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.search_off, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text('No products found',
              style: TextStyle(fontSize: 18, color: Colors.grey[600])),
          if (searchQuery.isNotEmpty || selectedCategory.isNotEmpty) ...[
            const SizedBox(height: 12),
            TextButton(
              onPressed: () {
                searchCtrl.clear();
                setState(() { searchQuery = ''; selectedCategory = ''; });
                _scrollToTop();
                _loadData();
              },
              child: const Text('Clear filters'),
            ),
          ],
        ]),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: CustomScrollView(
        controller: _homeScroll,
        slivers: [
          if (banners.isNotEmpty && searchQuery.isEmpty && selectedCategory.isEmpty)
            SliverToBoxAdapter(child: _buildBannerCarousel()),

          if (_recentProducts.isNotEmpty && searchQuery.isEmpty)
            SliverToBoxAdapter(child: _buildRecentlyViewed()),

          if (products.isEmpty)
            SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(children: [
                    Icon(Icons.search_off, size: 64, color: Colors.grey[400]),
                    const SizedBox(height: 12),
                    Text('No products found',
                        style: TextStyle(fontSize: 16, color: Colors.grey[600])),
                    TextButton(
                      onPressed: () {
                        searchCtrl.clear();
                        setState(() { searchQuery = ''; selectedCategory = ''; });
                        _loadData();
                      },
                      child: const Text('Clear filters'),
                    ),
                  ]),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.all(12),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2, childAspectRatio: 0.60,
                  crossAxisSpacing: 12, mainAxisSpacing: 12,
                ),
                delegate: SliverChildBuilderDelegate(
                  (_, i) => _buildProductCard(products[i]),
                  childCount: products.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBannerCarousel() {
    return Column(children: [
      SizedBox(
        height: 180,
        child: PageView.builder(
          controller: _bannerCtrl,
          itemCount: banners.length,
          physics: const BouncingScrollPhysics(),
          onPageChanged: (i) {
            _bannerTimer?.cancel();
            setState(() => _bannerPage = i);
            _startBannerAutoScroll();
          },
          itemBuilder: (_, i) {
            final b      = banners[i];
            final imgUrl = (b['imageUrl'] ?? '') as String;
            final title  = (b['title']    ?? '') as String;
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.10),
                      blurRadius: 8, offset: const Offset(0, 3)),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Stack(fit: StackFit.expand, children: [
                  imgUrl.isNotEmpty
                      ? Image.network(imgUrl, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _bannerPlaceholder(title))
                      : _bannerPlaceholder(title),
                  if (title.isNotEmpty)
                    Positioned(
                      bottom: 0, left: 0, right: 0,
                      child: Container(
                        padding: const EdgeInsets.fromLTRB(12, 24, 12, 12),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.55),
                              Colors.transparent,
                            ],
                          ),
                        ),
                        child: Text(title,
                            style: const TextStyle(
                                color: Colors.white, fontWeight: FontWeight.bold,
                                fontSize: 15,
                                shadows: [Shadow(blurRadius: 4, color: Colors.black45)])),
                      ),
                    ),
                  if (banners.length > 1) ...[
                    if (_bannerPage > 0)
                      Positioned(
                        left: 6, top: 0, bottom: 0,
                        child: Center(child: Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.28),
                              shape: BoxShape.circle),
                          child: const Icon(Icons.chevron_left, color: Colors.white, size: 20),
                        )),
                      ),
                    if (_bannerPage < banners.length - 1)
                      Positioned(
                        right: 6, top: 0, bottom: 0,
                        child: Center(child: Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.28),
                              shape: BoxShape.circle),
                          child: const Icon(Icons.chevron_right, color: Colors.white, size: 20),
                        )),
                      ),
                  ],
                ]),
              ),
            );
          },
        ),
      ),
      if (banners.length > 1)
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 2),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(banners.length, (i) => GestureDetector(
              onTap: () => _bannerCtrl.animateToPage(i,
                  duration: const Duration(milliseconds: 300), curve: Curves.easeInOut),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: _bannerPage == i ? 18 : 7,
                height: 7,
                decoration: BoxDecoration(
                  color: _bannerPage == i ? Colors.blue.shade700 : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            )),
          ),
        ),
    ]);
  }

  Widget _bannerPlaceholder(String title) => Container(
    color: Colors.blue.shade100,
    child: Center(child: Text(title.isNotEmpty ? title : 'Ekart Offer',
        style: TextStyle(color: Colors.blue.shade700,
            fontWeight: FontWeight.bold, fontSize: 18))),
  );

  Widget _buildRecentlyViewed() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(
        padding: EdgeInsets.fromLTRB(14, 12, 14, 6),
        child: Text('Recently Viewed',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      ),
      SizedBox(
        height: 110,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: _recentProducts.length,
          itemBuilder: (_, i) {
            final p = _recentProducts[i];
            return GestureDetector(
              onTap: () => _openProduct(p),
              child: Container(
                width: 80,
                margin: const EdgeInsets.only(right: 10),
                child: Column(children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: p.imageLink.isNotEmpty
                        ? Image.network(p.imageLink,
                            width: 80, height: 80, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                                width: 80, height: 80, color: Colors.grey[200],
                                child: const Icon(Icons.image)))
                        : Container(width: 80, height: 80, color: Colors.grey[200],
                            child: const Icon(Icons.image)),
                  ),
                  const SizedBox(height: 4),
                  Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10)),
                ]),
              ),
            );
          },
        ),
      ),
      const Divider(height: 1),
    ]);
  }

  Widget _buildProductCard(Product p) {
    final wishlisted   = wishlistIds.contains(p.id);
    final isToggling   = _togglingWishlist.contains(p.id);
    final isOutOfStock = p.stock <= 0;

    // ── PIN deliverability check ──────────────────────────────────────────────
    // Mirrors the website's JS applyPinFilter() which shows a "pin-unavail-overlay"
    // on cards where product.allowedPinCodes doesn't include the user's PIN.
    // Logic: if product has no restriction → always deliverable.
    //        if user has no PIN yet → don't block (give benefit of the doubt).
    //        otherwise → check if userPin is in allowedPinCodes.
    final bool isPinUnavailable = _userPin != null &&
        _userPin!.isNotEmpty &&
        p.isRestrictedByPinCode &&
        !p.isDeliverableTo(_userPin);

    return GestureDetector(
      onTap: () => _openProduct(p),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Stack(children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: p.imageLink.isNotEmpty
                  ? Image.network(p.imageLink,
                      height: 130, width: double.infinity, fit: BoxFit.cover,
                      frameBuilder: (ctx, child, frame, _) => AnimatedOpacity(
                        opacity: frame == null ? 0 : 1,
                        duration: const Duration(milliseconds: 200),
                        child: child,
                      ),
                      errorBuilder: (_, __, ___) => Container(
                          height: 130, color: Colors.grey[200],
                          child: const Icon(Icons.image_not_supported, size: 40)))
                  : Container(height: 130, color: Colors.grey[200],
                      child: const Icon(Icons.image, size: 40)),
            ),
            if (isOutOfStock)
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  child: Container(
                    color: Colors.black.withValues(alpha: 0.38),
                    alignment: Alignment.center,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                          color: Colors.red.shade700,
                          borderRadius: BorderRadius.circular(6)),
                      child: const Text('OUT OF STOCK',
                          style: TextStyle(color: Colors.white, fontSize: 10,
                              fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                    ),
                  ),
                ),
              ),

            // ── PIN unavailability overlay ──────────────────────────────────
            // Mirrors the website's .pin-unavail-overlay on customer-home.html.
            // Shown when user's PIN is set and this product doesn't ship there.
            if (isPinUnavailable)
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  child: Container(
                    color: Colors.black.withValues(alpha: 0.55),
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                              color: Colors.orange.shade700,
                              borderRadius: BorderRadius.circular(6)),
                          child: const Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(Icons.schedule, color: Colors.white, size: 12),
                            SizedBox(width: 4),
                            Text('Available Very Soon',
                                style: TextStyle(color: Colors.white, fontSize: 10,
                                    fontWeight: FontWeight.bold)),
                          ]),
                        ),
                        const SizedBox(height: 4),
                        const Text('Not delivering to your\nPIN code yet',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.white70, fontSize: 9)),
                      ],
                    ),
                  ),
                ),
              ),
            Positioned(
              top: 4, right: 4,
              child: GestureDetector(
                onTap: () => _toggleWishlist(p),
                child: Container(
                  width: 32, height: 32,
                  decoration: const BoxDecoration(
                    color: Colors.white, shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
                  ),
                  child: isToggling
                      ? const Center(child: SizedBox(width: 14, height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red)))
                      : Icon(wishlisted ? Icons.favorite : Icons.favorite_border,
                          size: 18, color: wishlisted ? Colors.red : Colors.grey[500]),
                ),
              ),
            ),
            if (p.isDiscounted)
              Positioned(
                top: 4, left: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                      color: Colors.red, borderRadius: BorderRadius.circular(8)),
                  child: Text('${p.discountPercent}% OFF',
                      style: const TextStyle(color: Colors.white, fontSize: 10,
                          fontWeight: FontWeight.bold)),
                ),
              ),
          ]),

          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 2),
            child: Text(p.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(children: [
              Text('₹${p.price.toStringAsFixed(2)}',
                  style: TextStyle(color: Colors.blue.shade700,
                      fontWeight: FontWeight.bold, fontSize: 14)),
              if (p.isDiscounted) ...[
                const SizedBox(width: 6),
                Text('₹${p.mrp.toStringAsFixed(0)}',
                    style: const TextStyle(
                        decoration: TextDecoration.lineThrough,
                        color: Colors.grey, fontSize: 11)),
              ],
            ]),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
            child: SizedBox(
              width: double.infinity,
              child: isOutOfStock
                  ? _NotifyMeButton(productId: p.id)
                  : isPinUnavailable
                      // PIN unavailable: show a muted "Not in your area" button
                      ? OutlinedButton.icon(
                          onPressed: () => _openProduct(p), // let them see detail anyway
                          icon: Icon(Icons.location_off, size: 13,
                              color: Colors.orange.shade700),
                          label: Text('Not in your area',
                              style: TextStyle(fontSize: 11,
                                  color: Colors.orange.shade700)),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.orange.shade300),
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8)),
                          ),
                        )
                      : ElevatedButton.icon(
                          onPressed: () => _addToCart(p),
                          icon: const Icon(Icons.add_shopping_cart, size: 15),
                          label: const Text('Add to Cart', style: TextStyle(fontSize: 12)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue.shade700,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _buildProfileTab(String name, String email) {
    return ListView(padding: const EdgeInsets.all(20), children: [
      CircleAvatar(
        radius: 48,
        backgroundColor: Colors.blue.shade100,
        child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
            style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold,
                color: Colors.blue.shade700)),
      ),
      const SizedBox(height: 16),
      Text(name, textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
      Text(email, textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey[600])),
      const SizedBox(height: 28),
      _profileTile(Icons.person_outline, 'Edit Profile',
          () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()))),
      _profileTile(Icons.receipt_long, 'My Orders', () => setState(() => _currentIndex = 2)),
      _profileTile(Icons.shopping_cart, 'My Cart', _openCartPage),
      _profileTile(Icons.favorite_border, 'Wishlist', () => setState(() => _currentIndex = 3)),
      _profileTile(Icons.assignment_return_outlined, 'My Refunds',
          () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RefundsScreen()))),
      _profileTile(Icons.analytics_outlined, 'My Spending',
          () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SpendingScreen()))),
      const Divider(),
      _profileTile(Icons.logout, 'Logout', () {
        ActivityService.flushNow();
        AuthService.logout();
        Navigator.pushAndRemoveUntil(context,
            MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
      }, color: Colors.red),
    ]);
  }

  Widget _profileTile(IconData icon, String title, VoidCallback onTap, {Color? color}) {
    return ListTile(
      leading: Icon(icon, color: color ?? Colors.blue.shade700),
      title: Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  Widget _buildSkeleton() {
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, childAspectRatio: 0.62,
        crossAxisSpacing: 12, mainAxisSpacing: 12,
      ),
      itemCount: 6,
      itemBuilder: (_, __) => _SkeletonCard(),
    );
  }
}

// ── Notify Me Button ──────────────────────────────────────────────────────────
class _NotifyMeButton extends StatefulWidget {
  final int productId;
  const _NotifyMeButton({required this.productId});
  @override
  State<_NotifyMeButton> createState() => _NotifyMeButtonState();
}

class _NotifyMeButtonState extends State<_NotifyMeButton> {
  bool _subscribed = false;
  bool _loading    = true;
  bool _inFlight   = false;

  @override
  void initState() { super.initState(); _checkStatus(); }

  Future<void> _checkStatus() async {
    final sub = await NotifyMeService.isSubscribed(widget.productId);
    if (mounted) setState(() { _subscribed = sub; _loading = false; });
  }

  Future<void> _toggle() async {
    if (_inFlight) return;
    final wasSubscribed = _subscribed;
    setState(() => _inFlight = true);
    final res = wasSubscribed
        ? await NotifyMeService.unsubscribe(widget.productId)
        : await NotifyMeService.subscribe(widget.productId);
    if (mounted) {
      setState(() {
        _inFlight = false;
        if (res['success'] == true) _subscribed = !wasSubscribed;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['message'] ??
            (!wasSubscribed ? 'You will be notified!' : 'Notification removed')),
        backgroundColor: res['success'] == true ? Colors.green : Colors.red,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return SizedBox(
        height: 32,
        child: ElevatedButton(
          onPressed: null,
          style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey.shade200,
              padding: const EdgeInsets.symmetric(vertical: 6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
          child: const SizedBox(height: 14, width: 14,
              child: CircularProgressIndicator(strokeWidth: 2)),
        ),
      );
    }
    return ElevatedButton.icon(
      onPressed: _inFlight ? null : _toggle,
      icon: _inFlight
          ? const SizedBox(width: 14, height: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : Icon(_subscribed ? Icons.notifications_active : Icons.notifications_none, size: 15),
      label: Text(_subscribed ? 'Notified' : 'Notify Me',
          style: const TextStyle(fontSize: 12)),
      style: ElevatedButton.styleFrom(
        backgroundColor: _subscribed ? Colors.green.shade600 : Colors.orange.shade700,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
class _SkeletonCard extends StatefulWidget {
  @override
  State<_SkeletonCard> createState() => _SkeletonCardState();
}

class _SkeletonCardState extends State<_SkeletonCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double>   _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.3, end: 0.7).animate(_ctrl);
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            child: Container(height: 130,
                color: Colors.grey.withValues(alpha: _anim.value)),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Container(
                height: 12, width: double.infinity,
                decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: _anim.value),
                    borderRadius: BorderRadius.circular(6))),
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Container(
                height: 12, width: 80,
                decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: _anim.value * 0.7),
                    borderRadius: BorderRadius.circular(6))),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Container(
                height: 32,
                decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: _anim.value),
                    borderRadius: BorderRadius.circular(8))),
          ),
        ]),
      ),
    );
  }
}

// ── Budget Filter Bottom Sheet ────────────────────────────────────────────────

class _BudgetFilterSheet extends StatefulWidget {
  final double?    initialMin;
  final double?    initialMax;
  final String     initialSort;
  final void Function(double? min, double? max, String sort) onApply;
  final VoidCallback onClear;

  const _BudgetFilterSheet({
    required this.initialMin,
    required this.initialMax,
    required this.initialSort,
    required this.onApply,
    required this.onClear,
  });

  @override
  State<_BudgetFilterSheet> createState() => _BudgetFilterSheetState();
}

class _BudgetFilterSheetState extends State<_BudgetFilterSheet> {
  late final TextEditingController _minCtrl;
  late final TextEditingController _maxCtrl;
  late String _sort;

  static const _sortOptions = [
    ('default',    'Relevance'),
    ('price_asc',  'Price: Low to High'),
    ('price_desc', 'Price: High to Low'),
    ('name',       'Name: A to Z'),
  ];

  @override
  void initState() {
    super.initState();
    _minCtrl = TextEditingController(text: widget.initialMin?.toInt().toString() ?? '');
    _maxCtrl = TextEditingController(text: widget.initialMax?.toInt().toString() ?? '');
    _sort    = widget.initialSort;
  }

  @override
  void dispose() { _minCtrl.dispose(); _maxCtrl.dispose(); super.dispose(); }

  void _apply() {
    final min = double.tryParse(_minCtrl.text.trim());
    final max = double.tryParse(_maxCtrl.text.trim());
    Navigator.pop(context);
    widget.onApply(min, max, _sort);
  }

  void _clear() {
    Navigator.pop(context);
    widget.onClear();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Handle
          Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)))),

          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Filter & Sort', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            TextButton(onPressed: _clear, child: const Text('Clear all', style: TextStyle(color: Colors.red))),
          ]),

          // ── Budget / Price range ────────────────────────────────────────
          const SizedBox(height: 16),
          Row(children: [
            Icon(Icons.account_balance_wallet_outlined, color: Colors.blue.shade700, size: 18),
            const SizedBox(width: 6),
            const Text('Budget (Price Range)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(
              controller: _minCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Min price (\u20b9)',
                prefixText: '\u20b9',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            )),
            const SizedBox(width: 12),
            Expanded(child: TextField(
              controller: _maxCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Max price (\u20b9)',
                prefixText: '\u20b9',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            )),
          ]),

          // Quick budget presets
          const SizedBox(height: 10),
          Wrap(spacing: 8, children: [
            _budgetChip('Under \u20b9500',    null, 500),
            _budgetChip('\u20b9500–\u20b91000', 500, 1000),
            _budgetChip('\u20b91000–\u20b95000', 1000, 5000),
            _budgetChip('Over \u20b95000',    5000, null),
          ]),

          // ── Sort ──────────────────────────────────────────────────────────
          const SizedBox(height: 20),
          Row(children: [
            Icon(Icons.sort, color: Colors.blue.shade700, size: 18),
            const SizedBox(width: 6),
            const Text('Sort By', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          ]),
          const SizedBox(height: 10),
          ...(_sortOptions.map((opt) => RadioListTile<String>(
            value: opt.$1,
            groupValue: _sort,   // ignore: deprecated_member_use
            title: Text(opt.$2),
            onChanged: (v) => setState(() => _sort = v!),   // ignore: deprecated_member_use
            activeColor: Colors.blue.shade700,
            dense: true,
            contentPadding: EdgeInsets.zero,
          ))),

          // ── Apply button ─────────────────────────────────────────────────
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity, height: 50,
            child: ElevatedButton(
              onPressed: _apply,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade700, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
              child: const Text('Apply Filters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _budgetChip(String label, double? min, double? max) {
    final selected = (_minCtrl.text == (min?.toInt().toString() ?? '') &&
                     _maxCtrl.text == (max?.toInt().toString() ?? ''));
    return GestureDetector(
      onTap: () => setState(() {
        _minCtrl.text = min?.toInt().toString() ?? '';
        _maxCtrl.text = max?.toInt().toString() ?? '';
      }),
      child: Chip(
        label: Text(label, style: TextStyle(
            color: selected ? Colors.white : Colors.grey[700], fontSize: 12)),
        backgroundColor: selected ? Colors.blue.shade700 : Colors.grey.shade100,
        side: BorderSide(color: selected ? Colors.blue.shade700 : Colors.grey.shade300),
        padding: const EdgeInsets.symmetric(horizontal: 4),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Indian Flag Painter
// Replicates the website's SVG flag (22×16 viewBox) using Flutter's Canvas API.
//   • Top stripe:    saffron  #FF9933  (0..5.33)
//   • Middle stripe: white    #FFFFFF  (5.33..10.67)
//   • Bottom stripe: green    #138808  (10.67..16)
//   • Ashoka Chakra: navy     #000080  at centre (11, 8), r=2.5
//     – outer ring + hub dot
//     – 24 spokes (every 15°), matching the website's SVG exactly
// ══════════════════════════════════════════════════════════════════════════════
class _IndiaFlagPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Scale from the 22×16 SVG viewBox to the actual widget size
    final double sx = size.width  / 22.0;
    final double sy = size.height / 16.0;

    // ── Three horizontal stripes ─────────────────────────────────────────────
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, 5.33 * sy),
      Paint()..color = const Color(0xFFFF9933),  // saffron
    );
    canvas.drawRect(
      Rect.fromLTWH(0, 5.33 * sy, size.width, 5.34 * sy),
      Paint()..color = const Color(0xFFFFFFFF),  // white
    );
    canvas.drawRect(
      Rect.fromLTWH(0, 10.67 * sy, size.width, 5.33 * sy),
      Paint()..color = const Color(0xFF138808),  // green
    );

    // ── Ashoka Chakra ────────────────────────────────────────────────────────
    final Paint chakraPaint = Paint()
      ..color   = const Color(0xFF000080)        // navy blue
      ..style   = PaintingStyle.stroke
      ..strokeWidth = 0.5 * ((sx + sy) / 2);    // scale stroke proportionally

    final Offset centre = Offset(11 * sx, 8 * sy);
    final double r      = 2.5 * ((sx + sy) / 2);

    // Outer ring
    canvas.drawCircle(centre, r, chakraPaint);

    // Hub dot (filled)
    canvas.drawCircle(
      centre, 0.5 * ((sx + sy) / 2),
      Paint()..color = const Color(0xFF000080),
    );

    // 24 spokes — every 15 degrees, matching the website SVG
    final Paint spokePaint = Paint()
      ..color       = const Color(0xFF000080)
      ..strokeWidth = 0.35 * ((sx + sy) / 2);

    for (int i = 0; i < 24; i++) {
      final double angle = (i * 15.0) * 3.14159265358979 / 180.0;
      final Offset inner = Offset(
        centre.dx + 0.5 * ((sx + sy) / 2) * math.cos(angle),
        centre.dy + 0.5 * ((sx + sy) / 2) * math.sin(angle),
      );
      final Offset outer = Offset(
        centre.dx + r * math.cos(angle),
        centre.dy + r * math.sin(angle),
      );
      canvas.drawLine(inner, outer, spokePaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}