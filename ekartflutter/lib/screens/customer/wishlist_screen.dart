// import 'package:flutter/material.dart';
// import '../../services/services.dart';
// import 'product_detail_screen.dart';
// import '../../models/product_model.dart';

// class WishlistScreen extends StatefulWidget {
//   const WishlistScreen({super.key});
//   @override
//   State<WishlistScreen> createState() => _WishlistScreenState();
// }

// class _WishlistScreenState extends State<WishlistScreen> {
//   List<Map<String, dynamic>> items = [];
//   bool loading = true;

//   @override
//   void initState() { super.initState(); _load(); }

//   Future<void> _load() async {
//     setState(() => loading = true);
//     final list = await WishlistService.getWishlist();
//     if (!mounted) return;
//     setState(() { items = list; loading = false; });
//   }

//   Future<void> _remove(int productId) async {
//     await WishlistService.toggle(productId);
//     _load();
//   }

//   @override
//   Widget build(BuildContext context) {
//     if (loading) return const Center(child: CircularProgressIndicator());
//     if (items.isEmpty) {
//       return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center,
//         children: [
//           Icon(Icons.favorite_border, size: 90, color: Colors.grey[300]),
//           const SizedBox(height: 16),
//           Text('No items in wishlist',
//               style: TextStyle(fontSize: 18, color: Colors.grey[500])),
//         ],
//       ));
//     }
//     return RefreshIndicator(
//       onRefresh: _load,
//       child: GridView.builder(
//         padding: const EdgeInsets.all(12),
//         gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
//           crossAxisCount: 2, childAspectRatio: 0.68,
//           crossAxisSpacing: 12, mainAxisSpacing: 12,
//         ),
//         itemCount: items.length,
//         itemBuilder: (_, i) => _buildCard(items[i]),
//       ),
//     );
//   }

//   Widget _buildCard(Map<String, dynamic> item) {
//     final inStock = item['inStock'] == true;
//     return GestureDetector(
//       onTap: () {
//         final p = Product(
//           id: item['productId'], name: item['name'],
//           description: '', price: (item['price'] ?? 0).toDouble(), mrp: 0,
//           category: item['category'] ?? '', stock: inStock ? 1 : 0,
//           imageLink: item['imageLink'] ?? '', extraImages: [], approved: true,
//           vendorCode: null,
//         );
//         Navigator.push(context,
//             MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)));
//       },
//       child: Card(
//         elevation: 2,
//         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
//         child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//           Stack(children: [
//             ClipRRect(
//               borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
//               child: (item['imageLink'] ?? '').isNotEmpty
//                   ? Image.network(item['imageLink'], height: 130,
//                       width: double.infinity, fit: BoxFit.cover,
//                       errorBuilder: (_, __, ___) => Container(
//                           height: 130, color: Colors.grey[200],
//                           child: const Icon(Icons.image, size: 40)))
//                   : Container(height: 130, color: Colors.grey[200],
//                       child: const Icon(Icons.image, size: 40)),
//             ),
//             Positioned(
//               top: 4, right: 4,
//               child: GestureDetector(
//                 onTap: () => _remove(item['productId']),
//                 child: Container(
//                   width: 32, height: 32,
//                   decoration: const BoxDecoration(
//                     color: Colors.white, shape: BoxShape.circle,
//                     boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
//                   ),
//                   child: const Icon(Icons.favorite, size: 18, color: Colors.red),
//                 ),
//               ),
//             ),
//           ]),
//           Padding(
//             padding: const EdgeInsets.fromLTRB(8, 8, 8, 2),
//             child: Text(item['name'] ?? '',
//                 maxLines: 2, overflow: TextOverflow.ellipsis,
//                 style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
//           ),
//           Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 8),
//             child: Text('₹${(item['price'] as num? ?? 0).toStringAsFixed(2)}',
//                 style: TextStyle(
//                     color: Colors.blue.shade700,
//                     fontWeight: FontWeight.bold)),
//           ),
//           if (!inStock)
//             Padding(
//               padding: const EdgeInsets.symmetric(horizontal: 8),
//               child: Text('Out of Stock',
//                   style: TextStyle(color: Colors.red[400], fontSize: 11)),
//             ),
//           const Spacer(),
//           Padding(
//             padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
//             child: SizedBox(
//               width: double.infinity,
//               child: ElevatedButton(
//                 onPressed: inStock
//                     ? () async {
//                         final res =
//                             await CartService.addToCart(item['productId'], 1);
//                         if (!mounted) return;
//                         ScaffoldMessenger.of(context).showSnackBar(SnackBar(
//                           content: Text(res['success'] == true
//                               ? 'Added to cart!'
//                               : res['message'] ?? 'Failed'),
//                           backgroundColor: res['success'] == true
//                               ? Colors.green
//                               : Colors.red,
//                           behavior: SnackBarBehavior.floating,
//                         ));
//                       }
//                     : null,
//                 style: ElevatedButton.styleFrom(
//                   backgroundColor: Colors.blue.shade700,
//                   foregroundColor: Colors.white,
//                   padding: const EdgeInsets.symmetric(vertical: 6),
//                   shape: RoundedRectangleBorder(
//                       borderRadius: BorderRadius.circular(8)),
//                 ),
//                 child: const Text('Add to Cart', style: TextStyle(fontSize: 12)),
//               ),
//             ),
//           ),
//         ]),
//       ),
//     );
//   }
// }
import 'package:flutter/material.dart';
import '../../services/services.dart';
import 'product_detail_screen.dart';
import '../../models/product_model.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});
  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  List<Map<String, dynamic>> items   = [];
  bool   loading              = true;
  bool   _addingAll           = false;
  // Track per-item "adding to cart" state
  final Set<int> _addingToCart = {};

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => loading = true);
    final list = await WishlistService.getWishlist();
    if (!mounted) return;
    setState(() { items = list; loading = false; });
  }

  Future<void> _remove(int productId) async {
    await WishlistService.toggle(productId);
    _load();
  }

  // ── Add a single item to cart ─────────────────────────────────────────────
  Future<void> _addOneToCart(Map<String, dynamic> item) async {
    final id = item['productId'] as int;
    if (_addingToCart.contains(id)) return;
    setState(() => _addingToCart.add(id));
    final res = await CartService.addToCart(id, 1);
    if (!mounted) return;
    setState(() => _addingToCart.remove(id));
    _snack(
      res['success'] == true ? '${item['name']} added to cart!' : res['message'] ?? 'Failed',
      res['success'] == true ? Colors.green : Colors.red,
    );
  }

  // ── Add ALL in-stock wishlist items to cart ───────────────────────────────
  Future<void> _addAllToCart() async {
    final inStockItems = items.where((i) => i['inStock'] == true).toList();
    if (inStockItems.isEmpty) {
      _snack('No in-stock items to add', Colors.orange);
      return;
    }

    setState(() => _addingAll = true);

    int successCount = 0;
    int failCount    = 0;

    for (final item in inStockItems) {
      final res = await CartService.addToCart(item['productId'] as int, 1);
      if (res['success'] == true) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (!mounted) return;
    setState(() => _addingAll = false);

    if (failCount == 0) {
      _snack('All $successCount items added to cart! 🎉', Colors.green);
    } else if (successCount == 0) {
      _snack('Failed to add items to cart', Colors.red);
    } else {
      _snack('$successCount items added, $failCount failed', Colors.orange);
    }
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: color,
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 3),
    ));
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());

    if (items.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.favorite_border, size: 90, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('No items in wishlist',
              style: TextStyle(fontSize: 18, color: Colors.grey[500])),
          const SizedBox(height: 8),
          Text('Save items you love to find them later',
              style: TextStyle(fontSize: 13, color: Colors.grey[400])),
        ]),
      );
    }

    final inStockCount = items.where((i) => i['inStock'] == true).length;

    return Column(
      children: [
        // ── "Add All to Cart" banner — shown only when 2+ items exist ────────
        if (items.length >= 2)
          Container(
            margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade700, Colors.blue.shade500],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    '${items.length} items in wishlist',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    inStockCount > 0
                        ? '$inStockCount item${inStockCount == 1 ? '' : 's'} available to add'
                        : 'No items currently in stock',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 12,
                    ),
                  ),
                ]),
              ),
              const SizedBox(width: 12),
              SizedBox(
                height: 38,
                child: ElevatedButton.icon(
                  onPressed: (inStockCount == 0 || _addingAll) ? null : _addAllToCart,
                  icon: _addingAll
                      ? const SizedBox(
                          width: 14, height: 14,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.blue))
                      : const Icon(Icons.add_shopping_cart, size: 16),
                  label: Text(
                    _addingAll ? 'Adding...' : 'Add All to Cart',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.blue.shade700,
                    disabledBackgroundColor: Colors.white.withValues(alpha: 0.5),
                    disabledForegroundColor: Colors.grey,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                ),
              ),
            ]),
          ),

        // ── Product grid ──────────────────────────────────────────────────────
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2, childAspectRatio: 0.68,
                crossAxisSpacing: 12, mainAxisSpacing: 12,
              ),
              itemCount: items.length,
              itemBuilder: (_, i) => _buildCard(items[i]),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCard(Map<String, dynamic> item) {
    final inStock  = item['inStock'] == true;
    final pid      = item['productId'] as int;
    final isAdding = _addingToCart.contains(pid);

    return GestureDetector(
      onTap: () {
        final p = Product(
          id: pid, name: item['name'],
          description: '', price: (item['price'] ?? 0).toDouble(), mrp: 0,
          category: item['category'] ?? '', stock: inStock ? 1 : 0,
          imageLink: item['imageLink'] ?? '', extraImages: [], approved: true,
          vendorCode: null,
        );
        Navigator.push(context,
            MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)));
      },
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // ── Image + wishlist remove button ──────────────────────────────
          Stack(children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: (item['imageLink'] ?? '').isNotEmpty
                  ? Image.network(item['imageLink'], height: 130,
                      width: double.infinity, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                          height: 130, color: Colors.grey[200],
                          child: const Icon(Icons.image, size: 40)))
                  : Container(height: 130, color: Colors.grey[200],
                      child: const Icon(Icons.image, size: 40)),
            ),
            // Out-of-stock overlay
            if (!inStock)
              Positioned.fill(
                child: ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(12)),
                  child: Container(
                    color: Colors.black.withValues(alpha: 0.35),
                    alignment: Alignment.center,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                          color: Colors.red.shade700,
                          borderRadius: BorderRadius.circular(6)),
                      child: const Text('OUT OF STOCK',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5)),
                    ),
                  ),
                ),
              ),
            // Remove from wishlist
            Positioned(
              top: 4, right: 4,
              child: GestureDetector(
                onTap: () => _remove(pid),
                child: Container(
                  width: 32, height: 32,
                  decoration: const BoxDecoration(
                    color: Colors.white, shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
                  ),
                  child: const Icon(Icons.favorite, size: 18, color: Colors.red),
                ),
              ),
            ),
          ]),

          // ── Name ─────────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 2),
            child: Text(item['name'] ?? '',
                maxLines: 2, overflow: TextOverflow.ellipsis,
                style:
                    const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),

          // ── Price ─────────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              '₹${(item['price'] as num? ?? 0).toStringAsFixed(2)}',
              style: TextStyle(
                  color: Colors.blue.shade700, fontWeight: FontWeight.bold),
            ),
          ),

          const Spacer(),

          // ── Add to Cart button ────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: (inStock && !isAdding && !_addingAll)
                    ? () => _addOneToCart(item)
                    : null,
                icon: isAdding
                    ? const SizedBox(
                        width: 13, height: 13,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.add_shopping_cart, size: 14),
                label: Text(
                  inStock
                      ? (isAdding ? 'Adding...' : 'Add to Cart')
                      : 'Out of Stock',
                  style: const TextStyle(fontSize: 11),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      inStock ? Colors.blue.shade700 : Colors.grey.shade400,
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
}